import { create_language, to_html } from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
import type { LanguageOptions, RenderOptions } from "@twinkleplop/core";
import { default as raw_grammar } from "./grammar.js";
import {
  claim_property_scope,
  class_name_promoter,
  classify_reserved_names,
  function_variable_rules,
  js_frame_spec,
  js_frame_track,
  promote_boolean_literals,
  promote_call_site_functions,
  promote_js_const_bindings,
  promote_js_constants,
  promote_js_namespaces,
  promote_js_parameters,
  reclassifiers,
  scan_embedded_groups,
  scan_jsdoc,
  scan_tagged_template,
} from "./reclassifiers.js";

// public API:
//
//   language(opts?) → (code, render?) => HTML string — the simple path.
//   tokenize(opts?) → (code) => TokenizeResult — for consumers building
//                     a custom renderer (e.g. CSS Custom Highlight API).
//   grammar         → the raw compiled grammar (for bare base tokens or
//                     for composing a fully custom pipeline).
//   reclassifiers   → the default reclassifier list (prepend/append rules).
//
// Typical use is `import { language } from "@twinkleplop/javascript"` and
// then `language()(code)` — the full enriched experience without composing
// anything by hand.
//
// Individual reclassifier pieces (`function_variable_rules`,
// `claim_property_scope`, `scan_tagged_template`) are exported so benchmarks
// and advanced consumers can compose custom pipelines without copy-pasting
// the canonical rules or opt out of the cross-language tagged-template
// embedder when they want a JS-only pipeline.

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
  class_name_promoter,
  classify_reserved_names,
  function_variable_rules,
  js_frame_spec,
  js_frame_track,
  promote_boolean_literals,
  promote_call_site_functions,
  promote_js_const_bindings,
  promote_js_constants,
  promote_js_namespaces,
  promote_js_parameters,
  scan_embedded_groups,
  scan_jsdoc,
  scan_tagged_template,
};

// shared grammar building blocks for derived languages (e.g. typescript)
export {
  KEYWORDS,
  BOOLEAN_LITERALS,
  SPECIAL_VALUES,
  REGEX_PRECEDING_KEYWORDS,
  DIVISION_KEYWORDS,
  OP_4CHAR,
  OP_3CHAR,
  OP_SPREAD,
  OP_2CHAR,
  OP_1CHAR,
  OP_ALL,
  OP_ALL_OUTSIDE_MEMBER,
  PROBE_OPERATORS,
  IDENTIFIER_TERMINATORS,
  SINGLE_LINE_COMMENT,
  MULTI_LINE_COMMENT,
  STRING_DOUBLE,
  STRING_SINGLE,
  TEMPLATE_LITERAL,
  function_body_state,
  js_comments,
  member_access,
  member_access_entry,
  member_access_paren,
  paren_group_state,
  js_strings,
  js_whitespace,
  js_numbers_top,
  js_numbers_arg,
  js_common,
  js_body_common,
  js_tmpl_common,
  js_paren_common,
  operators,
  keywordsLiterals,
} from "./grammar.js";
