// Rust reclassifier rules.
//
// Rewrites identifier tokens that appear in function-call position to the
// `function` token type. This gives themes a hook to color call sites
// differently from plain identifiers.
//
//   foo()           → foo becomes `function`
//   self.method()   → method becomes `function`
//   Vec::new()      → new becomes `function`
//   println!()      → println stays `identifier` (macro `!` is separate)
//
// Also rewrites `<` / `>` / `>>` from `operator` to `punctuation` when they
// delimit type-position generics (Option<T>, fn foo<'a>, impl<T>, Foo::<U>).
//
// Finally, extends a lifetime token forward to absorb an immediately-
// following identifier (the referenced type), so `&'a str` yields one
// `lifetime` token spanning `a str`, one `punctuation` token for `'`, and
// one `operator` token for `&`.

import {
	always,
	any_of,
	balanced_parens,
	make_token_view,
	promote_by_text_set,
	promote_pascal_case,
	rewrite_types,
	seq,
	tag,
	type,
} from "@twinkleplop/core";
import type {
	LanguagePipeline,
	Reclassifier,
	TokenizeResult,
} from "@twinkleplop/core";

import { BOOLEAN_LITERALS, PRIMITIVE_TYPES } from "./grammar.js";

// restoration passes. the grammar emits every name-like token as
// `identifier`; these layer back the distinctions it used to make at lex
// time, in an order that avoids overlap.
//
// booleans (`true`, `false`) are all-lowercase so they don't overlap with
// PascalCase promotion. PRIMITIVE_TYPES are also all-lowercase. pascal_case
// runs last and catches user-defined types (Vec, String, Option, …).
export const promote_rust_booleans: Reclassifier = promote_by_text_set(
	"identifier",
	"boolean",
	BOOLEAN_LITERALS,
);

export const promote_rust_primitive_types: Reclassifier = promote_by_text_set(
	"identifier",
	"class_name",
	PRIMITIVE_TYPES,
);

export const promote_rust_pascal_case: Reclassifier = promote_pascal_case(
	"identifier",
	"class_name",
);

// an identifier immediately followed by `(` is a function call. using
// balanced_parens for the trailing `(` lets the rule tolerate punctuation
// coalescing (e.g. `();` as one punctuation token in `foo();`). also covers
// macros (`println!()`), generic function declarations (`fn foo<'a>(...)`),
// and turbofish calls (`collect::<Vec<T>>()`).
const paren_call = balanced_parens("(", ")");
const function_call_rules = [
	{
		anchor: "identifier",
		when: any_of(
			seq(paren_call),
			seq(type("builtin", ["!"]), paren_call),
			seq(balanced_parens("<", ">"), paren_call),
			seq(type("punctuation", ["::"]), balanced_parens("<", ">"), paren_call),
		),
		rewrite: "function",
	},
];

// keywords that, when immediately preceding `<`, signal a generic parameter
// list rather than a comparison operator:
//   impl<T>, for<'a>, fn foo<T>, etc.
const GENERIC_LEADING_KEYWORDS = new Set(["impl", "for"]);

// keywords that introduce a name whose `<` opens a generic parameter list:
//   fn foo<T>, impl<T> Trait<T>, fn foo (when foo is an identifier).
const GENERIC_NAME_LEADING_KEYWORDS = new Set(["fn", "impl", "for"]);

// rewrites angle brackets in type-position generics from `operator` to
// `punctuation`. invoked as a custom reclassifier (not via rewrite_types)
// because matching requires depth tracking across arbitrary tokens between
// the opening `<` and its matching `>` / `>>`.
const reclassify_generics = (): Reclassifier => {
	return (input: string, result: TokenizeResult): TokenizeResult => {
		const tokens = new Uint32Array(result.tokens);
		const token_types = result.token_types.slice();

		const operator_id = token_types.indexOf("operator");
		const punctuation_id = token_types.indexOf("punctuation");
		const class_name_id = token_types.indexOf("class_name");
		const keyword_id = token_types.indexOf("keyword");
		const identifier_id = token_types.indexOf("identifier");

		if (operator_id === -1 || punctuation_id === -1) {
			return { tokens, token_types };
		}

		const view = make_token_view(input, tokens, token_types);
		const count = view.count;

		// check if the `<` at index i likely opens a type-generics block.
		const is_type_position = (i: number): boolean => {
			const prev = view.prev_non_trivia(i - 1);
			if (prev < 0) return false;
			const prev_type = view.kind_of(prev);

			if (prev_type === class_name_id) return true;

			if (prev_type === punctuation_id && view.text_of(prev) === "::") {
				return true;
			}

			if (prev_type === keyword_id) {
				return GENERIC_LEADING_KEYWORDS.has(view.text_of(prev));
			}

			if (prev_type === identifier_id) {
				const prev_prev = view.prev_non_trivia(prev - 1);
				if (prev_prev < 0) return false;
				if (view.kind_of(prev_prev) !== keyword_id) return false;
				return GENERIC_NAME_LEADING_KEYWORDS.has(view.text_of(prev_prev));
			}

			return false;
		};

		// scan forward from just after a `<` at `start` looking for a matching
		// `>` / `>>`, counting nesting via `<` operator tokens. returns the
		// index of the closing token, or -1 if bailing out.
		const find_close = (start: number): number => {
			let depth = 1;
			for (let i = start + 1; i < count; i++) {
				if (view.kind_of(i) !== operator_id) continue;
				const value = view.text_of(i);

				if (value === "<") {
					depth++;
				} else if (value === ">") {
					depth--;
					if (depth === 0) return i;
				} else if (value === ">>") {
					depth -= 2;
					if (depth <= 0) return i;
				} else if (
					value === ">=" ||
					value === ">>=" ||
					value === "<=" ||
					value === "<<" ||
					value === "<<="
				) {
					return -1;
				}
			}
			return -1;
		};

		for (let i = 0; i < count; i++) {
			if (view.kind_of(i) !== operator_id) continue;
			if (view.text_of(i) !== "<") continue;
			if (!is_type_position(i)) continue;

			const close_idx = find_close(i);
			if (close_idx === -1) continue;

			for (let j = i; j <= close_idx; j++) {
				if (view.kind_of(j) !== operator_id) continue;
				const v = view.text_of(j);
				if (v === "<" || v === ">" || v === ">>") {
					tokens[j * 3] = punctuation_id;
				}
			}

			i = close_idx;
		}

		return { tokens, token_types };
	};
};

