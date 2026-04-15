import { create_language } from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
import { default as raw_grammar } from "./grammar.js";
import { reclassifiers } from "./reclassifiers.js";

// three-tier api shared by every language package:
//
//   language       -> one-call entry point (tokenize + reclassifier pipeline)
//   grammar        -> raw compiled markdown grammar for direct use
//   reclassifiers  -> empty for v1; fenced code body language dispatch and
//                     front matter yaml embedding are future additions.

export const grammar = compile(raw_grammar);
export const language = create_language(grammar, reclassifiers);
export { raw_grammar, reclassifiers };
