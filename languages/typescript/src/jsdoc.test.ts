// JSDoc embedding reaches the TypeScript pipeline too — the scanner and
// grammar are shared with JavaScript, this pins the wiring.

import { describe, expect, it } from "vitest";
import { tokenize as make_language } from "./index.js";

function tokens_of(input: string) {
  const result = make_language()(input);
  const out: { type: string; value: string }[] = [];
  for (let i = 0; i < result.tokens.length / 3; i++) {
    out.push({
      type: result.token_types[result.tokens[i * 3]],
      value: input.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2]),
    });
  }
  return out;
}

const pick = (input: string, value: string) =>
  tokens_of(input).find((t) => t.value === value)?.type;

describe("jsdoc in TypeScript", () => {
  it("highlights a tag and its type expression", () => {
    const src = "/** @param {Config} base */\nfunction f(base: Config) {}";
    expect(pick(src, "@param")).toBe("keyword");
    expect(pick(src, "Config")).toBe("type");
    expect(pick(src, "base")).toBe("parameter");
  });

  it("leaves a plain block comment alone", () => {
    const tokens = tokens_of("/* @param {Config} base */");
    expect(tokens.every((t) => t.type === "comment")).toBe(true);
  });

  it("does not disturb the annotation types on the code below", () => {
    const src = "/** @returns {number} */\nfunction f(): number { return 1; }";
    const types = tokens_of(src).filter((t) => t.type === "type");
    expect(types.map((t) => t.value)).toEqual(["number", "number"]);
  });
});
