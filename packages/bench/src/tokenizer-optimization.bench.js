import { bench, describe } from "vitest";
import { tokenize as tokenizeOriginal } from "../../core/src/tokenizer.js";
import { tokenize as tokenizeOptimized } from "../../core/src/tokenizer-optimized.js";
import { compile } from "../../core/src/compiler.js";

// Create test grammars with varying complexity
const simpleGrammar = {
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

const complexGrammar = {
	name: "complex",
	states: {
		main: {
			rules: [
				{ match: "//", state: "comment", token: "comment" },
				{ match: "/*", state: "blockComment", token: "comment" },
				{ match: '"', state: "string", token: "string" },
				{ match: "'", state: "stringSingle", token: "string" },
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
		blockComment: {
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
		stringSingle: {
			rules: [
				{ match: "'", exit: true, token: "string" },
				{ match: "\\", state: "escapeSingle", token: "string" },
				{ any: true, token: "string" }
			]
		},
		escape: {
			rules: [
				{ any: true, exit: true, token: "string" }
			]
		},
		escapeSingle: {
			rules: [
				{ any: true, exit: true, token: "string" }
			]
		}
	}
};

// Compile grammars once
const compiledSimple = compile(simpleGrammar);
const compiledComplex = compile(complexGrammar);

// Test inputs
const shortCode = `let x = 42;
const y = "hello";
function test() {
  return x + y;
}`;

const mediumCode = `// This is a comment
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

const longCode = mediumCode.repeat(10);

// Benchmark suites
describe("Tokenizer Performance - Simple Grammar", () => {
	bench("Original - Short Input", () => {
		tokenizeOriginal(shortCode, compiledSimple);
	});
	
	bench("Optimized - Short Input", () => {
		tokenizeOptimized(shortCode, compiledSimple);
	});
	
	bench("Original - Medium Input", () => {
		tokenizeOriginal(mediumCode, compiledSimple);
	});
	
	bench("Optimized - Medium Input", () => {
		tokenizeOptimized(mediumCode, compiledSimple);
	});
	
	bench("Original - Long Input", () => {
		tokenizeOriginal(longCode, compiledSimple);
	});
	
	bench("Optimized - Long Input", () => {
		tokenizeOptimized(longCode, compiledSimple);
	});
});

describe("Tokenizer Performance - Complex Grammar", () => {
	bench("Original - Short Input", () => {
		tokenizeOriginal(shortCode, compiledComplex);
	});
	
	bench("Optimized - Short Input", () => {
		tokenizeOptimized(shortCode, compiledComplex);
	});
	
	bench("Original - Medium Input", () => {
		tokenizeOriginal(mediumCode, compiledComplex);
	});
	
	bench("Optimized - Medium Input", () => {
		tokenizeOptimized(mediumCode, compiledComplex);
	});
	
	bench("Original - Long Input", () => {
		tokenizeOriginal(longCode, compiledComplex);
	});
	
	bench("Optimized - Long Input", () => {
		tokenizeOptimized(longCode, compiledComplex);
	});
});

// Probe mode specific benchmarks
const probeGrammar = {
	name: "probe",
	states: {
		main: {
			rules: [
				{ match: "{", state: "tryObject", token: "brace" },
				{ match: "[", token: "bracket" },
				{ match: [["a", "z"], ["A", "Z"]], range: true, token: "identifier" },
				{ match: " ", token: "whitespace" },
			]
		},
		tryObject: {
			mode: "probe",
			rules: [
				{ match: "}", exit: true, token: "brace" },
				{ match: ":", state: "objectValue", token: "colon" },
				{ any: true, token: "content" }
			]
		},
		objectValue: {
			rules: [
				{ match: "}", exit: true, token: "brace" },
				{ any: true, token: "value" }
			]
		}
	}
};

const compiledProbe = compile(probeGrammar);
const probeInput = "{ key: value } { another } [array]";

describe("Tokenizer Performance - Probe Mode", () => {
	bench("Original - Probe Input", () => {
		tokenizeOriginal(probeInput, compiledProbe);
	});
	
	bench("Optimized - Probe Input", () => {
		tokenizeOptimized(probeInput, compiledProbe);
	});
});