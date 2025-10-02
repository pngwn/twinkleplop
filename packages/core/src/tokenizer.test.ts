import { describe, test, expect } from "vitest";
import { tokenize } from "./tokenizer";
import { compile } from "./compiler";
import { TokenizeResult, Grammar } from "./types";

// Helper functions
function getTokens(result: TokenizeResult) {
	const tokens: { type: string; start: number; end: number }[] = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		tokens.push({
			type: result.tokenTypes[result.tokens[i * 3]],
			start: result.tokens[i * 3 + 1],
			end: result.tokens[i * 3 + 2],
		});
	}
	return tokens;
}

function getTokensWithValues(result: TokenizeResult, input: string) {
	const tokens: { type: string; value: string }[] = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.tokenTypes[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		tokens.push({
			type,
			value: input.substring(start, end),
		});
	}
	return tokens;
}

describe("tokenize - basic functionality", () => {
	test("returns Uint32Array for tokens", () => {
		const grammar = {
			name: "test",
			states: {
				root: { rules: [{ match: "a", token: "letter" }] },
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("a", compiled);
		expect(result.tokens).toBeInstanceOf(Uint32Array);
	});

	test("tokenizes single character", () => {
		const grammar = {
			name: "test",
			states: {
				root: { rules: [{ match: "a", token: "letter" }] },
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("a", compiled);
		const tokens = getTokens(result);
		expect(tokens).toEqual([{ type: "letter", start: 0, end: 1 }]);
	});

	test("tokenizes multiple different characters", () => {
		const grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{ match: "a", token: "letter-a" },
						{ match: "b", token: "letter-b" },
						{ match: " ", token: "space" },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("a b", compiled);
		const tokens = getTokens(result);
		expect(tokens).toEqual([
			{ type: "letter-a", start: 0, end: 1 },
			{ type: "space", start: 1, end: 2 },
			{ type: "letter-b", start: 2, end: 3 },
		]);
	});

	test("handles empty input", () => {
		const grammar = {
			name: "test",
			states: {
				root: { rules: [{ match: "a", token: "letter" }] },
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("", compiled);
		expect(result.tokens.length).toBe(0);
	});

	test("skips unmatched characters", () => {
		const grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{ match: "a", token: "letter-a" },
						{ match: "b", token: "letter-b" },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("a!b@a", compiled);
		const tokens = getTokens(result);
		expect(tokens).toEqual([
			{ type: "letter-a", start: 0, end: 1 },
			{ type: "letter-b", start: 2, end: 3 },
			{ type: "letter-a", start: 4, end: 5 },
		]);
	});

	test("handles non-ASCII characters", () => {
		const grammar = {
			name: "test",
			states: {
				root: { rules: [{ match: "§", token: "special" }] },
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("§", compiled);
		const tokens = getTokens(result);
		expect(tokens).toEqual([{ type: "special", start: 0, end: 1 }]);
	});

});

describe("tokenize - character ranges", () => {
	test("handles numeric ranges", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: { rules: [{ range: ["0", "9"], token: "digit" }] },
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("123", compiled);
		const tokens = getTokens(result);
		expect(tokens).toEqual([{ type: "digit", start: 0, end: 3 }]);
	});

	test("handles alphabetic ranges", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: { rules: [{ range: ["a", "z"], token: "letter" }] },
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("abc", compiled);
		const tokens = getTokens(result);
		expect(tokens).toEqual([{ type: "letter", start: 0, end: 3 }]);
	});

	test("handles mixed ranges", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{ range: ["0", "9"], token: "digit" },
						{ range: ["a", "z"], token: "letter" },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("a1b2", compiled);
		const tokens = getTokens(result);
		expect(tokens).toEqual([
			{ type: "letter", start: 0, end: 1 },
			{ type: "digit", start: 1, end: 2 },
			{ type: "letter", start: 2, end: 3 },
			{ type: "digit", start: 3, end: 4 },
		]);
	});

	test("coalesces consecutive characters of same class", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{ range: ["a", "z"], token: "word" },
						{ match: " ", token: "space" },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("hello world", compiled);
		const tokens = getTokens(result);
		expect(tokens).toEqual([
			{ type: "word", start: 0, end: 5 },
			{ type: "space", start: 5, end: 6 },
			{ type: "word", start: 6, end: 11 },
		]);
	});

});

describe("tokenize - multiple character matches", () => {
	test("handles character arrays", () => {
		const grammar = {
			name: "test",
			states: {
				root: {
					rules: [{ match: [" ", "\t", "\n"], token: "whitespace" }],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize(" \t\n", compiled);
		const tokens = getTokens(result);
		expect(tokens).toEqual([{ type: "whitespace", start: 0, end: 3 }]);
	});

	test("distinguishes between character array matches", () => {
		const grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{ match: [" ", "\t"], token: "space" },
						{ match: "\n", token: "newline" },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize(" \n\t", compiled);
		const tokens = getTokens(result);
		expect(tokens).toEqual([
			{ type: "space", start: 0, end: 1 },
			{ type: "newline", start: 1, end: 2 },
			{ type: "space", start: 2, end: 3 },
		]);
	});
});

describe("tokenize - state transitions", () => {
	test("transitions to new state", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [{ match: '"', token: "quote", state: "string" }],
				},
				string: {
					rules: [{ match: "x", token: "text" }],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize('"x', compiled);
		const tokens = getTokens(result);
		expect(tokens).toEqual([
			{ type: "quote", start: 0, end: 1 },
			{ type: "text", start: 1, end: 2 },
		]);
	});

	test("exits state on exit rule", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{ match: '"', token: "quote", state: "string" },
						{ match: "x", token: "outside" },
					],
				},
				string: {
					rules: [{ match: '"', token: "quote", exit: true }],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize('""x', compiled);
		const tokens = getTokens(result);
		// Note: The two quotes get coalesced into a single token due to
		// the tokenizer's optimization of consecutive same-type tokens
		expect(tokens).toEqual([
			{ type: "quote", start: 0, end: 2 },
			{ type: "outside", start: 2, end: 3 },
		]);
	});

	test("handles nested state transitions", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [{ match: "(", token: "open", state: "nested" }],
				},
				nested: {
					rules: [
						{ match: "(", token: "open", state: "nested" },
						{ match: ")", token: "close", exit: true },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("((()))", compiled);
		const tokens = getTokens(result);
		// Note: Consecutive tokens of the same type get coalesced
		expect(tokens).toEqual([
			{ type: "open", start: 0, end: 3 },
			{ type: "close", start: 3, end: 6 },
		]);
	});

	test("transitions without emitting token", () => {
		const grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{ match: "(", state: "nested" },
						{ match: "a", token: "letter" },
					],
				},
				nested: {
					rules: [
						{ match: ")", exit: true },
						{ match: "b", token: "inner" },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("a(b)a", compiled);
		const tokens = getTokens(result);
		expect(tokens).toEqual([
			{ type: "letter", start: 0, end: 1 },
			{ type: "inner", start: 2, end: 3 },
			{ type: "letter", start: 4, end: 5 },
		]);
	});
});

describe("tokenize - edge cases", () => {
	test("handles long input without overflow", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{ range: ["a", "z"], token: "letter" },
						{ match: " ", token: "space" },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const longInput = "hello ".repeat(100);
		const result = tokenize(longInput, compiled);
		const tokenCount = result.tokens.length / 3;
		expect(tokenCount).toBe(200);
	});

	test("preserves token positions accurately", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				root: {
					rules: [
						{ match: "test", token: "keyword" },
						{ match: " ", token: "space" },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const input = "test test";
		const result = tokenize(input, compiled);
		const tokens = getTokensWithValues(result, input);
		expect(tokens[0].value).toBe("test");
		expect(tokens[1].value).toBe(" ");
		expect(tokens[2].value).toBe("test");
	});
});

describe("probe mode - basic functionality", () => {
	test("enters and exits probe mode", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				main: {
					rules: [{ match: "a", state: "probing" }],
				},
				probing: {
					mode: "probe",
					rules: [{ match: "b", state: "found" }],
				},
				found: {
					rules: [
						{ match: "a", token: "special_a" },
						{ match: "b", token: "special_b" },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("ab", compiled);
		const tokens = getTokens(result);
		expect(tokens).toEqual([
			{ type: "special_a", start: 0, end: 1 },
			{ type: "special_b", start: 1, end: 2 },
		]);
	});

	test("probe with lookahead matching", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				main: {
					rules: [{ match: "test", state: "probing" }],
				},
				probing: {
					mode: "probe",
					rules: [
						{ match: " " },
						{ match: "123", state: "found_number" },
						{ match: "abc", state: "found_identifier" },
					],
				},
				found_number: {
					rules: [
						{ match: "test", token: "number_context" },
						{ match: " ", token: "space" },
						{ match: "123", token: "number" },
					],
				},
				found_identifier: {
					rules: [
						{ match: "test", token: "identifier_context" },
						{ match: " ", token: "space" },
						{ match: "abc", token: "identifier" },
					],
				},
			},
		};
		const compiled = compile(grammar);

		// Test finding number
		const result1 = tokenize("test 123", compiled);
		const tokens1 = getTokensWithValues(result1, "test 123");
		expect(tokens1).toEqual([
			{ type: "number_context", value: "test" },
			{ type: "space", value: " " },
			{ type: "number", value: "123" },
		]);

		// Test finding identifier
		const result2 = tokenize("test abc", compiled);
		const tokens2 = getTokensWithValues(result2, "test abc");
		expect(tokens2).toEqual([
			{ type: "identifier_context", value: "test" },
			{ type: "space", value: " " },
			{ type: "identifier", value: "abc" },
		]);
	});

	test("sideways exits inside probe skip stack restoration", () => {
		const baseGrammar: Grammar = {
			name: "probe-exit",
			states: {
				main: {
					rules: [
						{ match: "a", state: "probe_identifier" },
						{ match: "c", token: "main_c" },
					],
				},
				probe_identifier: {
					mode: "probe",
					fallback: "property",
					rules: [
						{ match: "!", state: "selector" },
						{ match: ";", state: "property" },
					],
				},
				selector: {
					rules: [
						{ match: "a", token: "selector_a" },
						{ match: "b", token: "selector_b" },
						{ match: "!", token: "selector_bang", exit: true },
					],
				},
				property: {
					rules: [
						{ match: "a", token: "property_a" },
						{ match: ";", token: "property_end", exit: true },
					],
				},
			},
		};

		const compiledPush = compile(baseGrammar);
		const tokensWithPush = getTokens(tokenize("ab!c", compiledPush));
		expect(tokensWithPush).toEqual([
			{ type: "selector_a", start: 0, end: 1 },
			{ type: "selector_b", start: 1, end: 2 },
			{ type: "selector_bang", start: 2, end: 3 },
			{ type: "main_c", start: 3, end: 4 },
		]);

		const sidewaysGrammar = JSON.parse(JSON.stringify(baseGrammar)) as Grammar;
		(sidewaysGrammar.states.probe_identifier.rules[0] as { exit?: boolean }).exit = true;
		const compiledSideways = compile(sidewaysGrammar);
		const tokensWithSidewaysExit = getTokens(tokenize("ab!c", compiledSideways));
		expect(tokensWithSidewaysExit).toEqual([
			{ type: "selector_a", start: 0, end: 1 },
			{ type: "selector_b", start: 1, end: 2 },
			{ type: "selector_bang", start: 2, end: 3 },
		]);
	});
});

describe("probe mode - fallback behavior", () => {
	test("uses fallback state when probe fails", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				main: {
					rules: [{ match: "a", state: "probing" }],
				},
				fallback: {
					rules: [
						{ match: "a", token: "fallback_a" },
						{ match: "c", token: "letter_c" },
					],
				},
				probing: {
					mode: "probe",
					fallback: "fallback",
					rules: [{ match: "b", state: "found" }],
				},
				found: {
					rules: [
						{ match: "a", token: "special_a" },
						{ match: "b", token: "special_b" },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("ac", compiled);
		const tokens = getTokensWithValues(result, "ac");
		expect(tokens).toEqual([
			{ type: "fallback_a", value: "a" },
			{ type: "letter_c", value: "c" },
		]);
	});

	test("fallback at end of input", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				main: {
					rules: [{ match: "test", state: "probe" }],
				},
				probe: {
					mode: "probe",
					fallback: "handle_test",
					rules: [
						{ match: " " },
						{ match: "123", state: "handle_number" },
					],
				},
				handle_test: {
					rules: [{ match: "test", token: "keyword" }],
				},
				handle_number: {
					rules: [
						{ match: "test", token: "test_before_number" },
						{ match: " ", token: "space" },
						{ match: "123", token: "number" },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("test", compiled);
		const tokens = getTokensWithValues(result, "test");
		expect(tokens).toEqual([{ type: "keyword", value: "test" }]);
	});

	test("fallback with unmatched pattern", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				main: {
					rules: [{ match: "test", state: "probing" }],
				},
				keyword: {
					rules: [
						{ match: "test", token: "keyword" },
						{ match: " ", token: "space" },
						{ match: "xyz", token: "other" },
					],
				},
				probing: {
					mode: "probe",
					fallback: "keyword",
					rules: [
						{ match: " " },
						{ match: "123", state: "found" },
					],
				},
				found: {
					rules: [{ match: "test", token: "special" }],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("test xyz", compiled);
		const tokens = getTokensWithValues(result, "test xyz");
		expect(tokens).toEqual([
			{ type: "keyword", value: "test" },
			{ type: "space", value: " " },
			{ type: "other", value: "xyz" },
		]);
	});
});

describe("probe mode - nested probes", () => {
	test("handles nested probe states", () => {
		const grammar: Grammar = {
			name: "nested",
			states: {
				main: {
					rules: [{ match: "a", state: "probe1" }],
				},
				fallback: {
					rules: [{ match: "a", token: "fallback" }],
				},
				probe1: {
					mode: "probe",
					fallback: "fallback",
					rules: [{ match: " " }, { match: "b", state: "probe2" }],
				},
				probe2: {
					mode: "probe",
					rules: [{ match: " " }, { match: "c", state: "found" }],
				},
				found: {
					rules: [
						{ match: "a", token: "special_a" },
						{ match: " ", token: "space" },
						{ match: "b", token: "special_b" },
						{ match: "c", token: "special_c" },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("a b c", compiled);
		const tokens = getTokensWithValues(result, "a b c");
		expect(tokens).toEqual([
			{ type: "special_a", value: "a" },
			{ type: "space", value: " " },
			{ type: "special_b", value: "b" },
			{ type: "space", value: " " },
			{ type: "special_c", value: "c" },
		]);
	});

	test("nested probes with multiple fallbacks", () => {
		const grammar: Grammar = {
			name: "nested",
			states: {
				main: {
					rules: [{ match: "x", state: "probe1" }],
				},
				probe1: {
					mode: "probe",
					fallback: "fallback1",
					rules: [{ match: " " }, { match: "y", state: "probe2" }],
				},
				probe2: {
					mode: "probe",
					fallback: "fallback2",
					rules: [{ match: " " }, { match: "z", state: "found_xyz" }],
				},
				fallback1: {
					rules: [{ match: "x", token: "x_alone" }],
				},
				fallback2: {
					rules: [
						{ match: "x", token: "x_before_y" },
						{ match: " ", token: "space" },
						{ match: "y", token: "y_alone" },
					],
				},
				found_xyz: {
					rules: [
						{ match: "x", token: "x_in_xyz" },
						{ match: " ", token: "space" },
						{ match: "y", token: "y_in_xyz" },
						{ match: "z", token: "z_in_xyz" },
					],
				},
			},
		};
		const compiled = compile(grammar);

		// Test full match
		const result1 = tokenize("x y z", compiled);
		const tokens1 = getTokensWithValues(result1, "x y z");
		expect(tokens1).toEqual([
			{ type: "x_in_xyz", value: "x" },
			{ type: "space", value: " " },
			{ type: "y_in_xyz", value: "y" },
			{ type: "space", value: " " },
			{ type: "z_in_xyz", value: "z" },
		]);

		// Test partial match - falls back to fallback2
		const result2 = tokenize("x y", compiled);
		const tokens2 = getTokensWithValues(result2, "x y");
		expect(tokens2).toEqual([
			{ type: "x_before_y", value: "x" },
			{ type: "space", value: " " },
			{ type: "y_alone", value: "y" },
		]);

		// Test no match - falls back to fallback1
		const result3 = tokenize("x", compiled);
		const tokens3 = getTokensWithValues(result3, "x");
		expect(tokens3).toEqual([{ type: "x_alone", value: "x" }]);
	});
});

describe("probe mode - ambiguity resolution", () => {
	test("CSS-like selector vs property disambiguation", () => {
		const grammar: Grammar = {
			name: "css-like",
			states: {
				block: {
					rules: [{ match: ["a", "b", "c"], state: "probe_context" }],
				},
				unknown: {
					rules: [{ match: ["a", "b", "c"], token: "unknown" }],
				},
				probe_context: {
					mode: "probe",
					fallback: "unknown",
					rules: [
						{ match: ":" },
						{ match: " " },
						{ match: ["a", "b", "c"] },
						{ match: "{", state: "is_selector" },
						{ match: ";", state: "is_property" },
					],
				},
				is_selector: {
					rules: [
						{ match: ["a", "b", "c"], token: "selector" },
						{ match: ":", token: "pseudo" },
						{ match: " ", token: "space" },
						{ match: "{", token: "brace_open" },
					],
				},
				is_property: {
					rules: [
						{ match: ["a", "b", "c"], token: "property" },
						{ match: ":", token: "colon" },
						{ match: " ", token: "space" },
						{ match: ";", token: "semicolon" },
					],
				},
			},
		};
		const compiled = compile(grammar);

		// Test selector pattern
		const result1 = tokenize("a:b c {", compiled);
		const tokens1 = getTokensWithValues(result1, "a:b c {");
		expect(tokens1).toEqual([
			{ type: "selector", value: "a" },
			{ type: "pseudo", value: ":" },
			{ type: "selector", value: "b" },
			{ type: "space", value: " " },
			{ type: "selector", value: "c" },
			{ type: "space", value: " " },
			{ type: "brace_open", value: "{" },
		]);

		// Test property pattern
		const result2 = tokenize("a: b c;", compiled);
		const tokens2 = getTokensWithValues(result2, "a: b c;");
		expect(tokens2).toEqual([
			{ type: "property", value: "a" },
			{ type: "colon", value: ":" },
			{ type: "space", value: " " },
			{ type: "property", value: "b" },
			{ type: "space", value: " " },
			{ type: "property", value: "c" },
			{ type: "semicolon", value: ";" },
		]);
	});

	test("function call disambiguation", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				main: {
					rules: [{ match: "(", state: "probe_paren" }],
				},
				probe_paren: {
					mode: "probe",
					rules: [
						{ match: " " },
						{ match: "fn", state: "is_function" },
					],
				},
				is_function: {
					rules: [
						{ match: "(", token: "fn_paren" },
						{ match: " ", token: "space" },
						{ match: "fn", token: "fn_keyword" },
						{ match: ")", token: "fn_paren", exit: true },
					],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("( fn )", compiled);
		const tokens = getTokensWithValues(result, "( fn )");
		expect(tokens).toEqual([
			{ type: "fn_paren", value: "(" },
			{ type: "space", value: " " },
			{ type: "fn_keyword", value: "fn" },
			{ type: "space", value: " " },
			{ type: "fn_paren", value: ")" },
		]);
	});
});

describe("probe mode - multiple probe attempts", () => {
	test("tries multiple probe paths", () => {
		const grammar: Grammar = {
			name: "test",
			states: {
				main: {
					rules: [{ match: "x", state: "probe1" }],
				},
				fallback_x: {
					rules: [{ match: "x", token: "fallback_x" }],
				},
				probe1: {
					mode: "probe",
					fallback: "fallback_x",
					rules: [
						{ match: "1", state: "found_digit" },
						{ match: "a", state: "found_letter" },
					],
				},
				found_digit: {
					rules: [
						{ match: "x", token: "x_before_digit" },
						{ match: "1", token: "digit" },
					],
				},
				found_letter: {
					rules: [
						{ match: "x", token: "x_before_letter" },
						{ match: "a", token: "letter" },
					],
				},
			},
		};
		const compiled = compile(grammar);

		// Test digit path
		const result1 = tokenize("x1", compiled);
		const tokens1 = getTokensWithValues(result1, "x1");
		expect(tokens1).toEqual([
			{ type: "x_before_digit", value: "x" },
			{ type: "digit", value: "1" },
		]);

		// Test letter path
		const result2 = tokenize("xa", compiled);
		const tokens2 = getTokensWithValues(result2, "xa");
		expect(tokens2).toEqual([
			{ type: "x_before_letter", value: "x" },
			{ type: "letter", value: "a" },
		]);

		// Test fallback (coalesces adjacent same tokens)
		const result3 = tokenize("xx", compiled);
		const tokens3 = getTokensWithValues(result3, "xx");
		expect(tokens3).toEqual([{ type: "fallback_x", value: "xx" }]);
	});
});

describe("probe mode - with default fallback behavior", () => {
	test("handles probe with implicit default fallback", () => {
		const grammar: Grammar = {
			name: "css-like",
			states: {
				main: {
					rules: [
						{ match: ["a", "b", "c"], state: "probe_context" },
						{ match: " ", token: "space" },
					],
				},
				default_handling: {
					rules: [
						{ match: ["a", "b", "c"], token: "identifier" },
						{ match: " ", token: "space" },
					],
				},
				probe_context: {
					mode: "probe",
					fallback: "default_handling",
					rules: [
						{ match: ":" },
						{ match: " " },
						{ match: ["a", "b", "c"] },
						{ match: "{", state: "is_selector" },
						{ match: ";", state: "is_property" },
					],
				},
				is_selector: {
					rules: [
						{ match: ["a", "b", "c"], token: "selector" },
						{ match: ":", token: "pseudo" },
						{ match: " ", token: "space" },
						{ match: "{", token: "brace_open" },
					],
				},
				is_property: {
					rules: [
						{ match: ["a", "b", "c"], token: "property" },
						{ match: ":", token: "colon" },
						{ match: " ", token: "space" },
						{ match: ";", token: "semicolon" },
					],
				},
			},
		};
		const compiled = compile(grammar);

		// Test default fallback when no disambiguation pattern found
		const result = tokenize("a b", compiled);
		const tokens = getTokensWithValues(result, "a b");
		expect(tokens).toEqual([
			{ type: "identifier", value: "a" },
			{ type: "space", value: " " },
			{ type: "identifier", value: "b" },
		]);
	});
});
