import { describe, test, expect } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import {
	anyOf,
	balancedParens,
	capture,
	createLanguage,
	embedGrammars,
	embedInterleaved,
	optional,
	reclassify,
	rewriteTypes,
	seq,
	type,
} from "./reclassifier";
import type {
	Grammar,
	GroupDescriptor,
	GroupScanFn,
	LanguageFn,
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

// ---------------------------------------------------------------------------
// Synthetic host + sub grammars for embedGrammars tests.
// ---------------------------------------------------------------------------
//
// The host grammar emits an "open" token, a "raw" token for the content
// between delimiters (a run of lowercase letters), and a "close" token.
// The sub grammar tokenizes the inner content as "word" and "digit" tokens.

const hostGrammar: Grammar = {
	name: "host",
	states: {
		root: {
			rules: [
				{ match: "<", token: "open", state: "inside" },
				{ any: true, token: "text" },
			],
		},
		inside: {
			rules: [
				{ match: ">", token: "close", exit: true },
				{ range: [["a", "z"]], token: "raw" },
			],
		},
	},
};
const hostCompiled = compile(hostGrammar);

const subGrammar: Grammar = {
	name: "sub",
	states: {
		root: {
			rules: [
				{ range: [["a", "z"]], token: "word" },
				{ range: [["0", "9"]], token: "digit" },
				{ any: true },
			],
		},
	},
};
const subCompiled = compile(subGrammar);
const subLanguage: LanguageFn = createLanguage(subCompiled, []);

function asTokens(result: TokenizeResult, input: string) {
	const out: { type: string; value: string; start: number; end: number }[] = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		out.push({
			type: result.tokenTypes[result.tokens[i * 3]],
			value: input.slice(start, end),
			start,
			end,
		});
	}
	return out;
}

