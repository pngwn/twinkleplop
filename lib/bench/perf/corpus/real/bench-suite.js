// ---- lib/bench/src/library/tokenization-suite.bench.js ----
import { bench, describe } from "vitest";

// ============================================================================
// Core Tokenization Performance Suite
// Benchmarks the fundamental char scanning vs regex approaches
// ============================================================================

const js_code = `
function processData(items, options = {}) {
	const results = [];
	const maxItems = options.limit || 100;
	
	for (let i = 0; i < items.length && i < maxItems; i++) {
		const item = items[i];
		// Process each item
		if (item.value > 0 && item.active) {
			results.push({
				id: item.id,
				value: item.value * 2.5,
				name: \`Item #\${i + 1}\`,
				tags: ['processed', 'valid']
			});
		}
	}
	
	return results.filter(r => r.value < 1000);
}`.trim();

const css_code = `
:root {
	--primary: #3b82f6;
	--secondary: #10b981;
}

.component {
	display: flex;
	padding: 1rem;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 0.5rem;
	transition: all 0.3s ease;
}

.component:hover {
	transform: translateY(-2px);
	box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}`.trim();

describe("Character Scanning vs Regex", () => {
  // Pre-compiled regexes
  const patterns = [
    /^\s+/,
    /^\/\/.*/,
    /^\/\*[\s\S]*?\*\//,
    /^"(?:[^"\\]|\\.)*"/,
    /^'(?:[^'\\]|\\.)*'/,
    /^`(?:[^`\\]|\\.)*`/,
    /^\d+(\.\d+)?/,
    /^[a-zA-Z_$][a-zA-Z0-9_$]*/,
    /^[(){}\[\]]/,
    /^[+\-*/%=<>!&|^~?:]/,
    /^[,;.]/,
  ];

  bench("Character Scanning", () => {
    const tokens = [];
    let i = 0;

    while (i < js_code.length) {
      const char = js_code.charCodeAt(i);

      // Whitespace
      if (char === 32 || char === 9 || char === 10 || char === 13) {
        const start = i;
        while (i < js_code.length) {
          const c = js_code.charCodeAt(i);
          if (c !== 32 && c !== 9 && c !== 10 && c !== 13) break;
          i++;
        }
        tokens.push({ type: "whitespace", start, end: i });
        continue;
      }

      // Numbers
      if (char >= 48 && char <= 57) {
        const start = i;
        while (i < js_code.length && js_code.charCodeAt(i) >= 48 && js_code.charCodeAt(i) <= 57) {
          i++;
        }
        if (i < js_code.length && js_code.charCodeAt(i) === 46) {
          i++;
          while (i < js_code.length && js_code.charCodeAt(i) >= 48 && js_code.charCodeAt(i) <= 57) {
            i++;
          }
        }
        tokens.push({ type: "number", start, end: i });
        continue;
      }

      // Identifiers
      if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122) || char === 95 || char === 36) {
        const start = i;
        while (i < js_code.length) {
          const c = js_code.charCodeAt(i);
          if (
            !(
              (c >= 65 && c <= 90) ||
              (c >= 97 && c <= 122) ||
              (c >= 48 && c <= 57) ||
              c === 95 ||
              c === 36
            )
          ) {
            break;
          }
          i++;
        }
        tokens.push({ type: "identifier", start, end: i });
        continue;
      }

      // Single character tokens
      tokens.push({ type: "punctuation", start: i, end: ++i });
    }

    return tokens;
  });

  bench("Regex with Slicing", () => {
    const tokens = [];
    let remaining = js_code;
    let position = 0;

    while (remaining.length > 0) {
      let matched = false;

      for (const pattern of patterns) {
        const match = remaining.match(pattern);
        if (match) {
          tokens.push({
            type: "token",
            start: position,
            end: position + match[0].length,
          });
          position += match[0].length;
          remaining = remaining.slice(match[0].length);
          matched = true;
          break;
        }
      }

      if (!matched) {
        tokens.push({ type: "unknown", start: position, end: position + 1 });
        position++;
        remaining = remaining.slice(1);
      }
    }

    return tokens;
  });
});

describe("String Context Handling", () => {
  const string_heavy_code = `
