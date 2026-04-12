import { bench, describe } from "vitest";
import { tokenize as tokenize_original } from "../../core/src/tokenizer.js";
import { tokenize as tokenize_optimized } from "../../core/src/tokenizer-optimized.js";
import { compile } from "../../core/src/compiler.js";

// Create test grammars with varying complexity
const simple_grammar = {
	name: "simple",
	states: {
		main: {
			rules: [
				{ match: "let", token: "keyword" },
				{ match: "const", token: "keyword" },
				{ match: "var", token: "keyword" },
				{ match: "function", token: "keyword" },
				{ match: [["a", "z"], ["A", "Z"]], range: true, token: "identifier" },
				{ match: [["0", "9"]], range: true, token: "number" },
				{ match: " ", token: "whitespace" },
				{ match: "\n", token: "whitespace" },
				{ match: "\t", token: "whitespace" },
			]
		}
	}
};

const complex_grammar = {
	name: "complex",
	states: {
		main: {
			rules: [
				{ match: "//", state: "comment", token: "comment" },
				{ match: "/*", state: "block_comment", token: "comment" },
				{ match: '"', state: "string", token: "string" },
				{ match: "'", state: "string_single", token: "string" },
				{ match: "let", token: "keyword" },
				{ match: "const", token: "keyword" },
				{ match: "function", token: "keyword" },
				{ match: "return", token: "keyword" },
				{ match: [["a", "z"], ["A", "Z"]], range: true, token: "identifier" },
				{ match: [["0", "9"]], range: true, token: "number" },
				{ match: " ", token: "whitespace" },
				{ match: "\n", token: "whitespace" },
			]
		},
		comment: {
			rules: [
				{ match: "\n", exit: true },
				{ any: true, token: "comment" }
			]
		},
		block_comment: {
			rules: [
				{ match: "*/", exit: true, token: "comment" },
				{ any: true, token: "comment" }
			]
		},
		string: {
			rules: [
				{ match: '"', exit: true, token: "string" },
				{ match: "\\", state: "escape", token: "string" },
				{ any: true, token: "string" }
			]
		},
		string_single: {
			rules: [
				{ match: "'", exit: true, token: "string" },
				{ match: "\\", state: "escape_single", token: "string" },
				{ any: true, token: "string" }
			]
		},
		escape: {
			rules: [
				{ any: true, exit: true, token: "string" }
			]
		},
		escape_single: {
			rules: [
				{ any: true, exit: true, token: "string" }
			]
		}
	}
};

// Compile grammars once
const compiled_simple = compile(simple_grammar);
const compiled_complex = compile(complex_grammar);

// Test inputs
const short_code = `let x = 42;
const y = "hello";
function test() {
  return x + y;
}`;

const medium_code = `// This is a comment
function processData(items) {
  const results = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type === "valid") {
      results.push({
        id: item.id,
        name: item.name || "unnamed",
        value: item.value * 2
      });
    }
  }
  return results;
}

/* Multi-line comment
   explaining the next function */
const helper = function(x, y) {
  return x + y;
};`;

const long_code = medium_code.repeat(10);

// Benchmark suites
describe("Tokenizer Performance - Simple Grammar", () => {
	bench("Original - Short Input", () => {
		tokenize_original(short_code, compiled_simple);
	});
	
	bench("Optimized - Short Input", () => {
		tokenize_optimized(short_code, compiled_simple);
	});
	
	bench("Original - Medium Input", () => {
		tokenize_original(medium_code, compiled_simple);
	});
	
	bench("Optimized - Medium Input", () => {
		tokenize_optimized(medium_code, compiled_simple);
	});
	
	bench("Original - Long Input", () => {
		tokenize_original(long_code, compiled_simple);
	});
	
	bench("Optimized - Long Input", () => {
		tokenize_optimized(long_code, compiled_simple);
	});
});

describe("Tokenizer Performance - Complex Grammar", () => {
	bench("Original - Short Input", () => {
		tokenize_original(short_code, compiled_complex);
	});
	
	bench("Optimized - Short Input", () => {
		tokenize_optimized(short_code, compiled_complex);
	});
	
	bench("Original - Medium Input", () => {
		tokenize_original(medium_code, compiled_complex);
	});
	
	bench("Optimized - Medium Input", () => {
		tokenize_optimized(medium_code, compiled_complex);
	});
	
	bench("Original - Long Input", () => {
		tokenize_original(long_code, compiled_complex);
	});
	
	bench("Optimized - Long Input", () => {
		tokenize_optimized(long_code, compiled_complex);
	});
});

// Probe mode specific benchmarks
const probe_grammar = {
	name: "probe",
	states: {
		main: {
			rules: [
				{ match: "{", state: "try_object", token: "brace" },
				{ match: "[", token: "bracket" },
				{ match: [["a", "z"], ["A", "Z"]], range: true, token: "identifier" },
				{ match: " ", token: "whitespace" },
			]
		},
		try_object: {
			mode: "probe",
			rules: [
				{ match: "}", exit: true, token: "brace" },
				{ match: ":", state: "object_value", token: "colon" },
				{ any: true, token: "content" }
			]
		},
		object_value: {
			rules: [
				{ match: "}", exit: true, token: "brace" },
				{ any: true, token: "value" }
			]
		}
	}
};

const compiled_probe = compile(probe_grammar);
const probe_input = "{ key: value } { another } [array]";

describe("Tokenizer Performance - Probe Mode", () => {
	bench("Original - Probe Input", () => {
		tokenize_original(probe_input, compiled_probe);
	});
	
	bench("Optimized - Probe Input", () => {
		tokenize_optimized(probe_input, compiled_probe);
	});
});