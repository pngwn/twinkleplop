// JavaScript reclassifier rules.
//
// Each rule is a pattern over the raw JS token stream produced by the main
// grammar. Running these as a post-pass lets us recognize things that the
// state machine alone can't express cheaply:
//
//   - Function variables (`const foo = () => ...` → foo becomes `function`)
//   - Tagged template literals (`` html`...` ``, `` css`...` ``) — the body
//     is tokenized with the HTML or CSS language and spliced into the JS
//     token stream via the generic `embed_interleaved` transform, which
//     handles interpolations (`${expr}`) correctly by giving the sub
//     language full state continuity across holes.
//
// Rules here are **additive**: consumers who import just `grammar` get the
// base tokenizer behavior unchanged; consumers who import `language` also
// get these reclassifiers applied automatically.

import {
	always,
	any_of,
	as_claim_producer,
	balanced_parens,
	embed_interleaved,
	make_scope_stack,
	make_token_view,
	promote_by_text_set,
	promote_function_calls,
	rewrite_types,
	seq,
	tag,
	type,
} from "@twinkleplop/core";
import type {
	ClaimFn,
	ClaimingReclassifier,
	LanguagePipeline,
	Reclassifier,
} from "@twinkleplop/core";

import { language as css_language } from "@twinkleplop/css";
// Cross-language references are imported lazily so the HTML ↔ JS workspace
// cycle (HTML embeds JS for `<script>`, JS embeds HTML for `` html`...` ``)
// resolves cleanly. The imported bindings may be `undefined` at module-eval
// time; by wrapping the factory calls in memoized closures we defer both
// the lookup AND the pipeline build until the sub language is actually
// invoked, by which point both modules are ready.
import { language as html_language } from "@twinkleplop/html";

import type { LanguageFn } from "@twinkleplop/core";

let html_fn: LanguageFn | undefined;
let css_fn: LanguageFn | undefined;
const html_default: LanguageFn = (src) => (html_fn ??= html_language())(src);
const css_default: LanguageFn = (src) => (css_fn ??= css_language())(src);

// ---------------------------------------------------------------------------
// function-variable detection
// ---------------------------------------------------------------------------
//
// Recognizes identifiers assigned an arrow or function expression, and object
// property keys whose value is an arrow or function expression. This mirrors
// Prism's `function-variable` pattern:
//
//   const foo = () => ...          → foo becomes `function`
//   const foo = (a, b) => ...      → foo becomes `function`
//   const foo = async () => ...    → foo becomes `function`
//   const foo = function() {}      → foo becomes `function`
//   const foo = async function()   → foo becomes `function`
//   const foo = x => ...           → foo becomes `function`
//   { foo: () => ... }             → foo becomes `function`
//
// Limitations (same as Prism):
//   - `const foo = cond ? () => 1 : () => 2` — not detected (intervening `?`)
//   - `const foo = (() => fn)()`  — incorrectly matches (parses as arrow)
//   - deeply nested params `((a, b), c) => ...` — handled up to max_tokens
//
// Trivia (comments) is skipped between pattern elements, so
// `const foo /* wat */ = () => 1` still matches.

const function_expression = any_of(
	// `function(...)` or bare `function` keyword
	type("keyword", "function"),
	// `async function(...)`
	seq(type("keyword", "async"), type("keyword", "function")),
);

const arrow_function = any_of(
	// `(...) => ...` — balanced param list followed by fat arrow
	seq(balanced_parens("(", ")"), type("operator", "=>")),
	// `async (...) => ...`
	seq(
		type("keyword", "async"),
		balanced_parens("(", ")"),
		type("operator", "=>"),
	),
	// `x => ...` — single unparenthesized parameter
	seq(type("identifier"), type("operator", "=>")),
	// `async x => ...`
	seq(type("keyword", "async"), type("identifier"), type("operator", "=>")),
);

