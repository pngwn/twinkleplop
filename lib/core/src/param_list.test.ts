import { describe, expect, test } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import { param_list } from "./param_list";
import { reclassify } from "./reclassifier";
import type { Grammar, TokenizeResult } from "./types";

// minimal JS-ish toy grammar. captures `function`, `class`, `interface`,
// member-leading modifiers, and the operator / punctuation tokens the
// primitive consults. mirrors the toy used in frame_track.test.ts but with
// a slightly richer keyword set.
const toy: Grammar = {
  name: "toy",
  states: {
    root: {
      rules: [
        {
          match: [
            "function",
            "class",
            "interface",
            "async",
            "static",
            "get",
            "set",
            "const",
            "let",
            "return",
          ],
          boundary: true,
          token: "keyword",
        },
        {
          range: [
            ["a", "z"],
            ["A", "Z"],
          ],
          token: "identifier",
        },
        { range: [["0", "9"]], token: "number" },
        { match: ["=>", "...", "<", ">", "*"], token: "operator" },
        { match: ["=", "+", "-"], token: "operator" },
        {
          // `:` is punctuation in the JS grammar (separator, not operator).
          match: ["(", ")", "{", "}", "[", "]", ",", ";", ":"],
          token: "punctuation",
        },
        { match: [" ", "\t", "\n"] },
      ],
    },
  },
};
const compiled = compile(toy);

const js_param_list = param_list({
  result_type: "parameter",
  default_introducer: "=",
  transparent_operators: ["..."],
  detectors: [
    {
      kind: "after_keyword",
      keyword: "function",
      skip_generator_star: true,
      skip_optional_name: true,
      skip_optional_generics: true,
    },
    {
      kind: "member_method",
      in_brace_kinds: ["class", "object", "interface"],
      method_leading_keywords: ["get", "set", "async", "static"],
    },
    {
      kind: "arrow_paren",
      skip_ts_return_type: true,
      skip_in_type_position: true,
    },
    { kind: "single_ident_arrow" },
  ],
});

function run(input: string): { type: string; value: string }[] {
  const raw = tokenize(input, compiled);
  const out = reclassify([js_param_list])(input, raw);
  return tokens_for(out, input);
}

function tokens_for(result: TokenizeResult, input: string) {
  const out: { type: string; value: string }[] = [];
  for (let i = 0; i < result.tokens.length / 3; i++) {
    out.push({
      type: result.token_types[result.tokens[i * 3]],
      value: input.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2]),
    });
  }
  return out;
}

const find = (tokens: { type: string; value: string }[], v: string) =>
  tokens.find((t) => t.value === v)?.type;

describe("param_list — after_keyword detector", () => {
  test("function declaration params tagged", () => {
    const t = run("function foo(a, b, c) { return a }");
    expect(find(t, "a")).toBe("parameter");
    expect(find(t, "b")).toBe("parameter");
    expect(find(t, "c")).toBe("parameter");
  });

  test("anonymous function expression params tagged", () => {
    const t = run("const fn = function(x, y) { return x }");
    expect(find(t, "x")).toBe("parameter");
    expect(find(t, "y")).toBe("parameter");
  });

  test("generator function `function* gen(a)`", () => {
    const t = run("function* gen(a, b) { return a }");
    expect(find(t, "a")).toBe("parameter");
    expect(find(t, "b")).toBe("parameter");
  });

  test("function with generic args `function f<T>(a)`", () => {
    const t = run("function f<T>(a, b) { return a }");
    expect(find(t, "a")).toBe("parameter");
    expect(find(t, "b")).toBe("parameter");
  });
});

describe("param_list — arrow_paren detector", () => {
  test("arrow function with parens", () => {
    const t = run("const fn = (a, b) => a + b");
    expect(find(t, "a")).toBe("parameter");
    expect(find(t, "b")).toBe("parameter");
  });

  test("arrow with TS return type annotation when `)` and `:` are separate tokens", () => {
    // when `)` and `:` are emitted as separate punctuation tokens, the
    // skip_ts_return_type path kicks in and the params still tag. the
    // coalesced `):` case is a pre-existing limitation of the JS toy
    // tokenizer (and the real JS grammar too) -- skip that case here.
    const t = run("const fn = (a, b) : number => a + b");
    expect(find(t, "a")).toBe("parameter");
    expect(find(t, "b")).toBe("parameter");
  });

  test("arrow with no params `() => ...`", () => {
    const t = run("const fn = () => 1");
    // no parameter tokens expected; just confirm no crash.
    const t2 = tokens_for(reclassify([js_param_list])("a", tokenize("a", compiled)), "a");
    expect(t2[0].type).toBe("identifier");
  });
});

describe("param_list — single_ident_arrow detector", () => {
  test("`x => ...` tags x as parameter", () => {
    const t = run("const fn = x => x + 1");
    expect(find(t, "x")).toBe("parameter");
  });
});

describe("param_list — member_method detector", () => {
  test("class method `class C { method(a, b) {} }`", () => {
    const t = run("class C { method(a, b) { return a } }");
    expect(find(t, "a")).toBe("parameter");
    expect(find(t, "b")).toBe("parameter");
  });

  test("class getter / setter `set p(v) {}`", () => {
    const t = run("class C { set p(v) { } }");
    expect(find(t, "v")).toBe("parameter");
  });

  test("class with async method `async run(x) {}`", () => {
    const t = run("class C { async run(x, y) { return x } }");
    expect(find(t, "x")).toBe("parameter");
    expect(find(t, "y")).toBe("parameter");
  });

  test("class with static method `static foo(x)`", () => {
    const t = run("class C { static foo(x, y) { return x } }");
    expect(find(t, "x")).toBe("parameter");
    expect(find(t, "y")).toBe("parameter");
  });

  test("object literal method shorthand `{ run(x, y) {} }`", () => {
    const t = run("const o = { run(x, y) { return x } }");
    expect(find(t, "x")).toBe("parameter");
    expect(find(t, "y")).toBe("parameter");
  });

  test("interface method `interface I { method(a, b) }`", () => {
    const t = run("interface I { method(a, b) }");
    expect(find(t, "a")).toBe("parameter");
    expect(find(t, "b")).toBe("parameter");
  });
});

describe("param_list — walk behaviour", () => {
  test("rest parameter `...rest` is transparent", () => {
    const t = run("function f(a, ...rest) { return a }");
    expect(find(t, "a")).toBe("parameter");
    expect(find(t, "rest")).toBe("parameter");
  });

  test("default value `a = 1, b` does not tag the default", () => {
    const t = run("function f(a = 1, b) { return a }");
    expect(find(t, "a")).toBe("parameter");
    expect(find(t, "b")).toBe("parameter");
  });
});

describe("param_list — false-positive guards", () => {
  test("function call `foo(x, y)` does NOT tag args as parameter", () => {
    const t = run("foo(x, y)");
    expect(find(t, "x")).toBe("identifier");
    expect(find(t, "y")).toBe("identifier");
  });

  test("block braces don't trigger member_method", () => {
    const t = run("function f() { x }");
    // x inside a block (not class/object/interface body) is plain identifier.
    expect(find(t, "x")).toBe("identifier");
  });

  test("object literal value position doesn't trigger member_method", () => {
    const t = run("const o = { key: x }");
    expect(find(t, "x")).toBe("identifier");
  });
});
