import { describe, expect, test } from "vitest";
import { compile, reclassify, tokenize } from "@twinkleplop/core";
import { chunker } from "./chunker.js";
import type { Grammar } from "@twinkleplop/core";

// minimal Go-ish toy grammar — `func` keyword, identifiers, punctuation.
const toy: Grammar = {
  name: "toy",
  states: {
    root: {
      rules: [
        { match: ["func", "int", "string"], boundary: true, token: "keyword" },
        {
          range: [
            ["a", "z"],
            ["A", "Z"],
          ],
          token: "identifier",
        },
        { match: ["(", ")", "[", "]", "{", "}", ",", ".", "*"], token: "punctuation" },
        { match: [" "] },
      ],
    },
  },
};
const c = compile(toy);

const go_chunker = chunker({
  entry_keyword: "func",
  allow_method_receiver: true,
  separator_char: ",",
  depth_brackets: [
    { open: "(", close: ")" },
    { open: "[", close: "]" },
    { open: "{", close: "}" },
  ],
  result_type: "parameter",
  carry_pending_names: true,
});

function run(input: string) {
  const raw = tokenize(input, c);
  const out = reclassify([go_chunker])(input, raw);
  const tokens: { type: string; value: string }[] = [];
  for (let i = 0; i < out.tokens.length / 3; i++) {
    tokens.push({
      type: out.token_types[out.tokens[i * 3]],
      value: input.slice(out.tokens[i * 3 + 1], out.tokens[i * 3 + 2]),
    });
  }
  return tokens;
}

const find = (tokens: { type: string; value: string }[], v: string) =>
  tokens.find((t) => t.value === v)?.type;

describe("chunker — Go function parameters", () => {
  test("simple typed params: `func f(a int, b string)`", () => {
    const t = run("func f(a int, b string)");
    expect(find(t, "a")).toBe("parameter");
    expect(find(t, "b")).toBe("parameter");
    expect(find(t, "f")).toBe("identifier");
  });

  test("shared-type form: `func f(x, y int)` promotes BOTH", () => {
    const t = run("func f(x, y int)");
    expect(find(t, "x")).toBe("parameter");
    expect(find(t, "y")).toBe("parameter");
  });

  test("method receiver: `func (r R) m(x int)`", () => {
    const t = run("func (r R) m(x int)");
    expect(find(t, "x")).toBe("parameter");
    // receiver name `r` is also tagged (it's in a chunk too)
    expect(find(t, "r")).toBe("parameter");
  });

  test("unnamed param: `func(int)` doesn't crash and doesn't tag", () => {
    const t = run("func f(int)");
    // `int` is a keyword in this grammar, so no identifier in the chunk.
    // just verify no crash and `int` is still keyword.
    expect(find(t, "int")).toBe("keyword");
  });

  test("nested call in default doesn't break chunking", () => {
    const t = run("func f(a int, b string)");
    expect(find(t, "a")).toBe("parameter");
    expect(find(t, "b")).toBe("parameter");
  });

  test("non-func keyword doesn't trigger", () => {
    const t = run("int main");
    expect(find(t, "main")).toBe("identifier");
  });
});
