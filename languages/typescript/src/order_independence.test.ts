// Order-independence regression tests for the TypeScript pipeline.
//
// The claim-based architecture invariant: within a contiguous batch of
// claim-producing reclassifiers, permuting their order MUST produce
// identical final classification. Any violation means a pass's behavior
// depends on side effects from a sibling pass rather than on claims +
// precedence — the exact coupling the refactor removed.
//
// How it works: permute_claim_producers walks the pipeline, identifies
// each stretch of adjacent claim-producing entries, and generates every
// permutation of each stretch. Non-claim entries (mutating passes, embed
// passes) stay fixed in place — the architecture never promised order-
// independence across them. For a pipeline with one claim segment of N
// claim producers we get N! permutations.
//
// Comparison is by type NAME, not numeric id: two pipelines can emit the
// same semantic classification while the token_types array ends up with
// the same names at different indices (names are appended in call order).
// tokens_to_named normalizes over that.

import { describe, it, expect } from "vitest";
import {
	create_language,
	permute_claim_producers,
	tokens_to_named,
} from "@twinkleplop/core";
import { grammar, reclassifiers } from "./index.js";

const corpus: string[] = [
	// arrow + function variable
	"const foo = () => 1",
	"const add = (a, b) => a + b",
	"const double = x => x * 2",
	"const fetchData = async () => 1",
	"const baz = function() { return 0; }",
	// object literals
	"const o = { a: 1, b: 2 };",
	"const obj = { foo: (x, y) => x + y };",
	"let { a: b } = obj;",
	"let { a: b = c } = obj;",
	// class bodies
	"class C { x: T; }",
	"class C { x: T = 1; }",
	"class C extends D { x: T = 1; }",
	"class C { handler: () => void; }",
	"class C { method() { return 1; } x: number; }",
	"class Repo<T> extends Base<T> implements IFace { x: User; }",
	// interface bodies
	"interface I { x: T; y: U; }",
	"interface I { x: number; y: string; }",
	"interface I extends J { x: T; }",
	"interface I { readonly x: T; }",
	"interface I { method(): T; x: number; }",
	"interface I { x?: T; }",
	"interface Repository { find(id: number): User; save(user: User): void; }",
	"interface I { cb: () => X; }",
	"interface I { [key]: T; field: T; }",
	// function params / return types
	"function foo(x: User) { return x; }",
	"function foo(): Baz { return null; }",
	"function f(cb: (x: T) => U) {}",
	"function make(): Foo { return new FooImpl(); }",
	// type annotations on variables
	"let x: MyType = 1;",
	"let p: Promise<Bar> = fetch();",
	"const f: (a: T) => U = null as any;",
	"let o: { key: Val } = x;",
	"let a = 1, b: Foo = 2;",
	// type aliases
	"type X = A | B;",
	"type Response = Success | Failure;",
	"type Box<T> = { value: T };",
	"type C<T> = T extends string ? A : B;",
	// cast operators
	"const y = x as MyType;",
	"const y = x satisfies Shape;",
	"const y = x as MyType + 1;",
	// ternary (not property)
	"const r = a ? b : c;",
	// new / instanceof
	"const e = new Foo();",
	"const d = new pkg.util.Foo();",
	"if (x instanceof Foo) { }",
];

describe("TypeScript reclassifier — order-independence invariant", () => {
	const perms = permute_claim_producers(reclassifiers);

	it("pipeline contains multiple claim-producer permutations", () => {
		// sanity: if this is 1 the test below is meaningless.
		expect(perms.length).toBeGreaterThan(1);
	});

	// pre-build languages for each permutation so we're not paying the
	// pipeline-construction cost inside each test's inner loop.
	const languages = perms.map((p) => create_language(grammar, p)());

	for (const input of corpus) {
		const label = input.length > 60 ? `${input.slice(0, 57)}...` : input;
		it(`produces identical classification across permutations: "${label}"`, () => {
			const baseline = tokens_to_named(languages[0](input), input);
			for (let i = 1; i < languages.length; i++) {
				const alt = tokens_to_named(languages[i](input), input);
				expect(alt).toEqual(baseline);
			}
		});
	}
});
