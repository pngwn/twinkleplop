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
	any_of,
	balanced_parens,
	capture,
	embed_interleaved,
	optional,
	rewrite_types,
	seq,
	type,
} from "@twinkleplop/core";
import type { Reclassifier } from "@twinkleplop/core";

import { language as css_language } from "@twinkleplop/css";
// Cross-language references are imported lazily so the HTML ↔ JS workspace
// cycle (HTML embeds JS for `<script>`, JS embeds HTML for `` html`...` ``)
// resolves cleanly. The imported bindings may be `undefined` at module-eval
// time; by wrapping them in closures we defer the lookup until the sub
// language is actually invoked, by which point both modules are ready.
import { language as html_language } from "@twinkleplop/html";

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

export const function_variable_rules = [
	{
		anchor: "identifier",
		when: seq(
			// `=` (declaration/assignment) or `:` (object property)
			type("operator", ["=", ":"]),
			any_of(function_expression, arrow_function),
		),
		rewrite: "function",
	},
	// label exclusion: identifier followed by `:` then a statement keyword
	// is a label, not a property. must come before the property rule so
	// first-match-wins blocks the property rewrite.
	{
		anchor: "identifier",
		when: seq(
			type("operator", [":"]),
			type("keyword", ["for", "while", "do", "if", "switch", "try", "with"]),
		),
		rewrite: "identifier",
	},
	// class field exclusion: the first member of a class body that has the
	// shape `name: type = value` would otherwise match the property rule
	// below (preceded by `{`, followed by `:`). type-annotation rules can't
	// catch it because the value-with-default form `: id =` doesn't end in
	// `;`. this lookbehind is precise: matches only the actual class header
	// `class IDENT [extends IDENT] {` plus optional class-member modifier,
	// so destructure-with-default `let { a: b = c }` and object literals
	// with assignment values stay unaffected.
	{
		anchor: "identifier",
		before: seq(
			type("keyword", ["class"]),
			type("identifier"),
			optional(seq(type("keyword", ["extends"]), type("identifier"))),
			type("punctuation", ["{"]),
			optional(
				type("keyword", [
					"readonly",
					"public",
					"private",
					"protected",
					"static",
					"abstract",
					"override",
					"accessor",
					"declare",
				]),
			),
		),
		when: seq(
			type("operator", [":", "?:"]),
			type("identifier"),
			type("operator", ["="]),
		),
		rewrite: "identifier",
	},
	// type annotation exclusion: identifier followed by `:` then a builtin
	// type token (string, number, boolean, etc.) is a type annotation, not
	// a property. catches class fields and typed function parameters. also
	// excludes interface members with builtin types, which is an accepted
	// tradeoff. only fires in grammars that emit a "type" token (typescript).
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
	{
		anchor: "identifier",
		before: any_of(
			type("punctuation", ["{", ","]),
			// class/interface member modifiers
			type("keyword", [
				"readonly",
				"public",
				"private",
				"protected",
				"static",
				"abstract",
				"override",
				"accessor",
				"declare",
			]),
		),
		when: seq(type("operator", [":", "?:"])),
		rewrite: "property",
	},
];

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
	let language;
	if (tag_name === "html") language = html_language;
	else if (tag_name === "css") language = css_language;
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

