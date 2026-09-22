// Integration tests for the TypeScript pipeline. Uses the `language` entry
// point (tokenize + reclassify) so it covers the full path including the
// interface_member_promoter pass.

import { describe, it, expect } from "vitest";
import { FRAME_BRACKET_BRACE, reclassify, tokenize as raw_tokenize } from "@twinkleplop/core";
import { grammar, tokenize as make_language, ts_frame_track } from "./index.js";

const language = make_language();

function enrich(input) {
  const result = language(input);
  const out = [];
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

function type_of(tokens, value) {
  return tokens.find((t) => t.value === value)?.type;
}

describe("TypeScript reclassifier — interface member promotion", () => {
  // The rule-based reclassifier's broad type-annotation exclusion would
  // demote interface members to identifier (because `: id ;` and `: type`
  // match). The stateful interface_member_promoter walks the token stream,
  // identifies brace depths inside `interface IDENT [extends ...] {`, and
  // re-promotes those members to property.

  it("interface members with custom type annotations classify as property", () => {
    const tokens = enrich("interface I { x: T; y: U; }");
    expect(type_of(tokens, "x")).toBe("property");
    expect(type_of(tokens, "y")).toBe("property");
  });

  it("interface members with builtin type annotations classify as property", () => {
    const tokens = enrich("interface I { x: number; y: string; }");
    expect(type_of(tokens, "x")).toBe("property");
    expect(type_of(tokens, "y")).toBe("property");
  });

  it("interface with extends clause works", () => {
    const tokens = enrich("interface I extends J { x: T; }");
    expect(type_of(tokens, "x")).toBe("property");
  });

  it("interface members with readonly modifier classify as property", () => {
    const tokens = enrich("interface I { readonly x: T; }");
    expect(type_of(tokens, "x")).toBe("property");
  });

  it("interface methods stay as function (followed by `(` not `:`)", () => {
    const tokens = enrich("interface I { method(): T; x: number; }");
    expect(type_of(tokens, "method")).toBe("function");
    expect(type_of(tokens, "x")).toBe("property");
  });

  it("optional interface members classify as property", () => {
    const tokens = enrich("interface I { x?: T; }");
    expect(type_of(tokens, "x")).toBe("property");
  });

  it("typed parameters in interface methods are tagged as parameter", () => {
    // promote_js_parameters tags interface method signature params the
    // same as runtime methods — users want the parameter highlight on
    // names like `id` and `user` regardless of whether the surrounding
    // declaration is a type-only signature or a runtime method.
    const tokens = enrich(
      "interface Repository { find(id: number): User; save(user: User): void; }",
    );
    expect(type_of(tokens, "find")).toBe("function");
    expect(type_of(tokens, "id")).toBe("parameter");
    expect(type_of(tokens, "user")).toBe("parameter");
    expect(type_of(tokens, "save")).toBe("function");
  });

  it("interface with mixed fields and methods classifies each correctly", () => {
    const tokens = enrich(`interface Repository extends Collection {
			field: thing;
			find(id: number): User;
			save(user: User): void;
			field2: thing;
		}`);
    expect(type_of(tokens, "field")).toBe("property");
    expect(type_of(tokens, "field2")).toBe("property");
    expect(type_of(tokens, "find")).toBe("function");
    expect(type_of(tokens, "save")).toBe("function");
    expect(type_of(tokens, "id")).toBe("parameter");
    expect(type_of(tokens, "user")).toBe("parameter");
  });

  it("computed key inside interface stays as identifier", () => {
    // `[key]: T` — the bracketed identifier shouldn't get promoted.
    const tokens = enrich("interface I { [key]: T; field: T; }");
    expect(type_of(tokens, "key")).toBe("identifier");
    expect(type_of(tokens, "field")).toBe("property");
  });
});

describe("TypeScript reclassifier — class field exclusion still wins over property", () => {
  // regression: the class field rule and interface promoter must not
  // interfere with each other.

  it("class field with default value stays identifier (not property)", () => {
    const tokens = enrich("class C { x: T = 1; }");
    expect(type_of(tokens, "x")).toBe("identifier");
  });

  it("class field with type annotation only stays identifier", () => {
    const tokens = enrich("class C { x: T; }");
    expect(type_of(tokens, "x")).toBe("identifier");
  });

  it("class extends doesn't accidentally trigger interface promoter", () => {
    const tokens = enrich("class C extends D { x: T = 1; }");
    expect(type_of(tokens, "x")).toBe("identifier");
  });
});

describe("TypeScript reclassifier — object literal / destructure unaffected", () => {
  it("object literal property classification works", () => {
    const tokens = enrich("let o = { a: 1, b: 2 };");
    expect(type_of(tokens, "a")).toBe("property");
    expect(type_of(tokens, "b")).toBe("property");
  });

  it("destructure-with-rename keeps the key as property", () => {
    const tokens = enrich("let { a: b } = obj;");
    expect(type_of(tokens, "a")).toBe("property");
  });

  it("destructure-with-default keeps the key as property", () => {
    const tokens = enrich("let { a: b = c } = obj;");
    expect(type_of(tokens, "a")).toBe("property");
  });
});

describe("TypeScript reclassifier — type-position promotion", () => {
  it("custom type in parameter position promotes", () => {
    const tokens = enrich("function foo(x: User) { return x; }");
    expect(type_of(tokens, "User")).toBe("type");
    // x itself is promoted to parameter; this test is about User.
    expect(type_of(tokens, "x")).toBe("parameter");
  });

  it("custom type in return position promotes", () => {
    const tokens = enrich("function foo(): Baz { return null; }");
    expect(type_of(tokens, "Baz")).toBe("type");
  });

  it("custom type in variable annotation promotes", () => {
    const tokens = enrich("let x: MyType = 1;");
    expect(type_of(tokens, "MyType")).toBe("type");
    expect(type_of(tokens, "x")).toBe("identifier");
  });

  it("generic arguments promote: Promise<Bar>", () => {
    const tokens = enrich("let p: Promise<Bar> = fetch();");
    expect(type_of(tokens, "Promise")).toBe("type");
    expect(type_of(tokens, "Bar")).toBe("type");
  });

  it("union types promote: A | B", () => {
    const tokens = enrich("type X = A | B;");
    expect(type_of(tokens, "A")).toBe("type");
    expect(type_of(tokens, "B")).toBe("type");
  });

  it("intersection types promote: A & B", () => {
    const tokens = enrich("type X = A & B;");
    expect(type_of(tokens, "A")).toBe("type");
    expect(type_of(tokens, "B")).toBe("type");
  });

  it("`as` cast target promotes", () => {
    const tokens = enrich("const y = x as MyType;");
    expect(type_of(tokens, "MyType")).toBe("type");
    expect(type_of(tokens, "x")).toBe("identifier");
  });

  it("`satisfies` target promotes", () => {
    const tokens = enrich("const y = x satisfies Shape;");
    expect(type_of(tokens, "Shape")).toBe("type");
  });

  it("`as` terminates at value operator", () => {
    const tokens = enrich("const y = x as MyType + 1;");
    expect(type_of(tokens, "MyType")).toBe("type");
  });

  it("interface extends list: `N` inside body promotes to type", () => {
    const tokens = enrich("interface J extends K, L { m(): N; }");
    // K and L are promoted to class_name by the class_name_promoter
    // (which runs after this pass). the return type `N` inside the
    // body is owned by type_position_promoter.
    expect(type_of(tokens, "K")).toBe("class_name");
    expect(type_of(tokens, "L")).toBe("class_name");
    expect(type_of(tokens, "N")).toBe("type");
  });

  it("class implements list: members become class_name", () => {
    const tokens = enrich("class C implements Foo, Bar {}");
    expect(type_of(tokens, "Foo")).toBe("class_name");
    expect(type_of(tokens, "Bar")).toBe("class_name");
  });

  it("class extends (super class): super becomes class_name", () => {
    const tokens = enrich("class C extends D {}");
    // the class_name_promoter promotes the super-class position (even
    // though `class extends D` references a value, the convention in
    // most highlighters is to style it as a class).
    expect(type_of(tokens, "D")).toBe("class_name");
  });

  it("type alias RHS promotes all type refs", () => {
    const tokens = enrich("type Response = Success | Failure;");
    expect(type_of(tokens, "Success")).toBe("type");
    expect(type_of(tokens, "Failure")).toBe("type");
  });

  it("type alias with generics promotes parameters", () => {
    const tokens = enrich("type Box<T> = { value: T };");
    // first T is the parameter declaration, second is a reference
    const t_tokens = tokens.filter((x) => x.value === "T");
    expect(t_tokens.every((x) => x.type === "type")).toBe(true);
  });

  it("generic type param constraint promotes", () => {
    const tokens = enrich("function f<T extends Base>(x: T) {}");
    expect(type_of(tokens, "Base")).toBe("type");
  });

  it("function type annotation keeps param names as identifier", () => {
    // regression: (a: T) => U inside a type annotation must keep `a` as
    // identifier (it's a param name, not a type).
    const tokens = enrich("const f: (a: T) => U = null as any;");
    expect(type_of(tokens, "a")).toBe("identifier");
    expect(type_of(tokens, "T")).toBe("type");
    expect(type_of(tokens, "U")).toBe("type");
  });

  it("object type annotation keys are property, values are type", () => {
    // `key` gets property classification (same rule that fires for object
    // literal keys preceded by `{`). the important invariant is that
    // `Val` promotes to `type`, not the key's exact classification.
    const tokens = enrich("let o: { key: Val } = x;");
    expect(type_of(tokens, "key")).toBe("property");
    expect(type_of(tokens, "Val")).toBe("type");
  });

  it("nested function-type inside return type promotes", () => {
    const tokens = enrich("function g(): (x: T) => U { return null; }");
    expect(type_of(tokens, "T")).toBe("type");
    expect(type_of(tokens, "U")).toBe("type");
    expect(type_of(tokens, "x")).toBe("identifier");
  });

  it("conditional type arms promote both branches", () => {
    const tokens = enrich("type C<T> = T extends string ? A : B;");
    expect(type_of(tokens, "A")).toBe("type");
    expect(type_of(tokens, "B")).toBe("type");
  });

  it("ternary `a ? b : c` does NOT promote (not a type)", () => {
    const tokens = enrich("const r = a ? b : c;");
    expect(type_of(tokens, "a")).toBe("identifier");
    expect(type_of(tokens, "b")).toBe("identifier");
    expect(type_of(tokens, "c")).toBe("identifier");
  });

  it("object literal values are NOT promoted", () => {
    const tokens = enrich("const o = { key: valueRef, other: thing };");
    expect(type_of(tokens, "valueRef")).toBe("identifier");
    expect(type_of(tokens, "thing")).toBe("identifier");
  });

  it("arrow body values are NOT promoted", () => {
    const tokens = enrich("const f = (): User => someValue;");
    expect(type_of(tokens, "User")).toBe("type");
    expect(type_of(tokens, "someValue")).toBe("identifier");
  });

  it("multi-declarator var respects type annotations", () => {
    const tokens = enrich("let a = 1, b: Foo = 2;");
    expect(type_of(tokens, "Foo")).toBe("type");
    expect(type_of(tokens, "a")).toBe("identifier");
  });

  it("class field with function-type demotes anchor to identifier", () => {
    // regression: without context, `handler: () => void` matches the JS
    // function-variable arrow pattern and classifies `handler` as
    // `function`. the type-position pass should demote it.
    const tokens = enrich("class C { handler: () => void; }");
    expect(type_of(tokens, "handler")).toBe("identifier");
  });

  it("function param with function-type demotes anchor then parameter-promotes it", () => {
    // type_position_promoter demotes `cb` to identifier (not function),
    // then promote_js_parameters promotes it to parameter since it's in
    // a function's parameter list. `x` inside the nested function-type
    // is a sub-parameter and stays identifier (inner parens aren't the
    // outer parameter list).
    const tokens = enrich("function f(cb: (x: T) => U) {}");
    expect(type_of(tokens, "cb")).toBe("parameter");
    expect(type_of(tokens, "T")).toBe("type");
    expect(type_of(tokens, "U")).toBe("type");
  });

  it("interface member with function-type classifies as property", () => {
    const tokens = enrich("interface I { cb: () => X; }");
    expect(type_of(tokens, "cb")).toBe("property");
    expect(type_of(tokens, "X")).toBe("type");
  });

  it("class head gets class_name, type annotations still promote", () => {
    const tokens = enrich("class Repo<T> extends Base<T> implements IFace { x: User; }");
    expect(type_of(tokens, "Repo")).toBe("class_name");
    expect(type_of(tokens, "Base")).toBe("class_name");
    expect(type_of(tokens, "IFace")).toBe("class_name");
    // `User` in field type annotation stays as `type`
    expect(type_of(tokens, "User")).toBe("type");
  });

  it("interface head gets class_name for name and extends list", () => {
    const tokens = enrich("interface Repo extends Base { x: User; }");
    expect(type_of(tokens, "Repo")).toBe("class_name");
    expect(type_of(tokens, "Base")).toBe("class_name");
    expect(type_of(tokens, "User")).toBe("type");
  });

  it("new inside a function body promotes the class", () => {
    const tokens = enrich("function make(): Foo { return new FooImpl(); }");
    expect(type_of(tokens, "Foo")).toBe("type");
    expect(type_of(tokens, "FooImpl")).toBe("class_name");
  });

  it("instanceof with TypeScript-typed context", () => {
    const tokens = enrich("function is_user(x: unknown): x is User { return x instanceof User; }");
    // first `User` is the type-predicate type, second is an instanceof
    // reference. The class_name pass runs after the type-position pass,
    // so the instanceof position wins.
    const user_types = tokens.filter((t) => t.value === "User").map((t) => t.type);
    expect(user_types).toContain("type");
    expect(user_types).toContain("class_name");
  });

  it("plain JS file is unaffected (no `type` token emitted)", () => {
    // the pass is guarded by the presence of a `type` token type, so JS
    // (which has no `type` token) sees the pass as a no-op. this test
    // runs against the TS pipeline but input uses no TS features — we
    // just confirm identifiers in value position stay identifiers.
    const tokens = enrich("const x = fn(a, b); const y = a + b;");
    expect(type_of(tokens, "a")).toBe("identifier");
    expect(type_of(tokens, "b")).toBe("identifier");
  });
});

describe("TypeScript reclassifier — generic parameter constraints", () => {
  // regression: without angle tracking, the `{` in `<T extends { id: V }>`
  // was mistaken for the class body `{`. that consumed expecting_class_body
  // on the wrong brace, made the real body look like an `object` scope,
  // and got class fields misclassified as properties while keys inside the
  // type-literal constraint got no claim at all.

  it("type literal inside class generic constraint — key is property", () => {
    const tokens = enrich("class UserStore<T extends { id: number }> { x: T; }");
    expect(type_of(tokens, "id")).toBe("property");
  });

  it("real class body fields after a generic constraint stay as identifier", () => {
    const src = `class UserStore<T extends { id: number }> {
			private items: Map<number, T> = new Map();
			public readonly name = "users";
			public readonly active: boolean = true;
		}`;
    const tokens = enrich(src);
    expect(type_of(tokens, "items")).toBe("identifier");
    expect(type_of(tokens, "name")).toBe("identifier");
    expect(type_of(tokens, "active")).toBe("identifier");
    // and confirm the inner type-literal key still promotes.
    expect(type_of(tokens, "id")).toBe("property");
  });

  it("methods on a generic class remain function", () => {
    // avoid `get` / `set` as method names — those are getter / setter
    // keywords in JS/TS and the grammar tokenizes them as `keyword`,
    // not `identifier`. pick neutral names.
    const src = `class UserStore<T extends { id: number }> {
			add(item: T): this { return this; }
			lookup(id: number): T | undefined { return undefined; }
		}`;
    const tokens = enrich(src);
    expect(type_of(tokens, "add")).toBe("function");
    expect(type_of(tokens, "lookup")).toBe("function");
    // class method params are tagged `parameter` by promote_js_parameters.
    expect(type_of(tokens, "item")).toBe("parameter");
  });

  it("interface with generic constraint — body members still property", () => {
    const tokens = enrich("interface Repo<T extends { id: V }> { find(id: number): T; x: T; }");
    // inside the generic constraint
    const id_types = tokens.filter((t) => t.value === "id").map((t) => t.type);
    // first `id` is the constraint's type-literal key (property);
    // second `id` is the interface method parameter name (parameter,
    // tagged by promote_js_parameters).
    expect(id_types).toContain("property");
    expect(id_types).toContain("parameter");
    // interface body member
    expect(type_of(tokens, "x")).toBe("property");
    expect(type_of(tokens, "find")).toBe("function");
  });

  it("class with generic + extends expression containing object literal", () => {
    // `class C extends f({key: 1}) {}` — the `{key: 1}` is an object
    // literal inside a call arg, not a type literal. key should claim
    // property (object scope). real class body opens after `)`.
    const tokens = enrich("class C extends f({ key: 1 }) { x = 1; }");
    expect(type_of(tokens, "key")).toBe("property");
    expect(type_of(tokens, "x")).toBe("identifier");
  });
});

describe("TypeScript fidelity — decorator downgrade", () => {
  // the grammar emits the full `@foo.bar` chain as a single decorator token
  // (bake-in path keeps the high-fidelity case reclassifier-free). under
  // low fidelity or an allowlist that excludes `decorator`, the grammar
  // extension downgrade remaps decorator tokens to identifier.

  const src = "@Component({})\nclass A {}";

  function tokens_of(input, options) {
    const result = make_language(options)(input);
    const out = [];
    for (let i = 0; i < result.tokens.length / 3; i++) {
      out.push({
        type: result.token_types[result.tokens[i * 3]],
        value: input.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2]),
      });
    }
    return out;
  }

  it("fidelity='high' keeps decorator as one decorator span", () => {
    const tokens = tokens_of(src, { fidelity: "high" });
    expect(tokens.find((t) => t.value === "@Component")?.type).toBe("decorator");
  });

  it("fidelity='low' downgrades decorator to identifier", () => {
    const tokens = tokens_of(src, { fidelity: "low" });
    expect(tokens.find((t) => t.value === "@Component")?.type).toBe("identifier");
  });

  it("fidelity allowlist including 'decorator' keeps it", () => {
    const tokens = tokens_of(src, { fidelity: ["decorator"] });
    expect(tokens.find((t) => t.value === "@Component")?.type).toBe("decorator");
  });

  it("fidelity allowlist excluding 'decorator' downgrades it", () => {
    const tokens = tokens_of(src, { fidelity: ["function"] });
    expect(tokens.find((t) => t.value === "@Component")?.type).toBe("identifier");
  });

  it("dotted decorator names stay as one decorator span", () => {
    const tokens = tokens_of("@foo.bar.Baz class A {}");
    expect(tokens.find((t) => t.value === "@foo.bar.Baz")?.type).toBe("decorator");
  });

  it("UPPER_SNAKE_CASE names promote to constant", () => {
    const tokens = tokens_of("const MAX_SIZE: number = 100;");
    expect(tokens.find((t) => t.value === "MAX_SIZE")?.type).toBe("constant");
  });

  it("constant downgrades to identifier under fidelity='low'", () => {
    const tokens = tokens_of("const MAX_SIZE: number = 100;", {
      fidelity: "low",
    });
    expect(tokens.find((t) => t.value === "MAX_SIZE")?.type).toBe("identifier");
  });

  it("decorator immediately before paren args does not swallow the paren", () => {
    const tokens = tokens_of("@Injectable()\nclass A {}");
    // the decorator span must stop at `@Injectable` — the subsequent `()`
    // is a separate punctuation run.
    const decorator = tokens.find((t) => t.type === "decorator");
    expect(decorator?.value).toBe("@Injectable");
  });

  it("free-standing PascalCase stays identifier", () => {
    // class_name promotion is positional only (class/new/instanceof/
    // extends/implements). A PascalCase reference in plain expression
    // position gets no special treatment.
    const tokens = tokens_of("const x = Foo.bar;");
    expect(tokens.find((t) => t.value === "Foo")?.type).toBe("identifier");
  });

  it("type-annotation position still wins as `type`", () => {
    // type_position_promoter promotes any name in `: ...` annotation
    // position to `type`, including PascalCase references.
    const tokens = tokens_of("let x: MyType = 1;");
    expect(tokens.find((t) => t.value === "MyType")?.type).toBe("type");
  });

  it("`namespace X { ... }` promotes X to namespace", () => {
    const tokens = tokens_of("namespace Utils { export const x = 1; }");
    expect(tokens.find((t) => t.value === "Utils")?.type).toBe("namespace");
  });

  it("`module X { ... }` (deprecated) promotes X to namespace", () => {
    const tokens = tokens_of("module Utils { export const x = 1; }");
    expect(tokens.find((t) => t.value === "Utils")?.type).toBe("namespace");
  });

  it("`import * as X from ...` promotes X to namespace", () => {
    const tokens = tokens_of('import * as fs from "node:fs";');
    expect(tokens.find((t) => t.value === "fs")?.type).toBe("namespace");
  });

  it("`import def, * as X` promotes X to namespace, not a cast target", () => {
    const tokens = tokens_of('import def, * as ns from "x";');
    expect(tokens.find((t) => t.value === "ns")?.type).toBe("namespace");
  });

  it("`import type * as X` / `export type *` tag the star `constant`", () => {
    const imported = tokens_of('import type * as T from "./t";');
    expect(imported.find((t) => t.value === "*")?.type).toBe("constant");
    expect(imported.find((t) => t.value === "T")?.type).toBe("namespace");
    const exported = tokens_of('export type * from "./t";');
    expect(exported.find((t) => t.value === "*")?.type).toBe("constant");
  });

  it("a typed generator method's star is `keyword`", () => {
    const tokens = tokens_of("class A { *m(): Generator<number> { yield* xs; } }");
    expect(tokens.filter((t) => t.value === "*").map((t) => t.type)).toEqual([
      "keyword",
      "keyword",
    ]);
  });

  it("namespace downgrades to identifier under fidelity='low'", () => {
    const tokens = tokens_of("namespace Utils { }", { fidelity: "low" });
    expect(tokens.find((t) => t.value === "Utils")?.type).toBe("identifier");
  });

  it("TS-annotated params promote (type stays as type/class_name)", () => {
    const tokens = tokens_of("function f(x: number, y: MyType) { }");
    expect(tokens.find((t) => t.value === "x")?.type).toBe("parameter");
    expect(tokens.find((t) => t.value === "y")?.type).toBe("parameter");
    expect(tokens.find((t) => t.value === "number")?.type).toBe("type");
    expect(tokens.find((t) => t.value === "MyType")?.type).toBe("type");
  });

  it("generic type parameters `<T>` between name and `(` are skipped", () => {
    const tokens = tokens_of("function f<T>(x: T) { }");
    expect(tokens.find((t) => t.value === "x")?.type).toBe("parameter");
    // T is a type parameter — type_position_promoter tags it as type.
    // My walker's job is just to not mis-tag it as `parameter`.
    expect(tokens.find((t) => t.value === "T")?.type).toBe("type");
  });
});

