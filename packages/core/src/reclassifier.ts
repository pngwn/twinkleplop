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
	EmbedEntry,
	EmbedInterleavedConfig,
	EmbedMapping,
	GroupDescriptor,
	LanguageFn,
	OptionalPatternSpec,
	Reclassifier,
	ReclassifierPipeline,
	Region,
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
	| CompiledCapture
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

interface CompiledCapture {
	kind: 5;
	name: string;
	inner: CompiledPattern;
}

/**
 * True if the pattern tree contains any capture node. Passed into
 * `compilePattern` and propagated up so the matcher knows whether to bother
 * allocating a captures map at runtime. Lets capture-free rules keep the
 * Phase 1 hot-path cost.
 */
function hasCapture(spec: TokenPatternSpec): boolean {
	switch (spec.__kind) {
		case "capture":
			return true;
		case "seq":
			return spec.children.some(hasCapture);
		case "anyOf":
			return spec.branches.some(hasCapture);
		case "optional":
			return hasCapture(spec.inner);
		default:
			return false;
	}
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
			return {
				kind: 5,
				name: spec.name,
				inner: compilePattern(spec.inner, nameToId),
			};
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

/**
 * A captures bag — maps name → [startTokenIdx, endTokenIdxExclusive]. Passed
 * as a Map reference through the matcher for rules that have captures.
 * Rules without any capture pattern pass `null` so we pay zero cost.
 *
 * On failed matches within an `anyOf` branch the map is NOT rolled back —
 * later-successful branches will overwrite any stale captures with their own,
 * and on full rule failure the caller simply discards the map.
 */
type Captures = Map<string, [number, number]>;

function matchPattern(
	pattern: CompiledPattern,
	tokens: Uint32Array,
	idx: number,
	count: number,
	input: string,
	trivia: Uint8Array,
	captures: Captures | null,
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
				cur = matchPattern(
					pattern.children[i],
					tokens,
					cur,
					count,
					input,
					trivia,
					captures,
				);
				if (cur === NO_MATCH) return NO_MATCH;
			}
			return cur;
		}
		case 2: {
			// ANY_OF
			for (let i = 0; i < pattern.branches.length; i++) {
				const r = matchPattern(
					pattern.branches[i],
					tokens,
					idx,
					count,
					input,
					trivia,
					captures,
				);
				if (r !== NO_MATCH) return r;
			}
			return NO_MATCH;
		}
		case 3: {
			// OPTIONAL
			const r = matchPattern(
				pattern.inner,
				tokens,
				idx,
				count,
				input,
				trivia,
				captures,
			);
			return r === NO_MATCH ? idx : r;
		}
		case 4: {
			// BALANCED
			return matchBalanced(pattern, tokens, idx, count, input);
		}
		case 5: {
			// CAPTURE — remember the starting index, match inner, record the span.
			// `idx` has already been advanced past trivia at the top of this fn.
			const start = idx;
			const end = matchPattern(
				pattern.inner,
				tokens,
				idx,
				count,
				input,
				trivia,
				captures,
			);
			if (end === NO_MATCH) return NO_MATCH;
			if (captures !== null) captures.set(pattern.name, [start, end]);
			return end;
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
	// Anchor rewrite target (Phase 1 form). -1 means no anchor rewrite.
	anchorTargetId: number;
	// Capture rewrite targets (Phase 3 form). null if no capture rewrites.
	captureTargets: { name: string; targetId: number }[] | null;
	when: CompiledPattern;
	// Does `when` (or any nested branch) contain a capture()? If false we
	// can skip allocating a captures Map in the hot loop.
	needsCaptures: boolean;
}

