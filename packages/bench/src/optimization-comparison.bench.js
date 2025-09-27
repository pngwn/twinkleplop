import { bench, describe } from "vitest";
import { compile } from "@twinkleplop/core/compile";
import { tokenize } from "@twinkleplop/core";

// Test different aspects of performance
const testGrammar = {
	name: "test",
	states: {
		main: {
			mode: "normal",
			rules: [
				{ match: ["function", "const", "let", "var", "if", "else", "return"], token: "keyword" },
				{ match: ["(", ")", "{", "}", "[", "]", ";", ",", ".", ":", "=", "+", "-", "*", "/"], token: "punctuation" },
				{ match: '"', state: "string" },
				{ match: "'", state: "string_single" },
				{ match: [" ", "\t", "\n", "\r"], token: "whitespace" },
				{ range: [["a", "z"], ["A", "Z"], "_"], token: "identifier" },
				{ range: ["0", "9"], token: "number" },
			]
		},
		string: {
			mode: "normal",
			rules: [
				{ match: '"', exit: true, token: "string" },
				{ match: "\\", state: "string_escape" },
				{ any: true, token: "string" },
			]
		},
		string_single: {
			mode: "normal",
			rules: [
				{ match: "'", exit: true, token: "string" },
				{ match: "\\", state: "string_escape_single" },
				{ any: true, token: "string" },
			]
		},
		string_escape: {
			mode: "normal",
			rules: [
				{ any: true, exit: true, token: "string" },
			]
		},
		string_escape_single: {
			mode: "normal",
			rules: [
				{ any: true, exit: true, token: "string" },
			]
		}
	}
};

const jsCode = `
function fibonacci(n) {
	if (n <= 1) return n;
	let prev = 0;
	let current = 1;
	for (let i = 2; i <= n; i++) {
		const temp = current;
		current = prev + current;
		prev = temp;
	}
	return current;
}

const result = fibonacci(10);
console.log("Result:", result);
`;

const compiledGrammar = compile(testGrammar);

describe("Tokenizer Optimization Comparison", () => {
	// Baseline with minimal operations
	bench("Baseline - Simple loop", () => {
		let sum = 0;
		const len = jsCode.length;
		for (let i = 0; i < len; i++) {
			const char = jsCode.charCodeAt(i);
			sum += char < 128 ? 1 : 2;
		}
		return sum;
	});

	// Test actual tokenization
	bench("Full tokenization", () => {
		const tokens = tokenize(jsCode, compiledGrammar);
		return tokens;
	});

	// Test bit shift vs multiplication
	bench("Multiplication: state * 128", () => {
		let sum = 0;
		for (let i = 0; i < 10000; i++) {
			const state = i & 0xFF;
			sum += state * 128;
		}
		return sum;
	});

	bench("Bit shift: state << 7", () => {
		let sum = 0;
		for (let i = 0; i < 10000; i++) {
			const state = i & 0xFF;
			sum += state << 7;
		}
		return sum;
	});

	// Test ternary vs logical OR
	bench("Ternary: x > 0 ? x : 1", () => {
		let sum = 0;
		for (let i = 0; i < 10000; i++) {
			const x = i & 0x3;
			sum += x > 0 ? x : 1;
		}
		return sum;
	});

	bench("Logical OR: x || 1", () => {
		let sum = 0;
		for (let i = 0; i < 10000; i++) {
			const x = i & 0x3;
			sum += x || 1;
		}
		return sum;
	});

	// Test Map vs Set for failed probes
	bench("Map with string keys", () => {
		const failed = new Map();
		for (let i = 0; i < 1000; i++) {
			const key = `${i},${i % 10},${i % 5}`;
			failed.set(key, true);
		}
		let hits = 0;
		for (let i = 0; i < 1000; i++) {
			const key = `${i},${i % 10},${i % 5}`;
			if (failed.has(key)) hits++;
		}
		return hits;
	});

	bench("Set with bit-packed numbers", () => {
		const failed = new Set();
		for (let i = 0; i < 1000; i++) {
			const key = (i << 16) | ((i % 10) << 8) | (i % 5);
			failed.add(key);
		}
		let hits = 0;
		for (let i = 0; i < 1000; i++) {
			const key = (i << 16) | ((i % 10) << 8) | (i % 5);
			if (failed.has(key)) hits++;
		}
		return hits;
	});

	// Test array index caching
	bench("Repeated calculation: i * 3", () => {
		const arr = new Uint32Array(3000);
		for (let i = 0; i < 1000; i++) {
			arr[i * 3] = 1;
			arr[i * 3 + 1] = 2;
			arr[i * 3 + 2] = 3;
		}
		return arr[0];
	});

	bench("Cached index: idx = i * 3", () => {
		const arr = new Uint32Array(3000);
		for (let i = 0; i < 1000; i++) {
			const idx = i * 3;
			arr[idx] = 1;
			arr[idx + 1] = 2;
			arr[idx + 2] = 3;
		}
		return arr[0];
	});

	// Test condition ordering
	bench("Conditions: rare case first", () => {
		let sum = 0;
		for (let i = 0; i < 10000; i++) {
			const x = i & 0xFF;
			if (x === 255) sum += 3;
			else if (x < 128) sum += 1;
			else sum += 2;
		}
		return sum;
	});

	bench("Conditions: common case first", () => {
		let sum = 0;
		for (let i = 0; i < 10000; i++) {
			const x = i & 0xFF;
			if (x < 128) sum += 1;
			else if (x === 255) sum += 3;
			else sum += 2;
		}
		return sum;
	});
});