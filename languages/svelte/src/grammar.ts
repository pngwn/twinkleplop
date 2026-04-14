// Svelte grammar — HTML extended with `{expression}` interpolations,
// `{#if}` / `{#each}` / `{#await}` / `{#key}` / `{#snippet}` block syntax,
// and Svelte element directives (`bind:`, `on:`, `use:`, etc.).
//
// Scope:
//   - All of HTML's structural tokenization: tags, attrs, comments, doctype.
//   - `<script>` and `<style>` blocks → raw_script / raw_style, routed to
//     the JS / CSS sub-languages by the reclassifier.
//   - Generic `{expression}` interpolation in both text content and
//     attribute values. Body captured as `raw_svelte_expression` (coalesced)
//     and handed to the JS sub-language.
//   - Svelte block syntax: the opening `{` is always `punctuation`, then a
//     `svelte-block` token captures the keyword (`#if`, `:else if`, `/each`,
//     …), then an expression body (if any), then the closing `}` as
//     `punctuation`. Every `{` and `}` in the grammar is `punctuation` for
//     symmetry.
//   - `{@html}`, `{@const}`, `{@debug}`, `{@render}` emit the keyword as
//     `svelte-directive`; same `{` / body / `}` shape as blocks.
//   - Element directive prefixes (`bind:`, `on:`, `use:`, `transition:`,
//     `in:`, `out:`, `animate:`, `class:`, `style:`, `let:`) emit the whole
//     `prefix:` run as a single `svelte-directive` token; the property name
//     after follows as a regular `attr-name`, and `|` modifier separators
//     are `punctuation`.
//   - Attribute string values support interpolation: `class="foo {bar}"`
//     emits string / punctuation / expression / punctuation / string, so
//     the `{bar}` is surfaced for JS sub-tokenization.
//
// Known limitations:
//   - `<svelte:component>` / `<svelte:element>` / etc. are emitted as a
//     single `tag-name` token (the `:` is baked into the tag name run);
//     the grammar does not split the `svelte:` namespace.
//   - Inside a `raw_svelte_expression` body, `{` / `}` nesting is tracked
//     via the `expression_brace` state and string skipping (`"` / `'`),
//     but template literals (`` ` ``) with `${…}` interpolation are NOT
//     escape-aware here — the JS sub-language handles them correctly once
//     the outer `}` is located, which only works because template literals
//     in real Svelte expressions do not contain unescaped `}` at the outer
//     nesting level in practice.
//   - `@attach`/runes references (`$state`, `$derived`, `$effect`, `$props`,
//     `$bindable`) are JS-level constructs tokenized by the embedded JS
//     grammar, not here.

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

import { define_grammar } from "@twinkleplop/core/compile";
import * as TOKENS from "@twinkleplop/core/tokens";

// Token type names. Most match the HTML grammar so styles carry over.
const TAG_NAME = "tag-name";
const ATTR_NAME = "attr-name";
const DOCTYPE = "doctype";
const RAW_SCRIPT = "raw_script";
const RAW_STYLE = "raw_style";
// Svelte-specific:
const SVELTE_BLOCK = "svelte-block";
const SVELTE_DIRECTIVE = "svelte-directive";
const RAW_SVELTE_EXPRESSION = "raw_svelte_expression";

// Tag name chars include `:` so `<svelte:component>` is a single token.
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

// Block keywords emitted after the opening `{`. Longest-first ordering is
// handled by the compiler within a single match() call, so `:else if`
// beats `:else` automatically.
const BLOCK_KEYWORDS = [
	"#if",
	"#each",
	"#await",
	"#key",
	"#snippet",
	":else if",
	":else",
	":then",
	":catch",
	"/if",
	"/each",
	"/await",
	"/key",
	"/snippet",
];

// At-directives emitted after the opening `{`.
const AT_DIRECTIVES = ["@html", "@const", "@debug", "@render"];

// Element directive prefixes. Each includes the trailing `:` so the whole
// run is one token; the property name after is a regular attr-name.
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
	match("{", TOKENS.punctuation, enter("expression_body")),
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
				match("</", TOKENS.punctuation, enter("close_tag")),
				match("<", TOKENS.punctuation, enter("tag_open")),
				// `{` is always punctuation; brace_start dispatches to the
				// right expression state based on what follows.
				match("{", TOKENS.punctuation, enter("brace_start")),
				fallback({}),
			],
		},

		// -------------------------------------------------------------------
		// brace_start — just consumed `{`, decide block vs directive vs expr
		// -------------------------------------------------------------------
		//
		// goto() here (not enter) because we're replacing brace_start on the
		// stack with expression_body — the `{` already pushed content onto
		// the stack, and we want expression_body's `}`→leave() to pop back
		// to content.
		brace_start: {
			rules: [
				match(BLOCK_KEYWORDS, SVELTE_BLOCK, goto("expression_body")),
				match(AT_DIRECTIVES, SVELTE_DIRECTIVE, goto("expression_body")),
				fallback(goto("expression_body")),
			],
		},

		// -------------------------------------------------------------------
		// tag_open — just consumed `<`, now reading the tag name
		// -------------------------------------------------------------------
		tag_open: {
			rules: [
				keyword(["script"], goto("script_attrs"), TAG_NAME),
				keyword(["style"], goto("style_attrs"), TAG_NAME),
				match("/>", TOKENS.punctuation, leave()),
				match(">", TOKENS.punctuation, leave()),
				on([" ", "\t", "\n", "\r"], goto("tag_attrs")),
				match(TAG_NAME_CHARS, TAG_NAME),
			],
		},

		// -------------------------------------------------------------------
		// tag_attrs — attributes of a generic (or Svelte component) tag
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
				match(TAG_NAME_CHARS, TAG_NAME),
			],
		},

		// -------------------------------------------------------------------
		// doctype
		// -------------------------------------------------------------------
		doctype: {
			rules: [
				match(">", TOKENS.punctuation, leave()),
				fallback({ token: DOCTYPE }),
			],
		},

		// -------------------------------------------------------------------
		// script_attrs / script_content — same as HTML
		// -------------------------------------------------------------------
		script_attrs: {
			rules: [
				match("/>", TOKENS.punctuation, leave()),
				match(">", TOKENS.punctuation, goto("script_content")),
				...insideTagRules,
			],
		},

		script_content: {
			rules: [
				match("</script>", TAG_NAME, leave()),
				fallback({ token: RAW_SCRIPT }),
			],
		},

		// -------------------------------------------------------------------
		// style_attrs / style_content — same as HTML
		// -------------------------------------------------------------------
		style_attrs: {
			rules: [
				match("/>", TOKENS.punctuation, leave()),
				match(">", TOKENS.punctuation, goto("style_content")),
				...insideTagRules,
			],
		},

		style_content: {
			rules: [
				match("</style>", TAG_NAME, leave()),
				fallback({ token: RAW_STYLE }),
			],
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
				match("{", TOKENS.punctuation, enter("expression_body")),
				fallback({ token: TOKENS.string }),
			],
		},

		attr_string_single: {
			rules: [
				match("'", TOKENS.string, leave()),
				match("{", TOKENS.punctuation, enter("expression_body")),
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
			rules: [match("}", TOKENS.punctuation, leave()), ...expressionBodyRules],
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
