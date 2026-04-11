// JavaScript reclassifier rules.
//
// Each rule is a pattern over the raw JS token stream produced by the main
// grammar. Running these as a post-pass lets us recognize things that the
// state machine alone can't express cheaply:
//
//   - Function variables (`const foo = () => ...` → foo becomes `function`)
//   - Tagged template literals (`` html`...` ``, `` css`...` ``) — the body
//     is tokenized with the HTML or CSS language and spliced into the JS
//     token stream via the generic `embedInterleaved` transform, which
//     handles interpolations (`${expr}`) correctly by giving the sub
//     language full state continuity across holes.
//
// Rules here are **additive**: consumers who import just `grammar` get the
// base tokenizer behavior unchanged; consumers who import `language` also
// get these reclassifiers applied automatically.

import {
	anyOf,
	balancedParens,
	embedInterleaved,
	optional,
	rewriteTypes,
	seq,
	type,
} from "@twinkleplop/core";

// Cross-language references are imported lazily so the HTML ↔ JS workspace
// cycle (HTML embeds JS for `<script>`, JS embeds HTML for `` html`...` ``)
// resolves cleanly. The imported bindings may be `undefined` at module-eval
// time; by wrapping them in closures we defer the lookup until the sub
// language is actually invoked, by which point both modules are ready.
import { language as htmlLanguage } from "@twinkleplop/html";
import { language as cssLanguage } from "@twinkleplop/css";

// ---------------------------------------------------------------------------
// function-variable detection
// ---------------------------------------------------------------------------
//
// Recognizes identifiers assigned an arrow or function expression, and object
// property keys whose value is an arrow or function expression. This mirrors
// Prism's `function-variable` pattern:
//
//   const foo = () => ...          → foo becomes `function`
//   const foo = (a, b) => ...      → foo becomes `function`
//   const foo = async () => ...    → foo becomes `function`
//   const foo = function() {}      → foo becomes `function`
//   const foo = async function()   → foo becomes `function`
//   const foo = x => ...           → foo becomes `function`
//   { foo: () => ... }             → foo becomes `function`
//
// Limitations (same as Prism):
//   - `const foo = cond ? () => 1 : () => 2` — not detected (intervening `?`)
//   - `const foo = (() => fn)()`  — incorrectly matches (parses as arrow)
//   - deeply nested params `((a, b), c) => ...` — handled up to maxTokens
//
// Trivia (comments) is skipped between pattern elements, so
// `const foo /* wat */ = () => 1` still matches.

const functionExpression = anyOf(
	// `function(...)` or bare `function` keyword
	type("keyword", "function"),
	// `async function(...)`
	seq(type("keyword", "async"), type("keyword", "function")),
);

const arrowFunction = anyOf(
	// `(...) => ...` — balanced param list followed by fat arrow
	seq(balancedParens("(", ")"), type("operator", "=>")),
	// `async (...) => ...`
	seq(
		type("keyword", "async"),
		balancedParens("(", ")"),
		type("operator", "=>"),
	),
	// `x => ...` — single unparenthesized parameter
	seq(type("identifier"), type("operator", "=>")),
	// `async x => ...`
	seq(
		type("keyword", "async"),
		type("identifier"),
		type("operator", "=>"),
	),
);

export const functionVariableRules = [
	{
		anchor: "identifier",
		when: seq(
			// `=` (declaration/assignment) or `:` (object property)
			type("operator", ["=", ":"]),
			anyOf(functionExpression, arrowFunction),
		),
		rewrite: "function",
	},
];

// ---------------------------------------------------------------------------
// Tagged template literal embedding
// ---------------------------------------------------------------------------
//
// A single scanner recognizes `` html`...` `` and `` css`...` `` tagged
// templates, describing each as a GroupDescriptor for the generic
// `embedInterleaved` transform. The transform handles the rest:
//
//   1. Builds a virtual source by concatenating template content chunks
//      with space-filled interpolation holes.
//   2. Tokenizes it in ONE call to the sub language (HTML or CSS),
//      giving the sub language full state continuity across holes — so
//      attribute-position interpolations like `<p class="${cls}">hi</p>`
//      work correctly: the sub tokenizer sees a well-formed attribute
//      value and emits a single string token, which is then split at the
//      hole boundary in the output.
//   3. Splices the result back into the JS stream, preserving the
//      original interpolation tokens (`${`, expression, `}`) verbatim.
//
// The backticks at the start and end of the template are emitted as
// synthetic `template` tokens so they stay styled.

// Per-tokenTypes typeId cache. The scanner is called once per host token
// position in the stream, which means a naive `tokenTypes.indexOf(...)` per
// call costs O(n × m) per tokenize pass (n = token count, m = types per
// lookup). We memoize on the tokenTypes array reference — a WeakMap lets
// different compiled grammars share one scanner without holding onto their
// tokenTypes arrays once they go out of scope.
const typeIdCache = new WeakMap();

