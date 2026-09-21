// JSDoc comment embedding.
//
// A `/** … */` comment is handed to the jsdoc grammar the same way a
// tagged template is handed to HTML or CSS. Prose stays `comment`; only
// tags, type expressions and the names they introduce are lifted out.

import { describe, expect, it } from "vitest";
import { tokenize as make_language } from "./index.js";

function tokens_of(input: string, options?: Parameters<typeof make_language>[0]) {
  const result = make_language(options)(input);
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

const types_in = (input: string) =>
  tokens_of(input)
    .filter((t) => t.type === "type")
    .map((t) => t.value);

// every token must be contiguous with its neighbours — a splice that drops
// or overlaps a byte shows up here rather than as a rendering oddity.
function assert_contiguous(input: string) {
  const result = make_language()(input);
  let prev = 0;
  for (let i = 0; i < result.tokens.length / 3; i++) {
    const start = result.tokens[i * 3 + 1];
    const end = result.tokens[i * 3 + 2];
    expect(start).toBeGreaterThanOrEqual(prev);
    expect(end).toBeGreaterThan(start);
    prev = end;
  }
}

describe("jsdoc tags", () => {
  it("tags a doc comment's tag as a keyword", () => {
    expect(pick("/** @returns nothing */", "@returns")).toBe("keyword");
  });

  it("leaves the prose as comment", () => {
    const tokens = tokens_of("/**\n * Adds things.\n */");
    expect(tokens.every((t) => t.type === "comment")).toBe(true);
  });

  it("an `@` inside prose is not a tag", () => {
    const tokens = tokens_of("/** mail me at a@b.com */");
    expect(tokens.every((t) => t.type === "comment")).toBe(true);
  });

  it("a plain block comment is untouched", () => {
    const tokens = tokens_of("/* @param {string} x */");
    expect(tokens.every((t) => t.type === "comment")).toBe(true);
  });

  it("a line comment is untouched", () => {
    const tokens = tokens_of("// @param {string} x");
    expect(tokens.every((t) => t.type === "comment")).toBe(true);
  });
});

describe("jsdoc type expressions", () => {
  it("names inside `{…}` are types", () => {
    expect(types_in("/** @param {string} x */")).toEqual(["string"]);
  });

  it("generic arguments are types", () => {
    expect(types_in("/** @returns {Promise<Config>} */")).toEqual(["Promise", "Config"]);
  });

  it("nested object types close on the right brace", () => {
    expect(types_in("/** @type {{ a: number, b: string }} */")).toEqual([
      "a",
      "number",
      "b",
      "string",
    ]);
  });

  it("the braces are punctuation", () => {
    const tokens = tokens_of("/** @type {string} */");
    expect(tokens.find((t) => t.value === "{")?.type).toBe("punctuation");
  });

  it("a brace in prose is not a type expression", () => {
    const tokens = tokens_of("/** @example const x = { a: 1 }; */");
    expect(tokens.some((t) => t.type === "type")).toBe(false);
  });
});

describe("jsdoc names", () => {
  it("`@param {T} name` tags the name as a parameter", () => {
    expect(pick("/** @param {Config} base */", "base")).toBe("parameter");
  });

  it("`@param name` without a type still tags the name", () => {
    expect(pick("/** @param base the config */", "base")).toBe("parameter");
  });

  it("an optional name in brackets is still tagged", () => {
    expect(pick("/** @param {T} [opts] maybe */", "opts")).toBe("parameter");
  });

  it("the description after the name stays prose", () => {
    const tokens = tokens_of("/** @param {T} base - the config */");
    expect(tokens.find((t) => t.value.includes("the config"))?.type).toBe("comment");
  });

  it("`@typedef` names a type, not a parameter", () => {
    expect(pick("/** @typedef {object} Point */", "Point")).toBe("type");
  });

  it("`@template` names a type", () => {
    expect(pick("/** @template T */", "T")).toBe("type");
  });

  it("`@returns {T} desc` does not tag the description as a name", () => {
    const tokens = tokens_of("/** @returns {T} nothing */");
    expect(tokens.some((t) => t.type === "parameter")).toBe(false);
  });
});

describe("jsdoc delimiters", () => {
  it("an empty block comment is not a doc comment", () => {
    const tokens = tokens_of("/**/");
    expect(tokens.every((t) => t.type === "comment")).toBe(true);
  });

  it("`/***/` is not a doc comment", () => {
    const tokens = tokens_of("/***/");
    expect(tokens.every((t) => t.type === "comment")).toBe(true);
  });

  it("an unterminated doc comment still highlights", () => {
    expect(pick("/** @param {T} x", "@param")).toBe("keyword");
  });

  it("tokens stay contiguous across the splice", () => {
    assert_contiguous("/**\n * @param {Map<string, T>} m\n */\nconst a = 1;");
  });

  it("code after the comment is unaffected", () => {
    const src = "/** @param {T} x */\nfunction f(x) { return x; }";
    expect(pick(src, "function")).toBe("keyword");
    expect(pick(src, "f")).toBe("function");
  });

  it("two doc comments in one document both highlight", () => {
    const src = "/** @type {A} */\nconst a = 1;\n/** @type {B} */\nconst b = 2;";
    expect(types_in(src)).toEqual(["A", "B"]);
  });
});

describe("jsdoc fidelity", () => {
  // embeds run at every fidelity setting — the same rule that keeps CSS
  // inside a `<style>` tag highlighted under `fidelity: "low"`.
  it("still highlights under fidelity='low'", () => {
    const tokens = tokens_of("/** @param {string} x */", { fidelity: "low" });
    expect(tokens.find((t) => t.value === "@param")?.type).toBe("keyword");
    expect(tokens.find((t) => t.value === "string")?.type).toBe("type");
  });
});
