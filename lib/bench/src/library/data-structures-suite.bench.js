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
