// Post-tokenization reclassifier pipeline.
//
// A Reclassifier is a pure function `(input, TokenizeResult) → TokenizeResult`
// that operates on the dense Uint32Array triplet stream. Phase 1 supports the
// `rewriteTypes` transform: pattern-match local windows of tokens and rewrite
// the anchor token's type in place. Future phases add `embedGrammars` for
// cross-language sub-tokenization and splicing.
//
// The matcher skips trivia tokens (e.g. `comment` in JS) between consecutive
// pattern elements. Token type names in patterns are resolved to integer
// typeIds once per reclassify call, so the hot loop is integer-only.

import { tokenize } from "./tokenizer";
import type {
	AnyOfPatternSpec,
	BalancedPatternSpec,
	CapturePatternSpec,
	CompiledGrammar,
	OptionalPatternSpec,
	Reclassifier,
	ReclassifierPipeline,
	RewriteOptions,
	RewriteRule,
	SeqPatternSpec,
	TokenizeResult,
	TokenPatternSpec,
	TypePatternSpec,
} from "./types";

// ---------------------------------------------------------------------------
// DSL combinators
// ---------------------------------------------------------------------------

/** Match a single token of the given type, optionally with a source-text value constraint. */
export function type(typeName: string, value?: string | string[]): TypePatternSpec {
	return { __kind: "type", typeName, value };
}

/** Match a sequence of sub-patterns in order, skipping trivia between them. */
export function seq(...children: TokenPatternSpec[]): SeqPatternSpec {
	return { __kind: "seq", children };
}

/** Match the first alternative that succeeds. */
export function anyOf(...branches: TokenPatternSpec[]): AnyOfPatternSpec {
	return { __kind: "anyOf", branches };
}

/** Match the inner pattern if possible; succeed without consuming anything otherwise. */
export function optional(inner: TokenPatternSpec): OptionalPatternSpec {
	return { __kind: "optional", inner };
}

/** Tag the inner pattern's span with a capture name (reserved for future rewrite targeting). */
export function capture(name: string, inner: TokenPatternSpec): CapturePatternSpec {
	return { __kind: "capture", name, inner };
}

/**
 * Walk tokens counting paren depth inside punctuation tokens until depth
 * returns to zero. Advances across all token types (strings, identifiers,
 * etc.) but only counts parens that appear in `punctuation`-typed tokens,
 * so parens in string/comment content don't affect the depth.
 *
 * The maxTokens bound prevents pathological runaway scans.
 */
export function balancedParens(
	open = "(",
	close = ")",
	maxTokens = 200,
): BalancedPatternSpec {
	return { __kind: "balanced", open, close, maxTokens };
}

// ---------------------------------------------------------------------------
// Pattern compilation
// ---------------------------------------------------------------------------
//
// Patterns are compiled once per reclassify call against the current
// TokenizeResult's tokenTypes array, resolving all type-name references to
// integer typeIds. Unknown type names compile to a sentinel that never
// matches, so rules targeting types not present in the result silently fail
// instead of erroring at runtime.

const NEVER_MATCHES = -1;

type CompiledPattern =
	| CompiledType
	| CompiledSeq
	| CompiledAnyOf
	| CompiledOptional
	| CompiledBalanced;

interface CompiledType {
	kind: 0;
	typeId: number;
	// null → any value; string → exact match; string[] → any of
	values: string[] | null;
}

interface CompiledSeq {
	kind: 1;
	children: CompiledPattern[];
}

interface CompiledAnyOf {
	kind: 2;
	branches: CompiledPattern[];
}

interface CompiledOptional {
	kind: 3;
	inner: CompiledPattern;
}

interface CompiledBalanced {
	kind: 4;
	punctuationTypeId: number;
	openCode: number;
	closeCode: number;
	maxTokens: number;
}

function compilePattern(
	spec: TokenPatternSpec,
	nameToId: Map<string, number>,
): CompiledPattern {
	switch (spec.__kind) {
		case "type": {
			const typeId = nameToId.get(spec.typeName) ?? NEVER_MATCHES;
			let values: string[] | null = null;
			if (spec.value !== undefined) {
				values = Array.isArray(spec.value) ? spec.value : [spec.value];
			}
			return { kind: 0, typeId, values };
		}
		case "seq":
			return {
				kind: 1,
				children: spec.children.map((c) => compilePattern(c, nameToId)),
			};
		case "anyOf":
			return {
				kind: 2,
				branches: spec.branches.map((b) => compilePattern(b, nameToId)),
			};
		case "optional":
			return { kind: 3, inner: compilePattern(spec.inner, nameToId) };
		case "capture":
			// Phase 1 doesn't act on captures — fall through to the inner pattern.
			return compilePattern(spec.inner, nameToId);
		case "balanced": {
			const punctuationTypeId = nameToId.get("punctuation") ?? NEVER_MATCHES;
			return {
				kind: 4,
				punctuationTypeId,
				openCode: spec.open.charCodeAt(0),
				closeCode: spec.close.charCodeAt(0),
				maxTokens: spec.maxTokens ?? 200,
			};
		}
	}
}

