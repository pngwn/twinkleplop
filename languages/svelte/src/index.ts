import { create_language, to_html } from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
import type { LanguageOptions, RenderOptions } from "@twinkleplop/core";
import { default as raw_grammar } from "./grammar.js";
import { reclassifiers } from "./reclassifiers.js";

// public API:
//
//   language(opts?) → (code, render?) => HTML string — the simple path,
//                     full enriched experience including JS/CSS embedding.
//   tokenize(opts?) → (code) => TokenizeResult — same factory shape but
//                     returns raw token data for consumers building a
//                     custom renderer.
//   grammar         → raw compiled Svelte grammar, for consumers who want
//                     bare tokens without embedding.
//   reclassifiers   → the default reclassifier list (embed_grammars mapping
//                     raw_script/raw_style/raw_svelte_expression) — append
//                     your own to extend.

export const grammar = compile(raw_grammar);
export const tokenize = create_language(grammar, reclassifiers);

export function language(options?: LanguageOptions) {
  const tokenize_fn = tokenize(options);
  return (input: string, render?: RenderOptions): string =>
    to_html(input, tokenize_fn(input), render);
}

export { raw_grammar, reclassifiers };
