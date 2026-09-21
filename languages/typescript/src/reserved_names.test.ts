// Reserved words standing in for names, in TypeScript positions.
//
// The rules themselves are the JavaScript pass (see
// javascript/src/reserved_names.test.ts). What is TypeScript-specific is
// the set of frames they run against — interface bodies and type literals
// — and the TypeScript-only keywords the grammar adds.

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

describe("reserved words in TypeScript member positions", () => {
  it("an interface member named for a reserved word is a property", () => {
    expect(pick("interface I { default: string; }", "default")).toBe("property");
  });

  it("a type literal member is a property", () => {
    expect(pick("type T = { default: string };", "default")).toBe("property");
  });

  it("TypeScript's own contextual keywords are keys too", () => {
    const src = "const o = { type: 1, interface: 2, readonly: 3, declare: 4 };";
    for (const word of ["type", "interface", "readonly", "declare"]) {
      expect(pick(src, word)).toBe("property");
    }
  });

  it("an interface method named for a reserved word is a function", () => {
    expect(pick("interface I { delete(key: string): void; }", "delete")).toBe("function");
  });

  it("`new (): T` stays a construct signature, not a method", () => {
    const src = "interface I { new (): I; }";
    expect(pick(src, "new")).toBe("keyword");
  });

  it("a type literal method is left alone", () => {
    // `type_literal` is not in the method frame list — see the comment on
    // METHOD_MEMBER_KINDS in the javascript package.
    expect(pick("type T = { delete(): void };", "delete")).toBe("keyword");
  });

  it("a class method named `new` is still a method", () => {
    expect(pick("class C { new() {} }", "new")).toBe("function");
  });

  it("an annotation type beside a reserved key is unaffected", () => {
    const src = "interface I { default: string; }";
    expect(pick(src, "string")).toBe("type");
  });

  it("a member modifier is not mistaken for a member name", () => {
    const src = "interface I { readonly id: number; }";
    expect(pick(src, "readonly")).toBe("keyword");
    expect(pick(src, "id")).toBe("property");
  });
});

describe("reserved words in TypeScript expression positions", () => {
  it("a member access reads as a plain member", () => {
    expect(pick("const v = config?.default;", "default")).toBe("identifier");
  });

  it("a called member reads as a function", () => {
    expect(pick("registry.delete(key);", "delete")).toBe("function");
  });

  it("an enum name is not affected by the member rules", () => {
    expect(pick("enum E { A = 1 }", "A")).toBe("identifier");
  });
});
