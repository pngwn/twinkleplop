import { describe, test, expect } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import {
  any_of,
  balanced_parens,
  capture,
  create_language,
  embed_grammars,
  embed_interleaved,
  optional,
  reclassify,
  rewrite_types,
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
  return reclassify([rewrite_types(rules, { trivia: ["comment"] })])(input, raw);
}

function types_only(result: TokenizeResult, input: string) {
  const out: { type: string; value: string }[] = [];
  for (let i = 0; i < result.tokens.length / 3; i++) {
    out.push({
      type: result.token_types[result.tokens[i * 3]],
      value: input.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2]),
    });
  }
  return out;
}

// A realistic function-variable rule using the combinators under test.
const fn_var_rule: RewriteRule = {
  anchor: "identifier",
  when: seq(
    type("operator", ["=", ":"]),
    optional(type("keyword", "async")),
    any_of(
      type("keyword", "function"),
      seq(balanced_parens("(", ")"), type("operator", "=>")),
      seq(type("identifier"), type("operator", "=>")),
    ),
  ),
  rewrite: "function",
};

describe("reclassifier — rewrite_types", () => {
  test("rewrites identifier to function for arrow assignment with empty params", () => {
    const result = run("const foo = () => 1", [fn_var_rule]);
    const tokens = types_only(result, "const foo = () => 1");
    const foo = tokens.find((t) => t.value === "foo");
    expect(foo?.type).toBe("function");
  });

  test("rewrites for arrow assignment with param list", () => {
    const result = run("const add = (a, b) => a + b", [fn_var_rule]);
    const tokens = types_only(result, "const add = (a, b) => a + b");
    const add = tokens.find((t) => t.value === "add");
    expect(add?.type).toBe("function");
    // Inner params must NOT be rewritten
    expect(tokens.find((t) => t.value === "a")?.type).toBe("identifier");
    expect(tokens.find((t) => t.value === "b")?.type).toBe("identifier");
  });

  test("rewrites for single-parameter arrow without parens", () => {
    const result = run("const double = x => x", [fn_var_rule]);
    const tokens = types_only(result, "const double = x => x");
    const names = tokens.filter((t) => t.value === "double" || t.value === "x");
    expect(names[0].type).toBe("function"); // double
    expect(names[1].type).toBe("identifier"); // x (param)
    expect(names[2].type).toBe("identifier"); // x (body)
  });

  test("rewrites for function expression", () => {
    const result = run("const f = function", [fn_var_rule]);
    const tokens = types_only(result, "const f = function");
    expect(tokens.find((t) => t.value === "f")?.type).toBe("function");
  });

  test("rewrites for async arrow", () => {
    const result = run("const fetchIt = async () => 1", [fn_var_rule]);
    const tokens = types_only(result, "const fetchIt = async () => 1");
    expect(tokens.find((t) => t.value === "fetchIt")?.type).toBe("function");
  });

  test("rewrites for object method with arrow", () => {
    const result = run("x = { foo : () => 1 }", [fn_var_rule]);
    const tokens = types_only(result, "x = { foo : () => 1 }");
    expect(tokens.find((t) => t.value === "foo")?.type).toBe("function");
  });

  test("leaves plain value assignment alone", () => {
    const result = run("const x = 5", [fn_var_rule]);
    const tokens = types_only(result, "const x = 5");
    expect(tokens.find((t) => t.value === "x")?.type).toBe("identifier");
  });

  test("leaves call-result assignment alone", () => {
    const result = run("const x = foo ( )", [fn_var_rule]);
    const tokens = types_only(result, "const x = foo ( )");
    // x should stay identifier — `= foo ( )` is not `= () =>` nor `= function`
    expect(tokens.find((t) => t.value === "x")?.type).toBe("identifier");
  });

  test("balanced parens handle nested groups", () => {
    const result = run("const f = ((a), (b)) => a", [fn_var_rule]);
    const tokens = types_only(result, "const f = ((a), (b)) => a");
    expect(tokens.find((t) => t.value === "f")?.type).toBe("function");
  });

  test("trivia (comment) is skipped between pattern elements", () => {
    const result = run("const f /* wat */ = () => 1", [fn_var_rule]);
    const tokens = types_only(result, "const f /* wat */ = () => 1");
    expect(tokens.find((t) => t.value === "f")?.type).toBe("function");
  });
});

