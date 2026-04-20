// Order-independence regression tests for the JavaScript pipeline.
// See typescript/src/order_independence.test.ts for the design rationale.

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
	"var f = (a, (b, c)) => a",
	// object literals
	"const o = { a: 1, b: 2 };",
	"const obj = { foo: (x, y) => x + y };",
	"const obj = { run: function() {} };",
	"fn({ a: 1 })",
	// class bodies
	"class C { x = 1; method() {} }",
	"class C extends D { x = 1; }",
	"class Foo { } new Foo()",
	"class Foo extends Bar { }",
	"new pkg.util.Foo()",
	"if (x instanceof Foo) {}",
	// labels / ternary (NOT properties)
	"label: for (;;) { break label; }",
	"const x = a ? b : c;",
	// tagged templates
	"html`<div>${x}</div>`",
	"css`.foo { color: ${x}; }`",
];

describe("JavaScript reclassifier — order-independence invariant", () => {
	const perms = permute_claim_producers(reclassifiers);

	it("pipeline contains multiple claim-producer permutations", () => {
		expect(perms.length).toBeGreaterThan(1);
	});

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
