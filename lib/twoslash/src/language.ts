// Build a "TypeScript-ish" language fn on top of @twinkleplop/javascript.
//
// We reuse the JS grammar and its full reclassifier pipeline, then append
// the TS keyword reclassifier so TS-only keywords render with the
// `keyword` token class. A dedicated `@twinkleplop/typescript` grammar
// package is out of scope here — this covers the ~20 keyword difference
// that matters for visual highlighting.

import { compile, create_language } from "@twinkleplop/core";
import {
	raw_grammar,
	reclassifiers ,
} from "@twinkleplop/javascript";
import {  ts_keyword_reclassifier } from "./ts-keywords";

const grammar = compile(raw_grammar);

export const language = create_language(grammar, [
	...reclassifiers,
	ts_keyword_reclassifier,
]);
