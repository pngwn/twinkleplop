import { compile } from "@twinkleplop/core/compile";
import { create_language } from "@twinkleplop/core";
import { default as raw_grammar } from "./grammar.js";
import { reclassifiers } from "./reclassifiers.js";

// Three-tier API: language (one-call entry point), grammar (raw compiled
// grammar), reclassifiers (default post-pass rules — promotes function
// calls and normalises identifiers).
export const grammar = compile(raw_grammar);
export const language = create_language(grammar, reclassifiers);
export { raw_grammar, reclassifiers };