/**
 * Build a Reclassifier that walks the token stream once and, for each rule,
 * attempts to match at every token whose type equals the rule's anchor. On
 * match, either the anchor token's type or a set of captured token spans
 * are rewritten to the rule's target type(s).
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

			let anchorTargetId = -1;
			let captureTargets: { name: string; targetId: number }[] | null = null;
			if (typeof rule.rewrite === "string") {
				anchorTargetId = ensureId(rule.rewrite);
			} else {
				captureTargets = [];
				for (const name of Object.keys(rule.rewrite)) {
					captureTargets.push({
						name,
						targetId: ensureId(rule.rewrite[name]),
					});
				}
			}

			let anchorValueSet: Set<string> | null = null;
			if (rule.anchorValue !== undefined) {
				anchorValueSet = new Set(
					Array.isArray(rule.anchorValue) ? rule.anchorValue : [rule.anchorValue],
				);
			}

			compiled.push({
				anchorId,
				anchorValueSet,
				anchorTargetId,
				captureTargets,
				when: compilePattern(rule.when, nameToId),
				needsCaptures: captureTargets !== null && hasCapture(rule.when),
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
				const captures: Captures | null = rule.needsCaptures
					? new Map()
					: null;
				const end = matchPattern(
					rule.when,
					tokens,
					i + 1,
					count,
					input,
					trivia,
					captures,
				);
				if (end === NO_MATCH) continue;

				// Apply rewrites. Anchor-target form simply flips the anchor's
				// type; capture-target form walks each named span and rewrites
				// every token in the range.
				if (rule.anchorTargetId !== -1) {
					tokens[i * 3] = rule.anchorTargetId;
				}
				if (rule.captureTargets !== null && captures !== null) {
					for (let c = 0; c < rule.captureTargets.length; c++) {
						const target = rule.captureTargets[c];
						const span = captures.get(target.name);
						if (span === undefined) continue;
						for (let t = span[0]; t < span[1]; t++) {
							tokens[t * 3] = target.targetId;
						}
					}
				}
				break; // first-match-wins per position
			}
		}

		return { tokens, tokenTypes };
	};
}

// ---------------------------------------------------------------------------
// embedGrammars
// ---------------------------------------------------------------------------
//
// Match tokens of specific host types and replace them with sub-tokenized
// content from another language. The sub language function is expected to
// be the output of `createLanguage` (or any equivalent shape) — it takes the
// host token's source slice and returns a fully enriched TokenizeResult in
// its own vocabulary.
//
// **Flat merging.** Sub token types are merged into the host's tokenTypes
// array by name. If the sub has "identifier" and the host already has
// "identifier", they share an ID in the merged array. If the sub has a
// type the host doesn't (e.g. "selector" from CSS), it's appended. Sub
// token IDs are remapped via a per-embed remap table built from the merge.
// Host token IDs are preserved, so any later transforms that were compiled
// against the host's original vocabulary keep working unchanged.
//
// **Positions.** Sub tokens come out with offsets relative to the content
// slice. Each sub token's start/end is shifted by the host token's start
// so that positions remain global to the original `input`.
//
// **Sub reclassifiers.** The sub's reclassifiers run inside its own
// language function before splicing, so they only see sub tokens and the
// isolation is automatic. Host-level transforms that run AFTER embedding
// see the merged stream and can potentially fire on sub tokens; the
// convention is to run host rewrite rules BEFORE embedGrammars in the
// pipeline so host rules only see host tokens.

interface NormalizedEmbedEntry {
	language: LanguageFn;
	trimStart: number;
	trimEnd: number;
	wrapToken: string | null;
}

function normalizeEmbedEntry(value: LanguageFn | EmbedEntry): NormalizedEmbedEntry {
	if (typeof value === "function") {
		return { language: value, trimStart: 0, trimEnd: 0, wrapToken: null };
	}
	return {
		language: value.language,
		trimStart: value.trimStart ?? 0,
		trimEnd: value.trimEnd ?? 0,
		wrapToken: value.wrapToken ?? null,
	};
}

export function embedGrammars(mapping: EmbedMapping): Reclassifier {
	return (input: string, result: TokenizeResult): TokenizeResult => {
		const hostTokens = result.tokens;
		const hostTypes = result.tokenTypes;
		const hostCount = hostTokens.length / 3;

		// Resolve mapping keys to host typeIds. Keys that don't exist in the
		// host's tokenTypes map to -1 and are silently ignored, so embed rules
		// referencing tokens the host doesn't emit are harmless.
		const byTypeId = new Map<number, NormalizedEmbedEntry>();
		for (const name of Object.keys(mapping)) {
			const id = hostTypes.indexOf(name);
			if (id !== -1) byTypeId.set(id, normalizeEmbedEntry(mapping[name]));
		}
		if (byTypeId.size === 0) return result;

		// First pass: scan for matches, sub-tokenize, and compute the final
		// token count so we can allocate the output Uint32Array once.
		interface Embed {
			hostIdx: number;
			sub: TokenizeResult;
			contentStart: number; // input-global start of sub content
			entry: NormalizedEmbedEntry;
			hostStart: number; // input-global start of the original host token
			hostEnd: number; // input-global end of the original host token
		}
		const embeds: Embed[] = [];
		let newCount = hostCount;
		for (let i = 0; i < hostCount; i++) {
			const typeId = hostTokens[i * 3];
			const entry = byTypeId.get(typeId);
			if (!entry) continue;
			const hostStart = hostTokens[i * 3 + 1];
			const hostEnd = hostTokens[i * 3 + 2];
			// Trim a fixed number of chars from each end before sub-tokenizing.
			// Guards against the trim being larger than the token itself.
			const contentStart = Math.min(hostStart + entry.trimStart, hostEnd);
			const contentEnd = Math.max(hostEnd - entry.trimEnd, contentStart);
			const content = input.slice(contentStart, contentEnd);
			const sub = entry.language(content);
			const subCount = sub.tokens.length / 3;
			embeds.push({ hostIdx: i, sub, contentStart, entry, hostStart, hostEnd });
			// One host token is replaced by: [optional start wrapper] + sub
			// tokens + [optional end wrapper]. Count the wrappers only when
			// the trim actually skipped something AND wrapToken is set.
			let replacement = subCount;
			if (entry.wrapToken !== null) {
				if (entry.trimStart > 0) replacement++;
				if (entry.trimEnd > 0) replacement++;
			}
			newCount = newCount - 1 + replacement;
		}

		if (embeds.length === 0) return result;

		// Merge sub tokenTypes into a cloned host tokenTypes. Dedup by name.
		const tokenTypes = hostTypes.slice();
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

		// Build a per-embed remap: subTypeId → mergedTypeId. Cache by sub
		// tokenTypes reference so repeated embeds of the same language reuse
		// one remap table (which also catches cached languages returning the
		// same tokenTypes array).
		const remapCache = new WeakMap<string[], Uint32Array>();
		const remapFor = (subTypes: string[]): Uint32Array => {
			let remap = remapCache.get(subTypes);
			if (remap) return remap;
			remap = new Uint32Array(subTypes.length);
			for (let i = 0; i < subTypes.length; i++) {
				remap[i] = ensureId(subTypes[i]);
			}
			remapCache.set(subTypes, remap);
			return remap;
		};

		// Second pass: write the merged token stream.
		const tokens = new Uint32Array(newCount * 3);
		let writeIdx = 0;
		let embedIdx = 0;
		for (let i = 0; i < hostCount; i++) {
			if (embedIdx < embeds.length && embeds[embedIdx].hostIdx === i) {
				const { sub, contentStart, entry, hostStart, hostEnd } =
					embeds[embedIdx++];
				const remap = remapFor(sub.tokenTypes);
				const wrapId =
					entry.wrapToken !== null ? ensureId(entry.wrapToken) : -1;

				// Leading delimiter wrapper (e.g. opening backtick).
				if (wrapId !== -1 && entry.trimStart > 0) {
					tokens[writeIdx * 3] = wrapId;
					tokens[writeIdx * 3 + 1] = hostStart;
					tokens[writeIdx * 3 + 2] = contentStart;
					writeIdx++;
				}
				// Sub tokens with positions offset to input-global coords.
				const subCount = sub.tokens.length / 3;
				for (let j = 0; j < subCount; j++) {
					const base = j * 3;
					tokens[writeIdx * 3] = remap[sub.tokens[base]];
					tokens[writeIdx * 3 + 1] = sub.tokens[base + 1] + contentStart;
					tokens[writeIdx * 3 + 2] = sub.tokens[base + 2] + contentStart;
					writeIdx++;
				}
				// Trailing delimiter wrapper (e.g. closing backtick).
				if (wrapId !== -1 && entry.trimEnd > 0) {
					tokens[writeIdx * 3] = wrapId;
					tokens[writeIdx * 3 + 1] = hostEnd - entry.trimEnd;
					tokens[writeIdx * 3 + 2] = hostEnd;
					writeIdx++;
				}
			} else {
				const base = i * 3;
				tokens[writeIdx * 3] = hostTokens[base];
				tokens[writeIdx * 3 + 1] = hostTokens[base + 1];
				tokens[writeIdx * 3 + 2] = hostTokens[base + 2];
				writeIdx++;
			}
		}

		return { tokens, tokenTypes };
	};
}

// ---------------------------------------------------------------------------
// embedInterleaved
// ---------------------------------------------------------------------------
//
// Generic discontinuous embedding. A scanner callback identifies a "group"
// of host tokens where some source ranges are content (to be tokenized by a
// sub-language) and others are holes (host tokens to pass through verbatim).
// The transform builds a virtual source — a single string where content
// chunks are concatenated and hole chunks are placeholder-filled — tokenizes
// it in ONE call to the sub-language (state flows across holes), then maps
// the resulting sub-tokens back to real positions and splices host hole
// tokens into the output in source order.
//
// This is the correct solution for tagged templates with interpolations,
// JSX expression containers, Svelte/Vue/Angular templates, heredocs with
// variable substitution, and any other case where a sub-language's content
// is discontinuous in the host stream.

interface PosMapEntry {
	// Virtual source range this entry covers [vStart, vEnd).
	vStart: number;
	vEnd: number;
	// For content entries: the real source start this virtual range maps to.
	// realPos = realStart + (vPos - vStart).
	realStart: number;
}

interface GroupBuild {
	// Index in the output token sequence (not yet allocated) where the group
	// starts. Emitted tokens for this group land at this position.
	outIdx: number;
	// All tokens to emit for this group, in source order.
	out: GroupToken[];
	// Range in the host token stream this group replaces [tokenStart, tokenEnd).
	tokenStart: number;
	tokenEnd: number;
}

interface GroupToken {
	type: number; // type ID in the MERGED tokenTypes
	start: number;
	end: number;
}

export function embedInterleaved(config: EmbedInterleavedConfig): Reclassifier {
	const holeChar = config.holeChar ?? " ";
	return (input: string, result: TokenizeResult): TokenizeResult => {
		const hostTokens = result.tokens;
		const hostTypes = result.tokenTypes;
		const hostCount = hostTokens.length / 3;

		// Clone tokenTypes so the transform is pure. We'll grow this as sub
		// grammars contribute new type names.
		const tokenTypes = hostTypes.slice();
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

		// Cache per-sub-language type remaps so repeated groups of the same
		// language don't re-walk tokenTypes.
		const remapCache = new WeakMap<string[], Uint32Array>();
		const remapFor = (subTypes: string[]): Uint32Array => {
			let remap = remapCache.get(subTypes);
			if (remap) return remap;
			remap = new Uint32Array(subTypes.length);
			for (let i = 0; i < subTypes.length; i++) {
				remap[i] = ensureId(subTypes[i]);
			}
			remapCache.set(subTypes, remap);
			return remap;
		};

		// First pass: walk host tokens, call scan at each index. For each
		// group returned, build the replacement output and record it.
		const groups: GroupBuild[] = [];
		let newCount = hostCount;
		let i = 0;
		while (i < hostCount) {
			const desc = config.scan(hostTokens, input, i, tokenTypes);
			if (desc === null) {
				i++;
				continue;
			}
			const subLang = desc.language ?? config.language;
			if (subLang === undefined) {
				// Scanner returned a descriptor but no language is available.
				// Bail out of this group — treat it as if scan returned null.
				i++;
				continue;
			}
			const groupOut = processGroup(
				desc,
				input,
				hostTokens,
				subLang,
				holeChar,
				remapFor,
				ensureId,
			);
			groups.push({
				outIdx: 0, // filled in during the second pass
				out: groupOut,
				tokenStart: desc.tokenStart,
				tokenEnd: desc.tokenEnd,
			});
			newCount += groupOut.length - (desc.tokenEnd - desc.tokenStart);
			i = desc.tokenEnd > i ? desc.tokenEnd : i + 1;
		}

		if (groups.length === 0) return result;

		// Second pass: assemble the output token array, copying host tokens
		// outside group ranges verbatim and splicing each group's output at
		// its position.
		const tokens = new Uint32Array(newCount * 3);
		let writeIdx = 0;
		let groupIdx = 0;
		let hostIdx = 0;
		while (hostIdx < hostCount) {
			if (groupIdx < groups.length && groups[groupIdx].tokenStart === hostIdx) {
				const g = groups[groupIdx++];
				for (let k = 0; k < g.out.length; k++) {
					const t = g.out[k];
					tokens[writeIdx * 3] = t.type;
					tokens[writeIdx * 3 + 1] = t.start;
					tokens[writeIdx * 3 + 2] = t.end;
					writeIdx++;
				}
				hostIdx = g.tokenEnd;
				continue;
			}
			const base = hostIdx * 3;
			tokens[writeIdx * 3] = hostTokens[base];
			tokens[writeIdx * 3 + 1] = hostTokens[base + 1];
			tokens[writeIdx * 3 + 2] = hostTokens[base + 2];
			writeIdx++;
			hostIdx++;
		}

		return {
			tokens: tokens.subarray(0, writeIdx * 3),
			tokenTypes,
		};
	};
}

/**
 * Build the replacement output for one group: construct virtual source +
 * position map, sub-tokenize, split sub-tokens at hole boundaries, and
 * emit regions in source order.
 */
