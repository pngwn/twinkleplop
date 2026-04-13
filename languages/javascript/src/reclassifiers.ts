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
	// {
	// 	anchor: "identifier",
	// 	before: any_of(
	// 		type("punctuation", [";"]),
	// 		type("keyword", [
	// 			"readonly",
	// 			"public",
	// 			"private",
	// 			"protected",
	// 			"static",
	// 			"abstract",
	// 			"override",
	// 			"accessor",
	// 			"declare",
	// 		]),
	// 		seq(
	// 			type("keyword", ["interface"]),
	// 			type("identifier"),
	// 			type("punctuation", ["{"]),
	// 		),
	// 		seq(
	// 			type("keyword", ["interface"]),
	// 			type("identifier"),
	// 			type("keyword", ["extends"]),
	// 			type("identifier"),
	// 			type("punctuation", ["{"]),
	// 		),
	// 	),
	// 	when: seq(type("operator", [":", "?:"]), type("type")),
	// 	rewrite: "property",
	// },
	// type annotation exclusion: identifier followed by `:` then a builtin
	// type token (string, number, boolean, etc.) is a type annotation, not
	// a property. catches class fields and typed function parameters. also
	// excludes interface members with builtin types, which is an accepted
	// tradeoff. only fires in grammars that emit a "type" token (typescript).
	{
		anchor: "identifier",
    when: any_of(
      seq(type("operator", [":", "?:"]), type("type")),
      seq(type("operator", [":", "?:"]), type("identifier"), type("punctuation", [";"]))
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
export const reclassifiers = [
	rewrite_types(function_variable_rules, { trivia: ["comment"] }),
	embed_interleaved({ scan: scan_tagged_template }),
];
