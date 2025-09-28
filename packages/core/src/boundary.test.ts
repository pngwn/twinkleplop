import { describe, it, expect } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import type { Grammar } from "./types";

describe("Boundary flag", () => {
	it("should match keywords only at word boundaries", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				main: {
					rules: [
						{
							match: "set",
							boundary: true,
							token: "keyword",
						},
						{
							match: "get",
							boundary: true,
							token: "keyword",
						},
						{
							match: ["_", "$"],
							token: "identifier",
							state: "identifier",
						},
						{
							range: [["a", "z"], ["A", "Z"]],
							token: "identifier",
							state: "identifier",
						},
						{
							match: [" ", "\t", "\n"],
						},
					],
				},
				identifier: {
					rules: [
						{
							range: [["a", "z"], ["A", "Z"], ["0", "9"]],
							token: "identifier",
						},
						{
							match: ["_", "$"],
							token: "identifier",
						},
						{
							any: true,
							exit: true,
						},
					],
				},
			},
		};

		const compiled = compile(grammar);

		// Test cases where boundary should prevent matching
		const testCases = [
			{
				input: "setTimeout",
				expected: [{ type: "identifier", text: "setTimeout" }],
				description: "should not match 'set' in 'setTimeout'",
			},
			{
				input: "getter",
				expected: [{ type: "identifier", text: "getter" }],
				description: "should not match 'get' in 'getter'",
			},
			{
				input: "set timeout",
				expected: [
					{ type: "keyword", text: "set" },
					{ type: "identifier", text: "timeout" },
				],
				description: "should match 'set' when followed by space",
			},
			{
				input: "get",
				expected: [{ type: "keyword", text: "get" }],
				description: "should match 'get' at end of input",
			},
			{
				input: "set()",
				expected: [{ type: "keyword", text: "set" }],
				description: "should match 'set' when followed by parenthesis",
			},
			{
				input: "get;",
				expected: [{ type: "keyword", text: "get" }],
				description: "should match 'get' when followed by semicolon",
			},
			{
				input: "setThing getThing",
				expected: [
					{ type: "identifier", text: "setThing" },
					{ type: "identifier", text: "getThing" },
				],
				description: "should not match keywords at start of identifiers",
			},
		];

		for (const test of testCases) {
			const result = tokenize(test.input, compiled);
			const tokens = [];
			
			for (let i = 0; i < result.tokens.length / 3; i++) {
				const type = result.tokenTypes[result.tokens[i * 3]];
				const start = result.tokens[i * 3 + 1];
				const end = result.tokens[i * 3 + 2];
				const text = test.input.slice(start, end);
				if (type) { // Skip whitespace tokens
					tokens.push({ type, text });
				}
			}

			expect(tokens, test.description).toEqual(test.expected);
		}
	});

	it("should work with arrays of keywords", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				main: {
					rules: [
						{
							match: ["if", "in", "do", "for"],
							boundary: true,
							token: "keyword",
						},
						{
							range: [["a", "z"], ["A", "Z"]],
							token: "identifier",
							state: "identifier",
						},
						{
							match: [" ", "\t", "\n"],
						},
					],
				},
				identifier: {
					rules: [
						{
							range: [["a", "z"], ["A", "Z"], ["0", "9"]],
							token: "identifier",
						},
						{
							any: true,
							exit: true,
						},
					],
				},
			},
		};

		const compiled = compile(grammar);

		const testCases = [
			{
				input: "innerHTML",
				expected: [{ type: "identifier", text: "innerHTML" }],
				description: "should not match 'in' in 'innerHTML'",
			},
			{
				input: "forEach",
				expected: [{ type: "identifier", text: "forEach" }],
				description: "should not match 'for' in 'forEach'",
			},
			{
				input: "doSomething",
				expected: [{ type: "identifier", text: "doSomething" }],
				description: "should not match 'do' in 'doSomething'",
			},
			{
				input: "ifStatement",
				expected: [{ type: "identifier", text: "ifStatement" }],
				description: "should not match 'if' in 'ifStatement'",
			},
			{
				input: "if in do for",
				expected: [
					{ type: "keyword", text: "if" },
					{ type: "keyword", text: "in" },
					{ type: "keyword", text: "do" },
					{ type: "keyword", text: "for" },
				],
				description: "should match all keywords when properly bounded",
			},
		];

		for (const test of testCases) {
			const result = tokenize(test.input, compiled);
			const tokens = [];
			
			for (let i = 0; i < result.tokens.length / 3; i++) {
				const type = result.tokenTypes[result.tokens[i * 3]];
				const start = result.tokens[i * 3 + 1];
				const end = result.tokens[i * 3 + 2];
				const text = test.input.slice(start, end);
				if (type) { // Skip whitespace tokens
					tokens.push({ type, text });
				}
			}

			expect(tokens, test.description).toEqual(test.expected);
		}
	});

	it("should not affect non-boundary matches", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				main: {
					rules: [
						{
							match: "++",
							token: "operator",
						},
						{
							match: "+",
							token: "operator",
						},
						{
							match: "set",
							// No boundary flag - should match anywhere
							token: "keyword",
						},
						{
							range: [["a", "z"], ["A", "Z"]],
							token: "identifier",
							state: "identifier",
						},
					],
				},
				identifier: {
					rules: [
						{
							range: [["a", "z"], ["A", "Z"], ["0", "9"]],
							token: "identifier",
						},
						{
							any: true,
							exit: true,
						},
					],
				},
			},
		};

		const compiled = compile(grammar);

		// Without boundary flag, 'set' should match even in 'setTimeout'
		const result = tokenize("setTimeout++", compiled);
		const tokens = [];
		
		for (let i = 0; i < result.tokens.length / 3; i++) {
			const type = result.tokenTypes[result.tokens[i * 3]];
			const start = result.tokens[i * 3 + 1];
			const end = result.tokens[i * 3 + 2];
			const text = "setTimeout++".slice(start, end);
			tokens.push({ type, text });
		}

		expect(tokens).toEqual([
			{ type: "keyword", text: "set" },
			{ type: "identifier", text: "Timeout" },
			{ type: "operator", text: "++" },
		]);
	});
});