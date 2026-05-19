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

describe("any: true with sideways transitions", () => {
	test("should not consume character when using any: true with state + exit", () => {
		// This grammar simulates the number parsing issue:
		// - 'main' recognizes digits and does sideways transition to 'number'
		// - 'number' state consumes digits, then uses { any: true, state: "post", exit: true }
		// - 'post' state should handle the next character WITHOUT it being consumed by any: true
		const grammar: Grammar = {
			name: "any-sideways-test",
			states: {
				main: {
					rules: [
						{
							range: [["0", "9"]],
							token: "digit",
							state: "number",
							exit: true,
						},
						{ match: ",", token: "comma" },
					],
				},
				number: {
					rules: [
						{ range: [["0", "9"]], token: "digit" },
						// When we see a non-digit, transition to 'post' WITHOUT consuming it
						{ any: true, state: "post", exit: true },
					],
				},
				post: {
					rules: [
						{ match: ",", token: "comma", state: "main", exit: true },
						{ match: " ", token: "space", state: "main", exit: true },
						{
							range: [["0", "9"]],
							token: "digit",
							state: "number",
							exit: true,
						},
					],
				},
			},
		};

		const compiled = compile(grammar);

		// Test 1: Single digit followed by comma
		const input1 = "5,";
		const result1 = tokenize(input1, compiled);
		const tokens1 = get_tokens_with_values(result1, input1);

		expect(tokens1).toEqual([
			{ type: "digit", value: "5" },
			{ type: "comma", value: "," },
		]);

		// Test 2: Multiple digits separated by commas
		const input2 = "1,2,3";
		const result2 = tokenize(input2, compiled);
		const tokens2 = get_tokens_with_values(result2, input2);

		expect(tokens2).toEqual([
			{ type: "digit", value: "1" },
			{ type: "comma", value: "," },
			{ type: "digit", value: "2" },
			{ type: "comma", value: "," },
			{ type: "digit", value: "3" },
		]);

		// Test 3: Digits with spaces
		const input3 = "5 6";
		const result3 = tokenize(input3, compiled);
		const tokens3 = get_tokens_with_values(result3, input3);

		expect(tokens3).toEqual([
			{ type: "digit", value: "5" },
			{ type: "space", value: " " },
			{ type: "digit", value: "6" },
		]);
	});

	test("should handle multi-digit numbers correctly", () => {
		const grammar: Grammar = {
			name: "multi-digit-test",
			states: {
				main: {
					rules: [
						{ match: "[", token: "bracket" },
						{
							range: [["0", "9"]],
							token: "number",
							state: "number",
						},
					],
				},
				number: {
					rules: [
						{ range: [["0", "9"]], token: "number" },
						{ any: true, state: "post", exit: true },
					],
				},
				post: {
					rules: [
						{ match: ",", token: "comma", state: "main", exit: true },
						{ match: "]", token: "bracket" },
					],
				},
			},
		};

		const compiled = compile(grammar);

		const input = "[123,456]";
		const result = tokenize(input, compiled);
		const tokens = get_tokens_with_values(result, input);

		expect(tokens).toEqual([
			{ type: "bracket", value: "[" },
			{ type: "number", value: "123" },
			{ type: "comma", value: "," },
			{ type: "number", value: "456" },
			{ type: "bracket", value: "]" },
		]);
	});

	test("should handle any: true at different nesting levels", () => {
		const grammar: Grammar = {
			name: "nested-any-test",
			states: {
				main: {
					rules: [
						{ match: "(", token: "paren", state: "inner" },
						{ range: [["a", "z"]], token: "letter", state: "word" },
					],
				},
				word: {
					rules: [
						{ range: [["a", "z"]], token: "letter" },
						{ any: true, exit: true },
					],
				},
				inner: {
					rules: [
						{ match: ")", token: "paren", exit: true },
						{ range: [["0", "9"]], token: "digit", state: "num" },
					],
				},
				num: {
					rules: [
						{ range: [["0", "9"]], token: "digit" },
						{ any: true, exit: true },
					],
				},
			},
		};

		const compiled = compile(grammar);

		const input = "abc(123)def";
		// main -> word
		const result = tokenize(input, compiled);
		const tokens = get_tokens_with_values(result, input);

		expect(tokens).toEqual([
			{ type: "letter", value: "abc" },
			{ type: "paren", value: "(" },
			{ type: "digit", value: "123" },
			{ type: "paren", value: ")" },
			{ type: "letter", value: "def" },
		]);
	});
});
