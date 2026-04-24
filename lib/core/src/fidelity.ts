// shared fidelity reclassifiers.
//
// these are the post-tokenization building blocks that promote low-fidelity
// identifier tokens to higher-fidelity types (`function`, `class_name`,
// `builtin`, `boolean`, `type`, etc.) using simple text or case checks.
// before these existed each language re-implemented them inline; they are
// factored here so a language's reclassifier pipeline is just a few calls
// plus any language-specific stateful passes.
//
// every helper returns a `Reclassifier`: `(input, result) -> result`. they
// mutate the result in place and return it — consistent with the other
// reclassifiers in this package — but allocate a fresh `token_types` array
// because they frequently add new type entries.

import { rewrite_types, seq, type, any_of, balanced_parens } from "./reclassifier";
import type {
	Reclassifier,
	RewriteOptions,
	TokenizeResult,
	TokenPatternSpec,
} from "./types";

// ---------------------------------------------------------------------------
// promote_by_text_set
// ---------------------------------------------------------------------------
//
// rewrites tokens of `source_type` whose source text appears in `text_set`
// to `target_type`. does not need a Set — iterables are fine — but a Set
// is what callers almost always have. allocates the target_type entry in
// the token_types array if it's not already present.
//
// common uses: Python builtin types (list, dict, …) → builtin; Rust
// PRIMITIVE_TYPES (i32, u64, …) → class_name; JS / Python / Rust boolean
// literals → boolean.

export function promote_by_text_set(
	source_type: string,
	target_type: string,
	text_set: Iterable<string>,
): Reclassifier {
	const set = text_set instanceof Set ? text_set : new Set(text_set);
	return (input: string, result: TokenizeResult): TokenizeResult => {
		const { tokens, token_types } = result;
		const source_id = token_types.indexOf(source_type);
		if (source_id < 0) return result;
		let target_id = token_types.indexOf(target_type);
		if (target_id < 0) {
			target_id = token_types.length;
			token_types.push(target_type);
		}
		const n = tokens.length / 3;
		for (let i = 0; i < n; i++) {
			if (tokens[i * 3] !== source_id) continue;
			const s = tokens[i * 3 + 1];
			const e = tokens[i * 3 + 2];
			if (set.has(input.slice(s, e))) {
				tokens[i * 3] = target_id;
			}
		}
		return result;
	};
}

// ---------------------------------------------------------------------------
// promote_pascal_case
// ---------------------------------------------------------------------------
//
// rewrites tokens of `source_type` whose first character is ASCII uppercase
// (A-Z) to `target_type`. this mirrors the grammar-time case dispatch that
// Python and Rust historically had: an identifier starting with an uppercase
// letter is almost certainly a type name (class / struct / enum / trait).
//
// the check is a single char-code compare per identifier token. for
// non-ASCII-aware classification the caller can post-process further.

const ASCII_UPPER_MIN = 0x41;
const ASCII_UPPER_MAX = 0x5a;

export function promote_pascal_case(
	source_type: string,
	target_type: string,
): Reclassifier {
	return (input: string, result: TokenizeResult): TokenizeResult => {
		const { tokens, token_types } = result;
		const source_id = token_types.indexOf(source_type);
		if (source_id < 0) return result;
		let target_id = token_types.indexOf(target_type);
		if (target_id < 0) {
			target_id = token_types.length;
			token_types.push(target_type);
		}
		const n = tokens.length / 3;
		for (let i = 0; i < n; i++) {
			if (tokens[i * 3] !== source_id) continue;
			const s = tokens[i * 3 + 1];
			const e = tokens[i * 3 + 2];
			const first = input.charCodeAt(s);
			if (first < ASCII_UPPER_MIN || first > ASCII_UPPER_MAX) continue;
			// reject all-upper multi-char names (`MAX_SIZE`, `PI`). these are
			// UPPER_SNAKE constants by convention, not PascalCase types. the
			// constant promoter (promote_by_upper_snake_case) is the right
			// home for them. single-char uppercase (generic params `T`, `X`)
			// still promote so languages that treat them as types don't lose
			// coverage.
			if (e - s > 1) {
				let has_lower = false;
				for (let k = s; k < e; k++) {
					const c = input.charCodeAt(k);
					if (c >= 0x61 && c <= 0x7a) {
						has_lower = true;
						break;
					}
				}
				if (!has_lower) continue;
			}
			tokens[i * 3] = target_id;
		}
		return result;
	};
}

