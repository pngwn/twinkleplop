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
import { tokenize as css_tokenize } from "@twinkleplop/css";
import { tokenize as js_tokenize } from "@twinkleplop/javascript";
import { tokenize as svelte_tokenize } from "@twinkleplop/svelte";
import { tokenize as yaml_tokenize } from "@twinkleplop/yaml";
import { default as raw_grammar } from "./grammar.js";
import { reclassifiers } from "./reclassifiers.js";

/**
 * script, style, expressions and front matter are always highlighted,
 * a fence is highlighted when its language is js, css, svelte or yaml, or is passed in here
 * @example
 * import { tokenize as ts } from "@twinkleplop/typescript";
 * const typescript = ts();
 * const svx = language({ languages: { ts: typescript, typescript } });
 */
export interface MdsvexLanguageOptions extends LanguageOptions {
  // keyed by the first word of a fence info string, merged over the defaults
  languages?: Record<string, LanguageFn>;
}

// built on first use
function lazy(create: () => LanguageFn): LanguageFn {
  let fn: LanguageFn | undefined;
  return (input: string) => (fn ??= create())(input);
}

const javascript = lazy(js_tokenize);
const css = lazy(css_tokenize);
const svelte = lazy(svelte_tokenize);
const yaml = lazy(yaml_tokenize);

const default_languages: Record<string, LanguageFn> = {
  js: javascript,
  javascript,
  css,
  svelte,
  yaml,
  yml: yaml,
};

export const grammar = compile(raw_grammar);

function pipeline(languages: Record<string, LanguageFn>): LanguagePipeline {
  return [
    ...reclassifiers,
    always(embed_grammars({ raw_front_matter: yaml }), "embed"),
    always(embed_labelled({ label: "code_language", body: "raw_code_block", languages }), "embed"),
  ];
}

const base = create_language(grammar, pipeline(default_languages));

export function tokenize(options?: MdsvexLanguageOptions): LanguageFn {
  const languages = options?.languages;
  if (languages === undefined) return base(options);
  return create_language(grammar, pipeline({ ...default_languages, ...languages }))(options);
}

export function language(options?: MdsvexLanguageOptions) {
  const tokenize_fn = tokenize(options);
  return (input: string, render?: RenderOptions): string =>
    to_html(input, tokenize_fn(input), render);
}

export { raw_grammar, reclassifiers };