// ---------------------------------------------------------------------------
// Matcher engine
// ---------------------------------------------------------------------------

/**
 * Try to match `pattern` against `tokens` starting at logical token index
 * `idx`. Returns the index AFTER the last matched token on success, or
 * `NO_MATCH` on failure. Trivia tokens are skipped on entry.
 */
const NO_MATCH = -1;

function skipTrivia(
	tokens: Uint32Array,
	idx: number,
	count: number,
	trivia: Uint8Array,
): number {
	while (idx < count && trivia[tokens[idx * 3]]) idx++;
	return idx;
}

function matchPattern(
	pattern: CompiledPattern,
	tokens: Uint32Array,
	idx: number,
	count: number,
	input: string,
	trivia: Uint8Array,
): number {
	idx = skipTrivia(tokens, idx, count, trivia);

	switch (pattern.kind) {
		case 0: {
			// TYPE
			if (idx >= count) return NO_MATCH;
			const base = idx * 3;
			if (tokens[base] !== pattern.typeId) return NO_MATCH;
			if (pattern.values !== null) {
				const start = tokens[base + 1];
				const end = tokens[base + 2];
				const source = input.slice(start, end);
				let ok = false;
				for (let i = 0; i < pattern.values.length; i++) {
					if (pattern.values[i] === source) {
						ok = true;
						break;
					}
				}
				if (!ok) return NO_MATCH;
			}
			return idx + 1;
		}
		case 1: {
			// SEQ
			let cur = idx;
			for (let i = 0; i < pattern.children.length; i++) {
				cur = matchPattern(pattern.children[i], tokens, cur, count, input, trivia);
				if (cur === NO_MATCH) return NO_MATCH;
			}
			return cur;
		}
		case 2: {
			// ANY_OF
			for (let i = 0; i < pattern.branches.length; i++) {
				const r = matchPattern(pattern.branches[i], tokens, idx, count, input, trivia);
				if (r !== NO_MATCH) return r;
			}
			return NO_MATCH;
		}
		case 3: {
			// OPTIONAL
			const r = matchPattern(pattern.inner, tokens, idx, count, input, trivia);
			return r === NO_MATCH ? idx : r;
		}
		case 4: {
			// BALANCED
			return matchBalanced(pattern, tokens, idx, count, input);
		}
	}
}

/**
 * The first token must be a punctuation token whose source contains the open
 * character. Walk forward counting parens inside punctuation tokens only.
 * Returns the logical index after the token that closed the outermost pair.
 */
function matchBalanced(
	pattern: CompiledBalanced,
	tokens: Uint32Array,
	idx: number,
	count: number,
	input: string,
): number {
	if (idx >= count) return NO_MATCH;
	const base = idx * 3;
	if (tokens[base] !== pattern.punctuationTypeId) return NO_MATCH;

	let depth = 0;
	const start = tokens[base + 1];
	const end = tokens[base + 2];
	if (input.charCodeAt(start) !== pattern.openCode) return NO_MATCH;

	// Scan the first punctuation token — might already balance (e.g. `()`).
	for (let p = start; p < end; p++) {
		const c = input.charCodeAt(p);
		if (c === pattern.openCode) depth++;
		else if (c === pattern.closeCode) {
			depth--;
			if (depth === 0) return idx + 1;
		}
	}

	// Walk subsequent tokens, counting parens only in punctuation tokens.
	const limit = Math.min(count, idx + 1 + pattern.maxTokens);
	for (let i = idx + 1; i < limit; i++) {
		const b = i * 3;
		if (tokens[b] === pattern.punctuationTypeId) {
			const s = tokens[b + 1];
			const e = tokens[b + 2];
			for (let p = s; p < e; p++) {
				const c = input.charCodeAt(p);
				if (c === pattern.openCode) depth++;
				else if (c === pattern.closeCode) {
					depth--;
					if (depth === 0) return i + 1;
				}
			}
		}
	}

	return NO_MATCH;
}

// ---------------------------------------------------------------------------
// rewriteTypes
// ---------------------------------------------------------------------------

interface CompiledRule {
	anchorId: number;
	anchorValueSet: Set<string> | null;
	targetId: number;
	when: CompiledPattern;
}

/**
 * Build a Reclassifier that walks the token stream once and, for each rule,
 * attempts to match at every token whose type equals the rule's anchor. On
 * match, the anchor token's type is rewritten to the rule's target type.
 *
 * Rules within one `rewriteTypes` call apply first-match-wins per position.
 * For cascading rewrites, compose multiple `rewriteTypes(...)` transforms in
 * the pipeline passed to `reclassify`.
 */
