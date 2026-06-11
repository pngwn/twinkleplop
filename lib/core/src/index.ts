// Main exports for @twinkleplop/core

export { tokenize } from "./tokenizer";
export { compile } from "./compiler";
export { verify, type VerifyIssue } from "./verify";
export { to_html } from "./generator";
export {
  create_language,
  disassemble_rules,
  embed_grammars,
  embed_interleaved,
  precedence_for,
  reclassify,
  rewrite_types,
  tag,
  always,
  as_claim_producer,
  type,
  seq,
  any_of,
  optional,
  capture,
  balanced_parens,
  repeat,
  not,
  params,
  GRAMMAR_EXTENSION_DOWNGRADES,
  GRAMMAR_EXTENSION_CATEGORIES,
} from "./reclassifier";
export { debug_enabled, set_debug_warnings, warn_once } from "./debug";
export type { DebugIssue } from "./debug";
export { make_token_view, make_scope_stack } from "./scan";
export type { TokenView, Scope, ScopeStack, Bracket } from "./scan";
export { frame_track } from "./frame_track";
export { param_list } from "./param_list";
export { merge_adjacent } from "./merge_adjacent";
export { matched_bracket } from "./matched_bracket";
export { compound_compose } from "./compound_compose";
export {
  permute_claim_producers,
  tokens_to_named,
  collect_claims_per_pass,
  find_claim_conflicts,
} from "./test_util";
export type { ClaimConflict } from "./test_util";
export {
  promote_by_text_set,
  promote_pascal_case,
  promote_by_upper_snake_case,
  promote_function_calls,
} from "./fidelity";
export type { FunctionCallVariants } from "./fidelity";
export * from "./types";
export * from "./dsl";
export { build_annotation_extractor } from "./annotation";