// rules that recognize a function-valued binding and rewrite the anchor
// identifier to `function`. these rules ONLY produce `function` tokens, so
// they're safe to tag with exactly one `produces` entry.
//
// the rule set is intentionally narrow: ONLY `ident = arrow|fn` assignments.
// object-literal method shorthand (`{ foo: () => 1 }`) and type annotations
// (`interface I { cb: () => X }`, `class C { h: () => void }`) used to be
// handled here too, but that was a scope-blind rewrite — it overclaimed in
// class/interface/param contexts and had to be patched up by a demote pass
// and an interface-member re-promoter. step 6 moved all `ident :`
// classification into `claim_property_scope`, which has the scope context
// to make the right decision in one claim. assignment `=` has no such
// ambiguity: wherever `ident = arrow` appears, ident is a function binding.
export const function_variable_rules = [
	{
		anchor: "identifier",
		when: seq(
			type("operator", ["="]),
			any_of(function_expression, arrow_function),
		),
		rewrite: "function",
	},
];

// ---------------------------------------------------------------------------
// property claim pass — scope-aware, single-pass, claim-producing
// ---------------------------------------------------------------------------
//
// walks the token stream once, tracks a stack of lexical scopes, and emits
// a `property` claim for every identifier that sits in property-key
// position (after `{`, `,` within an object literal, type literal, or
// interface body, or after `;` within an interface body; modifiers like
// `readonly` / `public` keep the member-start marker live).
//
// this single pass replaces three older reclassifiers:
//   - property_rules (rewrite_types DSL with exclusion rules)
//   - interface_member_promoter (stateful walker)
//   - class_field_demoter (post-hoc fixup)
//
// the key design decision: scope-aware claim EMISSION rather than
// claim-then-demote. class fields never get a property claim (class-scope
// is excluded at emit time), so no fixup pass is needed. interface members
// emit at a HIGHER precedence (35) than the `function` precedence (30) so
// they beat a competing function-variable claim for `cb: () => X` without
// needing a separate re-promotion pass.
//
// scope kinds:
//   class       — body of `class Foo { ... }` — NEVER claim.
//   interface   — body of `interface Foo { ... }` — claim at prec 35.
//   object      — object literal / type literal / destructure pattern —
//                 claim at prec 20.
//   block       — function body, if/while/for/do block, arrow body —
//                 NEVER claim (blocks may contain labeled statements that
//                 look syntactically like `ident : stmt`, but they're not
//                 property keys).
//   paren       — inside `(...)` — NEVER claim (function params, grouped
//                 expressions).
//   bracket     — inside `[...]` — NEVER claim (arrays, computed keys).

const MEMBER_MODIFIERS = new Set([
	"readonly",
	"public",
	"private",
	"protected",
	"static",
	"abstract",
	"override",
	"accessor",
	"declare",
]);

// a `:` whose next non-trivia is one of these keywords is a labeled
// statement introducer, not an object-property separator.
const LABEL_STATEMENT_KEYWORDS = new Set([
	"for",
	"while",
	"do",
	"if",
	"switch",
	"try",
	"with",
]);

// keywords / operators that, when they immediately precede a `{`, mark the
// brace as opening a block rather than an object literal.
const BLOCK_LEADING_KEYWORDS = new Set([
	"do",
	"try",
	"else",
	"finally",
]);

type BraceClass = "class" | "interface" | "object" | "type_literal" | "block";

// per-scope data tracked by claim_property_scope's scope stack. for `(` /
// `[` scopes, brace_class is unused (the code only checks it on `{`
// scopes). at_start is true immediately after the scope's opening token
// or a member separator (`,` / `;`); any significant token past that
// point resets it to false. claim emission requires at_start && brace_class
// in {object, interface, type_literal}.
interface PropertyScopeData {
	brace_class?: BraceClass;
	at_start: boolean;
}

// step-6 precedence scheme. the goal is "one claim per token" — no two
// passes should emit different target types for the same position. this
// pass is now the SOLE owner of `ident :` classification:
//
//   OBJECT  literal `{ k : v }`:
//     - value is arrow / function  → claim FUNCTION at 30 (method shorthand)
//     - otherwise                  → claim PROPERTY at 20
//   INTERFACE body / TYPE LITERAL:
//     - always                     → claim PROPERTY at 20
//   CLASS / PAREN / BRACKET / BLOCK:
//     - never claims
//
// function_variable_rules was simultaneously narrowed to handle only `ident
// = value` (assignment), so there's no longer any overlap between the two
// passes. TPP dropped its annotation-position identifier claim at the same
// time — it's no longer needed because fn_var doesn't overclaim.
const PROP_PREC = 20;
const PROP_FN_PREC = 30; // matches the default `function` precedence.

