// Svelte grammar — HTML extended with `{expression}` interpolations,
// `{#if}` / `{#each}` / `{#await}` / `{#key}` / `{#snippet}` block syntax,
// and Svelte element directives (`bind:`, `on:`, `use:`, etc.).
//
// Token model:
//   - `{` and `}` that delimit a Svelte expression, block, or directive
//     emit the `expression` token type (distinct from `punctuation` used
//     for `<`, `>`, `=`, `|`, etc.).
//   - The sigil that introduces a block or at-directive (`#`, `:`, `/`,
//     `@`) emits as `punctuation`; the keyword that follows emits as
//     `svelte-block` — one token type covers every `{#if}`, `{:else}`,
//     `{/each}`, `{@html}`, `{@const}`, etc.
//   - The name `svelte-directive` is reserved for element directive
//     prefixes (`bind:`, `on:`, …); it never applies to `{@…}` forms.
//   - Element directive prefixes (`bind:`, `on:`, `use:`, `transition:`,
//     `in:`, `out:`, `animate:`, `class:`, `style:`, `let:`) emit the full
//     `prefix:` run as a single `svelte-directive` token; the property
//     name follows as a regular `attr-name` and `|` modifier separators
//     are `punctuation`.
//   - Attribute string values support interpolation: `class="foo {bar}"`
//     emits string / expression / expression-body / expression / string,
//     so the `{bar}` is surfaced for JS sub-tokenization.
//
// Scope:
//   - All of HTML's structural tokenization: tags, attrs, comments, doctype.
//   - `<script>` and `<style>` blocks → raw_script / raw_style, routed to
//     the JS / CSS sub-languages by the reclassifier.
//   - Generic `{expression}` interpolation in both text content and
//     attribute values. Body captured as `raw_svelte_expression` (coalesced)
//     and handed to the JS sub-language.
//   - Svelte special elements (`<svelte:component>`, etc.) are emitted as
//     a single `tag-name` span here; a reclassifier splits the `svelte:`
//     namespace in the post-pass.
//
// Known limitations:
//   - Inside a `raw_svelte_expression` body, `{` / `}` nesting is tracked
//     via the `expression_brace` state with string skipping (`"` / `'`)
//     and comment skipping (`//…\n`, `/*…*/`), but template literals
//     (`` ` ``) with `${…}` interpolation are not escape-aware here — the
//     JS sub-language handles them correctly once the outer `}` is located,
//     which only works because template literals in real Svelte expressions
//     do not contain unescaped `}` at the outer nesting level in practice.
//   - Regex literals are not recognized — a regex containing `}` closes the
//     expression early, and a regex whose first `/` sits immediately after
//     `{` is read as the close-block sigil shared with `{/if}` / `{/each}`.
//   - Dangling sigils (e.g. `{#notARealBlock}`) emit `#` as punctuation
//     and treat the remainder as a JS expression — the grammar does not
//     validate that the keyword after the sigil is a known block.

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

// Token type names. Most match the HTML grammar so styles carry over.
const TAG_NAME = "tag-name";
const TAG_BOUNDARY = "tag-boundary";
const ATTR_NAME = "attr-name";
const DOCTYPE = "doctype";
const RAW_SCRIPT = "raw_script";
const RAW_STYLE = "raw_style";
// Svelte-specific:
const SVELTE_BLOCK = "svelte-block";
const SVELTE_DIRECTIVE = "svelte-directive";
const RAW_SVELTE_EXPRESSION = "raw_svelte_expression";
// Distinct type for `{` / `}` that bound a Svelte expression or block.
const EXPRESSION = "expression";

// Tag name chars include `:` so `<svelte:component>` is a single token at
// this layer. A reclassifier splits `svelte:X` in the post-pass.
const TAG_NAME_CHARS = range([
	["a", "z"],
	["A", "Z"],
	["0", "9"],
	["-", "-"],
	["_", "_"],
	[":", ":"],
]);

