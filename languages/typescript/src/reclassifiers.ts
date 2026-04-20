// TypeScript reclassifiers.
//
// The JavaScript pipeline (function-variable detection, scope-aware property
// claims, tagged-template embedding) still applies. In addition, TypeScript
// runs a `type_position_promoter` that walks the token stream once and
// rewrites identifiers appearing in type position to the `type` token, so
// custom type references (User, Promise, Array, ...) highlight the same as
// built-in types.

import type {
	Claim,
	ClaimFn,
	ClaimingReclassifier,
	LanguagePipeline,
	Reclassifier,
} from "@twinkleplop/core";
import {
	always,
	as_claim_producer,
	embed_interleaved,
	make_token_view,
	promote_by_text_set,
	rewrite_types,
	tag,
} from "@twinkleplop/core";

import {
	claim_property_scope,
	class_name_promoter,
	function_variable_rules,
	promote_boolean_literals,
	promote_call_site_functions,
	scan_tagged_template,
} from "@twinkleplop/javascript";

import { BUILTIN_TYPES } from "./grammar.js";

export {
	claim_property_scope,
	class_name_promoter,
	function_variable_rules,
	promote_boolean_literals,
	promote_call_site_functions,
	scan_tagged_template,
};

// restore the `type` token that the grammar no longer emits directly.
// BUILTIN_TYPES words used to be matched via a keyword() rule emitting
// TOKENS.type; we moved the classification out so consumers can opt in.
export const promote_builtin_types: Reclassifier = promote_by_text_set(
	"identifier",
	"type",
	BUILTIN_TYPES,
);

// ---------------------------------------------------------------------------
// type_position_promoter
// ---------------------------------------------------------------------------
//
// Type position is entered on:
//   - `:` (non-ternary) that introduces a type annotation: after `)` for
//     return type, inside a param list, inside a class/interface body, or
//     after a `let`/`const`/`var` declarator
//   - `as` / `satisfies` keywords
//   - `extends` in interface heads and type-parameter constraints (NOT the
//     class extends value position, which references a super-class value)
//   - `implements` keyword
//   - `<...>` generic argument lists after an identifier / type reference
//   - `type X = ...` right-hand side
//
// Inside type mode, identifiers become `type` unless immediately followed
// by `:` — those are parameter names in a function type `(x: T) => U` or
// property keys in an object type `{ x: T }`.
//
// Known limitations:
//   - Generic type-args in value position (`foo<T>(x)`, `new Map<K,V>()`):
//     the call target stays as identifier/function, but `T`, `K`, `V` are
//     still promoted inside the angle brackets.
//   - Mapped type key/value modifiers (`-readonly`, `+?`) not specially
//     handled — the key and value types still promote correctly.
//   - Complex arrow return types like `(): (x: T) => U => body` use a
//     small heuristic (`=>` after `)` stays in-type) that may misfire in
//     contrived code.
//   - We don't distinguish ternary `?` `:` inside `as`/`satisfies` cleanly
//     — the common shape `x as T` ending at `?` is handled, but a pattern
//     like `(x as T) ? a : b` exits type mode at `)` anyway, so this is
//     fine in practice.

type BraceCtx = "class" | "interface" | "type_lit" | "other";

interface Scope {
	kind: "top" | "paren" | "brace" | "bracket";
	brace_ctx?: BraceCtx;
	qmark: number;
}

type TypeModeKind =
	| "annotation_param"
	| "annotation_var"
	| "annotation_field"
	| "return"
	| "as"
	| "extends_list"
	| "implements_list"
	| "generics"
	| "alias_rhs";

interface TypeMode {
	kind: TypeModeKind;
	entry_paren: number;
	entry_brace: number;
	entry_bracket: number;
	entry_angle: number;
}

// operators that unambiguously mean "value expression, not a type".
const VALUE_OP_TERMINATORS = new Set([
	"+",
	"-",
	"*",
	"/",
	"%",
	"**",
	"==",
	"!=",
	"===",
	"!==",
	"<=",
	">=",
	"&&",
	"||",
	"??",
	"?.",
	"+=",
	"-=",
	"*=",
	"/=",
	"%=",
	"&=",
	"|=",
	"^=",
	"&&=",
	"||=",
	"??=",
	"<<",
	">>",
	">>>",
	"<<=",
	">>=",
	">>>=",
	"**=",
	"++",
	"--",
]);

