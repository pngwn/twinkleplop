import type { CompiledGrammar, PatternInfo, TokenizeResult } from "./types";
import type { TokenizerIntrospector } from "./introspector";

interface ProbeEntry {
	pos: number; // original position for reset
	entry_pos: number; // position where probe was entered (after consuming match)
	state: number;
	stack_ptr: number;
	rule_idx: number;
	probe_state?: number;
	resolved_state?: number;
	resolved_pos?: number;
	// stage 6: slot_saves_len at probe entry, used to truncate stale saves
	// on probe success or fallback. the slot_values snapshot is held
	// separately in the tokenize closure (single non-nested probe).
	slot_saves_len_at_entry?: number;
}

declare const INTROSPECTION: boolean;

// module-level slot helpers. defined here (not as inner closures inside
// tokenize) so V8 can keep tokenize itself small and inline-friendly. they
// return the new slot_saves_len because mutating an outer let from a module
// function would require boxing.

function slot_save_and_init_at(
	decls_for_state: Map<number, Uint8Array>,
	target_state: number,
	slot_values: Uint8Array,
	slot_saves: Uint16Array,
	saves_len: number,
): number {
	const decls = decls_for_state.get(target_state);
	if (!decls) return saves_len;
	const len = decls.length;
	for (let i = 0; i < len; i += 2) {
		const slot_id = decls[i];
		slot_saves[saves_len++] = (slot_id << 8) | slot_values[slot_id];
		slot_values[slot_id] = decls[i + 1];
	}
	return saves_len;
}

function slot_count_for_state(
	decls_for_state: Map<number, Uint8Array>,
	target_state: number,
): number {
	const decls = decls_for_state.get(target_state);
	return decls ? decls.length >> 1 : 0;
}

function slot_restore_n(
	count: number,
	slot_values: Uint8Array,
	slot_saves: Uint16Array,
	saves_len: number,
): number {
	for (let i = 0; i < count; i++) {
		const entry = slot_saves[--saves_len];
		slot_values[entry >> 8] = entry & 0xff;
	}
	return saves_len;
}

function check_slot_predicates_at(
	predicate_offsets: Uint32Array,
	predicates_flat: Uint8Array,
	state_id: number,
	rule_idx: number,
	slot_values: Uint8Array,
): boolean {
	const offset = predicate_offsets[(state_id << 8) | rule_idx];
	if (offset === 0xffffffff) return true;
	const count = predicates_flat[offset];
	for (let i = 0; i < count; i++) {
		const base = offset + 1 + i * 3;
		const slot_id = predicates_flat[base];
		const op = predicates_flat[base + 1];
		const value = predicates_flat[base + 2];
		const actual = slot_values[slot_id];
		let pass: boolean;
		switch (op) {
			case 0:
				pass = actual === value;
				break;
			case 1:
				pass = actual !== value;
				break;
			case 2:
				pass = actual > value;
				break;
			case 3:
				pass = actual < value;
				break;
			case 4:
				pass = actual >= value;
				break;
			default:
				pass = actual <= value;
				break;
		}
		if (!pass) return false;
	}
	return true;
}

function apply_slot_updates_at(
	update_offsets: Uint32Array,
	updates_flat: Uint8Array,
	state_id: number,
	rule_idx: number,
	slot_values: Uint8Array,
): void {
	const offset = update_offsets[(state_id << 8) | rule_idx];
	if (offset === 0xffffffff) return;
	const count = updates_flat[offset];
	for (let i = 0; i < count; i++) {
		const base = offset + 1 + i * 3;
		const slot_id = updates_flat[base];
		const op = updates_flat[base + 1];
		const value = updates_flat[base + 2];
		switch (op) {
			case 0:
				slot_values[slot_id] = value;
				break;
			case 1:
				slot_values[slot_id] = (slot_values[slot_id] + value) & 0xff;
				break;
			case 2:
				slot_values[slot_id] = (slot_values[slot_id] - value) & 0xff;
				break;
			case 3:
				slot_values[slot_id] = slot_values[slot_id] === 0 ? 1 : 0;
				break;
		}
	}
}

// helper function to check if a character is an identifier continuation character
function is_identifier_char(char_code: number): boolean {
	return (
		(char_code >= 97 && char_code <= 122) || // a-z
		(char_code >= 65 && char_code <= 90) || // A-Z
		(char_code >= 48 && char_code <= 57) || // 0-9
		char_code === 95 || // _
		char_code === 36 // $
	);
}

