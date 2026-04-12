import { describe, test, expect, vi } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import type { Grammar, TokenizeResult } from "./types";

function token_values(
	result: TokenizeResult,
	input: string,
): { type: string; value: string }[] {
	const out: { type: string; value: string }[] = [];
	const count = result.tokens.length / 3;
	for (let i = 0; i < count; i++) {
		const type_idx = result.tokens[i * 3];
		const type = result.token_types[type_idx];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		if (type !== undefined) {
			out.push({ type, value: input.slice(start, end) });
		}
	}
	return out;
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("include: single ruleset", () => {
	test("state includes one ruleset — included rules apply", () => {
		const grammar: Grammar = {
			rulesets: {
				letters: { rules: [{ range: ["a", "z"], token: "letter" }] },
			},
			states: {
				main: {
					include: "letters",
					rules: [{ match: "!", token: "bang" }],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("abc!", compiled);
		expect(token_values(result, "abc!")).toEqual([
			{ type: "letter", value: "abc" },
			{ type: "bang", value: "!" },
		]);
	});
});

describe("include: multiple rulesets — order preserved", () => {
	test("rules from first include come before rules from second", () => {
		const grammar: Grammar = {
			rulesets: {
				digits: { rules: [{ range: ["0", "9"], token: "digit" }] },
				letters: { rules: [{ range: ["a", "z"], token: "letter" }] },
			},
			states: {
				main: {
					include: ["digits", "letters"],
					rules: [],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("a1b2", compiled);
		expect(token_values(result, "a1b2")).toEqual([
			{ type: "letter", value: "a" },
			{ type: "digit", value: "1" },
			{ type: "letter", value: "b" },
			{ type: "digit", value: "2" },
		]);
	});
});

describe("include: own rules append after included", () => {
	test("own rules come after included rules in the effective list", () => {
		// 'x' is matched by own rule; letters matched by included ruleset.
		// Because included rules precede own rules, if included had 'x' it would win.
		// Here included only covers [a-w,y-z] to prove own 'x' rule fires.
		const grammar: Grammar = {
			rulesets: {
				non_x_letters: {
					rules: [
						{ range: ["a", "w"], token: "letter" },
						{ range: ["y", "z"], token: "letter" },
					],
				},
			},
			states: {
				main: {
					include: "non_x_letters",
					rules: [{ match: "x", token: "ex" }],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("axb", compiled);
		expect(token_values(result, "axb")).toEqual([
			{ type: "letter", value: "a" },
			{ type: "ex", value: "x" },
			{ type: "letter", value: "b" },
		]);
	});
});

describe("include: ruleset includes ruleset (two-level composition)", () => {
	test("nested include fully flattened", () => {
		const grammar: Grammar = {
			rulesets: {
				digits: { rules: [{ range: ["0", "9"], token: "digit" }] },
				alphanum: {
					include: "digits",
					rules: [{ range: ["a", "z"], token: "letter" }],
				},
			},
			states: {
				main: {
					include: "alphanum",
					rules: [],
				},
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("a1b2", compiled);
		expect(token_values(result, "a1b2")).toEqual([
			{ type: "letter", value: "a" },
			{ type: "digit", value: "1" },
			{ type: "letter", value: "b" },
			{ type: "digit", value: "2" },
		]);
	});
});

describe("include: deep nesting (3+ levels)", () => {
	test("a → b → c fully flattened in correct order", () => {
		const grammar: Grammar = {
			rulesets: {
				dots: { rules: [{ match: ".", token: "dot" }] },
				bangs: { include: "dots", rules: [{ match: "!", token: "bang" }] },
				mixed: { include: "bangs", rules: [{ match: "?", token: "question" }] },
			},
			states: {
				main: {
					include: "mixed",
					rules: [],
				},
			},
		};
		// Effective order: dots, bangs, mixed — so dot, bang, question in priority
		const compiled = compile(grammar);
		const result = tokenize(".!?", compiled);
		expect(token_values(result, ".!?")).toEqual([
			{ type: "dot", value: "." },
			{ type: "bang", value: "!" },
			{ type: "question", value: "?" },
		]);
	});
});

describe("include: multiple states share a ruleset", () => {
	test("spec §3.2 pattern — shared common rules, different slash handling per state", () => {
		const grammar: Grammar = {
			rulesets: {
				common: {
					rules: [
						{ range: ["a", "z"], token: "ident" },
						{ match: "+", token: "operator" },
					],
				},
			},
			states: {
				// state that treats / as a division operator
				division: {
					include: "common",
					rules: [{ match: "/", token: "division" }],
				},
				// state that treats / as a regex start
				regex_allow: {
					include: "common",
					rules: [{ match: "/", token: "regex" }],
				},
			},
		};

		const division_compiled = compile({
			rulesets: grammar.rulesets,
			states: { main: grammar.states.division },
		});
		const regex_compiled = compile({
			rulesets: grammar.rulesets,
			states: { main: grammar.states.regex_allow },
		});

		expect(token_values(tokenize("a/b", division_compiled), "a/b")).toEqual([
			{ type: "ident", value: "a" },
			{ type: "division", value: "/" },
			{ type: "ident", value: "b" },
		]);
		expect(token_values(tokenize("a/b", regex_compiled), "a/b")).toEqual([
			{ type: "ident", value: "a" },
			{ type: "regex", value: "/" },
			{ type: "ident", value: "b" },
		]);
	});
});

describe("include: empty own rules with include is valid", () => {
	test("state with rules: [] and include compiles fine", () => {
		const grammar: Grammar = {
			rulesets: {
				base: { rules: [{ range: ["a", "z"], token: "letter" }] },
			},
			states: {
				main: { include: "base", rules: [] },
			},
		};
		expect(() => compile(grammar)).not.toThrow();
	});
});

describe("include: pure aggregation ruleset (rules: [], include: [...])", () => {
	test("ruleset with empty rules that aggregates others is valid", () => {
		const grammar: Grammar = {
			rulesets: {
				digits: { rules: [{ range: ["0", "9"], token: "digit" }] },
				letters: { rules: [{ range: ["a", "z"], token: "letter" }] },
				all: { include: ["digits", "letters"], rules: [] },
			},
			states: {
				main: { include: "all", rules: [] },
			},
		};
		const compiled = compile(grammar);
		const result = tokenize("a1", compiled);
		expect(token_values(result, "a1")).toEqual([
			{ type: "letter", value: "a" },
			{ type: "digit", value: "1" },
		]);
	});
});

// ---------------------------------------------------------------------------
// Compile errors
// ---------------------------------------------------------------------------

describe("include errors: unknown ruleset name in state include", () => {
	test("throws with descriptive message", () => {
		const grammar: Grammar = {
			states: {
				main: {
					include: "typo_ruleset",
					rules: [],
				},
			},
		};
		expect(() => compile(grammar)).toThrow(/unknown rule set "typo_ruleset"/);
	});
});

describe("include errors: state name used in include", () => {
	test("throws distinguishing states from rulesets", () => {
		const grammar: Grammar = {
			states: {
				main: {
					include: "other" as any,
					rules: [],
				},
				other: {
					rules: [{ match: "x", token: "x" }],
				},
			},
		};
		expect(() => compile(grammar)).toThrow(
			/"other" refers to a tokeniser state; include accepts rule-set names only/,
		);
	});
});

describe("include errors: duplicate ruleset name in include array", () => {
	test("throws on duplicate name", () => {
		const grammar: Grammar = {
			rulesets: {
				base: { rules: [{ range: ["a", "z"], token: "letter" }] },
			},
			states: {
				main: {
					include: ["base", "base"] as any,
					rules: [],
				},
			},
		};
		expect(() => compile(grammar)).toThrow(/duplicate include "base"/);
	});
});

describe("include errors: empty effective rule list", () => {
	test("throws when included ruleset is empty and state has no own rules", () => {
		const grammar: Grammar = {
			rulesets: {
				empty: { rules: [] },
			},
			states: {
				main: { include: "empty", rules: [] },
			},
		};
		expect(() => compile(grammar)).toThrow(
			/state "main" has no rules and no non-empty includes/,
		);
	});
});

describe("include errors: cycle between two rulesets", () => {
	test("throws listing both names", () => {
		const grammar: Grammar = {
			rulesets: {
				a: { include: "b", rules: [] },
				b: { include: "a", rules: [] },
			},
			states: {
				main: { include: "a", rules: [{ match: "x", token: "x" }] },
			},
		};
		expect(() => compile(grammar)).toThrow(/rule sets form a cycle/);
		expect(() => compile(grammar)).toThrow(/a/);
		expect(() => compile(grammar)).toThrow(/b/);
	});
});

describe("include errors: cycle through three rulesets", () => {
	test("throws listing cycle path", () => {
		const grammar: Grammar = {
			rulesets: {
				a: { include: "b", rules: [] },
				b: { include: "c", rules: [] },
				c: { include: "a", rules: [] },
			},
			states: {
				main: { include: "a", rules: [{ match: "x", token: "x" }] },
			},
		};
		expect(() => compile(grammar)).toThrow(/rule sets form a cycle/);
	});
});

describe("include errors: unknown ruleset in a ruleset's own include", () => {
	test("throws with descriptive message", () => {
		const grammar: Grammar = {
			rulesets: {
				base: { include: "nonexistent", rules: [] },
			},
			states: {
				main: { include: "base", rules: [{ match: "x", token: "x" }] },
			},
		};
		expect(() => compile(grammar)).toThrow(/unknown rule set "nonexistent"/);
	});
});

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

describe("include warnings: dead local rule shadowed by included rule", () => {
	test("warns when own rule match is identical to an included rule's match", () => {
		const warn_spy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const grammar: Grammar = {
			rulesets: {
				base: { rules: [{ match: "/", token: "slash" }] },
			},
			states: {
				main: {
					include: "base",
					// This local rule for "/" is dead — "base" already claims it
					rules: [{ match: "/", token: "division" }],
				},
			},
		};
		compile(grammar);
		expect(warn_spy).toHaveBeenCalledWith(
			expect.stringContaining('rule in state "main" is shadowed'),
		);
		expect(warn_spy).toHaveBeenCalledWith(
			expect.stringContaining('"base"'),
		);
		warn_spy.mockRestore();
	});
});

describe("include warnings: unused ruleset", () => {
	test("warns for a ruleset that is never referenced", () => {
		const warn_spy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const grammar: Grammar = {
			rulesets: {
				used: { rules: [{ range: ["a", "z"], token: "letter" }] },
				orphan: { rules: [{ match: "!", token: "bang" }] },
			},
			states: {
				main: { include: "used", rules: [] },
			},
		};
		compile(grammar);
		expect(warn_spy).toHaveBeenCalledWith(
			expect.stringContaining('"orphan" is defined but never used'),
		);
		warn_spy.mockRestore();
	});
});
