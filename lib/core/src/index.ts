// Main exports for @twinkleplop/core

export { tokenize } from "./tokenizer";
export { compile } from "./compiler";
export { verify, type VerifyIssue } from "./verify";
export { to_html } from "./generator";
export {
  create_language,
  embed_grammars,
  embed_interleaved,
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
  GRAMMAR_EXTENSION_DOWNGRADES,
  GRAMMAR_EXTENSION_CATEGORIES,
} from "./reclassifier";
export { make_token_view, make_scope_stack } from "./scan";
export type { TokenView, Scope, ScopeStack, Bracket } from "./scan";
export { frame_track } from "./frame_track";
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
