// Reserved words standing in for names.
//
// Every reserved word is a legal property name, so the grammar's keyword
// classification is wrong wherever the syntax calls for a name. These pin
// both halves: the positions that must be reclassified, and the positions
// where the word really is a keyword and must be left alone.

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

describe("reserved words as property keys", () => {
  it("`{ default: 'boo' }` reads default as a property", () => {
    expect(pick("const x = { default: 'boo' };", "default")).toBe("property");
  });

  it("every reserved word is a legal key", () => {
    const src = "const o = { new: 1, class: 2, for: 3, delete: 4, typeof: 5 };";
    for (const word of ["new", "class", "for", "delete", "typeof"]) {
      expect(pick(src, word)).toBe("property");
    }
  });

  it("literal keywords are keys too", () => {
    const src = "const o = { true: 1, false: 2, null: 3, undefined: 4 };";
    for (const word of ["true", "false", "null", "undefined"]) {
      expect(pick(src, word)).toBe("property");
    }
  });

  it("a destructuring source key is a property", () => {
    expect(pick("const { default: d } = mod;", "default")).toBe("property");
  });

  it("an arrow returning an object literal has keys, not a block", () => {
    const src = "const make = (name) => ({ name, default: 1 });";
    expect(pick(src, "default")).toBe("property");
  });

  it("a plain key beside a reserved one is unaffected", () => {
    const src = "const o = { foo: 1, default: 2 };";
    expect(pick(src, "foo")).toBe("property");
    expect(pick(src, "default")).toBe("property");
  });
});

describe("reserved words as member names", () => {
  // these are settled by the grammar's `member_access` state rather than
  // by a claim, so they hold at every fidelity setting.
  it("holds at fidelity='low'", () => {
    const bare = tokens_of("map.delete(k); obj.class;", { fidelity: "low" });
    expect(bare.find((t) => t.value === "delete")?.type).toBe("identifier");
    expect(bare.find((t) => t.value === "class")?.type).toBe("identifier");
  });

  it("`obj.default` reads as a plain member, like `obj.foo`", () => {
    expect(pick("obj.default;", "default")).toBe("identifier");
    expect(pick("obj.foo;", "foo")).toBe("identifier");
  });

  it("optional chaining reaches the same member", () => {
    expect(pick("obj?.default;", "default")).toBe("identifier");
  });

  it("a coalesced dot still anchors the member", () => {
    expect(pick("foo().default;", "default")).toBe("identifier");
    expect(pick("arr[0].class;", "class")).toBe("identifier");
  });

  it("a called member reads as a function, like `map.has(k)`", () => {
    expect(pick("map.delete(k);", "delete")).toBe("function");
    expect(pick("map.has(k);", "has")).toBe("function");
  });

  it("an optional call reads as a function", () => {
    expect(pick("map?.delete(k);", "delete")).toBe("function");
  });
});

describe("reserved words as method names", () => {
  it("a class method named for a reserved word is a function", () => {
    expect(pick("class C { default() {} }", "default")).toBe("function");
  });

  it("accessor modifiers stay transparent to the method name", () => {
    const src = "class C { static get for() {} }";
    expect(pick(src, "static")).toBe("keyword");
    expect(pick(src, "get")).toBe("keyword");
    expect(pick(src, "for")).toBe("function");
  });

  // object literals are deliberately not covered: `object` is the frame
  // tracker's fallback kind, so claiming `function` there would fire on
  // every brace it could not classify.
  it("object method shorthand is left alone", () => {
    expect(pick("const o = { default() {} };", "default")).toBe("keyword");
  });
});

describe("positions where the word really is a keyword", () => {
  it("a switch arm keeps `default`", () => {
    expect(pick("switch (a) { default: break; }", "default")).toBe("keyword");
  });

  // `){` coalesces into one token, so the frame tracker cannot read the
  // `)` off the previous token.
  it("a switch arm keeps `default` with no space before the brace", () => {
    expect(pick("switch(a){ default: break; }", "default")).toBe("keyword");
    expect(pick("if(a){ return 1; }", "return")).toBe("keyword");
  });

  it("`export default` keeps the keyword", () => {
    expect(pick("export default foo;", "default")).toBe("keyword");
  });

  it("a labelled statement is not a property", () => {
    const src = "loop: for (;;) { break loop; }";
    expect(pick(src, "for")).toBe("keyword");
    expect(pick(src, "loop")).toBe("identifier");
  });

  it("a ternary alternate is not a member", () => {
    const src = "const x = a ? b : c;";
    expect(pick(src, "b")).toBe("identifier");
    expect(pick(src, "c")).toBe("identifier");
  });

  it("a keyword call inside a block body is left alone", () => {
    expect(pick("function f(x) { return typeof(x); }", "typeof")).toBe("keyword");
    expect(pick("if (x) { return(1); }", "return")).toBe("keyword");
  });

  it("an import specifier keeps `default`", () => {
    expect(pick('import { default as d } from "m";', "default")).toBe("keyword");
  });
});

describe("fidelity", () => {
  // the demotion is correctness, so it runs at every setting; only the
  // promotion to `property` is gated.
  it("the promotion is part of the property tier", () => {
    const enriched = tokens_of("const o = { default: 1 };", { fidelity: ["property"] });
    expect(enriched.find((t) => t.value === "default")?.type).toBe("property");
  });

  it("fidelity='low' still refuses to call a key a keyword", () => {
    const bare = tokens_of("const o = { default: 1 };", { fidelity: "low" });
    expect(bare.find((t) => t.value === "default")?.type).toBe("identifier");
  });

  it("fidelity='low' keeps member access and real keywords right", () => {
    const bare = tokens_of("obj.default; switch (k) { default: break; }", {
      fidelity: "low",
    });
    const defaults = bare.filter((t) => t.value === "default").map((t) => t.type);
    expect(defaults).toEqual(["identifier", "keyword"]);
  });
});
