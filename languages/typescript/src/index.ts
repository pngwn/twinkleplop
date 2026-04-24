import { create_language } from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
import { default as raw_grammar } from "./grammar.js";
import {
  claim_property_scope,
  function_variable_rules,
  reclassifiers,
  scan_tagged_template,
} from "./reclassifiers.js";

// three-tier API shared by every language package:
//
//   language       -> one-call entry point for tokenization
//   grammar        -> the compiled grammar for direct use
//   reclassifiers  -> post-pass rules (reused from JavaScript)

export const grammar = compile(raw_grammar);
export const language = create_language(grammar, reclassifiers);
export {
  raw_grammar,
  reclassifiers,
  claim_property_scope,
  function_variable_rules,
  scan_tagged_template,
};
