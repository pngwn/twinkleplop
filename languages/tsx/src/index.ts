import { create_language } from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
import { default as raw_grammar } from "./grammar.js";
import {
	function_variable_rules,
	interface_member_promoter,
	reclassifiers,
	scan_tagged_template,
} from "./reclassifiers.js";

// three-tier API shared by every language package:
//
//   language       -> one-call entry point for tokenization
//   grammar        -> the compiled grammar for direct use
//   reclassifiers  -> post-pass rules (reused from TypeScript/JavaScript)

export const grammar = compile(raw_grammar);
export const language = create_language(grammar, reclassifiers);
export {
	raw_grammar,
	reclassifiers,
	function_variable_rules,
	interface_member_promoter,
	scan_tagged_template,
};