// ---------------------------------------------------------------------------
// promote_by_upper_snake_case
// ---------------------------------------------------------------------------
//
// rewrites tokens of `source_type` whose source text is UPPER_SNAKE_CASE to
// `target_type`. the predicate is: first char in [A-Z], every char in
// [A-Z0-9_], length >= 2. single-char uppercase identifiers (like generic
// type parameters `T`) are left alone so the pascal_case pass can claim them
// as class_name.
//
// common use: promoting convention-declared constants — `MAX_VALUE`, `PI`,
// `HTTP_STATUS` — to `constant`. pair with pascal_case ordering so the two
// predicates don't overlap: this pass claims `MAX_VALUE`, pascal_case then
// claims `MaxValue`.

const ASCII_DIGIT_MIN = 0x30;
const ASCII_DIGIT_MAX = 0x39;
const ASCII_UNDERSCORE = 0x5f;

function is_upper_snake_char(code: number): boolean {
	return (
		(code >= ASCII_UPPER_MIN && code <= ASCII_UPPER_MAX) ||
		(code >= ASCII_DIGIT_MIN && code <= ASCII_DIGIT_MAX) ||
		code === ASCII_UNDERSCORE
	);
}

export function promote_by_upper_snake_case(
	source_type: string,
	target_type: string,
): Reclassifier {
	return (input: string, result: TokenizeResult): TokenizeResult => {
		const { tokens, token_types } = result;
		const source_id = token_types.indexOf(source_type);
		if (source_id < 0) return result;
		let target_id = token_types.indexOf(target_type);
		if (target_id < 0) {
			target_id = token_types.length;
			token_types.push(target_type);
		}
		const n = tokens.length / 3;
		for (let i = 0; i < n; i++) {
			if (tokens[i * 3] !== source_id) continue;
			const s = tokens[i * 3 + 1];
			const e = tokens[i * 3 + 2];
			if (e - s < 2) continue;
			const first = input.charCodeAt(s);
			if (first < ASCII_UPPER_MIN || first > ASCII_UPPER_MAX) continue;
			let all_ok = true;
			for (let k = s + 1; k < e; k++) {
				if (!is_upper_snake_char(input.charCodeAt(k))) {
					all_ok = false;
					break;
				}
			}
			if (all_ok) tokens[i * 3] = target_id;
		}
		return result;
	};
}

// ---------------------------------------------------------------------------
// promote_function_calls
// ---------------------------------------------------------------------------
//
// rewrites identifier tokens that appear in function-call position to
// `function`. the simplest variant — `foo()` — is a single rewrite_types
// rule; extras handle language-specific call shapes.
//
//   plain:       ident (…)              — javascript, python, css
//   macro:       ident !(…)             — rust
//   generic:     ident <…>(…)           — rust (generic fn call)
//   turbofish:   ident ::<…>(…)         — rust
//   css-simple:  ident(                 — css emits `(` as its own token
//                                         more often, so pattern is tighter
//
// callers opt into variants via `variants`. returning one reclassifier
// means the call-site rewrite is a single rewrite_types pass.

export interface FunctionCallVariants {
	plain?: boolean;
	macro?: boolean;
	generic_fn?: boolean;
	turbofish?: boolean;
}

export function promote_function_calls(
	source_type = "identifier",
	target_type = "function",
	variants: FunctionCallVariants = { plain: true },
	options?: RewriteOptions,
): Reclassifier {
	const when_branches: TokenPatternSpec[] = [];
	const paren_call = balanced_parens("(", ")");
	if (variants.plain) {
		when_branches.push(paren_call);
	}
	if (variants.macro) {
		when_branches.push(seq(type("builtin", ["!"]), paren_call));
	}
	if (variants.generic_fn) {
		when_branches.push(seq(balanced_parens("<", ">"), paren_call));
	}
	if (variants.turbofish) {
		when_branches.push(
			seq(
				type("punctuation", ["::"]),
				balanced_parens("<", ">"),
				paren_call,
			),
		);
	}
	if (when_branches.length === 0) {
		return (_input, result) => result;
	}
	return rewrite_types(
		[
			{
				anchor: source_type,
				when:
					when_branches.length === 1
						? when_branches[0]
						: any_of(...when_branches),
				rewrite: target_type,
			},
		],
		options,
	);
}
