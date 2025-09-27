import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import { compile } from "./compiler.js";

describe("TokenizerIntrospector", () => {
	it("should track tokens and state transitions", async () => {
		// Import the debug version
		const { tokenize, TokenizerIntrospector } = await import(
			"./tokenizer.debug.js"
		);

		const input = "hello world";
		const grammar = {
			name: "simple",
			states: {
				main: [
					{ match: /\w+/, token: "word" },
					{ match: /\s+/, token: "space" },
				],
			},
		};

		const compiled = compile(grammar);
		const introspector = new TokenizerIntrospector();

		const result = tokenize(input, compiled, introspector);

		// Should have 3 tokens: "hello", " ", "world"
		expect(result.tokens.length).toBe(9); // 3 tokens * 3 values each

		// Check introspector collected tokens
		expect(introspector.tokens).toHaveLength(3);
		expect(introspector.tokens[0].text).toBe("hello");
		expect(introspector.tokens[1].text).toBe(" ");
		expect(introspector.tokens[2].text).toBe("world");
	});

	it("should track rule matches", async () => {
		const { tokenize, TokenizerIntrospector } = await import(
			"./tokenizer.debug.js"
		);

		const input = "123 abc";
		const grammar = {
			name: "test",
			states: {
				main: [
					{ match: /\d+/, token: "number" },
					{ match: /[a-z]+/, token: "letters" },
					{ match: /\s+/, token: "space" },
				],
			},
		};

		const compiled = compile(grammar);
		const introspector = new TokenizerIntrospector();

		tokenize(input, compiled, introspector);

		// Should have matched rules for each token
		expect(introspector.ruleMatches.length).toBeGreaterThan(0);

		// Check first rule match
		const firstMatch = introspector.ruleMatches[0];
		expect(firstMatch).toHaveProperty("ruleIndex");
		expect(firstMatch).toHaveProperty("tokenType");
	});

	it("should track state transitions", async () => {
		const { tokenize, TokenizerIntrospector } = await import(
			"./tokenizer.debug.js"
		);

		const input = "{content}";
		const grammar = {
			name: "nested",
			states: {
				main: [{ match: "{", token: "brace.open", state: "inside" }],
				inside: [
					{ match: /\w+/, token: "word" },
					{ match: "}", token: "brace.close", exit: true },
				],
			},
		};

		const compiled = compile(grammar);
		const introspector = new TokenizerIntrospector();

		tokenize(input, compiled, introspector);

		// Should have state transitions
		expect(introspector.stateTransitions.length).toBeGreaterThan(0);

		// Should have pushed and popped states
		const hasePush = introspector.stateTransitions.some(
			(t) => t.type === "PUSHED_STATE"
		);
		const hasPop = introspector.stateTransitions.some(
			(t) => t.type === "POPPED_STATE"
		);
		expect(hasePush || hasPop).toBe(true);
	});

	it("should provide token history", async () => {
		const { tokenize, TokenizerIntrospector } = await import(
			"./tokenizer.debug.js"
		);

		const input = "test";
		const grammar = {
			name: "simple",
			states: {
				main: [{ match: /\w+/, token: "word" }],
			},
		};

		const compiled = compile(grammar);
		const introspector = new TokenizerIntrospector();

		tokenize(input, compiled, introspector);

		// Get history for first token
		const tokenHistory = introspector.getTokenHistory(0);
		expect(tokenHistory).not.toBeNull();
		expect(tokenHistory.token.text).toBe("test");
		expect(tokenHistory.history.length).toBeGreaterThan(0);
	});

	it("should find token at position", async () => {
		const { tokenize, TokenizerIntrospector } = await import(
			"./tokenizer.debug.js"
		);

		const input = "hello world";
		const grammar = {
			name: "simple",
			states: {
				main: [
					{ match: /\w+/, token: "word" },
					{ match: /\s+/, token: "space" },
				],
			},
		};

		const compiled = compile(grammar);
		const introspector = new TokenizerIntrospector();

		tokenize(input, compiled, introspector);

		// Position 0-4 should be "hello"
		const token = introspector.getTokenAtPosition(2);
		expect(token).not.toBeNull();
		expect(token.text).toBe("hello");

		// Position 6-10 should be "world"
		const token2 = introspector.getTokenAtPosition(7);
		expect(token2).not.toBeNull();
		expect(token2.text).toBe("world");
	});

	it("should generate report", async () => {
		const { tokenize, TokenizerIntrospector } = await import(
			"./tokenizer.debug.js"
		);

		const input = "abc 123";
		const grammar = {
			name: "test",
			states: {
				main: [
					{ match: /[a-z]+/, token: "letters" },
					{ match: /\d+/, token: "number" },
					{ match: /\s+/, token: "space" },
				],
			},
		};

		const compiled = compile(grammar);
		const introspector = new TokenizerIntrospector();

		tokenize(input, compiled, introspector);

		const report = introspector.generateReport();
		expect(report).toHaveProperty("summary");
		expect(report.summary.tokenCount).toBe(3);
		expect(report).toHaveProperty("tokens");
		expect(report).toHaveProperty("topRules");
	});

	it("should compare debug and production versions", async () => {
		// Import both
		const debugModule = await import("./tokenizer.debug.js");
		const prodModule = await import("./tokenizer.production.js");

		const input = "test input";
		const grammar = {
			name: "simple",
			states: {
				main: [
					{ match: /\w+/, token: "word" },
					{ match: /\s+/, token: "space" },
				],
			},
		};

		const compiled = compile(grammar);

		// Debug version with introspector
		const introspector = new debugModule.TokenizerIntrospector();
		const debugResult = debugModule.tokenize(input, compiled, introspector);

		// Production version (no introspector)
		const prodResult = prodModule.tokenize(input, compiled);

		// Both should produce identical tokens
		expect(debugResult.tokens).toEqual(prodResult.tokens);
		expect(debugResult.tokenTypes).toEqual(prodResult.tokenTypes);

		// But only debug version should have collected introspection data
		expect(introspector.tokens.length).toBeGreaterThan(0);
	});
});
