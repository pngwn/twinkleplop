import { describe, it, expect } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import type { Grammar, TokenizeResult } from "./types";

function get_tokens(result: TokenizeResult): { type: string; text: string }[] {
	const tokens: { type: string; text: string }[] = [];
	for (let i = 0; i < result.tokens.length; i += 3) {
		const type = result.tokens[i];
		const start = result.tokens[i + 1];
		const end = result.tokens[i + 2];
	}
	return tokens;
}

describe("match_within matcher", () => {
	it("should match content between delimiters", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				main: {
					rules: [
						{
							match_within: {
								start: "{{",
								end: "}}",
							},
							token: "template",
						},
						{
							range: [0, 127],
							token: "text",
						},
					],
				},
			},
		};

		const compiled = compile(grammar);
		const input = "Hello {{world}} and {{foo}}!";
		const result = tokenize(input, compiled);

		const tokens = get_tokens(result);

		// The tokenizer coalesces consecutive tokens of the same type
		// So the entire {{world}} becomes a single template token
		expect(tokens).toContainEqual({ type: "text", text: "Hello " });
		expect(tokens).toContainEqual({ type: "template", text: "{{world}}" });
		expect(tokens).toContainEqual({ type: "text", text: " and " });
		expect(tokens).toContainEqual({ type: "template", text: "{{foo}}" });
		expect(tokens).toContainEqual({ type: "text", text: "!" });
	});

	it("should handle escape characters", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				main: {
					rules: [
						{
							match_within: {
								start: '"',
								end: '"',
								escape: "\\",
							},
							token: "string",
						},
						{
							range: [0, 127],
							token: "text",
						},
					],
				},
			},
		};

		const compiled = compile(grammar);
		const input = 'Hello "world \\"quoted\\" text" done';
		const result = tokenize(input, compiled);

		const tokens = get_tokens(result);

		// The string should include the escaped quotes
		const string_tokens = tokens.filter((t) => t.type === "string");
		const string_text = string_tokens.map((t) => t.text).join("");
		expect(string_text).toBe('"world \\"quoted\\" text"');
	});

	it("should work with single character delimiters", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				main: {
					rules: [
						{
							match_within: {
								start: "'",
								end: "'",
							},
							token: "string",
						},
						{
							range: [0, 127],
							token: "text",
						},
					],
				},
			},
		};

		const compiled = compile(grammar);
		const input = "Hello 'world' test";
		const result = tokenize(input, compiled);

		// Extract tokens
		const tokens = get_tokens(result);

		const string_tokens = tokens.filter((t) => t.type === "string");
		const string_text = string_tokens.map((t) => t.text).join("");
		expect(string_text).toBe("'world'");
	});
});
