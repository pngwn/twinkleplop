import { describe, expect, test } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import { merge_adjacent } from "./merge_adjacent";
import { reclassify } from "./reclassifier";
import type { Grammar } from "./types";

// toy grammar covering the Rust lifetime-merge shape: a `lifetime` token
// for `'a`-like things, identifiers, and punctuation.
const toy: Grammar = {
  name: "toy",
  states: {
    root: {
      rules: [
        { match: "'a", token: "lifetime" },
        { match: "'b", token: "lifetime" },
        {
          range: [
            ["a", "z"],
            ["A", "Z"],
          ],
          token: "identifier",
        },
        { match: ["(", ")", ","], token: "punctuation" },
        // whitespace produces no token (matches the real Rust grammar).
        { match: [" "] },
      ],
    },
  },
};
const c = compile(toy);

function run(input: string, lifecycle: ReturnType<typeof merge_adjacent>) {
  const raw = tokenize(input, c);
  const out = reclassify([lifecycle])(input, raw);
  const tokens: { type: string; value: string }[] = [];
  for (let i = 0; i < out.tokens.length / 3; i++) {
    tokens.push({
      type: out.token_types[out.tokens[i * 3]],
      value: input.slice(out.tokens[i * 3 + 1], out.tokens[i * 3 + 2]),
    });
  }
  return tokens;
}

describe("merge_adjacent — Rust lifetime fusion", () => {
  const fuse = merge_adjacent({
    anchor_type: "lifetime",
    consume_next_types: ["identifier"],
  });

  test("lifetime + identifier merges into one lifetime token", () => {
    const t = run("'a str", fuse);
    expect(t).toHaveLength(1);
    expect(t[0]).toEqual({ type: "lifetime", value: "'a str" });
  });

  test("lifetime without following identifier is left alone", () => {
    const t = run("'a", fuse);
    expect(t).toHaveLength(1);
    expect(t[0]).toEqual({ type: "lifetime", value: "'a" });
  });

  test("identifier without preceding lifetime is left alone", () => {
    const t = run("foo", fuse);
    expect(t).toHaveLength(1);
    expect(t[0].type).toBe("identifier");
  });
});

describe("merge_adjacent — refuse_if guard", () => {
  const fuse = merge_adjacent({
    anchor_type: "lifetime",
    consume_next_types: ["identifier"],
    refuse_if: { offset: 2, type_must_be: "punctuation", first_char_in: "(" },
  });

  test("refuses to absorb when followed by `(`", () => {
    const t = run("'a Fn(", fuse);
    // `'a` and `Fn` stay separate; `Fn(` stays as identifier + punctuation.
    expect(t[0].type).toBe("lifetime");
    expect(t[0].value).toBe("'a");
    // intervening space might appear depending on tokenizer; just check
    // that the merge did NOT happen by confirming no single token equals "'a Fn"
    const merged = t.find((tok) => tok.value === "'a Fn");
    expect(merged).toBeUndefined();
  });

  test("still merges when next-next-token is not `(`", () => {
    const t = run("'a Vec,", fuse);
    const merged = t.find((tok) => tok.type === "lifetime" && tok.value === "'a Vec");
    expect(merged).toBeDefined();
  });
});

describe("merge_adjacent — multiple consumable types", () => {
  test("any type in consume_next_types triggers merge", () => {
    const grammar: Grammar = {
      name: "g",
      states: {
        root: {
          rules: [
            { match: "'a", token: "lifetime" },
            { match: "Vec", token: "class_name" },
            { match: ["str", "foo"], token: "identifier" },
            { match: [" "] },
          ],
        },
      },
    };
    const cc = compile(grammar);
    const fuse = merge_adjacent({
      anchor_type: "lifetime",
      consume_next_types: ["identifier", "class_name"],
    });
    const raw = tokenize("'a Vec", cc);
    const out = reclassify([fuse])("'a Vec", raw);
    expect(out.tokens.length / 3).toBe(1);
    expect(out.token_types[out.tokens[0]]).toBe("lifetime");
  });
});
