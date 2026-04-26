// Integration tests for the CSS language pipeline.
//
// These tests use the top-level `language(input)` entry point — the full
// tokenize + reclassify experience. They cover the function-call promotion
// rule (identifier followed by `(` becomes `function`) and a set of
// negatives that must NOT be rewritten.

import { describe, it, expect } from "vitest";
import { tokenize as make_language } from "./index.js";

const language = make_language();

function enrich(input: string) {
  const result = language(input);
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

function type_of(tokens: { type: string; value: string }[], value: string): string | undefined {
  return tokens.find((t) => t.value === value)?.type;
}

describe("CSS reclassifier — function-call promotion (positive cases)", () => {
  it("rgb(255, 0, 128)", () => {
    const tokens = enrich("a { color: rgb(255, 0, 128); }");
    expect(type_of(tokens, "rgb")).toBe("function");
  });

  it("calc(100% - 20px)", () => {
    const tokens = enrich("a { width: calc(100% - 20px); }");
    expect(type_of(tokens, "calc")).toBe("function");
  });

  it("var(--theme-color, blue)", () => {
    const tokens = enrich("a { color: var(--theme-color, blue); }");
    expect(type_of(tokens, "var")).toBe("function");
    // the fallback value stays an identifier
    expect(type_of(tokens, "blue")).toBe("identifier");
  });

  it("url('image.jpg')", () => {
    const tokens = enrich("a { background: url('image.jpg'); }");
    expect(type_of(tokens, "url")).toBe("function");
  });

  it("linear-gradient(...) with nested rgb(...)", () => {
    const tokens = enrich("a { background-image: linear-gradient(to right, rgb(255,0,0), blue); }");
    expect(type_of(tokens, "linear-gradient")).toBe("function");
    expect(type_of(tokens, "rgb")).toBe("function");
    // `to`, `right`, `blue` remain identifiers
    expect(type_of(tokens, "to")).toBe("identifier");
    expect(type_of(tokens, "right")).toBe("identifier");
    expect(type_of(tokens, "blue")).toBe("identifier");
  });

  it("cubic-bezier(0.4, 0, 0.6, 1)", () => {
    const tokens = enrich("a { transition: cubic-bezier(0.4, 0, 0.6, 1); }");
    expect(type_of(tokens, "cubic-bezier")).toBe("function");
  });

  it("nested calc(var(--foo) - 10px)", () => {
    const tokens = enrich("a { width: calc(var(--foo) - 10px); }");
    expect(type_of(tokens, "calc")).toBe("function");
    expect(type_of(tokens, "var")).toBe("function");
  });
});

describe("CSS reclassifier — negatives (must stay as original type)", () => {
  it("bare value words stay identifier", () => {
    const tokens = enrich("a { color: red; display: block; margin: auto; }");
    expect(type_of(tokens, "red")).toBe("identifier");
    expect(type_of(tokens, "block")).toBe("identifier");
    expect(type_of(tokens, "auto")).toBe("identifier");
  });

  it("at-rule names stay keyword", () => {
    const tokens = enrich("@media screen { a { color: red; } }");
    expect(type_of(tokens, "@media")).toBe("keyword");
    expect(type_of(tokens, "screen")).toBe("keyword");
  });

  it("`!important` stays keyword", () => {
    const tokens = enrich("a { color: red !important; }");
    // `!` pushes into the `important` state and the body is a multi-char
    // match, so they remain two atomic keyword lexemes after sealing
    expect(type_of(tokens, "!")).toBe("keyword");
    expect(type_of(tokens, "important")).toBe("keyword");
  });

  it("pseudo-class with parens does not promote selector_pseudo", () => {
    const tokens = enrich("li:nth-child(2n+1) { color: red; }");
    expect(type_of(tokens, ":nth-child")).toBe("selector_pseudo");
  });

  it("properties stay property, not promoted by trailing colon", () => {
    const tokens = enrich("a { color: red; }");
    expect(type_of(tokens, "color")).toBe("property");
  });
});