const message = "This is a longer string with some content that needs escaping: \\"quotes\\" and \\n newlines";
const template = \`
	Multi-line template literal
	with \${interpolation} and more text
	spanning several lines
\`;
const single = 'Single quoted string with \\'escapes\\' inside';
`.trim();

  bench("Character Chomping", () => {
    const tokens = [];
    let i = 0;

    while (i < string_heavy_code.length) {
      // Check for strings
      if (string_heavy_code.charCodeAt(i) === 34) {
        // "
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2; // skip escape
          } else if (char === 34) {
            // closing quote
            i++;
            break;
          } else {
            i++;
          }
        }
        tokens.push({ type: "string", start, end: i });
        continue;
      }

      if (string_heavy_code.charCodeAt(i) === 39) {
        // '
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2;
          } else if (char === 39) {
            // closing quote
            i++;
            break;
          } else {
            i++;
          }
        }
        tokens.push({ type: "string", start, end: i });
        continue;
      }

      if (string_heavy_code.charCodeAt(i) === 96) {
        // `
        const start = i++;
        while (i < string_heavy_code.length) {
          const char = string_heavy_code.charCodeAt(i);
          if (char === 92) {
            // backslash
            i += 2;
          } else if (char === 96) {
            // closing backtick
            i++;
            break;
          } else {
            i++;
          }
        }
        tokens.push({ type: "template", start, end: i });
        continue;
      }

      // Skip other characters
      i++;
    }

    return tokens;
  });

  bench("Regex String Matching", () => {
    const tokens = [];
    const string_pattern = /^(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/;
    let remaining = string_heavy_code;
    let position = 0;

    while (remaining.length > 0) {
      const match = remaining.match(string_pattern);
      if (match) {
        tokens.push({
          type: "string",
          start: position,
          end: position + match[0].length,
        });
        position += match[0].length;
        remaining = remaining.slice(match[0].length);
      } else {
        position++;
        remaining = remaining.slice(1);
      }
    }

    return tokens;
  });
});

describe("Identifier and Keyword Detection", () => {
  const keywords = new Set([
    "function",
    "const",
    "let",
    "var",
    "if",
    "else",
    "for",
    "while",
    "return",
    "class",
    "async",
    "await",
    "new",
    "this",
    "super",
  ]);

  const identifier_code =
    "function processData const results async transform return filter class DataProcessor";

  bench("Scan + Set Lookup", () => {
    const tokens = [];
    let i = 0;

    while (i < identifier_code.length) {
      const char = identifier_code.charCodeAt(i);

      // Skip whitespace
      if (char === 32) {
        i++;
        continue;
      }

      // Identifier
      if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
        const start = i;
        while (i < identifier_code.length) {
          const c = identifier_code.charCodeAt(i);
          if (!((c >= 65 && c <= 90) || (c >= 97 && c <= 122))) {
            break;
          }
          i++;
        }

        const word = identifier_code.slice(start, i);
        tokens.push({
          type: keywords.has(word) ? "keyword" : "identifier",
          start,
          end: i,
        });
        continue;
      }

      i++;
    }

    return tokens;
  });

  bench("Regex + Array Search", () => {
    const tokens = [];
    const keyword_list = Array.from(keywords);
    const ident_pattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*/;
    let remaining = identifier_code;
    let position = 0;

    while (remaining.length > 0) {
      if (remaining[0] === " ") {
        position++;
        remaining = remaining.slice(1);
        continue;
      }

      const match = remaining.match(ident_pattern);
      if (match) {
        const word = match[0];
        tokens.push({
          type: keyword_list.includes(word) ? "keyword" : "identifier",
          start: position,
          end: position + word.length,
        });
        position += word.length;
        remaining = remaining.slice(word.length);
      } else {
        position++;
        remaining = remaining.slice(1);
      }
    }

    return tokens;
  });
});