// merges a lifetime token with the immediately-following identifier /
// class_name token into one lifetime-typed token. applies only when the
// two tokens are directly adjacent in the stream (possibly separated by
// source-level whitespace, which is tokenless, but not by any other token).
//
// refuses to merge if the candidate identifier is itself immediately
// followed by a `(` punctuation, i.e. it's a function call target. this
// keeps the pass order-independent with respect to `function_call_rules`:
// whether function_call runs first (turning the identifier into `function`,
// which isn't a type token and wouldn't be absorbed anyway) or lifetime
// extension runs first (seeing the identifier but refusing because of the
// trailing paren), the result is the same.
const extend_lifetime_over_type = (): Reclassifier => {
	return (input: string, result: TokenizeResult): TokenizeResult => {
		const old_tokens = result.tokens;
		const token_types = result.token_types.slice();
		const count = old_tokens.length / 3;

		const lifetime_id = token_types.indexOf("lifetime");
		const identifier_id = token_types.indexOf("identifier");
		const class_name_id = token_types.indexOf("class_name");
		const punctuation_id = token_types.indexOf("punctuation");

		if (lifetime_id === -1) {
			return { tokens: new Uint32Array(old_tokens), token_types };
		}

		const is_type_token = (id: number): boolean =>
			id === identifier_id || id === class_name_id;

		const starts_with_open_paren = (i: number): boolean => {
			if (i >= count) return false;
			if (old_tokens[i * 3] !== punctuation_id) return false;
			return input.charCodeAt(old_tokens[i * 3 + 1]) === 0x28; // '('
		};

		const out: number[] = [];
		for (let i = 0; i < count; i++) {
			const type_id = old_tokens[i * 3];
			const start = old_tokens[i * 3 + 1];
			const end = old_tokens[i * 3 + 2];

			if (
				type_id === lifetime_id &&
				i + 1 < count &&
				is_type_token(old_tokens[(i + 1) * 3]) &&
				!starts_with_open_paren(i + 2)
			) {
				const next_end = old_tokens[(i + 1) * 3 + 2];
				out.push(lifetime_id, start, next_end);
				i++;
				continue;
			}

			out.push(type_id, start, end);
		}

		return { tokens: new Uint32Array(out), token_types };
	};
};

// order: restoration passes run first so downstream passes see a stream
// that already has `boolean`, primitive-type `class_name`, and PascalCase
// `class_name` classified. then the correctness `reclassify_generics` can
// recognise type-position `<` by looking back at `class_name` tokens. then
// fidelity passes for function calls and lifetime absorption.
//
// extend_lifetime_over_type now refuses to absorb an identifier that is
// itself followed by `(`, so it commutes with function_call_rules — either
// ordering produces the same output.
// reclassify_generics is a correctness pass — it rewrites operator `<`/`>`
// to punctuation at type-generic boundaries so downstream consumers can
// distinguish generic brackets from comparison operators. it runs at every
// fidelity.
export const reclassifiers: LanguagePipeline = [
	tag(promote_rust_booleans, ["boolean"]),
	tag(promote_rust_primitive_types, ["class_name"]),
	tag(promote_rust_pascal_case, ["class_name"]),
	always(reclassify_generics(), "type_claim"),
	tag(rewrite_types(function_call_rules, { trivia: ["comment"] }), [
		"function",
	]),
	tag(extend_lifetime_over_type(), ["lifetime"], "shape"),
];
