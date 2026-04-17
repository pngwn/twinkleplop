// tsx reclassifiers — reuse the TypeScript pipeline.
//
// the typescript reclassifiers (which themselves reuse javascript's function-
// variable detection, interface member promotion, and tagged-template
// embedding) apply identically to tsx code. jsx-specific reclassification
// (e.g. promoting uppercase tag names to `class-name`) can be added here
// later, but is not required for the base grammar to tokenize correctly.

export {
	function_variable_rules,
	interface_member_promoter,
	reclassifiers,
	scan_tagged_template,
} from "@twinkleplop/typescript";