const claim_property_scope_fn: ClaimFn = (input, tokens, token_types, sink) => {
	const view = make_token_view(input, tokens, token_types);
	if (view.count === 0) return;

	const identifier_id = token_types.indexOf("identifier");
	const keyword_id = token_types.indexOf("keyword");
	const punctuation_id = token_types.indexOf("punctuation");
	const operator_id = token_types.indexOf("operator");

	if (
		identifier_id < 0 ||
		keyword_id < 0 ||
		punctuation_id < 0 ||
		operator_id < 0
	) {
		return;
	}

	let property_id = token_types.indexOf("property");
	if (property_id < 0) {
		property_id = token_types.length;
		token_types.push("property");
	}
	let function_id = token_types.indexOf("function");
	if (function_id < 0) {
		function_id = token_types.length;
		token_types.push("function");
	}

	const stack = make_scope_stack<PropertyScopeData>();
	let expecting_class_body = false;
	let expecting_interface_body = false;
	// tracks generic-parameter angle-bracket depth between a `class` /
	// `interface` keyword and its body `{`. without this, a type literal
	// nested inside a type parameter constraint — e.g. `class C<T extends
	// { id: V }> { ... }` — would be mistaken for the class body on its
	// opening `{`, consuming expecting_class_body and leaving the real
	// body misclassified as `object`. angle tracking is live outside of
	// the class/interface-header window too, but the effect is only
	// consulted by the `{` classifier; in pure JS (no TS generics) the
	// counter gets incremented by comparison operators but never affects
	// classification because no expecting_* flag is set.
	let angle_depth = 0;

	// classify an opening `{` not already claimed by a pending class/interface
	// header. returns the brace_class tag stored alongside the scope entry.
	//
	// `{` preceded by `:` is a type literal (annotation or return position):
	// `let o: { k: V }`, `function f(): { k: V }`. keys inside behave like
	// interface members (claim property, never function) because the braces
	// describe a TYPE shape, not a runtime value.
	const classify_open_brace = (open_idx: number): BraceClass => {
		const prev = view.prev_non_trivia(open_idx - 1);
		if (prev < 0) return "block";
		const pk = view.kind_of(prev);
		const pt = view.text_of(prev);
		if (pk === operator_id && pt === "=>") return "block";
		if (pk === operator_id && pt === ":") return "type_literal";
		if (pk === keyword_id && BLOCK_LEADING_KEYWORDS.has(pt)) return "block";
		if (pk === punctuation_id && pt.length > 0 && pt[pt.length - 1] === ")") {
			return "block";
		}
		return "object";
	};

	// peek past `:` at idx (the colon itself) to decide whether the value
	// is an arrow or function expression — i.e. whether the key of an
	// OBJECT literal should be classified as `function` (method shorthand)
	// rather than `property`. returns true when the value shape is any of
	// `function`, `async function`, `(...) =>`, `async (...) =>`,
	// `ident =>`, `async ident =>`. mirrors the patterns that
	// `function_variable_rules` used to match for `:`.
	const is_function_value = (colon_idx: number): boolean => {
		let j = view.next_non_trivia(colon_idx + 1);
		if (j < 0) return false;
		// optional leading `async`.
		if (view.kind_of(j) === keyword_id && view.text_of(j) === "async") {
			j = view.next_non_trivia(j + 1);
			if (j < 0) return false;
		}
		// `function` keyword → function expression.
		if (view.kind_of(j) === keyword_id && view.text_of(j) === "function") {
			return true;
		}
		// `ident =>` — single-param arrow without parens.
		if (view.kind_of(j) === identifier_id) {
			const after = view.next_non_trivia(j + 1);
			if (
				after >= 0 &&
				view.kind_of(after) === operator_id &&
				view.text_of(after) === "=>"
			) {
				return true;
			}
			return false;
		}
		// `(...) =>` — arrow with parameter list. walk balanced parens in
		// punctuation tokens and look for `=>` after the matching `)`.
		if (view.kind_of(j) === punctuation_id) {
			const t = view.text_of(j);
			if (t.length === 0 || t[0] !== "(") return false;
			let depth = 0;
			let end_idx = -1;
			const max = Math.min(view.count, j + 200);
			outer: for (let k = j; k < max; k++) {
				if (view.kind_of(k) !== punctuation_id) continue;
				const tt = view.text_of(k);
				for (let c = 0; c < tt.length; c++) {
					const ch = tt[c];
					if (ch === "(") depth++;
					else if (ch === ")") {
						depth--;
						if (depth === 0) {
							end_idx = k;
							break outer;
						}
					}
				}
			}
			if (end_idx < 0) return false;
			const after = view.next_non_trivia(end_idx + 1);
			return (
				after >= 0 &&
				view.kind_of(after) === operator_id &&
				view.text_of(after) === "=>"
			);
		}
		return false;
	};

	// apply a single punctuation character (part of a possibly-merged
	// punctuation token at index `i`) to the scope stack and bookkeeping.
	const process_punct_char = (ch: string, i: number): void => {
		if (ch === "{") {
			let brace_class: BraceClass;
			// the class/interface body `{` is the one at the TOP LEVEL of
			// the header — not nested inside generic angles or a paren/
			// bracket expression. examples:
			//   class C<T extends { id: V }> { ... }
			//     inner `{` is at angle_depth=1 → type_literal.
			//   class C extends f({ key: 1 }) { ... }
			//     inner `{` is at paren_depth=1 → falls through to default
			//     classification (object literal). expecting_class_body
			//     survives; the outer `{` after `)` becomes the real body.
			//   class C extends Base<U> { ... }
			//     no `{` during the header; the `{` after `>` is top-level.
			const nested_under_angles = angle_depth > 0;
			const nested_under_structural =
				stack.paren_depth > 0 || stack.bracket_depth > 0;
			if (expecting_class_body && !nested_under_angles && !nested_under_structural) {
				brace_class = "class";
				expecting_class_body = false;
			} else if (
				expecting_interface_body &&
				!nested_under_angles &&
				!nested_under_structural
			) {
				brace_class = "interface";
				expecting_interface_body = false;
			} else if (
				(expecting_class_body || expecting_interface_body) &&
				nested_under_angles
			) {
				// `{` inside a generic parameter constraint during a class or
				// interface header — always a type literal. expecting_* flags
				// survive, waiting for the real body.
				brace_class = "type_literal";
			} else {
				brace_class = classify_open_brace(i);
			}
			stack.push("{", { brace_class, at_start: true });
			return;
		}
		if (ch === "}") {
			stack.pop();
			const top = stack.top();
			if (top !== undefined) top.data.at_start = false;
			return;
		}
		if (ch === "(") {
			stack.push("(", { at_start: false });
			return;
		}
		if (ch === ")") {
			stack.pop();
			const top = stack.top();
			if (top !== undefined) top.data.at_start = false;
			return;
		}
		if (ch === "[") {
			stack.push("[", { at_start: false });
			return;
		}
		if (ch === "]") {
			stack.pop();
			const top = stack.top();
			if (top !== undefined) top.data.at_start = false;
			return;
		}
		if (ch === "," || ch === ";") {
			// member separators in object/interface/type-literal scope set
			// at_start true again so the next identifier can be a key. in
			// other scopes (block, paren, bracket) the flag is unused, so
			// setting it true is harmless. leave expecting_* flags alone so
			// they survive commas in class/interface headers (`class C<T, U>`,
			// `implements A, B`).
			const top = stack.top();
			if (top !== undefined) top.data.at_start = true;
			return;
		}
		// any other punctuation character (`.`, `@`, etc.) resets at_start.
		const top = stack.top();
		if (top !== undefined) top.data.at_start = false;
	};

	for (let i = 0; i < view.count; i++) {
		const k = view.kind_of(i);
		if (view.is_trivia(i)) continue;

		if (k === keyword_id) {
			const t = view.text_of(i);
			if (t === "class") {
				expecting_class_body = true;
				continue;
			}
			if (t === "interface") {
				expecting_interface_body = true;
				continue;
			}
			if (MEMBER_MODIFIERS.has(t)) {
				// transparent to at_start — next identifier is still a key.
				continue;
			}
			// any other keyword consumes the member-start position.
			const top = stack.top();
			if (top !== undefined) top.data.at_start = false;
			continue;
		}

		if (k === punctuation_id) {
			const t = view.text_of(i);
			for (let c = 0; c < t.length; c++) {
				process_punct_char(t[c], i);
			}
			continue;
		}

		if (k === operator_id) {
			const t = view.text_of(i);
			// update angle_depth for generic-parameter tracking. `<<`,
			// `<=`, `>=`, etc. are comparison/shift operators — leave the
			// counter alone for those; they don't appear in well-formed
			// generic brackets.
			if (t === "<") {
				angle_depth++;
			} else if (t === ">") {
				if (angle_depth > 0) angle_depth--;
			} else if (t === ">>") {
				if (angle_depth >= 2) angle_depth -= 2;
				else if (angle_depth > 0) angle_depth = 0;
			} else if (t === ">>>") {
				if (angle_depth >= 3) angle_depth -= 3;
				else if (angle_depth > 0) angle_depth = 0;
			}
			// operators consume at_start like any other significant token.
			const top = stack.top();
			if (top !== undefined) top.data.at_start = false;
			continue;
		}

		if (k === identifier_id) {
			const top = stack.top();
			if (
				top !== undefined &&
				top.data.at_start &&
				(top.data.brace_class === "object" ||
					top.data.brace_class === "interface" ||
					top.data.brace_class === "type_literal")
			) {
				const nxt = view.next_non_trivia(i + 1);
				if (nxt >= 0 && view.kind_of(nxt) === operator_id) {
					const nt = view.text_of(nxt);
					if (nt === ":" || nt === "?:") {
						// label exclusion: `ident : <stmt_keyword>` is a label.
						const after = view.next_non_trivia(nxt + 1);
						let is_label = false;
						if (after >= 0 && view.kind_of(after) === keyword_id) {
							is_label = LABEL_STATEMENT_KEYWORDS.has(view.text_of(after));
						}
						if (!is_label) {
							// OBJECT literal keys whose value is an arrow or
							// function expression are method shorthands — claim
							// function (30). every other object/interface/type-
							// literal key is a data property — claim property (20).
							// class/paren/bracket scopes never reach here because
							// of the brace_class filter above.
							if (
								top.data.brace_class === "object" &&
								is_function_value(nxt)
							) {
								sink.emit(i, function_id, PROP_FN_PREC);
							} else {
								sink.emit(i, property_id, PROP_PREC);
							}
						}
					}
				}
			}
			// consuming the identifier retires the member-start marker.
			if (top !== undefined) top.data.at_start = false;
			continue;
		}

		// any other token (operator, number, string, ...) consumes the
		// member-start position.
		const top = stack.top();
		if (top !== undefined) top.data.at_start = false;
	}
};

