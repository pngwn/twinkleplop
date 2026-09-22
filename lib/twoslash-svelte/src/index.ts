// Public entry point for @twinkleplop/twoslash-svelte.
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

/** each call builds a typescript environment, so create one per set of options and reuse it */
export function create_highlighter(options: HighlightOptions = {}) {
  const twoslasher = create_twoslasher(resolve_twoslash_options(options));
  return create_pipeline((code) => twoslasher(code, "svelte"), svelte, options);
}

export { create_twoslasher };
