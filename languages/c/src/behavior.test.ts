import { describe, expect, it } from "vitest";
import { tokenize as base_tokenize } from "@twinkleplop/core";
import { grammar, language, tokenize } from "./index.js";
import { KEYWORDS } from "./grammar.js";

function tokens(input: string, enriched = false) {
  const result = enriched ? tokenize()(input) : base_tokenize(input, grammar);
  return Array.from({ length: result.tokens.length / 3 }, (_, i) => [
    result.token_types[result.tokens[i * 3]],
    input.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2]),
  ]);
}

describe("C lexical boundaries", () => {
  it("recognizes every keyword without splitting longer identifiers", () => {
    for (const word of KEYWORDS) {
      expect(tokens(word)).toEqual([["keyword", word]]);
      expect(tokens(word + "_value")).toEqual([["identifier", word + "_value"]]);
    }
    expect(tokens("intégral trueλ false\\u0041")).toEqual([
      ["identifier", "intégral"],
      ["identifier", "trueλ"],
      ["identifier", "false\\u0041"],
    ]);
    expect(
      tokens("class template namespace new delete and override module").every(
        ([type]) => type === "identifier",
      ),
    ).toBe(true);
  });
  it.each([
    "0",
    "0755UL",
    "0xffULL",
    "0XAB",
    "0b1010",
    "0B11u",
    "1'234",
    "0x1.fp+2",
    ".5e-2F",
    "1.",
    "1e+4",
    "23uwb",
    "1.2DF",
    "0xE+foo",
  ])("keeps numeric token %s intact", (number) => {
    expect(tokens(number)).toEqual([["number", number]]);
    expect(tokens(number + "+tail").slice(-2)).toEqual([
      ["operator", "+"],
      ["identifier", "tail"],
    ]);
  });
  it.each(["", "u8", "u", "U", "L"])("includes encoding prefix %s in literals", (prefix) => {
    expect(tokens(prefix + '"text"')).toEqual([["string", prefix + '"text"']]);
    expect(tokens(prefix + "'x'")).toEqual([["string", prefix + "'x'"]]);
  });
  it("recognizes escape spans and recovers after malformed strings", () => {
    expect(
      tokens('"\\x41\\123\\u0041\\U00000041"')
        .filter(([t]) => t === "string_escape")
        .map(([, s]) => s)
        .join(""),
    ).toBe("\\x41\\123\\u0041\\U00000041");
    expect(tokens('"broken\nreturn 1;').slice(-3)).toEqual([
      ["keyword", "return"],
      ["number", "1"],
      ["punctuation", ";"],
    ]);
    expect(tokens('"a\\\r\nb"; return').at(-1)).toEqual(["keyword", "return"]);
  });
  it("preserves literal and punctuation boundaries", () => {
    expect(tokens('"a""b"')).toEqual([
      ["string", '"a"'],
      ["string", '"b"'],
    ]);
    expect(tokens("f();")).toEqual([
      ["identifier", "f"],
      ["punctuation", "("],
      ["punctuation", ")"],
      ["punctuation", ";"],
    ]);
    expect(tokens("-> ++ <<= >> ... <% :> %:%:").map(([, s]) => s)).toEqual([
      "->",
      "++",
      "<<=",
      ">>",
      "...",
      "<%",
      ":>",
      "%:%:",
    ]);
  });
  it("keeps line comments over LF and CRLF continuations", () => {
    for (const nl of ["\n", "\r\n", "\r"]) {
      const input = "// line\\" + nl + "still comment" + nl + "return";
      expect(
        tokens(input)
          .filter(([t]) => t === "comment")
          .map(([, s]) => s)
          .join(""),
      ).toBe("// line\\" + nl + "still comment");
      expect(tokens(input).at(-1)).toEqual(["keyword", "return"]);
    }
  });
  it("recognizes directives only at logical line start", () => {
    expect(tokens(" /* comment */ # include <a//b.h>\nint x;")).toContainEqual([
      "string",
      "<a//b.h>",
    ]);
    expect(tokens("x # include <a.h>")).not.toContainEqual(["string", "<a.h>"]);
    expect(tokens("#include \\\n<next.h>")).toContainEqual(["string", "<next.h>"]);
    expect(tokens("%:include <next.h>")).toContainEqual(["string", "<next.h>"]);
    expect(tokens('#include "path\\file.h"')).toContainEqual(["string", '"path\\file.h"']);
    expect(tokens("# /* newline\n*/ include <a.h>")).not.toContainEqual(["string", "<a.h>"]);
    expect(tokens("#embed <data.bin> limit(8)")).toContainEqual(["string", "<data.bin>"]);
  });
  it("keeps spliced block-comment newlines inside the same directive", () => {
    expect(tokens("# /*continued\\\n*/ include <header.h>")).toContainEqual([
      "string",
      "<header.h>",
    ]);
    expect(tokens("value /*continued\\\n*/ #include <header.h>")).not.toContainEqual([
      "string",
      "<header.h>",
    ]);
  });
  it("terminates block comments at the first closing delimiter", () => {
    expect(tokens("/* outer /* inner */ return").at(-1)).toEqual(["keyword", "return"]);
  });
  it("preserves unicode identifiers and original UTF-16 offsets", () => {
    const input = "int café = κόσμος;";
    expect(tokens(input)).toContainEqual(["identifier", "café"]);
    const result = tokenize()(input);
    for (let i = 0; i < result.tokens.length; i += 3) {
      expect(result.tokens[i + 2]).toBeGreaterThan(result.tokens[i + 1]);
      if (i) expect(result.tokens[i + 1]).toBeGreaterThanOrEqual(result.tokens[i - 1]);
    }
  });
  it("returns to code after well over 256 literals and comments", () => {
    const input =
      "#include <a.h>\n0x1.fp+2 \"ok\" 'x' /*c*/ name; // c\\\nmore\n".repeat(600) +
      "return tail();";
    expect(tokens(input).slice(-5)).toEqual([
      ["keyword", "return"],
      ["identifier", "tail"],
      ["punctuation", "("],
      ["punctuation", ")"],
      ["punctuation", ";"],
    ]);
  });
  it("enriches calls and renders safe HTML", () => {
    expect(tokens("call /*comment*/ (value)", true)[0]).toEqual(["function", "call"]);
    expect(language()('"<tag>"')).toContain("&lt;tag&gt;");
    const low = tokenize({ fidelity: "low" })("call()");
    expect(low.token_types[low.tokens[0]]).toBe("identifier");
  });
});