export const claim_property_scope: ClaimingReclassifier = as_claim_producer(
	claim_property_scope_fn,
);

// ---------------------------------------------------------------------------
// Tagged template literal embedding
// ---------------------------------------------------------------------------
//
// A single scanner recognizes `` html`...` `` and `` css`...` `` tagged
// templates, describing each as a GroupDescriptor for the generic
// `embed_interleaved` transform. The transform handles the rest:
//
//   1. Builds a virtual source by concatenating template content chunks
//      with space-filled interpolation holes.
//   2. Tokenizes it in ONE call to the sub language (HTML or CSS),
//      giving the sub language full state continuity across holes — so
//      attribute-position interpolations like `<p class="${cls}">hi</p>`
//      work correctly: the sub tokenizer sees a well-formed attribute
//      value and emits a single string token, which is then split at the
//      hole boundary in the output.
//   3. Splices the result back into the JS stream, preserving the
//      original interpolation tokens (`${`, expression, `}`) verbatim.
//
// The backticks at the start and end of the template are emitted as
// synthetic `template` tokens so they stay styled.

// per-token_types type_id cache. The scanner is called once per host token
// position in the stream, which means a naive `token_types.indexOf(...)` per
// call costs O(n * m) per tokenize pass (n = token count, m = types per
// lookup). We memoize on the token_types array reference — a WeakMap lets
// different compiled grammars share one scanner without holding onto their
// token_types arrays once they go out of scope.
const type_id_cache = new WeakMap();

