// Svelte grammar — HTML with `{expression}` interpolations and
// `{#if}` / `{#each}` / `{#await}` / `{#key}` / `{#snippet}` block syntax.
//
// Scope (MVP):
//   - All of HTML's structural tokenization (tags, attrs, comments, doctype)
//   - `<script>` and `<style>` blocks → raw_script / raw_style (same as HTML)
//   - `{expression}` interpolations in text content — grammar emits a
//     single `raw_svelte_expression` token for the content between `{` and
//     matching `}`; the reclassifier hands this off to the JavaScript
//     sub-language via embed_grammars.
//   - `{expression}` as attribute values (`<p class={cls}>`) — same
//     mechanism, triggered inside tag-attrs states.
//   - Svelte block syntax: `{#if expr}` … `{:else if expr}` … `{:else}` …
//     `{/if}`, `{#each}` etc., `{#await}`/`{:then}`/`{:catch}`, `{#key}`,
//     `{#snippet}`. Closing forms like `{/if}` are emitted as a single
//     `svelte-block` token; opening forms emit `{#if` as svelte-block then
//     enter expression_body for the trailing expression.
//   - `{@html}`, `{@const}`, `{@debug}`, `{@render}` directives.
//
// The expression_body state tracks nested braces and skips over string
// literals so `{fn({a: "}"})}` closes on the correct outer `}`. The full
// expression text is coalesced into a single `raw_svelte_expression` token
// (adjacent same-type tokens fuse automatically). embed_grammars in the
// reclassifier then sub-tokenizes it as JavaScript.

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
const ATTR_NAME = "attr-name";
const DOCTYPE = "doctype";
const RAW_SCRIPT = "raw_script";
const RAW_STYLE = "raw_style";
// Svelte-specific:
const SVELTE_BLOCK = "svelte-block";
const SVELTE_DIRECTIVE = "svelte-directive";
const RAW_SVELTE_EXPRESSION = "raw_svelte_expression";

// Svelte extends HTML's attr-name character set with `:` for directives
// (`bind:value`, `on:click`, `class:active`) and `|` for modifiers
// (`on:click|preventDefault`).
const NAME_CHARS = range([
	["a", "z"],
	["A", "Z"],
	["0", "9"],
	["-", "-"],
	["_", "_"],
	[":", ":"],
	["|", "|"],
]);

// Literals that open a Svelte block with a trailing expression.
// Order matters: longest-first so `{:else if` wins over `{:else}`.
const BLOCK_WITH_EXPR = [
	"{#if",
	"{#each",
	"{#await",
	"{#key",
	"{#snippet",
	"{:else if",
	"{:then",
	"{:catch",
];

// Complete block tokens that don't have a trailing expression.
const BLOCK_STANDALONE = [
	"{:else}",
	"{:then}",
	"{:catch}",
	"{/if}",
	"{/each}",
	"{/await}",
	"{/key}",
	"{/snippet}",
];

// At-directives that open with a trailing expression.
const AT_DIRECTIVES = ["{@html", "{@const", "{@debug", "{@render"];

// Rules shared between states that sit "inside a tag's opening `<...>`" —
// attributes, whitespace, delimiters, and Svelte's `{expression}` attribute
// values.
const insideTagRules = [
	on([" ", "\t", "\n", "\r"]),
	match("=", TOKENS.operator),
	// `attr={expression}` — push into expression handling directly.
	match("{", TOKENS.punctuation, enter("expression_body")),
	within('"', '"', TOKENS.string),
	within("'", "'", TOKENS.string),
	match(NAME_CHARS, ATTR_NAME),
];

// Rules shared between expression_body (the outermost `{...}` state) and
// expression_brace (any inner `{...}` pushed for nested object literals).
// BOTH states agree on: skip string contents, nest on `{`, leave on `}`.
// They differ only in where `leave()` returns to — expression_body pops
// back to the caller (content or tag_attrs), while expression_brace pops
// one brace level.
const expressionBodyRules = [
	// Skip string contents so `}` inside a string doesn't close the expression.
	within('"', '"', RAW_SVELTE_EXPRESSION, { escape: "\\", multiline: true }),
	within("'", "'", RAW_SVELTE_EXPRESSION, { escape: "\\", multiline: true }),
	// Nested `{` pushes another brace level. Tracked on the state stack.
	match("{", RAW_SVELTE_EXPRESSION, enter("expression_brace")),
	// Anything else becomes raw expression content (coalesced into one
	// token thanks to same-type adjacency fusion in the tokenizer).
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
				// Svelte block openings — match the keyword part, then enter
				// expression_body to capture the trailing JS expression.
				match(BLOCK_WITH_EXPR, SVELTE_BLOCK, enter("expression_body")),
				// Standalone block tokens — single match, no expression body.
				match(BLOCK_STANDALONE, SVELTE_BLOCK),
				// At-directives.
				match(AT_DIRECTIVES, SVELTE_DIRECTIVE, enter("expression_body")),
				// Generic `{expression}` interpolation.
				match("{", TOKENS.punctuation, enter("expression_body")),
				// HTML tags: script/style route to their own attrs states for
				// raw-content handling, everything else is a generic tag.
				match("</", TOKENS.punctuation, enter("close_tag")),
				match("<", TOKENS.punctuation, enter("tag_open")),
				fallback({}),
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
				match(NAME_CHARS, TAG_NAME),
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
				match(NAME_CHARS, TAG_NAME),
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
		// expression_body — inside `{...}` at the outermost level
		// -------------------------------------------------------------------
		//
		// A single `}` closes this state and pops back to wherever the `{`
		// was pushed from (content state or tag_attrs state). Nested `{...}`
		// pushes an expression_brace which only pops one level on its `}`.
		expression_body: {
			rules: [
				match("}", TOKENS.punctuation, leave()),
				...expressionBodyRules,
			],
		},

		// -------------------------------------------------------------------
		// expression_brace — nested `{...}` inside an expression
		// -------------------------------------------------------------------
		expression_brace: {
			rules: [
				match("}", RAW_SVELTE_EXPRESSION, leave()),
				...expressionBodyRules,
			],
		},
	},
});
