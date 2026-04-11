import { compile } from "@twinkleplop/core/compile";
import { createLanguage } from "@twinkleplop/core";
import { default as raw_grammar } from "./grammar.js";
import { reclassifiers } from "./reclassifiers.js";

// Three-tier API shared by every language package:
//
//   language       → one-call entry point for the full enriched experience
//                    (tokenize + embedding of JS and CSS)
//   grammar        → raw compiled HTML grammar, for consumers who want bare
//                    HTML tokens without any embedding
//   reclassifiers  → the default reclassifier list (just embedGrammars for
//                    script/style here) — append your own to extend

export const grammar = compile(raw_grammar);
export const language = createLanguage(grammar, reclassifiers);
export { raw_grammar, reclassifiers };