function get_type_ids(token_types) {
	let ids = type_id_cache.get(token_types);
	if (ids === undefined) {
		ids = {
			identifier_id: token_types.indexOf("identifier"),
			template_id: token_types.indexOf("template"),
			punctuation_id: token_types.indexOf("punctuation"),
		};
		type_id_cache.set(token_types, ids);
	}
	return ids;
}

/**
 * Scanner called at each host token position. Returns a GroupDescriptor if
 * a tagged template starts here, or null otherwise.
 *
 * @param {Uint32Array} tokens
 * @param {string} input
 * @param {number} i
 * @param {string[]} token_types
 * @returns {import("@twinkleplop/core").GroupDescriptor | null}
 */
export function scan_tagged_template(tokens, input, i, token_types) {
	const { identifier_id, template_id, punctuation_id } =
		get_type_ids(token_types);
	if (identifier_id < 0 || template_id < 0 || punctuation_id < 0) return null;
	const count = tokens.length / 3;
	if (i >= count) return null;

	// fast reject: trigger is an identifier. If the current token isn't an
	// identifier, no work to do — this rejects 99% of positions on a typical
	// token stream before any source-text comparison.
	if (tokens[i * 3] !== identifier_id) return null;
	const tag_start = tokens[i * 3 + 1];
	const tag_end = tokens[i * 3 + 2];
	const tag_name = input.slice(tag_start, tag_end);
	let language: LanguageFn;
	if (tag_name === "html") language = html_default;
	else if (tag_name === "css") language = css_default;
	else return null;

	const first_chunk = i + 1;
	if (first_chunk >= count || tokens[first_chunk * 3] !== template_id)
		return null;
	const first_start = tokens[first_chunk * 3 + 1];
	if (input[first_start] !== "`") return null;

	const regions = [];
	// opening backtick as a synthetic template token (one char).
	regions.push({
		kind: "synthetic",
		source_start: first_start,
		source_end: first_start + 1,
		type_name: "template",
	});

	let k = first_chunk;
	let in_hole = false;
	let depth = 0;
	let hole_tok_start = 0;
	let hole_source_start = 0;

	while (k < count) {
		const tk = tokens[k * 3];
		const ts = tokens[k * 3 + 1];
		const te = tokens[k * 3 + 2];

		if (!in_hole) {
			if (tk === template_id) {
				// a content chunk. The first chunk has a leading backtick;
				// the last chunk has a trailing backtick (marking end of
				// group). Both can be the same chunk for a non-interpolated
				// template like `html`<div></div>`` — in which case the
				// single token contains both backticks. BUT for a 1-char
				// first chunk (a bare opening backtick followed immediately
				// by `${`, as in `html`${x}``), the single char is ONLY the
				// opening — it is not simultaneously a closing. `start_offset`
				// below guards against treating the same byte as both.
				const is_first = k === first_chunk;
				const start_offset = is_first ? 1 : 0;
				const has_closing_backtick =
					te - ts > start_offset && input[te - 1] === "`";
				const content_start = ts + start_offset;
				const content_end = has_closing_backtick ? te - 1 : te;
				if (content_end > content_start) {
					regions.push({
						kind: "content",
						source_start: content_start,
						source_end: content_end,
					});
				}
				k++;
				if (has_closing_backtick) {
					// closing backtick as a synthetic template token.
					regions.push({
						kind: "synthetic",
						source_start: te - 1,
						source_end: te,
						type_name: "template",
					});
					// the trigger identifier (`html`/`css`) stays in the
					// host stream — only the template chunks + interpolations
					// are replaced.
					return {
						token_start: first_chunk,
						token_end: k,
						regions,
						language,
					};
				}
			} else if (tk === punctuation_id && input.slice(ts, te) === "${") {
				// start of interpolation hole. Brace depth begins at 1.
				in_hole = true;
				hole_tok_start = k;
				hole_source_start = ts;
				depth = 1;
				k++;
			} else {
				// unexpected token between template chunks → malformed. Bail.
				return null;
			}
		} else {
			// inside an interpolation. Track brace depth via any `{` / `}`
			// chars that appear in punctuation tokens (object literals,
			// function bodies, nested `${` all contribute).
			if (tk === punctuation_id) {
				const src = input.slice(ts, te);
				for (let c = 0; c < src.length; c++) {
					const ch = src.charCodeAt(c);
					if (ch === 0x7b /* { */) depth++;
					else if (ch === 0x7d /* } */) depth--;
				}
				if (depth === 0) {
					// hole closes at this token. Record it and resume content.
					regions.push({
						kind: "hole",
						source_start: hole_source_start,
						source_end: te,
						token_start: hole_tok_start,
						token_end: k + 1,
					});
					in_hole = false;
				}
			}
			k++;
		}
	}
	// ran off the end without a closing backtick — malformed template.
	return null;
}

