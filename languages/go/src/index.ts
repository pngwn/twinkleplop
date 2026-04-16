import { create_language } from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
import { default as raw_grammar } from "./grammar.js";

export const grammar = compile(raw_grammar);
export const reclassifiers = [];
export const language = create_language(grammar, reclassifiers);
export { raw_grammar };
