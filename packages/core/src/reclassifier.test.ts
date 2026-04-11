import { describe, test, expect } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import {
	anyOf,
	balancedParens,
	capture,
	optional,
	reclassify,
	rewriteTypes,
	seq,
	type,
} from "./reclassifier";
import type {
	Grammar,
	RewriteRule,
	TokenizeResult,
} from "./types";

// A tiny synthetic grammar that produces a tight JS-ish token stream so the
// reclassifier tests don't depend on the real JS package or its grammar.
const toy: Grammar = {
	name: "toy",
	states: {
		root: {
			rules: [
				{ match: ["const", "let", "var"], boundary: true, token: "keyword" },
				{ match: ["function", "async"], boundary: true, token: "keyword" },
				{ match: ["true", "false"], boundary: true, token: "boolean" },
				{ match: "/*", token: "comment", state: "comment" },
				{
					range: [
						["a", "z"],
						["A", "Z"],
					],
					token: "identifier",
				},
				{ range: [["0", "9"]], token: "number" },
				{ match: ["=>", "==="], token: "operator" },
				{ match: ["=", "+", "-", "*", ":"], token: "operator" },
				{ match: ["(", ")", "{", "}", "[", "]", ",", ";"], token: "punctuation" },
				{ match: [" ", "\t", "\n"] }, // whitespace: no token
			],
		},
		comment: {
			rules: [
				{ match: "*/", token: "comment", exit: true },
				{ any: true, token: "comment" },
			],
		},
	},
};
const compiled = compile(toy);

function run(input: string, rules: RewriteRule[]): TokenizeResult {
	const raw = tokenize(input, compiled);
	return reclassify([rewriteTypes(rules, { trivia: ["comment"] })])(input, raw);
}

function typesOnly(result: TokenizeResult, input: string) {
	const out: { type: string; value: string }[] = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		out.push({
			type: result.tokenTypes[result.tokens[i * 3]],
			value: input.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2]),
		});
	}
	return out;
}

// A realistic function-variable rule using the combinators under test.
const fnVarRule: RewriteRule = {
	anchor: "identifier",
	when: seq(
		type("operator", ["=", ":"]),
		optional(type("keyword", "async")),
		anyOf(
			type("keyword", "function"),
			seq(balancedParens("(", ")"), type("operator", "=>")),
			seq(type("identifier"), type("operator", "=>")),
		),
	),
	rewrite: "function",
};

describe("reclassifier — rewriteTypes", () => {
	test("rewrites identifier to function for arrow assignment with empty params", () => {
		const result = run("const foo = () => 1", [fnVarRule]);
		const tokens = typesOnly(result, "const foo = () => 1");
		const foo = tokens.find((t) => t.value === "foo");
		expect(foo?.type).toBe("function");
	});

	test("rewrites for arrow assignment with param list", () => {
		const result = run("const add = (a, b) => a + b", [fnVarRule]);
		const tokens = typesOnly(result, "const add = (a, b) => a + b");
		const add = tokens.find((t) => t.value === "add");
		expect(add?.type).toBe("function");
		// Inner params must NOT be rewritten
		expect(tokens.find((t) => t.value === "a")?.type).toBe("identifier");
		expect(tokens.find((t) => t.value === "b")?.type).toBe("identifier");
	});

	test("rewrites for single-parameter arrow without parens", () => {
		const result = run("const double = x => x", [fnVarRule]);
		const tokens = typesOnly(result, "const double = x => x");
		const names = tokens.filter((t) => t.value === "double" || t.value === "x");
		expect(names[0].type).toBe("function"); // double
		expect(names[1].type).toBe("identifier"); // x (param)
		expect(names[2].type).toBe("identifier"); // x (body)
	});

	test("rewrites for function expression", () => {
		const result = run("const f = function", [fnVarRule]);
		const tokens = typesOnly(result, "const f = function");
		expect(tokens.find((t) => t.value === "f")?.type).toBe("function");
	});

	test("rewrites for async arrow", () => {
		const result = run("const fetchIt = async () => 1", [fnVarRule]);
		const tokens = typesOnly(result, "const fetchIt = async () => 1");
		expect(tokens.find((t) => t.value === "fetchIt")?.type).toBe("function");
	});

	test("rewrites for object method with arrow", () => {
		const result = run("x = { foo : () => 1 }", [fnVarRule]);
		const tokens = typesOnly(result, "x = { foo : () => 1 }");
		expect(tokens.find((t) => t.value === "foo")?.type).toBe("function");
	});

	test("leaves plain value assignment alone", () => {
		const result = run("const x = 5", [fnVarRule]);
		const tokens = typesOnly(result, "const x = 5");
		expect(tokens.find((t) => t.value === "x")?.type).toBe("identifier");
	});

	test("leaves call-result assignment alone", () => {
		const result = run("const x = foo ( )", [fnVarRule]);
		const tokens = typesOnly(result, "const x = foo ( )");
		// x should stay identifier — `= foo ( )` is not `= () =>` nor `= function`
		expect(tokens.find((t) => t.value === "x")?.type).toBe("identifier");
	});

	test("balanced parens handle nested groups", () => {
		const result = run("const f = ((a), (b)) => a", [fnVarRule]);
		const tokens = typesOnly(result, "const f = ((a), (b)) => a");
		expect(tokens.find((t) => t.value === "f")?.type).toBe("function");
	});

	test("trivia (comment) is skipped between pattern elements", () => {
		const result = run("const f /* wat */ = () => 1", [fnVarRule]);
		const tokens = typesOnly(result, "const f /* wat */ = () => 1");
		expect(tokens.find((t) => t.value === "f")?.type).toBe("function");
	});
});