describe("TypeScript reclassifier — ternary colons around casts", () => {
  it("a cast ending at a ternary `?` does not promote the else branch", () => {
    // the imperative promoter dropped the pending `?` when the cast span
    // exited on it, then misread the ternary `:` as a variable annotation
    // and promoted `c`. the frame tracker's qmark counting survives the
    // cast, so the colon reads as the ternary's and `c` stays a value.
    const tokens = enrich("const z = a as T ? b : c;");
    expect(type_of(tokens, "T")).toBe("type");
    expect(type_of(tokens, "b")).toBe("identifier");
    expect(type_of(tokens, "c")).toBe("identifier");
  });

  it("a cast inside a ternary branch spans to the statement end", () => {
    // parity with the imperative promoter: the cast does not exit at the
    // ternary `:` (an in-span colon is type-level), so the else branch
    // promotes with it. known cosmetic limitation, kept deliberately.
    const tokens = enrich("const z = cond ? x as T : y;");
    expect(type_of(tokens, "T")).toBe("type");
    expect(type_of(tokens, "y")).toBe("type");
  });
});

describe("TypeScript reclassifier — optional annotations", () => {
  // `x?: T` splits into `?` and `:`. the tracker used to count that `?`
  // as a ternary's, so every annotation rule skipped the colon.
  it("promotes the return of a function type on an optional member", () => {
    expect(type_of(enrich("interface I { f: (n: number) => R }"), "R")).toBe("type");
    expect(type_of(enrich("interface I { f?: (n: number) => R }"), "R")).toBe("type");
    expect(type_of(enrich("interface I { f?: (n: number) => R | void }"), "R")).toBe("type");
    expect(type_of(enrich("let f: (n: number) => R | void;"), "R")).toBe("type");
  });

  it("promotes a hook signature with a union return", () => {
    const tokens = enrich(
      "interface Hooks {\n  line?: (n: number, source_line: number) => HookResult | void;\n}",
    );
    expect(type_of(tokens, "line")).toBe("property");
    expect(type_of(tokens, "HookResult")).toBe("type");
  });

  it("promotes optional members, fields and parameters", () => {
    expect(type_of(enrich("interface I { f?: T; g: U }"), "T")).toBe("type");
    expect(type_of(enrich("class C { f?: T; }"), "T")).toBe("type");
    expect(type_of(enrich("function g(x?: T) {}"), "T")).toBe("type");
    expect(type_of(enrich("interface I { f?: Map<K, V>[] }"), "Map")).toBe("type");
  });

  it("still reads a ternary's colon as a ternary", () => {
    const tokens = enrich("const v = ok ? A : B;");
    expect(type_of(tokens, "A")).toBe("identifier");
    expect(type_of(tokens, "B")).toBe("identifier");
  });

  it("pairs a later ternary on the same frame after an optional parameter", () => {
    const tokens = enrich("function g(x?: T, y = ok ? a : b) {}");
    expect(type_of(tokens, "T")).toBe("type");
    expect(type_of(tokens, "b")).toBe("identifier");
  });
});

