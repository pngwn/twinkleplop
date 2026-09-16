// ---- lib/core/src/tokenizer.ts ----
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
}

declare const INTROSPECTION: boolean;

// one 4k page worth of Uint32 slots. below this there is nothing worth
// reclaiming from the scan scratch buffer and the copy is pure cost.
const MIN_RECLAIMED_SLOTS = 1024;

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
        stackPtr: stack_ptr,
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
        stackPtr: stack_ptr,
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
          };
          // INTROSPECTION_START
          if (INTROSPECTION && introspector) {
            introspector.enter_probe_mode({
              pos,
              current_state: current_state,
              stackPtr: stack_ptr,
              charClass: char_class,
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
                stackPtr: stack_ptr,
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
            current_state = state_stack[--stack_ptr];

            // INTROSPECTION_START
            if (INTROSPECTION && introspector) {
              introspector.popped_state({
                from_state: prev_state,
                to_state: current_state,
                stackPtr: stack_ptr,
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
            if (stack_op === 1 && probe_entry.resolved_state) {
              introspector.pushed_state({
                from_state: probe_entry.probe_state ?? probe_entry.state,
                to_state: probe_entry.resolved_state,
                stackPtr: stack_ptr,
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
          };
          // INTROSPECTION_START
          if (INTROSPECTION && introspector) {
            introspector.enter_probe_mode({
              charClass: matched_rule_idx,
              pos,
              current_state: current_state,
              stackPtr: stack_ptr,
            });
          }
          // INTROSPECTION_END
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
                stackPtr: stack_ptr,
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
            current_state = state_stack[--stack_ptr];

            // INTROSPECTION_START
            if (INTROSPECTION && introspector) {
              introspector.popped_state({
                from_state: prev_state,
                to_state: current_state,
                stackPtr: stack_ptr,
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

        // check if exiting probe state
        if (is_in_probe_state && !is_target_probe_state && probe_entry) {
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
            if (stack_op === 1 && probe_entry.resolved_state) {
              introspector.pushed_state({
                from_state: probe_entry.probe_state ?? probe_entry.state,
                to_state: probe_entry.resolved_state,
                stackPtr: stack_ptr,
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
        } else {
          pos++;
        }

        // handle state transitions (same as ASCII path).
        if (stack_op === 1) {
          state_stack[stack_ptr++] = current_state;
          const prev_state = current_state;
          current_state = transition;

          // INTROSPECTION_START
          if (INTROSPECTION && introspector) {
            introspector.pushed_state({
              from_state: prev_state,
              to_state: current_state,
              stackPtr: stack_ptr,
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
            current_state = state_stack[--stack_ptr];

            // INTROSPECTION_START
            if (INTROSPECTION && introspector) {
              introspector.popped_state({
                from_state: prev_state,
                to_state: current_state,
                stackPtr: stack_ptr,
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


// ---- lib/core/src/scan.ts ----
// token-stream scanning helpers shared across reclassifier passes.
//
// every stateful reclassifier walks a TokenizeResult and needs some subset
// of: per-index text extraction, trivia-aware neighbor lookups, bracket
// scope tracking. factoring these here means one tested implementation
// instead of ~4 near-duplicates (claim_property_scope, type_position_promoter,
// class_name_promoter, rust/reclassify_generics) and makes the passes
// themselves smaller and easier to reason about.

// ---------------------------------------------------------------------------
// TokenView
// ---------------------------------------------------------------------------
//
// thin read-only wrapper around (input, tokens, token_types). exposes the
// common operations every pass needs: type_id lookup, source text, trivia
// check, and forward/backward non-trivia neighbor scans.
//
// trivia defaults to the single `comment` type, which matches every current
// language. callers can pass a list for languages that classify additional
// types as trivia.

export interface TokenView {
  readonly input: string;
  readonly tokens: Uint32Array;
  readonly token_types: string[];
  readonly count: number;
  /**
   * the first resolved trivia type_id, or -1. exposed so callers that
   * want a tight `tokens[i*3] === comment_id` inline check (as opposed to
   * calling is_trivia()) can still do it in a single comparison when only
   * one trivia name is configured.
   */
  readonly comment_id: number;
  kind_of(i: number): number;
  text_of(i: number): string;
  is_trivia(i: number): boolean;
  /** returns the smallest index >= `from` that isn't trivia, or -1. */
  next_non_trivia(from: number): number;
  /** returns the largest index <= `from` that isn't trivia, or -1. */
  prev_non_trivia(from: number): number;
}

export function make_token_view(
  input: string,
  tokens: Uint32Array,
  token_types: string[],
  trivia_names: readonly string[] = ["comment"],
): TokenView {
  const count = tokens.length / 3;
  let comment_id = -1;
  const trivia_set = new Set<number>();
  for (const name of trivia_names) {
    const id = token_types.indexOf(name);
    if (id < 0) continue;
    trivia_set.add(id);
    if (comment_id < 0) comment_id = id;
  }
  const kind_of = (i: number): number => tokens[i * 3];
  const text_of = (i: number): string => input.slice(tokens[i * 3 + 1], tokens[i * 3 + 2]);
  // the single-trivia fast path shaves a Set.has() lookup on the hot path;
  // every current language configures exactly one trivia type.
  const is_trivia =
    trivia_set.size <= 1
      ? (i: number) => tokens[i * 3] === comment_id
      : (i: number) => trivia_set.has(tokens[i * 3]);
  const next_non_trivia = (from: number): number => {
    for (let i = from; i < count; i++) {
      if (!is_trivia(i)) return i;
    }
    return -1;
  };
  const prev_non_trivia = (from: number): number => {
    for (let i = from; i >= 0; i--) {
      if (!is_trivia(i)) return i;
    }
    return -1;
  };
  return {
    input,
    tokens,
    token_types,
    count,
    comment_id,
    kind_of,
    text_of,
    is_trivia,
    next_non_trivia,
    prev_non_trivia,
  };
}

// ---------------------------------------------------------------------------
// ScopeStack
// ---------------------------------------------------------------------------
//
// generic bracket stack. each entry remembers its bracket kind plus a
// caller-defined `data` value for any per-scope state the pass wants to
// track (at_start flag, brace context, qmark counter, ...). depths are
// exposed as plain number properties, updated on each push/pop.
//
// the tokenizer coalesces runs of same-kind punctuation into a single
// token (e.g. `});` lands as ONE punctuation token); callers iterate char
// by char and call push/pop per character so depths stay in sync.

export type Bracket = "{" | "(" | "[";

export interface Scope<T> {
  bracket: Bracket;
  data: T;
}

export interface ScopeStack<T> {
  readonly entries: Scope<T>[];
  paren_depth: number;
  brace_depth: number;
  bracket_depth: number;
  length(): number;
  top(): Scope<T> | undefined;
  push(bracket: Bracket, data: T): void;
  pop(): Scope<T> | undefined;
}

export function make_scope_stack<T>(): ScopeStack<T> {
  const entries: Scope<T>[] = [];
  const stack: ScopeStack<T> = {
    entries,
    paren_depth: 0,
    brace_depth: 0,
    bracket_depth: 0,
    length(): number {
      return entries.length;
    },
    top(): Scope<T> | undefined {
      return entries[entries.length - 1];
    },
    push(bracket: Bracket, data: T): void {
      entries.push({ bracket, data });
      if (bracket === "(") stack.paren_depth++;
      else if (bracket === "[") stack.bracket_depth++;
      else stack.brace_depth++;
    },
    pop(): Scope<T> | undefined {
      const e = entries.pop();
      if (e === undefined) return undefined;
      if (e.bracket === "(") stack.paren_depth--;
      else if (e.bracket === "[") stack.bracket_depth--;
      else stack.brace_depth--;
      return e;
    },
  };
  return stack;
}


// ---- lib/core/src/compiler.ts ----
import type { Grammar, CompiledGrammar, PatternInfo, GrammarState, GrammarRule } from "./types";
import {
  ASCII,
  DIGIT,
  LETTER,
  LOWER,
  UPPER,
  ALNUM,
  SPACE,
  WORD,
  HEX,
  PRINT,
  PUNCT,
  CONTROL,
} from "./constants";

// helper function to set character mapping
function set_char_mapping(
  char_maps: Uint16Array,
  state_id: number,
  char_code: number,
  rule_idx: number,
): void {
  const index = state_id * 128 + char_code;
  // always use the first rule that matches a character
  // this gives us predictable precedence
  if (char_maps[index] === 65535) {
    char_maps[index] = rule_idx;
  }
}

// record a rule's claim over a span of codepoints >= 128, as a range.
//
// this used to be a per-codepoint object map, which meant a rule written as
// range([[0x80, 0xffff]]) - the usual way to say "any unicode identifier
// character" - materialised 65408 own properties per state it appeared in.
// python does that in three states and paid roughly 11ms at import for it, ten
// times what every other grammar paid. ranges are stored as ranges instead;
// the tokenizer scans the list, which stays short because non-ascii rules are
// rare. module scope rather than a closure inside compile() so that grammars
// with no non-ascii rules at all do not allocate one per compile.
function add_non_ascii(
  build: Map<number, number[]>,
  state_id: number,
  start: number,
  end: number,
  rule_idx: number,
  state_name: string,
  subject: string,
): void {
  let list = build.get(state_id);
  if (list === undefined) {
    list = [];
    build.set(state_id, list);
  }
  for (let i = 0; i < list.length; i += 3) {
    if (start <= list[i + 1] && end >= list[i]) {
      throw new Error(
        `Grammar validation error in state "${state_name}": ` +
          `Multiple rules match ${subject}. ` +
          `Rule ${list[i + 2]} and rule ${rule_idx} both match this character.`,
      );
    }
  }
  list.push(start, end, rule_idx);
}

// preprocess grammar to expand match_within rules into states
function preprocess_grammar(grammar: Grammar): Grammar {
  const processed_grammar: Grammar = {
    name: grammar.name,
    states: { ...grammar.states },
  };

  // track generated states
  const generated_states: Record<string, GrammarState> = {};
  let state_counter = 0;

  // process each state
  for (const [state_name, state] of Object.entries(processed_grammar.states)) {
    const processed_rules: GrammarRule[] = [];

    for (const rule of state.rules ?? []) {
      if (rule.match_within) {
        if ((rule.match_within as any).begin !== undefined) {
          throw new Error(
            `Grammar error in state "${state_name}" rule ${processed_rules.length}: ` +
              `match_within uses "start" not "begin". ` +
              `Change { begin: "..." } to { start: "..." }.`,
          );
        }
        // generate a unique state name for the content matcher
        const content_state_name = `__match_within_${state_name}_${state_counter++}`;

        // replace match_within rule with a rule that enters the generated state
        processed_rules.push({
          match: rule.match_within.start,
          token: rule.token,
          state: content_state_name,
        });

        // create the content state
        const content_rules: GrammarRule[] = [];

        // add escape handling if specified
        if (rule.match_within.escape) {
          content_rules.push({
            match: rule.match_within.escape,
            token: rule.token,
            state: `${content_state_name}_escape`,
          });

          // create escape state that consumes one character and returns
          generated_states[`${content_state_name}_escape`] = {
            rules: [
              {
                range: [0, 127],
                token: rule.token,
                exit: true,
              },
            ],
          };
        }

        // add end delimiter rule
        content_rules.push({
          match: rule.match_within.end,
          token: rule.token,
          exit: true,
        });

        // add default rule to consume any other character
        // when multiline is false, exclude \n (charCode 10) so strings don't span lines
        const content_range: [number, number] | [number, number][] =
          rule.match_within.multiline === false
            ? [
                [0, 9],
                [11, 127],
              ]
            : [0, 127];
        content_rules.push({
          range: content_range,
          token: rule.token,
        });

        generated_states[content_state_name] = {
          rules: content_rules,
        };
      } else {
        // keep non match_within rules as is
        processed_rules.push(rule);
      }
    }

    processed_grammar.states[state_name] = {
      ...state,
      rules: processed_rules,
    };
  }

  // add generated states to the grammar
  Object.assign(processed_grammar.states, generated_states);

  return processed_grammar;
}
export function define_grammar(grammar: Grammar): Grammar {
  return grammar;
}

export function compile(grammar: Grammar): CompiledGrammar {
  // preprocess grammar to expand match_within rules
  const processed_grammar = preprocess_grammar(grammar);
  const state_names = Object.keys(processed_grammar.states);
  const state_map = new Map<string, number>();
  state_names.forEach((name, idx) => state_map.set(name, idx));

  // map token names to sequential IDs
  const token_type_set = new Set<string>();
  for (const name of state_names) {
    const state = processed_grammar.states[name];
    (state.rules ?? []).forEach((rule) => {
      if (rule.token) {
        token_type_set.add(rule.token);
      }
    });
  }
  const token_types = Array.from(token_type_set);
  const token_type_map = new Map<string, number>();
  token_types.forEach((type, idx) => token_type_map.set(type, idx));

  if (state_names.length > 65534) {
    throw new Error(
      `Grammar exceeds state limit: ${state_names.length} states (max 65534, including states generated by match_within).`,
    );
  }

  const grammar_label = grammar.name ?? "unnamed";

  // set to true when any rule sets seal/boundary; the tokenizer uses this
  // to skip per-emission seal_flags lookup on grammars that don't opt in.
  let has_seals = false;

  // warn about exit:true in the root state, there is no parent to return to
  const root_state_name = state_names[0];
  const root_state = processed_grammar.states[root_state_name];
  (root_state.rules ?? []).forEach((rule, rule_idx) => {
    if (rule.exit && !rule.state) {
      console.warn(
        `Grammar warning: rule ${rule_idx} in root state "${root_state_name}" ` +
          `has exit:true but there is no parent state to return to. ` +
          `This exit will be a no-op.`,
      );
    }
  });

  // pre-allocate transitions and character maps
  const max_rules = 256;
  const transitions = new Uint16Array(state_names.length * max_rules * 3);
  transitions.fill(65535);

  // initialize char_maps with 65535 (no rule)
  const char_maps = new Uint16Array(state_names.length * 128);
  char_maps.fill(65535);

  const fallback_transitions = new Uint16Array(state_names.length * 3);
  fallback_transitions.fill(65535);

  // seal flags, indexed by (state * 256 + rule_idx), and fallback-seal flags
  // indexed by state. a 1 means the emission at that rule seals a lexeme
  // boundary (blocks backward coalescing). kept in separate Uint8Arrays so
  // the transitions table's stack_op slot stays in {0,1,2} — the tokenizer
  // reads it without a mask on every transition.
  const seal_flags = new Uint8Array(state_names.length * max_rules);
  const fallback_seal_flags = new Uint8Array(state_names.length);

  const keywords = new Map();
  const patterns = new Map(); // state -> char -> Array<{codes, length, rule_idx}>
  // state -> flat [start, end, rule_idx] triples covering codepoints >= 128.
  // see add_non_ascii for why these are ranges and not per-codepoint entries.
  const non_ascii_build = new Map<number, number[]>();
  const boundary_rules = new Set<number>(); // track rules that require boundary checking
  // track which states are probe states based on state.mode property
  const probe_states = new Set<number>();
  // track fallback states for probe states
  const probe_fallbacks = new Map<number, number>();

  state_names.forEach((name) => {
    const state = processed_grammar.states[name];
    const state_id = state_map.get(name);
    if (state_id === undefined) {
      throw new Error(`State ${name} not found in state_map`);
    }

    // check if this state has mode: "probe"
    if (state.mode === "probe") {
      probe_states.add(state_id);
      // if probe state has a fallback, store it
      if (state.fallback) {
        const fallback_state_id = state_map.get(state.fallback);
        if (fallback_state_id === undefined) {
          throw new Error(
            `Grammar "${grammar.name ?? "unnamed"}": probe state "${name}" fallback references unknown state "${state.fallback}"`,
          );
        }
        probe_fallbacks.set(state_id, fallback_state_id);
      }
    }

    // build per state buckets for multi char patterns
    const state_buckets: (PatternInfo[] | null)[] = Array(128);
    for (let i = 0; i < 128; i++) state_buckets[i] = null;

    state.rules!.forEach((rule, rule_idx) => {
      let next_state = 65535;
      let stack_op = 0;

      // handle state transitions and exits
      if (rule.state && rule.exit) {
        // sideways transition: exit current state and enter new state
        const sid = state_map.get(rule.state);
        if (sid === undefined) {
          throw new Error(
            `Grammar "${grammar.name ?? "unnamed"}": state "${name}" rule ${rule_idx} references unknown state "${rule.state}"`,
          );
        }
        next_state = sid;
        stack_op = 2; // use exit operation, but with a target state
      } else if (rule.state) {
        // regular push transition
        const sid = state_map.get(rule.state);
        if (sid === undefined) {
          throw new Error(
            `Grammar "${grammar.name ?? "unnamed"}": state "${name}" rule ${rule_idx} references unknown state "${rule.state}"`,
          );
        }
        next_state = sid;
        stack_op = 1;
      } else if (rule.exit) {
        // regular pop/exit
        stack_op = 2;
      }

      let token_type = 65535;
      if (rule.token) {
        const mapped_type = token_type_map.get(rule.token);
        if (mapped_type !== undefined) {
          token_type = mapped_type;
        }
      }

      // a rule seals (forces a lexeme boundary on emission) when it is
      // boundary-checked or the author opted in explicitly. structural
      // transitions (push/pop/sideways) do NOT automatically seal: most
      // grammars use single-char push rules whose emission is meant to
      // coalesce with a following body (e.g. `E` prefix + `LSE`
      // continuation, opening quote + string body). grammars that need
      // a push/pop to seal opt in with `seal: true`.
      //
      // multi-char "lexeme atom" sealing is enforced at runtime by the
      // tokenizer — it checks whether the emission came from a
      // multi-char bucket match. that means a rule like
      // `match: [...OP_4CHAR, "?"]` seals only when one of the longer
      // alternatives actually fires, not when the bare `?` matches.
      //
      // the seal flag lives in a parallel Uint8Array (seal_flags); the
      // transitions table's stack_op slot stays in {0,1,2} so the hot
      // loop can read it without masking.
      const seal = rule.seal === true || rule.boundary === true;
      if (seal) {
        has_seals = true;
        seal_flags[state_id * max_rules + rule_idx] = 1;
      }

      const t_base = ((state_id << 8) + rule_idx) * 3; // optimize multiplication
      transitions[t_base] = next_state;
      transitions[t_base + 1] = token_type;
      transitions[t_base + 2] = stack_op;

      // handle patterns with smart validation
      if (rule.match) {
        const matches = Array.isArray(rule.match) ? rule.match : [rule.match];
        for (const match of matches) {
          // handle symbol constants
          if (match === ASCII) {
            // all ASCII characters (0-127)
            for (let i = 0; i < 128; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
          } else if (match === DIGIT) {
            // digits 0-9
            for (let i = 48; i <= 57; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
          } else if (match === LETTER) {
            // letters a-z, A-Z
            for (let i = 65; i <= 90; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
            for (let i = 97; i <= 122; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
          } else if (match === LOWER) {
            // lowercase letters a-z
            for (let i = 97; i <= 122; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
          } else if (match === UPPER) {
            // uppercase letters A-Z
            for (let i = 65; i <= 90; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
          } else if (match === ALNUM) {
            // alphanumeric: a-z, A-Z, 0-9
            for (let i = 48; i <= 57; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
            for (let i = 65; i <= 90; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
            for (let i = 97; i <= 122; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
          } else if (match === SPACE) {
            // whitespace: space, tab, newline, carriage return
            const spaces = [32, 9, 10, 13];
            for (const i of spaces) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
          } else if (match === WORD) {
            // word characters: a-z, A-Z, 0-9, _
            for (let i = 48; i <= 57; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
            for (let i = 65; i <= 90; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
            for (let i = 97; i <= 122; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
            // underscore
            set_char_mapping(char_maps, state_id, 95, rule_idx);
          } else if (match === HEX) {
            // hex digits: 0-9, a-f, A-F
            for (let i = 48; i <= 57; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
            for (let i = 65; i <= 70; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
            for (let i = 97; i <= 102; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
          } else if (match === PRINT) {
            // printable ASCII: 32-126
            for (let i = 32; i <= 126; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
          } else if (match === PUNCT) {
            // ASCII punctuation
            const punct_ranges = [
              [33, 47], // ! " # $ % & ' ( ) * + , - . /
              [58, 64], // : ; < = > ? @
              [91, 96], // [ \ ] ^ _ `
              [123, 126], // { | } ~
            ];
            for (const [start, end] of punct_ranges) {
              for (let i = start; i <= end; i++) {
                set_char_mapping(char_maps, state_id, i, rule_idx);
              }
            }
          } else if (match === CONTROL) {
            // control characters: 0-31, 127
            for (let i = 0; i <= 31; i++) {
              set_char_mapping(char_maps, state_id, i, rule_idx);
            }
            set_char_mapping(char_maps, state_id, 127, rule_idx);
          } else if (typeof match === "string") {
            if (match.length === 1) {
              // single character
              const code = match.charCodeAt(0);
              if (code < 128) {
                set_char_mapping(char_maps, state_id, code, rule_idx);
                // track if this rule requires boundary checking
                if (rule.boundary) {
                  boundary_rules.add(state_id * 256 + rule_idx);
                }
              } else {
                // non ASCII character
                add_non_ascii(
                  non_ascii_build,
                  state_id,
                  code,
                  code,
                  rule_idx,
                  name,
                  `non-ASCII character '${match}' (code: ${code})`,
                );
                // track if this rule requires boundary checking
                if (rule.boundary) {
                  boundary_rules.add(state_id * 256 + rule_idx);
                }
              }
            } else if (match.length > 1) {
              // multi character pattern
              const first_char = match.charCodeAt(0);
              if (first_char < 128) {
                // store pattern
                const codes = new Uint16Array(match.length);
                for (let i = 0; i < match.length; i++) {
                  codes[i] = match.charCodeAt(i);
                }

                const info: PatternInfo = {
                  codes,
                  length: match.length,
                  rule_idx,
                  boundary: rule.boundary,
                };

                // add to the appropriate bucket
                if (!state_buckets[first_char]) {
                  state_buckets[first_char] = [];
                }
                state_buckets[first_char]!.push(info);

                // for multi char patterns, we don't set char_map
                // they are only matched through the pattern bucket mechanism
                // the char_map should only be set for single character matches
              }
            }
          }
        }
      }

      // handle ranges
      if (rule.range) {
        const ranges = Array.isArray(rule.range[0]) ? rule.range : [rule.range];

        for (const range of ranges as Array<[string | number, string | number]>) {
          const start = typeof range[0] === "string" ? range[0].charCodeAt(0) : range[0];
          const end = typeof range[1] === "string" ? range[1].charCodeAt(0) : range[1];

          // the ascii half still expands per character because char_maps is a
          // dense table keyed by codepoint. the non-ascii half must not: it is
          // unbounded in principle and 65408 wide in practice.
          const ascii_end = end < 127 ? end : 127;
          for (let code = start; code <= ascii_end; code++) {
            set_char_mapping(char_maps, state_id, code, rule_idx);
          }
          if (end >= 128) {
            const non_ascii_start = start < 128 ? 128 : start;
            add_non_ascii(
              non_ascii_build,
              state_id,
              non_ascii_start,
              end,
              rule_idx,
              name,
              `characters in range ${non_ascii_start}..${end}`,
            );
          }
        }
      }

      // handle 'any' for matching any character (fallback)
      if (rule.any) {
        // mark all unmapped characters
        for (let c = 0; c < 128; c++) {
          if (char_maps[state_id * 128 + c] === 65535) {
            char_maps[state_id * 128 + c] = rule_idx;
          }
        }
        const idx = state_id * 3;
        fallback_transitions[idx] = next_state;
        fallback_transitions[idx + 1] = token_type;
        fallback_transitions[idx + 2] = stack_op;
        if (seal) fallback_seal_flags[state_id] = 1;
      }
    });

    // sort each bucket by descending length to enable first fit longest match
    let has_any = false;
    for (let i = 0; i < 128; i++) {
      if (state_buckets[i] && state_buckets[i]!.length > 0) {
        state_buckets[i]!.sort((a, b) => b.length - a.length);
        has_any = true;
      }
    }
    if (has_any) patterns.set(state_id, state_buckets);
  });

  // build a compact probe mask for hot path lookup
  const probe_mask = new Uint8Array(state_names.length);
  probe_states.forEach((id) => {
    probe_mask[id] = 1;
  });

  // order does not matter: overlapping ranges are rejected above, so at most
  // one entry can match a given codepoint whatever order the scan takes.
  const non_ascii_ranges = new Map<number, Int32Array>();
  for (const [state_id, list] of non_ascii_build) {
    non_ascii_ranges.set(state_id, Int32Array.from(list));
  }

  return {
    states: state_map,
    transitions,
    char_maps,
    keywords,
    token_types,
    patterns: patterns,
    fallback_transitions,
    non_ascii_ranges,
    probe_states: probe_states,
    probe_mask,
    probe_fallbacks: probe_fallbacks,
    boundary_rules: boundary_rules.size > 0 ? boundary_rules : undefined,
    has_seals,
    seal_flags: has_seals ? seal_flags : undefined,
    fallback_seal_flags: has_seals ? fallback_seal_flags : undefined,
  };
}
