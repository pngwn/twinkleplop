// CSS reclassifier rules.
//
// the css grammar emits `identifier` for every value-position word (color
// names, keywords like `auto` / `inherit`, and function heads like `rgb`,
// `calc`, `url`, `linear-gradient`). this pass promotes any `identifier`
// token that is immediately followed by `(` to `function`, so function
// calls render with the `function` token color rather than blending into
// regular value identifiers.
//
// tokens considered: first-match-wins against `type("identifier")`,
// lookahead is `type("punctuation", "(")`. trivia (comments) between the
// two is skipped by the rewrite engine.

import { rewrite_types, seq, tag, type } from "@twinkleplop/core";
import type { LanguagePipeline } from "@twinkleplop/core";

export const function_call_rules = [
	{
		anchor: "identifier",
		when: seq(type("punctuation", "(")),
		rewrite: "function",
	},
];

export const reclassifiers: LanguagePipeline = [
	tag(rewrite_types(function_call_rules, { trivia: ["comment"] }), [
		"function",
	]),
];