function getTypeIds(tokenTypes) {
	let ids = typeIdCache.get(tokenTypes);
	if (ids === undefined) {
		ids = {
			identifierId: tokenTypes.indexOf("identifier"),
			templateId: tokenTypes.indexOf("template"),
			punctuationId: tokenTypes.indexOf("punctuation"),
		};
		typeIdCache.set(tokenTypes, ids);
	}
	return ids;
}

/**
 * Scanner called at each host token position. Returns a GroupDescriptor if
 * a tagged template starts here, or null otherwise.
 *
 * @param {Uint32Array} tokens
 * @param {string} input
 * @param {number} i
 * @param {string[]} tokenTypes
 * @returns {import("@twinkleplop/core").GroupDescriptor | null}
 */
export function scanTaggedTemplate(tokens, input, i, tokenTypes) {
	const { identifierId, templateId, punctuationId } = getTypeIds(tokenTypes);
	if (identifierId < 0 || templateId < 0 || punctuationId < 0) return null;
	const count = tokens.length / 3;
	if (i >= count) return null;

	// Fast reject: trigger is an identifier. If the current token isn't an
	// identifier, no work to do — this rejects 99% of positions on a typical
	// token stream before any source-text comparison.
	if (tokens[i * 3] !== identifierId) return null;
	const tagStart = tokens[i * 3 + 1];
	const tagEnd = tokens[i * 3 + 2];
	const tagName = input.slice(tagStart, tagEnd);
	let language;
	if (tagName === "html") language = htmlLanguage;
	else if (tagName === "css") language = cssLanguage;
	else return null;

	const firstChunk = i + 1;
	if (firstChunk >= count || tokens[firstChunk * 3] !== templateId) return null;
	const firstStart = tokens[firstChunk * 3 + 1];
	if (input[firstStart] !== "`") return null;

	const regions = [];
	// Opening backtick as a synthetic template token (one char).
	regions.push({
		kind: "synthetic",
		sourceStart: firstStart,
		sourceEnd: firstStart + 1,
		typeName: "template",
	});

	let k = firstChunk;
	let inHole = false;
	let depth = 0;
	let holeTokStart = 0;
	let holeSourceStart = 0;

	while (k < count) {
		const tk = tokens[k * 3];
		const ts = tokens[k * 3 + 1];
		const te = tokens[k * 3 + 2];

		if (!inHole) {
			if (tk === templateId) {
				// A content chunk. First chunk has a leading backtick; last
				// chunk has a trailing backtick (marking end of group).
				const isFirst = k === firstChunk;
				const endsWithBacktick = input[te - 1] === "`";
				const contentStart = isFirst ? ts + 1 : ts;
				const contentEnd = endsWithBacktick ? te - 1 : te;
				if (contentEnd > contentStart) {
					regions.push({
						kind: "content",
						sourceStart: contentStart,
						sourceEnd: contentEnd,
					});
				}
				k++;
				if (endsWithBacktick) {
					// Closing backtick as a synthetic template token.
					regions.push({
						kind: "synthetic",
						sourceStart: te - 1,
						sourceEnd: te,
						typeName: "template",
					});
					// The trigger identifier (`html`/`css`) stays in the
					// host stream — only the template chunks + interpolations
					// are replaced.
					return {
						tokenStart: firstChunk,
						tokenEnd: k,
						regions,
						language,
					};
				}
			} else if (tk === punctuationId && input.slice(ts, te) === "${") {
				// Start of interpolation hole. Brace depth begins at 1.
				inHole = true;
				holeTokStart = k;
				holeSourceStart = ts;
				depth = 1;
				k++;
			} else {
				// Unexpected token between template chunks → malformed. Bail.
				return null;
			}
		} else {
			// Inside an interpolation. Track brace depth via any `{` / `}`
			// chars that appear in punctuation tokens (object literals,
			// function bodies, nested `${` all contribute).
			if (tk === punctuationId) {
				const src = input.slice(ts, te);
				for (let c = 0; c < src.length; c++) {
					const ch = src.charCodeAt(c);
					if (ch === 0x7b /* { */) depth++;
					else if (ch === 0x7d /* } */) depth--;
				}
				if (depth === 0) {
					// Hole closes at this token. Record it and resume content.
					regions.push({
						kind: "hole",
						sourceStart: holeSourceStart,
						sourceEnd: te,
						tokenStart: holeTokStart,
						tokenEnd: k + 1,
					});
					inHole = false;
				}
			}
			k++;
		}
	}
	// Ran off the end without a closing backtick — malformed template.
	return null;
}

// Default reclassifier pipeline applied to JS tokenization output.
//
// Ordering:
//   1. rewriteTypes — operates on JS-only tokens to mark function variables.
//   2. embedInterleaved — finds tagged templates and splices HTML/CSS.
//
// Running rewriteTypes first means function-variable detection sees the raw
// JS stream (including the `html`/`css` identifier and its surrounding
// context) before any splicing. embedInterleaved preserves the trigger
// identifier in the output, so subsequent passes could still see it.
export const reclassifiers = [
	rewriteTypes(functionVariableRules, { trivia: ["comment"] }),
	embedInterleaved({ scan: scanTaggedTemplate }),
];
