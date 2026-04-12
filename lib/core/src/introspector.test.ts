import { describe, it, expect, beforeAll } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import { TokenizerIntrospector } from "./introspector";
import { Grammar } from "./types";

describe("TokenizerIntrospector", () => {
	it("should track tokens and state transitions", async () => {
		const input = "hello world";
		const grammar: Grammar = {
			name: "simple",
			states: {
				main: {
					rules: [
						{ range: ["a", "z"], token: "word" },
						{ match: " ", token: "space" },
					],
				},
			},
		};

		const compiled = compile(grammar);
		const introspector = new TokenizerIntrospector();

		const result = tokenize(input, compiled, introspector);
		// Should have 3 tokens: "hello", " ", "world"
		expect(result.tokens.length).toBe(9); // 3 tokens * 3 values each

		// Check introspector collected tokens
		expect(introspector.tokens).toHaveLength(3);
		expect(introspector.tokens[0].value).toBe("hello");
		expect(introspector.tokens[1].value).toBe(" ");
		expect(introspector.tokens[2].value).toBe("world");
	});

	it("should track rule matches", async () => {
		const input = "123 abc";
		const grammar: Grammar = {
			name: "test",
			states: {
				main: {
					rules: [
						{ range: ["0", "9"], token: "number" },
						{ range: ["a", "z"], token: "letters" },
						{ match: [" ", "\t"], token: "space" },
					],
				},
			},
		};

		const compiled = compile(grammar);
		const introspector = new TokenizerIntrospector();

		tokenize(input, compiled, introspector);

		// Should have matched rules for each token
		expect(introspector.rule_matches.length).toBeGreaterThan(0);

		// Check first rule match
		const first_match = introspector.rule_matches[0];
		expect(first_match).toHaveProperty("rule_index");
		expect(first_match).toHaveProperty("token_type");
	});

	it("should track state transitions", async () => {
		const input = "{content}";
		const grammar: Grammar = {
			name: "nested",
			states: {
				main: {
					rules: [{ match: "{", token: "brace.open", state: "inside" }],
				},
				inside: {
					rules: [
						{ range: ["a", "z"], token: "word" },
						{ match: "}", token: "brace.close", exit: true },
					],
				},
			},
		};

		const compiled = compile(grammar);
		const introspector = new TokenizerIntrospector();

		tokenize(input, compiled, introspector);

		// Should have state transitions
		expect(introspector.state_transitions.length).toBeGreaterThan(0);

		// Should have pushed and popped states
		const has_push = introspector.state_transitions.some(
			(t) => t.type === "PUSHED_STATE"
		);
		const has_pop = introspector.state_transitions.some(
			(t) => t.type === "POPPED_STATE"
		);
		expect(has_push || has_pop).toBe(true);
	});

	it("should provide token history", async () => {
		const input = "test";
		const grammar: Grammar = {
			name: "simple",
			states: {
				main: {
					rules: [{ range: ["a", "z"], token: "word" }],
				},
			},
		};

		const compiled = compile(grammar);
		const introspector = new TokenizerIntrospector();

		tokenize(input, compiled, introspector);

		// Get history for first token
		const token_history = introspector.get_token_history(0);
		expect(token_history).not.toBeNull();
		expect(token_history?.token.value).toBe("test");
		expect(token_history?.history.length).toBeGreaterThan(0);
	});

	it("should find token at position", async () => {
		const input = "hello world";
		const grammar: Grammar = {
			name: "simple",
			states: {
				main: {
					rules: [
						{ range: ["a", "z"], token: "word" },
						{ match: [" ", "\t"], token: "space" },
					],
				},
			},
		};

		const compiled = compile(grammar);
		const introspector = new TokenizerIntrospector();

		tokenize(input, compiled, introspector);

		// Position 0-4 should be "hello"
		const token = introspector.get_token_at_position(2);
		expect(token).not.toBeNull();
		expect(token?.value).toBe("hello");

		// Position 6-10 should be "world"
		const token2 = introspector.get_token_at_position(7);
		expect(token2).not.toBeNull();
		expect(token2?.value).toBe("world");
	});

	it("should generate report", async () => {
		const input = "abc 123";
		const grammar: Grammar = {
			name: "test",
			states: {
				main: {
					rules: [
						{ range: ["a", "z"], token: "letters" },
						{ range: ["0", "9"], token: "number" },
						{ match: [" ", "\t"], token: "space" },
					],
				},
			},
		};

		const compiled = compile(grammar);
		const introspector = new TokenizerIntrospector();

		tokenize(input, compiled, introspector);

		const report = introspector.generate_report();
		expect(report).toHaveProperty("summary");
		expect(report.summary.token_count).toBe(3);
		expect(report).toHaveProperty("tokens");
		expect(report).toHaveProperty("top_rules");
	});

	// it("should compare debug and production versions", async () => {

	// 	const input = "test input";
	// 	const grammar = {
	// 		name: "simple",
	// 		states: {
	// 			main: [
	// 				{ match: /\w+/, token: "word" },
	// 				{ match: /\s+/, token: "space" },
	// 			],
	// 		},
	// 	};

	// 	const compiled = compile(grammar);

	// 	// Debug version with introspector
	// 	const introspector = new debug_module.TokenizerIntrospector();
	// 	const debug_result = debug_module.tokenize(input, compiled, introspector);

	// 	// Production version (no introspector)
	// 	const prod_result = prod_module.tokenize(input, compiled);

	// 	// Both should produce identical tokens
	// 	expect(debug_result.tokens).toEqual(prod_result.tokens);
	// 	expect(debug_result.token_types).toEqual(prod_result.token_types);

	// 	// But only debug version should have collected introspection data
	// 	expect(introspector.tokens.length).toBeGreaterThan(0);
	// });
});