describe("Failed Match Performance", () => {
  // Code with many tokens that won't match initial patterns
  const complex_code = ">>>===<<<???.?.?.***&&&|||^^^~~~";

  bench("Character Scanning (predictable)", () => {
    const tokens = [];
    let i = 0;

    while (i < complex_code.length) {
      const char = complex_code.charCodeAt(i);
      const start = i;

      // Try multi-char operators
      if (char === 62) {
        // >
        if (i + 1 < complex_code.length && complex_code.charCodeAt(i + 1) === 62) {
          if (i + 2 < complex_code.length && complex_code.charCodeAt(i + 2) === 62) {
            tokens.push({ type: ">>>", start, end: i + 3 });
            i += 3;
            continue;
          }
        }
      }

      if (char === 61) {
        // =
        if (i + 1 < complex_code.length && complex_code.charCodeAt(i + 1) === 61) {
          if (i + 2 < complex_code.length && complex_code.charCodeAt(i + 2) === 61) {
            tokens.push({ type: "===", start, end: i + 3 });
            i += 3;
            continue;
          }
        }
      }

      // Default single char
      tokens.push({ type: "operator", start, end: ++i });
    }

    return tokens;
  });

  bench("Regex (multiple attempts)", () => {
    const tokens = [];
    const patterns = [
      /^>>>/,
      /^===/,
      /^<<</,
      /^\?\?\?/,
      /^\.\.\./,
      /^\*\*\*/,
      /^&&&/,
      /^\|\|\|/,
      /^\^\^\^/,
      /^~~~/,
      /^./, // fallback
    ];

    let remaining = complex_code;
    let position = 0;

    while (remaining.length > 0) {
      for (const pattern of patterns) {
        const match = remaining.match(pattern);
        if (match) {
          tokens.push({
            type: "operator",
            start: position,
            end: position + match[0].length,
          });
          position += match[0].length;
          remaining = remaining.slice(match[0].length);
          break;
        }
      }
    }

    return tokens;
  });
});


// ---- lib/bench/src/library/micro-optimizations.bench.js ----
import { bench, describe } from "vitest";

// Micro-benchmarks to validate tokenizer inner-loop ideas in isolation

describe("Probe State Lookup", () => {
  const STATES = 64;
  const iterations = 2_000_000;

  // Set-based membership
  const probe_set = new Set();
  for (let i = 0; i < STATES; i += 5) probe_set.add(i);

  // Uint8Array mask membership
  const probe_mask = new Uint8Array(STATES);
  for (let i = 0; i < STATES; i += 5) probe_mask[i] = 1;

  bench("Set.has(state)", () => {
    let hits = 0;
    for (let i = 0, s = 0; i < iterations; i++, s = (s + 1) % STATES) {
      if (probe_set.has(s)) hits++;
    }
    return hits;
  });

  bench("Uint8Array[state]", () => {
    let hits = 0;
    for (let i = 0, s = 0; i < iterations; i++, s = (s + 1) % STATES) {
      if (probe_mask[s]) hits++;
    }
    return hits;
  });
});

describe("Failed Probe Guard", () => {
  const iterations = 5_000_000;
  const set = new Set();
  // Simulate some failures recorded
  for (let i = 0; i < 100; i++) set.add(i);
  const has_failures = set.size > 0; // boolean flag alternative

  bench("Check set.size > 0 each time", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      if (set.size > 0) sum++;
    }
    return sum;
  });

  bench("Precomputed boolean flag", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      if (has_failures) sum++;
    }
    return sum;
  });
});

