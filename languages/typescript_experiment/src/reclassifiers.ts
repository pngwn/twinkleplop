// experimental TypeScript reclassifier pipeline. explores whether moving the
// class-field / interface-member disambiguation into grammar states lets us
// shrink the post-pass weight.
//
// differences from @twinkleplop/typescript:
//
// 1. class-field exclusion rule is DROPPED. the grammar emits `{` / `}` of a
//    class body as `class_open` / `class_close` tokens instead of punctuation,
//    so the property-promotion rule's `before: type("punctuation", ["{"])`
//    no longer fires for class bodies. first-member class fields stay as
//    identifier without any reclassifier help. (modifier-preceded class
//    fields — `readonly x: T` — still need exclusion work: see known limits
//    below.)
//
// 2. interface_member_promoter is REPLACED by an `interface_open`-anchored
//    promotion rule. the stateful token walker becomes a few pattern rules
//    keyed on the `interface_open` marker that class_header -> interface_body
//    transition emits.
//
// 3. a final type-rewrite pass normalises `class_open` / `class_close` /
//    `interface_open` / `interface_close` back to `punctuation` so the final
//    stream matches the shape consumers (highlighters, tests) expect.
//
// known limits (kept honest for the comparison writeup):
//   - `readonly x: T` inside a class body still gets promoted to `property`
//     because the property-promotion rule's modifier branch fires and we
//     haven't differentiated the modifier keyword per context.
//   - interface `IDENT : TYPE` where TYPE is a `type` token (e.g. `number`)
//     still requires the simplified interface-member promotion; bare
//     identifier types are caught by the same rule.

import {
	any_of,
	balanced_parens,
	embed_interleaved,
	optional,
	rewrite_types,
	seq,
	type,
} from "@twinkleplop/core";
import type { Reclassifier } from "@twinkleplop/core";

import { scan_tagged_template } from "@twinkleplop/javascript";

// ---------------------------------------------------------------------------
// function-variable detection (trimmed from the JS pipeline)
//
// keeps: arrow/function-expression promotion, label exclusion, type-annotation
//        exclusion, generic property promotion.
// drops: class-field lookbehind exclusion (grammar's class_open marker makes
//        the property-promotion rule skip class bodies naturally).
// ---------------------------------------------------------------------------

const function_expression = any_of(
	type("keyword", "function"),
	seq(type("keyword", "async"), type("keyword", "function")),
);

const arrow_function = any_of(
	seq(balanced_parens("(", ")"), type("operator", "=>")),
	seq(
		type("keyword", "async"),
		balanced_parens("(", ")"),
		type("operator", "=>"),
	),
	seq(type("identifier"), type("operator", "=>")),
	seq(type("keyword", "async"), type("identifier"), type("operator", "=>")),
);

export const function_variable_rules = [
	{
		anchor: "identifier",
		when: seq(
			type("operator", ["=", ":"]),
			any_of(function_expression, arrow_function),
		),
		rewrite: "function",
	},
	// label exclusion
	{
		anchor: "identifier",
		when: seq(
			type("operator", [":"]),
			type("keyword", ["for", "while", "do", "if", "switch", "try", "with"]),
		),
		rewrite: "identifier",
	},
	// type-annotation exclusion (still needed inside function params, type
	// aliases, and generic type parameters — contexts where the grammar has
	// no enclosing class/interface frame to lean on).
	{
		anchor: "identifier",
		when: any_of(
			seq(type("operator", [":", "?:"]), type("type")),
			seq(
				type("operator", [":", "?:"]),
				type("identifier"),
				type("punctuation", [";"]),
			),
		),
		rewrite: "identifier",
	},
	// property promotion for object literals. class_open / interface_open
	// are NOT `punctuation`, so this rule naturally skips class bodies at the
	// first-member level. the modifier branch (readonly/public/private/etc.)
	// is dropped here — interface members with modifiers are handled by
	// interface_member_rules below, and class members stay as identifier.
	{
		anchor: "identifier",
		before: type("punctuation", ["{", ","]),
		when: seq(type("operator", [":", "?:"])),
		rewrite: "property",
	},
];

// ---------------------------------------------------------------------------
// interface member promotion — anchored on interface_open / ; inside an
// interface body. simpler than the old stateful walker since the body's
// boundary is marked by the grammar.
// ---------------------------------------------------------------------------

const interface_member_rules = [
	{
		anchor: "identifier",
		before: any_of(
			type("interface_open"),
			type("punctuation", [";"]),
			type("keyword", ["readonly"]),
		),
		when: seq(type("operator", [":", "?:"])),
		rewrite: "property",
	},
];

// ---------------------------------------------------------------------------
// token-type normalisation — rewrite the grammar-internal `class_open` etc.
// back to `punctuation` so consumers see the same final shape.
// ---------------------------------------------------------------------------

const normalise_structural_punct: Reclassifier = (_input, result) => {
	const tokens = result.tokens;
	const token_types = result.token_types;
	const class_open_id = token_types.indexOf("class_open");
	const class_close_id = token_types.indexOf("class_close");
	const interface_open_id = token_types.indexOf("interface_open");
	const interface_close_id = token_types.indexOf("interface_close");
	let punct_id = token_types.indexOf("punctuation");
	if (punct_id === -1) {
		punct_id = token_types.length;
		token_types.push("punctuation");
	}
	const count = tokens.length / 3;

	// rewrite structural open/close tokens to punctuation. when a rewrite
	// makes the token adjacent same-type to the previous output, merge — but
	// ONLY if the merge was caused by the rewrite (either this token or the
	// previous was rewritten). pre-existing adjacent same-type punctuation
	// tokens (e.g. from embed_interleaved emitting `>` + `${` in tagged HTML
	// templates) must stay separate to match the original tokenizer's output.
	const out = new Uint32Array(tokens.length);
	let write = 0;
	let last_was_rewritten = false;
	for (let i = 0; i < count; i++) {
		const t = tokens[i * 3];
		const s = tokens[i * 3 + 1];
		const e = tokens[i * 3 + 2];
		const is_structural =
			t === class_open_id ||
			t === class_close_id ||
			t === interface_open_id ||
			t === interface_close_id;
		const new_type = is_structural ? punct_id : t;
		const can_merge =
			(is_structural || last_was_rewritten) &&
			write > 0 &&
			out[write - 3] === new_type &&
			out[write - 1] === s;
		if (can_merge) {
			out[write - 1] = e;
			last_was_rewritten = is_structural || last_was_rewritten;
		} else {
			out[write] = new_type;
			out[write + 1] = s;
			out[write + 2] = e;
			write += 3;
			last_was_rewritten = is_structural;
		}
	}
	return { tokens: out.slice(0, write), token_types };
};

// ---------------------------------------------------------------------------
// pipeline
// ---------------------------------------------------------------------------

export { scan_tagged_template };

export const reclassifiers: Reclassifier[] = [
	rewrite_types(function_variable_rules, { trivia: ["comment"] }),
	rewrite_types(interface_member_rules, { trivia: ["comment"] }),
	embed_interleaved({ scan: scan_tagged_template }),
	normalise_structural_punct,
];
