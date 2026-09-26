// Generic declarations whose type parameters close on a coalesced `>`.
//
// The tokenizer emits a run of `>` as one right-shift operator, so
// `make<T extends Record<string, unknown>>(` ends both angle groups on a
// single token. Every walker that counts angle depth has to pop that many
// levels at once; the ones that only understood a lone `>` never found
// the close, and silently gave up on the whole declaration.

import { describe, expect, it } from "vitest";
import { tokenize as make_language } from "./index.js";

function pick(input: string, value: string, nth = 0) {
  const result = make_language()(input);
  let seen = 0;
  for (let i = 0; i < result.tokens.length / 3; i++) {
    const start = result.tokens[i * 3 + 1];
    const end = result.tokens[i * 3 + 2];
    if (input.slice(start, end) !== value) continue;
    if (seen++ < nth) continue;
    return result.token_types[result.tokens[i * 3]];
  }
  return undefined;
}

const NESTED = "make<T extends Record<string, unknown>>(base: T): T";
const SIMPLE = "make<T>(base: T): T";

describe("generic members with a nested constraint", () => {
  for (const [label, body] of [
    ["interface member", `interface I {\n  ${NESTED};\n}`],
    ["class method", `class C {\n  ${NESTED} {}\n}`],
    ["function declaration", `function ${NESTED} {}`],
  ] as const) {
    describe(label, () => {
      it("names the declaration a function", () => {
        expect(pick(body, "make")).toBe("function");
      });

      it("names the type parameter a type", () => {
        expect(pick(body, "T")).toBe("type");
      });

      it("names the constraint a type", () => {
        expect(pick(body, "Record")).toBe("type");
        expect(pick(body, "string")).toBe("type");
        expect(pick(body, "unknown")).toBe("type");
      });

      it("names the value parameter a parameter", () => {
        expect(pick(body, "base")).toBe("parameter");
      });
    });
  }
});

describe("generic members with a simple parameter list", () => {
  for (const [label, body] of [
    ["interface member", `interface I {\n  ${SIMPLE};\n}`],
    ["class method", `class C {\n  ${SIMPLE} {}\n}`],
  ] as const) {
    it(`${label} tags the value parameter`, () => {
      expect(pick(body, "make")).toBe("function");
      expect(pick(body, "base")).toBe("parameter");
    });
  }
});

describe("a coalesced close does not over-run the span", () => {
  // the span that starts at `Map<` has to stop at the `>>`, not carry on
  // tagging every identifier that follows it as a type.
  const src = [
    "const chars = new Map<number, Record<number, number>>();",
    "const rules = new Set<number>();",
    "state_names.forEach((name) => {});",
  ].join("\n");

  it("claims the type arguments", () => {
    // `Map` itself is the constructor reference, not a type argument.
    expect(pick(src, "Map")).toBe("class_name");
    expect(pick(src, "Record")).toBe("type");
    expect(pick(src, "number")).toBe("type");
  });

  it("stops claiming at the closing run", () => {
    expect(pick(src, "chars")).toBe("constant");
    expect(pick(src, "rules")).toBe("constant");
    expect(pick(src, "name")).toBe("parameter");
  });
});

describe("type literal members", () => {
  it("names a method signature a function", () => {
    expect(pick("type T = { make(): void };", "make")).toBe("function");
  });

  it("names a generic method signature a function", () => {
    const src = "type T = { make<U>(base: U): U };";
    expect(pick(src, "make")).toBe("function");
    expect(pick(src, "U")).toBe("type");
    expect(pick(src, "base")).toBe("parameter");
  });

  it("still names a plain type reference a type", () => {
    const src = "type T = { a: Foo<U>; b: Bar };";
    expect(pick(src, "Foo")).toBe("type");
    expect(pick(src, "Bar")).toBe("type");
    expect(pick(src, "a")).toBe("property");
    expect(pick(src, "b")).toBe("property");
  });
});

describe("optional members", () => {
  // the family splits `x?:` across an operator and a punctuation token,
  // which the span's member-position test did not recognise — so an
  // optional key nested under an annotation read as a type.
  it("names an optional key nested under an annotation a property", () => {
    const src = "interface B {\n  brackets: {\n    paren?: { open: string };\n  };\n}";
    expect(pick(src, "brackets")).toBe("property");
    expect(pick(src, "paren")).toBe("property");
    expect(pick(src, "open")).toBe("property");
    expect(pick(src, "string")).toBe("type");
  });

  it("names an optional key in a union member a property", () => {
    const src = 'type R = { kind: "ref"; to?: number };';
    expect(pick(src, "to")).toBe("property");
  });

  it("names an optional parameter a parameter", () => {
    const src = "type F = (options?: Options) => void;";
    expect(pick(src, "options")).toBe("parameter");
    expect(pick(src, "Options")).toBe("type");
  });

  it("leaves a direct interface member alone", () => {
    const src = "interface B {\n  paren?: { open: string };\n}";
    expect(pick(src, "paren")).toBe("property");
  });
});

describe("a comparison is still not a generic", () => {
  it("leaves a shift expression alone", () => {
    const src = "const shifted = a < b >> c;";
    expect(pick(src, "b")).toBe("identifier");
    expect(pick(src, "c")).toBe("identifier");
  });
});

describe("a coalesced close before a body brace", () => {
  for (const [label, src] of [
    ["implements", "class Q<T> implements Iterable<B<T>> {\n  state = 0;\n}"],
    ["implements >>>", "class Q<T> implements A<B<C<T>>> {\n  state = 0;\n}"],
    ["implements list", "class Q<T> implements A<B<T>>, D<E<T>> {\n  state = 0;\n}"],
    ["interface extends", "interface I extends A<B<T>> {\n  state: number;\n}"],
    ["return type", "function f(): A<B<T>> {\n  state = 0;\n}"],
  ] as const) {
    it(`${label} stops at the body`, () => {
      expect(pick(src, "B")).toBe("type");
      expect(pick(src, "state")).not.toBe("type");
    });
  }
});
