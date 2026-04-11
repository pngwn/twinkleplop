import { compile } from "@twinkleplop/core/compile";
import { createLanguage } from "@twinkleplop/core";
import { default as raw_grammar } from "./grammar.js";

// Three-tier API: language (one-call entry point), grammar (raw compiled
// grammar), reclassifiers (default post-pass rules — empty for CSS).
export const grammar = compile(raw_grammar);
export const reclassifiers = [];
export const language = createLanguage(grammar, reclassifiers);
export { raw_grammar };
