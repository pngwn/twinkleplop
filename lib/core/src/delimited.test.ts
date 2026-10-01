import { describe, it, expect } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import type { GrammarRule } from "./types";

const span: GrammarRule = {
  match_delimited: {
    start: 'R"',
    open: "(",
    close: ")",
    end: '"',
    max_length: 16,
    exclude: "()\\",
  },
  token: "string",
};
function scan(input: string, rule = span) {
  const grammar = compile({
    states: { main: { rules: [rule, { range: [0, 65535], token: "other" }] } },
  });
  const result = tokenize(input, grammar);
  return Array.from({ length: result.tokens.length / 3 }, (_, i) => [
    result.token_types[result.tokens[i * 3]],
    input.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2]),
  ]);
}
describe("captured delimiter spans", () => {
  it("matches an exact captured delimiter with misleading body text", () => {
    const raw = 'R"tag(a)" )TAG" /* literal */\n)tag"';
    expect(scan(raw + " tail")).toEqual([
      ["string", raw],
      ["other", " tail"],
    ]);
    expect(scan('R"(plain)"')).toEqual([["string", 'R"(plain)"']]);
  });
  it("bounds the delimiter and rejects malformed openers without consuming", () => {
    for (const d of ["abcdefghijklmnopq", "bad tag", "bad\t", "bad\r", "bad\\", "bad)", "é"]) {
      const source = 'R"' + d + "(text)" + d + '"';
      expect(scan(source).every(([t]) => t === "other")).toBe(true);
    }
    expect(scan('R"abcdefghijklmnop(ok)abcdefghijklmnop"')[0][0]).toBe("string");
    expect(scan('R"incomplete')).toEqual([["other", 'R"incomplete']]);
  });
  it("keeps incomplete bodies through EOF and does not retain captures", () => {
    expect(scan('R"x(body')).toEqual([["string", 'R"x(body']]);
    expect(scan('R"y(ok)y"')).toEqual([["string", 'R"y(ok)y"']]);
  });
  it("preserves stack transitions and separate adjacent literals", () => {
    const grammar = compile({
      states: {
        main: { rules: [{ match: "[", token: "punctuation", seal: true, state: "inner" }] },
        inner: { rules: [span, { match: "]", token: "punctuation", seal: true, exit: true }] },
      },
    });
    const input = '[R"x(a)x"R"y(b)y"]'.repeat(600);
    const output = tokenize(input, grammar);
    expect(output.tokens.length / 3).toBe(2400);
    expect(output.tokens.at(-1)).toBe(input.length);
  });
  it("supports a different delimiter syntax", () => {
    const rule = {
      token: "string",
      match_delimited: {
        start: "<<",
        open: ":",
        close: ":",
        end: ">>",
        max_length: 8,
        exclude: ">",
      },
    };
    expect(scan("<<end:body:end>>tail", rule)).toEqual([
      ["string", "<<end:body:end>>"],
      ["other", "tail"],
    ]);
  });
  it("validates declarations rather than silently dropping rules", () => {
    for (const patch of [
      { start: "R" },
      { start: "éR" },
      { open: "" },
      { close: "" },
      { end: "" },
      { max_length: -1 },
      { max_length: Infinity },
    ]) {
      expect(() =>
        scan("", { ...span, match_delimited: { ...span.match_delimited!, ...patch } }),
      ).toThrow("Invalid match_delimited");
    }
    expect(() => scan("", { ...span, any: true })).toThrow("Invalid match_delimited");
  });
});