describe("reclassifier — embedGrammars", () => {
	test("replaces a raw token with sub tokens, offset to input-global positions", () => {
		const src = "<abc>";
		const raw = tokenize(src, hostCompiled);
		const enriched = reclassify([
			embedGrammars({ raw: subLanguage }),
		])(src, raw);
		const tokens = asTokens(enriched, src);
		// open, three word tokens (one per letter — the sub's `any` rule emits
		// one token per matched char, coalesced by the tokenizer when adjacent
		// and same-type), close.
		expect(tokens[0]).toMatchObject({ type: "open", value: "<" });
		expect(tokens[tokens.length - 1]).toMatchObject({ type: "close", value: ">" });
		// Check the middle tokens cover `abc` at positions 1-4, with correct
		// offsets remapped from sub-local to input-global.
		const inner = tokens.slice(1, -1);
		const innerText = inner.map((t) => t.value).join("");
		expect(innerText).toBe("abc");
		for (const t of inner) {
			expect(t.type).toBe("word");
			expect(t.start).toBeGreaterThanOrEqual(1);
			expect(t.end).toBeLessThanOrEqual(4);
		}
	});

	test("merges sub tokenTypes into host tokenTypes without collisions", () => {
		const src = "<x>";
		const raw = tokenize(src, hostCompiled);
		const enriched = reclassify([
			embedGrammars({ raw: subLanguage }),
		])(src, raw);
		// Host's types (open, close, raw, text) are preserved; sub's `word`
		// type is appended.
		expect(enriched.tokenTypes).toContain("open");
		expect(enriched.tokenTypes).toContain("close");
		expect(enriched.tokenTypes).toContain("word");
	});

	test("handles multiple embed regions in one document", () => {
		const src = "<abc><xy>";
		const raw = tokenize(src, hostCompiled);
		const enriched = reclassify([
			embedGrammars({ raw: subLanguage }),
		])(src, raw);
		const tokens = asTokens(enriched, src);
		const words = tokens.filter((t) => t.type === "word").map((t) => t.value).join("");
		expect(words).toBe("abcxy");
		// Ensure both open and close tokens are still there for both regions.
		expect(tokens.filter((t) => t.type === "open").length).toBe(2);
		expect(tokens.filter((t) => t.type === "close").length).toBe(2);
	});

	test("no-op when host has no matching token type", () => {
		const src = "<abc>";
		const raw = tokenize(src, hostCompiled);
		const enriched = reclassify([
			embedGrammars({ nonexistent: subLanguage }),
		])(src, raw);
		// Identity: no transformation should have been applied.
		expect(enriched).toBe(raw);
	});

	test("no-op when host has matching type name but no matching tokens", () => {
		// Input with no raw tokens (just text).
		const src = "plain";
		const raw = tokenize(src, hostCompiled);
		const enriched = reclassify([
			embedGrammars({ raw: subLanguage }),
		])(src, raw);
		// Tokens array is unchanged.
		expect(Array.from(enriched.tokens)).toEqual(Array.from(raw.tokens));
	});

	test("host tokens outside embedded regions are preserved verbatim", () => {
		const src = "<abc>";
		const raw = tokenize(src, hostCompiled);
		const rawTokens = asTokens(raw, src);
		const enriched = reclassify([
			embedGrammars({ raw: subLanguage }),
		])(src, raw);
		const enrichedTokens = asTokens(enriched, src);
		// The first and last tokens (open and close) should be byte-identical
		// to the raw tokens — same type, same positions.
		expect(enrichedTokens[0]).toEqual(rawTokens[0]);
		expect(enrichedTokens[enrichedTokens.length - 1]).toEqual(
			rawTokens[rawTokens.length - 1],
		);
	});

	test("sub-language reclassifiers run inside the sub language before splicing", () => {
		// Build a sub language that runs rewriteTypes to rename `word` → `renamed`
		// so we can observe that the sub's own pipeline fired on the embedded
		// content.
		const subWithRewrite = createLanguage(subCompiled, [
			rewriteTypes(
				[
					{
						anchor: "word",
						// Match any word at all (empty `when` via optional).
						when: optional(type("word")),
						rewrite: "renamed",
					},
				],
				{},
			),
		]);
		const src = "<abc>";
		const raw = tokenize(src, hostCompiled);
		const enriched = reclassify([
			embedGrammars({ raw: subWithRewrite }),
		])(src, raw);
		const tokens = asTokens(enriched, src);
		// All inner tokens should now be "renamed", proving the sub's
		// reclassifiers ran.
		const inner = tokens.slice(1, -1);
		expect(inner.every((t) => t.type === "renamed")).toBe(true);
	});

	test("token types shared between host and sub dedup in the merged array", () => {
		// Build a sub grammar that emits `text` — the same name the host uses.
		const collidingSub: Grammar = {
			name: "sub2",
			states: {
				root: {
					rules: [
						{ range: [["a", "z"]], token: "text" },
						{ any: true },
					],
				},
			},
		};
		const compiledSub = compile(collidingSub);
		const lang = createLanguage(compiledSub, []);
		const src = "<abc>";
		const raw = tokenize(src, hostCompiled);
		const enriched = reclassify([
			embedGrammars({ raw: lang }),
		])(src, raw);
		// Only one `text` entry, not two.
		const textCount = enriched.tokenTypes.filter((t) => t === "text").length;
		expect(textCount).toBe(1);
	});
});

