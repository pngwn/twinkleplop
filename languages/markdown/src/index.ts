import { create_language, to_html } from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
import type { LanguageOptions, RenderOptions } from "@twinkleplop/core";
import { default as raw_grammar } from "./grammar.js";
import { reclassifiers } from "./reclassifiers.js";

// public API:
//
//   language(opts?) → (code, render?) => HTML string — the simple path.
//   tokenize(opts?) → (code) => TokenizeResult — for consumers building
//                     a custom renderer.
//   grammar         → raw compiled markdown grammar for direct use.
//   reclassifiers   → empty for v1; fenced code body language dispatch and
//                     front matter yaml embedding are future additions.

export const grammar = compile(raw_grammar);
export const tokenize = create_language(grammar, reclassifiers);

export function language(options?: LanguageOptions) {
  const tokenize_fn = tokenize(options);
  return (input: string, render?: RenderOptions): string =>
    to_html(input, tokenize_fn(input), render);
}

export { raw_grammar, reclassifiers };