describe("TypeScript frame kinds — return types and switch labels", () => {
  // these two brace positions used to fall through to the wrong kind:
  // a body brace behind a return-type annotation read as an object
  // literal, and a `case` arm read as a type-literal annotation. the
  // kinds themselves are what downstream claim passes gate on, so they
  // are asserted directly rather than through a token type.
  function brace_kinds(input) {
    const raw = raw_tokenize(input, grammar);
    const out = reclassify([ts_frame_track])(input, raw);
    return out.frames.frames
      .filter((f) => f.bracket === FRAME_BRACKET_BRACE)
      .map((f) => out.frames.kind_names[f.kind]);
  }

  it("a body brace behind a return type is a block", () => {
    expect(brace_kinds("function f(state: number): void { return; }")).toEqual(["block"]);
    expect(brace_kinds('function f(u: S["unit"]): string { return ""; }')).toEqual(["block"]);
    expect(brace_kinds("function f(): Promise<void> { g(); }")).toEqual(["block"]);
    expect(brace_kinds("function f(): Record<string, number> { g(); }")).toEqual(["block"]);
    expect(brace_kinds("function f(): [A, B] { g(); }")).toEqual(["block"]);
    expect(brace_kinds("function f(): readonly string[] { g(); }")).toEqual(["block"]);
    expect(brace_kinds("const o = { m(): void { return; } };")).toEqual(["object", "block"]);
  });

  it("a case arm is a block, a bare annotation colon is still a type literal", () => {
    expect(brace_kinds('switch (u) { case "bytes": { g(); } }')).toEqual(["block", "block"]);
    expect(brace_kinds("switch (u) { default: { g(); } }")).toEqual(["block", "block"]);
    expect(brace_kinds("switch (u) { case U.B: { g(); } }")).toEqual(["block", "block"]);
    expect(brace_kinds("const x: { a: number } = y;")).toEqual(["type_literal"]);
  });

  it("a reserved word used as an object key does not open a block", () => {
    // same `default:` / `case:` shape, but inside an object literal.
    expect(brace_kinds("function f() { const o = { default: { a: 1 } }; }")).toEqual([
      "block",
      "object",
      "type_literal",
    ]);
    expect(brace_kinds("function f() { const o = { case: { a: 1 } }; }")).toEqual([
      "block",
      "object",
      "type_literal",
    ]);
  });

  it("object literals reached through the new rules keep their kind", () => {
    expect(brace_kinds("const o = { a: 1 };")).toEqual(["object"]);
    expect(brace_kinds("const y = c ? f(x) : g({ b: 1 });")).toEqual(["object"]);
    expect(brace_kinds("namespace Foo { const a = 1; }")).toEqual(["object"]);
  });
});

