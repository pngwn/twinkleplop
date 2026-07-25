import { describe, expect, test } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import { matched_bracket } from "./matched_bracket";
import { reclassify } from "./reclassifier";
import type { Grammar } from "./types";

// toy grammar where `{` and `}` are emitted as `expression`, while the
// sigil chars `#` `:` `/` `@` are `punctuation`. mirrors the Svelte case
// where block braces need to be re-tagged.
const toy: Grammar = {
  name: "toy",
  states: {
    root: {
      rules: [
        { match: ["{", "}"], token: "expression" },
        { match: ["#", ":", "/", "@"], token: "punctuation" },
        {
          range: [
            ["a", "z"],
            ["A", "Z"],
          ],
          token: "identifier",
        },
        { match: [" "] },
      ],
    },
  },
};
const c = compile(toy);

function run(input: string, m: ReturnType<typeof matched_bracket>) {
  const raw = tokenize(input, c);
  const out = reclassify([m])(input, raw);
  const tokens: { type: string; value: string }[] = [];
  for (let i = 0; i < out.tokens.length / 3; i++) {
    tokens.push({
      type: out.token_types[out.tokens[i * 3]],
      value: input.slice(out.tokens[i * 3 + 1], out.tokens[i * 3 + 2]),
    });
  }
  return tokens;
}

describe("matched_bracket — Svelte block-brace retag", () => {
  const retag = matched_bracket({
    open_type: "expression",
    open_text: "{",
    close_type: "expression",
    close_text: "}",
    post_open_required: { type: "punctuation", text_in: ["#", ":", "/", "@"] },
    retag_open_to: "punctuation",
    retag_close_to: "punctuation",
  });

  test("block brace `{#if ...}` retags both endpoints", () => {
    // tokens: { # if foo } body { / if }
    //         0 1 2  3   4 5    6 7 8  9
    const t = run("{#if foo} body {/if}", retag);
    expect(t[0]).toEqual({ type: "punctuation", value: "{" });
    expect(t[4]).toEqual({ type: "punctuation", value: "}" });
    expect(t[6]).toEqual({ type: "punctuation", value: "{" });
    expect(t[9]).toEqual({ type: "punctuation", value: "}" });
  });

  test("plain interpolation brace `{ foo }` (no sigil) is left alone", () => {
    const t = run("{ foo }", retag);
    expect(t[0]).toEqual({ type: "expression", value: "{" });
    expect(t[2]).toEqual({ type: "expression", value: "}" });
  });

  test("nested block braces pair correctly", () => {
    // outer block opens; inner non-block brace stays expression.
    const t = run("{#each items} { foo } {/each}", retag);
    // outer opener + sigil
    expect(t[0]).toEqual({ type: "punctuation", value: "{" });
    // first inner `}` after items: the OUTER opener's matching closer is
    // the FIRST `}` it sees (greedy first-match). this matches the
    // pre-migration behaviour -- block bodies don't nest brace pairs.
    expect(t.find((tok) => tok.value === "}")?.type).toBe("punctuation");
  });

  test("at-directive `{@html ...}` retags", () => {
    const t = run("{@html stuff}", retag);
    expect(t[0]).toEqual({ type: "punctuation", value: "{" });
    expect(t[t.length - 1]).toEqual({ type: "punctuation", value: "}" });
  });
});
