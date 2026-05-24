import { describe, expect, test } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import { compound_compose } from "./compound_compose";
import { reclassify } from "./reclassifier";
import type { Grammar } from "./types";

// markdown-ish toy grammar with explicit open/close style markers.
const toy: Grammar = {
  name: "toy",
  states: {
    root: {
      rules: [
        { match: "**", token: "bold_open", state: "bold" },
        {
          range: [
            ["a", "z"],
            ["A", "Z"],
          ],
          token: "text",
        },
        { match: ["\n", " "], token: "whitespace" },
      ],
    },
    bold: {
      rules: [
        { match: "**", token: "bold_close", exit: true },
        { match: "*", token: "italic_open", state: "italic" },
        {
          range: [
            ["a", "z"],
            ["A", "Z"],
          ],
          token: "text",
        },
        { match: [" "], token: "whitespace" },
      ],
    },
    italic: {
      rules: [
        { match: "*", token: "italic_close", exit: true },
        {
          range: [
            ["a", "z"],
            ["A", "Z"],
          ],
          token: "text",
        },
        { match: [" "], token: "whitespace" },
      ],
    },
  },
};
const c = compile(toy);

const composer = compound_compose({
  auto_pop_on_newline: true,
  join_separator: " ",
  dedup_against_base: true,
  styles: [
    { open_type: "bold_open", close_type: "bold_close", style_name: "bold" },
    { open_type: "italic_open", close_type: "italic_close", style_name: "italic" },
  ],
});

function run(input: string) {
  const raw = tokenize(input, c);
  const out = reclassify([composer])(input, raw);
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

describe("compound_compose — single style", () => {
  test("bold text gets `bold` class composed", () => {
    const t = run("**hi**");
    expect(find(t, "hi")).toBe("bold text");
  });
});

describe("compound_compose — nested styles", () => {
  test("`**bold *italic***` composes nested classes", () => {
    const t = run("**a*b*c**");
    // a is inside bold only
    expect(find(t, "a")).toBe("bold text");
    // b is inside bold + italic
    expect(find(t, "b")).toBe("bold italic text");
    // c is back to bold only (italic closed)
    expect(find(t, "c")).toBe("bold text");
  });
});

describe("compound_compose — auto_pop_on_newline", () => {
  test("newline between tokens flushes style stack", () => {
    const t = run("**a\nb**");
    expect(find(t, "a")).toBe("bold text");
    // after newline, stack flushed -> b is plain text (closing ** matches nothing)
    expect(find(t, "b")).toBe("text");
  });
});

describe("compound_compose — dedup_against_base", () => {
  test("when base type matches an active style, it does not repeat", () => {
    // build a grammar emitting `bold` as a base type even inside bold.
    const toy2: Grammar = {
      name: "g",
      states: {
        root: {
          rules: [
            { match: "**", token: "bold_open", state: "b" },
            { range: [["a", "z"]], token: "text" },
          ],
        },
        b: {
          rules: [
            { match: "**", token: "bold_close", exit: true },
            { match: "X", token: "bold" },
            { range: [["a", "z"]], token: "text" },
          ],
        },
      },
    };
    const cc = compile(toy2);
    const composer2 = compound_compose({
      auto_pop_on_newline: false,
      join_separator: " ",
      dedup_against_base: true,
      styles: [{ open_type: "bold_open", close_type: "bold_close", style_name: "bold" }],
    });
    const raw = tokenize("**aXb**", cc);
    const out = reclassify([composer2])("**aXb**", raw);
    const types = [];
    for (let i = 0; i < out.tokens.length / 3; i++) {
      types.push({
        t: out.token_types[out.tokens[i * 3]],
        v: "**aXb**".slice(out.tokens[i * 3 + 1], out.tokens[i * 3 + 2]),
      });
    }
    expect(types.find((x) => x.v === "X")?.t).toBe("bold");
    expect(types.find((x) => x.v === "a")?.t).toBe("bold text");
  });
});