describe("reclassifier — anchor text_pred", () => {
  // the toy grammar's identifier range is [a-z A-Z] only, so test inputs
  // here avoid underscores and digits — upper_snake's defining feature.
  // the predicate is still meaningfully exercised (length >= 2, first char
  // uppercase, body all uppercase letters).

  test("upper_snake_case promotes ALL-CAPS identifiers", () => {
    const rule: RewriteRule = {
      anchor: type("identifier", undefined, { text_pred: "upper_snake_case" }),
      rewrite: "constant",
    };
    const src = "const MAX = 10; const items = 0; const HTTP = 200";
    const result = run(src, [rule]);
    const tokens = types_only(result, src);
    expect(tokens.find((t) => t.value === "MAX")?.type).toBe("constant");
    expect(tokens.find((t) => t.value === "HTTP")?.type).toBe("constant");
    expect(tokens.find((t) => t.value === "items")?.type).toBe("identifier");
  });

  test("upper_snake_case rejects single-char and PascalCase identifiers", () => {
    const rule: RewriteRule = {
      anchor: type("identifier", undefined, { text_pred: "upper_snake_case" }),
      rewrite: "constant",
    };
    const src = "const T = 1; const Foo = 2; const M = 3";
    const result = run(src, [rule]);
    const tokens = types_only(result, src);
    expect(tokens.find((t) => t.value === "T")?.type).toBe("identifier");
    expect(tokens.find((t) => t.value === "Foo")?.type).toBe("identifier");
    expect(tokens.find((t) => t.value === "M")?.type).toBe("identifier");
  });

  test("pascal_case promotes PascalCase identifiers including single-char", () => {
    const rule: RewriteRule = {
      anchor: type("identifier", undefined, { text_pred: "pascal_case" }),
      rewrite: "class_name",
    };
    const src = "const Cat = 1; const dog = 2; const T = 3; const FOO = 4";
    const result = run(src, [rule]);
    const tokens = types_only(result, src);
    expect(tokens.find((t) => t.value === "Cat")?.type).toBe("class_name");
    expect(tokens.find((t) => t.value === "T")?.type).toBe("class_name");
    expect(tokens.find((t) => t.value === "dog")?.type).toBe("identifier");
    // all-uppercase multi-char names are upper_snake territory, not pascal.
    expect(tokens.find((t) => t.value === "FOO")?.type).toBe("identifier");
  });

  test("text_pred combines with value constraint (AND semantics)", () => {
    const rule: RewriteRule = {
      anchor: type("identifier", ["FOO", "BAR", "items"], {
        text_pred: "upper_snake_case",
      }),
      rewrite: "constant",
    };
    const src = "const FOO = 1; const items = 2";
    const result = run(src, [rule]);
    const tokens = types_only(result, src);
    expect(tokens.find((t) => t.value === "FOO")?.type).toBe("constant");
    // "items" passes the value filter but fails the text predicate (lowercase).
    expect(tokens.find((t) => t.value === "items")?.type).toBe("identifier");
  });

  test("unknown predicate name silently never matches", () => {
    const rule: RewriteRule = {
      anchor: type("identifier", undefined, {
        text_pred: "definitely_not_real" as unknown as "upper_snake_case",
      }),
      rewrite: "constant",
    };
    const src = "const FOO = 1";
    const result = run(src, [rule]);
    const tokens = types_only(result, src);
    expect(tokens.find((t) => t.value === "FOO")?.type).toBe("identifier");
  });

  test("text_pred works inside when clauses, not just anchors", () => {
    // anchor is `new`; the next identifier must be PascalCase to qualify.
    const rule: RewriteRule = {
      anchor: type("keyword", "function"),
      when: type("identifier", undefined, { text_pred: "pascal_case" }),
      rewrite: "boolean",
    };
    const ok = run("function Foo", [rule]);
    expect(types_only(ok, "function Foo")[0].type).toBe("boolean");
    const not_ok = run("function foo", [rule]);
    expect(types_only(not_ok, "function foo")[0].type).toBe("keyword");
  });

  test("unknown predicate name inside when clause fails closed", () => {
    const rule: RewriteRule = {
      anchor: type("keyword", "function"),
      when: type("identifier", undefined, {
        text_pred: "definitely_not_real" as unknown as "upper_snake_case",
      }),
      rewrite: "boolean",
    };
    const result = run("function Foo", [rule]);
    expect(types_only(result, "function Foo")[0].type).toBe("keyword");
  });
});

