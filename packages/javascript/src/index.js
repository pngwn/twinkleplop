import { compile } from "@twinkleplop/core/compile";
import { createLanguage } from "@twinkleplop/core";
import { default as raw_grammar } from "./grammar.js";
import { reclassifiers, functionVariableRules } from "./reclassifiers.js";

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

export const grammar = compile(raw_grammar);
export const language = createLanguage(grammar, reclassifiers);
export { raw_grammar, reclassifiers, functionVariableRules };
