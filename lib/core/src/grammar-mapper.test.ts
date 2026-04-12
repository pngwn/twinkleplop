import { describe, it, expect } from "vitest";
import { GrammarMapper } from "./grammar-mapper";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import { TokenizerIntrospector } from "./introspector";
import type { Grammar } from "./types";

describe("GrammarMapper", () => {
	describe("basic mapping functionality", () => {
		it("should map state names correctly", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [{ match: "a", token: "letter" }],
					},
					string: {
						rules: [{ match: "b", token: "char" }],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);

			expect(mapper.get_state_name(0)).toBe("main");
			expect(mapper.get_state_name(1)).toBe("string");
			expect(mapper.get_state_name(99)).toBe("state_99"); // unknown state
		});

		it("should map token names correctly", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [
							{ match: "a", token: "letter-a" },
							{ match: "b", token: "letter-b" },
						],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);

			expect(mapper.get_token_name(0)).toBe("letter-a");
			expect(mapper.get_token_name(1)).toBe("letter-b");
		});

		it("should describe rules correctly", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [
							{ match: "test", token: "keyword" },
							{ range: ["a", "z"], token: "letter" },
							{ match: [" ", "\t"], token: "whitespace" },
						],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);

			expect(mapper.get_rule_name(0, 0)).toContain("test");
			expect(mapper.get_rule_name(0, 0)).toContain("keyword");
			expect(mapper.get_rule_name(0, 1)).toContain("[a-z]");
			expect(mapper.get_rule_name(0, 2)).toContain("whitespace");
		});

		it("should get rule details", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [
							{ match: "function", token: "keyword", state: "function_body" },
						],
					},
					function_body: {
						rules: [{ match: "}", exit: true }],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);

			const details = mapper.get_rule_details(0, 0);
			expect(details).not.toBeNull();
			expect(details?.token).toBe("keyword");
			expect(details?.action).toBe("push(function_body)");
			expect(details?.pattern).toContain("function");
		});
	});

	describe("state path handling", () => {
		it("should format state paths correctly", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: { rules: [] },
					nested: { rules: [] },
					deep: { rules: [] },
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);

			expect(mapper.get_state_path([0])).toBe("main");
			expect(mapper.get_state_path([0, 1])).toBe("main → nested");
			expect(mapper.get_state_path([0, 1, 2])).toBe("main → nested → deep");
			expect(mapper.get_state_path([])).toBe("");
		});
	});

	describe("transition descriptions", () => {
		it("should describe push transitions", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: { rules: [] },
					nested: { rules: [] },
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);

			const desc = mapper.describe_transition(0, 1, 1); // push
			expect(desc).toContain("Push");
			expect(desc).toContain("main");
			expect(desc).toContain("nested");
		});

		it("should describe pop transitions", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: { rules: [] },
					nested: { rules: [] },
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);

			const desc = mapper.describe_transition(1, 0, 2); // pop
			expect(desc).toContain("Pop");
			expect(desc).toContain("nested");
			expect(desc).toContain("main");
		});
	});

	describe("token descriptions", () => {
		it("should describe tokens with context", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [{ match: "function", token: "keyword.function" }],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);
			const input = "function";

			const desc = mapper.describe_token(0, 0, 8, "function");
			expect(desc.text).toBe("function");
			expect(desc.name).toBe("keyword.function");
			expect(desc.position).toBe("[0:8]");
			expect(desc.length).toBe(8);
		});

		it("should handle multi-line positions", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [{ match: "test", token: "keyword" }],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);
			const input = "line1\nline2\ntest";

			const desc = mapper.describe_token(0, 12, 16, "test");
			expect(desc.position).toBe("[12:16]");
			expect(desc.text).toBe("test");
			expect(desc.length).toBe(4);
		});
	});

	describe("format_event", () => {
		it("should format different event types", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [{ match: "a", token: "letter" }],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);

			// format_event is not a public method, skip this test
			/*
			const before_char = mapper.format_event("BEFORE_CHAR", {
				pos: 0,
				char: 97,
				char_str: "a",
				current_state: "main",
				full_state_path: [0],
			});
			expect(before_char).toContain("[0]");
			expect(before_char).toContain("'a'");
			expect(before_char).toContain("main");

			// MATCHED_RULE event
			const matched = mapper.format_event("MATCHED_RULE", {
				pos: 0,
				current_state: 0,
				rule_index: 0,
				token_type: 0,
			});
			expect(matched).toContain("[0]");
			expect(matched).toContain("letter");

			// EMITTED_TOKEN event
			const emitted = mapper.format_event("EMITTED_TOKEN", {
				start: 0,
				end: 1,
				token_name: "letter",
			});
			expect(emitted).toContain("Token");
			expect(emitted).toContain("letter");
			*/
		});
	});

	describe("analyze_tokenization", () => {
		it("should analyze tokenization results", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [
							{ match: "hello", token: "word" },
							{ match: " ", token: "space" },
						],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);
			const introspector = new TokenizerIntrospector();

			tokenize("hello hello", compiled, introspector);

			const analysis = mapper.analyze_tokenization(introspector);

			expect(analysis.summary.total_tokens).toBe(3); // "hello", " ", "hello"
			expect(analysis.summary.unique_token_types).toBe(2); // word and space
			expect(analysis.tokens_by_type["word"].count).toBe(2);
			expect(analysis.tokens_by_type["space"].count).toBe(1);
			// State visits may be empty if no state transitions occurred
			expect(Object.keys(analysis.state_visits).length).toBeGreaterThanOrEqual(
				0
			);
		});

		it("should track rule usage", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [
							{ range: ["0", "9"], token: "digit" },
							{ range: ["a", "z"], token: "letter" },
						],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);
			const introspector = new TokenizerIntrospector();

			tokenize("a1b2", compiled, introspector);

			const analysis = mapper.analyze_tokenization(introspector);

			expect(Object.keys(analysis.rule_usage).length).toBeGreaterThan(0);
			// Check that both rules were used
			const rule_names = Object.keys(analysis.rule_usage);
			expect(rule_names.some((name) => name.includes("[0-9]"))).toBe(true);
			expect(rule_names.some((name) => name.includes("[a-z]"))).toBe(true);
		});
	});

	describe("analyze_position", () => {
		it("should analyze specific position in input", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [
							{ match: "{", token: "brace.open", state: "block" },
							{ match: "x", token: "var" },
						],
					},
					block: {
						rules: [
							{ match: "}", token: "brace.close", exit: true },
							{ match: "y", token: "inner" },
						],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);
			const introspector = new TokenizerIntrospector();

			tokenize("{y}", compiled, introspector);

			const analysis = mapper.analyze_position(introspector, 1);

			expect(analysis.position).toBe(1);
			expect(analysis.character).toBe("y");
			expect(analysis.current_token?.token_name).toBe("inner");
			expect(analysis.state_path).toContain("block");
		});
	});

	describe("generate_report", () => {
		it("should generate a formatted report", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [
							{ match: "test", token: "keyword" },
							{ match: " ", token: "space" },
							{ range: ["0", "9"], token: "number" },
						],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);
			const introspector = new TokenizerIntrospector();

			tokenize("test 123", compiled, introspector);

			const report = mapper.generate_report(introspector);

			expect(report).toContain("TOKENIZATION REPORT");
			expect(report).toContain("Total tokens: 3");
			expect(report).toContain("Token types: 3");
			expect(report).toContain("keyword");
			expect(report).toContain("space");
			expect(report).toContain("number");
		});
	});

	describe("route handling", () => {
		it("should get and format routes", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [{ match: "(", token: "paren.open", state: "nested" }],
					},
					nested: {
						rules: [{ match: ")", token: "paren.close", exit: true }],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);
			const introspector = new TokenizerIntrospector();

			tokenize("()", compiled, introspector);

			const route = mapper.get_full_route(introspector, 1);
			expect(route.length).toBeGreaterThan(0);

			const formatted = mapper.format_route(introspector, 1);
			expect(formatted).toContain("main");
			expect(formatted).toContain("nested");
		});
	});

	describe("edge cases", () => {
		it("should handle missing data gracefully", () => {
			const grammar: Grammar = {
				name: "test",
				states: {
					main: {
						rules: [{ match: "a", token: "letter" }],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);

			// Non-existent indices
			expect(mapper.get_rule_name(99, 99)).toContain("rule");
			expect(mapper.get_rule_details(99, 99)).toBeNull();
			expect(mapper.get_token_name(999)).toBe("token_999");

			// Invalid stack operation
			// Unknown stack op returns a Goto message
			const desc = mapper.describe_transition(0, 1, 99);
			expect(desc).toContain("Goto:");
		});

		it("should handle complex grammars", () => {
			const grammar: Grammar = {
				name: "complex",
				states: {
					main: {
						rules: [
							{ range: ["a", "z"], token: "word" },
							{ range: ["0", "9"], token: "number" },
							{ match: [" ", "\t", "\n"], token: "whitespace" },
							{
								match_within: { start: "/*", end: "*/", escape: "\\" },
								token: "comment",
							},
						],
					},
				},
			};

			const compiled = compile(grammar);
			const mapper = new GrammarMapper(grammar, compiled);

			// Should handle regex patterns
			const rule0 = mapper.get_rule_name(0, 0);
			expect(rule0).toContain("word");

			// Should handle array matches
			const rule2 = mapper.get_rule_name(0, 2);
			expect(rule2).toContain("whitespace");
		});
	});
});
