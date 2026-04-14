import { create_language } from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
import { default as raw_grammar } from "./grammar.js";
import { reclassifiers } from "./reclassifiers.js";

// Three-tier API shared by every language package:
//
//   language       → one-call entry point for the full enriched experience
//                    (Svelte template + embedded JS/CSS sub-languages)
//   grammar        → raw compiled Svelte grammar, for consumers who want
//                    bare tokens without embedding
//   reclassifiers  → the default reclassifier list (embed_grammars mapping
//                    raw_script/raw_style/raw_svelte_expression) — append
//                    your own to extend

export const grammar = compile(raw_grammar);
export const language = create_language(grammar, reclassifiers);
export { raw_grammar, reclassifiers };