// statement-starter keywords that terminate any type expression.
const STMT_KEYWORD_TERMINATORS = new Set([
	"return",
	"if",
	"else",
	"for",
	"while",
	"do",
	"switch",
	"case",
	"break",
	"continue",
	"throw",
	"try",
	"catch",
	"finally",
	"function",
	"class",
	"interface",
	"enum",
	"namespace",
	"module",
	"let",
	"const",
	"var",
	"import",
	"export",
	"type",
]);

// keywords that can legitimately be the LAST token of a type expression.
// used by the `{` exit check so return annotations like `(): this {` and
// `(): T | undefined {` correctly terminate type mode at the method body.
const TYPE_TERMINAL_KEYWORDS = new Set([
	"this",
	"void",
	"undefined",
	"null",
	"never",
	"unknown",
	"any",
	"object",
]);

// keywords that reset the in-var-decl flag (start a fresh statement).
const STMT_STARTERS = new Set([
	"if",
	"else",
	"for",
	"while",
	"do",
	"switch",
	"case",
	"break",
	"continue",
	"throw",
	"try",
	"catch",
	"finally",
	"function",
	"class",
	"interface",
	"enum",
	"namespace",
	"module",
	"import",
	"export",
	"return",
]);

// precedence for TPP's type claims. uses the default `type` precedence
// (45), which beats function (30) / property (20) / identifier (0). TPP no
// longer emits claims on annotation anchors — `claim_property_scope` and
// `function_variable_rules` are now each the SOLE owner of their shape
// (scope-aware `:` classification and `=`-assignment respectively), so
// there's no over-claimer for TPP to correct.
const TPP_TYPE_PREC = 45;

