// Svelte reclassifier bundle.
//
// The Svelte grammar produces three kinds of "raw" tokens that get handed
// off to sub-languages via embed_grammars:
//
//   - raw_script: content of `<script>…</script>` → JavaScript
//   - raw_style:  content of `<style>…</style>`  → CSS
//   - raw_svelte_expression:
//       content of `{…}` interpolations and block-expression heads
//       → JavaScript
//
// We also post-process `expression` braces: a `{` that opens a block or
// at-directive form (immediately followed by `#`, `:`, `/`, `@`) is more
// useful as `punctuation` than as `expression`, and the matching closing
// `}` gets the same treatment. Two rewrite_types passes handle this:
//   - pass 1: anchor `{` if the next non-trivia token is a `#`/`:`/`/`/`@`
//     punctuation — rewrite the `{` to `punctuation`.
//   - pass 2: anchor `}` if the preceding window includes a `{` already
//     rewritten to `punctuation` plus a block/at-directive sigil —
//     rewrite the `}` to `punctuation`.

import type { Reclassifier } from "@twinkleplop/core";
import {
	embed_grammars,
	rewrite_types,
	seq,
	type,
} from "@twinkleplop/core";
import { language as css_language } from "@twinkleplop/css";
import { language as js_language } from "@twinkleplop/javascript";

const BLOCK_OR_AT_SIGILS = ["#", ":", "/", "@"];

export const reclassifiers = [
	rewrite_types([
		{
			anchor: type("expression", "{"),
			when: seq(type("punctuation", BLOCK_OR_AT_SIGILS)),
			rewrite: "punctuation",
		},
	]),
	rewrite_types(
		[
			{
				anchor: type("expression", "}"),
				before: seq(
					type("punctuation", "{"),
					type("punctuation", BLOCK_OR_AT_SIGILS),
				),
				rewrite: "punctuation",
			},
		],
		{
			trivia: [
				"raw_svelte_expression",
				"identifier",
				"keyword",
				"svelte-block",
			],
		},
	),
	embed_grammars({
		raw_script: (src) => js_language(src),
		raw_style: (src) => css_language(src),
		raw_svelte_expression: (src) => js_language(src),
	}),
];
