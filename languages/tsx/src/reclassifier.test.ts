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

describe("TSX stars", () => {
  it("tags the star of `import type * as X` `constant`", () => {
    expect(type_of('import type * as T from "./t";', "*")).toBe("constant");
    expect(type_of('import type * as T from "./t";', "T")).toBe("namespace");
  });

  it("tags a generator method's star `keyword`", () => {
    expect(type_of("class A { *m(): Generator<number> {} }", "*")).toBe("keyword");
  });
});

describe("TSX optional annotations", () => {
  // the TSX grammar splits `x?:` into `?` and `:` too.
  it("promotes the return of a function type on an optional member", () => {
    expect(type_of("interface I { f?: (n: number) => R | void }", "R")).toBe("type");
    expect(type_of("interface I { f?: (n: number) => R }", "R")).toBe("type");
  });

  it("promotes an optional parameter's annotation", () => {
    expect(type_of("function g(props?: Props) {}", "Props")).toBe("type");
  });
});

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

describe("TSX parameters — later parameters inside a member body", () => {
  it("an object type's function-typed member", () => {
    const src = "type U = { f: (a: string, b: number) => void };";
    expect(type_of(src, "a")).toBe("parameter");
    expect(type_of(src, "b")).toBe("parameter");
  });

  it("an interface method signature", () => {
    const src = "interface I { f(a: string, b: number): void }";
    expect(type_of(src, "a")).toBe("parameter");
    expect(type_of(src, "b")).toBe("parameter");
  });

  it("an interface member's function type reads its names alike", () => {
    const src = "interface I { g: (c: string, d: number) => void }";
    expect(type_of(src, "d")).not.toBe("property");
    expect(type_of(src, "d")).toBe(type_of(src, "c"));
  });

  it("an object literal's arrow", () => {
    expect(type_of("const o = { f: (a: string, b: number) => a };", "b")).toBe("parameter");
  });
});

describe("TSX tuple labels", () => {
  it("labels are properties and their types stay types", () => {
    const src = "type Pair = [first: string, ...rest: number[]];";
    expect(type_of(src, "first")).toBe("property");
    expect(type_of(src, "rest")).toBe("property");
    expect(type_of(src, "string")).toBe("type");
    expect(type_of(src, "number")).toBe("type");
  });
});

describe("TSX casts in expression containers", () => {
  it("a cast in a jsx expression container keeps its type", () => {
    expect(type_of("const el = <p>Count: {count as Foo}</p>;", "Foo")).toBe("type");
  });

  it("an import rename is not a cast", () => {
    expect(type_of('import { a as b } from "m";', "b")).toBe("identifier");
  });
});

describe("TSX `<` after whitespace in a would-be tag", () => {
  it("a defaulted type parameter is not a jsx tag", () => {
    expect(type_of("interface S { new <T = any>(v?: T[]): S; }", "any")).toBe("type");
    expect(type_of("const g = <T = unknown,>(x: T) => x;", "unknown")).toBe("type");
  });

  it("attributes after whitespace still open a tag", () => {
    expect(type_of('const el = <div className="x" />;', "div")).toBe("tag_name");
    expect(type_of("const el = <Foo bar = {1} />;", "bar")).toBe("attr_name");
    expect(type_of("const el = <Foo\n  bar={1}\n/>;", "bar")).toBe("attr_name");
  });
});