// ---------------------------------------------------------------------------
// class_name_promoter
// ---------------------------------------------------------------------------
//
// Promotes identifiers to `class_name` when they appear in positions that
// syntactically denote a class/interface name:
//
//   class Foo { }                     Foo
//   class Foo extends Bar { }         Foo, Bar
//   class Foo extends pkg.Bar { }     Foo, Bar   (only the last in a chain)
//   class Foo<T> extends Bar<U> { }   Foo, Bar   (generics skipped)
//   class Foo implements A, B { }     Foo, A, B
//   interface Foo { }                 Foo
//   interface Foo extends A, B { }    Foo, A, B
//   new Foo()                         Foo
//   new pkg.util.Foo()                Foo       (last-in-chain)
//   x instanceof Foo                  Foo
//
// This pass runs AFTER function_variable_rules and (in TypeScript) AFTER
// type_position_promoter, so it can upgrade either `identifier` or `type`
// tokens that sit in these positions.

export const class_name_promoter: Reclassifier = (input, result) => {
	const { tokens, token_types } = result;
	const view = make_token_view(input, tokens, token_types);
	const n = view.count;
	if (n === 0) return result;

	const identifier_id = token_types.indexOf("identifier");
	const keyword_id = token_types.indexOf("keyword");
	const punctuation_id = token_types.indexOf("punctuation");
	const operator_id = token_types.indexOf("operator");
	const type_id = token_types.indexOf("type");
	const function_id = token_types.indexOf("function");

	if (identifier_id < 0 || keyword_id < 0) return result;

	let class_name_id = token_types.indexOf("class_name");
	if (class_name_id < 0) {
		class_name_id = token_types.length;
		token_types.push("class_name");
	}

	// next-non-trivia convention for this pass matches the rest: returns
	// the index of the first non-trivia at or after `from`, or -1. the old
	// implementation returned `n` on failure; keep the same caller shape
	// by checking `>= 0` instead of `< n`.
	const skip_trivia = (from: number): number => view.next_non_trivia(from);

	// a name-shaped token: identifier, TS `type` (our own pass may have
	// already promoted it), or `function` (the JS probe mis-classifies
	// `new Foo(`, `instanceof Foo` as `function` because of the trailing
	// `(`). all three are eligible for re-promotion to `class_name`.
	const is_name_token = (i: number): boolean => {
		if (i < 0 || i >= n) return false;
		const k = view.kind_of(i);
		return k === identifier_id || k === type_id || k === function_id;
	};

	// skip a balanced `<...>` angle group starting at `from` (which points at
	// the opening `<`). returns the index after the closing `>`.
	const skip_angles = (from: number): number => {
		if (from < 0 || from >= n) return from;
		if (view.kind_of(from) !== operator_id || view.text_of(from) !== "<") {
			return from;
		}
		let depth = 1;
		let j = from + 1;
		while (j < n && depth > 0) {
			if (!view.is_trivia(j) && view.kind_of(j) === operator_id) {
				const t = view.text_of(j);
				if (t === "<") depth++;
				else if (t === ">") depth--;
			}
			j++;
		}
		return j;
	};

	// walk a dotted identifier chain (`foo.bar.Baz`), promote the LAST
	// identifier to `class_name`. returns index after the chain.
	const promote_chain_last = (from: number): number => {
		let j = skip_trivia(from);
		let last = -1;
		while (j >= 0 && j < n) {
			if (!is_name_token(j)) break;
			last = j;
			j = skip_trivia(j + 1);
			if (
				j >= 0 &&
				view.kind_of(j) === punctuation_id &&
				view.text_of(j) === "."
			) {
				j = skip_trivia(j + 1);
				continue;
			}
			break;
		}
		if (last >= 0) tokens[last * 3] = class_name_id;
		return j < 0 ? n : j;
	};

	// walk a comma-separated list of (chain [<generics>]) entries. returns
	// index after the list.
	const promote_list = (from: number): number => {
		let j = skip_trivia(from);
		while (j >= 0 && j < n) {
			if (!is_name_token(j)) break;
			j = promote_chain_last(j);
			j = skip_trivia(j);
			if (
				j >= 0 &&
				view.kind_of(j) === operator_id &&
				view.text_of(j) === "<"
			) {
				j = skip_angles(j);
				j = skip_trivia(j);
			}
			if (
				j >= 0 &&
				view.kind_of(j) === punctuation_id &&
				view.text_of(j) === ","
			) {
				j = skip_trivia(j + 1);
				continue;
			}
			break;
		}
		return j < 0 ? n : j;
	};

	for (let i = 0; i < n; i++) {
		if (view.is_trivia(i)) continue;
		if (view.kind_of(i) !== keyword_id) continue;
		const kw = view.text_of(i);

		if (kw === "class" || kw === "interface") {
			// head: [name] [<...>] [extends LIST]* [implements LIST]?  {
			let j = skip_trivia(i + 1);
			if (is_name_token(j)) {
				tokens[j * 3] = class_name_id;
				j = skip_trivia(j + 1);
			}
			if (
				j >= 0 &&
				view.kind_of(j) === operator_id &&
				view.text_of(j) === "<"
			) {
				j = skip_angles(j);
				j = skip_trivia(j);
			}
			// extends / implements can appear in either order syntactically,
			// but typescript only accepts extends-before-implements. allow
			// both and iterate up to twice.
			for (let iter = 0; iter < 2; iter++) {
				j = skip_trivia(j);
				if (
					j >= 0 &&
					view.kind_of(j) === keyword_id &&
					(view.text_of(j) === "extends" || view.text_of(j) === "implements")
				) {
					j = promote_list(j + 1);
					continue;
				}
				break;
			}
			continue;
		}

		if (kw === "new" || kw === "instanceof") {
			promote_chain_last(i + 1);
			continue;
		}
	}

	return result;
};

