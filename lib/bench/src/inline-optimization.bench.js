import { bench, describe } from "vitest";
import { compile } from "@twinkleplop/core/compile";
import { tokenize } from "@twinkleplop/core";

// Real-world CSS test case
const css_grammar = {
  name: "css",
  states: {
    main: {
      mode: "normal",
      rules: [
        { match: ".", token: "class" },
        { match: "#", token: "id" },
        { match: "@", token: "at-rule" },
        { match: ["{", "}", ":", ";", "(", ")", ","], token: "punctuation" },
        { match: [" ", "\n", "\t", "\r"], token: "whitespace" },
        { match: ["//"], token: "comment", state: "line_comment" },
        { match: "/*", state: "block_comment" },
        { match: '"', state: "string_double" },
        { match: "'", state: "string_single" },
        { match: "-", token: "dash" },
        { match: "%", token: "percent" },
        { match: "!", token: "important" },
        {
          range: [
            ["a", "z"],
            ["A", "Z"],
          ],
          token: "identifier",
        },
        { range: ["0", "9"], token: "number" },
      ],
    },
    line_comment: {
      mode: "normal",
      rules: [
        { match: "\n", exit: true, token: "comment" },
        { any: true, token: "comment" },
      ],
    },
    block_comment: {
      mode: "normal",
      rules: [
        { match: "*/", exit: true, token: "comment" },
        { any: true, token: "comment" },
      ],
    },
    string_double: {
      mode: "normal",
      rules: [
        { match: '"', exit: true, token: "string" },
        { match: "\\", state: "escape_double" },
        { any: true, token: "string" },
      ],
    },
    string_single: {
      mode: "normal",
      rules: [
        { match: "'", exit: true, token: "string" },
        { match: "\\", state: "escape_single" },
        { any: true, token: "string" },
      ],
    },
    escape_double: {
      mode: "normal",
      rules: [{ any: true, exit: true, token: "string" }],
    },
    escape_single: {
      mode: "normal",
      rules: [{ any: true, exit: true, token: "string" }],
    },
  },
};

// Test input with various CSS constructs
const css_code = `
/* Reset styles */
* {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
}

.container {
	display: flex;
	flex-direction: column;
	max-width: 1200px;
	margin: 0 auto;
	padding: 2rem;
}

.button {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	padding: 0.75rem 1.5rem;
	border: none;
	border-radius: 0.5rem;
	font-size: 1rem;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.3s ease;
}

.button:hover {
	transform: translateY(-2px);
	box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
	.container {
		padding: 1rem;
	}
	
	.button {
		width: 100%;
	}
}

/* Comments with special chars: // not a line comment */
#header {
	position: sticky;
	top: 0;
	z-index: 100;
	background: rgba(255, 255, 255, 0.95);
}

.nav-link[aria-current="page"] {
	color: #667eea;
	font-weight: bold;
}
`;

const compiled = compile(css_grammar);

