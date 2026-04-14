import { create_language } from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
import { default as raw_grammar } from "./grammar.js";
import {
	function_variable_rules,
	interface_member_promoter,
	reclassifiers,
	scan_tagged_template,
} from "./reclassifiers.js";

// Three-tier API surface shared by every language package:
//
//   language       → one-call entry point: (input) → enriched TokenizeResult
//   grammar        → the raw compiled grammar (for consumers who want only
//                    base tokens, or who want to compose a custom pipeline)
//   reclassifiers  → the default reclassifier list (for consumers who want
//                    to prepend/append their own rules)
//
// Typical use is `import { language } from "@twinkleplop/javascript"` — the
// full enriched experience without composing anything by hand.
//
// Individual reclassifier pieces (`function_variable_rules`,
// `interface_member_promoter`, `scan_tagged_template`) are exported so
// benchmarks and advanced consumers can compose custom pipelines without
// copy-pasting the canonical rules or opt out of the cross-language
// tagged-template embedder when they want a JS-only pipeline.

export const grammar = compile(raw_grammar);
export const language = create_language(grammar, reclassifiers);
export {
	raw_grammar,
	reclassifiers,
	function_variable_rules,
	interface_member_promoter,
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
	PROBE_OPERATORS,
	IDENTIFIER_TERMINATORS,
	SINGLE_LINE_COMMENT,
	MULTI_LINE_COMMENT,
	STRING_DOUBLE,
	STRING_SINGLE,
	TEMPLATE_LITERAL,
	js_comments,
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
