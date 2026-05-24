import { describe, expect, test } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import { state_machine } from "./state_machine";
import { reclassify } from "./reclassifier";
import type { Grammar } from "./types";

// minimal TS-ish toy grammar — `as` keyword + identifiers + punctuation.
const toy: Grammar = {
  name: "toy",
  states: {
    root: {
      rules: [
        { match: ["as", "in", "if", "let", "const"], boundary: true, token: "keyword" },
        {
          range: [
            ["a", "z"],
            ["A", "Z"],
          ],
          token: "identifier",
        },
        { match: ["(", ")", "{", "}", ",", ";"], token: "punctuation" },
        { match: ["=", "+", "-"], token: "operator" },
        { match: [" "] },
      ],
    },
  },
};
const c = compile(toy);

// configure a state_machine that tags identifiers in "type position" after
// `as` -- a simplified single-mode TS type position promoter.
const ts_as_promoter = state_machine({
  mode: "type_position",
  enter_on: [{ type: "keyword", texts: ["as"] }],
  exit_on: [
    { type: "punctuation", texts: [";", ",", ")", "}"] },
    { type: "operator", texts: ["="] },
  ],
  claim_token_types: ["identifier"],
  claim_type: "type",
  precedence: 45,
});

function run(input: string) {
  const raw = tokenize(input, c);
  const out = reclassify([ts_as_promoter])(input, raw);
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

describe("state_machine — TS `as` type cast", () => {
  test("identifier after `as` is claimed as type", () => {
    const t = run("let x = y as Foo;");
    expect(find(t, "Foo")).toBe("type");
    expect(find(t, "y")).toBe("identifier");
    expect(find(t, "x")).toBe("identifier");
  });

  test("exit on `;` terminates the mode", () => {
    const t = run("let x = y as Foo; let z = Bar");
    expect(find(t, "Foo")).toBe("type");
    // Bar is OUTSIDE the type position (after `;` exited the mode).
    expect(find(t, "Bar")).toBe("identifier");
  });

  test("exit on `=` terminates the mode", () => {
    const t = run("y as Foo = x");
    expect(find(t, "Foo")).toBe("type");
    expect(find(t, "x")).toBe("identifier");
  });

  test("no `as` keyword means no mode and no claims", () => {
    const t = run("let x = y;");
    expect(find(t, "x")).toBe("identifier");
    expect(find(t, "y")).toBe("identifier");
  });
});