export function tokenize(
	input: string,
	compiled_grammar: CompiledGrammar,
	introspector: TokenizerIntrospector | null = null,
): TokenizeResult {
	const {
		transitions,
		char_maps,
		token_types,
		patterns,
		fallback_transitions,
		non_ascii_chars,
		probe_states,
		probe_mask,
		probe_fallbacks,
		boundary_rules,
		slot_predicate_mask,
		predicate_rules,
	} = compiled_grammar;

	const len = input.length;
	const tokens = new Uint32Array(len * 3);
	let token_count = 0;

	const state_stack = new Uint16Array(256);
	let stack_ptr = 0;
	let current_state = 0;

	// cache per-state hot references to avoid Map.get and multiplies per char
	let state_buckets: (PatternInfo[] | null)[] | undefined =
		patterns && patterns.get(0);
	let char_map_base: number = 0; // current_state * 128
	let trans_base3: number = 0; // (current_state * 256) * 3
	let non_ascii_state: Record<number, number> | undefined =
		non_ascii_chars && non_ascii_chars.get(0 as any);

	let pos = 0;
	let prev_advanced_pos = -1;

	// track the last token for coalescing
	let last_token_type: number = 65535;
	let last_token_end: number = -1;

	// probe mode tracking
	let probe_entry: ProbeEntry | null = null;

	// track failed probe attempts - use numeric key for performance
	// key = (pos << 16) | (state << 8) | rule_idx
	const failed_probes = new Set<number>();
	let has_failed_probes = false;

	// helpers: probe fallback paths. extracted because the fallback-exists and
	// fallback-missing rewinds each appear three times (ASCII end-of-input,
	// ASCII no-match-at-end-of-input, non-ASCII no-match-at-end-of-input) with
	// identical state-machine plumbing. close over the let-bound locals.
	//
	// behaviour-preserving extraction: the introspector.probe_failed event is
	// only emitted at one of the three rewind sites in the original code, so it
	// stays at that call site rather than moving into the helper. the helper
	// owns only the mechanical rewind plus the failed_probes mark.
	function enter_probe_fallback(fallback_state: number): void {
		if (!probe_entry) return;
		pos = probe_entry.pos;
		state_stack[probe_entry.stack_ptr] = probe_entry.state;
		stack_ptr = probe_entry.stack_ptr + 1;

		// stage 6: probe failed → fallback. restore slot values from the
		// probe-entry snapshot and rewind the saves stack, then save+init
		// for the fallback state at the new top frame.
		if (has_slots) {
			slot_values.set(slot_probe_snapshot);
			slot_saves_len = probe_entry.slot_saves_len_at_entry ?? 0;
			const before = slot_saves_len;
			slot_saves_len = slot_save_and_init_at(
				slot_decls_for_state_local,
				fallback_state,
				slot_values,
				slot_saves,
				slot_saves_len,
			);
			slot_save_counts[stack_ptr] = slot_saves_len - before;
		}

		// INTROSPECTION_START
		if (INTROSPECTION && introspector) {
			// record the transition to fallback state
			// use the probe entry position (where we entered the probe)
			introspector.pushed_state({
				from_state: probe_entry.state,
				to_state: fallback_state,
				stackPtr: stack_ptr,
								slot_snapshot: slot_values,
				pos: probe_entry.entry_pos,
			});
		}
		// INTROSPECTION_END

		current_state = fallback_state;
		probe_entry = null;

		// refresh caches for new state
		state_buckets = patterns && patterns.get(current_state);
		char_map_base = current_state * 128;
		trans_base3 = current_state * 256 * 3;
		non_ascii_state =
			non_ascii_chars && (non_ascii_chars as any).get(current_state);
	}

	function rewind_to_probe_entry(): void {
		if (!probe_entry) return;
		const key =
			(probe_entry.pos << 16) | (probe_entry.state << 8) | probe_entry.rule_idx;
		failed_probes.add(key);
		has_failed_probes = true;

		// reset to entry point
		pos = probe_entry.pos;
		current_state = probe_entry.state;
		stack_ptr = probe_entry.stack_ptr;

		// stage 6: probe failed with no fallback → rewind to pre-probe slot
		// state. probe_entry.state was the active frame before the probe and
		// remains so afterwards, so its slots are already correct on the
		// stack — we only restore the live values + truncate the saves stack.
		if (has_slots) {
			slot_values.set(slot_probe_snapshot);
			slot_saves_len = probe_entry.slot_saves_len_at_entry ?? 0;
		}

		probe_entry = null;

		// refresh caches
		state_buckets = patterns && patterns.get(current_state);
		char_map_base = current_state * 128;
		trans_base3 = current_state * 256 * 3;
		non_ascii_state =
			non_ascii_chars && (non_ascii_chars as any).get(current_state);
	}

	// slot machinery
	//
	// gated entirely by has_slots so slot-free grammars take exactly one
	// predictable branch per push/pop/sideways and never enter the helpers.
	// the helpers themselves assume has_slots === true (callers must check).
	//
	// invariants:
	//   - slot_values[s] holds the current value of slot s. zero-initialized.
	//     slots not owned by any active stack frame have meaningless values
	//     (compile-time visibility analysis guarantees no rule reads them).
	//   - slot_saves stores save records as packed (slot_id << 8) | prev_value
	//     so each save is one Uint16 entry. slot_saves_len is the live length.
	//   - slot_save_counts[k] is the number of slot saves contributed by the
	//     frame at conceptual position k (= stack_ptr value when the frame
	//     became active). pop reads counts[stack_ptr] before decrementing.
	const has_slots = compiled_grammar.slot_count > 0;
	const slot_values = new Uint8Array(
		has_slots ? compiled_grammar.slot_count : 0,
	);
	// upper bound: every slot saved at every stack frame.
	const slot_saves = new Uint16Array(
		has_slots ? compiled_grammar.slot_count * 256 : 0,
	);
	let slot_saves_len = 0;
	// 257 = max stack depth (256) + the root frame (position 0).
	const slot_save_counts = new Uint16Array(has_slots ? 257 : 0);
	// stage 6: probe snapshot. the existing tokenizer doesn't nest probes
	// (probe_entry is a single optional, not a stack), so one snapshot
	// buffer is sufficient. on probe entry the buffer captures every
	// slot's value; on fallback the buffer is restored. on probe success
	// the snapshot is discarded (writes persist per SLOTS_PROPOSAL.md §3.3).
	// cross-probe slot communication is intentionally NOT supported via
	// this buffer — slots written inside a probe that fails are reverted.
	// to share state across probes, declare the slot on a state that
	// encloses both probes.
	const slot_probe_snapshot = new Uint8Array(
		has_slots ? compiled_grammar.slot_count : 0,
	);
	const slot_decls_for_state_local = compiled_grammar.slot_decls_for_state;
	const rule_slot_predicate_offsets =
		compiled_grammar.rule_slot_predicate_offsets;
	const rule_slot_predicates_flat = compiled_grammar.rule_slot_predicates_flat;
	const rule_slot_update_offsets = compiled_grammar.rule_slot_update_offsets;
	const rule_slot_updates_flat = compiled_grammar.rule_slot_updates_flat;

	// initialize slot defaults for the initial state by treating it like a
	// regular push. with zero-initialized slot_values, the saved "previous"
	// values are all 0, so a sideways transition out of the root would
	// restore correctly.
	if (has_slots) {
		const before_len = slot_saves_len;
		slot_saves_len = slot_save_and_init_at(
			slot_decls_for_state_local,
			current_state,
			slot_values,
			slot_saves,
			slot_saves_len,
		);
		slot_save_counts[0] = slot_saves_len - before_len;
	}

	// INTROSPECTION_START
	if (INTROSPECTION && introspector) {
		introspector.init({
			input,
			compiled_grammar: compiled_grammar,
			initial_state: current_state,
		});
	}
	// INTROSPECTION_END

	while (pos < len) {
		// if we advanced since last iteration, clear failed probe cache
		if (pos > prev_advanced_pos) {
			if (has_failed_probes) {
				failed_probes.clear();
				has_failed_probes = false;
			}
			prev_advanced_pos = pos;
		}
		const char = input.charCodeAt(pos);
		const start_pos = pos;

		// compute probe-state membership for this iteration
		let is_in_probe_state = probe_mask
			? !!probe_mask[current_state]
			: !!(probe_states && probe_states.has(current_state));

		// INTROSPECTION_START
		if (INTROSPECTION && introspector) {
			introspector.before_char({
				pos,
				char,
				char_str: String.fromCharCode(char),
				current_state: current_state,
				stackPtr: stack_ptr,
								slot_snapshot: slot_values,
				state_stack: state_stack.slice(0, stack_ptr),
				probe_mode: is_in_probe_state,
			});
			if (stack_ptr > 100) {
				pos = len;
				continue;
			}
		}
		// INTROSPECTION_END

		if (char < 128) {
			// check bucketed multi-character patterns first
			let matched_length: number = 0;
			let matched_rule_idx: number = 65535;

			// stage 5: try slot-gated rules (predicate_rules) first, in
			// declaration order. these were diverted from char_maps /
			// state_buckets / fallback_transitions at compile time. the
			// `has_slots &&` short-circuits to a single cached-bool check on
			// slot-free grammars; mask check + Map.get only happen when slots
			// exist and the current state owns predicate rules.
			if (has_slots && slot_predicate_mask[current_state]) {
				const predicate_list = predicate_rules.get(current_state);
				if (predicate_list) {
					for (let p = 0; p < predicate_list.length; p++) {
						const pat = predicate_list[p];
						const p_len = pat.length;
						// p_len === 0 marks an `any: true` slot-gated rule;
						// otherwise check the specific char pattern.
						if (p_len > 0) {
							if (pos + p_len > len) continue;
							if (pat.codes[0] !== char) continue;
							let pat_matched = true;
							for (let i = 1; i < p_len; i++) {
								if (input.charCodeAt(pos + i) !== pat.codes[i]) {
									pat_matched = false;
									break;
								}
							}
							if (!pat_matched) continue;
							if (pat.boundary && pos + p_len < len) {
								const next_char = input.charCodeAt(pos + p_len);
								if (
									(next_char >= 97 && next_char <= 122) ||
									(next_char >= 65 && next_char <= 90) ||
									(next_char >= 48 && next_char <= 57) ||
									next_char === 95 ||
									next_char === 36
								) {
									continue;
								}
							}
						}
						if (has_failed_probes) {
							const test_key =
								(pos << 16) | (current_state << 8) | pat.rule_idx;
							if (failed_probes.has(test_key)) continue;
						}
						if (
							!check_slot_predicates_at(
								rule_slot_predicate_offsets,
								rule_slot_predicates_flat,
								current_state,
								pat.rule_idx,
								slot_values,
							)
						) {
							continue;
						}
						matched_length = p_len === 0 ? 1 : p_len;
						matched_rule_idx = pat.rule_idx;
						break;
					}
				}
			}

			// early bail if no patterns for this state
			// inline bucket check for hot path
			if (matched_rule_idx === 65535 && state_buckets) {
				const bucket = state_buckets[char];
				if (bucket) {
					const bucket_length = bucket.length;
					for (let b = 0; b < bucket_length; b++) {
						const pat = bucket[b];
						const p_len = pat.length;
						if (pos + p_len > len) continue;
						// we know first char matches; unroll first iteration
						const codes = pat.codes;
						let matched = true;
						for (let i = 1; i < p_len; i++) {
							if (input.charCodeAt(pos + i) !== codes[i]) {
								matched = false;
								break;
							}
						}
						if (matched) {
							// check boundary if required
							if (pat.boundary && pos + p_len < len) {
								const next_char = input.charCodeAt(pos + p_len);
								if (
									(next_char >= 97 && next_char <= 122) || // a-z
									(next_char >= 65 && next_char <= 90) || // A-Z
									(next_char >= 48 && next_char <= 57) || // 0-9
									next_char === 95 || // _
									next_char === 36 // $
								) {
									// boundary check failed - pattern requires word boundary but next char is identifier char
									continue; // skip this pattern and try next one
								}
							}

							// check if this rule has failed before (only if we have failed probes)
							if (has_failed_probes) {
								const test_key =
									(pos << 16) | (current_state << 8) | pat.rule_idx;
								if (failed_probes.has(test_key)) {
									// INTROSPECTION_START
									if (INTROSPECTION && introspector) {
										introspector.skipped_failed_probe({
											pattern: pat,
											testKey: test_key,
										});
									}
									// INTROSPECTION_END
									continue; // skip this pattern and try next one
								}
							}
							// note: no slot_when check here. slot-gated rules are not
							// added to state_buckets (see compiler.ts) — they live
							// in predicate_rules and are tried first by the
							// predicate loop above this bucket check.
							matched_length = p_len;
							matched_rule_idx = pat.rule_idx;
							break; // buckets sorted by length desc → first fit is longest
						}
					}
				}
			}

			// directly use matched rule or lookup char map
			let char_class = matched_rule_idx;
			if (char_class === 65535) {
				char_class = char_maps[char_map_base + char];
			}

			if (char_class !== 65535) {
				// check boundary for single-character matches if required
				if (
					matched_rule_idx === 65535 &&
					boundary_rules &&
					boundary_rules.has(current_state * 256 + char_class)
				) {
					// this is a single-char match that requires boundary checking
					if (pos + 1 < len) {
						const next_char = input.charCodeAt(pos + 1);
						if (
							(next_char >= 97 && next_char <= 122) || // a-z
							(next_char >= 65 && next_char <= 90) || // A-Z
							(next_char >= 48 && next_char <= 57) || // 0-9
							next_char === 95 || // _
							next_char === 36 // $
						) {
							// boundary check failed - skip this match
							char_class = 65535;
						}
					}
				}

				// check if this single-char char_maps rule has previously failed as a
				// probe trigger. the multi-char bucket path has this check inline, but
				// char_maps matches reach here without going through that loop.
				if (
					matched_rule_idx === 65535 &&
					has_failed_probes &&
					char_class !== 65535
				) {
					const test_key = (pos << 16) | (current_state << 8) | char_class;
					if (failed_probes.has(test_key)) {
						char_class = 65535;
					}
				}
				// note: no slot_when check here. slot-gated rules are diverted
				// to predicate_rules at compile time and matched in the dedicated
				// predicate loop above the bucket check.
			}

			if (char_class !== 65535) {
				const t_base = trans_base3 + char_class * 3;
				const transition = transitions[t_base];
				const token_type = transitions[t_base + 1];
				const stack_op = transitions[t_base + 2];

				// determine target state
				let target_state = current_state;
				if (stack_op === 1 && transition !== 65535) {
					target_state = transition;
				} else if (stack_op === 2 && transition !== 65535) {
					// sideways transition: target is the explicit transition,
					// not the state below on the stack.
					target_state = transition;
				} else if (stack_op === 2 && stack_ptr > 0) {
					// pure exit (pop): target is the parent on the stack.
					target_state = state_stack[stack_ptr - 1];
				} else if (transition !== 65535) {
					target_state = transition;
				}

				const is_target_probe_state = probe_mask
					? !!probe_mask[target_state]
					: !!(probe_states && probe_states.has(target_state));

				if (is_in_probe_state && probe_entry && !is_target_probe_state) {
					probe_entry.resolved_state = target_state;
					probe_entry.resolved_pos = pos;
				}

				// INTROSPECTION_START
				if (INTROSPECTION && introspector) {
					introspector.matched_rule({
						char_class: char_class,
						matched_length: matched_length,
						transition,
						token_type: token_type,
						stack_op: stack_op,
						current_state: current_state,
						probe_mode: is_in_probe_state,
						pos,
					});
				}
				// INTROSPECTION_END

				// handle probe state entry
				if (!is_in_probe_state && is_target_probe_state) {
					// save the position where we'll be after consuming the matched text
					// this is where the probe state will be entered
					const probe_entry_pos = pos + (matched_length || 1);
					probe_entry = {
						pos: pos, // keep original pos for reset
						entry_pos: probe_entry_pos, // position where probe is entered
						state: current_state,
						stack_ptr: stack_ptr,
						rule_idx: char_class,
						probe_state: target_state, // save the probe state we're entering
						slot_saves_len_at_entry: has_slots ? slot_saves_len : 0,
					};
					// stage 6: snapshot all slot values before the probe runs.
					// restored on fallback; discarded on success.
					if (has_slots) {
						slot_probe_snapshot.set(slot_values);
					}
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.enter_probe_mode({
							pos,
							current_state: current_state,
							stackPtr: stack_ptr,
								slot_snapshot: slot_values,
							charClass: char_class,
						});
					}
					// INTROSPECTION_END
				}

				// emit token only if not in probe state
				if (!is_in_probe_state && token_type !== 65535) {
					const new_end = pos + (matched_length || 1);
					if (token_type === last_token_type && pos === last_token_end) {
						// extend previous token
						tokens[(token_count - 1) * 3 + 2] = new_end;
						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.extended_token({
								token_type: token_type,
								old_end: last_token_end,
								new_end: new_end,
								token_index: token_count - 1,
							});
						}
						// INTROSPECTION_END
					} else {
						// emit new token
						const out_idx = token_count * 3;
						tokens[out_idx] = token_type;
						tokens[out_idx + 1] = pos;
						tokens[out_idx + 2] = new_end;
						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.emitted_token({
								token_type: token_type,
								token_name: token_types[token_type],
								start: pos,
								end: new_end,
								text: input.substring(pos, new_end),
								token_index: token_count,
							});
						}
						// INTROSPECTION_END
						token_count++;
					}
					last_token_type = token_type;
					last_token_end = new_end;

					// advance position
					// for sideways transitions (exit with state), always advance
					// for regular exits, advance (the token was consumed)
					pos = new_end;
				} else {
					// no token to emit
					// for sideways transitions (exit with state), only advance if we matched a pattern
					// for regular exits (pop to parent), don't advance (re-process in parent)
					// for any: true rules with sideways transition, matched_length is 0, so don't advance
					if (stack_op !== 2) {
						// not an exit - advance by matched length
						pos += matched_length || 1;
					} else if (
						stack_op === 2 &&
						transition !== 65535 &&
						matched_length > 0
					) {
						// sideways transition with an explicit pattern match - advance by pattern length
						pos += matched_length;
					}
					// otherwise: exit without transition (pop), or sideways with no pattern match - don't advance
				}

				// when slots are in play, capture the rule's match-time state
				// before any transition for the post-stack-op apply_slot_updates
				// call. for the slot-free path this is dead code.
				let matched_state = 0;
				if (has_slots) matched_state = current_state;

				if (stack_op === 1) {
					state_stack[stack_ptr++] = current_state;
					const prev_state = current_state;
					current_state = transition;

					// slot push: save current values and init defaults for the new
					// current_state's owned slots.
					if (has_slots) {
						const __push_before = slot_saves_len;
						slot_saves_len = slot_save_and_init_at(
							slot_decls_for_state_local,
							current_state,
							slot_values,
							slot_saves,
							slot_saves_len,
						);
						slot_save_counts[stack_ptr] = slot_saves_len - __push_before;
					}

					if (is_in_probe_state && probe_entry) {
						probe_entry.resolved_state = current_state;
						probe_entry.resolved_pos = pos;
					}

					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						// record the state push only if not in probe mode
						// if in probe mode, it will be recorded when probe exits
						if (!is_in_probe_state) {
							// the entry position for the new state should be after the character that triggered the push
							// pos has already been advanced by matched_length or to new_end if a token was emitted
							introspector.pushed_state({
								from_state: prev_state,
								to_state: current_state,
								stackPtr: stack_ptr,
								slot_snapshot: slot_values,
								pos: pos, // this is already the position after the matched character
							});
						}
					}
					// INTROSPECTION_END
					// refresh caches
					state_buckets = patterns && patterns.get(current_state);
					char_map_base = current_state << 7; // *128
					trans_base3 = (current_state << 8) * 3; // *256*3
					non_ascii_state =
						non_ascii_chars && (non_ascii_chars as any).get(current_state);
				} else if (stack_op === 2) {
					// exit operation - either pop to parent or sideways transition
					const prev_state = current_state;

					if (transition !== 65535) {
						// sideways transition: exit current state and enter new sibling state
						// the stack depth remains the same
						current_state = transition;

						// slot sideways: restore old state's slots, then save+init
						// for the new current_state at the same stack position.
						if (has_slots) {
							slot_saves_len = slot_restore_n(
								slot_save_counts[stack_ptr],
								slot_values,
								slot_saves,
								slot_saves_len,
							);
							const __side_before = slot_saves_len;
							slot_saves_len = slot_save_and_init_at(
								slot_decls_for_state_local,
								current_state,
								slot_values,
								slot_saves,
								slot_saves_len,
							);
							slot_save_counts[stack_ptr] = slot_saves_len - __side_before;
						}

						const transition_pos =
							is_in_probe_state && probe_entry?.resolved_pos !== undefined
								? probe_entry.resolved_pos
								: pos;

						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							// report as a transition, not a pop, since stack depth doesn't change
							introspector.transitioned_state({
								from_state: prev_state,
								to_state: current_state,
								pos: transition_pos,
							});
						}
						// INTROSPECTION_END
					} else if (stack_ptr > 0) {
						// regular exit: pop from stack to parent state.
						// slot pop: restore the leaving frame's saved slots before
						// decrementing stack_ptr.
						if (has_slots) {
							slot_saves_len = slot_restore_n(
								slot_save_counts[stack_ptr],
								slot_values,
								slot_saves,
								slot_saves_len,
							);
						}
						current_state = state_stack[--stack_ptr];

						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.popped_state({
								from_state: prev_state,
								to_state: current_state,
								stackPtr: stack_ptr,
								slot_snapshot: slot_values,
								pos,
							});
						}
						// INTROSPECTION_END
					} else {
						// can't pop from empty stack - stay in current state
						// this shouldn't normally happen in well-formed grammars
					}

					// refresh caches
					state_buckets = patterns ? patterns.get(current_state) : undefined;
					char_map_base = current_state << 7;
					trans_base3 = (current_state << 8) * 3;
					non_ascii_state =
						non_ascii_chars && (non_ascii_chars as any).get(current_state);
				} else if (transition !== 65535) {
					const prev_state = current_state;
					current_state = transition;
					const transition_pos =
						is_in_probe_state && probe_entry?.resolved_pos !== undefined
							? probe_entry.resolved_pos
							: pos;
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.transitioned_state({
							from_state: prev_state,
							to_state: current_state,
							pos: transition_pos,
						});
					}
					// INTROSPECTION_END
					// refresh caches
					state_buckets = patterns && patterns.get(current_state);
					char_map_base = current_state << 7;
					trans_base3 = (current_state << 8) * 3;
					non_ascii_state =
						non_ascii_chars && (non_ascii_chars as any).get(current_state);
				}

				// apply slot_set updates from the rule that just fired. uses the
				// rule's match-time state (captured before any transition).
				if (has_slots) {
					apply_slot_updates_at(
						rule_slot_update_offsets,
						rule_slot_updates_flat,
						matched_state,
						char_class,
						slot_values,
					);
					// INTROSPECTION_START
					if (
						INTROSPECTION &&
						introspector &&
						rule_slot_update_offsets[(matched_state << 8) | char_class] !==
							0xffffffff
					) {
						introspector.slot_write({
							state: matched_state,
							rule_idx: char_class,
							pos,
							slot_snapshot: slot_values,
						});
					}
					// INTROSPECTION_END
				}

				// check if exiting probe state
				if (is_in_probe_state && !is_target_probe_state && probe_entry) {
					// probe succeeded - reset to entry point and continue in new state
					const probe_state_val = current_state; // save the probe state we're exiting from
					pos = probe_entry.pos;
					// the current state is now the target state we transitioned to
					// don't restore the old state - we want to continue in the new state
					stack_ptr = probe_entry.stack_ptr;
					// if the successful transition was a push, we need to handle it
					if (stack_op === 1) {
						// push the saved entry state onto stack
						state_stack[stack_ptr++] = probe_entry.state;
					}

					// stage 6: probe succeeded → keep slot writes (per §3.3),
					// but the slot saves done during the probe are now stale
					// (their stack positions have been rewound). truncate the
					// saves stack and re-do save+init for the new top frame
					// so future pops have a correct slot_save_counts entry.
					if (has_slots) {
						slot_saves_len = probe_entry.slot_saves_len_at_entry ?? 0;
						if (stack_op === 1) {
							const before = slot_saves_len;
							slot_saves_len = slot_save_and_init_at(
								slot_decls_for_state_local,
								current_state,
								slot_values,
								slot_saves,
								slot_saves_len,
							);
							slot_save_counts[stack_ptr] = slot_saves_len - before;
						}
					}

					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.exit_probe_mode({
							success: true,
							reset_pos: probe_entry.pos,
							current_state: current_state,
							pos: probe_entry.pos,
						});
						// record the push that happened inside probe mode, now with correct depth
						if (stack_op === 1 && probe_entry.resolved_state) {
							introspector.pushed_state({
								from_state: probe_entry.probe_state ?? probe_entry.state,
								to_state: probe_entry.resolved_state,
								stackPtr: stack_ptr,
								slot_snapshot: slot_values,
								pos: probe_entry.resolved_pos ?? probe_entry.pos,
							});
						}
					}
					// INTROSPECTION_END
					probe_entry = null; // clear probe entry
					// refresh caches again in case state changed
					state_buckets = patterns && patterns.get(current_state);
					char_map_base = current_state << 7;
					trans_base3 = (current_state << 8) * 3;
					non_ascii_state =
						non_ascii_chars && (non_ascii_chars as any).get(current_state);
				}

				// check if we've reached the end while in probe mode
				// this needs to be after state transition so current_state is updated
				if (
					probe_states &&
					probe_states.has(current_state) &&
					pos >= len &&
					probe_entry
				) {
					// check if this probe state has a fallback
					const fallback_state = probe_fallbacks?.get(current_state);
					if (fallback_state !== undefined) {
						// transition to fallback state and exit probe mode
						enter_probe_fallback(fallback_state);
						// continue from the beginning of the while loop
						continue;
					} else {
						// no fallback - probe failed, mark and reset
						// INTROSPECTION_START
						if (INTROSPECTION && introspector && probe_entry) {
							const key =
								(probe_entry.pos << 16) |
								(probe_entry.state << 8) |
								probe_entry.rule_idx;
							introspector.probe_failed({
								key,
								reason: "reached_end",
								probeEntry: probe_entry,
							});
						}
						// INTROSPECTION_END
						rewind_to_probe_entry();
						// continue from the beginning of the while loop
						continue;
					}
				}
			} else {
				// no match found
				if (is_in_probe_state && probe_entry) {
					// in probe mode, skip the non-matching character and continue scanning
					// probe mode should skip characters until it finds a disambiguating match
					pos++;
					// if we reached end while probing, resolve via fallback or mark failure
					if (pos >= len) {
						const fallback_state = probe_fallbacks?.get(current_state);
						if (fallback_state !== undefined) {
							enter_probe_fallback(fallback_state);
							continue;
						} else {
							rewind_to_probe_entry();
							continue;
						}
					}
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						// introspector.skippedCharInProbe({
						// 	char: input[pos - 1],
						// 	pos: pos - 1,
						// 	current_state,
						// });
					}
					// INTROSPECTION_END
				} else {
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.no_match({
							char,
							char_str: String.fromCharCode(char),
							pos,
							current_state: current_state,
						});
					}
					// INTROSPECTION_END
					pos++;
				}
			}
		} else {
			// handle non-ASCII characters (>= 128)
			// first check if there's a specific match for this character
			let matched_rule_idx = 65535;
			// early bail if no non-ASCII mappings exist at all
			if (non_ascii_state) {
				const v = (non_ascii_state as any)[char];
				if (v !== undefined) matched_rule_idx = v as number;
			}

			// note: slot-gated non-ASCII rules are diverted to predicate_rules
			// at compile time (v1 of slots only supports ASCII matchers in the
			// predicate path; non-ASCII slot-gated rules are a compile error).

			if (matched_rule_idx !== 65535) {
				// found a specific match for this non-ASCII character
				const t_base = trans_base3 + matched_rule_idx * 3;
				const transition = transitions[t_base];
				const token_type = transitions[t_base + 1];
				const stack_op = transitions[t_base + 2];

				// determine target state
				let target_state = current_state;
				if (stack_op === 1 && transition !== 65535) {
					target_state = transition;
				} else if (stack_op === 2 && transition !== 65535) {
					// sideways transition: target is the explicit transition,
					// not the state below on the stack.
					target_state = transition;
				} else if (stack_op === 2 && stack_ptr > 0) {
					// pure exit (pop): target is the parent on the stack.
					target_state = state_stack[stack_ptr - 1];
				} else if (transition !== 65535) {
					target_state = transition;
				}

				const is_target_probe_state = probe_mask
					? !!probe_mask[target_state]
					: !!(probe_states && probe_states.has(target_state));

				// INTROSPECTION_START
				if (INTROSPECTION && introspector) {
					introspector.non_ascii_match({
						char,
						token_type: token_type,
						pos,
						current_state: current_state,
					});
				}
				// INTROSPECTION_END

				// handle probe state entry
				if (!is_in_probe_state && is_target_probe_state) {
					// calculate where we'll be after consuming the match
					const probe_entry_pos = pos + 1;
					probe_entry = {
						pos: pos, // keep original pos for reset
						entry_pos: probe_entry_pos, // position where probe is entered
						state: current_state,
						stack_ptr: stack_ptr,
						rule_idx: matched_rule_idx,
						probe_state: target_state,
						slot_saves_len_at_entry: has_slots ? slot_saves_len : 0,
					};
					// stage 6: snapshot slot values at probe entry (non-ASCII path).
					if (has_slots) {
						slot_probe_snapshot.set(slot_values);
					}
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.enter_probe_mode({
							charClass: matched_rule_idx,
							pos,
							current_state: current_state,
							stackPtr: stack_ptr,
								slot_snapshot: slot_values,
						});
					}
					// INTROSPECTION_END
				}

				// emit token only if not in probe state
				if (!is_in_probe_state && token_type !== 65535) {
					const new_end = pos + 1;
					if (token_type === last_token_type && start_pos === last_token_end) {
						// extend previous token
						tokens[(token_count - 1) * 3 + 2] = new_end;
						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.extended_token({
								token_type: token_type,
								old_end: last_token_end,
								new_end: new_end,
								token_index: token_count - 1,
							});
						}
						// INTROSPECTION_END
					} else {
						// emit new token
						const out_idx = token_count * 3;
						tokens[out_idx] = token_type;
						tokens[out_idx + 1] = pos;
						tokens[out_idx + 2] = new_end;
						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.emitted_token({
								token_type: token_type,
								token_name: token_types[token_type],
								start: pos,
								end: new_end,
								text: input.substring(pos, new_end),
								token_index: token_count,
								is_non_ascii: true,
							});
						}
						// INTROSPECTION_END
						token_count++;
					}
					last_token_type = token_type;
					last_token_end = new_end;
					pos = new_end;
				} else {
					// no token emitted - apply same logic as ASCII path
					// for sideways transitions with no pattern match (any: true), don't advance
					if (stack_op !== 2) {
						pos++;
					} else if (stack_op === 2 && transition !== 65535) {
						// sideways transition - don't advance to let new state process the character
					}
					// otherwise: regular exit (pop) - don't advance
				}

				// capture rule's match-time state for slot_set lookup.
				const matched_state = current_state;

				// handle state transitions (same as ASCII path)
				if (stack_op === 1) {
					state_stack[stack_ptr++] = current_state;
					const prev_state = current_state;
					current_state = transition;

					if (has_slots) {
						const __push_before = slot_saves_len;
						slot_saves_len = slot_save_and_init_at(
							slot_decls_for_state_local,
							current_state,
							slot_values,
							slot_saves,
							slot_saves_len,
						);
						slot_save_counts[stack_ptr] = slot_saves_len - __push_before;
					}

					if (is_in_probe_state && probe_entry) {
						probe_entry.resolved_state = current_state;
						probe_entry.resolved_pos = pos;
					}

					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						if (!is_in_probe_state) {
							introspector.pushed_state({
								from_state: prev_state,
								to_state: current_state,
								stackPtr: stack_ptr,
								slot_snapshot: slot_values,
								pos,
							});
						}
					}
					// INTROSPECTION_END
					// refresh caches
					state_buckets = patterns && patterns.get(current_state);
					char_map_base = current_state * 128;
					trans_base3 = current_state * 256 * 3;
				} else if (stack_op === 2) {
					// exit operation - either pop to parent or sideways transition
					const prev_state = current_state;

					if (transition !== 65535) {
						// sideways transition: exit current state and enter new sibling state
						// the stack depth remains the same
						current_state = transition;

						if (has_slots) {
							slot_saves_len = slot_restore_n(
								slot_save_counts[stack_ptr],
								slot_values,
								slot_saves,
								slot_saves_len,
							);
							const __side_before = slot_saves_len;
							slot_saves_len = slot_save_and_init_at(
								slot_decls_for_state_local,
								current_state,
								slot_values,
								slot_saves,
								slot_saves_len,
							);
							slot_save_counts[stack_ptr] = slot_saves_len - __side_before;
						}

						const transition_pos =
							is_in_probe_state && probe_entry?.resolved_pos !== undefined
								? probe_entry.resolved_pos
								: pos;

						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							// report as a transition, not a pop, since stack depth doesn't change
							introspector.transitioned_state({
								from_state: prev_state,
								to_state: current_state,
								pos: transition_pos,
							});
						}
						// INTROSPECTION_END
					} else if (stack_ptr > 0) {
						// regular exit: pop from stack to parent state
						if (has_slots) {
							slot_saves_len = slot_restore_n(
								slot_save_counts[stack_ptr],
								slot_values,
								slot_saves,
								slot_saves_len,
							);
						}
						current_state = state_stack[--stack_ptr];

						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.popped_state({
								from_state: prev_state,
								to_state: current_state,
								stackPtr: stack_ptr,
								slot_snapshot: slot_values,
								pos,
							});
						}
						// INTROSPECTION_END
					} else {
						// can't pop from empty stack - stay in current state
						// this shouldn't normally happen in well-formed grammars
					}

					// refresh caches
					state_buckets = patterns ? patterns.get(current_state) : undefined;
					char_map_base = current_state * 128;
					trans_base3 = current_state * 256 * 3;
				} else if (transition !== 65535) {
					const prev_state = current_state;
					current_state = transition;
					const transition_pos =
						is_in_probe_state && probe_entry?.resolved_pos !== undefined
							? probe_entry.resolved_pos
							: pos;
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.transitioned_state({
							from_state: prev_state,
							to_state: current_state,
							pos: transition_pos,
						});
					}
					// INTROSPECTION_END
					// refresh caches
					state_buckets = patterns && patterns.get(current_state);
					char_map_base = current_state * 128;
					trans_base3 = current_state * 256 * 3;
				}

				// apply slot_set updates for the rule (non-ASCII match path).
				if (has_slots) {
					apply_slot_updates_at(
						rule_slot_update_offsets,
						rule_slot_updates_flat,
						matched_state,
						matched_rule_idx,
						slot_values,
					);
					// INTROSPECTION_START
					if (
						INTROSPECTION &&
						introspector &&
						rule_slot_update_offsets[
							(matched_state << 8) | matched_rule_idx
						] !== 0xffffffff
					) {
						introspector.slot_write({
							state: matched_state,
							rule_idx: matched_rule_idx,
							pos,
							slot_snapshot: slot_values,
						});
					}
					// INTROSPECTION_END
				}

				// check if exiting probe state
				if (is_in_probe_state && !is_target_probe_state && probe_entry) {
					pos = probe_entry.pos;
					stack_ptr = probe_entry.stack_ptr;
					if (stack_op === 1) {
						state_stack[stack_ptr++] = probe_entry.state;
					}

					// stage 6: same as the ASCII probe-success path —
					// truncate stale slot saves and re-establish the new
					// top frame's slot_save_counts entry.
					if (has_slots) {
						slot_saves_len = probe_entry.slot_saves_len_at_entry ?? 0;
						if (stack_op === 1) {
							const before = slot_saves_len;
							slot_saves_len = slot_save_and_init_at(
								slot_decls_for_state_local,
								current_state,
								slot_values,
								slot_saves,
								slot_saves_len,
							);
							slot_save_counts[stack_ptr] = slot_saves_len - before;
						}
					}

					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.exit_probe_mode({
							success: true,
							reset_pos: probe_entry.pos,
							current_state: current_state,
							pos: probe_entry.pos,
						});
						if (stack_op === 1 && probe_entry.resolved_state) {
							introspector.pushed_state({
								from_state: probe_entry.probe_state ?? probe_entry.state,
								to_state: probe_entry.resolved_state,
								stackPtr: stack_ptr,
								slot_snapshot: slot_values,
								pos: probe_entry.resolved_pos ?? probe_entry.pos,
							});
						}
					}
					// INTROSPECTION_END
					probe_entry = null;
				}
			} else if (fallback_transitions) {
				// no specific match, use fallback transitions
				const idx = current_state * 3;
				const transition = fallback_transitions[idx];
				const token_type = fallback_transitions[idx + 1];
				const stack_op = fallback_transitions[idx + 2];

				// INTROSPECTION_START
				if (INTROSPECTION && introspector) {
					introspector.fallback_match({
						token_type: token_type,
						pos,
						current_state: current_state,
					});
				}
				// INTROSPECTION_END

				// emit token only if not in probe state
				if (!is_in_probe_state && token_type !== 65535) {
					const new_end = pos + 1;
					if (token_type === last_token_type && start_pos === last_token_end) {
						// extend previous token
						tokens[(token_count - 1) * 3 + 2] = new_end;
						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.extended_token({
								token_type: token_type,
								old_end: last_token_end,
								new_end: new_end,
								token_index: token_count - 1,
							});
						}
						// INTROSPECTION_END
					} else {
						// emit new token
						const out_idx = token_count * 3;
						tokens[out_idx] = token_type;
						tokens[out_idx + 1] = pos;
						tokens[out_idx + 2] = new_end;
						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.emitted_token({
								token_type: token_type,
								token_name: token_types[token_type],
								start: pos,
								end: new_end,
								text: input.substring(pos, new_end),
								token_index: token_count,
								is_fallback: true,
								is_non_ascii: true,
							});
						}
						// INTROSPECTION_END
						token_count++;
					}
					last_token_type = token_type;
					last_token_end = new_end;
					pos = new_end;
				} else {
					pos++;
				}

				// handle state transitions (same as ASCII path).
				// note: the non-ASCII fallback path uses a precomputed transition
				// without a rule_idx, so slot_when/slot_set on the underlying
				// fallback rule are not evaluated here. push/pop/sideways still
				// run the slot save/restore so frame state is consistent.
				if (stack_op === 1) {
					state_stack[stack_ptr++] = current_state;
					const prev_state = current_state;
					current_state = transition;

					if (has_slots) {
						const __push_before = slot_saves_len;
						slot_saves_len = slot_save_and_init_at(
							slot_decls_for_state_local,
							current_state,
							slot_values,
							slot_saves,
							slot_saves_len,
						);
						slot_save_counts[stack_ptr] = slot_saves_len - __push_before;
					}

					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.pushed_state({
							from_state: prev_state,
							to_state: current_state,
							stackPtr: stack_ptr,
								slot_snapshot: slot_values,
							pos,
						});
					}
					// INTROSPECTION_END
					// refresh caches
					state_buckets = patterns && patterns.get(current_state);
					char_map_base = current_state * 128;
					trans_base3 = current_state * 256 * 3;
				} else if (stack_op === 2) {
					// exit operation - either pop to parent or sideways transition
					const prev_state = current_state;

					if (transition !== 65535) {
						// sideways transition: exit current state and enter new sibling state
						// the stack depth remains the same
						current_state = transition;

						if (has_slots) {
							slot_saves_len = slot_restore_n(
								slot_save_counts[stack_ptr],
								slot_values,
								slot_saves,
								slot_saves_len,
							);
							const __side_before = slot_saves_len;
							slot_saves_len = slot_save_and_init_at(
								slot_decls_for_state_local,
								current_state,
								slot_values,
								slot_saves,
								slot_saves_len,
							);
							slot_save_counts[stack_ptr] = slot_saves_len - __side_before;
						}

						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							// report as a transition, not a pop, since stack depth doesn't change
							introspector.transitioned_state({
								from_state: prev_state,
								to_state: current_state,
								pos,
							});
						}
						// INTROSPECTION_END
					} else if (stack_ptr > 0) {
						// regular exit: pop from stack to parent state
						if (has_slots) {
							slot_saves_len = slot_restore_n(
								slot_save_counts[stack_ptr],
								slot_values,
								slot_saves,
								slot_saves_len,
							);
						}
						current_state = state_stack[--stack_ptr];

						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.popped_state({
								from_state: prev_state,
								to_state: current_state,
								stackPtr: stack_ptr,
								slot_snapshot: slot_values,
								pos,
							});
						}
						// INTROSPECTION_END
					} else {
						// can't pop from empty stack - stay in current state
						// this shouldn't normally happen in well-formed grammars
					}

					// refresh caches
					state_buckets = patterns ? patterns.get(current_state) : undefined;
					char_map_base = current_state * 128;
					trans_base3 = current_state * 256 * 3;
				} else if (transition !== 65535) {
					const prev_state = current_state;
					current_state = transition;
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.transitioned_state({
							from_state: prev_state,
							to_state: current_state,
							pos,
						});
					}
					// INTROSPECTION_END
					// refresh caches
					state_buckets = patterns && patterns.get(current_state);
					char_map_base = current_state * 128;
					trans_base3 = current_state * 256 * 3;
				}
			} else {
				// no match found
				if (is_in_probe_state && probe_entry) {
					// in probe mode, skip the non-matching character and continue scanning
					// probe mode should skip characters until it finds a disambiguating match
					pos++;
					// if end reached during probe, resolve fallback or reset
					if (pos >= len) {
						const fallback_state = probe_fallbacks?.get(current_state);
						if (fallback_state !== undefined) {
							enter_probe_fallback(fallback_state);
							continue;
						} else {
							rewind_to_probe_entry();
							continue;
						}
					}
					// INTROSPECTION_START
					// if (INTROSPECTION && introspector) {
					// 	introspector.skippedCharInProbe({
					// 		char: input[pos - 1],
					// 		pos: pos - 1,
					// 		current_state,
					// 	});
					// }
					// INTROSPECTION_END
				} else {
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.no_match({
							char,
							char_str: String.fromCharCode(char),
							pos,
							current_state: current_state,
							is_non_ascii: true,
						});
					}
					// INTROSPECTION_END
					pos++;
				}
			}
		}
	}

	// INTROSPECTION_START
	if (INTROSPECTION && introspector) {
		introspector.complete({
			token_count: token_count,
			final_state: current_state,
			finalStackPtr: stack_ptr,
		});
	}
	// INTROSPECTION_END

	return {
		tokens: tokens.subarray(0, token_count * 3),
		token_types: token_types,
	};
}