describe("TypeScript parameters — arrows after a ternary colon", () => {
  it("both arms of a ternary tag their parameters", () => {
    // the second arrow sits behind the ternary colon. the type-position
    // guard used to read that colon as an annotation unless the
    // enclosing frame was an object literal, so the parameter went
    // untagged inside a function body.
    const tokens = enrich(
      "function f(): View {\n  const t = c ? (i: number) => a(i) : (i: number) => b(i);\n}",
    );
    // the two declaration sites are the `i` tokens followed by `:`.
    const declared = tokens.filter(
      (t, k) => t.value === "i" && tokens[k + 1] && tokens[k + 1].value === ":",
    );
    expect(declared).toHaveLength(2);
    expect(declared.map((t) => t.type)).toEqual(["parameter", "parameter"]);
  });

  it("an optional member's function type is still a type, not a parameter list", () => {
    const tokens = enrich("interface P { onHover?: (index: number) => void; }");
    expect(type_of(tokens, "index")).not.toBe("parameter");
  });
});

describe("TypeScript parameters — later parameters inside a member body", () => {
  // a `,` re-arms member start inside a parameter list too, so the member
  // key rules must not look through the paren to the enclosing body.
  it("an object type's function-typed member", () => {
    const tokens = enrich("type U = { f: (a: string, b: number) => void };");
    expect(type_of(tokens, "a")).toBe("parameter");
    expect(type_of(tokens, "b")).toBe("parameter");
  });

  it("an interface method signature", () => {
    const tokens = enrich("interface I { f(a: string, b: number): void }");
    expect(type_of(tokens, "a")).toBe("parameter");
    expect(type_of(tokens, "b")).toBe("parameter");
  });

  it("an interface member's function type reads its names alike", () => {
    const tokens = enrich("interface I { g: (c: string, d: number) => void }");
    expect(type_of(tokens, "d")).not.toBe("property");
    expect(type_of(tokens, "d")).toBe(type_of(tokens, "c"));
  });

  it("call and construct signatures", () => {
    const tokens = enrich("interface I { new (a: string, b: number): I; (x: A, y: B): void }");
    expect(type_of(tokens, "b")).not.toBe("property");
    expect(type_of(tokens, "b")).toBe(type_of(tokens, "a"));
    expect(type_of(tokens, "y")).not.toBe("property");
    expect(type_of(tokens, "y")).toBe(type_of(tokens, "x"));
  });

  it("an object literal's arrow and method shorthand", () => {
    const tokens = enrich(
      "const o = { f: (a: string, b: number) => a, g(c: string, d: number) { return c } };",
    );
    expect(type_of(tokens, "b")).toBe("parameter");
    expect(type_of(tokens, "d")).toBe("parameter");
  });

  it("a function-typed parameter is not read as a method key", () => {
    const tokens = enrich("const o = { f(a: string, cb: () => void) {} };");
    expect(type_of(tokens, "cb")).toBe("parameter");
  });

  it("keys after a member with a parameter list are still keys", () => {
    const tokens = enrich("const o = { a: 1, f: (x: T, y: U) => x, c: 2 };");
    expect(type_of(tokens, "a")).toBe("property");
    expect(type_of(tokens, "f")).toBe("function");
    expect(type_of(tokens, "c")).toBe("property");
  });
});

