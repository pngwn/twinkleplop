// Single-upgrade invariant check for the TypeScript pipeline.
//
// The architectural principle: each token has at most ONE valid upgrade.
// If two claim producers emit different target type names for the same
// token, they disagree about what that token is — and the fact that
// precedence picks a winner shouldn't let us forget that the design has
// ambiguity in it.
//
// This test runs every claim producer INDEPENDENTLY against each corpus
// input's base token stream and reports any position where two passes
// emit claims with different type names. Zero conflicts = the invariant
// holds. Nonzero conflicts = passes are fighting and the winner is only
// determined by precedence.
//
// The corpus is small (one case per known conflict shape) because we're
// measuring whether conflicts exist at all, not enumerating every trigger.

import { describe, it, expect } from "vitest";
import {
	collect_claims_per_pass,
	find_claim_conflicts,
	tokenize,
} from "@twinkleplop/core";
import { grammar, reclassifiers } from "./index.js";

// cases that historically required precedence to resolve. listed here so
// the conflict count captured by the snapshot is meaningful per-case
// rather than a single aggregated number.
const corpus: { name: string; input: string }[] = [
	// interface member with function-type value — classic triple-overlap
	// case: function_variable_rules claims function, claim_property_scope
	// claims property, TPP claims identifier (annotation demote).
	{
		name: "interface member with function-type",
		input: "interface I { cb: () => X; }",
	},
	// class field with function-type value — fn_var overclaims function,
	// TPP emits identifier claim to override.
	{
		name: "class field with function-type",
		input: "class C { handler: () => void; }",
	},
	// function param with function-type — fn_var overclaims, TPP overrides.
	{
		name: "function param with function-type",
		input: "function f(cb: (x: T) => U) {}",
	},
	// object literal method shorthand — fn_var claims function, property
	// pass claims property. function wins by precedence. both passes
	// target the same token from different angles.
	{
		name: "object method shorthand",
		input: "const o = { foo: (x, y) => x + y };",
	},
	// no expected conflicts — pure data property.
	{
		name: "pure object-literal property",
		input: "const o = { a: 1, b: 2 };",
	},
	// no expected conflicts — bare class field.
	{
		name: "bare class field",
		input: "class C { x: T = 1; }",
	},
	// no expected conflicts — bare interface member.
	{
		name: "bare interface member",
		input: "interface I { x: T; }",
	},
];

describe("TypeScript reclassifier — claim conflict diagnostic", () => {
	for (const { name, input } of corpus) {
		it(`${name}`, () => {
			const raw = tokenize(input, grammar);
			const collected = collect_claims_per_pass(input, raw, reclassifiers);
			const conflicts = find_claim_conflicts(input, raw, collected);
			// render as concise strings so snapshots stay readable.
			const rendered = conflicts.map(
				(c) =>
					`"${c.value}" → ${c.contenders
						.map((e) => `pass${e.pass_index}=${e.type_name}`)
						.join(" / ")}`,
			);
			expect(rendered).toMatchSnapshot();
		});
	}
});
