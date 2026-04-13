// TypeScript reclassifiers — reuse the JavaScript pipeline.
//
// The JS reclassifiers (function-variable detection + tagged template
// embedding) apply identically to TypeScript code. The property rewrite
// rule (identifier before `:` becomes property) also benefits TS
// interface and type literal members.

export {
	function_variable_rules,
	reclassifiers,
	scan_tagged_template,
} from "@twinkleplop/javascript";