const type_position_promoter_fn: ClaimFn = (input, tokens, token_types) => {
	const claims: Claim[] = [];
	const n = tokens.length / 3;
	if (n === 0) return claims;

	const identifier_id = token_types.indexOf("identifier");
	const keyword_id = token_types.indexOf("keyword");
	const punctuation_id = token_types.indexOf("punctuation");
	const operator_id = token_types.indexOf("operator");
	const type_id = token_types.indexOf("type");

	// only run in grammars that emit a `type` token (typescript). plain JS
	// doesn't register this type, so the pass is a no-op there.
	if (type_id < 0) return claims;
	if (
		identifier_id < 0 ||
		keyword_id < 0 ||
		punctuation_id < 0 ||
		operator_id < 0
	) {
		return claims;
	}

	const view = make_token_view(input, tokens, token_types);
	const kind_of = view.kind_of;
	const text_of = view.text_of;
	const is_trivia = view.is_trivia;
	const next_nt = view.next_non_trivia;
	const prev_nt = view.prev_non_trivia;

	let paren_depth = 0;
	let brace_depth = 0;
	let bracket_depth = 0;
	// angle_depth is meaningful only while `mode !== null`.
	let angle_depth = 0;

	const scope_stack: Scope[] = [{ kind: "top", qmark: 0 }];
	const cur_scope = (): Scope => scope_stack[scope_stack.length - 1];

	let in_var_decl = false;

	// state machine for `type IDENT [<...>] =` detection. When we see the
	// `=`, enter alias_rhs mode.
	type AliasState =
		| { kind: "none" }
		| { kind: "saw_type" }
		| { kind: "saw_name"; angle_depth: number };
	let alias_state: AliasState = { kind: "none" };

	let mode: TypeMode | null = null;

	const enter_mode = (kind: TypeModeKind): void => {
		mode = {
			kind,
			entry_paren: paren_depth,
			entry_brace: brace_depth,
			entry_bracket: bracket_depth,
			entry_angle: angle_depth,
		};
	};

	const exit_mode = (): void => {
		mode = null;
		angle_depth = 0;
	};

	const at_entry_depth = (m: TypeMode): boolean =>
		paren_depth === m.entry_paren &&
		brace_depth === m.entry_brace &&
		bracket_depth === m.entry_bracket &&
		angle_depth === m.entry_angle;

	// classify a `{` we're about to enter. returns the brace context.
	const classify_brace = (open_idx: number): BraceCtx => {
		if (mode !== null) return "type_lit";
		const prev = prev_nt(open_idx - 1);
		if (prev < 0) return "other";
		const pk = kind_of(prev);
		const pt = text_of(prev);
		if (pk === operator_id && pt === "=>") return "other";
		if (
			pk === keyword_id &&
			(pt === "else" || pt === "do" || pt === "try" || pt === "finally")
		) {
			return "other";
		}
		if (pk === punctuation_id && pt.endsWith(")")) return "other";

		// walk back through a class/interface header: [kw] NAME [<...>]
		//   [extends (NAME [.NAME]* [<...>])(, NAME ...)*]
		//   [implements ... — only for classes]
		let i = prev_nt(open_idx - 1);
		while (i >= 0) {
			const k = kind_of(i);
			const t = text_of(i);
			if (
				k === identifier_id ||
				k === type_id ||
				(k === punctuation_id && (t === "." || t === ",")) ||
				(k === keyword_id && (t === "extends" || t === "implements"))
			) {
				i = prev_nt(i - 1);
				continue;
			}
			if (k === operator_id && t === ">") {
				// walk back through a balanced <...> group
				let depth = 1;
				i = prev_nt(i - 1);
				while (i >= 0 && depth > 0) {
					const kk = kind_of(i);
					const tt = text_of(i);
					if (kk === operator_id && tt === ">") {
						depth++;
					} else if (kk === operator_id && tt === "<") {
						depth--;
						if (depth === 0) {
							i = prev_nt(i - 1);
							break;
						}
					}
					i = prev_nt(i - 1);
				}
				if (depth !== 0) return "other";
				continue;
			}
			break;
		}
		if (i < 0) return "other";
		if (kind_of(i) === keyword_id) {
			const kw = text_of(i);
			if (kw === "class") return "class";
			if (kw === "interface") return "interface";
		}
		return "other";
	};

	// decide whether a `:` at position idx introduces a type annotation.
	const classify_colon = (idx: number): TypeModeKind | null => {
		const prev = prev_nt(idx - 1);
		if (prev < 0) return null;
		// prev token may be a merged punctuation bundle (e.g. `()`, `]);`);
		// match on the last non-empty char.
		if (kind_of(prev) === punctuation_id) {
			const pt = text_of(prev);
			if (pt.length > 0 && pt[pt.length - 1] === ")") return "return";
		}
		const scope = cur_scope();
		if (scope.kind === "paren") return "annotation_param";
		if (scope.kind === "brace") {
			if (scope.brace_ctx === "class" || scope.brace_ctx === "interface") {
				return "annotation_field";
			}
			return null;
		}
		if (scope.kind === "top" && in_var_decl) return "annotation_var";
		return null;
	};

	// is this `extends` a type-list introducer (interface extends, type
	// parameter constraint) rather than a value reference (class extends
	// SuperClass)?
	const detect_extends_context = (idx: number): boolean => {
		let i = prev_nt(idx - 1);
		while (i >= 0) {
			const k = kind_of(i);
			const t = text_of(i);
			if (
				k === identifier_id ||
				k === type_id ||
				(k === punctuation_id && t === ".")
			) {
				i = prev_nt(i - 1);
				continue;
			}
			if (k === operator_id && t === ">") {
				let depth = 1;
				i = prev_nt(i - 1);
				while (i >= 0 && depth > 0) {
					const kk = kind_of(i);
					const tt = text_of(i);
					if (kk === operator_id && tt === ">") {
						depth++;
					} else if (kk === operator_id && tt === "<") {
						depth--;
						if (depth === 0) {
							i = prev_nt(i - 1);
							break;
						}
					}
					i = prev_nt(i - 1);
				}
				if (depth !== 0) return false;
				continue;
			}
			break;
		}
		if (i < 0) return false;
		const k = kind_of(i);
		const t = text_of(i);
		if (k === keyword_id && t === "interface") return true;
		if (k === keyword_id && t === "class") return false;
		// inside a generic parameter list: `<T extends U>` — entering type mode
		if (k === operator_id && t === "<") return true;
		// inside an extends list for another interface: `extends A, B` where
		// we arrive at the previous identifier — already a type context.
		if (k === keyword_id && t === "extends") return true;
		return false;
	};

	// does `<` at open_idx look like the start of generic type arguments?
	// heuristic: preceded by an identifier/type, matching `>` closes cleanly
	// before a token that's consistent with generics finishing (call, member
	// access, type-list separator, etc.).
	const looks_like_generic_args = (open_idx: number): boolean => {
		const prev = prev_nt(open_idx - 1);
		if (prev < 0) return false;
		const pk = kind_of(prev);
		if (pk !== identifier_id && pk !== type_id) return false;
		let depth = 1;
		let j = open_idx + 1;
		let matched_close = -1;
		while (j < n) {
			if (is_trivia(j)) {
				j++;
				continue;
			}
			const kk = kind_of(j);
			const tt = text_of(j);
			if (kk === operator_id) {
				if (tt === "<") {
					depth++;
				} else if (tt === ">") {
					depth--;
					if (depth === 0) {
						matched_close = j;
						break;
					}
				}
			} else if (kk === punctuation_id) {
				if (tt === ";" || tt === "{" || tt === "}") return false;
			}
			j++;
		}
		if (matched_close < 0) return false;
		const after = next_nt(matched_close + 1);
		if (after < 0) return true;
		const ak = kind_of(after);
		const at = text_of(after);
		if (ak === punctuation_id) {
			return (
				at === "(" ||
				at === ")" ||
				at === "{" ||
				at === "}" ||
				at === "[" ||
				at === "]" ||
				at === "," ||
				at === ";" ||
				at === "."
			);
		}
		if (ak === operator_id) {
			return (
				at === "=" ||
				at === "=>" ||
				at === ":" ||
				at === "?:" ||
				at === "|" ||
				at === "&" ||
				at === ">" ||
				at === "?" ||
				at === "!"
			);
		}
		if (ak === keyword_id) {
			// `Foo<T> extends ...`, `Foo<T> implements ...` — generic
			return at === "extends" || at === "implements";
		}
		return false;
	};

	// returns the index of the last non-trivia char in prev tokens that
	// effectively precedes token `i` — taking into account that the prev
	// token may be a multi-char punctuation bundle (e.g. `()`, `[];`, `}))`).
	const prev_effective_char = (i: number): string | null => {
		const p = prev_nt(i - 1);
		if (p < 0) return null;
		const pt = text_of(p);
		return pt.length > 0 ? pt[pt.length - 1] : null;
	};

	// process a single punctuation char within a (possibly merged) token.
	// returns true if the outer loop should `continue` (punctuation already
	// handled here, no further work on this token).
	const process_punct_char = (ch: string, i: number): boolean => {
		if (ch === "(") {
			paren_depth++;
			scope_stack.push({ kind: "paren", qmark: 0 });
			return false;
		}
		if (ch === ")") {
			paren_depth--;
			if (scope_stack.length > 1) scope_stack.pop();
			if (mode && paren_depth < mode.entry_paren) exit_mode();
			return false;
		}
		if (ch === "{") {
			if (
				mode &&
				brace_depth === mode.entry_brace &&
				paren_depth === mode.entry_paren &&
				(mode.kind === "return" ||
					mode.kind === "extends_list" ||
					mode.kind === "implements_list")
			) {
				const prev_ch = prev_effective_char(i);
				const prev_is_type_closer =
					prev_ch === "]" || prev_ch === ")";
				let closer_from_prev_token = prev_is_type_closer;
				if (!closer_from_prev_token) {
					const p = prev_nt(i - 1);
					if (p >= 0) {
						const pk = kind_of(p);
						if (pk === identifier_id || pk === type_id) {
							closer_from_prev_token = true;
						} else if (pk === operator_id && text_of(p) === ">") {
							closer_from_prev_token = true;
						} else if (pk === keyword_id && TYPE_TERMINAL_KEYWORDS.has(text_of(p))) {
							// type expressions often end on a keyword like
							// `this`, `void`, `undefined`, etc. — treat them as
							// the same closing signal as an identifier / type.
							closer_from_prev_token = true;
						}
					}
				}
				if (closer_from_prev_token) exit_mode();
			}
			const ctx = classify_brace(i);
			brace_depth++;
			scope_stack.push({ kind: "brace", brace_ctx: ctx, qmark: 0 });
			return false;
		}
		if (ch === "}") {
			brace_depth--;
			if (scope_stack.length > 1) scope_stack.pop();
			if (mode && brace_depth < mode.entry_brace) exit_mode();
			if (brace_depth === 0 && paren_depth === 0) {
				in_var_decl = false;
				alias_state = { kind: "none" };
			}
			return false;
		}
		if (ch === "[") {
			bracket_depth++;
			scope_stack.push({ kind: "bracket", qmark: 0 });
			return false;
		}
		if (ch === "]") {
			bracket_depth--;
			if (scope_stack.length > 1) scope_stack.pop();
			if (mode && bracket_depth < mode.entry_bracket) exit_mode();
			return false;
		}
		if (ch === ";") {
			if (mode && at_entry_depth(mode)) exit_mode();
			if (paren_depth === 0 && brace_depth === 0) {
				in_var_decl = false;
				alias_state = { kind: "none" };
			}
			return false;
		}
		// `,`, `.`, other punct: depth-neutral, handled by later termination
		// logic when appropriate.
		return false;
	};

	for (let i = 0; i < n; i++) {
		if (is_trivia(i)) continue;

		const k = kind_of(i);
		const t = text_of(i);

		// ------------------------------------------------------------------
		// bracket handling runs BEFORE mode-specific work so that depth
		// tracking stays consistent even when entering/exiting modes.
		// ------------------------------------------------------------------

		if (k === punctuation_id) {
			// the tokenizer coalesces adjacent punctuation of the same type
			// into a single token (e.g. `()`, `[];`, `}))`). iterate each
			// char so depth tracking stays in sync.
			for (let c = 0; c < t.length; c++) {
				process_punct_char(t[c], i);
			}
			// after consuming this punctuation, check for `,` termination in
			// type modes — commas at entry depth end some kinds.
			if (mode && at_entry_depth(mode) && t.includes(",")) {
				const m = mode;
				if (
					m.kind !== "extends_list" &&
					m.kind !== "implements_list" &&
					m.kind !== "generics"
				) {
					exit_mode();
				}
			}
			continue;
		}

		// angle-bracket tracking (only while inside type mode).
		if (mode !== null && k === operator_id) {
			if (t === "<") {
				angle_depth++;
				continue;
			}
			if (t === ">") {
				if (angle_depth > 0) {
					angle_depth--;
					if (angle_depth < mode.entry_angle) exit_mode();
					continue;
				}
				// `>` at entry angle 0 without a matching `<`: leave alone.
			}
			// TS grammar doesn't split `>>` / `>>>` at generic closes — if it
			// did, we'd handle that here. Current grammar emits each `>` as
			// its own operator when adjacent to type args.
		}

		// ------------------------------------------------------------------
		// IN-MODE: termination checks and identifier reclassification
		// ------------------------------------------------------------------

		if (mode !== null) {
			const m = mode;

			// termination only considered when we're back at entry depth.
			// (punctuation including `,` / `;` is already handled above and
			// `continue`d before reaching here.)
			if (at_entry_depth(m)) {
				if (k === operator_id) {
					if (t === "=") {
						if (
							m.kind === "annotation_var" ||
							m.kind === "annotation_param" ||
							m.kind === "annotation_field"
						) {
							exit_mode();
							continue;
						}
						// inside generics, `=` introduces a default type — stay.
						if (m.kind === "generics") continue;
						// alias_rhs was entered ON `=`, so we're past it. other
						// kinds: unexpected, terminate defensively.
						exit_mode();
						continue;
					}
					if (t === "=>") {
						// `=>` preceded by `)` is part of a function type
						// `(x: T) => U` — keep consuming the type. otherwise
						// it's the arrow-function separator and terminates.
						const prev_ch = prev_effective_char(i);
						if (prev_ch === ")") continue;
						exit_mode();
						continue;
					}
					if (t === "?") {
						// `as`/`satisfies` end at the first ternary `?`.
						if (m.kind === "as") {
							exit_mode();
							continue;
						}
						// in other kinds: type-level `?` (optional, conditional).
					}
					if (VALUE_OP_TERMINATORS.has(t)) {
						exit_mode();
						continue;
					}
				}
				if (k === keyword_id && STMT_KEYWORD_TERMINATORS.has(t)) {
					exit_mode();
					continue;
				}
			}

			// reclassify identifiers, unless they're clearly in "key
			// position" — preceding a `:` INSIDE a nested paren or brace
			// (function type `(x: T) => U`, object type `{ x: T }`). at
			// the root of the type expression, `:` is the conditional
			// type separator (`T extends U ? A : B`), not a key marker.
			if (k === identifier_id) {
				let skip = false;
				if (
					paren_depth > m.entry_paren ||
					brace_depth > m.entry_brace
				) {
					const nxt = next_nt(i + 1);
					if (nxt >= 0 && kind_of(nxt) === operator_id) {
						const nt = text_of(nxt);
						if (nt === ":" || nt === "?:") skip = true;
					}
				}
				if (!skip) {
					claims.push({
						token_idx: i,
						type_id,
						precedence: TPP_TYPE_PREC,
					});
				}
			}
			continue;
		}

		// ------------------------------------------------------------------
		// OUT OF MODE: scan for entry triggers and maintain statement state
		// ------------------------------------------------------------------

		// `:` or `?:` — possible type annotation, after ternary consumption.
		if (k === operator_id && (t === ":" || t === "?:")) {
			if (t === ":" && cur_scope().qmark > 0) {
				cur_scope().qmark--;
				continue;
			}
			const kind = classify_colon(i);
			if (kind) {
				// step 6 change: no identifier claim is emitted on the anchor
				// anymore. the old "demote function → identifier" hack was
				// needed because function_variable_rules overclaimed `function`
				// on any `ident : arrow` shape (class fields, function params,
				// interface members). fn_var now only claims for `=` shapes,
				// and claim_property_scope is the sole owner of `:` positions,
				// so class fields and function params simply never receive a
				// competing claim — they stay `identifier` by default. the
				// type-mode state machine below is unchanged.
				enter_mode(kind);
			}
			continue;
		}

		if (k === operator_id && t === "?") {
			cur_scope().qmark++;
			continue;
		}

		if (k === keyword_id) {
			if (t === "as" || t === "satisfies") {
				enter_mode("as");
				continue;
			}
			if (t === "extends") {
				if (detect_extends_context(i)) enter_mode("extends_list");
				continue;
			}
			if (t === "implements") {
				enter_mode("implements_list");
				continue;
			}
			if (t === "let" || t === "const" || t === "var") {
				if (paren_depth === 0 && brace_depth === 0) in_var_decl = true;
				continue;
			}
			if (t === "type") {
				if (paren_depth === 0 && brace_depth === 0) {
					alias_state = { kind: "saw_type" };
				}
				continue;
			}
			if (STMT_STARTERS.has(t)) {
				in_var_decl = false;
				alias_state = { kind: "none" };
				continue;
			}
			continue;
		}

		// alias state machine: `type NAME [<...>] =`. the `<...>` piece is
		// delegated to generics mode (below) which handles depth + promotion.
		// here we just advance the outer state machine on NAME and watch for
		// `=` at the top level.
		if (alias_state.kind === "saw_type" && k === identifier_id) {
			alias_state = { kind: "saw_name", angle_depth: 0 };
			continue;
		}
		if (alias_state.kind === "saw_name" && k === operator_id && t === "=") {
			enter_mode("alias_rhs");
			alias_state = { kind: "none" };
			continue;
		}

		// generic type-arguments: `Foo<T, U>`
		if (k === operator_id && t === "<") {
			if (looks_like_generic_args(i)) {
				angle_depth = 1;
				enter_mode("generics");
				// entry_angle captures angle_depth AFTER the bump (== 1), so
				// the matching `>` takes angle_depth back to 0 which is `<
				// entry_angle` and triggers the exit in the angle handler.
				continue;
			}
		}
	}

	return claims;
};

