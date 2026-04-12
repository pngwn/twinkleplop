// HTML grammar — minimal but correct enough to embed CSS/JS.
//
// Scope (Phase 2 MVP):
//   - Plain text content
//   - Opening tags `<name attrs>` and `<name attrs/>`
//   - Closing tags `</name>`
//   - Attributes: name-only, name="value", name='value'
//   - Comments `<!-- ... -->`
//   - DOCTYPE `<!DOCTYPE ...>` (case-insensitive for the keyword itself)
//   - Script data: everything inside `<script>…</script>` becomes a single
//     `raw_script` token (the reclassifier hands this off to JavaScript)
//   - Style data: same treatment for `<style>…</style>` → `raw_style`
//
// Known limitations (acceptable for MVP):
//   - Tag name matching is case-sensitive; `<SCRIPT>` is NOT recognized as
//     a script element. Real HTML is ASCII case-insensitive for tag names.
//   - `</script ` (whitespace before `>`) is not recognized as the end of
//     script data — we only match literal `</script>`.
//   - `<script-*>` custom elements (rare) will be mis-tokenized as script
//     tags because the boundary check can't exclude `-`.
//   - CDATA sections are not handled.
//   - HTML entities (`&amp;` etc.) are not tokenized specially.

import {
	enter,
	fallback,
	goto,
	keyword,
	leave,
	match,
	on,
	range,
	within,
} from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

// Custom token type names. These flow through to CSS classes in the
// rendered output and to the reclassifier's embed mapping.
const TAG_NAME = "tag-name";
const ATTR_NAME = "attr-name";
const DOCTYPE = "doctype";
const RAW_SCRIPT = "raw_script";
const RAW_STYLE = "raw_style";

const NAME_CHARS = range([
	["a", "z"],
	["A", "Z"],
	["0", "9"],
	["-", "-"],
	["_", "_"],
	[":", ":"],
]);

// Shared rules for any "inside a tag's opening `<...>`" state — attributes
// and whitespace. Different tag states layer their own `>` / `/>` handling
// on top so the exit target can vary (attrs → leave vs script → content).
const insideTagRules = [
	on([" ", "\t", "\n", "\r"]),
	match("=", TOKENS.operator),
	within('"', '"', TOKENS.string),
	within("'", "'", TOKENS.string),
	match(NAME_CHARS, ATTR_NAME),
];

/** @type {import("@twinkleplop/core").Grammar} */
export default define_grammar({
	name: "html",
	states: {
		// -------------------------------------------------------------------
		// content — top-level text between tags
		// -------------------------------------------------------------------
		content: {
			rules: [
				within("<!--", "-->", TOKENS.comment),
				match(["<!DOCTYPE", "<!doctype"], DOCTYPE, enter("doctype")),
				match("</", TOKENS.punctuation, enter("close_tag")),
				match("<", TOKENS.punctuation, enter("tag_open")),
				fallback({}),
			],
		},

		// -------------------------------------------------------------------
		// tag_open — just consumed `<`, now reading the tag name
		// -------------------------------------------------------------------
		//
		// `script` and `style` with a word boundary route to language-
		// specific attrs states so the body can be tokenized as raw content.
		// Other names stay in this state consuming NAME_CHARS one at a time
		// (coalesced into a single tag-name token by the tokenizer) until
		// a non-name char — whitespace, `>`, or `/>` — triggers the exit.
		tag_open: {
			rules: [
				keyword(["script"], goto("script_attrs"), TAG_NAME),
				keyword(["style"], goto("style_attrs"), TAG_NAME),
				match("/>", TOKENS.punctuation, leave()),
				match(">", TOKENS.punctuation, leave()),
				on([" ", "\t", "\n", "\r"], goto("tag_attrs")),
				match(NAME_CHARS, TAG_NAME),
			],
		},

		// -------------------------------------------------------------------
		// tag_attrs — attributes of a generic opening tag
		// -------------------------------------------------------------------
		tag_attrs: {
			rules: [
				match("/>", TOKENS.punctuation, leave()),
				match(">", TOKENS.punctuation, leave()),
				...insideTagRules,
			],
		},

		// -------------------------------------------------------------------
		// close_tag — inside `</name>`
		// -------------------------------------------------------------------
		close_tag: {
			rules: [
				match(">", TOKENS.punctuation, leave()),
				on([" ", "\t", "\n", "\r"]),
				match(NAME_CHARS, TAG_NAME),
			],
		},

		// -------------------------------------------------------------------
		// doctype — inside `<!DOCTYPE ...>`
		// -------------------------------------------------------------------
		doctype: {
			rules: [
				match(">", TOKENS.punctuation, leave()),
				fallback({ token: DOCTYPE }),
			],
		},

		// -------------------------------------------------------------------
		// script_attrs — attributes of `<script ...>`
		// -------------------------------------------------------------------
		script_attrs: {
			rules: [
				match("/>", TOKENS.punctuation, leave()),
				match(">", TOKENS.punctuation, goto("script_content")),
				...insideTagRules,
			],
		},

		// -------------------------------------------------------------------
		// script_content — raw text until `</script>`
		// -------------------------------------------------------------------
		//
		// The `</script>` rule fires first because the compiler sorts the
		// per-character bucket by descending pattern length. The fallback
		// below it matches any single character and emits RAW_SCRIPT —
		// adjacent same-type tokens are coalesced by the tokenizer so the
		// entire script body ends up as one raw_script token span.
		script_content: {
			rules: [
				match("</script>", TAG_NAME, leave()),
				fallback({ token: RAW_SCRIPT }),
			],
		},

		// -------------------------------------------------------------------
		// style_attrs — attributes of `<style ...>`
		// -------------------------------------------------------------------
		style_attrs: {
			rules: [
				match("/>", TOKENS.punctuation, leave()),
				match(">", TOKENS.punctuation, goto("style_content")),
				...insideTagRules,
			],
		},

		// -------------------------------------------------------------------
		// style_content — raw text until `</style>`
		// -------------------------------------------------------------------
		style_content: {
			rules: [
				match("</style>", TAG_NAME, leave()),
				fallback({ token: RAW_STYLE }),
			],
		},
	},
});
