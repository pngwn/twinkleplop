// post-tokenization reclassifier pipeline.
//
// a Reclassifier is a pure function `(input, TokenizeResult) -> TokenizeResult`
// that operates on the dense Uint32Array triplet stream. phase 1 supports the
// `rewrite_types` transform: pattern-match local windows of tokens and rewrite
// the anchor token's type in place. future phases add `embed_grammars` for
// cross-language sub-tokenization and splicing.
//
// the matcher skips trivia tokens (e.g. `comment` in JS) between consecutive
// pattern elements. token type names in patterns are resolved to integer
// type_ids once per reclassify call, so the hot loop is integer-only.

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
export function type(type_name: string, value?: string | string[]): TypePatternSpec {
	return { __kind: "type", type_name, value };
}

/** Match a sequence of sub-patterns in order, skipping trivia between them. */
export function seq(...children: TokenPatternSpec[]): SeqPatternSpec {
	return { __kind: "seq", children };
}

/** Match the first alternative that succeeds. */
export function any_of(...branches: TokenPatternSpec[]): AnyOfPatternSpec {
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
 * The max_tokens bound prevents pathological runaway scans.
 */
export function balanced_parens(
	open = "(",
	close = ")",
	max_tokens = 200,
): BalancedPatternSpec {
	return { __kind: "balanced", open, close, max_tokens };
}

// ---------------------------------------------------------------------------
// Pattern compilation
// ---------------------------------------------------------------------------
//
// patterns are compiled once per reclassify call against the current
// TokenizeResult's token_types array, resolving all type-name references to
// integer type_ids. unknown type names compile to a sentinel that never
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
	type_id: number;
	// null -> any value; string -> exact match; string[] -> any of
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
	punctuation_type_id: number;
	open_code: number;
	close_code: number;
	max_tokens: number;
}

interface CompiledCapture {
	kind: 5;
	name: string;
	inner: CompiledPattern;
}

/**
 * true if the pattern tree contains any capture node. passed into
 * `compile_pattern` and propagated up so the matcher knows whether to bother
 * allocating a captures map at runtime. lets capture-free rules keep the
 * phase 1 hot-path cost.
 */
function has_capture(spec: TokenPatternSpec): boolean {
	switch (spec.__kind) {
		case "capture":
			return true;
		case "seq":
			return spec.children.some(has_capture);
		case "anyOf":
			return spec.branches.some(has_capture);
		case "optional":
			return has_capture(spec.inner);
		default:
			return false;
	}
}

function compile_pattern(
	spec: TokenPatternSpec,
	name_to_id: Map<string, number>,
): CompiledPattern {
	switch (spec.__kind) {
		case "type": {
			const type_id = name_to_id.get(spec.type_name) ?? NEVER_MATCHES;
			let values: string[] | null = null;
			if (spec.value !== undefined) {
				values = Array.isArray(spec.value) ? spec.value : [spec.value];
			}
			return { kind: 0, type_id, values };
		}
		case "seq":
			return {
				kind: 1,
				children: spec.children.map((c) => compile_pattern(c, name_to_id)),
			};
		case "anyOf":
			return {
				kind: 2,
				branches: spec.branches.map((b) => compile_pattern(b, name_to_id)),
			};
		case "optional":
			return { kind: 3, inner: compile_pattern(spec.inner, name_to_id) };
		case "capture":
			return {
				kind: 5,
				name: spec.name,
				inner: compile_pattern(spec.inner, name_to_id),
			};
		case "balanced": {
			const punctuation_type_id = name_to_id.get("punctuation") ?? NEVER_MATCHES;
			return {
				kind: 4,
				punctuation_type_id,
				open_code: spec.open.charCodeAt(0),
				close_code: spec.close.charCodeAt(0),
				max_tokens: spec.max_tokens ?? 200,
			};
		}
	}
}

// ---------------------------------------------------------------------------
// Matcher engine
// ---------------------------------------------------------------------------

/**
 * try to match `pattern` against `tokens` starting at logical token index
 * `idx`. returns the index AFTER the last matched token on success, or
 * `NO_MATCH` on failure. trivia tokens are skipped on entry.
 */
