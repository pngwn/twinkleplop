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

import { enter, fallback, goto, keyword, leave, match, on, range, within } from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

// Custom token type names. These flow through to CSS classes in the
// rendered output and to the reclassifier's embed mapping.
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
  match(NAME_CHARS, TOKENS.attr_name),
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
        match(["<!DOCTYPE", "<!doctype"], TOKENS.doctype, enter("doctype")),
        match("</", TOKENS.punctuation, enter("close_tag")),
        match("<", TOKENS.punctuation, enter("tag_start")),
        fallback({}),
      ],
    },

    // -------------------------------------------------------------------
    // tag_start — fires ONCE, just consumed `<`
    // -------------------------------------------------------------------
    //
    // `script` and `style` with a word boundary route to language-
    // specific attrs states so the body can be tokenized as raw
    // content. These rules live here (not in tag_open) so they only
    // match at the true start of a tag name — otherwise `<noscript>`
    // would match `script` at position 3 and swallow the rest of the
    // document as raw_script.
    tag_start: {
      rules: [
        keyword(["script"], goto("script_attrs"), TOKENS.tag_name),
        keyword(["style"], goto("style_attrs"), TOKENS.tag_name),
        match("/>", TOKENS.punctuation, leave()),
        match(">", TOKENS.punctuation, leave()),
        on([" ", "\t", "\n", "\r"], goto("tag_attrs")),
        match(NAME_CHARS, TOKENS.tag_name, goto("tag_open")),
      ],
    },

    // -------------------------------------------------------------------
    // tag_open — continuation of a tag name after the first char has
    // been consumed. No keyword rules here so mid-name runs don't
    // spuriously match special names.
    // -------------------------------------------------------------------
    tag_open: {
      rules: [
        match("/>", TOKENS.punctuation, leave()),
        match(">", TOKENS.punctuation, leave()),
        on([" ", "\t", "\n", "\r"], goto("tag_attrs")),
        match(NAME_CHARS, TOKENS.tag_name),
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
        match(NAME_CHARS, TOKENS.tag_name),
      ],
    },

    // -------------------------------------------------------------------
    // doctype — inside `<!TOKENS.doctype ...>`
    // -------------------------------------------------------------------
    doctype: {
      rules: [match(">", TOKENS.punctuation, leave()), fallback({ token: TOKENS.doctype })],
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
    // We can't atomically match `</script>` and emit three tokens
    // (`</` tag-boundary · `script` tag-name · `>` tag-boundary) in a
    // single rule, so the closer is split via a probe chain:
    //   1. on `</`, enter a probe that looks ahead for `script>`
    //   2. if found, goto() the emitter chain (no stack push) — which
    //      rewinds to `<` and emits the three tokens, then leave()s
    //      all the way back to the content state.
    //   3. if not found, fallback pushes script_content back on the
    //      stack, emits `<` as raw_script, and leave()s — the `/` and
    //      following chars continue to coalesce as raw_script.
    //
    // Adjacent same-type tokens are coalesced by the tokenizer so the
    // entire script body ends up as one raw_script token span.
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
    // style_content — raw text until `</style>` (same probe-chain shape
    // as script_content; see the comment on script_content above).
    // -------------------------------------------------------------------
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
  },
});
