import type { CompiledGrammar, PatternInfo, TokenizeResult } from "./types";
import type { TokenizerIntrospector } from "./introspector";

// every field is set in the literal that creates an entry, and none is added
// later: adding a property after creation moves the object to a map that only
// the transition tree holds (weakly). no entry outlives a tokenize() call, so
// V8 collected those maps a couple of full GCs later and threw away the
// optimised tokenize that had embedded them, once every few full GCs for the
// life of the process. -1 means "not resolved".
interface ProbeEntry {
  pos: number; // original position for reset
  entry_pos: number; // position where probe was entered (after consuming match)
  state: number;
  stack_ptr: number;
  rule_idx: number;
  probe_state: number;
  resolved_state: number;
  resolved_pos: number;
}

declare const INTROSPECTION: boolean;

// one 4k page worth of Uint32 slots. below this there is nothing worth
// reclaiming from the scan scratch buffer and the copy is pure cost.
const MIN_RECLAIMED_SLOTS = 1024;

// stands in for the fallback rule index in probe keys, a range rule never matches where the fallback does
const FALLBACK_RULE = 255;

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
    non_ascii_ranges,
    probe_states,
    probe_mask,
    probe_fallbacks,
    boundary_rules,
    has_seals,
    seal_flags,
    fallback_seal_flags,
  } = compiled_grammar;

  const len = input.length;
  const tokens = new Uint32Array(len * 3);
  let token_count = 0;

  const state_stack = new Uint16Array(256);
  let stack_ptr = 0;
  let current_state = 0;

  // cache per-state hot references to avoid Map.get and multiplies per char
  let state_buckets: (PatternInfo[] | null)[] | undefined = patterns && patterns.get(0);
  let char_map_base: number = 0; // current_state * 128
  let trans_base3: number = 0; // (current_state * 256) * 3
  let non_ascii_state: Int32Array | undefined = non_ascii_ranges && non_ascii_ranges.get(0 as any);

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

    // INTROSPECTION_START
    if (INTROSPECTION && introspector) {
      // record the transition to fallback state
      // use the probe entry position (where we entered the probe)
      introspector.pushed_state({
        from_state: probe_entry.state,
        to_state: fallback_state,
        stack_ptr,
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
    non_ascii_state = non_ascii_ranges && (non_ascii_ranges as any).get(current_state);
  }

  // resolves a probe left open at the end of input, true means restart the loop
  function settle_probe_at_end(): boolean {
    if (!probe_entry || !probe_states || !probe_states.has(current_state)) return false;
    const fallback_state = probe_fallbacks?.get(current_state);
    if (fallback_state !== undefined) enter_probe_fallback(fallback_state);
    else rewind_to_probe_entry();
    return true;
  }

  // false when the probe already failed here, otherwise it reopens on its own trigger forever
  function open_probe(rule_idx: number, probe_state: number): boolean {
    if (has_failed_probes && failed_probes.has((pos << 16) | (current_state << 8) | rule_idx)) {
      // INTROSPECTION_START
      if (INTROSPECTION && introspector) {
        const char = input.charCodeAt(pos);
        introspector.no_match({
          char,
          char_str: String.fromCharCode(char),
          pos,
          current_state: current_state,
          is_non_ascii: true,
        });
      }
      // INTROSPECTION_END
      return false;
    }
    probe_entry = {
      pos: pos,
      entry_pos: pos + 1,
      state: current_state,
      stack_ptr: stack_ptr,
      rule_idx: rule_idx,
      probe_state: probe_state,
      resolved_state: -1,
      resolved_pos: -1,
    };
    // INTROSPECTION_START
    if (INTROSPECTION && introspector) {
      introspector.enter_probe_mode({
        char_class: rule_idx,
        pos,
        current_state: current_state,
        stack_ptr,
      });
    }
    // INTROSPECTION_END
    return true;
  }

  // rewinds to where the probe opened and keeps the state it resolved to
  function close_probe(stack_op: number): void {
    if (!probe_entry) return;
    pos = probe_entry.pos;
    stack_ptr = probe_entry.stack_ptr;
    if (stack_op === 1) {
      state_stack[stack_ptr++] = probe_entry.state;
    }

    // INTROSPECTION_START
    if (INTROSPECTION && introspector) {
      introspector.exit_probe_mode({
        success: true,
        reset_pos: probe_entry.pos,
        current_state: current_state,
        pos: probe_entry.pos,
      });
      if (stack_op === 1 && probe_entry.resolved_state > 0) {
        introspector.pushed_state({
          from_state: probe_entry.probe_state ?? probe_entry.state,
          to_state: probe_entry.resolved_state,
          stack_ptr,
          pos: probe_entry.resolved_pos >= 0 ? probe_entry.resolved_pos : probe_entry.pos,
        });
      }
    }
    // INTROSPECTION_END
    probe_entry = null;
  }

  function rewind_to_probe_entry(): void {
    if (!probe_entry) return;
    const key = (probe_entry.pos << 16) | (probe_entry.state << 8) | probe_entry.rule_idx;
    failed_probes.add(key);
    has_failed_probes = true;

    // reset to entry point
    pos = probe_entry.pos;
    current_state = probe_entry.state;
    stack_ptr = probe_entry.stack_ptr;

    probe_entry = null;

    // refresh caches
    state_buckets = patterns && patterns.get(current_state);
    char_map_base = current_state * 128;
    trans_base3 = current_state * 256 * 3;
    non_ascii_state = non_ascii_ranges && (non_ascii_ranges as any).get(current_state);
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
        stack_ptr,
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
                const test_key = (pos << 16) | (current_state << 8) | pat.rule_idx;
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
        if (matched_rule_idx === 65535 && has_failed_probes && char_class !== 65535) {
          const test_key = (pos << 16) | (current_state << 8) | char_class;
          if (failed_probes.has(test_key)) {
            char_class = 65535;
          }
        }
      }

      if (char_class !== 65535) {
        const t_base = trans_base3 + char_class * 3;
        const transition = transitions[t_base];
        const token_type = transitions[t_base + 1];
        const stack_op = transitions[t_base + 2];

        // run fast path. the three table reads above already say whether this
        // rule can change state; one that cannot is a self-loop, so the whole
        // run of characters it matches can be consumed here instead of paying
        // a full dispatch per character. string bodies, comment bodies,
        // identifier runs and digit runs are all this shape, which is why a
        // hand-written lexer's inner loops beat the table walk.
        //
        // the run stops at a character that maps to a different rule, at a
        // character that begins one of this state's multi-char patterns (the
        // bucket is consulted before the char map, so it would have won), and
        // at non-ascii (the fallback path owns those).
        if (
          transition === 65535 &&
          stack_op === 0 &&
          token_type !== 65535 &&
          matched_length === 0 &&
          !is_in_probe_state &&
          !has_failed_probes &&
          (!has_seals || !seal_flags![current_state * 256 + char_class]) &&
          (!boundary_rules || !boundary_rules.has(current_state * 256 + char_class)) &&
          !(INTROSPECTION && introspector)
        ) {
          if (token_type === last_token_type && pos === last_token_end) {
            pos++;
          } else {
            const out_idx = token_count * 3;
            tokens[out_idx] = token_type;
            tokens[out_idx + 1] = pos;
            token_count++;
            pos++;
          }
          while (pos < len) {
            const next = input.charCodeAt(pos);
            if (next > 127) break;
            if (char_maps[char_map_base + next] !== char_class) break;
            if (state_buckets !== undefined && state_buckets[next] !== null) break;
            pos++;
          }
          tokens[(token_count - 1) * 3 + 2] = pos;
          last_token_type = token_type;
          last_token_end = pos;
          continue;
        }

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
            resolved_state: -1,
            resolved_pos: -1,
          };
          // INTROSPECTION_START
          if (INTROSPECTION && introspector) {
            introspector.enter_probe_mode({
              pos,
              current_state: current_state,
              stack_ptr,
              char_class,
            });
          }
          // INTROSPECTION_END
        }

        // emit token only if not in probe state
        if (!is_in_probe_state && token_type !== 65535) {
          const new_end = pos + (matched_length || 1);
          // `matched_length > 0` means the match came from the
          // multi-char bucket (char_maps hits leave matched_length
          // at 0 and advance by 1 on emit), so the emission is a
          // lexeme atom that must not coalesce backward into a
          // same-type run. seal: true / boundary: true rules also
          // block coalescing via seal_flags; has_seals is a loop
          // invariant so V8 short-circuits the lookup on grammars
          // without any sealing rules.
          if (
            matched_length === 0 &&
            (!has_seals || !seal_flags![current_state * 256 + char_class]) &&
            token_type === last_token_type &&
            pos === last_token_end
          ) {
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
          } else if (stack_op === 2 && transition !== 65535 && matched_length > 0) {
            // sideways transition with an explicit pattern match - advance by pattern length
            pos += matched_length;
          }
          // otherwise: exit without transition (pop), or sideways with no pattern match - don't advance
        }

        if (stack_op === 1) {
          state_stack[stack_ptr++] = current_state;
          const prev_state = current_state;
          current_state = transition;

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
                stack_ptr,
                pos: pos, // this is already the position after the matched character
              });
            }
          }
          // INTROSPECTION_END
          // refresh caches
          state_buckets = patterns && patterns.get(current_state);
          char_map_base = current_state << 7; // *128
          trans_base3 = (current_state << 8) * 3; // *256*3
          non_ascii_state = non_ascii_ranges && (non_ascii_ranges as any).get(current_state);
        } else if (stack_op === 2) {
          // exit operation - either pop to parent or sideways transition
          const prev_state = current_state;

          if (transition !== 65535) {
            // sideways transition: exit current state and enter new sibling state
            // the stack depth remains the same
            current_state = transition;

            const transition_pos =
              is_in_probe_state && probe_entry !== null && probe_entry.resolved_pos >= 0
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
            current_state = state_stack[--stack_ptr];

            // INTROSPECTION_START
            if (INTROSPECTION && introspector) {
              introspector.popped_state({
                from_state: prev_state,
                to_state: current_state,
                stack_ptr,
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
          non_ascii_state = non_ascii_ranges && (non_ascii_ranges as any).get(current_state);
        } else if (transition !== 65535) {
          const prev_state = current_state;
          current_state = transition;
          const transition_pos =
            is_in_probe_state && probe_entry !== null && probe_entry.resolved_pos >= 0
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
          non_ascii_state = non_ascii_ranges && (non_ascii_ranges as any).get(current_state);
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

          // INTROSPECTION_START
          if (INTROSPECTION && introspector) {
            introspector.exit_probe_mode({
              success: true,
              reset_pos: probe_entry.pos,
              current_state: current_state,
              pos: probe_entry.pos,
            });
            // record the push that happened inside probe mode, now with correct depth
            if (stack_op === 1 && probe_entry.resolved_state > 0) {
              introspector.pushed_state({
                from_state: probe_entry.probe_state ?? probe_entry.state,
                to_state: probe_entry.resolved_state,
                stack_ptr,
                pos: probe_entry.resolved_pos >= 0 ? probe_entry.resolved_pos : probe_entry.pos,
              });
            }
          }
          // INTROSPECTION_END
          probe_entry = null; // clear probe entry
          // refresh caches again in case state changed
          state_buckets = patterns && patterns.get(current_state);
          char_map_base = current_state << 7;
          trans_base3 = (current_state << 8) * 3;
          non_ascii_state = non_ascii_ranges && (non_ascii_ranges as any).get(current_state);
        }

        // check if we've reached the end while in probe mode
        // this needs to be after state transition so current_state is updated
        if (probe_states && probe_states.has(current_state) && pos >= len && probe_entry) {
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
              const key = (probe_entry.pos << 16) | (probe_entry.state << 8) | probe_entry.rule_idx;
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
      if (non_ascii_state !== undefined) {
        // short list, and only reached for codepoints >= 128, so the scan
        // costs far less than the per-codepoint map it replaced cost to build.
        for (let i = 0; i < non_ascii_state.length; i += 3) {
          if (char >= non_ascii_state[i] && char <= non_ascii_state[i + 1]) {
            matched_rule_idx = non_ascii_state[i + 2];
            break;
          }
        }
      }

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
        if (
          !is_in_probe_state &&
          is_target_probe_state &&
          !open_probe(matched_rule_idx, target_state)
        ) {
          pos++;
          continue;
        }

        // emit token only if not in probe state
        if (!is_in_probe_state && token_type !== 65535) {
          const new_end = pos + 1;
          // non-ascii matches are always single-char, so sealing
          // here depends solely on the rule's seal flag.
          if (
            (!has_seals || !seal_flags![current_state * 256 + matched_rule_idx]) &&
            token_type === last_token_type &&
            start_pos === last_token_end
          ) {
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

        // handle state transitions (same as ASCII path)
        if (stack_op === 1) {
          state_stack[stack_ptr++] = current_state;
          const prev_state = current_state;
          current_state = transition;

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
                stack_ptr,
                pos,
              });
            }
          }
          // INTROSPECTION_END
          // refresh caches
          state_buckets = patterns && patterns.get(current_state);
          char_map_base = current_state * 128;
          trans_base3 = current_state * 256 * 3;
          non_ascii_state = non_ascii_ranges && (non_ascii_ranges as any).get(current_state);
        } else if (stack_op === 2) {
          // exit operation - either pop to parent or sideways transition
          const prev_state = current_state;

          if (transition !== 65535) {
            // sideways transition: exit current state and enter new sibling state
            // the stack depth remains the same
            current_state = transition;

            const transition_pos =
              is_in_probe_state && probe_entry !== null && probe_entry.resolved_pos >= 0
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
            current_state = state_stack[--stack_ptr];

            // INTROSPECTION_START
            if (INTROSPECTION && introspector) {
              introspector.popped_state({
                from_state: prev_state,
                to_state: current_state,
                stack_ptr,
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
          non_ascii_state = non_ascii_ranges && (non_ascii_ranges as any).get(current_state);
        } else if (transition !== 65535) {
          const prev_state = current_state;
          current_state = transition;
          const transition_pos =
            is_in_probe_state && probe_entry !== null && probe_entry.resolved_pos >= 0
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
          non_ascii_state = non_ascii_ranges && (non_ascii_ranges as any).get(current_state);
        }

        // check if exiting probe state
        if (is_in_probe_state && !is_target_probe_state && probe_entry) close_probe(stack_op);
        if (pos >= len && settle_probe_at_end()) continue;
      } else if (fallback_transitions) {
        // no specific match, use fallback transitions
        const idx = current_state * 3;
        const transition = fallback_transitions[idx];
        const token_type = fallback_transitions[idx + 1];
        const stack_op = fallback_transitions[idx + 2];

        let target_state = current_state;
        if (stack_op === 1 && transition !== 65535) {
          target_state = transition;
        } else if (stack_op === 2 && transition !== 65535) {
          // sideways, the target is the explicit state not the parent
          target_state = transition;
        } else if (stack_op === 2 && stack_ptr > 0) {
          // pop, the target is the parent
          target_state = state_stack[stack_ptr - 1];
        } else if (transition !== 65535) {
          target_state = transition;
        }

        const is_target_probe_state = probe_mask
          ? !!probe_mask[target_state]
          : !!(probe_states && probe_states.has(target_state));

        // INTROSPECTION_START
        if (INTROSPECTION && introspector) {
          introspector.fallback_match({
            token_type: token_type,
            pos,
            current_state: current_state,
          });
        }
        // INTROSPECTION_END

        if (
          !is_in_probe_state &&
          is_target_probe_state &&
          !open_probe(FALLBACK_RULE, target_state)
        ) {
          pos++;
          continue;
        }

        // emit token only if not in probe state
        if (!is_in_probe_state && token_type !== 65535) {
          const new_end = pos + 1;
          // fallback transitions cover single non-ascii chars, so
          // sealing here is a per-state flag.
          if (
            (!has_seals || !fallback_seal_flags![current_state]) &&
            token_type === last_token_type &&
            start_pos === last_token_end
          ) {
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
        } else if (stack_op !== 2) {
          // a tokenless exit leaves the character for the state it lands in
          pos++;
        }

        // handle state transitions (same as ASCII path).
        if (stack_op === 1) {
          state_stack[stack_ptr++] = current_state;
          const prev_state = current_state;
          current_state = transition;

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
                stack_ptr,
                pos,
              });
            }
          }
          // INTROSPECTION_END
          // refresh caches
          state_buckets = patterns && patterns.get(current_state);
          char_map_base = current_state * 128;
          trans_base3 = current_state * 256 * 3;
          non_ascii_state = non_ascii_ranges && (non_ascii_ranges as any).get(current_state);
        } else if (stack_op === 2) {
          // exit operation - either pop to parent or sideways transition
          const prev_state = current_state;

          if (transition !== 65535) {
            // sideways transition: exit current state and enter new sibling state
            // the stack depth remains the same
            current_state = transition;

            const transition_pos =
              is_in_probe_state && probe_entry !== null && probe_entry.resolved_pos >= 0
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
            current_state = state_stack[--stack_ptr];

            // INTROSPECTION_START
            if (INTROSPECTION && introspector) {
              introspector.popped_state({
                from_state: prev_state,
                to_state: current_state,
                stack_ptr,
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
          non_ascii_state = non_ascii_ranges && (non_ascii_ranges as any).get(current_state);
        } else if (transition !== 65535) {
          const prev_state = current_state;
          current_state = transition;
          const transition_pos =
            is_in_probe_state && probe_entry !== null && probe_entry.resolved_pos >= 0
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
          non_ascii_state = non_ascii_ranges && (non_ascii_ranges as any).get(current_state);
        }

        if (is_in_probe_state && !is_target_probe_state && probe_entry) close_probe(stack_op);
        if (pos >= len && settle_probe_at_end()) continue;
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
      final_stack_ptr: stack_ptr,
    });
  }
  // INTROSPECTION_END

  // return token_types by reference. reclassifiers that mutate the array
  // (promote_by_text_set, interface_member_promoter, class_name_promoter,
  // ...) are responsible for cloning before they push new names. cloning
  // here penalised every tokenize call, including reclassifier-free ones.
  //
  // copy out rather than returning a view. the scratch buffer is sized at
  // 3 slots per input character but real grammars fill 13-15% of it, so a
  // subarray keeps 12 bytes per input character reachable for as long as the
  // caller holds the result. a consumer that highlights many blocks and keeps
  // the streams pays that on every one.
  //
  // the copy costs one allocation, which is measurable on inputs small enough
  // that the whole call is a microsecond, so keep the view when the memory it
  // pins is under a page and reclaiming it would not return anything to the
  // allocator anyway.
  const used = token_count * 3;
  return {
    tokens: len * 3 - used > MIN_RECLAIMED_SLOTS ? tokens.slice(0, used) : tokens.subarray(0, used),
    token_types,
  };
}
