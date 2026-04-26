import { create_language, to_html } from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
import type { LanguageOptions, RenderOptions } from "@twinkleplop/core";
import { default as raw_grammar } from "./grammar.js";
import {
  claim_property_scope,
  function_variable_rules,
  reclassifiers,
  scan_tagged_template,
} from "./reclassifiers.js";

// public API:
//
//   language(opts?) → (code, render?) => HTML string
//   tokenize(opts?) → (code) => TokenizeResult
//   grammar         → the compiled grammar for direct use
//   reclassifiers   → post-pass rules (reused from JavaScript)
//
// `language` is the simple, one-import path for highlighting source to HTML.
// `tokenize` is the same factory shape but returns raw token data for
// consumers building custom renderers (e.g. CSS Custom Highlight API).

export const grammar = compile(raw_grammar);
export const tokenize = create_language(grammar, reclassifiers);

export function language(options?: LanguageOptions) {
  const tokenize_fn = tokenize(options);
  return (input: string, render?: RenderOptions): string =>
    to_html(input, tokenize_fn(input), render);
}

export {
  raw_grammar,
  reclassifiers,
  claim_property_scope,
  function_variable_rules,
  scan_tagged_template,
};