// Default reclassifier pipeline applied to JS tokenization output.
//
// Ordering:
//   1. rewrite_types — operates on JS-only tokens to mark function variables.
//   2. embed_interleaved — finds tagged templates and splices HTML/CSS.
//
// Running rewrite_types first means function-variable detection sees the raw
// JS stream (including the `html`/`css` identifier and its surrounding
// context) before any splicing. embed_interleaved preserves the trigger
// identifier in the output, so subsequent passes could still see it.
// Stateful pass: walk the token stream once, identify brace depths that
// belong to interface bodies, and promote `identifier` followed by `:` (or
// `?:`) inside them to `property`. The rule-based reclassifier can't tell
// interface members apart from class fields by lookbehind alone (subsequent
// members are preceded by `;`, not the `interface IDENT {` header), so this
// small stateful function fills the gap. Plain JS (no `interface` keyword)
// is unaffected — the scan finds nothing to promote.
export const interface_member_promoter: Reclassifier = (input, result) => {
	const { tokens, token_types } = result;
	const n = tokens.length / 3;
	if (n === 0) return result;

	const identifier_id = token_types.indexOf("identifier");
	const keyword_id = token_types.indexOf("keyword");
	const punctuation_id = token_types.indexOf("punctuation");
	const operator_id = token_types.indexOf("operator");
	const comment_id = token_types.indexOf("comment");
	if (
		identifier_id < 0 ||
		keyword_id < 0 ||
		punctuation_id < 0 ||
		operator_id < 0
	) {
		// grammar doesn't use one of the required token types — nothing to do.
		return result;
	}

	// allocate the property type if it isn't present yet.
	let property_id = token_types.indexOf("property");
	if (property_id < 0) {
		property_id = token_types.length;
		token_types.push("property");
	}

	const text = (i: number): string =>
		input.slice(tokens[i * 3 + 1], tokens[i * 3 + 2]);

	const next_non_trivia = (from: number): number => {
		for (let i = from; i < n; i++) {
			if (tokens[i * 3] !== comment_id) return i;
		}
		return -1;
	};

	let brace_depth = 0;
	let paren_depth = 0;
	let bracket_depth = 0;
	const interface_depths = new Set<number>();

	for (let i = 0; i < n; i++) {
		const type_id = tokens[i * 3];

		// detect `interface IDENT [extends IDENT (. IDENT)* (, ...)*] {`.
		if (type_id === keyword_id && text(i) === "interface") {
			const name_idx = next_non_trivia(i + 1);
			if (name_idx === -1 || tokens[name_idx * 3] !== identifier_id) continue;
			let cur = next_non_trivia(name_idx + 1);
			if (
				cur !== -1 &&
				tokens[cur * 3] === keyword_id &&
				text(cur) === "extends"
			) {
				// walk through the extends list (identifiers separated by `.` or `,`)
				// until we hit `{`. defensive: bail if we don't find `{`.
				cur = next_non_trivia(cur + 1);
				while (cur !== -1) {
					if (tokens[cur * 3] === punctuation_id && text(cur) === "{") break;
					cur = next_non_trivia(cur + 1);
				}
			}
			if (
				cur === -1 ||
				tokens[cur * 3] !== punctuation_id ||
				text(cur) !== "{"
			)
				continue;
			// the `{` itself is processed by the depth-tracking branch below,
			// which will increment brace_depth to N+1. mark N+1 as an
			// interface body.
			interface_depths.add(brace_depth + 1);
			i = cur - 1; // re-enter the loop on cur to count the `{`.
			continue;
		}

		if (type_id === punctuation_id) {
			const t = text(i);
			if (t === "{") brace_depth++;
			else if (t === "}") {
				interface_depths.delete(brace_depth);
				brace_depth--;
			} else if (t === "(") paren_depth++;
			else if (t === ")") paren_depth--;
			else if (t === "[") bracket_depth++;
			else if (t === "]") bracket_depth--;
		}

		// inside an interface body — but NOT inside a method-signature
		// parameter list `(...)` or a computed-key bracket `[...]` — an
		// identifier followed by `:` (or `?:`) is a member name. promote
		// to property. the paren/bracket guard prevents typed params like
		// `find(id: number)` from being promoted as interface members.
		if (
			interface_depths.has(brace_depth) &&
			paren_depth === 0 &&
			bracket_depth === 0 &&
			type_id === identifier_id
		) {
			const next = next_non_trivia(i + 1);
			if (next !== -1 && tokens[next * 3] === operator_id) {
				const t = text(next);
				if (t === ":" || t === "?:") {
					tokens[i * 3] = property_id;
				}
			}
		}
	}

	return result;
};

export const reclassifiers = [
	rewrite_types(function_variable_rules, { trivia: ["comment"] }),
	interface_member_promoter,
	embed_interleaved({ scan: scan_tagged_template }),
];
