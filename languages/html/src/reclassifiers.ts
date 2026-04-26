// HTML reclassifier bundle.
//
// The HTML grammar emits `raw_script` and `raw_style` tokens for the
// content inside `<script>…</script>` and `<style>…</style>`. Post-pass
// reclassification maps those to the JavaScript and CSS languages via
// `embed_grammars`, so script bodies are tokenized as JS and style bodies
// as CSS — with each sub-language's own reclassifiers applied before
// splicing (e.g. JS's function-variable detection).
//
// Consumers who want bare HTML without embedding can import `grammar`
// instead of `language` and skip these reclassifiers.
//
// **Circular import handling.** JavaScript's reclassifiers depend on this
// package (for `` html`...` `` / `` css`...` `` tagged templates), which
// creates a workspace cycle: html → js → html. The ESM module graph handles
// this as long as the cross-language references are looked up LAZILY rather
// than captured at module-eval time — so we wrap `js_tokenize`/`css_tokenize`
// in closures. By the time embed_grammars actually calls one of these, the
// sibling module has finished evaluating and the binding is live.

import { always, embed_grammars } from "@twinkleplop/core";
import type { LanguageFn, LanguagePipeline } from "@twinkleplop/core";
import { tokenize as js_tokenize } from "@twinkleplop/javascript";
import { tokenize as css_tokenize } from "@twinkleplop/css";

// sub-language factories are invoked lazily on first embed. the factory
// call is cheap (one pipeline build) but we still cache to avoid rebuilding
// per tokenize pass.
let js_fn: LanguageFn | undefined;
let css_fn: LanguageFn | undefined;
const js_default = (src: string) => (js_fn ??= js_tokenize())(src);
const css_default = (src: string) => (css_fn ??= css_tokenize())(src);

export const reclassifiers: LanguagePipeline = [
  always(
    embed_grammars({
      raw_script: js_default,
      raw_style: css_default,
    }),
    "embed",
  ),
];
