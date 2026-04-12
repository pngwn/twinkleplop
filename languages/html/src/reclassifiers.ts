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
// than captured at module-eval time — so we wrap `js_language`/`css_language`
// in closures. By the time embed_grammars actually calls one of these, the
// sibling module has finished evaluating and the binding is live.

import { embed_grammars } from "@twinkleplop/core";
import { language as js_language } from "@twinkleplop/javascript";
import { language as css_language } from "@twinkleplop/css";

export const reclassifiers = [
	embed_grammars({
		raw_script: (src) => js_language(src),
		raw_style: (src) => css_language(src),
	}),
];
