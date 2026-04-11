// HTML reclassifier bundle.
//
// The HTML grammar emits `raw_script` and `raw_style` tokens for the
// content inside `<script>…</script>` and `<style>…</style>`. Post-pass
// reclassification maps those to the JavaScript and CSS languages via
// `embedGrammars`, so script bodies are tokenized as JS and style bodies
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
// than captured at module-eval time — so we wrap `jsLanguage`/`cssLanguage`
// in closures. By the time embedGrammars actually calls one of these, the
// sibling module has finished evaluating and the binding is live.

import { embedGrammars } from "@twinkleplop/core";
import { language as jsLanguage } from "@twinkleplop/javascript";
import { language as cssLanguage } from "@twinkleplop/css";

export const reclassifiers = [
	embedGrammars({
		raw_script: (src) => jsLanguage(src),
		raw_style: (src) => cssLanguage(src),
	}),
];
