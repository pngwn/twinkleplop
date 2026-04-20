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
// `}` gets the same treatment.
//
// a single stateful pass handles both braces in one walk. for each
// `expression "{"` whose next non-comment neighbour is a block/at-directive
// sigil, it records the open position, then scans forward for the next
// `expression "}"` and rewrites both to `punctuation`. this sidesteps the
// subtle ordering issue that two separate passes had: if `embed_grammars`
// runs before the close rewrite, the raw_svelte_expression token gets
// replaced by sub-language tokens (number, operator, etc) that a lookbehind
// trivia list cannot fully enumerate. walking once, in one pass, pairs
// braces by their own token type and does not depend on what the
// expression body has become.

import type {
	LanguageFn,
	LanguagePipeline,
	Reclassifier,
	TokenizeResult,
} from "@twinkleplop/core";
import { always, embed_grammars } from "@twinkleplop/core";
import { language as css_language } from "@twinkleplop/css";
import { language as js_language } from "@twinkleplop/javascript";

// cached default-fidelity sub-tokenizers for embed call sites (see HTML
// package for rationale).
let js_fn: LanguageFn | undefined;
let css_fn: LanguageFn | undefined;
const js_default = (src: string) => (js_fn ??= js_language())(src);
const css_default = (src: string) => (css_fn ??= css_language())(src);

const BLOCK_OR_AT_SIGILS = new Set(["#", ":", "/", "@"]);

const rewrite_block_braces: Reclassifier = (
	input: string,
	result: TokenizeResult,
): TokenizeResult => {
	const { tokens, token_types } = result;
	const n = tokens.length / 3;
	if (n === 0) return result;

	const expression_id = token_types.indexOf("expression");
	const punctuation_id = token_types.indexOf("punctuation");
	const comment_id = token_types.indexOf("comment");
	if (expression_id < 0 || punctuation_id < 0) return result;

	const text = (i: number): string =>
		input.slice(tokens[i * 3 + 1], tokens[i * 3 + 2]);

	const next_non_trivia = (from: number): number => {
		for (let i = from; i < n; i++) {
			if (tokens[i * 3] !== comment_id) return i;
		}
		return -1;
	};

	for (let i = 0; i < n; i++) {
		if (tokens[i * 3] !== expression_id) continue;
		if (text(i) !== "{") continue;
		const sigil_idx = next_non_trivia(i + 1);
		if (sigil_idx === -1) continue;
		if (tokens[sigil_idx * 3] !== punctuation_id) continue;
		if (!BLOCK_OR_AT_SIGILS.has(text(sigil_idx))) continue;

		for (let j = sigil_idx + 1; j < n; j++) {
			if (tokens[j * 3] !== expression_id) continue;
			if (text(j) !== "}") continue;
			tokens[i * 3] = punctuation_id;
			tokens[j * 3] = punctuation_id;
			i = j;
			break;
		}
	}
	return result;
};

export const reclassifiers: LanguagePipeline = [
	always(rewrite_block_braces, "type_claim"),
	always(
		embed_grammars({
			raw_script: js_default,
			raw_style: css_default,
			raw_svelte_expression: js_default,
		}),
		"embed",
	),
];
