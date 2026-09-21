// TSX runs the TypeScript pipeline over its own grammar, and the two
// grammars do not agree on every token type. the brace-kind rules have to
// match on what the TSX grammar actually emits.

import { describe, expect, it } from "vitest";
import { FRAME_BRACKET_BRACE, reclassify, tokenize as raw_tokenize } from "@twinkleplop/core";
import { ts_frame_track } from "@twinkleplop/typescript";
import { grammar, tokenize as make_language } from "./index.js";

const language = make_language();

function brace_kinds(input: string): string[] {
  const raw = raw_tokenize(input, grammar);
  const out = reclassify([ts_frame_track])(input, raw);
  const frames = out.frames;
  if (frames === undefined) throw new Error("no frame table");
  return frames.frames
    .filter((f) => f.bracket === FRAME_BRACKET_BRACE)
    .map((f) => frames.kind_names[f.kind]);
}

function type_of(input: string, value: string): string | undefined {
  const result = language(input);
  for (let i = 0; i < result.tokens.length / 3; i++) {
    const start = result.tokens[i * 3 + 1];
    const end = result.tokens[i * 3 + 2];
    if (input.slice(start, end) === value) return result.token_types[result.tokens[i * 3]];
  }
  return undefined;
}

describe("TSX frame kinds — return types", () => {
  // the TSX grammar tags `string` / `number` as `type`, where the
  // TypeScript grammar leaves them identifiers for a later pass. a rule
  // that only knew about identifiers left these bodies on the fallback
  // kind, and a `switch` opening one then read as a method name.
  it("a body brace behind a builtin-typed return is a block", () => {
    expect(brace_kinds('function f(u: S["unit"]): string { return ""; }')).toEqual(["block"]);
    expect(brace_kinds("function f(): number { return 1; }")).toEqual(["block"]);
    expect(brace_kinds("function f(): Promise<string> { return p; }")).toEqual(["block"]);
  });

  it("a statement opening such a body is not read as a member", () => {
    const src =
      'function f(u: S["unit"]): string {\n  switch (u) {\n    case "b": {\n      return "x";\n    }\n  }\n}';
    expect(type_of(src, "switch")).toBe("keyword");
    expect(brace_kinds(src)).toEqual(["block", "block", "block"]);
  });
});