describe("TypeScript reclassifier — tuple labels", () => {
  function classify(input, options) {
    const result = make_language(options)(input);
    const out = [];
    for (let i = 0; i < result.tokens.length / 3; i++) {
      const type = result.token_types[result.tokens[i * 3]];
      if (type === "punctuation" || type === "operator") continue;
      out.push(`${input.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2])}:${type}`);
    }
    return out;
  }

  it("labels are properties in every form", () => {
    expect(classify("type Pair = [first: string, second: number];")).toEqual([
      "type:keyword",
      "Pair:type",
      "first:property",
      "string:type",
      "second:property",
      "number:type",
    ]);
    expect(classify("type Opt = [a: string, b?: number];")).toEqual([
      "type:keyword",
      "Opt:type",
      "a:property",
      "string:type",
      "b:property",
      "number:type",
    ]);
    expect(classify("type Rest = [head: string, ...tail: number[]];")).toEqual([
      "type:keyword",
      "Rest:type",
      "head:property",
      "string:type",
      "tail:property",
      "number:type",
    ]);
    expect(classify("interface Span { range: [start: number, end: number]; }")).toEqual([
      "interface:keyword",
      "Span:class_name",
      "range:property",
      "start:property",
      "number:type",
      "end:property",
      "number:type",
    ]);
  });

  it("a rest parameter's tuple labels are properties, the parameter stays a parameter", () => {
    expect(classify("function f(...args: [name: string, age: number]) {}")).toEqual([
      "function:keyword",
      "f:function",
      "args:parameter",
      "name:property",
      "string:type",
      "age:property",
      "number:type",
    ]);
  });

  it("an unlabelled tuple keeps every element a type", () => {
    expect(classify("type Plain = [string, number];")).toEqual([
      "type:keyword",
      "Plain:type",
      "string:type",
      "number:type",
    ]);
  });

  it("a tuple inside a function type's parameter list", () => {
    expect(classify("type Fn = (x: [a: string, b: number]) => void;")).toEqual([
      "type:keyword",
      "Fn:function",
      "x:parameter",
      "a:property",
      "string:type",
      "b:property",
      "number:type",
      "void:keyword",
    ]);
  });

  it("a function-typed element in an object type is a label, not a method", () => {
    const tokens = enrich("type X = { x: [a: string, cb: () => void] };");
    expect(type_of(tokens, "a")).toBe("property");
    expect(type_of(tokens, "cb")).toBe("property");
  });

  it("an index signature's key is not a label", () => {
    expect(type_of(enrich("interface I { [k: string]: V }"), "k")).toBe("identifier");
    expect(type_of(enrich("interface I {\n  a: string\n  [k: string]: V\n}"), "k")).toBe(
      "identifier",
    );
    expect(type_of(enrich("class C { static [k: string]: V; }"), "k")).toBe("identifier");
    // but a tuple in its value type has labels.
    expect(type_of(enrich("type T = { [k: string]: [a: V] };"), "a")).toBe("property");
    // and a tuple closing onto a conditional type's colon is still a tuple.
    expect(type_of(enrich("type U = { x: A extends B ? [a: V] : C };"), "a")).toBe("property");
  });

  it("a conditional type inside a tuple keeps its branches types", () => {
    expect(classify("type K = [T extends U ? X : Y];")).toEqual([
      "type:keyword",
      "K:type",
      "T:type",
      "extends:keyword",
      "U:type",
      "X:type",
      "Y:type",
    ]);
  });

  it("labels are identifiers when property is not in the fidelity allowlist", () => {
    const tokens = classify("type P = { k: [a: string, b: number] };", { fidelity: ["type"] });
    expect(tokens).toEqual([
      "type:keyword",
      "P:type",
      "k:identifier",
      "a:identifier",
      "string:type",
      "b:identifier",
      "number:type",
    ]);
  });
});

