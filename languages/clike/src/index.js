import { compile } from "@twinkleplop/core/compile";
import { default as raw_grammar } from "./grammar.js";

export const grammar = compile(raw_grammar);
export { raw_grammar };
