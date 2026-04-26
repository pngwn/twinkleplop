// regression tests for the four issues raised by the user about the
// JavaScript grammar's reclassifier output. each test pins the new
// behavior described in the user's report so future changes can't
// silently revert it.

import { describe, it, expect } from "vitest";
import { tokenize as make_language } from "./index.js";

const language = make_language();

function tokens_of(input) {
  const r = language(input);
  const out = [];
  for (let i = 0; i < r.tokens.length / 3; i++) {
    out.push({
      type: r.token_types[r.tokens[i * 3]],
      value: input.slice(r.tokens[i * 3 + 1], r.tokens[i * 3 + 2]),
    });
  }
  return out;
}
const pick = (tokens, value) => tokens.find((t) => t.value === value)?.type;

describe("user-reported issues — JavaScript grammar", () => {
  it("issue 1: `const` bindings tokenize as constants", () => {
    expect(pick(tokens_of("const x = 5;"), "x")).toBe("constant");
    expect(pick(tokens_of("const greeting = 'hi';"), "greeting")).toBe("constant");
  });

  it("issue 2: `:` after a property is punctuation, not operator", () => {
    const tokens = tokens_of("const o = { foo: 1 };");
    expect(tokens.find((t) => t.value === ":")?.type).toBe("punctuation");
  });

  it("issue 3a: function declaration params are tagged", () => {
    const t = tokens_of("function add(a, b) { return a + b; }");
    expect(pick(t, "a")).toBe("parameter");
    expect(pick(t, "b")).toBe("parameter");
  });

  it("issue 3b: function expression params are tagged", () => {
    const t = tokens_of("const f = function(a, b) { return a + b; };");
    expect(pick(t, "a")).toBe("parameter");
    expect(pick(t, "b")).toBe("parameter");
  });

  it("issue 3c: arrow function expression params are tagged", () => {
    const t = tokens_of("const f = (a, b) => a + b;");
    expect(pick(t, "a")).toBe("parameter");
    expect(pick(t, "b")).toBe("parameter");
  });

  it("issue 3d: inline arrow function params are tagged", () => {
    const t = tokens_of("arr.map((x, i) => x + i);");
    expect(pick(t, "x")).toBe("parameter");
    expect(pick(t, "i")).toBe("parameter");
  });

  it("issue 3e: class method params are tagged", () => {
    const t = tokens_of("class C { m(a, b) { return a + b; } }");
    expect(pick(t, "a")).toBe("parameter");
    expect(pick(t, "b")).toBe("parameter");
  });

  it("issue 3f: object method shorthand params are tagged", () => {
    const t = tokens_of("const o = { m(a, b) { return a + b; } };");
    expect(pick(t, "a")).toBe("parameter");
    expect(pick(t, "b")).toBe("parameter");
  });

  it("issue 4: `export * as ns from ...` tags ns as namespace", () => {
    expect(pick(tokens_of('export * as utils from "./utils";'), "utils")).toBe("namespace");
  });
});