describe("TypeScript reclassifier — parameter properties", () => {
  it("an accessibility modifier leaves the name a parameter", () => {
    const tokens = enrich("class A { constructor(public name: string) {} }");
    expect(type_of(tokens, "public")).toBe("keyword");
    expect(type_of(tokens, "name")).toBe("parameter");
  });

  it("stacked modifiers are stepped over together", () => {
    const tokens = enrich("class A { constructor(private readonly id: number) {} }");
    expect(type_of(tokens, "private")).toBe("keyword");
    expect(type_of(tokens, "readonly")).toBe("keyword");
    expect(type_of(tokens, "id")).toBe("parameter");
  });

  it("override and protected reach the name", () => {
    const tokens = enrich("class A { constructor(protected override x: T) {} }");
    expect(type_of(tokens, "x")).toBe("parameter");
  });

  it("mixes with plain parameters and rest elements across chunks", () => {
    const tokens = enrich(
      "class A { constructor(public readonly a: string, b: number, ...rest: T[]) {} }",
    );
    expect(type_of(tokens, "a")).toBe("parameter");
    expect(type_of(tokens, "b")).toBe("parameter");
    expect(type_of(tokens, "rest")).toBe("parameter");
  });

  it("a modifier on a defaulted parameter property still reaches the name", () => {
    const tokens = enrich('class A { constructor(public greeting: string = "hi") {} }');
    expect(type_of(tokens, "greeting")).toBe("parameter");
  });

  it("a parameter named after a modifier does not promote its annotation", () => {
    const tokens = enrich("function f(readonly: string) {}");
    expect(type_of(tokens, "readonly")).toBe("keyword");
    expect(type_of(tokens, "string")).toBe("type");
  });

  it("accessor words as parameter names leave their annotations alone", () => {
    const tokens = enrich("function f(get: string, set: number) {}");
    expect(type_of(tokens, "string")).toBe("type");
    expect(type_of(tokens, "number")).toBe("type");
  });

  it("modifiers on a method parameter reach the name too", () => {
    const tokens = enrich("class A { m(public x: T) {} }");
    expect(type_of(tokens, "x")).toBe("parameter");
  });
});