describe("reclassifier — matcher primitives", () => {
	test("seq matches a sequence in order", () => {
		const rule: RewriteRule = {
			anchor: "keyword",
			anchorValue: "let",
			when: seq(type("identifier"), type("operator", "=")),
			rewrite: "boolean", // abuse an unrelated name so we can detect the rewrite
		};
		const result = run("let x = 1", [rule]);
		const tokens = typesOnly(result, "let x = 1");
		expect(tokens[0].type).toBe("boolean"); // `let` rewritten
	});

	test("anyOf picks the first successful branch", () => {
		const rule: RewriteRule = {
			anchor: "identifier",
			when: anyOf(type("operator", "=="), type("operator", "===")),
			rewrite: "function",
		};
		const result = run("a === b", [rule]);
		const tokens = typesOnly(result, "a === b");
		expect(tokens.find((t) => t.value === "a")?.type).toBe("function");
	});

	test("optional succeeds without consuming", () => {
		const rule: RewriteRule = {
			anchor: "identifier",
			when: seq(
				optional(type("keyword", "async")),
				type("operator", "="),
			),
			rewrite: "function",
		};
		const resultA = run("a = 1", [rule]);
		expect(typesOnly(resultA, "a = 1").find((t) => t.value === "a")?.type).toBe(
			"function",
		);
	});

	test("balancedParens requires matched open/close", () => {
		const rule: RewriteRule = {
			anchor: "identifier",
			when: seq(balancedParens("(", ")"), type("operator", "=>")),
			rewrite: "function",
		};
		// Not followed by =>
		const result = run("f ( ) + 1", [rule]);
		expect(typesOnly(result, "f ( ) + 1").find((t) => t.value === "f")?.type).toBe(
			"identifier",
		);
	});

	test("capture is accepted but does not affect matching (Phase 1)", () => {
		const rule: RewriteRule = {
			anchor: "identifier",
			when: seq(capture("name", type("operator", "="))),
			rewrite: "function",
		};
		const result = run("x = 1", [rule]);
		expect(typesOnly(result, "x = 1").find((t) => t.value === "x")?.type).toBe(
			"function",
		);
	});

	test("anchorValue constrains the anchor token's source text", () => {
		const rule: RewriteRule = {
			anchor: "identifier",
			anchorValue: ["bar"],
			when: type("operator", "="),
			rewrite: "function",
		};
		const result = run("foo = 1 bar = 2", [rule]);
		const tokens = typesOnly(result, "foo = 1 bar = 2");
		expect(tokens.find((t) => t.value === "foo")?.type).toBe("identifier");
		expect(tokens.find((t) => t.value === "bar")?.type).toBe("function");
	});
});

describe("reclassifier — pipeline composition", () => {
	test("transforms run in order", () => {
		const first = rewriteTypes(
			[
				{
					anchor: "identifier",
					when: type("operator", "="),
					rewrite: "stage1",
				},
			],
			{},
		);
		// The second transform sees the output of the first — the anchor type
		// name has changed, so we key on "stage1" now.
		const second = rewriteTypes(
			[
				{
					anchor: "stage1",
					when: type("operator", "="),
					rewrite: "stage2",
				},
			],
			{},
		);
		const raw = tokenize("a = 1", compiled);
		const result = reclassify([first, second])("a = 1", raw);
		const tokens = typesOnly(result, "a = 1");
		expect(tokens.find((t) => t.value === "a")?.type).toBe("stage2");
	});

	test("empty pipeline is a no-op", () => {
		const raw = tokenize("a = 1", compiled);
		const result = reclassify([])("a = 1", raw);
		expect(result).toBe(raw);
	});

	test("rewriteTypes leaves tokens referencing a fresh tokenTypes array", () => {
		const raw = tokenize("a = 1", compiled);
		const originalTypes = raw.tokenTypes;
		reclassify([
			rewriteTypes([
				{ anchor: "identifier", when: type("operator", "="), rewrite: "function" },
			]),
		])("a = 1", raw);
		// The grammar's shared tokenTypes array must NOT have been mutated.
		expect(originalTypes).toBe(compiled.tokenTypes);
		expect(originalTypes.includes("function")).toBe(false); // toy grammar never emits `function`
	});

	test("first-match-wins within one rewriteTypes call", () => {
		const rules: RewriteRule[] = [
			{
				anchor: "identifier",
				when: type("operator", "="),
				rewrite: "firstHit",
			},
			{
				anchor: "identifier",
				when: type("operator", "="),
				rewrite: "secondHit",
			},
		];
		const result = run("a = 1", rules);
		const tokens = typesOnly(result, "a = 1");
		expect(tokens.find((t) => t.value === "a")?.type).toBe("firstHit");
	});
});
