import { bench, describe } from "vitest";
import { compile } from "@twinkleplop/core";
import { tokenize } from "@twinkleplop/core";

// Grammar with heavy probe mode usage
const probe_grammar = {
  name: "probe-test",
  states: {
    main: {
      mode: "normal",
      rules: [
        {
          match: "/",
          state: "maybe_comment",
        },
        {
          match: ["a", "b", "c", "d", "e", "f", "g", "h"],
          token: "letter",
        },
        {
          match: " ",
          token: "space",
        },
      ],
    },
    maybe_comment: {
      mode: "probe",
      rules: [
        {
          match: "/",
          state: "line_comment",
        },
        {
          match: "*",
          state: "block_comment",
        },
      ],
    },
    line_comment: {
      mode: "normal",
      rules: [
        {
          match: "\n",
          exit: true,
          token: "comment",
        },
        {
          any: true,
          token: "comment",
        },
      ],
    },
    block_comment: {
      mode: "normal",
      rules: [
        {
          match: "*",
          state: "block_comment_end",
        },
        {
          any: true,
          token: "comment",
        },
      ],
    },
    block_comment_end: {
      mode: "probe",
      rules: [
        {
          match: "/",
          exit: true,
          token: "comment",
        },
      ],
    },
  },
};

// Test code with many false probe opportunities
const test_code = `
// This is a line comment
/abc def/g // regex-like but in comment
function divide(a, b) {
	return a / b; // Simple division
}
/* Block comment with / and * chars */
const ratio = width / height;
const pattern = /^[a-z]+/; // actual regex
/* Multi
   line
   block /* nested */ comment */
`;

const compiled_grammar = compile(probe_grammar);

describe("Probe Mode Optimization", () => {
  bench("Tokenize with probe mode", () => {
    const tokens = tokenize(test_code, compiled_grammar);
    return tokens;
  });

  bench("Character scan without probes", () => {
    const tokens = [];
    let pos = 0;
    const len = test_code.length;

    while (pos < len) {
      const char = test_code.charCodeAt(pos);
      const start = pos;

      // Simple character classification
      if (char === 47) {
        // '/'
        // Check next char
        if (pos + 1 < len) {
          const next = test_code.charCodeAt(pos + 1);
          if (next === 47) {
            // '//'
            // Line comment
            pos += 2;
            while (pos < len && test_code.charCodeAt(pos) !== 10) pos++;
            tokens.push({ type: "comment", start, end: pos });
            continue;
          } else if (next === 42) {
            // '/*'
            // Block comment
            pos += 2;
            while (pos < len - 1) {
              if (test_code.charCodeAt(pos) === 42 && test_code.charCodeAt(pos + 1) === 47) {
                pos += 2;
                break;
              }
              pos++;
            }
            tokens.push({ type: "comment", start, end: pos });
            continue;
          }
        }
        // Just a slash
        tokens.push({ type: "operator", start, end: ++pos });
      } else if ((char >= 97 && char <= 122) || (char >= 65 && char <= 90)) {
        // Letter
        while (pos < len) {
          const c = test_code.charCodeAt(pos);
          if (!((c >= 97 && c <= 122) || (c >= 65 && c <= 90))) break;
          pos++;
        }
        tokens.push({ type: "letter", start, end: pos });
      } else if (char === 32 || char === 9 || char === 10 || char === 13) {
        // Whitespace
        while (pos < len) {
          const c = test_code.charCodeAt(pos);
          if (c !== 32 && c !== 9 && c !== 10 && c !== 13) break;
          pos++;
        }
        tokens.push({ type: "space", start, end: pos });
      } else {
        // Other
        tokens.push({ type: "other", start, end: ++pos });
      }
    }

    return tokens;
  });
});