describe("reclassifier — matcher primitives", () => {
  test("seq matches a sequence in order", () => {
    const rule: RewriteRule = {
      anchor: type("keyword", "let"),
      when: seq(type("identifier"), type("operator", "=")),
      rewrite: "boolean", // abuse an unrelated name so we can detect the rewrite
    };
    const result = run("let x = 1", [rule]);
    const tokens = types_only(result, "let x = 1");
    expect(tokens[0].type).toBe("boolean"); // `let` rewritten
  });

  test("anyOf picks the first successful branch", () => {
    const rule: RewriteRule = {
      anchor: "identifier",
      when: any_of(type("operator", "=="), type("operator", "===")),
      rewrite: "function",
    };
    const result = run("a === b", [rule]);
    const tokens = types_only(result, "a === b");
    expect(tokens.find((t) => t.value === "a")?.type).toBe("function");
  });

  test("optional succeeds without consuming", () => {
    const rule: RewriteRule = {
      anchor: "identifier",
      when: seq(optional(type("keyword", "async")), type("operator", "=")),
      rewrite: "function",
    };
    const result_a = run("a = 1", [rule]);
    expect(types_only(result_a, "a = 1").find((t) => t.value === "a")?.type).toBe("function");
  });

  test("balancedParens requires matched open/close", () => {
    const rule: RewriteRule = {
      anchor: "identifier",
      when: seq(balanced_parens("(", ")"), type("operator", "=>")),
      rewrite: "function",
    };
    // Not followed by =>
    const result = run("f ( ) + 1", [rule]);
    expect(types_only(result, "f ( ) + 1").find((t) => t.value === "f")?.type).toBe("identifier");
  });

  test("capture is accepted but does not affect matching (Phase 1)", () => {
    const rule: RewriteRule = {
      anchor: "identifier",
      when: seq(capture("name", type("operator", "="))),
      rewrite: "function",
    };
    const result = run("x = 1", [rule]);
    expect(types_only(result, "x = 1").find((t) => t.value === "x")?.type).toBe("function");
  });

  test("anchor as type() constrains the anchor token's source text", () => {
    const rule: RewriteRule = {
      anchor: type("identifier", ["bar"]),
      when: type("operator", "="),
      rewrite: "function",
    };
    const result = run("foo = 1 bar = 2", [rule]);
    const tokens = types_only(result, "foo = 1 bar = 2");
    expect(tokens.find((t) => t.value === "foo")?.type).toBe("identifier");
    expect(tokens.find((t) => t.value === "bar")?.type).toBe("function");
  });

  test("rule with only `before` succeeds when `when` is omitted", () => {
    const rule: RewriteRule = {
      anchor: "identifier",
      before: type("keyword", "const"),
      rewrite: "function",
    };
    const result = run("const foo = 1", [rule]);
    const tokens = types_only(result, "const foo = 1");
    expect(tokens.find((t) => t.value === "foo")?.type).toBe("function");
  });

  test("`before` seq matches children right-to-left", () => {
    // matches `function async foo` -> seq(keyword "function", keyword "async")
    // walking left from foo, we see async first then function.
    const rule: RewriteRule = {
      anchor: "identifier",
      before: seq(type("keyword", "function"), type("keyword", "async")),
      rewrite: "function",
    };
    const ok = run("function async foo", [rule]);
    expect(types_only(ok, "function async foo").find((t) => t.value === "foo")?.type).toBe(
      "function",
    );
    // wrong order: should not match
    const wrong = run("async function foo", [rule]);
    expect(types_only(wrong, "async function foo").find((t) => t.value === "foo")?.type).toBe(
      "identifier",
    );
  });

  test("`before` any_of tries branches in order", () => {
    const rule: RewriteRule = {
      anchor: "identifier",
      before: any_of(type("keyword", "let"), type("keyword", "var")),
      rewrite: "function",
    };
    expect(types_only(run("let foo = 1", [rule]), "let foo = 1").find((t) => t.value === "foo")?.type).toBe("function");
    expect(types_only(run("var foo = 1", [rule]), "var foo = 1").find((t) => t.value === "foo")?.type).toBe("function");
    expect(types_only(run("const foo = 1", [rule]), "const foo = 1").find((t) => t.value === "foo")?.type).toBe("identifier");
  });

  test("`before` optional matches with or without the inner pattern", () => {
    const rule: RewriteRule = {
      anchor: "identifier",
      before: seq(type("keyword", "const"), optional(type("keyword", "async"))),
      rewrite: "function",
    };
    expect(types_only(run("const foo = 1", [rule]), "const foo = 1").find((t) => t.value === "foo")?.type).toBe("function");
    expect(types_only(run("const async foo = 1", [rule]), "const async foo = 1").find((t) => t.value === "foo")?.type).toBe("function");
  });

  test("`before` value uses ends-with semantics for coalesced punctuation", () => {
    // when the tokenizer coalesces `;}` into one punctuation token, a
    // lookbehind for "}" should still match because "}" is the suffix.
    // build a tiny case using "==" which gets emitted as one operator
    // token; a lookbehind for "=" should match.
    const rule: RewriteRule = {
      anchor: "identifier",
      before: type("operator", "="),
      rewrite: "function",
    };
    const result = run("foo === bar", [rule]);
    // "bar" follows the "===" operator -- the ends-with "=" check matches.
    expect(types_only(result, "foo === bar").find((t) => t.value === "bar")?.type).toBe(
      "function",
    );
  });

  test("`before` skips trivia (comments) walking left", () => {
    const rule: RewriteRule = {
      anchor: "identifier",
      before: type("keyword", "const"),
      rewrite: "function",
    };
    const result = run("const /* tag */ foo = 1", [rule]);
    expect(types_only(result, "const /* tag */ foo = 1").find((t) => t.value === "foo")?.type).toBe(
      "function",
    );
  });
});

// ---------------------------------------------------------------------------
// Synthetic host + sub grammars for embedGrammars tests.
// ---------------------------------------------------------------------------
//
// The host grammar emits an "open" token, a "raw" token for the content
// between delimiters (a run of lowercase letters), and a "close" token.
// The sub grammar tokenizes the inner content as "word" and "digit" tokens.

