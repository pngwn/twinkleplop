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
//     `svelte_block` — one token type covers every `{#if}`, `{:else}`,
//     `{/each}`, `{@html}`, `{@const}`, etc.
//   - The name `svelte_directive` is reserved for element directive
//     prefixes (`bind:`, `on:`, …); it never applies to `{@…}` forms.
//   - Element directive prefixes (`bind:`, `on:`, `use:`, `transition:`,
//     `in:`, `out:`, `animate:`, `class:`, `style:`, `let:`) emit the full
//     `prefix:` run as a single `svelte_directive` token; the property
//     name follows as a regular `attr_name` and `|` modifier separators
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
//     a single `tag_name` span here; a reclassifier splits the `svelte:`
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

import { enter, fallback, goto, keyword, leave, match, on, range, within } from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

// Token type names. Most match the HTML grammar so styles carry over.
// Svelte-specific:
// Distinct type for `{` / `}` that bound a Svelte expression or block.
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

const ASCII_ALPHA = range([
  ["a", "z"],
  ["A", "Z"],
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
  match("{", TOKENS.expression, enter("expression_body")),
  match('"', TOKENS.string, enter("attr_string_double")),
  match("'", TOKENS.string, enter("attr_string_single")),
  match(DIRECTIVE_PREFIXES, TOKENS.svelte_directive),
  match("|", TOKENS.punctuation),
  match(ATTR_NAME_CHARS, TOKENS.attr_name),
];

// Rules shared by expression_body (outermost `{…}`) and expression_brace
// (nested `{…}` inside an expression). Both skip string contents so `}`
// inside a string does not close the expression, and both push
// expression_brace on a nested `{`.
const expressionBodyRules = [
  within('"', '"', TOKENS.raw_svelte_expression, { escape: "\\", multiline: true }),
  within("'", "'", TOKENS.raw_svelte_expression, { escape: "\\", multiline: true }),
  within("/*", "*/", TOKENS.raw_svelte_expression, { multiline: true }),
  within("//", "\n", TOKENS.raw_svelte_expression),
  match("{", TOKENS.raw_svelte_expression, enter("expression_brace")),
  fallback({ token: TOKENS.raw_svelte_expression }),
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
        match(["<!DOCTYPE", "<!doctype"], TOKENS.doctype, enter("doctype")),
        match("</", TOKENS.punctuation, enter("close_tag")),
        on("<", enter("lt_probe")),
        // `{` always emits `expression`; brace_start dispatches on
        // the sigil that follows.
        match("{", TOKENS.expression, enter("brace_start")),
        fallback({}),
      ],
    },

    // -------------------------------------------------------------------
    // brace_start — just consumed `{`, route on sigil
    // -------------------------------------------------------------------
    //
    // The sigil (`#`, `:`, `/`, `@`) emits as `punctuation`; the
    // keyword that follows emits as `svelte_block` (both block and
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
        match(BLOCK_KEYWORDS, TOKENS.svelte_block, goto("expression_body")),
        fallback(goto("expression_body")),
      ],
    },

    // -------------------------------------------------------------------
    // at_directive_keyword — just consumed `@`; the keyword emits as
    // `svelte_block` (same token type as block keywords — `svelte-
    // directive` is reserved for element directive prefixes like
    // `bind:`, `on:`).
    // -------------------------------------------------------------------
    at_directive_keyword: {
      rules: [
        match(AT_DIRECTIVES, TOKENS.svelte_block, goto("expression_body")),
        fallback(goto("expression_body")),
      ],
    },

    // a < only opens a tag when an ascii letter follows, so a < b and <3 stay text
    lt_probe: {
      mode: "probe",
      fallback: "lt_text",
      rules: [
        on(ASCII_ALPHA, enter("lt_tag")),
        on("<", enter("lt_text_before_lt")),
        fallback(enter("lt_text")),
      ],
    },

    lt_tag: {
      rules: [match("<", TOKENS.punctuation, goto("tag_start"))],
    },

    // never entered when the next char is <, so on("<") eats only the one
    lt_text: {
      rules: [on("<"), fallback(leave())],
    },

    // a tokenless pop cannot consume, so the text < of << is emitted as punctuation
    lt_text_before_lt: {
      rules: [match("<", TOKENS.punctuation, leave())],
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
        keyword(["script"], goto("script_attrs"), TOKENS.tag_name),
        keyword(["style"], goto("style_attrs"), TOKENS.tag_name),
        match("svelte", "keyword", {
          boundary: true,
          ...goto("tag_svelte_ns"),
        }),
        match(TAG_NAME_CHARS, TOKENS.tag_name, goto("tag_open")),
      ],
    },

    // -------------------------------------------------------------------
    // tag_svelte_ns — just emitted `svelte` as svelte-element; expect
    // the namespace separator `:`. If something else follows (e.g.
    // `<svelte-foo>`) the fallback routes to tag_open which extends
    // the tag-name run gracefully.
    // -------------------------------------------------------------------
    tag_svelte_ns: {
      rules: [match(":", TOKENS.punctuation, goto("tag_open")), fallback(goto("tag_open"))],
    },

    // -------------------------------------------------------------------
    // tag_open — continuation of a tag name after the first char has
    // been consumed. No keyword rules here so mid-name runs like
    // `<noscript>` don't spuriously match `script` at position 3.
    // -------------------------------------------------------------------
    tag_open: {
      rules: [
        match("/>", TOKENS.punctuation, leave()),
        match(">", TOKENS.punctuation, leave()),
        on([" ", "\t", "\n", "\r"], goto("tag_attrs")),
        match(TAG_NAME_CHARS, TOKENS.tag_name),
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
        match(TAG_NAME_CHARS, TOKENS.tag_name),
      ],
    },

    // -------------------------------------------------------------------
    // doctype
    // -------------------------------------------------------------------
    doctype: {
      rules: [match(">", TOKENS.punctuation, leave()), fallback({ token: TOKENS.doctype })],
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

    // See the comment on script_content in the HTML grammar — the
    // closer is split via a probe chain so `</script>` emits three
    // tokens (`</` tag-boundary · `script` tag-name · `>` tag-
    // boundary) instead of one atomic tag-name span.
    script_content: {
      rules: [on("</", enter("script_close_probe")), fallback({ token: TOKENS.raw_script })],
    },

    script_close_probe: {
      mode: "probe",
      fallback: "script_close_fail",
      rules: [on("script>", goto("script_close_emit"))],
    },

    script_close_fail: {
      rules: [match("<", TOKENS.raw_script, leave())],
    },

    script_close_emit: {
      rules: [match("</", TOKENS.punctuation, goto("script_close_name"))],
    },

    script_close_name: {
      rules: [match("script", TOKENS.tag_name, goto("script_close_gt"))],
    },

    script_close_gt: {
      rules: [match(">", TOKENS.punctuation, leave())],
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
      rules: [on("</", enter("style_close_probe")), fallback({ token: TOKENS.raw_style })],
    },

    style_close_probe: {
      mode: "probe",
      fallback: "style_close_fail",
      rules: [on("style>", goto("style_close_emit"))],
    },

    style_close_fail: {
      rules: [match("<", TOKENS.raw_style, leave())],
    },

    style_close_emit: {
      rules: [match("</", TOKENS.punctuation, goto("style_close_name"))],
    },

    style_close_name: {
      rules: [match("style", TOKENS.tag_name, goto("style_close_gt"))],
    },

    style_close_gt: {
      rules: [match(">", TOKENS.punctuation, leave())],
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
        match("{", TOKENS.expression, enter("expression_body")),
        fallback({ token: TOKENS.string }),
      ],
    },

    attr_string_single: {
      rules: [
        match("'", TOKENS.string, leave()),
        match("{", TOKENS.expression, enter("expression_body")),
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
      rules: [match("}", TOKENS.expression, leave()), ...expressionBodyRules],
    },

    // -------------------------------------------------------------------
    // expression_brace — nested `{…}` inside an expression
    // -------------------------------------------------------------------
    expression_brace: {
      rules: [match("}", TOKENS.raw_svelte_expression, leave()), ...expressionBodyRules],
    },
  },
});
