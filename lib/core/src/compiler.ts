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

  // dense copies for the tokenizer, which rereads them on every state change,
  // the maps stay for tooling, filling by push keeps the arrays packed
  const patterns_by_state: ((PatternInfo[] | null)[] | undefined)[] = [];
  const non_ascii_by_state: (Int32Array | undefined)[] = [];
  for (let state_id = 0; state_id < state_names.length; state_id++) {
    patterns_by_state.push(patterns.get(state_id));
    non_ascii_by_state.push(non_ascii_ranges.get(state_id));
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
    patterns_by_state,
    non_ascii_by_state,
    probe_states: probe_states,
    probe_mask,
    probe_fallbacks: probe_fallbacks,
    boundary_rules: boundary_rules.size > 0 ? boundary_rules : undefined,
    has_seals,
    seal_flags: has_seals ? seal_flags : undefined,
    fallback_seal_flags: has_seals ? fallback_seal_flags : undefined,
  };
}
