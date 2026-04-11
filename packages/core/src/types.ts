import type { TokenizerIntrospector } from "./introspector";

// Character class symbol types
export type CharacterClassSymbol = symbol;

// Grammar types
export interface GrammarRule {
	match?: string | string[] | CharacterClassSymbol;
	range?:
		| [string, string]
		| [number, number]
		| [string, string][]
		| [number, number][];
	match_within?: {
		start: string;
		end: string;
		escape?: string;
		multiline?: boolean;
	};
	any?: boolean;
	boundary?: boolean;
	token?: string;
	state?: string;
	exit?: boolean;
}

export type ParamBinding = string | boolean | null;
export type ParamType = "state" | "state?" | "token" | "token?" | "match" | "boolean";
export type IncludeEntry = string | { set: string; with?: Record<string, ParamBinding> };

export interface Ruleset {
	params?: Record<string, ParamType>;
	include?: IncludeEntry | IncludeEntry[];
	rules: GrammarRule[];
}

export interface GrammarState {
	include?: IncludeEntry | IncludeEntry[];
	rules?: GrammarRule[];
	mode?: "probe" | "tokenise";
	fallback?: string;
	extend?: string | string[];
}

export interface Grammar {
	name?: string;
	groups?: Record<string, GrammarState>;
	rulesets?: Record<string, Ruleset>;
	states: Record<string, GrammarState>;
}

// Compiled grammar types
export interface PatternInfo {
	// Using typed array for faster indexed access in hot loop
	codes: Uint16Array;
	length: number;
	ruleIdx: number;
	boundary?: boolean;
}

export interface CompiledGrammar {
	states: Map<string, number>;
	transitions: Uint16Array;
	charMaps: Uint16Array;
	keywords: Map<string, number>;
	tokenTypes: string[];
	patterns: Map<number, (PatternInfo[] | null)[]>;
	fallbackTransitions: Uint16Array;
	// Use object map for faster non-ASCII lookups per state
	nonAsciiChars: Map<number, Record<number, number>>;
	// Retain set for external tooling, but also include fast mask for hot path
	probeStates: Set<number>;
	probeMask?: Uint8Array;
	probeFallbacks?: Map<number, number>;
	// Track which rules require boundary checking (state * 256 + ruleIdx)
	boundaryRules?: Set<number>;
}

// Tokenizer types
export interface TokenizeResult {
	tokens: Uint32Array;
	tokenTypes: string[];
}

// Reclassifier types
//
// A Reclassifier is a pure function over a TokenizeResult that may rewrite
// token types, splice new tokens in, or both. Multiple reclassifiers are
// composed into a pipeline by `reclassify(...)`. Phase 1 only supports
// in-place type rewriting via `rewriteTypes`; future phases add embedding.

export type Reclassifier = (
	input: string,
	result: TokenizeResult,
) => TokenizeResult;

export type ReclassifierPipeline = Reclassifier[];

// Pattern language for `rewriteTypes` — tag-discriminated union so authors
// build patterns with the exported combinator helpers (`type`, `seq`,
// `anyOf`, `optional`, `capture`, `balancedParens`).

export interface TypePatternSpec {
	__kind: "type";
	typeName: string;
	value?: string | string[];
}

export interface SeqPatternSpec {
	__kind: "seq";
	children: TokenPatternSpec[];
}

export interface AnyOfPatternSpec {
	__kind: "anyOf";
	branches: TokenPatternSpec[];
}

export interface OptionalPatternSpec {
	__kind: "optional";
	inner: TokenPatternSpec;
}

export interface CapturePatternSpec {
	__kind: "capture";
	name: string;
	inner: TokenPatternSpec;
}

// Walk tokens counting paren depth inside punctuation tokens until depth
// returns to zero. Used for arrow-function parameter lists.
export interface BalancedPatternSpec {
	__kind: "balanced";
	open: string;
	close: string;
	maxTokens?: number;
}

export type TokenPatternSpec =
	| TypePatternSpec
	| SeqPatternSpec
	| AnyOfPatternSpec
	| OptionalPatternSpec
	| CapturePatternSpec
	| BalancedPatternSpec;

