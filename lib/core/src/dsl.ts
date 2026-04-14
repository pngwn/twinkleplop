// DSL helpers for building grammars without the verbose declarative rule shape.
// All helpers are pure factories producing GrammarRule objects (or arrays/partial
// rules) that the compiler already understands — no compiler changes required.

import type { GrammarRule } from "./types";

// ---------------------------------------------------------------------------
// Range tag — lets a single `match(...)` call mix exact strings with char ranges
// ---------------------------------------------------------------------------

export type RangePair = [string, string] | [number, number];
export interface RangeTag {
	__range: true;
	pairs: RangePair[];
}

export const range = (pairs: RangePair[]): RangeTag => ({
	__range: true,
	pairs,
});

const isRange = (v: unknown): v is RangeTag =>
	typeof v === "object" && v !== null && (v as RangeTag).__range === true;

// ---------------------------------------------------------------------------
// Pre-built character class range tags
// ---------------------------------------------------------------------------

export const LOWER: RangeTag = range([["a", "z"]]);
export const UPPER: RangeTag = range([["A", "Z"]]);
export const LETTER: RangeTag = range([
	["a", "z"],
	["A", "Z"],
]);
export const DIGIT: RangeTag = range([["0", "9"]]);
export const ALNUM: RangeTag = range([
	["a", "z"],
	["A", "Z"],
	["0", "9"],
]);
export const HEX: RangeTag = range([
	["0", "9"],
	["a", "f"],
	["A", "F"],
]);

// ---------------------------------------------------------------------------
// Transition helpers — partial rules that spread into a full rule
// ---------------------------------------------------------------------------

/** Push the current state and enter a new one. */
export const enter = (state: string): Partial<GrammarRule> => ({ state });

/** Exit the current state and enter a new one (sideways / goto). */
export const goto = (state: string): Partial<GrammarRule> => ({
	state,
	exit: true,
});

/** Pop back to the parent state. */
export const leave = (): Partial<GrammarRule> => ({ exit: true });

/** Optional sideways transition — string goes sideways, null/undefined stays. */
export const to = (
	state?: string | null,
): Partial<GrammarRule> => (state ? goto(state) : {});

// ---------------------------------------------------------------------------
// Match factory
// ---------------------------------------------------------------------------

type Pattern = string | RangeTag;
type Patterns = Pattern | Pattern[];

const buildMatchRule = (
	patterns: Patterns,
	token: string | null,
	transition: Partial<GrammarRule>,
): GrammarRule => {
	const flat = Array.isArray(patterns) ? patterns : [patterns];
	const exact: string[] = [];
	const rangePairs: RangePair[] = [];
	for (const p of flat) {
		if (isRange(p)) {
			rangePairs.push(...p.pairs);
		} else {
			exact.push(p);
		}
	}
	const rule: GrammarRule = { ...transition };
	if (token != null) rule.token = token;
	if (exact.length === 1) rule.match = exact[0];
	else if (exact.length > 1) rule.match = exact;
	if (rangePairs.length) {
		// Cast needed because RangePair union doesn't auto-narrow
		rule.range = rangePairs as GrammarRule["range"];
	}
	return rule;
};

/** Build a match rule with a token. Patterns may mix exact strings and `range(...)` tags. */
export const match = (
	patterns: Patterns,
	token: string,
	transition: Partial<GrammarRule> = {},
): GrammarRule => buildMatchRule(patterns, token, transition);

/** Token-less match — for state transitions that don't emit a token themselves. */
export const on = (
	patterns: Patterns,
	transition: Partial<GrammarRule> = {},
): GrammarRule => buildMatchRule(patterns, null, transition);

// ---------------------------------------------------------------------------
// Keyword / boundary helper
// ---------------------------------------------------------------------------

/** Whole-word match. Defaults token to "keyword"; pass a different token as the 3rd arg. */
export const keyword = (
	words: string[],
	transition: Partial<GrammarRule> = {},
	token = "keyword",
): GrammarRule => ({
	match: words,
	boundary: true,
	token,
	...transition,
});

// ---------------------------------------------------------------------------
// match_within helper (strings, comments, etc.)
// ---------------------------------------------------------------------------

export interface WithinOpts {
	escape?: string;
	multiline?: boolean;
}

export const within = (
	start: string,
	end: string,
	token: string,
	opts: WithinOpts = {},
): GrammarRule => ({
	match_within: { start, end, ...opts },
	token,
});

// ---------------------------------------------------------------------------
// Fallback (any:true) helper
// ---------------------------------------------------------------------------

/** `{ any: true, ... }` rule — matches anything not claimed by earlier rules. */
export const fallback = (
	opts: Partial<GrammarRule> = {},
): GrammarRule => ({
	any: true,
	...opts,
});