describe("reclassifier — capture-based rewrites", () => {
	test("rewrites a single captured token to a new type", () => {
		const rule: RewriteRule = {
			anchor: "keyword",
			anchorValue: "const",
			when: seq(
				capture("name", type("identifier")),
				type("operator", "="),
			),
			rewrite: { name: "function" },
		};
		const src = "const foo = 1";
		const raw = tokenize(src, compiled);
		const result = reclassify([rewriteTypes([rule])])(src, raw);
		const tokens = typesOnly(result, src);
		expect(tokens.find((t) => t.value === "foo")?.type).toBe("function");
		// Anchor itself should NOT be rewritten when rewrite is a capture map.
		expect(tokens.find((t) => t.value === "const")?.type).toBe("keyword");
	});

	test("rewrites multiple captures in one rule", () => {
		const rule: RewriteRule = {
			anchor: "keyword",
			anchorValue: "const",
			when: seq(
				capture("name", type("identifier")),
				type("operator", "="),
				capture("value", type("number")),
			),
			rewrite: { name: "function", value: "boolean" },
		};
		const src = "const foo = 1";
		const raw = tokenize(src, compiled);
		const result = reclassify([rewriteTypes([rule])])(src, raw);
		const tokens = typesOnly(result, src);
		expect(tokens.find((t) => t.value === "foo")?.type).toBe("function");
		expect(tokens.find((t) => t.value === "1")?.type).toBe("boolean");
	});

	test("missing capture target is silently ignored", () => {
		const rule: RewriteRule = {
			anchor: "keyword",
			anchorValue: "const",
			when: seq(capture("name", type("identifier"))),
			rewrite: { name: "function", missing: "ghost" },
		};
		const src = "const foo";
		const raw = tokenize(src, compiled);
		const result = reclassify([rewriteTypes([rule])])(src, raw);
		const tokens = typesOnly(result, src);
		expect(tokens.find((t) => t.value === "foo")?.type).toBe("function");
	});

	test("capture spanning multiple tokens rewrites every token in the span", () => {
		const rule: RewriteRule = {
			anchor: "keyword",
			anchorValue: "let",
			when: seq(
				capture(
					"group",
					seq(type("identifier"), type("operator", "="), type("number")),
				),
			),
			rewrite: { group: "marked" },
		};
		const src = "let x = 5";
		const raw = tokenize(src, compiled);
		const result = reclassify([rewriteTypes([rule])])(src, raw);
		const tokens = typesOnly(result, src);
		expect(tokens.find((t) => t.value === "x")?.type).toBe("marked");
		expect(tokens.find((t) => t.value === "=")?.type).toBe("marked");
		expect(tokens.find((t) => t.value === "5")?.type).toBe("marked");
	});

	test("capture inside optional only triggers on the taken branch", () => {
		const rule: RewriteRule = {
			anchor: "keyword",
			anchorValue: "const",
			when: seq(
				capture("name", type("identifier")),
				optional(
					seq(
						type("operator", "="),
						capture("value", type("number")),
					),
				),
			),
			rewrite: { name: "function", value: "boolean" },
		};
		// Without initializer — only `name` fires.
		const src1 = "const foo";
		const r1 = reclassify([rewriteTypes([rule])])(
			src1,
			tokenize(src1, compiled),
		);
		const t1 = typesOnly(r1, src1);
		expect(t1.find((t) => t.value === "foo")?.type).toBe("function");

		// With initializer — both fire.
		const src2 = "const bar = 5";
		const r2 = reclassify([rewriteTypes([rule])])(
			src2,
			tokenize(src2, compiled),
		);
		const t2 = typesOnly(r2, src2);
		expect(t2.find((t) => t.value === "bar")?.type).toBe("function");
		expect(t2.find((t) => t.value === "5")?.type).toBe("boolean");
	});

	test("Phase 1 string rewrite still works (anchor-only rewrite)", () => {
		const rule: RewriteRule = {
			anchor: "identifier",
			when: type("operator", "="),
			rewrite: "function",
		};
		const src = "a = 1";
		const raw = tokenize(src, compiled);
		const result = reclassify([rewriteTypes([rule])])(src, raw);
		const tokens = typesOnly(result, src);
		expect(tokens.find((t) => t.value === "a")?.type).toBe("function");
	});
});