export function rewriteTypes(
	rules: RewriteRule[],
	options: RewriteOptions = {},
): Reclassifier {
	return (input: string, result: TokenizeResult): TokenizeResult => {
		// Clone both arrays so the transform is pure — the caller's raw
		// TokenizeResult is never mutated. Uint32Array clone is a fast memcpy;
		// tokenTypes is a tiny string[] whose clone cost is negligible.
		const tokens = new Uint32Array(result.tokens);
		const tokenTypes = result.tokenTypes.slice();

		// Resolve name → id (allocating new ids for target types that don't exist).
		const nameToId = new Map<string, number>();
		for (let i = 0; i < tokenTypes.length; i++) nameToId.set(tokenTypes[i], i);
		const ensureId = (name: string): number => {
			let id = nameToId.get(name);
			if (id === undefined) {
				id = tokenTypes.length;
				tokenTypes.push(name);
				nameToId.set(name, id);
			}
			return id;
		};

		// Compile rules once against the name→id map.
		const compiled: CompiledRule[] = [];
		for (const rule of rules) {
			const anchorId = nameToId.get(rule.anchor);
			if (anchorId === undefined) continue; // anchor type not in result
			const targetId = ensureId(rule.rewrite);
			let anchorValueSet: Set<string> | null = null;
			if (rule.anchorValue !== undefined) {
				anchorValueSet = new Set(
					Array.isArray(rule.anchorValue) ? rule.anchorValue : [rule.anchorValue],
				);
			}
			compiled.push({
				anchorId,
				anchorValueSet,
				targetId,
				when: compilePattern(rule.when, nameToId),
			});
		}
		if (compiled.length === 0) return { tokens, tokenTypes };

		// Index rules by anchor typeId for O(1) dispatch in the hot loop.
		const byAnchor = new Map<number, CompiledRule[]>();
		for (const r of compiled) {
			let list = byAnchor.get(r.anchorId);
			if (!list) {
				list = [];
				byAnchor.set(r.anchorId, list);
			}
			list.push(r);
		}

		// Trivia typeId mask (Uint8Array indexed by typeId — rejects >=256).
		const trivia = new Uint8Array(Math.max(256, tokenTypes.length));
		if (options.trivia) {
			for (const name of options.trivia) {
				const id = nameToId.get(name);
				if (id !== undefined) trivia[id] = 1;
			}
		}

		const count = tokens.length / 3;
		for (let i = 0; i < count; i++) {
			const type = tokens[i * 3];
			if (trivia[type]) continue;
			const rulesForAnchor = byAnchor.get(type);
			if (!rulesForAnchor) continue;

			for (let r = 0; r < rulesForAnchor.length; r++) {
				const rule = rulesForAnchor[r];
				if (rule.anchorValueSet !== null) {
					const s = tokens[i * 3 + 1];
					const e = tokens[i * 3 + 2];
					if (!rule.anchorValueSet.has(input.slice(s, e))) continue;
				}
				const end = matchPattern(rule.when, tokens, i + 1, count, input, trivia);
				if (end !== NO_MATCH) {
					tokens[i * 3] = rule.targetId;
					break; // first-match-wins per position
				}
			}
		}

		return { tokens, tokenTypes };
	};
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/**
 * Compose a list of Reclassifier transforms into a single function that
 * applies them in order. Each transform sees the output of the previous one.
 *
 * ```
 * const enriched = reclassify([
 *   rewriteTypes(jsFunctionVariableRules, { trivia: ["comment"] }),
 * ])(input, tokenize(input, jsGrammar));
 * ```
 */
export function reclassify(
	pipeline: ReclassifierPipeline,
): (input: string, result: TokenizeResult) => TokenizeResult {
	return (input, result) => {
		let current = result;
		for (let i = 0; i < pipeline.length; i++) {
			current = pipeline[i](input, current);
		}
		return current;
	};
}

// ---------------------------------------------------------------------------
// createLanguage
// ---------------------------------------------------------------------------

/**
 * Bundle a compiled grammar with its reclassifier pipeline into a single
 * "language" function. Language packages use this to expose the common-case
 * entry point — one call that returns the fully enriched token stream.
 *
 * ```
 * // In @twinkleplop/javascript
 * export const grammar = compile(raw_grammar);
 * export const reclassifiers = [rewriteTypes(functionVariableRules, ...)];
 * export const language = createLanguage(grammar, reclassifiers);
 *
 * // In consumer code
 * import { language } from "@twinkleplop/javascript";
 * const tokens = language(source);
 * ```
 *
 * Consumers who want raw tokens or a custom pipeline can still import
 * `grammar` and `reclassifiers` separately and compose them manually.
 */
export function createLanguage(
	grammar: CompiledGrammar,
	reclassifiers: ReclassifierPipeline = [],
): (input: string) => TokenizeResult {
	const pipeline = reclassify(reclassifiers);
	return (input: string) => pipeline(input, tokenize(input, grammar));
}