// A rewrite rule says: starting at a token of type `anchor` (optionally
// matching `anchorValue`), if the following token stream matches `when`,
// apply `rewrite`:
//   - `string`   → rewrite the anchor token's type to this name (Phase 1).
//   - object map → for each `{ captureName: typeName }` entry, find the
//                  capture() with that name in `when` and rewrite every
//                  token inside the captured range to the target type
//                  (Phase 3). Missing captures silently skip.
export interface RewriteRule {
	anchor: string;
	anchorValue?: string | string[];
	when: TokenPatternSpec;
	rewrite: string | Record<string, string>;
}

export interface RewriteOptions {
	// Token type names treated as trivia and skipped between pattern elements.
	// For JavaScript this is typically ["comment"].
	trivia?: string[];
}

// A "language function" — the common-case entry point every language package
// exports via `createLanguage`. Takes source text, returns the full enriched
// TokenizeResult. This is what `embedGrammars` calls to sub-tokenize a span.
export type LanguageFn = (input: string) => TokenizeResult;

// Detailed embed entry for cases that need slicing / delimiter wrapping.
// - `trimStart`/`trimEnd` skip that many chars at the respective end of the
//   host token before passing the content to the sub-language.
// - `wrapToken` (optional) names a host token type. If set, the trimmed
//   delimiter chars are re-emitted as tokens of this type so they stay
//   styled — useful for tagged-template backticks which would otherwise
//   become untokenized gaps in the output.
export interface EmbedEntry {
	language: LanguageFn;
	trimStart?: number;
	trimEnd?: number;
	wrapToken?: string;
}

// Mapping from host token type names to the sub-language (or detailed
// EmbedEntry) to apply when the host emits a token of that type. When
// `embedGrammars` encounters such a token, it calls the language on the
// token's source slice, merges the sub-result's token types into the host's,
// remaps sub type IDs, and splices the remapped tokens in place of the
// original host token.
export interface EmbedMapping {
	[hostTypeName: string]: LanguageFn | EmbedEntry;
}

// ---------------------------------------------------------------------------
// embedInterleaved — generic discontinuous embedding
// ---------------------------------------------------------------------------
//
// Some host-language constructs produce a "group" of tokens where content
// for a sub-language is interleaved with host-language "holes" that must be
// preserved verbatim. Tagged template literals are the exemplar case —
// `html`<p class="${cls}">hi</p>`` has HTML content broken up by a JS
// interpolation that needs to stay highlighted as JS.
//
// `embedInterleaved` handles this generically: the user provides a scanner
// callback that finds a group in the token stream and describes its regions
// (content chunks, hole chunks, synthetic delimiter wrappers). The transform
// then builds a single virtual source string, tokenizes it with the
// sub-language in one call (giving the sub-tokenizer full state continuity
// across holes), and splices the result back into the host stream with
// positions remapped to the real source.

/**
 * Region kinds describing how each part of a group contributes to the output.
 */
export type Region = ContentRegion | HoleRegion | SyntheticRegion;

/**
 * Content region — its source bytes are copied into the virtual source and
 * handed to the sub-language. Sub-tokens covering this range are emitted in
 * the output at their remapped real positions.
 */
export interface ContentRegion {
	kind: "content";
	/** Start of the range in the real host input (inclusive). */
	sourceStart: number;
	/** End of the range in the real host input (exclusive). */
	sourceEnd: number;
}

/**
 * Hole region — its source bytes become placeholder-filled in the virtual
 * source so the sub-language's state machine flows across them. In the output,
 * the original host tokens in `[tokenStart, tokenEnd)` are emitted verbatim
 * in place of the hole.
 */
export interface HoleRegion {
	kind: "hole";
	/** Start of the range in the real host input (inclusive). */
	sourceStart: number;
	/** End of the range in the real host input (exclusive). */
	sourceEnd: number;
	/** First host token index to emit verbatim. */
	tokenStart: number;
	/** One past the last host token index to emit verbatim. */
	tokenEnd: number;
}

/**
 * Synthetic region — does not contribute to the virtual source and has no
 * corresponding host token. A NEW token is synthesized at the region's
 * position with the given type name. Used for delimiter characters that
 * are part of a larger host token but need to appear as separate tokens in
 * the output (e.g. the backticks of a JS tagged template).
 */
export interface SyntheticRegion {
	kind: "synthetic";
	/** Start of the range covered by the synthetic token (inclusive). */
	sourceStart: number;
	/** End of the range covered by the synthetic token (exclusive). */
	sourceEnd: number;
	/** Token type name — merged into tokenTypes if not already present. */
	typeName: string;
}

