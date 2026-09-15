// Public entry point for @twinkleplop/twoslash-svelte.
//
//   highlight(code, options?)       → HTML string (one-shot)
//   create_highlighter(options?)    → (code) => HTML string (cached)
//
// Same API shape as @twinkleplop/twoslash but accepting .svelte source.
// Under the hood, `create_twoslasher` preprocesses with svelte2tsx and
// remaps type info back to the svelte file, then `render` from the
// sibling package walks those positions against tokens produced by the
// svelte grammar to emit the final <pre><code> HTML.

import { tokenize as svelte_tokenize } from "@twinkleplop/svelte";
import { create_pipeline, resolve_twoslash_options } from "@twinkleplop/twoslash";
import type { HighlightOptions as TsHighlightOptions } from "@twinkleplop/twoslash";
import { create_twoslasher } from "./twoslasher";

// the typescript package's options, minus the language this package fixes.
export type HighlightOptions = Omit<TsHighlightOptions, "lang">;

// bind a default-fidelity svelte tokenizer once; the twoslash flow is
// not fidelity-configurable today.
const svelte = svelte_tokenize();

/**
 * Create a reusable Svelte highlighter. Caches the underlying
 * twoslash TypeScript environment across calls.
 */
export function create_highlighter(options: HighlightOptions = {}) {
  const twoslasher = create_twoslasher(resolve_twoslash_options(options));
  return create_pipeline((code) => twoslasher(code, "svelte"), svelte, options);
}

/**
 * Highlight a single .svelte snippet. For repeated calls, use
 * `create_highlighter` as it reuses the twoslash language-service instance.
 */
export function highlight(code: string, options: HighlightOptions = {}) {
  return create_highlighter(options)(code);
}

export { create_twoslasher };
