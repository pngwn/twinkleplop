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

export interface GrammarState {
	rules: GrammarRule[];
	mode?: "probe" | "tokenise";
	fallback?: string;
	extend?: string | string[];
}

export interface Grammar {
	name?: string;
	groups?: Record<string, GrammarState>;
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