describe("reclassifier — embedGrammars with trim and wrap", () => {
	// Build a host grammar that emits a `template` token spanning backticks +
	// content, similar to how JS coalesces template literals.
	const tmplGrammar: Grammar = {
		name: "tmpl_host",
		states: {
			root: {
				rules: [
					{ match: "`", token: "template", state: "inside" },
					{ range: [["a", "z"]], token: "identifier" },
					{ any: true },
				],
			},
			inside: {
				rules: [
					{ match: "`", token: "template", exit: true },
					{ any: true, token: "template" },
				],
			},
		},
	};
	const tmplCompiled = compile(tmplGrammar);
	const tmplLang: LanguageFn = createLanguage(tmplCompiled, []);

	test("trim skips leading/trailing chars before sub-tokenizing", () => {
		// `abc` → one coalesced template token spanning positions 0-5.
		// With trimStart=1, trimEnd=1, the sub language sees "abc" (3 chars).
		const src = "`abc`";
		const raw = tokenize(src, tmplCompiled);
		const result = reclassify([
			embedGrammars({
				template: {
					language: subLanguage,
					trimStart: 1,
					trimEnd: 1,
				},
			}),
		])(src, raw);
		const tokens = asTokens(result, src);
		// Sub tokens cover positions 1-4 (`abc`) as `word` tokens.
		const wordTokens = tokens.filter((t) => t.type === "word");
		expect(wordTokens.length).toBeGreaterThan(0);
		for (const w of wordTokens) {
			expect(w.start).toBeGreaterThanOrEqual(1);
			expect(w.end).toBeLessThanOrEqual(4);
		}
	});

	test("wrapToken emits delimiter tokens for the trimmed ranges", () => {
		const src = "`abc`";
		const raw = tokenize(src, tmplCompiled);
		const result = reclassify([
			embedGrammars({
				template: {
					language: subLanguage,
					trimStart: 1,
					trimEnd: 1,
					wrapToken: "template",
				},
			}),
		])(src, raw);
		const tokens = asTokens(result, src);
		// Expect a leading template token at [0,1], then sub words for "abc",
		// then a trailing template token at [4,5].
		expect(tokens[0]).toMatchObject({
			type: "template",
			value: "`",
			start: 0,
			end: 1,
		});
		expect(tokens[tokens.length - 1]).toMatchObject({
			type: "template",
			value: "`",
			start: 4,
			end: 5,
		});
		// Sub words should span the middle.
		const middle = tokens.slice(1, -1);
		expect(middle.every((t) => t.type === "word")).toBe(true);
	});

	test("simple LanguageFn mapping still works (backwards compat)", () => {
		const src = "<abc>";
		const raw = tokenize(src, hostCompiled);
		const result = reclassify([embedGrammars({ raw: subLanguage })])(
			src,
			raw,
		);
		// Same as Phase 2 — bare LanguageFn without trim/wrap.
		const tokens = asTokens(result, src);
		expect(tokens[0]).toMatchObject({ type: "open", value: "<" });
		expect(tokens[tokens.length - 1]).toMatchObject({
			type: "close",
			value: ">",
		});
	});

	test("trim guarded against oversized values", () => {
		// Token is 5 chars; trimStart=10, trimEnd=10 should NOT underflow.
		const src = "`abc`";
		const raw = tokenize(src, tmplCompiled);
		const result = reclassify([
			embedGrammars({
				template: { language: subLanguage, trimStart: 10, trimEnd: 10 },
			}),
		])(src, raw);
		// Should not throw; sub content is empty so no sub tokens produced.
		const tokens = asTokens(result, src);
		expect(tokens.every((t) => t.type !== "word")).toBe(true);
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

// ---------------------------------------------------------------------------
// embedInterleaved
// ---------------------------------------------------------------------------
//
// A purpose-built synthetic host grammar that can represent tagged-template
// shaped groups: a tag identifier + a `[` + content letters + `<` expr `>`
// holes + `]`. Deliberately NOT using backticks/${} so the tests are clearly
// about the generic primitive, not tagged templates specifically.
//
// Example input: "TAG[abc<H>def]"
//   - TAG is an identifier that signals a group
//   - [ opens the group
//   - abc is content (lowercase letters)
//   - <H> is a hole (uppercase letter is a "host-language expression")
//   - def is more content
//   - ] closes the group
const interleavedHost: Grammar = {
	name: "interleaved_host",
	states: {
		root: {
			rules: [
				{ match: "TAG", boundary: true, token: "tag" },
				{ match: "[", token: "open" },
				{ match: "]", token: "close" },
				{ match: "<", token: "holeopen" },
				{ match: ">", token: "holeclose" },
				{ range: [["a", "z"]], token: "content" },
				{ range: [["A", "Z"]], token: "holebody" },
			],
		},
	},
};
const interleavedHostCompiled = compile(interleavedHost);

// Sub grammar — classifies lowercase as `word` and digits as `digit`.
const interleavedSub: Grammar = {
	name: "interleaved_sub",
	states: {
		root: {
			rules: [
				{ range: [["a", "z"]], token: "word" },
				{ range: [["0", "9"]], token: "digit" },
				{ any: true },
			],
		},
	},
};
const interleavedSubCompiled = compile(interleavedSub);
const interleavedSubLang: LanguageFn = createLanguage(interleavedSubCompiled, []);

// Scanner for our synthetic host: find "TAG[...]" groups.
//
// The scanner TRIGGERS on the `tag` token at position i, but the group
// range it returns starts at i + 1 so the `tag` token itself stays intact
// in the output. Mirrors the JS tagged-template case where the `html`
// identifier is the trigger but isn't part of the retagged group.
const scanInterleaved: GroupScanFn = (tokens, _input, i, tokenTypes) => {
	const tagId = tokenTypes.indexOf("tag");
	const openId = tokenTypes.indexOf("open");
	const closeId = tokenTypes.indexOf("close");
	const contentId = tokenTypes.indexOf("content");
	const holeOpenId = tokenTypes.indexOf("holeopen");
	const holeCloseId = tokenTypes.indexOf("holeclose");
	if (tagId < 0 || openId < 0) return null;
	const count = tokens.length / 3;
	if (tokens[i * 3] !== tagId) return null;
	if (i + 1 >= count || tokens[(i + 1) * 3] !== openId) return null;

	const regions: GroupDescriptor["regions"] = [];
	let k = i + 2;
	// Opening `[` as a synthetic "delimiter" token covering its single char.
	const openStart = tokens[(i + 1) * 3 + 1];
	regions.push({
		kind: "synthetic",
		sourceStart: openStart,
		sourceEnd: openStart + 1,
		typeName: "delimiter",
	});

	while (k < count) {
		const tk = tokens[k * 3];
		const ts = tokens[k * 3 + 1];
		const te = tokens[k * 3 + 2];

		if (tk === contentId) {
			regions.push({ kind: "content", sourceStart: ts, sourceEnd: te });
			k++;
		} else if (tk === holeOpenId) {
			// Collect the hole: holeopen + holebody + holeclose.
			const holeStart = ts;
			let end = k + 1;
			while (end < count && tokens[end * 3] !== holeCloseId) end++;
			if (end >= count) return null;
			const holeEndPos = tokens[end * 3 + 2];
			regions.push({
				kind: "hole",
				sourceStart: holeStart,
				sourceEnd: holeEndPos,
				tokenStart: k,
				tokenEnd: end + 1,
			});
			k = end + 1;
		} else if (tk === closeId) {
			regions.push({
				kind: "synthetic",
				sourceStart: ts,
				sourceEnd: te,
				typeName: "delimiter",
			});
			// Return range is i+1 → k+1 so the `tag` token stays in the host
			// stream; the group only replaces the [ ... ] content.
			return { tokenStart: i + 1, tokenEnd: k + 1, regions };
		} else {
			return null;
		}
	}
	return null;
};

function runInterleaved(
	src: string,
	language: LanguageFn = interleavedSubLang,
): TokenizeResult {
	const raw = tokenize(src, interleavedHostCompiled);
	return reclassify([embedInterleaved({ scan: scanInterleaved, language })])(
		src,
		raw,
	);
}

describe("reclassifier — embedInterleaved", () => {
	test("input with no group is returned unchanged", () => {
		const src = "abc";
		const raw = tokenize(src, interleavedHostCompiled);
		const result = reclassify([
			embedInterleaved({ scan: scanInterleaved, language: interleavedSubLang }),
		])(src, raw);
		// No groups found — no-op short-circuit returns the original reference.
		expect(result).toBe(raw);
	});

	test("single content region, no holes → sub-tokenized content + delimiters", () => {
		const src = "TAG[abc]";
		const result = runInterleaved(src);
		const tokens = asTokens(result, src);
		expect(tokens[0]).toMatchObject({ type: "tag", value: "TAG" });
		expect(tokens[1]).toMatchObject({ type: "delimiter", value: "[" });
		const innerWords = tokens.slice(2, -1);
		expect(innerWords.map((t) => t.value).join("")).toBe("abc");
		for (const w of innerWords) expect(w.type).toBe("word");
		expect(tokens[tokens.length - 1]).toMatchObject({
			type: "delimiter",
			value: "]",
		});
	});

	test("content + hole + content: sub-language sees one virtual input", () => {
		// Source layout:
		//   T A G [ a b < H > c  d  ]
		//   0 1 2 3 4 5 6 7 8 9 10 11
		// Content 1 = "ab" @ 4-6; hole = <H> @ 6-9; content 2 = "cd" @ 9-11.
		// The sub grammar coalesces adjacent lowercase into a single `word`,
		// so virtual source "ab   cd" produces two word tokens ("ab" then
		// "cd") — the space-filled hole breaks the run.
		const src = "TAG[ab<H>cd]";
		const result = runInterleaved(src);
		const tokens = asTokens(result, src);
		const words = tokens.filter((t) => t.type === "word");
		expect(words).toHaveLength(2);
		expect(words[0]).toMatchObject({ value: "ab", start: 4, end: 6 });
		expect(words[1]).toMatchObject({ value: "cd", start: 9, end: 11 });
		// Hole tokens must pass through verbatim.
		expect(tokens.find((t) => t.value === "<")?.type).toBe("holeopen");
		expect(tokens.find((t) => t.value === "H")?.type).toBe("holebody");
		expect(tokens.find((t) => t.value === ">")?.type).toBe("holeclose");
	});

	test("sub-token straddling a hole boundary is split; hole-internal part dropped", () => {
		// Sub grammar whose `run` rule accepts lowercase AND space, so the
		// virtual source "ab   cd" (7 chars) produces ONE coalesced run
		// token spanning the whole thing. That token must be split at the
		// hole boundary into two pieces — the hole-internal part is dropped.
		const straddleSub: Grammar = {
			name: "straddle_sub",
			states: {
				root: {
					rules: [
						{ range: [["a", "z"]], token: "run" },
						{ match: " ", token: "run" },
						{ any: true },
					],
				},
			},
		};
		const straddleLang: LanguageFn = createLanguage(compile(straddleSub), []);
		const src = "TAG[ab<H>cd]";
		const raw = tokenize(src, interleavedHostCompiled);
		const result = reclassify([
			embedInterleaved({ scan: scanInterleaved, language: straddleLang }),
		])(src, raw);
		const tokens = asTokens(result, src);
		const runs = tokens.filter((t) => t.type === "run");
		expect(runs).toHaveLength(2);
		expect(runs[0]).toMatchObject({ value: "ab", start: 4, end: 6 });
		expect(runs[1]).toMatchObject({ value: "cd", start: 9, end: 11 });
		// Hole tokens preserved.
		expect(tokens.find((t) => t.value === "<")).toBeDefined();
		expect(tokens.find((t) => t.value === "H")).toBeDefined();
		expect(tokens.find((t) => t.value === ">")).toBeDefined();
	});

	test("multiple disjoint groups are processed independently", () => {
		const src = "TAG[ab]xyTAG[cd]";
		const result = runInterleaved(src);
		const tokens = asTokens(result, src);
		const delims = tokens.filter((t) => t.type === "delimiter");
		expect(delims).toHaveLength(4);
		const words = tokens.filter((t) => t.type === "word");
		expect(words.map((w) => w.value).join("")).toBe("abcd");
	});

	test("synthetic regions merge their type into the output tokenTypes", () => {
		const src = "TAG[a]";
		const result = runInterleaved(src);
		expect(result.tokenTypes).toContain("delimiter");
	});

	test("per-group language override on the descriptor", () => {
		const markSub: Grammar = {
			name: "mark_sub",
			states: {
				root: { rules: [{ range: [["a", "z"]], token: "mark" }] },
			},
		};
		const markLang: LanguageFn = createLanguage(compile(markSub), []);
		const scan: GroupScanFn = (tokens, input, i, tokenTypes) => {
			const base = scanInterleaved(tokens, input, i, tokenTypes);
			if (base === null) return null;
			return { ...base, language: markLang };
		};
		const src = "TAG[ab]";
		const raw = tokenize(src, interleavedHostCompiled);
		const result = reclassify([
			embedInterleaved({ scan, language: interleavedSubLang }),
		])(src, raw);
		const tokens = asTokens(result, src);
		// Sub-language was markLang, not interleavedSubLang — so the "ab"
		// content is `mark` rather than `word`. (Adjacent same-type tokens
		// coalesce to one.)
		expect(tokens.find((t) => t.value === "ab")?.type).toBe("mark");
		// Just to be sure it's not word:
		expect(tokens.some((t) => t.type === "word")).toBe(false);
	});

	test("scanner returning null for all positions leaves input untouched", () => {
		const src = "abcxyz";
		const raw = tokenize(src, interleavedHostCompiled);
		const neverScan: GroupScanFn = () => null;
		const result = reclassify([
			embedInterleaved({ scan: neverScan, language: interleavedSubLang }),
		])(src, raw);
		expect(result).toBe(raw);
	});

	test("purity — raw TokenizeResult is not mutated", () => {
		const src = "TAG[ab]";
		const raw = tokenize(src, interleavedHostCompiled);
		const rawTokensBefore = Array.from(raw.tokens);
		reclassify([
			embedInterleaved({ scan: scanInterleaved, language: interleavedSubLang }),
		])(src, raw);
		const rawTokensAfter = Array.from(raw.tokens);
		expect(rawTokensAfter).toEqual(rawTokensBefore);
	});

	test("multiple holes in one group — state flows across all of them", () => {
		// TAG [ a <H> b <I> c ]
		// 012 3 4 567 8 9,10,11 12 13
		// T=0 A=1 G=2 [=3 a=4 <=5 H=6 >=7 b=8 <=9 I=10 >=11 c=12 ]=13
		const src = "TAG[a<H>b<I>c]";
		const result = runInterleaved(src);
		const tokens = asTokens(result, src);
		const words = tokens.filter((t) => t.type === "word");
		expect(words.map((w) => w.value)).toEqual(["a", "b", "c"]);
		// Real positions are preserved.
		expect(words[0].start).toBe(4);
		expect(words[1].start).toBe(8);
		expect(words[2].start).toBe(12);
		// Two holes passed through verbatim.
		expect(tokens.filter((t) => t.type === "holeopen")).toHaveLength(2);
		expect(tokens.filter((t) => t.type === "holebody")).toHaveLength(2);
		expect(tokens.filter((t) => t.type === "holeclose")).toHaveLength(2);
	});

	test("custom holeChar is honored when filling hole regions", () => {
		// Sub grammar that accepts lowercase AND 'x' as `run`. With holeChar
		// "x", the virtual source "abxxxcd" (2 content + 3 hole + 2 content)
		// becomes one coalesced run that must split at the real boundaries.
		const straddleSub: Grammar = {
			name: "straddle_sub_x",
			states: {
				root: {
					rules: [{ range: [["a", "z"]], token: "run" }, { any: true }],
				},
			},
		};
		const lang: LanguageFn = createLanguage(compile(straddleSub), []);
		const src = "TAG[ab<H>cd]";
		const raw = tokenize(src, interleavedHostCompiled);
		const result = reclassify([
			embedInterleaved({ scan: scanInterleaved, language: lang, holeChar: "x" }),
		])(src, raw);
		const tokens = asTokens(result, src);
		const runs = tokens.filter((t) => t.type === "run");
		expect(runs).toHaveLength(2);
		expect(runs[0]).toMatchObject({ value: "ab", start: 4, end: 6 });
		expect(runs[1]).toMatchObject({ value: "cd", start: 9, end: 11 });
	});
});