// Attribute name chars do NOT include `:` or `|` — directive prefixes and
// modifier separators get their own tokens.
const ATTR_NAME_CHARS = range([
	["a", "z"],
	["A", "Z"],
	["0", "9"],
	["-", "-"],
	["_", "_"],
]);

// Block keyword bodies (no sigil). Within a single match() the compiler
// sorts descending-length per first-char bucket, so `else if` beats `else`.
const BLOCK_KEYWORDS = [
	"if",
	"each",
	"await",
	"key",
	"snippet",
	"else if",
	"else",
	"then",
	"catch",
];

// At-directive keyword bodies (no sigil).
const AT_DIRECTIVES = ["html", "const", "debug", "render"];

// Element directive prefixes (attribute-level). Each includes the trailing
// `:` so the whole run is one token; the property name after is a regular
// attr-name.
const DIRECTIVE_PREFIXES = [
	"bind:",
	"on:",
	"use:",
	"transition:",
	"in:",
	"out:",
	"animate:",
	"class:",
	"style:",
	"let:",
];

// Rules shared by states that sit inside a tag's opening `<…>` (generic,
// script, style). Directive prefixes + `|` modifier splits + attribute
// string interpolation.
const insideTagRules = [
	on([" ", "\t", "\n", "\r"]),
	match("=", TOKENS.operator),
	match("{", EXPRESSION, enter("expression_body")),
	match('"', TOKENS.string, enter("attr_string_double")),
	match("'", TOKENS.string, enter("attr_string_single")),
	match(DIRECTIVE_PREFIXES, SVELTE_DIRECTIVE),
	match("|", TOKENS.punctuation),
	match(ATTR_NAME_CHARS, ATTR_NAME),
];

// Rules shared by expression_body (outermost `{…}`) and expression_brace
// (nested `{…}` inside an expression). Both skip string contents so `}`
// inside a string does not close the expression, and both push
// expression_brace on a nested `{`.
const expressionBodyRules = [
	within('"', '"', RAW_SVELTE_EXPRESSION, { escape: "\\", multiline: true }),
	within("'", "'", RAW_SVELTE_EXPRESSION, { escape: "\\", multiline: true }),
	within("/*", "*/", RAW_SVELTE_EXPRESSION, { multiline: true }),
	within("//", "\n", RAW_SVELTE_EXPRESSION),
	match("{", RAW_SVELTE_EXPRESSION, enter("expression_brace")),
	fallback({ token: RAW_SVELTE_EXPRESSION }),
];