const NO_MATCH = -1;

function skip_trivia(
	tokens: Uint32Array,
	idx: number,
	count: number,
	trivia: Uint8Array,
): number {
	while (idx < count && trivia[tokens[idx * 3]]) idx++;
	return idx;
}

/**
 * a captures bag -- maps name -> [startTokenIdx, endTokenIdxExclusive]. passed
 * as a Map reference through the matcher for rules that have captures.
 * rules without any capture pattern pass `null` so we pay zero cost.
 *
 * on failed matches within an `anyOf` branch the map is NOT rolled back --
 * later-successful branches will overwrite any stale captures with their own,
 * and on full rule failure the caller simply discards the map.
 */
type Captures = Map<string, [number, number]>;

function match_pattern(
	pattern: CompiledPattern,
	tokens: Uint32Array,
	idx: number,
	count: number,
	input: string,
	trivia: Uint8Array,
	captures: Captures | null,
): number {
	idx = skip_trivia(tokens, idx, count, trivia);

	switch (pattern.kind) {
		case 0: {
			// TYPE
			if (idx >= count) return NO_MATCH;
			const base = idx * 3;
			if (tokens[base] !== pattern.type_id) return NO_MATCH;
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
				cur = match_pattern(
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
				const r = match_pattern(
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
			const r = match_pattern(
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
			return match_balanced(pattern, tokens, idx, count, input);
		}
		case 5: {
			// CAPTURE -- remember the starting index, match inner, record the span.
			// `idx` has already been advanced past trivia at the top of this fn.
			const start = idx;
			const end = match_pattern(
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
 * the first token must be a punctuation token whose source contains the open
 * character. walk forward counting parens inside punctuation tokens only.
 * returns the logical index after the token that closed the outermost pair.
 */
function match_balanced(
	pattern: CompiledBalanced,
	tokens: Uint32Array,
	idx: number,
	count: number,
	input: string,
): number {
	if (idx >= count) return NO_MATCH;
	const base = idx * 3;
	if (tokens[base] !== pattern.punctuation_type_id) return NO_MATCH;

	let depth = 0;
	const start = tokens[base + 1];
	const end = tokens[base + 2];
	if (input.charCodeAt(start) !== pattern.open_code) return NO_MATCH;

	// scan the first punctuation token -- might already balance (e.g. `()`).
	for (let p = start; p < end; p++) {
		const c = input.charCodeAt(p);
		if (c === pattern.open_code) depth++;
		else if (c === pattern.close_code) {
			depth--;
			if (depth === 0) return idx + 1;
		}
	}

	// walk subsequent tokens, counting parens only in punctuation tokens.
	const limit = Math.min(count, idx + 1 + pattern.max_tokens);
	for (let i = idx + 1; i < limit; i++) {
		const b = i * 3;
		if (tokens[b] === pattern.punctuation_type_id) {
			const s = tokens[b + 1];
			const e = tokens[b + 2];
			for (let p = s; p < e; p++) {
				const c = input.charCodeAt(p);
				if (c === pattern.open_code) depth++;
				else if (c === pattern.close_code) {
					depth--;
					if (depth === 0) return i + 1;
				}
			}
		}
	}

	return NO_MATCH;
}

// ---------------------------------------------------------------------------
// rewrite_types
// ---------------------------------------------------------------------------

interface CompiledRule {
	anchor_id: number;
	anchor_value_set: Set<string> | null;
	// anchor rewrite target (phase 1 form). -1 means no anchor rewrite.
	anchor_target_id: number;
	// capture rewrite targets (phase 3 form). null if no capture rewrites.
	capture_targets: { name: string; target_id: number }[] | null;
	when: CompiledPattern;
	// does `when` (or any nested branch) contain a capture()? if false we
	// can skip allocating a captures Map in the hot loop.
	needs_captures: boolean;
}

/**
 * build a Reclassifier that walks the token stream once and, for each rule,
 * attempts to match at every token whose type equals the rule's anchor. on
 * match, either the anchor token's type or a set of captured token spans
 * are rewritten to the rule's target type(s).
 *
 * rules within one `rewrite_types` call apply first-match-wins per position.
 * for cascading rewrites, compose multiple `rewrite_types(...)` transforms in
 * the pipeline passed to `reclassify`.
 */
export function rewrite_types(
	rules: RewriteRule[],
	options: RewriteOptions = {},
): Reclassifier {
	return (input: string, result: TokenizeResult): TokenizeResult => {
		// clone both arrays so the transform is pure -- the caller's raw
		// TokenizeResult is never mutated. Uint32Array clone is a fast memcpy;
		// token_types is a tiny string[] whose clone cost is negligible.
		const tokens = new Uint32Array(result.tokens);
		const token_types = result.token_types.slice();

		// resolve name -> id (allocating new ids for target types that don't exist).
		const name_to_id = new Map<string, number>();
		for (let i = 0; i < token_types.length; i++) name_to_id.set(token_types[i], i);
		const ensure_id = (name: string): number => {
			let id = name_to_id.get(name);
			if (id === undefined) {
				id = token_types.length;
				token_types.push(name);
				name_to_id.set(name, id);
			}
			return id;
		};

		// compile rules once against the name->id map.
		const compiled: CompiledRule[] = [];
		for (const rule of rules) {
			const anchor_id = name_to_id.get(rule.anchor);
			if (anchor_id === undefined) continue; // anchor type not in result

			let anchor_target_id = -1;
			let capture_targets: { name: string; target_id: number }[] | null = null;
			if (typeof rule.rewrite === "string") {
				anchor_target_id = ensure_id(rule.rewrite);
			} else {
				capture_targets = [];
				for (const name of Object.keys(rule.rewrite)) {
					capture_targets.push({
						name,
						target_id: ensure_id(rule.rewrite[name]),
					});
				}
			}

			let anchor_value_set: Set<string> | null = null;
			if (rule.anchor_value !== undefined) {
				anchor_value_set = new Set(
					Array.isArray(rule.anchor_value) ? rule.anchor_value : [rule.anchor_value],
				);
			}

			compiled.push({
				anchor_id,
				anchor_value_set,
				anchor_target_id,
				capture_targets,
				when: compile_pattern(rule.when, name_to_id),
				needs_captures: capture_targets !== null && has_capture(rule.when),
			});
		}
		if (compiled.length === 0) return { tokens, token_types };

		// index rules by anchor type_id for O(1) dispatch in the hot loop.
		const by_anchor = new Map<number, CompiledRule[]>();
		for (const r of compiled) {
			let list = by_anchor.get(r.anchor_id);
			if (!list) {
				list = [];
				by_anchor.set(r.anchor_id, list);
			}
			list.push(r);
		}

		// trivia type_id mask (Uint8Array indexed by type_id -- rejects >=256).
		const trivia = new Uint8Array(Math.max(256, token_types.length));
		if (options.trivia) {
			for (const name of options.trivia) {
				const id = name_to_id.get(name);
				if (id !== undefined) trivia[id] = 1;
			}
		}

		const count = tokens.length / 3;
		for (let i = 0; i < count; i++) {
			const type = tokens[i * 3];
			if (trivia[type]) continue;
			const rules_for_anchor = by_anchor.get(type);
			if (!rules_for_anchor) continue;

			for (let r = 0; r < rules_for_anchor.length; r++) {
				const rule = rules_for_anchor[r];
				if (rule.anchor_value_set !== null) {
					const s = tokens[i * 3 + 1];
					const e = tokens[i * 3 + 2];
					if (!rule.anchor_value_set.has(input.slice(s, e))) continue;
				}
				const captures: Captures | null = rule.needs_captures
					? new Map()
					: null;
				const end = match_pattern(
					rule.when,
					tokens,
					i + 1,
					count,
					input,
					trivia,
					captures,
				);
				if (end === NO_MATCH) continue;

				// apply rewrites. anchor-target form simply flips the anchor's
				// type; capture-target form walks each named span and rewrites
				// every token in the range.
				if (rule.anchor_target_id !== -1) {
					tokens[i * 3] = rule.anchor_target_id;
				}
				if (rule.capture_targets !== null && captures !== null) {
					for (let c = 0; c < rule.capture_targets.length; c++) {
						const target = rule.capture_targets[c];
						const span = captures.get(target.name);
						if (span === undefined) continue;
						for (let t = span[0]; t < span[1]; t++) {
							tokens[t * 3] = target.target_id;
						}
					}
				}
				break; // first-match-wins per position
			}
		}

		return { tokens, token_types };
	};
}

// ---------------------------------------------------------------------------
// embed_grammars
// ---------------------------------------------------------------------------
//
// match tokens of specific host types and replace them with sub-tokenized
// content from another language. the sub language function is expected to
// be the output of `create_language` (or any equivalent shape) -- it takes the
// host token's source slice and returns a fully enriched TokenizeResult in
// its own vocabulary.
//
// **flat merging.** sub token types are merged into the host's token_types
// array by name. if the sub has "identifier" and the host already has
// "identifier", they share an ID in the merged array. if the sub has a
// type the host doesn't (e.g. "selector" from CSS), it's appended. sub
// token IDs are remapped via a per-embed remap table built from the merge.
// host token IDs are preserved, so any later transforms that were compiled
// against the host's original vocabulary keep working unchanged.
//
// **positions.** sub tokens come out with offsets relative to the content
// slice. each sub token's start/end is shifted by the host token's start
// so that positions remain global to the original `input`.
//
// **sub reclassifiers.** the sub's reclassifiers run inside its own
// language function before splicing, so they only see sub tokens and the
// isolation is automatic. host-level transforms that run AFTER embedding
// see the merged stream and can potentially fire on sub tokens; the
// convention is to run host rewrite rules BEFORE embed_grammars in the
// pipeline so host rules only see host tokens.

interface NormalizedEmbedEntry {
	language: LanguageFn;
	trim_start: number;
	trim_end: number;
	wrap_token: string | null;
}

function normalize_embed_entry(value: LanguageFn | EmbedEntry): NormalizedEmbedEntry {
	if (typeof value === "function") {
		return { language: value, trim_start: 0, trim_end: 0, wrap_token: null };
	}
	return {
		language: value.language,
		trim_start: value.trim_start ?? 0,
		trim_end: value.trim_end ?? 0,
		wrap_token: value.wrap_token ?? null,
	};
}

export function embed_grammars(mapping: EmbedMapping): Reclassifier {
	return (input: string, result: TokenizeResult): TokenizeResult => {
		const host_tokens = result.tokens;
		const host_types = result.token_types;
		const host_count = host_tokens.length / 3;

		// resolve mapping keys to host type_ids. keys that don't exist in the
		// host's token_types map to -1 and are silently ignored, so embed rules
		// referencing tokens the host doesn't emit are harmless.
		const by_type_id = new Map<number, NormalizedEmbedEntry>();
		for (const name of Object.keys(mapping)) {
			const id = host_types.indexOf(name);
			if (id !== -1) by_type_id.set(id, normalize_embed_entry(mapping[name]));
		}
		if (by_type_id.size === 0) return result;

		// first pass: scan for matches, sub-tokenize, and compute the final
		// token count so we can allocate the output Uint32Array once.
		interface Embed {
			host_idx: number;
			sub: TokenizeResult;
			content_start: number; // input-global start of sub content
			entry: NormalizedEmbedEntry;
			host_start: number; // input-global start of the original host token
			host_end: number; // input-global end of the original host token
		}
		const embeds: Embed[] = [];
		let new_count = host_count;
		for (let i = 0; i < host_count; i++) {
			const type_id = host_tokens[i * 3];
			const entry = by_type_id.get(type_id);
			if (!entry) continue;
			const host_start = host_tokens[i * 3 + 1];
			const host_end = host_tokens[i * 3 + 2];
			// trim a fixed number of chars from each end before sub-tokenizing.
			// guards against the trim being larger than the token itself.
			const content_start = Math.min(host_start + entry.trim_start, host_end);
			const content_end = Math.max(host_end - entry.trim_end, content_start);
			const content = input.slice(content_start, content_end);
			const sub = entry.language(content);
			const sub_count = sub.tokens.length / 3;
			embeds.push({ host_idx: i, sub, content_start, entry, host_start, host_end });
			// one host token is replaced by: [optional start wrapper] + sub
			// tokens + [optional end wrapper]. count the wrappers only when
			// the trim actually skipped something AND wrap_token is set.
			let replacement = sub_count;
			if (entry.wrap_token !== null) {
				if (entry.trim_start > 0) replacement++;
				if (entry.trim_end > 0) replacement++;
			}
			new_count = new_count - 1 + replacement;
		}

		if (embeds.length === 0) return result;

		// merge sub token_types into a cloned host token_types. dedup by name.
		const token_types = host_types.slice();
		const name_to_id = new Map<string, number>();
		for (let i = 0; i < token_types.length; i++) name_to_id.set(token_types[i], i);
		const ensure_id = (name: string): number => {
			let id = name_to_id.get(name);
			if (id === undefined) {
				id = token_types.length;
				token_types.push(name);
				name_to_id.set(name, id);
			}
			return id;
		};

		// build a per-embed remap: sub_type_id -> merged_type_id. cache by sub
		// token_types reference so repeated embeds of the same language reuse
		// one remap table (which also catches cached languages returning the
		// same token_types array).
		const remap_cache = new WeakMap<string[], Uint32Array>();
		const remap_for = (sub_types: string[]): Uint32Array => {
			let remap = remap_cache.get(sub_types);
			if (remap) return remap;
			remap = new Uint32Array(sub_types.length);
			for (let i = 0; i < sub_types.length; i++) {
				remap[i] = ensure_id(sub_types[i]);
			}
			remap_cache.set(sub_types, remap);
			return remap;
		};

		// second pass: write the merged token stream.
		const tokens = new Uint32Array(new_count * 3);
		let write_idx = 0;
		let embed_idx = 0;
		for (let i = 0; i < host_count; i++) {
			if (embed_idx < embeds.length && embeds[embed_idx].host_idx === i) {
				const { sub, content_start, entry, host_start, host_end } =
					embeds[embed_idx++];
				const remap = remap_for(sub.token_types);
				const wrap_id =
					entry.wrap_token !== null ? ensure_id(entry.wrap_token) : -1;

				// leading delimiter wrapper (e.g. opening backtick).
				if (wrap_id !== -1 && entry.trim_start > 0) {
					tokens[write_idx * 3] = wrap_id;
					tokens[write_idx * 3 + 1] = host_start;
					tokens[write_idx * 3 + 2] = content_start;
					write_idx++;
				}
				// sub tokens with positions offset to input-global coords.
				const sub_count = sub.tokens.length / 3;
				for (let j = 0; j < sub_count; j++) {
					const base = j * 3;
					tokens[write_idx * 3] = remap[sub.tokens[base]];
					tokens[write_idx * 3 + 1] = sub.tokens[base + 1] + content_start;
					tokens[write_idx * 3 + 2] = sub.tokens[base + 2] + content_start;
					write_idx++;
				}
				// trailing delimiter wrapper (e.g. closing backtick).
				if (wrap_id !== -1 && entry.trim_end > 0) {
					tokens[write_idx * 3] = wrap_id;
					tokens[write_idx * 3 + 1] = host_end - entry.trim_end;
					tokens[write_idx * 3 + 2] = host_end;
					write_idx++;
				}
			} else {
				const base = i * 3;
				tokens[write_idx * 3] = host_tokens[base];
				tokens[write_idx * 3 + 1] = host_tokens[base + 1];
				tokens[write_idx * 3 + 2] = host_tokens[base + 2];
				write_idx++;
			}
		}

		return { tokens, token_types };
	};
}

// ---------------------------------------------------------------------------
// embed_interleaved
// ---------------------------------------------------------------------------
//
// generic discontinuous embedding. a scanner callback identifies a "group"
// of host tokens where some source ranges are content (to be tokenized by a
// sub-language) and others are holes (host tokens to pass through verbatim).
// the transform builds a virtual source -- a single string where content
// chunks are concatenated and hole chunks are placeholder-filled -- tokenizes
// it in ONE call to the sub-language (state flows across holes), then maps
// the resulting sub-tokens back to real positions and splices host hole
// tokens into the output in source order.
//
// this is the correct solution for tagged templates with interpolations,
// JSX expression containers, Svelte/Vue/Angular templates, heredocs with
// variable substitution, and any other case where a sub-language's content
// is discontinuous in the host stream.

interface PosMapEntry {
	// virtual source range this entry covers [v_start, v_end).
	v_start: number;
	v_end: number;
	// for content entries: the real source start this virtual range maps to.
	// real_pos = real_start + (v_pos - v_start).
	real_start: number;
}

interface GroupBuild {
	// index in the output token sequence (not yet allocated) where the group
	// starts. emitted tokens for this group land at this position.
	out_idx: number;
	// all tokens to emit for this group, in source order.
	out: GroupToken[];
	// range in the host token stream this group replaces [token_start, token_end).
	token_start: number;
	token_end: number;
}

interface GroupToken {
	type: number; // type ID in the MERGED token_types
	start: number;
	end: number;
}

// safety bound on the iterative scan loop. in practice, nested tagged
// templates are shallow (1-3 levels); this just prevents a pathological or
// buggy scanner from running forever.
const MAX_EMBED_ITERATIONS = 16;

export function embed_interleaved(config: EmbedInterleavedConfig): Reclassifier {
	const hole_char = config.hole_char ?? " ";
	return (input: string, result: TokenizeResult): TokenizeResult => {
		// iterate the single-pass transform until it reaches a fixed point.
		//
		// why iterate: the scan loop advances past each matched group via
		// `i = desc.token_end`, so it skips over the group's hole tokens. if a
		// hole contains ANOTHER tagged template (e.g. `` html`<style>${css`...`}</style>` ``
		// has an inner `css`...`` living inside an interpolation hole of the
		// outer `html` template), the first pass never sees it -- the hole
		// tokens are emitted verbatim in the output. a second pass over the
		// new stream will find the inner template because its JS tokens are
		// still JS tokens (HTML/CSS tokens from the first pass get
		// fast-rejected by the scanner). each subsequent pass peels off one
		// more level of nesting. we stop as soon as a pass finds no groups.
		let current = result;
		for (let iter = 0; iter < MAX_EMBED_ITERATIONS; iter++) {
			const next = embed_interleaved_once(config, hole_char, input, current);
			if (next === current) return current;
			current = next;
		}
		// safety bound hit -- return whatever we have. shouldn't happen for
		// well-formed inputs and a reasonable scanner.
		return current;
	};
}

function embed_interleaved_once(
	config: EmbedInterleavedConfig,
	hole_char: string,
	input: string,
	result: TokenizeResult,
): TokenizeResult {
	const host_tokens = result.tokens;
	const host_types = result.token_types;
	const host_count = host_tokens.length / 3;

	// clone token_types so the transform is pure. we'll grow this as sub
	// grammars contribute new type names.
	const token_types = host_types.slice();
	const name_to_id = new Map<string, number>();
	for (let i = 0; i < token_types.length; i++) name_to_id.set(token_types[i], i);
	const ensure_id = (name: string): number => {
		let id = name_to_id.get(name);
		if (id === undefined) {
			id = token_types.length;
			token_types.push(name);
			name_to_id.set(name, id);
		}
		return id;
	};

	// cache per-sub-language type remaps so repeated groups of the same
	// language don't re-walk token_types.
	const remap_cache = new WeakMap<string[], Uint32Array>();
	const remap_for = (sub_types: string[]): Uint32Array => {
		let remap = remap_cache.get(sub_types);
		if (remap) return remap;
		remap = new Uint32Array(sub_types.length);
		for (let i = 0; i < sub_types.length; i++) {
			remap[i] = ensure_id(sub_types[i]);
		}
		remap_cache.set(sub_types, remap);
		return remap;
	};

	// first pass: walk host tokens, call scan at each index. for each
	// group returned, build the replacement output and record it.
	const groups: GroupBuild[] = [];
	let new_count = host_count;
	let i = 0;
	while (i < host_count) {
		const desc = config.scan(host_tokens, input, i, token_types);
		if (desc === null) {
			i++;
			continue;
		}
		const sub_lang = desc.language ?? config.language;
		if (sub_lang === undefined) {
			// scanner returned a descriptor but no language is available.
			// bail out of this group -- treat it as if scan returned null.
			i++;
			continue;
		}
		const group_out = process_group(
			desc,
			input,
			host_tokens,
			sub_lang,
			hole_char,
			remap_for,
			ensure_id,
		);
		groups.push({
			out_idx: 0, // filled in during the second pass
			out: group_out,
			token_start: desc.token_start,
			token_end: desc.token_end,
		});
		new_count += group_out.length - (desc.token_end - desc.token_start);
		i = desc.token_end > i ? desc.token_end : i + 1;
	}

	// fixed-point: no groups found this pass, return the SAME reference so
	// the caller can terminate the iteration.
	if (groups.length === 0) return result;

	// second pass: assemble the output token array, copying host tokens
	// outside group ranges verbatim and splicing each group's output at
	// its position.
	const tokens = new Uint32Array(new_count * 3);
	let write_idx = 0;
	let group_idx = 0;
	let host_idx = 0;
	while (host_idx < host_count) {
		if (group_idx < groups.length && groups[group_idx].token_start === host_idx) {
			const g = groups[group_idx++];
			for (let k = 0; k < g.out.length; k++) {
				const t = g.out[k];
				tokens[write_idx * 3] = t.type;
				tokens[write_idx * 3 + 1] = t.start;
				tokens[write_idx * 3 + 2] = t.end;
				write_idx++;
			}
			host_idx = g.token_end;
			continue;
		}
		const base = host_idx * 3;
		tokens[write_idx * 3] = host_tokens[base];
		tokens[write_idx * 3 + 1] = host_tokens[base + 1];
		tokens[write_idx * 3 + 2] = host_tokens[base + 2];
		write_idx++;
		host_idx++;
	}

	return {
		tokens: tokens.subarray(0, write_idx * 3),
		token_types,
	};
}

/**
 * build the replacement output for one group: construct virtual source +
 * position map, sub-tokenize, split sub-tokens at hole boundaries, and
 * emit regions in source order.
 */
function process_group(
	desc: GroupDescriptor,
	input: string,
	host_tokens: Uint32Array,
	sub_language: LanguageFn,
	hole_char: string,
	remap_for: (sub_types: string[]) => Uint32Array,
	ensure_id: (name: string) => number,
): GroupToken[] {
	// step 1: build virtual source and content position map.
	// the position map covers ONLY content regions -- their virtual ranges
	// are what sub-tokens will refer to. hole ranges in the virtual source
	// exist but sub-tokens covering them will be dropped (or split around).
	let virtual_source = "";
	const content_map: PosMapEntry[] = [];
	// virtual ranges of holes, in virtual-source order. used to split
	// sub-tokens that straddle a hole boundary.
	const hole_virtual_ranges: { v_start: number; v_end: number }[] = [];

	for (let r = 0; r < desc.regions.length; r++) {
		const region = desc.regions[r];
		if (region.kind === "content") {
			const slice = input.slice(region.source_start, region.source_end);
			const v_start = virtual_source.length;
			virtual_source += slice;
			content_map.push({
				v_start,
				v_end: virtual_source.length,
				real_start: region.source_start,
			});
		} else if (region.kind === "hole") {
			const len = region.source_end - region.source_start;
			const v_start = virtual_source.length;
			// use single-char placeholder repeated to match the byte length.
			// byte-aligned so positions map cleanly.
			virtual_source += hole_char.length === 1
				? hole_char.repeat(len)
				: hole_char.repeat(len).slice(0, len);
			hole_virtual_ranges.push({ v_start, v_end: virtual_source.length });
		}
		// synthetic regions don't contribute to virtual source.
	}

	// step 2: tokenize the virtual source as one unit.
	const sub_result = sub_language(virtual_source);
	const sub_tokens = sub_result.tokens;
	const sub_count = sub_tokens.length / 3;
	const remap = remap_for(sub_result.token_types);

	// step 3: split each sub-token at hole boundaries and remap to real
	// positions. store the results keyed by the content region they fall
	// into so we can emit them in source order in step 4.
	//
	// a sub-token whose virtual range is [v_start, v_end) produces one piece
	// per content region it intersects. pieces entirely inside holes are
	// dropped.
	interface SubPiece {
		type: number;
		v_start: number; // for sorting + emission ordering
		real_start: number;
		real_end: number;
	}
	const sub_pieces: SubPiece[] = [];
	for (let j = 0; j < sub_count; j++) {
		const base = j * 3;
		const orig_type = sub_tokens[base];
		const v_start = sub_tokens[base + 1];
		const v_end = sub_tokens[base + 2];
		const mapped_type = remap[orig_type];
		// walk content map entries overlapping [v_start, v_end).
		for (let c = 0; c < content_map.length; c++) {
			const entry = content_map[c];
			if (entry.v_end <= v_start) continue;
			if (entry.v_start >= v_end) break;
			const piece_v_start = Math.max(v_start, entry.v_start);
			const piece_v_end = Math.min(v_end, entry.v_end);
			if (piece_v_end <= piece_v_start) continue;
			const real_start = entry.real_start + (piece_v_start - entry.v_start);
			const real_end = entry.real_start + (piece_v_end - entry.v_start);
			sub_pieces.push({
				type: mapped_type,
				v_start: piece_v_start,
				real_start,
				real_end,
			});
		}
	}
	// sort by virtual start just in case -- content map entries are already
	// in order so sub-pieces for one sub-token are in order, but two
	// sub-tokens with the same v_start (rare) aren't guaranteed to sort.
	sub_pieces.sort((a, b) => a.v_start - b.v_start);

	// step 4: emit regions in source order. for content regions, pull sub
	// pieces whose real_start lies within the region's source range. for
	// hole regions, emit the original host tokens. for synthetic regions,
	// emit a fresh token.
	const out: GroupToken[] = [];
	let piece_idx = 0;
	for (let r = 0; r < desc.regions.length; r++) {
		const region = desc.regions[r];
		if (region.kind === "content") {
			while (
				piece_idx < sub_pieces.length &&
				sub_pieces[piece_idx].real_start < region.source_end
			) {
				const p = sub_pieces[piece_idx++];
				out.push({ type: p.type, start: p.real_start, end: p.real_end });
			}
		} else if (region.kind === "hole") {
			for (let ti = region.token_start; ti < region.token_end; ti++) {
				const base = ti * 3;
				out.push({
					type: host_tokens[base],
					start: host_tokens[base + 1],
					end: host_tokens[base + 2],
				});
			}
		} else if (region.kind === "synthetic") {
			out.push({
				type: ensure_id(region.type_name),
				start: region.source_start,
				end: region.source_end,
			});
		}
	}

	return out;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/**
 * compose a list of Reclassifier transforms into a single function that
 * applies them in order. each transform sees the output of the previous one.
 *
 * ```
 * const enriched = reclassify([
 *   rewrite_types(js_function_variable_rules, { trivia: ["comment"] }),
 * ])(input, tokenize(input, js_grammar));
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
// create_language
// ---------------------------------------------------------------------------

/**
 * bundle a compiled grammar with its reclassifier pipeline into a single
 * "language" function. language packages use this to expose the common-case
 * entry point -- one call that returns the fully enriched token stream.
 *
 * ```
 * // in @twinkleplop/javascript
 * export const grammar = compile(raw_grammar);
 * export const reclassifiers = [rewrite_types(function_variable_rules, ...)];
 * export const language = create_language(grammar, reclassifiers);
 *
 * // in consumer code
 * import { language } from "@twinkleplop/javascript";
 * const tokens = language(source);
 * ```
 *
 * consumers who want raw tokens or a custom pipeline can still import
 * `grammar` and `reclassifiers` separately and compose them manually.
 */
export function create_language(
	grammar: CompiledGrammar,
	reclassifiers: ReclassifierPipeline = [],
): (input: string) => TokenizeResult {
	const pipeline = reclassify(reclassifiers);
	return (input: string) => pipeline(input, tokenize(input, grammar));
}