describe("Pattern Code Storage", () => {
  // Compare matching loop against number[] vs Uint16Array for codes
  const make_word = (len) => {
    let s = "";
    for (let i = 0; i < len; i++) s += String.fromCharCode(65 + (i % 26));
    return s;
  };
  const input = make_word(64) + make_word(64); // ensure a few full matches
  const codes_array = Array.from(input).map((c) => c.charCodeAt(0));
  const codes_typed = new Uint16Array(codes_array);
  const pos = 0;
  const len = input.length;

  bench("number[] compare", () => {
    let matched = true;
    for (let i = 1; i < codes_array.length && pos + i < len; i++) {
      if (input.charCodeAt(pos + i) !== codes_array[i]) {
        matched = false;
        break;
      }
    }
    return matched;
  });

  bench("Uint16Array compare", () => {
    let matched = true;
    for (let i = 1; i < codes_typed.length && pos + i < len; i++) {
      if (input.charCodeAt(pos + i) !== codes_typed[i]) {
        matched = false;
        break;
      }
    }
    return matched;
  });
});

describe("Index Base Calculation", () => {
  const iterations = 10_000_000;
  bench("state * 128", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      const state = i & 0xff;
      sum += state * 128;
    }
    return sum;
  });

  bench("state << 7", () => {
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      const state = i & 0xff;
      sum += state << 7;
    }
    return sum;
  });
});

describe("Non-ASCII lookup structures", () => {
  const codes = [];
  for (let i = 200; i < 600; i += 3) codes.push(i);
  const value = 42;

  // Map-based
  const map = new Map();
  for (const c of codes) map.set(c, value);

  // Object-based
  const obj = Object.create(null);
  for (const c of codes) obj[c] = value;

  // Sparse typed array (range-limited)
  const max = Math.max(...codes);
  const arr = new Uint16Array(max + 1);
  for (const c of codes) arr[c] = value;

  const iters = 5_000_0; // 50k lookups per structure
  const query = codes.concat([1337, 2049, 1025, 777]);

  bench("Map.has + get", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        if (map.has(c)) sum += map.get(c);
      }
    }
    return sum;
  });

  bench("Object property check", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        const v = obj[c];
        if (v !== undefined) sum += v;
      }
    }
    return sum;
  });

  bench("Typed array direct index", () => {
    let sum = 0;
    for (let i = 0; i < iters; i++) {
      for (let j = 0; j < query.length; j++) {
        const c = query[j];
        const v = arr[c];
        if (v !== 0) sum += v;
      }
    }
    return sum;
  });
});


// ---- lib/bench/src/library/data-structures-suite.bench.js ----
import { bench, describe } from "vitest";

// ============================================================================
// Data Structures and Optimization Suite
// Benchmarks for token storage, lookup tables, and state management
// ============================================================================

describe("Token Storage Strategies", () => {
  const token_count = 1000;

  bench("Flat Uint32Array (triplets)", () => {
    const tokens = new Uint32Array(token_count * 3);

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      tokens[i * 3] = i % 20; // type
      tokens[i * 3 + 1] = i * 10; // start
      tokens[i * 3 + 2] = i * 10 + 8; // end
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      const type = tokens[i * 3];
      const start = tokens[i * 3 + 1];
      const end = tokens[i * 3 + 2];
      sum += type + start + end;
    }

    return sum;
  });

  bench("Array of Objects", () => {
    const tokens = [];

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      tokens.push({
        type: i % 20,
        start: i * 10,
        end: i * 10 + 8,
      });
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      const { type, start, end } = tokens[i];
      sum += type + start + end;
    }

    return sum;
  });

  bench("Structure of Arrays (SoA)", () => {
    const types = new Uint8Array(token_count);
    const starts = new Uint32Array(token_count);
    const ends = new Uint32Array(token_count);

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      types[i] = i % 20;
      starts[i] = i * 10;
      ends[i] = i * 10 + 8;
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      sum += types[i] + starts[i] + ends[i];
    }

    return sum;
  });

  bench("Array of Arrays", () => {
    const tokens = [];

    // Write tokens
    for (let i = 0; i < token_count; i++) {
      tokens.push([i % 20, i * 10, i * 10 + 8]);
    }

    // Read tokens
    let sum = 0;
    for (let i = 0; i < token_count; i++) {
      const [type, start, end] = tokens[i];
      sum += type + start + end;
    }

    return sum;
  });
});

