import {
  always,
  create_language,
  embed_grammars,
  embed_labelled,
  to_html,
} from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
import type {
  LanguageFn,
  LanguageOptions,
  LanguagePipeline,
  RenderOptions,
} from "@twinkleplop/core";
import { default as raw_grammar } from "./grammar.js";
import { reclassifiers } from "./reclassifiers.js";

// public API:
//
//   language(opts?) → (code, render?) => HTML string — the simple path.
//   tokenize(opts?) → (code) => TokenizeResult — for consumers building
//                     a custom renderer.
//   grammar         → raw compiled markdown grammar for direct use.
//   reclassifiers   → inline style composition, append your own to extend

/**
 * this package depends on no language, so fences and front matter highlight with the ones passed in
 * @example
 * import { tokenize as js } from "@twinkleplop/javascript";
 * import { tokenize as yaml } from "@twinkleplop/yaml";
 * const javascript = js();
 * const md = language({ languages: { js: javascript, javascript }, front_matter: yaml() });
 */
export interface MarkdownLanguageOptions extends LanguageOptions {
  // keyed by the first word of a fence info string
  languages?: Record<string, LanguageFn>;
  front_matter?: LanguageFn;
}

export const grammar = compile(raw_grammar);
const base = create_language(grammar, reclassifiers);

export function tokenize(options?: MarkdownLanguageOptions): LanguageFn {
  const languages = options?.languages;
  const front_matter = options?.front_matter;
  if (languages === undefined && front_matter === undefined) return base(options);
  const pipeline: LanguagePipeline = [...reclassifiers];
  if (front_matter !== undefined) {
    pipeline.push(always(embed_grammars({ raw_front_matter: front_matter }), "embed"));
  }
  if (languages !== undefined) {
    const fences = embed_labelled({ label: "code_language", body: "raw_code_block", languages });
    pipeline.push(always(fences, "embed"));
  }
  return create_language(grammar, pipeline)(options);
}

export function language(options?: MarkdownLanguageOptions) {
  const tokenize_fn = tokenize(options);
  return (input: string, render?: RenderOptions): string =>
    to_html(input, tokenize_fn(input), render);
}

export { raw_grammar, reclassifiers };