/**
 * A group descriptor returned by a scan callback. Describes everything the
 * core primitive needs to process a discontinuous embedded group.
 */
export interface GroupDescriptor {
	/** Host token index where the group begins (inclusive). */
	tokenStart: number;
	/** Host token index where the group ends (exclusive). */
	tokenEnd: number;
	/**
	 * The group's regions in source order. The scanner is responsible for
	 * ensuring regions are non-overlapping and cover the group meaningfully.
	 */
	regions: Region[];
	/**
	 * Optional per-group sub-language override. If set, this language is
	 * used instead of the config's default — lets one scanner route
	 * different groups to different sub-languages (e.g. `html` vs `css`
	 * tagged templates in one pass).
	 */
	language?: LanguageFn;
}

/**
 * Scanner callback — called at each host token position. Returns a
 * GroupDescriptor if a group starts at `startIdx`, or null if not. The
 * scanner is the only host-specific code; the core transform is entirely
 * language-agnostic.
 */
export type GroupScanFn = (
	tokens: Uint32Array,
	input: string,
	startIdx: number,
	tokenTypes: string[],
) => GroupDescriptor | null;

export interface EmbedInterleavedConfig {
	/** Scanner that finds groups in the host token stream. */
	scan: GroupScanFn;
	/**
	 * Default sub-language used when a descriptor omits `language`. May be
	 * omitted if every descriptor supplies its own.
	 */
	language?: LanguageFn;
	/**
	 * Character used to fill hole spans in the virtual source. Must be
	 * "neutral" for the sub-language's tokenizer. Default: " ".
	 */
	holeChar?: string;
}

// Introspector types
export interface IntrospectorOptions {
	log?: ((type: string, data: any) => void) | null;
	collectHistory?: boolean;
	maxHistorySize?: number;
	grammarMapper?: GrammarMapper;
	stateNames?: Record<number, string>;
	ruleNames?: Record<number, Record<number, string>>;
	enhancedLogging?: boolean;
}

export interface IntrospectorEvent {
	type: string;
	pos?: number;
	char?: number;
	charStr?: string;
	currentState?: string | number;
	currentStateIndex?: number;
	stackDepth?: number;
	stateStack?: string[] | number[] | Uint16Array;
	stateStackIndices?: number[];
	fullStatePath?: string[] | number[];
	fullStateIndices?: number[];
	probeMode?: boolean;
	probeEntry?: any;
	failedProbes?: string[];
	inputContext?: InputContext;
	ruleIndex?: number;
	ruleName?: string;
	matchedLength?: number;
	transition?: string | number | null;
	tokenType?: string | number | null;
	stackOp?: string | number;
	targetState?: string | number;
	isTargetProbeState?: boolean;
	isInProbeState?: boolean;
	fromState?: string | number;
	fromStateIndex?: number;
	toState?: string;
	toStateIndex?: number;
	start?: number;
	end?: number;
	tokenIndex?: number;
	tokenName?: string;
	isFallback?: boolean;
	isNonAscii?: boolean;
	oldEnd?: number;
	newEnd?: number;
	success?: boolean;
	resetPos?: number;
	resetState?: string | number | null;
	reason?: string;
	finalStackDepth?: number;
	tokenCount?: number;
	finalState?: string | number;
	timestamp?: number;
	tokenEmitted?: boolean;
	text?: string;
}

export interface InputContext {
	before: string;
	char: string;
	after: string;
	display: string;
}

export interface StateInfo {
	currentState: number;
	stateStack: number[];
	fullPath: number[];
}

export interface TokenInfo {
	type: string;
	tokenType: number;
	tokenName: string;
	start: number;
	end: number;
	value?: string;
	tokenIndex: number;
	isFallback?: boolean;
	isNonAscii?: boolean;
}

export interface RouteStep {
	type: "START" | "PUSH" | "POP" | "TRANSITION";
	state?: number;
	stateName?: string;
	from?: number;
	fromName?: string;
	to?: string | number;
	toName?: string;
	position: number;
	depth: number;
	rule?: string | number | null;
	tokenEmitted?: boolean;
	// New fields for enhanced tracking
	entryPosition?: number; // Where we entered this state
	charactersProcessed?: number; // How many chars processed in this state
	rulesApplied?: Array<{ rule: string; count: number }>; // Rules that kept us in state
	isProbe?: boolean; // Whether this is a probe/ephemeral state
}