// Create a version with manual inlining for comparison
function tokenize_with_inlining(input, grammar) {
  const {
    transitions,
    char_maps,
    token_types,
    patterns,
    fallback_transitions,
    non_ascii_chars,
    probe_states,
    alternative_rules,
  } = grammar;

  const len = input.length;
  const tokens = new Uint32Array(len * 3);
  let token_count = 0;

  const state_stack = new Uint16Array(32);
  let stack_ptr = 0;
  let current_state = 0;
  let pos = 0;

  let last_token_type = 255;
  let last_token_end = -1;

  const failed_probes = new Set();
  let probe_entry = null;

  // Inline these lookups
  let state_buckets = patterns ? patterns.get(current_state) : undefined;
  let char_map_base = current_state * 128;
  let trans_base3 = current_state * 256 * 3;

  while (pos < len) {
    const char = input.charCodeAt(pos);

    // INLINED: is_in_probe_state check
    const is_in_probe_state = probe_states ? probe_states.has(current_state) : false;

    if (char < 128) {
      let matched_length = 0;
      let matched_rule_idx = 255;

      // INLINED: bucket check
      if (state_buckets) {
        const bucket = state_buckets[char];
        if (bucket) {
          const bucket_length = bucket.length;
          for (let b = 0; b < bucket_length; b++) {
            const pat = bucket[b];
            const p_len = pat.length;
            if (pos + p_len > len) continue;

            const codes = pat.codes;
            let matched = true;
            for (let i = 1; i < p_len; i++) {
              if (input.charCodeAt(pos + i) !== codes[i]) {
                matched = false;
                break;
              }
            }
            if (matched) {
              const test_key = (pos << 16) | (current_state << 8) | pat.rule_idx;
              if (failed_probes.has(test_key)) continue;
              matched_length = p_len;
              matched_rule_idx = pat.rule_idx;
              break;
            }
          }
        }
      }

      // INLINED: char_class lookup
      let char_class =
        matched_rule_idx !== 255 ? matched_rule_idx : char_maps[char_map_base + char];

      if (char_class !== 255) {
        // INLINED: transition lookup
        const t_base = trans_base3 + char_class * 3;
        const transition = transitions[t_base];
        const token_type = transitions[t_base + 1];
        const stack_op = transitions[t_base + 2];

        // INLINED: target state determination
        const target_state =
          transition !== 255
            ? transition
            : stack_op === 2 && stack_ptr > 0
              ? state_stack[stack_ptr - 1]
              : current_state;

        const is_target_probe_state = probe_states ? probe_states.has(target_state) : false;

        // Handle probe entry
        if (!is_in_probe_state && is_target_probe_state) {
          probe_entry = {
            pos: pos,
            state: current_state,
            stack_ptr: stack_ptr,
            rule_idx: char_class,
          };
        }

        // INLINED: token emission
        if (!is_in_probe_state && token_type !== 255) {
          const consume = matched_length || 1;
          const new_end = pos + consume;

          if (token_type === last_token_type && pos === last_token_end) {
            // Extend token inline
            tokens[(token_count - 1) * 3 + 2] = new_end;
          } else {
            // Emit token inline
            tokens[token_count * 3] = token_type;
            tokens[token_count * 3 + 1] = pos;
            tokens[token_count * 3 + 2] = new_end;
            token_count++;
          }
          last_token_type = token_type;
          last_token_end = new_end;
          pos = new_end;
        } else {
          if (stack_op !== 2) {
            pos += matched_length || 1;
          }
        }

        // INLINED: state transitions
        if (stack_op === 1) {
          state_stack[stack_ptr++] = current_state;
          current_state = transition;
          // INLINED: cache refresh
          state_buckets = patterns ? patterns.get(current_state) : undefined;
          char_map_base = current_state * 128;
          trans_base3 = current_state * 256 * 3;
        } else if (stack_op === 2) {
          if (stack_ptr > 0) {
            current_state = state_stack[--stack_ptr];
            // INLINED: cache refresh
            state_buckets = patterns ? patterns.get(current_state) : undefined;
            char_map_base = current_state * 128;
            trans_base3 = current_state * 256 * 3;
          }
        } else if (transition !== 255) {
          current_state = transition;
          // INLINED: cache refresh
          state_buckets = patterns ? patterns.get(current_state) : undefined;
          char_map_base = current_state * 128;
          trans_base3 = current_state * 256 * 3;
        }

        // Check probe exit
        if (is_in_probe_state && !is_target_probe_state && probe_entry) {
          pos = probe_entry.pos;
          stack_ptr = probe_entry.stack_ptr;
          if (stack_op === 1) {
            state_stack[stack_ptr++] = probe_entry.state;
          }
          probe_entry = null;
        }
      } else {
        // No match
        if (is_in_probe_state && probe_entry) {
          const key = (probe_entry.pos << 16) | (probe_entry.state << 8) | probe_entry.rule_idx;
          failed_probes.add(key);
          pos = probe_entry.pos;
          current_state = probe_entry.state;
          stack_ptr = probe_entry.stack_ptr;
          probe_entry = null;
          // INLINED: cache refresh
          state_buckets = patterns ? patterns.get(current_state) : undefined;
          char_map_base = current_state * 128;
          trans_base3 = current_state * 256 * 3;
        } else {
          pos++;
        }
      }
    } else {
      // Non-ASCII handling (simplified)
      pos++;
    }
  }

  return tokens.slice(0, token_count * 3);
}

describe("Inlining Optimization Tests", () => {
  bench("Standard tokenizer", () => {
    const tokens = tokenize(css_code, compiled);
    return tokens;
  });

  bench("Manually inlined tokenizer", () => {
    const tokens = tokenize_with_inlining(css_code, compiled);
    return tokens;
  });

  // Test specific inlining scenarios
  bench("Inline pattern: ternary for cache", () => {
    let sum = 0;
    const patterns = new Map([
      [0, [1, 2, 3]],
      [1, [4, 5, 6]],
    ]);
    for (let i = 0; i < 100000; i++) {
      const state = i & 1;
      // Non-inlined
      const buckets = patterns && patterns.get(state);
      if (buckets) sum += buckets[0];
    }
    return sum;
  });

  bench("Inline pattern: direct check", () => {
    let sum = 0;
    const patterns = new Map([
      [0, [1, 2, 3]],
      [1, [4, 5, 6]],
    ]);
    for (let i = 0; i < 100000; i++) {
      const state = i & 1;
      // Inlined
      const buckets = patterns ? patterns.get(state) : undefined;
      if (buckets) sum += buckets[0];
    }
    return sum;
  });

  bench("Inline pattern: if-else for cache", () => {
    let sum = 0;
    const patterns = new Map([
      [0, [1, 2, 3]],
      [1, [4, 5, 6]],
    ]);
    for (let i = 0; i < 100000; i++) {
      const state = i & 1;
      // Alternative inline
      let buckets;
      if (patterns) {
        buckets = patterns.get(state);
      } else {
        buckets = undefined;
      }
      if (buckets) sum += buckets[0];
    }
    return sum;
  });
});