export const type_position_promoter: ClaimingReclassifier = as_claim_producer(
	type_position_promoter_fn,
);

export const reclassifiers: LanguagePipeline = [
	// restoration first: bring the stream up to the fidelity the JS / TS
	// grammars used to emit directly (boolean, call-site function, builtin
	// type). these must run before type_position_promoter because it may
	// demote function tokens that appear inside type positions.
	tag(promote_boolean_literals, ["boolean"]),
	tag(promote_call_site_functions, ["function"]),
	tag(promote_builtin_types, ["type"]),
	// claim_property_scope batches with function_variable_rules above —
	// both see the base stream, their claims merge by precedence. interface
	// members claim at prec 35 (beats function's 30) so `cb: () => X` in
	// an interface resolves to property without needing a separate
	// re-promotion pass. class fields never get a property claim, so
	// type_position_promoter doesn't need class_field_demoter to clean up
	// after it. class_name_promoter runs last among the identifier-rewriters
	// so it has the final say on positions it specifically owns
	// (class/interface heads, `new`, `instanceof`).
	tag(rewrite_types(function_variable_rules, { trivia: ["comment"] }), [
		"function",
	]),
	tag(claim_property_scope, ["property"]),
	tag(type_position_promoter, ["type"]),
	tag(class_name_promoter, ["class_name"]),
	always(embed_interleaved({ scan: scan_tagged_template }), "embed"),
];
