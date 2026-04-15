import { compile } from "@twinkleplop/core/compile";
import { create_language } from "@twinkleplop/core";
import { default as raw_grammar } from "./grammar.js";

// three-tier API shared by every language package:
//
//   language       -> one-call entry point for tokenization
//   grammar        -> the compiled grammar for direct use
//   reclassifiers  -> post-pass rules (empty for TOML, no embedded languages)
export const grammar = compile(raw_grammar);
export const reclassifiers = [];
export const language = create_language(grammar, reclassifiers);
export { raw_grammar };
