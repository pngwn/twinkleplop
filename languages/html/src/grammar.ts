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

// tag names ignore ascii case and rules cannot fold case, so spell out every casing
const ascii_cases = (word: string): string[] => {
  const out: string[] = [];
  for (let mask = 0; mask < 1 << word.length; mask++) {
    let s = "";
    for (let i = 0; i < word.length; i++) {
      s += mask & (1 << i) ? word[i].toUpperCase() : word[i];
    }
    out.push(s);
  }
  return out;
};

const SCRIPT = ascii_cases("script");
const STYLE = ascii_cases("style");
const SCRIPT_CLOSE = SCRIPT.map((name) => name + ">");
const STYLE_CLOSE = STYLE.map((name) => name + ">");

const ASCII_ALPHA = range([
  ["a", "z"],
  ["A", "Z"],
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
        on("<", enter("lt_probe")),
        fallback({}),
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
    // `script` and `style` with a word boundary route to language-
    // specific attrs states so the body can be tokenized as raw
    // content. These rules live here (not in tag_open) so they only
    // match at the true start of a tag name — otherwise `<noscript>`
    // would match `script` at position 3 and swallow the rest of the
    // document as raw_script.
    tag_start: {
      rules: [
        keyword(SCRIPT, goto("script_attrs"), TOKENS.tag_name),
        keyword(STYLE, goto("style_attrs"), TOKENS.tag_name),
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
      rules: [on(SCRIPT_CLOSE, goto("script_close_emit"))],
    },

    script_close_fail: {
      rules: [match("<", TOKENS.raw_script, leave())],
    },

    script_close_emit: {
      rules: [match("</", TOKENS.punctuation, goto("script_close_name"))],
    },

    script_close_name: {
      rules: [match(SCRIPT, TOKENS.tag_name, goto("script_close_gt"))],
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
      rules: [on(STYLE_CLOSE, goto("style_close_emit"))],
    },

    style_close_fail: {
      rules: [match("<", TOKENS.raw_style, leave())],
    },

    style_close_emit: {
      rules: [match("</", TOKENS.punctuation, goto("style_close_name"))],
    },

    style_close_name: {
      rules: [match(STYLE, TOKENS.tag_name, goto("style_close_gt"))],
    },

    style_close_gt: {
      rules: [match(">", TOKENS.punctuation, leave())],
    },
  },
});
