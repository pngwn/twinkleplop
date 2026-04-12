import { describe, test, expect } from "vitest";
import { tokenize } from "./tokenizer";
import { compile } from "./compiler";
import type { TokenizeResult, Grammar } from "./types";

// Helper function to get token values
function get_tokens_with_values(result: TokenizeResult, input: string) {
	const tokens: { type: string; value: string }[] = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.token_types[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		tokens.push({
			type,
			value: input.substring(start, end),
		});
	}
	return tokens;
}

describe("sideways transitions (state + exit)", () => {
	test("should support sideways transition from nested state to sibling state", () => {
		const grammar: Grammar = {
			name: "sideways-test",
			states: {
				root: {
					rules: [
						{ match: "[", token: "bracket", state: "array" },
						{ match: "{", token: "brace", state: "object" },
					],
				},
				array: {
					rules: [
						{ match: "]", token: "bracket", exit: true },
						{ match: ":", token: "colon", state: "object", exit: true }, // Sideways transition
						{ range: ["a", "z"], token: "word" },
					],
				},
				object: {
					rules: [
						{ match: "}", token: "brace", exit: true },
						{ match: ";", token: "semicolon", state: "array", exit: true }, // Sideways transition
						{ range: ["A", "Z"], token: "caps" },
					],
				},
			},
		};

		const compiled = compile(grammar);

		// Test array to object sideways transition
		const input1 = "[abc:XYZ}";
		const result1 = tokenize(input1, compiled);
		const tokens1 = get_tokens_with_values(result1, input1);

		expect(tokens1).toEqual([
			{ type: "bracket", value: "[" },
			{ type: "word", value: "abc" },
			{ type: "colon", value: ":" },
			{ type: "caps", value: "XYZ" },
			{ type: "brace", value: "}" },
		]);

		// Test object to array sideways transition
		const input2 = "{ABC;xyz]";
		const result2 = tokenize(input2, compiled);
		const tokens2 = get_tokens_with_values(result2, input2);

		expect(tokens2).toEqual([
			{ type: "brace", value: "{" },
			{ type: "caps", value: "ABC" },
			{ type: "semicolon", value: ";" },
			{ type: "word", value: "xyz" },
			{ type: "bracket", value: "]" },
		]);
	});

	test("should support nested sideways transitions", () => {
		const grammar: Grammar = {
			name: "nested-sideways",
			states: {
				root: {
					rules: [{ match: "(", token: "paren", state: "level1" }],
				},
				level1: {
					rules: [
						{ match: "[", token: "bracket", state: "level2a" },
						{ match: "{", token: "brace", state: "level2b" },
						{ match: ")", token: "paren", exit: true },
					],
				},
				level2a: {
					rules: [
						{ match: "]", token: "bracket", exit: true },
						{ match: ">", token: "arrow", state: "level2b", exit: true }, // Sideways to sibling
						{ match: "a", token: "a" },
					],
				},
				level2b: {
					rules: [
						{ match: "}", token: "brace", exit: true },
						{ match: "<", token: "arrow", state: "level2a", exit: true }, // Sideways to sibling
						{ match: "b", token: "b" },
					],
				},
			},
		};

		const compiled = compile(grammar);

		// Test complex sideways transitions
		const input = "([a>b<a])";
		const result = tokenize(input, compiled);
		const tokens = get_tokens_with_values(result, input);

		expect(tokens).toEqual([
			{ type: "paren", value: "(" },
			{ type: "bracket", value: "[" },
			{ type: "a", value: "a" },
			{ type: "arrow", value: ">" },
			{ type: "b", value: "b" },
			{ type: "arrow", value: "<" },
			{ type: "a", value: "a" },
			{ type: "bracket", value: "]" },
			{ type: "paren", value: ")" },
		]);
	});

	test("should maintain correct stack depth with sideways transitions", () => {
		const grammar: Grammar = {
			name: "stack-depth-test",
			states: {
				root: {
					rules: [
						{ match: "(", token: "open", state: "depth1" },
						{ match: "x", token: "x" },
					],
				},
				depth1: {
					rules: [
						{ match: "(", token: "open", state: "depth2" },
						{ match: ")", token: "close", exit: true },
						{ match: "=", token: "equals", state: "alt1", exit: true },
					],
				},
				alt1: {
					rules: [
						{ match: "(", token: "open", state: "depth2" },
						{ match: ")", token: "close", exit: true },
						{ match: "y", token: "y" },
					],
				},
				depth2: {
					rules: [
						{ match: ")", token: "close", exit: true },
						{ match: "z", token: "z" },
					],
				},
			},
		};

		const compiled = compile(grammar);

		// Should transition sideways and maintain proper nesting
		const input = "((z)=y)x";
		const result = tokenize(input, compiled);
		const tokens = get_tokens_with_values(result, input);

		expect(tokens).toEqual([
			{ type: "open", value: "((" },
			{ type: "z", value: "z" },
			{ type: "close", value: ")" },
			{ type: "equals", value: "=" },
			{ type: "y", value: "y" },
			{ type: "close", value: ")" },
			{ type: "x", value: "x" },
		]);
	});
});