// restoration of distinctions the grammar no longer emits. the grammar
// emits every call-site name and every "true"/"false" as `identifier`;
// these two passes restore the `function` and `boolean` token types so
// themes that rely on them keep working by default.
export const promote_boolean_literals: Reclassifier = promote_by_text_set(
	"identifier",
	"boolean",
	["true", "false"],
);

export const promote_call_site_functions: Reclassifier = promote_function_calls(
	"identifier",
	"function",
	{ plain: true },
	{ trivia: ["comment"] },
);

// pipeline entries are either fidelity-gated (wrapped with `tag(...)`) or
// always-on (plain reclassifier). the language factory drops every tagged
// entry under `fidelity: 'low'`; under `fidelity: ['function', ...]` it
// keeps tagged entries whose `produces` intersects the allowlist. the
// tagged-template embedder is always-on — embeds are not an identifier
// fidelity axis.
export const reclassifiers: LanguagePipeline = [
	tag(rewrite_types(function_variable_rules, { trivia: ["comment"] }), [
		"function",
	]),
	// claim_property_scope replaces three previous passes (property_rules,
	// interface_member_promoter, class_field_demoter) with a single scope-
	// aware claim producer. it batches with function_variable_rules above
	// so both see the base stream and merge by precedence — interface
	// members with function-type values resolve to property (prec 35 >
	// function's 30), object method shorthands to function (prec 30 >
	// object-property prec 20), and class fields never get a property
	// claim at all, so no post-hoc fixup is needed.
	tag(claim_property_scope, ["property"]),
	tag(class_name_promoter, ["class_name"]),
	always(embed_interleaved({ scan: scan_tagged_template }), "embed"),
];
