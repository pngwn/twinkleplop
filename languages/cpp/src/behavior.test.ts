import { describe, expect, it } from "vitest";
import { tokenize as base_tokenize } from "@twinkleplop/core";
import { grammar, tokenize } from "./index.js";
import { KEYWORDS } from "./grammar.js";

function tokens(input: string) {
  const result = base_tokenize(input, grammar);
  return Array.from({ length: result.tokens.length / 3 }, (_, i) => [
    result.token_types[result.tokens[i * 3]],
    input.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2]),
  ]);
}

describe("C++ lexical boundaries", () => {
  it("uses its own keyword vocabulary", () => {
    for (const word of KEYWORDS) {
      expect(tokens(word)).toEqual([["keyword", word]]);
      expect(tokens(word + "_value")).toEqual([["identifier", word + "_value"]]);
    }
    for (const word of [
      "restrict",
      "_Generic",
      "_BitInt",
      "typeof_unqual",
      "final",
      "override",
      "module",
      "import",
    ])
      expect(tokens(word)).toEqual([["identifier", word]]);
  });
  it.each(["", "u8", "u", "U", "L"])(
    "handles %s raw strings with arbitrary exact delimiters",
    (prefix) => {
      for (const delimiter of ["", "tag", "abcdefghijklmnop", '!#[]{};:"']) {
        const raw =
          prefix + 'R"' + delimiter + '(a)other" /* text */ \\n\n)wrong" )' + delimiter + '"';
        expect(tokens(raw)).toEqual([["string", raw]]);
        expect(tokens(raw + "; return").at(-1)).toEqual(["keyword", "return"]);
      }
    },
  );
  it("keeps unterminated raw bodies opaque through EOF", () => {
    const raw = 'R"tag(unclosed )wrong" // no comment';
    expect(tokens(raw)).toEqual([["string", raw]]);
    expect(tokens('R"ok(next)ok"')).toEqual([["string", 'R"ok(next)ok"']]);
  });
  it("ignores raw openers inside comments and ordinary literals", () => {
    expect(tokens('// R"x(\nreturn').at(-1)).toEqual(["keyword", "return"]);
    expect(tokens('"R\\"x("; return').at(-1)).toEqual(["keyword", "return"]);
  });
  it.each([
    '"text"sv',
    "'x'_letter",
    'R"tag(body)tag"_text',
    "12_km",
    "0xffuz",
    "1.5f32",
    "0x1.fp-2F",
    "1'000'000ULL",
  ])("retains literal suffix in %s", (literal) => {
    expect(tokens(literal)).toEqual([
      [
        literal.startsWith('"') || literal.startsWith("'") || literal.startsWith("R")
          ? "string"
          : "number",
        literal,
      ],
    ]);
  });
  it("highlights C++23 braced and named escapes", () => {
    for (const escape of ["\\x{41}", "\\u{1F600}", "\\o{101}", "\\N{LATIN CAPITAL LETTER A}"]) {
      expect(
        tokens('"' + escape + '"')
          .filter(([type]) => type === "string_escape")
          .map(([, text]) => text)
          .join(""),
      ).toBe(escape);
    }
    expect(tokens('"\\u{broken\nreturn').at(-1)).toEqual(["keyword", "return"]);
  });
  it("supports C++ operators and alternative spellings", () => {
    const ops = [
      "<=>",
      "->*",
      ".*",
      "and",
      "and_eq",
      "bitand",
      "bitor",
      "compl",
      "not",
      "not_eq",
      "or",
      "or_eq",
      "xor",
      "xor_eq",
    ];
    expect(tokens(ops.join(" "))).toEqual(ops.map((op) => ["operator", op]));
    expect(tokens("std::vector<std::vector<int>>").map(([, s]) => s)).toEqual([
      "std",
      "::",
      "vector",
      "<",
      "std",
      "::",
      "vector",
      "<",
      "int",
      ">>",
    ]);
  });
  it("does not leak stack or delimiter data across repetitions or calls", () => {
    const input = 'R"one(a)one"_tag u8"ok"sv 42uz;\n'.repeat(600) + "return tail;";
    expect(tokens(input).slice(-3)).toEqual([
      ["keyword", "return"],
      ["identifier", "tail"],
      ["punctuation", ";"],
    ]);
    const run = tokenize();
    const first = run('R"a(unclosed');
    const second = run('R"b(closed)b";');
    expect(first.tokens[first.tokens.length - 1]).toBe('R"a(unclosed'.length);
    expect(second.tokens[2]).toBe('R"b(closed)b"'.length);
  });
});