const host_grammar: Grammar = {
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
const host_compiled = compile(host_grammar);

const sub_grammar: Grammar = {
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
const sub_compiled = compile(sub_grammar);
const sub_language: LanguageFn = create_language(sub_compiled, [])();

function as_tokens(result: TokenizeResult, input: string) {
  const out: { type: string; value: string; start: number; end: number }[] = [];
  for (let i = 0; i < result.tokens.length / 3; i++) {
    const start = result.tokens[i * 3 + 1];
    const end = result.tokens[i * 3 + 2];
    out.push({
      type: result.token_types[result.tokens[i * 3]],
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
    const raw = tokenize(src, host_compiled);
    const enriched = reclassify([embed_grammars({ raw: sub_language })])(src, raw);
    const tokens = as_tokens(enriched, src);
    // open, three word tokens (one per letter — the sub's `any` rule emits
    // one token per matched char, coalesced by the tokenizer when adjacent
    // and same-type), close.
    expect(tokens[0]).toMatchObject({ type: "open", value: "<" });
    expect(tokens[tokens.length - 1]).toMatchObject({ type: "close", value: ">" });
    // Check the middle tokens cover `abc` at positions 1-4, with correct
    // offsets remapped from sub-local to input-global.
    const inner = tokens.slice(1, -1);
    const inner_text = inner.map((t) => t.value).join("");
    expect(inner_text).toBe("abc");
    for (const t of inner) {
      expect(t.type).toBe("word");
      expect(t.start).toBeGreaterThanOrEqual(1);
      expect(t.end).toBeLessThanOrEqual(4);
    }
  });

  test("merges sub token_types into host token_types without collisions", () => {
    const src = "<x>";
    const raw = tokenize(src, host_compiled);
    const enriched = reclassify([embed_grammars({ raw: sub_language })])(src, raw);
    // Host's types (open, close, raw, text) are preserved; sub's `word`
    // type is appended.
    expect(enriched.token_types).toContain("open");
    expect(enriched.token_types).toContain("close");
    expect(enriched.token_types).toContain("word");
  });

  test("handles multiple embed regions in one document", () => {
    const src = "<abc><xy>";
    const raw = tokenize(src, host_compiled);
    const enriched = reclassify([embed_grammars({ raw: sub_language })])(src, raw);
    const tokens = as_tokens(enriched, src);
    const words = tokens
      .filter((t) => t.type === "word")
      .map((t) => t.value)
      .join("");
    expect(words).toBe("abcxy");
    // Ensure both open and close tokens are still there for both regions.
    expect(tokens.filter((t) => t.type === "open").length).toBe(2);
    expect(tokens.filter((t) => t.type === "close").length).toBe(2);
  });

  test("no-op when host has no matching token type", () => {
    const src = "<abc>";
    const raw = tokenize(src, host_compiled);
    const enriched = reclassify([embed_grammars({ nonexistent: sub_language })])(src, raw);
    // Identity: no transformation should have been applied.
    expect(enriched).toBe(raw);
  });

  test("no-op when host has matching type name but no matching tokens", () => {
    // Input with no raw tokens (just text).
    const src = "plain";
    const raw = tokenize(src, host_compiled);
    const enriched = reclassify([embed_grammars({ raw: sub_language })])(src, raw);
    // Tokens array is unchanged.
    expect(Array.from(enriched.tokens)).toEqual(Array.from(raw.tokens));
  });

  test("host tokens outside embedded regions are preserved verbatim", () => {
    const src = "<abc>";
    const raw = tokenize(src, host_compiled);
    const raw_tokens = as_tokens(raw, src);
    const enriched = reclassify([embed_grammars({ raw: sub_language })])(src, raw);
    const enriched_tokens = as_tokens(enriched, src);
    // The first and last tokens (open and close) should be byte-identical
    // to the raw tokens — same type, same positions.
    expect(enriched_tokens[0]).toEqual(raw_tokens[0]);
    expect(enriched_tokens[enriched_tokens.length - 1]).toEqual(raw_tokens[raw_tokens.length - 1]);
  });

  test("sub-language reclassifiers run inside the sub language before splicing", () => {
    // Build a sub language that runs rewrite_types to rename `word` → `renamed`
    // so we can observe that the sub's own pipeline fired on the embedded
    // content.
    const sub_with_rewrite = create_language(sub_compiled, [
      rewrite_types(
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
    ])();
    const src = "<abc>";
    const raw = tokenize(src, host_compiled);
    const enriched = reclassify([embed_grammars({ raw: sub_with_rewrite })])(src, raw);
    const tokens = as_tokens(enriched, src);
    // All inner tokens should now be "renamed", proving the sub's
    // reclassifiers ran.
    const inner = tokens.slice(1, -1);
    expect(inner.every((t) => t.type === "renamed")).toBe(true);
  });

  test("token types shared between host and sub dedup in the merged array", () => {
    // Build a sub grammar that emits `text` — the same name the host uses.
    const colliding_sub: Grammar = {
      name: "sub2",
      states: {
        root: {
          rules: [{ range: [["a", "z"]], token: "text" }, { any: true }],
        },
      },
    };
    const compiled_sub = compile(colliding_sub);
    const lang = create_language(compiled_sub, [])();
    const src = "<abc>";
    const raw = tokenize(src, host_compiled);
    const enriched = reclassify([embed_grammars({ raw: lang })])(src, raw);
    // Only one `text` entry, not two.
    const text_count = enriched.token_types.filter((t) => t === "text").length;
    expect(text_count).toBe(1);
  });
});

describe("reclassifier — capture-based rewrites", () => {
  test("rewrites a single captured token to a new type", () => {
    const rule: RewriteRule = {
      anchor: type("keyword", "const"),
      when: seq(capture("name", type("identifier")), type("operator", "=")),
      rewrite: { name: "function" },
    };
    const src = "const foo = 1";
    const raw = tokenize(src, compiled);
    const result = reclassify([rewrite_types([rule])])(src, raw);
    const tokens = types_only(result, src);
    expect(tokens.find((t) => t.value === "foo")?.type).toBe("function");
    // Anchor itself should NOT be rewritten when rewrite is a capture map.
    expect(tokens.find((t) => t.value === "const")?.type).toBe("keyword");
  });

  test("rewrites multiple captures in one rule", () => {
    const rule: RewriteRule = {
      anchor: type("keyword", "const"),
      when: seq(
        capture("name", type("identifier")),
        type("operator", "="),
        capture("value", type("number")),
      ),
      rewrite: { name: "function", value: "boolean" },
    };
    const src = "const foo = 1";
    const raw = tokenize(src, compiled);
    const result = reclassify([rewrite_types([rule])])(src, raw);
    const tokens = types_only(result, src);
    expect(tokens.find((t) => t.value === "foo")?.type).toBe("function");
    expect(tokens.find((t) => t.value === "1")?.type).toBe("boolean");
  });

  test("missing capture target is silently ignored", () => {
    const rule: RewriteRule = {
      anchor: type("keyword", "const"),
      when: seq(capture("name", type("identifier"))),
      rewrite: { name: "function", missing: "ghost" },
    };
    const src = "const foo";
    const raw = tokenize(src, compiled);
    const result = reclassify([rewrite_types([rule])])(src, raw);
    const tokens = types_only(result, src);
    expect(tokens.find((t) => t.value === "foo")?.type).toBe("function");
  });

  test("capture spanning multiple tokens rewrites every token in the span", () => {
    const rule: RewriteRule = {
      anchor: type("keyword", "let"),
      when: seq(capture("group", seq(type("identifier"), type("operator", "="), type("number")))),
      rewrite: { group: "marked" },
    };
    const src = "let x = 5";
    const raw = tokenize(src, compiled);
    const result = reclassify([rewrite_types([rule])])(src, raw);
    const tokens = types_only(result, src);
    expect(tokens.find((t) => t.value === "x")?.type).toBe("marked");
    expect(tokens.find((t) => t.value === "=")?.type).toBe("marked");
    expect(tokens.find((t) => t.value === "5")?.type).toBe("marked");
  });

  test("capture inside optional only triggers on the taken branch", () => {
    const rule: RewriteRule = {
      anchor: type("keyword", "const"),
      when: seq(
        capture("name", type("identifier")),
        optional(seq(type("operator", "="), capture("value", type("number")))),
      ),
      rewrite: { name: "function", value: "boolean" },
    };
    // Without initializer — only `name` fires.
    const src1 = "const foo";
    const r1 = reclassify([rewrite_types([rule])])(src1, tokenize(src1, compiled));
    const t1 = types_only(r1, src1);
    expect(t1.find((t) => t.value === "foo")?.type).toBe("function");

    // With initializer — both fire.
    const src2 = "const bar = 5";
    const r2 = reclassify([rewrite_types([rule])])(src2, tokenize(src2, compiled));
    const t2 = types_only(r2, src2);
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
    const result = reclassify([rewrite_types([rule])])(src, raw);
    const tokens = types_only(result, src);
    expect(tokens.find((t) => t.value === "a")?.type).toBe("function");
  });
});

describe("reclassifier — embedGrammars with trim and wrap", () => {
  // Build a host grammar that emits a `template` token spanning backticks +
  // content, similar to how JS coalesces template literals.
  const tmpl_grammar: Grammar = {
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
  const tmpl_compiled = compile(tmpl_grammar);
  const tmpl_lang: LanguageFn = create_language(tmpl_compiled, [])();

  test("trim skips leading/trailing chars before sub-tokenizing", () => {
    // `abc` → one coalesced template token spanning positions 0-5.
    // With trim_start=1, trim_end=1, the sub language sees "abc" (3 chars).
    const src = "`abc`";
    const raw = tokenize(src, tmpl_compiled);
    const result = reclassify([
      embed_grammars({
        template: {
          language: sub_language,
          trim_start: 1,
          trim_end: 1,
        },
      }),
    ])(src, raw);
    const tokens = as_tokens(result, src);
    // Sub tokens cover positions 1-4 (`abc`) as `word` tokens.
    const word_tokens = tokens.filter((t) => t.type === "word");
    expect(word_tokens.length).toBeGreaterThan(0);
    for (const w of word_tokens) {
      expect(w.start).toBeGreaterThanOrEqual(1);
      expect(w.end).toBeLessThanOrEqual(4);
    }
  });

  test("wrap_token emits delimiter tokens for the trimmed ranges", () => {
    const src = "`abc`";
    const raw = tokenize(src, tmpl_compiled);
    const result = reclassify([
      embed_grammars({
        template: {
          language: sub_language,
          trim_start: 1,
          trim_end: 1,
          wrap_token: "template",
        },
      }),
    ])(src, raw);
    const tokens = as_tokens(result, src);
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
    const raw = tokenize(src, host_compiled);
    const result = reclassify([embed_grammars({ raw: sub_language })])(src, raw);
    // Same as Phase 2 — bare LanguageFn without trim/wrap.
    const tokens = as_tokens(result, src);
    expect(tokens[0]).toMatchObject({ type: "open", value: "<" });
    expect(tokens[tokens.length - 1]).toMatchObject({
      type: "close",
      value: ">",
    });
  });

  test("trim guarded against oversized values", () => {
    // Token is 5 chars; trim_start=10, trim_end=10 should NOT underflow.
    const src = "`abc`";
    const raw = tokenize(src, tmpl_compiled);
    const result = reclassify([
      embed_grammars({
        template: { language: sub_language, trim_start: 10, trim_end: 10 },
      }),
    ])(src, raw);
    // Should not throw; sub content is empty so no sub tokens produced.
    const tokens = as_tokens(result, src);
    expect(tokens.every((t) => t.type !== "word")).toBe(true);
  });
});

describe("reclassifier — pipeline composition", () => {
  test("adjacent rewrite_types passes see the same base stream (batched)", () => {
    // post-step-2, consecutive claim-producing reclassifiers (including
    // rewrite_types) are batched: both passes see the ORIGINAL input,
    // their claims accumulate, and merge by precedence. the second
    // transform here anchors on "stage1" which does not exist in the
    // base vocabulary, so its rule is skipped at compile time and the
    // second pass contributes no claims. only `first`'s claim applies.
    const first = rewrite_types(
      [
        {
          anchor: "identifier",
          when: type("operator", "="),
          rewrite: "stage1",
        },
      ],
      {},
    );
    const second = rewrite_types(
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
    const tokens = types_only(result, "a = 1");
    expect(tokens.find((t) => t.value === "a")?.type).toBe("stage1");
  });

  test("non-claim reclassifier between two rewrite_types breaks the batch", () => {
    // a plain mutating Reclassifier in the middle forces the first batch
    // to flush before the second claim-producer runs. now the second
    // sees the mutated stream, so chaining works again.
    const first = rewrite_types(
      [
        {
          anchor: "identifier",
          when: type("operator", "="),
          rewrite: "stage1",
        },
      ],
      {},
    );
    // identity mutating pass — forces the batch flush before `second`.
    const noop: (input: string, result: TokenizeResult) => TokenizeResult = (_input, result) =>
      result;
    const second = rewrite_types(
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
    const result = reclassify([first, noop, second])("a = 1", raw);
    const tokens = types_only(result, "a = 1");
    expect(tokens.find((t) => t.value === "a")?.type).toBe("stage2");
  });

  test("batched claims resolve by precedence, not order", () => {
    // two rewrite_types passes targeting the same anchor with DIFFERENT
    // target types. since the claim-producers are batched, both see the
    // base stream and both emit a claim for `a`. precedence decides:
    // `function` (30) beats `property` (20) regardless of which rule
    // appears first in the pipeline.
    const a = rewrite_types([
      {
        anchor: "identifier",
        when: type("operator", "="),
        rewrite: "function",
      },
    ]);
    const b = rewrite_types([
      {
        anchor: "identifier",
        when: type("operator", "="),
        rewrite: "property",
      },
    ]);
    const raw = tokenize("a = 1", compiled);
    const ab = reclassify([a, b])("a = 1", raw);
    const ba = reclassify([b, a])("a = 1", raw);
    expect(types_only(ab, "a = 1").find((t) => t.value === "a")?.type).toBe("function");
    expect(types_only(ba, "a = 1").find((t) => t.value === "a")?.type).toBe("function");
  });

  test("empty pipeline is a no-op", () => {
    const raw = tokenize("a = 1", compiled);
    const result = reclassify([])("a = 1", raw);
    expect(result).toBe(raw);
  });

  test("rewrite_types does not pollute the grammar's shared token_types", () => {
    // tokenize returns a fresh copy of the grammar's token_types, and
    // rewrite_types further clones before mutating, so after a full
    // pipeline run the grammar's original array is unchanged.
    const grammar_types = compiled.token_types;
    const grammar_types_len = grammar_types.length;
    const raw = tokenize("a = 1", compiled);
    reclassify([
      rewrite_types([{ anchor: "identifier", when: type("operator", "="), rewrite: "function" }]),
    ])("a = 1", raw);
    expect(compiled.token_types).toBe(grammar_types);
    expect(compiled.token_types.length).toBe(grammar_types_len);
    expect(compiled.token_types.includes("function")).toBe(false);
  });

  test("first-match-wins within one rewrite_types call", () => {
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
    const tokens = types_only(result, "a = 1");
    expect(tokens.find((t) => t.value === "a")?.type).toBe("firstHit");
  });
});

// ---------------------------------------------------------------------------
// embed_interleaved
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
const interleaved_host: Grammar = {
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
const interleaved_host_compiled = compile(interleaved_host);

// Sub grammar — classifies lowercase as `word` and digits as `digit`.
const interleaved_sub: Grammar = {
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
const interleaved_sub_compiled = compile(interleaved_sub);
const interleaved_sub_lang: LanguageFn = create_language(interleaved_sub_compiled, [])();

// Scanner for our synthetic host: find "TAG[...]" groups.
//
// The scanner TRIGGERS on the `tag` token at position i, but the group
// range it returns starts at i + 1 so the `tag` token itself stays intact
// in the output. Mirrors the JS tagged-template case where the `html`
// identifier is the trigger but isn't part of the retagged group.
const scan_interleaved: GroupScanFn = (tokens, _input, i, token_types) => {
  const tag_id = token_types.indexOf("tag");
  const open_id = token_types.indexOf("open");
  const close_id = token_types.indexOf("close");
  const content_id = token_types.indexOf("content");
  const hole_open_id = token_types.indexOf("holeopen");
  const hole_close_id = token_types.indexOf("holeclose");
  if (tag_id < 0 || open_id < 0) return null;
  const count = tokens.length / 3;
  if (tokens[i * 3] !== tag_id) return null;
  if (i + 1 >= count || tokens[(i + 1) * 3] !== open_id) return null;

  const regions: GroupDescriptor["regions"] = [];
  let k = i + 2;
  // Opening `[` as a synthetic "delimiter" token covering its single char.
  const open_start = tokens[(i + 1) * 3 + 1];
  regions.push({
    kind: "synthetic",
    source_start: open_start,
    source_end: open_start + 1,
    type_name: "delimiter",
  });

  while (k < count) {
    const tk = tokens[k * 3];
    const ts = tokens[k * 3 + 1];
    const te = tokens[k * 3 + 2];

    if (tk === content_id) {
      regions.push({ kind: "content", source_start: ts, source_end: te });
      k++;
    } else if (tk === hole_open_id) {
      // Collect the hole: holeopen + holebody + holeclose.
      const hole_start = ts;
      let end = k + 1;
      while (end < count && tokens[end * 3] !== hole_close_id) end++;
      if (end >= count) return null;
      const hole_end_pos = tokens[end * 3 + 2];
      regions.push({
        kind: "hole",
        source_start: hole_start,
        source_end: hole_end_pos,
        token_start: k,
        token_end: end + 1,
      });
      k = end + 1;
    } else if (tk === close_id) {
      regions.push({
        kind: "synthetic",
        source_start: ts,
        source_end: te,
        type_name: "delimiter",
      });
      // Return range is i+1 → k+1 so the `tag` token stays in the host
      // stream; the group only replaces the [ ... ] content.
      return { token_start: i + 1, token_end: k + 1, regions };
    } else {
      return null;
    }
  }
  return null;
};

function run_interleaved(src: string, language: LanguageFn = interleaved_sub_lang): TokenizeResult {
  const raw = tokenize(src, interleaved_host_compiled);
  return reclassify([embed_interleaved({ scan: scan_interleaved, language })])(src, raw);
}

describe("reclassifier — embed_interleaved", () => {
  test("input with no group is returned unchanged", () => {
    const src = "abc";
    const raw = tokenize(src, interleaved_host_compiled);
    const result = reclassify([
      embed_interleaved({ scan: scan_interleaved, language: interleaved_sub_lang }),
    ])(src, raw);
    // No groups found — no-op short-circuit returns the original reference.
    expect(result).toBe(raw);
  });

  test("single content region, no holes → sub-tokenized content + delimiters", () => {
    const src = "TAG[abc]";
    const result = run_interleaved(src);
    const tokens = as_tokens(result, src);
    expect(tokens[0]).toMatchObject({ type: "tag", value: "TAG" });
    expect(tokens[1]).toMatchObject({ type: "delimiter", value: "[" });
    const inner_words = tokens.slice(2, -1);
    expect(inner_words.map((t) => t.value).join("")).toBe("abc");
    for (const w of inner_words) expect(w.type).toBe("word");
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
    const result = run_interleaved(src);
    const tokens = as_tokens(result, src);
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
    const straddle_sub: Grammar = {
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
    const straddle_lang: LanguageFn = create_language(compile(straddle_sub), [])();
    const src = "TAG[ab<H>cd]";
    const raw = tokenize(src, interleaved_host_compiled);
    const result = reclassify([
      embed_interleaved({ scan: scan_interleaved, language: straddle_lang }),
    ])(src, raw);
    const tokens = as_tokens(result, src);
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
    const result = run_interleaved(src);
    const tokens = as_tokens(result, src);
    const delims = tokens.filter((t) => t.type === "delimiter");
    expect(delims).toHaveLength(4);
    const words = tokens.filter((t) => t.type === "word");
    expect(words.map((w) => w.value).join("")).toBe("abcd");
  });

  test("synthetic regions merge their type into the output token_types", () => {
    const src = "TAG[a]";
    const result = run_interleaved(src);
    expect(result.token_types).toContain("delimiter");
  });

  test("per-group language override on the descriptor", () => {
    const mark_sub: Grammar = {
      name: "mark_sub",
      states: {
        root: { rules: [{ range: [["a", "z"]], token: "mark" }] },
      },
    };
    const mark_lang: LanguageFn = create_language(compile(mark_sub), [])();
    const scan: GroupScanFn = (tokens, input, i, token_types) => {
      const base = scan_interleaved(tokens, input, i, token_types);
      if (base === null) return null;
      return { ...base, language: mark_lang };
    };
    const src = "TAG[ab]";
    const raw = tokenize(src, interleaved_host_compiled);
    const result = reclassify([embed_interleaved({ scan, language: interleaved_sub_lang })])(
      src,
      raw,
    );
    const tokens = as_tokens(result, src);
    // Sub-language was mark_lang, not interleaved_sub_lang — so the "ab"
    // content is `mark` rather than `word`. (Adjacent same-type tokens
    // coalesce to one.)
    expect(tokens.find((t) => t.value === "ab")?.type).toBe("mark");
    // Just to be sure it's not word:
    expect(tokens.some((t) => t.type === "word")).toBe(false);
  });

  test("scanner returning null for all positions leaves input untouched", () => {
    const src = "abcxyz";
    const raw = tokenize(src, interleaved_host_compiled);
    const never_scan: GroupScanFn = () => null;
    const result = reclassify([
      embed_interleaved({ scan: never_scan, language: interleaved_sub_lang }),
    ])(src, raw);
    expect(result).toBe(raw);
  });

  test("purity — raw TokenizeResult is not mutated", () => {
    const src = "TAG[ab]";
    const raw = tokenize(src, interleaved_host_compiled);
    const raw_tokensBefore = Array.from(raw.tokens);
    reclassify([embed_interleaved({ scan: scan_interleaved, language: interleaved_sub_lang })])(
      src,
      raw,
    );
    const raw_tokensAfter = Array.from(raw.tokens);
    expect(raw_tokensAfter).toEqual(raw_tokensBefore);
  });

  test("multiple holes in one group — state flows across all of them", () => {
    // TAG [ a <H> b <I> c ]
    // 012 3 4 567 8 9,10,11 12 13
    // T=0 A=1 G=2 [=3 a=4 <=5 H=6 >=7 b=8 <=9 I=10 >=11 c=12 ]=13
    const src = "TAG[a<H>b<I>c]";
    const result = run_interleaved(src);
    const tokens = as_tokens(result, src);
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

  test("custom hole_char is honored when filling hole regions", () => {
    // Sub grammar that accepts lowercase AND 'x' as `run`. With hole_char
    // "x", the virtual source "abxxxcd" (2 content + 3 hole + 2 content)
    // becomes one coalesced run that must split at the real boundaries.
    const straddle_sub: Grammar = {
      name: "straddle_sub_x",
      states: {
        root: {
          rules: [{ range: [["a", "z"]], token: "run" }, { any: true }],
        },
      },
    };
    const lang: LanguageFn = create_language(compile(straddle_sub), [])();
    const src = "TAG[ab<H>cd]";
    const raw = tokenize(src, interleaved_host_compiled);
    const result = reclassify([
      embed_interleaved({ scan: scan_interleaved, language: lang, hole_char: "x" }),
    ])(src, raw);
    const tokens = as_tokens(result, src);
    const runs = tokens.filter((t) => t.type === "run");
    expect(runs).toHaveLength(2);
    expect(runs[0]).toMatchObject({ value: "ab", start: 4, end: 6 });
    expect(runs[1]).toMatchObject({ value: "cd", start: 9, end: 11 });
  });
});

// -----------------------------------------------------------------------------
// fidelity downgrade — grammar-emitted extensions get remapped to base types
// when fidelity excludes them. mirrors the reclassifier tagging system but
// covers types the grammar state machine emits directly (boolean, function).
// -----------------------------------------------------------------------------

describe("create_language — fidelity downgrade for grammar extensions", () => {
  // toy grammar already emits `boolean` directly for true/false. extend by
  // adding a rule that also produces `function` so we can exercise both.
  const fidelity_grammar: Grammar = {
    name: "fidelity_toy",
    states: {
      root: {
        rules: [
          { match: ["true", "false"], boundary: true, token: "boolean" },
          { match: ["fn"], boundary: true, token: "function" },
          {
            range: [
              ["a", "z"],
              ["A", "Z"],
            ],
            token: "identifier",
          },
          { match: [" ", "\t", "\n"] },
        ],
      },
    },
  };
  const fidelity_compiled = compile(fidelity_grammar);

  function tokens_of(lang: LanguageFn, input: string) {
    const result = lang(input);
    const out: { type: string; value: string }[] = [];
    for (let i = 0; i < result.tokens.length / 3; i++) {
      out.push({
        type: result.token_types[result.tokens[i * 3]],
        value: input.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2]),
      });
    }
    return out;
  }

  const factory = create_language(fidelity_compiled, []);

  test("fidelity undefined keeps grammar-emitted extensions", () => {
    const lang = factory();
    const t = tokens_of(lang, "true fn other");
    expect(t.find((x) => x.value === "true")?.type).toBe("boolean");
    expect(t.find((x) => x.value === "fn")?.type).toBe("function");
    expect(t.find((x) => x.value === "other")?.type).toBe("identifier");
  });

  test("fidelity='high' keeps grammar-emitted extensions", () => {
    const lang = factory({ fidelity: "high" });
    const t = tokens_of(lang, "true fn other");
    expect(t.find((x) => x.value === "true")?.type).toBe("boolean");
    expect(t.find((x) => x.value === "fn")?.type).toBe("function");
  });

  test("fidelity='low' downgrades boolean and function to identifier", () => {
    const lang = factory({ fidelity: "low" });
    const t = tokens_of(lang, "true fn other");
    expect(t.find((x) => x.value === "true")?.type).toBe("identifier");
    expect(t.find((x) => x.value === "fn")?.type).toBe("identifier");
    expect(t.find((x) => x.value === "other")?.type).toBe("identifier");
  });

  test("fidelity allowlist keeps listed extensions, downgrades the rest", () => {
    const only_fn = factory({ fidelity: ["function"] });
    let t = tokens_of(only_fn, "true fn other");
    expect(t.find((x) => x.value === "true")?.type).toBe("identifier");
    expect(t.find((x) => x.value === "fn")?.type).toBe("function");

    const only_bool = factory({ fidelity: ["boolean"] });
    t = tokens_of(only_bool, "true fn other");
    expect(t.find((x) => x.value === "true")?.type).toBe("boolean");
    expect(t.find((x) => x.value === "fn")?.type).toBe("identifier");
  });

  test("fidelity allowlist containing neither downgrades both", () => {
    const lang = factory({ fidelity: ["type"] });
    const t = tokens_of(lang, "true fn other");
    expect(t.find((x) => x.value === "true")?.type).toBe("identifier");
    expect(t.find((x) => x.value === "fn")?.type).toBe("identifier");
  });
});