describe("Lookup Table Performance", () => {
  // ASCII character classification
  const is_alpha = new Uint8Array(128);
  const is_digit = new Uint8Array(128);
  const is_whitespace = new Uint8Array(128);

  // Initialize lookup tables
  for (let i = 65; i <= 90; i++) is_alpha[i] = 1; // A-Z
  for (let i = 97; i <= 122; i++) is_alpha[i] = 1; // a-z
  for (let i = 48; i <= 57; i++) is_digit[i] = 1; // 0-9
  is_whitespace[32] = 1; // space
  is_whitespace[9] = 1; // tab
  is_whitespace[10] = 1; // newline
  is_whitespace[13] = 1; // carriage return

  const test_string = "Hello123 World456\n\tTest789";

  bench("Uint8Array Lookup", () => {
    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if (char < 128) {
        if (is_alpha[char]) alpha_count++;
        if (is_digit[char]) digit_count++;
        if (is_whitespace[char]) ws_count++;
      }
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Direct Comparison", () => {
    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if ((char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
        alpha_count++;
      }
      if (char >= 48 && char <= 57) {
        digit_count++;
      }
      if (char === 32 || char === 9 || char === 10 || char === 13) {
        ws_count++;
      }
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Set Lookup", () => {
    const alpha_set = new Set();
    const digit_set = new Set();
    const ws_set = new Set([32, 9, 10, 13]);

    for (let i = 65; i <= 90; i++) alpha_set.add(i);
    for (let i = 97; i <= 122; i++) alpha_set.add(i);
    for (let i = 48; i <= 57; i++) digit_set.add(i);

    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const char = test_string.charCodeAt(i);
      if (alpha_set.has(char)) alpha_count++;
      if (digit_set.has(char)) digit_count++;
      if (ws_set.has(char)) ws_count++;
    }

    return { alpha_count, digit_count, ws_count };
  });

  bench("Map Lookup", () => {
    const char_types = new Map();

    for (let i = 65; i <= 90; i++) char_types.set(i, "alpha");
    for (let i = 97; i <= 122; i++) char_types.set(i, "alpha");
    for (let i = 48; i <= 57; i++) char_types.set(i, "digit");
    char_types.set(32, "whitespace");
    char_types.set(9, "whitespace");
    char_types.set(10, "whitespace");
    char_types.set(13, "whitespace");

    let alpha_count = 0;
    let digit_count = 0;
    let ws_count = 0;

    for (let i = 0; i < test_string.length; i++) {
      const type = char_types.get(test_string.charCodeAt(i));
      if (type === "alpha") alpha_count++;
      else if (type === "digit") digit_count++;
      else if (type === "whitespace") ws_count++;
    }

    return { alpha_count, digit_count, ws_count };
  });
});

