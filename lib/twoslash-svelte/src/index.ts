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
import { render } from "@twinkleplop/twoslash";
import { create_twoslasher } from "./twoslasher";

interface HighlightOptions {
  class_name?: string;
  twoslash?: object;
}

// bind a default-fidelity svelte tokenizer once; the twoslash flow is
// not fidelity-configurable today.
const svelte = svelte_tokenize();

/**
 * Create a reusable Svelte highlighter. Caches the underlying
 * twoslash TypeScript environment across calls.
 */
export function create_highlighter(options: HighlightOptions = {}) {
  const twoslasher = create_twoslasher(options.twoslash ?? {});
  return (code: string) => {
    const result = twoslasher(code, "svelte");
    const tokens = svelte(result.code);
    return render(result.code, tokens, result, options);
  };
}

/**
 * Highlight a single .svelte snippet. For repeated calls, use
 * `create_highlighter` as it reuses the twoslash language-service instance.
 */
export function highlight(code: string, options: HighlightOptions = {}) {
  return create_highlighter(options)(code);
}

export { create_twoslasher };