/** @type {import("@twinkleplop/core").Grammar} */
export default define_grammar({
	name: "svelte",
	states: {
		// -------------------------------------------------------------------
		// content — top-level template
		// -------------------------------------------------------------------
		content: {
			rules: [
				within("<!--", "-->", TOKENS.comment),
				match(["<!DOCTYPE", "<!doctype"], DOCTYPE, enter("doctype")),
				match("</", TAG_BOUNDARY, enter("close_tag")),
				match("<", TAG_BOUNDARY, enter("tag_start")),
				// `{` always emits `expression`; brace_start dispatches on
				// the sigil that follows.
				match("{", EXPRESSION, enter("brace_start")),
				fallback({}),
			],
		},

		// -------------------------------------------------------------------
		// brace_start — just consumed `{`, route on sigil
		// -------------------------------------------------------------------
		//
		// The sigil (`#`, `:`, `/`, `@`) emits as `punctuation`; the
		// keyword that follows emits as `svelte-block` (both block and
		// at-directive families share the same token type). goto() here
		// (not enter) because we're replacing brace_start on the stack —
		// the `{` already pushed the parent state.
		brace_start: {
			rules: [
				match(["#", "/", ":"], TOKENS.punctuation, goto("block_keyword")),
				match("@", TOKENS.punctuation, goto("at_directive_keyword")),
				fallback(goto("expression_body")),
			],
		},

		// -------------------------------------------------------------------
		// block_keyword — just consumed `#`, `/`, or `:`; match a known
		// block keyword or fall through to expression body.
		// -------------------------------------------------------------------
		block_keyword: {
			rules: [
				match(BLOCK_KEYWORDS, SVELTE_BLOCK, goto("expression_body")),
				fallback(goto("expression_body")),
			],
		},

		// -------------------------------------------------------------------
		// at_directive_keyword — just consumed `@`; the keyword emits as
		// `svelte-block` (same token type as block keywords — `svelte-
		// directive` is reserved for element directive prefixes like
		// `bind:`, `on:`).
		// -------------------------------------------------------------------
		at_directive_keyword: {
			rules: [
				match(AT_DIRECTIVES, SVELTE_BLOCK, goto("expression_body")),
				fallback(goto("expression_body")),
			],
		},

		// -------------------------------------------------------------------
		// tag_start — fires ONCE, just consumed `<`
		// -------------------------------------------------------------------
		//
		// Special-name rules (script, style, svelte:) live here so they
		// only match at the true start of a tag name. `boundary: true`
		// alone wouldn't be safe — it only checks the char AFTER the
		// pattern, so `<notsvelte:foo>` would match the `svelte` run at
		// position 3 and split the tag name incorrectly. After one name
		// char is consumed we `goto("tag_open")`, which has no keyword
		// rules and just extends the tag-name run.
		tag_start: {
			rules: [
				keyword(["script"], goto("script_attrs"), TAG_NAME),
				keyword(["style"], goto("style_attrs"), TAG_NAME),
				match("svelte", "svelte-element", {
					boundary: true,
					...goto("tag_svelte_ns"),
				}),
				match("/>", TAG_BOUNDARY, leave()),
				match(">", TAG_BOUNDARY, leave()),
				on([" ", "\t", "\n", "\r"], goto("tag_attrs")),
				match(TAG_NAME_CHARS, TAG_NAME, goto("tag_open")),
			],
		},

		// -------------------------------------------------------------------
		// tag_svelte_ns — just emitted `svelte` as svelte-element; expect
		// the namespace separator `:`. If something else follows (e.g.
		// `<svelte-foo>`) the fallback routes to tag_open which extends
		// the tag-name run gracefully.
		// -------------------------------------------------------------------
		tag_svelte_ns: {
			rules: [
				match(":", TOKENS.punctuation, goto("tag_open")),
				fallback(goto("tag_open")),
			],
		},

		// -------------------------------------------------------------------
		// tag_open — continuation of a tag name after the first char has
		// been consumed. No keyword rules here so mid-name runs like
		// `<noscript>` don't spuriously match `script` at position 3.
		// -------------------------------------------------------------------
		tag_open: {
			rules: [
				match("/>", TAG_BOUNDARY, leave()),
				match(">", TAG_BOUNDARY, leave()),
				on([" ", "\t", "\n", "\r"], goto("tag_attrs")),
				match(TAG_NAME_CHARS, TAG_NAME),
			],
		},

		// -------------------------------------------------------------------
		// tag_attrs — attributes of a generic (or Svelte component) tag
		// -------------------------------------------------------------------
		tag_attrs: {
			rules: [
				match("/>", TAG_BOUNDARY, leave()),
				match(">", TAG_BOUNDARY, leave()),
				...insideTagRules,
			],
		},

		// -------------------------------------------------------------------
		// close_tag — inside `</name>`
		// -------------------------------------------------------------------
		close_tag: {
			rules: [
				match(">", TAG_BOUNDARY, leave()),
				on([" ", "\t", "\n", "\r"]),
				match(TAG_NAME_CHARS, TAG_NAME),
			],
		},

		// -------------------------------------------------------------------
		// doctype
		// -------------------------------------------------------------------
		doctype: {
			rules: [
				match(">", TAG_BOUNDARY, leave()),
				fallback({ token: DOCTYPE }),
			],
		},

		// -------------------------------------------------------------------
		// script_attrs / script_content — same as HTML
		// -------------------------------------------------------------------
		script_attrs: {
			rules: [
				match("/>", TAG_BOUNDARY, leave()),
				match(">", TAG_BOUNDARY, goto("script_content")),
				...insideTagRules,
			],
		},

		// See the comment on script_content in the HTML grammar — the
		// closer is split via a probe chain so `</script>` emits three
		// tokens (`</` tag-boundary · `script` tag-name · `>` tag-
		// boundary) instead of one atomic tag-name span.
		script_content: {
			rules: [
				on("</", enter("script_close_probe")),
				fallback({ token: RAW_SCRIPT }),
			],
		},

		script_close_probe: {
			mode: "probe",
			fallback: "script_close_fail",
			rules: [on("script>", goto("script_close_emit"))],
		},

		script_close_fail: {
			rules: [match("<", RAW_SCRIPT, leave())],
		},

		script_close_emit: {
			rules: [match("</", TAG_BOUNDARY, goto("script_close_name"))],
		},

		script_close_name: {
			rules: [match("script", TAG_NAME, goto("script_close_gt"))],
		},

		script_close_gt: {
			rules: [match(">", TAG_BOUNDARY, leave())],
		},

		// -------------------------------------------------------------------
		// style_attrs / style_content — same as HTML
		// -------------------------------------------------------------------
		style_attrs: {
			rules: [
				match("/>", TAG_BOUNDARY, leave()),
				match(">", TAG_BOUNDARY, goto("style_content")),
				...insideTagRules,
			],
		},

		style_content: {
			rules: [
				on("</", enter("style_close_probe")),
				fallback({ token: RAW_STYLE }),
			],
		},

		style_close_probe: {
			mode: "probe",
			fallback: "style_close_fail",
			rules: [on("style>", goto("style_close_emit"))],
		},

		style_close_fail: {
			rules: [match("<", RAW_STYLE, leave())],
		},

		style_close_emit: {
			rules: [match("</", TAG_BOUNDARY, goto("style_close_name"))],
		},

		style_close_name: {
			rules: [match("style", TAG_NAME, goto("style_close_gt"))],
		},

		style_close_gt: {
			rules: [match(">", TAG_BOUNDARY, leave())],
		},

		// -------------------------------------------------------------------
		// attr_string_double / attr_string_single — quoted attr values
		// -------------------------------------------------------------------
		//
		// Svelte interpolates `{…}` inside quoted attribute strings, so a
		// dedicated state is needed (within() would swallow the whole
		// string). Literal string chunks emit `string` and coalesce with
		// the opening / closing quote tokens.
		attr_string_double: {
			rules: [
				match('"', TOKENS.string, leave()),
				match("{", EXPRESSION, enter("expression_body")),
				fallback({ token: TOKENS.string }),
			],
		},

		attr_string_single: {
			rules: [
				match("'", TOKENS.string, leave()),
				match("{", EXPRESSION, enter("expression_body")),
				fallback({ token: TOKENS.string }),
			],
		},

		// -------------------------------------------------------------------
		// expression_body — inside `{…}` at the outermost level
		// -------------------------------------------------------------------
		//
		// A single `}` closes this state and pops back to wherever the `{`
		// was pushed from (content, tag_attrs, or an attr_string_*).
		// Nested `{…}` pushes an expression_brace which only pops one
		// level on its `}`.
		expression_body: {
			rules: [
				match("}", EXPRESSION, leave()),
				...expressionBodyRules,
			],
		},

		// -------------------------------------------------------------------
		// expression_brace — nested `{…}` inside an expression
		// -------------------------------------------------------------------
		expression_brace: {
			rules: [
				match("}", RAW_SVELTE_EXPRESSION, leave()),
				...expressionBodyRules,
			],
		},
	},
});