describe("State Machine Transitions", () => {
  const state_count = 10;
  const action_count = 5;

  bench("Computed Index (integer keys)", () => {
    // Flat array: [newState, token_type, stack_op]
    const transitions = new Uint8Array(state_count * action_count * 3);

    // Initialize some transitions
    for (let s = 0; s < state_count; s++) {
      for (let a = 0; a < action_count; a++) {
        const idx = (s * action_count + a) * 3;
        transitions[idx] = (s + 1) % state_count; // next state
        transitions[idx + 1] = a; // token type
        transitions[idx + 2] = 0; // no stack op
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const idx = (state * action_count + action) * 3;
      state = transitions[idx];
      const token_type = transitions[idx + 1];
      if (token_type > 0) token_count++;
    }

    return token_count;
  });

  bench("Map with string keys", () => {
    const transitions = new Map();

    // Initialize transitions
    for (let s = 0; s < state_count; s++) {
      for (let a = 0; a < action_count; a++) {
        transitions.set(`${s},${a}`, {
          next_state: (s + 1) % state_count,
          token_type: a,
          stack_op: 0,
        });
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const transition = transitions.get(`${state},${action}`);
      if (transition) {
        state = transition.next_state;
        if (transition.token_type > 0) token_count++;
      }
    }

    return token_count;
  });

  bench("Nested Objects", () => {
    const transitions = {};

    // Initialize transitions
    for (let s = 0; s < state_count; s++) {
      transitions[s] = {};
      for (let a = 0; a < action_count; a++) {
        transitions[s][a] = {
          next_state: (s + 1) % state_count,
          token_type: a,
          stack_op: 0,
        };
      }
    }

    // Simulate state machine execution
    let state = 0;
    let token_count = 0;

    for (let i = 0; i < 1000; i++) {
      const action = i % action_count;
      const transition = transitions[state][action];
      if (transition) {
        state = transition.next_state;
        if (transition.token_type > 0) token_count++;
      }
    }

    return token_count;
  });
});

describe("Token Type Mapping", () => {
  const token_types = [
    "keyword",
    "identifier",
    "string",
    "number",
    "comment",
    "operator",
    "punctuation",
    "whitespace",
    "bracket",
    "semicolon",
  ];

  bench("Integer with Array Lookup", () => {
    // Map token names to integers
    const type_to_int = {};
    const int_to_type = [];

    token_types.forEach((type, i) => {
      type_to_int[type] = i;
      int_to_type[i] = type;
    });

    // Simulate tokenization with integer types
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      tokens.push(type_to_int[token_types[i % token_types.length]]);
    }

    // Convert back for rendering
    const results = [];
    for (const token of tokens) {
      results.push(int_to_type[token]);
    }

    return results.length;
  });

  bench("String Keys Directly", () => {
    // Use strings directly
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      tokens.push(token_types[i % token_types.length]);
    }

    // No conversion needed for rendering
    const results = [];
    for (const token of tokens) {
      results.push(token);
    }

    return results.length;
  });

  bench("Map Lookup", () => {
    const type_map = new Map();
    token_types.forEach((type, i) => {
      type_map.set(type, i);
    });

    const reverse_map = new Map();
    token_types.forEach((type, i) => {
      reverse_map.set(i, type);
    });

    // Simulate tokenization
    const tokens = [];
    for (let i = 0; i < 100; i++) {
      const type = token_types[i % token_types.length];
      tokens.push(type_map.get(type));
    }

    // Convert back for rendering
    const results = [];
    for (const token of tokens) {
      results.push(reverse_map.get(token));
    }

    return results.length;
  });
});

describe("Stack Operations", () => {
  bench("Pre-allocated Uint8Array", () => {
    const stack = new Uint8Array(256);
    let stack_ptr = 0;
    let operations = 0;

    for (let i = 0; i < 1000; i++) {
      if (i % 3 === 0 && stack_ptr < 255) {
        // Push
        stack[stack_ptr++] = i % 10;
        operations++;
      } else if (stack_ptr > 0) {
        // Pop
        const value = stack[--stack_ptr];
        operations += value;
      }
    }

    return operations;
  });

  bench("JavaScript Array", () => {
    const stack = [];
    let operations = 0;

    for (let i = 0; i < 1000; i++) {
      if (i % 3 === 0 && stack.length < 255) {
        // Push
        stack.push(i % 10);
        operations++;
      } else if (stack.length > 0) {
        // Pop
        const value = stack.pop();
        operations += value;
      }
    }

    return operations;
  });

  bench("Bit-packed for shallow nesting", () => {
    let stack = 0; // 32-bit integer, supports 8 states of 4 bits each
    let depth = 0;
    let operations = 0;

    for (let i = 0; i < 1000; i++) {
      if (i % 3 === 0 && depth < 8) {
        // Push (4-bit value)
        stack = (stack << 4) | (i % 10);
        depth++;
        operations++;
      } else if (depth > 0) {
        // Pop
        const value = stack & 0xf;
        stack = stack >>> 4;
        depth--;
        operations += value;
      }
    }

    return operations;
  });
});
