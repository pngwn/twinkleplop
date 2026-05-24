// Svelte reclassifier bundle.
//
// The Svelte grammar produces three kinds of "raw" tokens that get handed
// off to sub-languages via embed_grammars:
//
//   - raw_script: content of `<script>…</script>` → JavaScript
//   - raw_style:  content of `<style>…</style>`  → CSS
//   - raw_svelte_expression:
//       content of `{…}` interpolations and block-expression heads
//       → JavaScript
//
// We also post-process `expression` braces: a `{` that opens a block or
// at-directive form (immediately followed by `#`, `:`, `/`, `@`) is more
// useful as `punctuation` than as `expression`, and the matching closing
// `}` gets the same treatment.
//
// a single stateful pass handles both braces in one walk. for each
// `expression "{"` whose next non-comment neighbour is a block/at-directive
// sigil, it records the open position, then scans forward for the next
// `expression "}"` and rewrites both to `punctuation`. this sidesteps the
// subtle ordering issue that two separate passes had: if `embed_grammars`
// runs before the close rewrite, the raw_svelte_expression token gets
// replaced by sub-language tokens (number, operator, etc) that a lookbehind
// trivia list cannot fully enumerate. walking once, in one pass, pairs
// braces by their own token type and does not depend on what the
// expression body has become.

import type { LanguageFn, LanguagePipeline, Reclassifier } from "@twinkleplop/core";
import { always, embed_grammars, matched_bracket } from "@twinkleplop/core";
import { tokenize as css_tokenize } from "@twinkleplop/css";
import { tokenize as js_tokenize } from "@twinkleplop/javascript";

// cached default-fidelity sub-tokenizers for embed call sites (see HTML
// package for rationale).
let js_fn: LanguageFn | undefined;
let css_fn: LanguageFn | undefined;
const js_default = (src: string) => (js_fn ??= js_tokenize())(src);
const css_default = (src: string) => (css_fn ??= css_tokenize())(src);

// retag block / at-directive braces from `expression` to `punctuation`.
// gate: a `{` whose next non-comment neighbour is a punctuation `#`, `:`,
// `/`, or `@` opens a block form (`{#if ...}`, `{@html ...}`); pair it
// with the matching `}` and retag both. ordinary interpolation braces
// without a sigil are left as `expression` so the grammar's embed splices
// JS inside them.
const rewrite_block_braces: Reclassifier = matched_bracket({
  open_type: "expression",
  open_text: "{",
  close_type: "expression",
  close_text: "}",
  post_open_required: { type: "punctuation", text_in: ["#", ":", "/", "@"] },
  retag_open_to: "punctuation",
  retag_close_to: "punctuation",
});

export const reclassifiers: LanguagePipeline = [
  always(rewrite_block_braces, "type_claim"),
  always(
    embed_grammars({
      raw_script: js_default,
      raw_style: css_default,
      raw_svelte_expression: js_default,
    }),
    "embed",
  ),
];
