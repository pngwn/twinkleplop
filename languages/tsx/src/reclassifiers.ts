// tsx reclassifiers — reuse the TypeScript pipeline.
//
// the typescript reclassifiers (which themselves reuse javascript's
// function-variable detection, scope-aware property claims, and
// tagged-template embedding) apply identically to tsx code. jsx-specific
// reclassification (e.g. promoting uppercase tag names to `selector_class`)
// can be added here later, but is not required for the base grammar to
// tokenize correctly.

export {
  claim_property_scope,
  function_variable_rules,
  reclassifiers,
  scan_tagged_template,
} from "@twinkleplop/typescript";