export interface StateSession {
	stateName: string;
	stateIndex: number;
	entryPosition: number;
	exitPosition?: number;
	charactersProcessed: number;
	rulesApplied: Map<string, number>; // Rule description -> count
	isProbe: boolean;
	depth: number;
	entryRule?: string; // Rule that triggered entry
	exitRule?: string; // Rule that triggered exit
}

export interface CompleteState {
	position: number;
	char: string | null;
	context: InputContext;
	state: {
		current: number;
		stack: number[];
		fullPath: number[];
		depth: number;
	};
	currentToken: TokenInfo | null;
	rulesMatched: IntrospectorEvent[];
	stateTransitionsAtPosition?: IntrospectorEvent[]; // All state transitions at this position
	allEventsAtPosition?: IntrospectorEvent[]; // All events at this position
	recentHistory: IntrospectorEvent[];
	totalEventsProcessed: number;
	currentStateSession?: StateSession; // Current active state session
}

export interface TokenHistory {
	token: TokenInfo;
	history: IntrospectorEvent[];
}

export interface Report {
	summary: {
		inputLength: number;
		tokenCount: number;
		stateTransitions: number;
		ruleMatches: number;
		probeEvents: number;
	};
	tokens: TokenInfo[];
	stateTransitions: IntrospectorEvent[];
	topRules: Array<{ rule: string | number; count: number }>;
	probeHistory: IntrospectorEvent[];
}

// Grammar Mapper types
export interface RuleDetails {
	pattern: string;
	token?: string;
	action: string | null;
	description: string;
	original: GrammarRule;
}

export interface TokenDescription {
	name: string;
	position: string;
	text: string;
	length: number;
}

export interface Analysis {
	summary: {
		totalTokens: number;
		uniqueTokenTypes: number;
		statesVisited: number;
		maxStackDepth: number;
	};
	tokensByType: Record<
		string,
		{
			count: number;
			examples: string[];
			totalLength: number;
		}
	>;
	stateVisits: Record<string, number>;
	ruleUsage: Record<
		string,
		{
			count: number;
			state: string;
			details: RuleDetails | null;
		}
	>;
}

export interface PositionAnalysis {
	position: number;
	character: string;
	inputContext: string;
	statePath: string;
	stateStack: string[];
	currentState: string;
	depth: number;
	currentToken: (TokenInfo & { typeName: string }) | null;
	matchedRules: Array<{
		rule: string;
		details: RuleDetails | null;
	}>;
	recentEvents: string[];
}

// Grammar Mapper class interface
export interface IGrammarMapper {
	originalGrammar: Grammar;
	compiledGrammar: CompiledGrammar;
	stateNames: Record<number, string>;
	stateRules: Record<number, Record<number, string>>;
	ruleDescriptions: Record<number, Record<number, RuleDetails>>;
	tokenNames: Record<number, string>;

	getStatePath(stateIndices: number[]): string;
	getStateName(stateIndex: number): string;
	getRuleName(stateIndex: number, ruleIndex: number): string;
	getRuleDetails(stateIndex: number, ruleIndex: number): RuleDetails | null;
	getTokenName(tokenType: number): string;
	describeTransition(
		fromState: number,
		toState: number,
		stackOp: number
	): string;
	describeToken(
		tokenType: number,
		start: number,
		end: number,
		text?: string
	): TokenDescription;
	createEnhancedIntrospector<T extends TokenizerIntrospector>(
		IntrospectorClass: new (options: IntrospectorOptions) => T,
		options?: IntrospectorOptions
	): T;
	analyzeTokenization(introspector: TokenizerIntrospector): Analysis;
	generateReport(introspector: TokenizerIntrospector): string;
	analyzePosition(
		introspector: TokenizerIntrospector,
		pos: number
	): PositionAnalysis;
	getFullRoute(introspector: TokenizerIntrospector, pos: number): RouteStep[];
	formatRoute(introspector: TokenizerIntrospector, pos: number): string;
}

// Type guard for GrammarMapper in options
export interface GrammarMapper extends IGrammarMapper {}
export type { TokenizerIntrospector };
