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
// Lazy closure-based language references prevent workspace cycle issues at
// module-load time (same pattern as the HTML package).

import { embed_grammars } from "@twinkleplop/core";
import { language as css_language } from "@twinkleplop/css";
import { language as js_language } from "@twinkleplop/javascript";

export const reclassifiers = [
	embed_grammars({
		raw_script: (src) => js_language(src),
		raw_style: (src) => css_language(src),
		raw_svelte_expression: (src) => js_language(src),
	}),
];