function processGroup(
	desc: GroupDescriptor,
	input: string,
	hostTokens: Uint32Array,
	subLanguage: LanguageFn,
	holeChar: string,
	remapFor: (subTypes: string[]) => Uint32Array,
	ensureId: (name: string) => number,
): GroupToken[] {
	// Step 1: build virtual source and content position map.
	// The position map covers ONLY content regions — their virtual ranges
	// are what sub-tokens will refer to. Hole ranges in the virtual source
	// exist but sub-tokens covering them will be dropped (or split around).
	let virtualSource = "";
	const contentMap: PosMapEntry[] = [];
	// Virtual ranges of holes, in virtual-source order. Used to split
	// sub-tokens that straddle a hole boundary.
	const holeVirtualRanges: { vStart: number; vEnd: number }[] = [];

	for (let r = 0; r < desc.regions.length; r++) {
		const region = desc.regions[r];
		if (region.kind === "content") {
			const slice = input.slice(region.sourceStart, region.sourceEnd);
			const vStart = virtualSource.length;
			virtualSource += slice;
			contentMap.push({
				vStart,
				vEnd: virtualSource.length,
				realStart: region.sourceStart,
			});
		} else if (region.kind === "hole") {
			const len = region.sourceEnd - region.sourceStart;
			const vStart = virtualSource.length;
			// Use single-char placeholder repeated to match the byte length.
			// Byte-aligned so positions map cleanly.
			virtualSource += holeChar.length === 1
				? holeChar.repeat(len)
				: holeChar.repeat(len).slice(0, len);
			holeVirtualRanges.push({ vStart, vEnd: virtualSource.length });
		}
		// Synthetic regions don't contribute to virtual source.
	}

	// Step 2: tokenize the virtual source as one unit.
	const subResult = subLanguage(virtualSource);
	const subTokens = subResult.tokens;
	const subCount = subTokens.length / 3;
	const remap = remapFor(subResult.tokenTypes);

	// Step 3: split each sub-token at hole boundaries and remap to real
	// positions. Store the results keyed by the content region they fall
	// into so we can emit them in source order in step 4.
	//
	// A sub-token whose virtual range is [vStart, vEnd) produces one piece
	// per content region it intersects. Pieces entirely inside holes are
	// dropped.
	interface SubPiece {
		type: number;
		vStart: number; // for sorting + emission ordering
		realStart: number;
		realEnd: number;
	}
	const subPieces: SubPiece[] = [];
	for (let j = 0; j < subCount; j++) {
		const base = j * 3;
		const origType = subTokens[base];
		const vStart = subTokens[base + 1];
		const vEnd = subTokens[base + 2];
		const mappedType = remap[origType];
		// Walk content map entries overlapping [vStart, vEnd).
		for (let c = 0; c < contentMap.length; c++) {
			const entry = contentMap[c];
			if (entry.vEnd <= vStart) continue;
			if (entry.vStart >= vEnd) break;
			const pieceVStart = Math.max(vStart, entry.vStart);
			const pieceVEnd = Math.min(vEnd, entry.vEnd);
			if (pieceVEnd <= pieceVStart) continue;
			const realStart = entry.realStart + (pieceVStart - entry.vStart);
			const realEnd = entry.realStart + (pieceVEnd - entry.vStart);
			subPieces.push({
				type: mappedType,
				vStart: pieceVStart,
				realStart,
				realEnd,
			});
		}
	}
	// Sort by virtual start just in case — content map entries are already
	// in order so sub-pieces for one sub-token are in order, but two
	// sub-tokens with the same vStart (rare) aren't guaranteed to sort.
	subPieces.sort((a, b) => a.vStart - b.vStart);

	// Step 4: emit regions in source order. For content regions, pull sub
	// pieces whose realStart lies within the region's source range. For
	// hole regions, emit the original host tokens. For synthetic regions,
	// emit a fresh token.
	const out: GroupToken[] = [];
	let pieceIdx = 0;
	for (let r = 0; r < desc.regions.length; r++) {
		const region = desc.regions[r];
		if (region.kind === "content") {
			while (
				pieceIdx < subPieces.length &&
				subPieces[pieceIdx].realStart < region.sourceEnd
			) {
				const p = subPieces[pieceIdx++];
				out.push({ type: p.type, start: p.realStart, end: p.realEnd });
			}
		} else if (region.kind === "hole") {
			for (let ti = region.tokenStart; ti < region.tokenEnd; ti++) {
				const base = ti * 3;
				out.push({
					type: hostTokens[base],
					start: hostTokens[base + 1],
					end: hostTokens[base + 2],
				});
			}
		} else if (region.kind === "synthetic") {
			out.push({
				type: ensureId(region.typeName),
				start: region.sourceStart,
				end: region.sourceEnd,
			});
		}
	}

	return out;
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
