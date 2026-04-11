import { describe, test, expect, vi } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import type { Grammar, TokenizeResult } from "./types";

function tokenValues(
	result: TokenizeResult,
	input: string,
): { type: string; value: string }[] {
	const out: { type: string; value: string }[] = [];
	const count = result.tokens.length / 3;
	for (let i = 0; i < count; i++) {
		const typeIdx = result.tokens[i * 3];
		const type = result.tokenTypes[typeIdx];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		if (type !== undefined) {
			out.push({ type, value: input.slice(start, end) });
		}
	}
	return out;
}

// ---------------------------------------------------------------------------
// Test 1: Basic param substitution — state param replaced with bound value
// ---------------------------------------------------------------------------

describe("parameterized include: basic state param substitution", () => {
	test("state param is replaced with bound string value", () => {
		const grammar: Grammar = {
			rulesets: {
				ops: {
					params: { after_op: "state?" },
					rules: [
						{ match: "+", token: "operator", state: "$after_op", exit: true },
					],
				},
			},
			states: {
				main: {
					include: [{ set: "ops", with: { after_op: "after_plus" } }],
					rules: [{ range: ["a", "z"], token: "letter" }],
				},
				after_plus: {
					rules: [{ range: ["a", "z"], token: "after" }],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("a+b", compiled);
		expect(tokenValues(result, "a+b")).toEqual([
			{ type: "letter", value: "a" },
			{ type: "operator", value: "+" },
			{ type: "after", value: "b" },
		]);
	});
});

// ---------------------------------------------------------------------------
// Test 2: Null binding removes both state and exit from rule
// ---------------------------------------------------------------------------

describe("parameterized include: null binding removes state and exit", () => {
	test("null binding keeps rule in current state (no transition)", () => {
		const grammar: Grammar = {
			rulesets: {
				ops: {
					params: { after_op: "state?" },
					rules: [
						{ match: "+", token: "operator", state: "$after_op", exit: true },
					],
				},
			},
			states: {
				main: {
					include: [{ set: "ops", with: { after_op: null } }],
					rules: [{ range: ["a", "z"], token: "letter" }],
				},
			},
		};
		// With null binding, after "+" we should stay in "main" (letter rule still fires)
		const compiled = compile(grammar);
		const result = tokenize("a+b", compiled);
		expect(tokenValues(result, "a+b")).toEqual([
			{ type: "letter", value: "a" },
			{ type: "operator", value: "+" },
			{ type: "letter", value: "b" },
		]);
	});
});

// ---------------------------------------------------------------------------
// Test 3: Multiple params in one ruleset
// ---------------------------------------------------------------------------

describe("parameterized include: multiple params", () => {
	test("two params each substituted independently", () => {
		const grammar: Grammar = {
			rulesets: {
				kw_ops: {
					params: { kw_dest: "state?", op_dest: "state?" },
					rules: [
						{ match: "kw", token: "keyword", state: "$kw_dest", exit: true },
						{ match: "+", token: "operator", state: "$op_dest", exit: true },
					],
				},
			},
			states: {
				main: {
					include: [{ set: "kw_ops", with: { kw_dest: "after_kw", op_dest: "after_op" } }],
					rules: [{ range: ["a", "z"], token: "letter" }],
				},
				after_kw: {
					rules: [{ match: "1", token: "kw_result" }, { range: ["a", "z"], token: "letter" }],
				},
				after_op: {
					rules: [{ match: "2", token: "op_result" }, { range: ["a", "z"], token: "letter" }],
				},
			},
		};
		const compiled = compile(grammar);
		const result1 = tokenize("kw1", compiled);
		expect(tokenValues(result1, "kw1")).toEqual([
			{ type: "keyword", value: "kw" },
			{ type: "kw_result", value: "1" },
		]);
		const result2 = tokenize("+2", compiled);
		expect(tokenValues(result2, "+2")).toEqual([
			{ type: "operator", value: "+" },
			{ type: "op_result", value: "2" },
		]);
	});
});

// ---------------------------------------------------------------------------
// Test 4: Same parameterized ruleset used in multiple states with different bindings
// ---------------------------------------------------------------------------

describe("parameterized include: same ruleset, different bindings per state", () => {
	test("each state gets independently instantiated rules", () => {
		const grammar: Grammar = {
			rulesets: {
				slash: {
					params: { slash_token: "token?" },
					rules: [
						{ match: "/", token: "$slash_token" },
					],
				},
			},
			states: {
				main: {
					include: [{ set: "slash", with: { slash_token: "regex" } }],
					rules: [{ range: ["a", "z"], token: "letter" }],
				},
				division_ctx: {
					include: [{ set: "slash", with: { slash_token: "division" } }],
					rules: [{ range: ["a", "z"], token: "letter" }],
				},
			},
		};
		const compiledMain = compile({
			rulesets: grammar.rulesets,
			states: { main: grammar.states.main },
		});
		const compiledDiv = compile({
			rulesets: grammar.rulesets,
			states: { main: grammar.states.division_ctx },
		});

		expect(tokenValues(tokenize("/a", compiledMain), "/a")).toEqual([
			{ type: "regex", value: "/" },
			{ type: "letter", value: "a" },
		]);
		expect(tokenValues(tokenize("/a", compiledDiv), "/a")).toEqual([
			{ type: "division", value: "/" },
			{ type: "letter", value: "a" },
		]);
	});
});

// ---------------------------------------------------------------------------
// Test 5: Non-parameterized includes still work alongside parameterized
// ---------------------------------------------------------------------------

describe("parameterized include: mixed parameterized and plain includes", () => {
	test("plain and parameterized includes coexist in same state", () => {
		const grammar: Grammar = {
			rulesets: {
				whitespace: {
					rules: [{ match: [" ", "\t"], token: "ws" }],
				},
				ops: {
					params: { after_op: "state?" },
					rules: [
						{ match: "+", token: "operator", state: "$after_op", exit: true },
					],
				},
			},
			states: {
				main: {
					include: [
						"whitespace",
						{ set: "ops", with: { after_op: null } },
					],
					rules: [{ range: ["a", "z"], token: "letter" }],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("a + b", compiled);
		expect(tokenValues(result, "a + b")).toEqual([
			{ type: "letter", value: "a" },
			{ type: "ws", value: " " },
			{ type: "operator", value: "+" },
			{ type: "ws", value: " " },
			{ type: "letter", value: "b" },
		]);
	});
});

// ---------------------------------------------------------------------------
// Test 6: Error — include parameterized ruleset without `with`
// ---------------------------------------------------------------------------

describe("parameterized include error: missing `with` for parameterized ruleset", () => {
	test("plain string include of parameterized ruleset throws", () => {
		const grammar: Grammar = {
			rulesets: {
				ops: {
					params: { after_op: "state?" },
					rules: [{ match: "+", token: "operator", state: "$after_op", exit: true }],
				},
			},
			states: {
				main: {
					include: ["ops"],
					rules: [{ range: ["a", "z"], token: "letter" }],
				},
			},
		};
		expect(() => compile(grammar)).toThrow(
			/rule set "ops" is parameterized; use \{ set: "ops", with: \{ \.\.\. \} \} to provide bindings/,
		);
	});
});

// ---------------------------------------------------------------------------
// Test 7: Error — include non-parameterized ruleset with `with`
// ---------------------------------------------------------------------------

describe("parameterized include error: `with` on non-parameterized ruleset", () => {
	test("{ set, with } on non-parameterized ruleset throws", () => {
		const grammar: Grammar = {
			rulesets: {
				letters: {
					rules: [{ range: ["a", "z"], token: "letter" }],
				},
			},
			states: {
				main: {
					include: [{ set: "letters", with: { some_param: "value" } }],
					rules: [],
				},
			},
		};
		expect(() => compile(grammar)).toThrow(
			/rule set "letters" is not parameterized/,
		);
	});
});

// ---------------------------------------------------------------------------
// Test 8: Error — missing required param (non-? type)
// ---------------------------------------------------------------------------

describe("parameterized include error: missing required param", () => {
	test("omitting a required param throws", () => {
		const grammar: Grammar = {
			rulesets: {
				ops: {
					params: { after_op: "state" }, // required, no ?
					rules: [{ match: "+", token: "operator", state: "$after_op", exit: true }],
				},
			},
			states: {
				main: {
					include: [{ set: "ops", with: {} }], // missing after_op
					rules: [{ range: ["a", "z"], token: "letter" }],
				},
			},
		};
		expect(() => compile(grammar)).toThrow(
			/missing required param "after_op" when including rule set "ops"/,
		);
	});
});

// ---------------------------------------------------------------------------
// Test 9: Optional param (state?) with null binding works without error
// ---------------------------------------------------------------------------

describe("parameterized include: optional param with null binding", () => {
	test("state? param with null binding compiles without error", () => {
		const grammar: Grammar = {
			rulesets: {
				ops: {
					params: { after_op: "state?" }, // optional
					rules: [{ match: "+", token: "operator", state: "$after_op", exit: true }],
				},
			},
			states: {
				main: {
					include: [{ set: "ops", with: { after_op: null } }],
					rules: [{ range: ["a", "z"], token: "letter" }],
				},
			},
		};
		expect(() => compile(grammar)).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Test 10: Error — unknown param key in bindings
// ---------------------------------------------------------------------------

describe("parameterized include error: unknown param key in bindings", () => {
	test("passing an unknown param key throws", () => {
		const grammar: Grammar = {
			rulesets: {
				ops: {
					params: { after_op: "state?" },
					rules: [{ match: "+", token: "operator", state: "$after_op", exit: true }],
				},
			},
			states: {
				main: {
					include: [{ set: "ops", with: { after_op: null, typo: "something" } }],
					rules: [{ range: ["a", "z"], token: "letter" }],
				},
			},
		};
		expect(() => compile(grammar)).toThrow(
			/unknown param "typo" when including rule set "ops"/,
		);
	});
});

// ---------------------------------------------------------------------------
// Test 11: Warning — unused parameterized ruleset
// ---------------------------------------------------------------------------

describe("parameterized include warning: unused parameterized ruleset", () => {
	test("warns when parameterized ruleset is never included", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const grammar: Grammar = {
			rulesets: {
				used: { rules: [{ range: ["a", "z"], token: "letter" }] },
				orphan_tmpl: {
					params: { dest: "state?" },
					rules: [{ match: "+", token: "operator", state: "$dest", exit: true }],
				},
			},
			states: {
				main: { include: "used", rules: [] },
			},
		};
		compile(grammar);
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('"orphan_tmpl" is defined but never used'),
		);
		warnSpy.mockRestore();
	});
});
