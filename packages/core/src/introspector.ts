// Introspector class for debugging tokenization

import type {
	CompiledGrammar,
	IntrospectorOptions,
	IntrospectorEvent,
	TokenInfo,
	InputContext,
	StateInfo,
	RouteStep,
	CompleteState,
	TokenHistory,
	Report,
	GrammarMapper,
} from "./types";

export class TokenizerIntrospector {
	options: IntrospectorOptions;
	history: IntrospectorEvent[] = [];
	tokens: TokenInfo[] = [];
	stateTransitions: IntrospectorEvent[] = [];
	ruleMatches: IntrospectorEvent[] = [];
	probeHistory: IntrospectorEvent[] = [];
	input: string = "";
	compiledGrammar: CompiledGrammar | null = null;

	initialState: number = 0;

	constructor(options: IntrospectorOptions = {}) {
		this.options = {
			log: null, // Function to call for logging, e.g. console.log or custom logger
			collectHistory: true,
			maxHistorySize: 10000,
			...options,
		};

		this.reset();
	}

	reset(): void {
		this.history = [];
		this.tokens = [];
		this.stateTransitions = [];
		this.ruleMatches = [];
		this.probeHistory = [];
		this.input = "";
		this.compiledGrammar = null;
	}

	init({
		input,
		compiledGrammar,
		initialState,
	}: {
		input: string;
		compiledGrammar: CompiledGrammar;
		initialState: number;
	}): void {
		this.input = input;
		this.compiledGrammar = compiledGrammar;
		this.initialState = initialState;

		this._log("INIT", {
			inputLength: input.length,
			initialState: this._getStateName(initialState),
		});
	}

	beforeChar({
		pos,
		char,
		charStr,
		currentState,
		stackPtr,
		stateStack,
		probeMode,
	}: {
		pos: number;
		char: number;
		charStr: string;
		currentState: number;
		stackPtr: number;
		stateStack: Uint8Array | number[];
		probeMode?: boolean;
	}): void {
		// Build the full state path (stack + current)
		const fullStateStack = [];
		for (let i = 0; i < stackPtr; i++) {
			fullStateStack.push(stateStack[i]);
		}
		fullStateStack.push(currentState);

		const event: IntrospectorEvent = {
			type: "BEFORE_CHAR",
			pos,
			char,
			charStr,
			currentState: this._getStateName(currentState),
			currentStateIndex: currentState,
			stackDepth: stackPtr,
			stateStack: Array.from(stateStack.slice(0, stackPtr)).map((s) =>
				this._getStateName(s)
			),
			stateStackIndices: Array.from(stateStack.slice(0, stackPtr)),
			fullStatePath: fullStateStack.map((s) => this._getStateName(s)),
			fullStateIndices: fullStateStack,
			probeMode,
			inputContext: this._getInputContext(pos),
		};

		this._addToHistory(event);
		this._log("BEFORE_CHAR", event);
	}

	matchedRule({
		charClass,
		matchedLength,
		transition,
		tokenType,
		stackOp,
		currentState,
		pos,
		probeMode,
	}: {
		charClass: number;
		matchedLength: number;
		transition: number;
		tokenType: number;
		stackOp: number;
		currentState: number;
		pos: number;
		probeMode?: boolean;
	}): void {
		const event: IntrospectorEvent = {
			type: "MATCHED_RULE",
			ruleIndex: charClass,
			ruleName: this._getRuleName(currentState, charClass),
			matchedLength,
			transition: transition !== 255 ? this._getStateName(transition) : null,
			tokenType: tokenType !== 255 ? this._getTokenName(tokenType) : null,
			stackOp: this._getStackOpName(stackOp),
			currentState: this._getStateName(currentState),
			pos,
			probeMode,
		};

		this._addToHistory(event);
		this._log("MATCHED_RULE", event);
		this.ruleMatches.push(event);
	}

	emittedToken({
		tokenType,
		tokenName,
		start,
		end,
		text,
		tokenIndex,
		isFallback,
		isNonAscii,
	}: {
		tokenType: number;
		tokenName: string;
		start: number;
		end: number;
		text?: string;
		tokenIndex: number;
		isFallback?: boolean;
		isNonAscii?: boolean;
	}): void {
		const token: TokenInfo = {
			type: "EMITTED_TOKEN",
			tokenType,
			tokenName,
			start,
			end,
			// Don't store text for performance - can be derived from input if needed
			tokenIndex,
			isFallback: isFallback || false,
			isNonAscii: isNonAscii || false,
		};

		this._addToHistory(token);
		this._log("EMITTED_TOKEN", token);
		this.tokens.push(token);
	}

	extendedToken({
		tokenType,
		oldEnd,
		newEnd,
		tokenIndex,
	}: {
		tokenType: number;
		oldEnd: number;
		newEnd: number;
		tokenIndex: number;
	}): void {
		const event: IntrospectorEvent = {
			type: "EXTENDED_TOKEN",
			tokenType: this._getTokenName(tokenType),
			oldEnd,
			newEnd,
			tokenIndex,
		};

		this._addToHistory(event);
		this._log("EXTENDED_TOKEN", event);

		// Update the token in our tokens array
		if (this.tokens[tokenIndex]) {
			this.tokens[tokenIndex].end = newEnd;
			// Don't store text for performance - can be derived from input if needed
		}
	}

	pushedState({
		fromState,
		toState,
		stackPtr,
		pos,
	}: {
		fromState: number;
		toState: number;
		stackPtr: number;
		pos?: number;
	}): void {
		const transition: IntrospectorEvent = {
			type: "PUSHED_STATE",
			fromState: this._getStateName(fromState),
			fromStateIndex: fromState,
			toState: this._getStateName(toState),
			toStateIndex: toState,
			stackDepth: stackPtr,
			pos: pos,
		};

		this._addToHistory(transition);
		this._log("PUSHED_STATE", transition);
		this.stateTransitions.push(transition);
	}

	poppedState({
		fromState,
		toState,
		stackPtr,
		pos,
	}: {
		fromState: number;
		toState: number;
		stackPtr: number;
		pos?: number;
	}): void {
		const transition: IntrospectorEvent = {
			type: "POPPED_STATE",
			fromState: this._getStateName(fromState),
			fromStateIndex: fromState,
			toState: this._getStateName(toState),
			toStateIndex: toState,
			stackDepth: stackPtr,
			pos: pos,
		};

		this._addToHistory(transition);
		this._log("POPPED_STATE", transition);
		this.stateTransitions.push(transition);
	}

	transitionedState({
		fromState,
		toState,
		ruleName,
		tokenEmitted,
		pos,
	}: {
		fromState: number;
		toState: number;
		ruleName?: string | null;
		tokenEmitted?: boolean;
		pos?: number;
	}): void {
		const transition: IntrospectorEvent = {
			type: "TRANSITIONED_STATE",
			fromState: this._getStateName(fromState),
			fromStateIndex: fromState, // Store the numeric index
			toState: this._getStateName(toState),
			toStateIndex: toState, // Store the numeric index
			ruleName: ruleName || undefined,
			tokenEmitted: tokenEmitted || false,
			pos: pos,
		};

		this._addToHistory(transition);
		this._log("TRANSITIONED_STATE", transition);
		this.stateTransitions.push(transition);
	}

	enterProbeMode({
		charClass,
		pos,
		currentState,
		stackPtr,
	}: {
		charClass: number;
		pos: number;
		currentState: number;
		stackPtr: number;
	}): void {
		const event: IntrospectorEvent = {
			type: "ENTER_PROBE",
			ruleIndex: charClass,
			pos,
			currentState: this._getStateName(currentState),
			stackDepth: stackPtr,
		};

		this._addToHistory(event);
		this._log("ENTER_PROBE", event);
		this.probeHistory.push(event);
	}

	exitProbeMode({
		success,
		resetPos,
		currentState,
		resetState,
		reason,
		pos,
	}: {
		success: boolean;
		resetPos: number;
		currentState?: number;
		resetState?: number;
		reason?: string;
		pos?: number;
	}): void {
		const event: IntrospectorEvent = {
			type: "EXIT_PROBE",
			success,
			resetPos,
			currentState:
				currentState !== undefined
					? this._getStateName(currentState)
					: undefined,
			resetState:
				resetState !== undefined && resetState !== null
					? this._getStateName(resetState)
					: undefined,
			reason,
			pos,
		};

		this._addToHistory(event);
		this._log("EXIT_PROBE", event);
		this.probeHistory.push(event);
	}

	fallbackMatch({
		tokenType,
		pos,
		currentState,
	}: {
		tokenType: number;
		pos: number;
		currentState: number;
	}): void {
		const event: IntrospectorEvent = {
			type: "FALLBACK_MATCH",
			tokenType: this._getTokenName(tokenType),
			pos,
			currentState: this._getStateName(currentState),
		};

		this._addToHistory(event);
		this._log("FALLBACK_MATCH", event);
	}

	nonAsciiMatch({
		char,
		tokenType,
		pos,
		currentState,
	}: {
		char: number;
		tokenType: number;
		pos: number;
		currentState: number;
	}): void {
		const event: IntrospectorEvent = {
			type: "NON_ASCII_MATCH",
			char,
			charStr: String.fromCharCode(char),
			tokenType: this._getTokenName(tokenType),
			pos,
			currentState: this._getStateName(currentState),
		};

		this._addToHistory(event);
		this._log("NON_ASCII_MATCH", event);
	}

	complete({
		tokenCount,
		finalState,
		finalStackPtr,
	}: {
		tokenCount: number;
		finalState: number;
		finalStackPtr: number;
	}): void {
		const event: IntrospectorEvent = {
			type: "COMPLETE",
			tokenCount,
			finalState: this._getStateName(finalState),
			finalStackDepth: finalStackPtr,
		};

		this._addToHistory(event);
		this._log("COMPLETE", event);
	}

	// Additional optional methods for extended debugging
	resolvedToken(params: any): void {
		const event: IntrospectorEvent = {
			type: "RESOLVED_TOKEN",
			...params,
		};
		this._addToHistory(event);
		this._log("RESOLVED_TOKEN", event);
	}

	probeFailed(params: any): void {
		const event: IntrospectorEvent = {
			type: "PROBE_FAILED",
			...params,
		};
		this._addToHistory(event);
		this._log("PROBE_FAILED", event);
	}

	noMatch(params: any): void {
		const event: IntrospectorEvent = {
			type: "NO_MATCH",
			...params,
		};
		this._addToHistory(event);
		this._log("NO_MATCH", event);
	}

	skippedFailedProbe(params: any): void {
		const event: IntrospectorEvent = {
			type: "SKIPPED_FAILED_PROBE",
			...params,
		};
		this._addToHistory(event);
		this._log("SKIPPED_FAILED_PROBE", event);
	}

	usingAlternativeRule(params: any): void {
		const event: IntrospectorEvent = {
			type: "USING_ALTERNATIVE_RULE",
			...params,
		};
		this._addToHistory(event);
		this._log("USING_ALTERNATIVE_RULE", event);
	}

	// Get complete tokenizer state at a specific position
	getCompleteStateAtPosition(pos: number): CompleteState {
		const state = this.getStateAtPosition(pos);
		const token = this.getTokenAtPosition(pos);
		const rulesApplied = this.getRulesAppliedAt(pos);
		const stateTransitions = this.getStateTransitionsAtPosition(pos);
		const allEventsAtPos = this.getAllEventsAtPosition(pos);

		// Get all events up to and including this position
		const eventsUpToPos = this.history.filter((e) => !e.pos || e.pos <= pos);

		// Get the last few events for context
		const recentEvents = eventsUpToPos.slice(-10);

		return {
			position: pos,
			char: pos < this.input.length ? this.input[pos] : null,
			context: this._getInputContext(pos),
			state: {
				current: state.currentState, // Keep as raw index
				stack: state.stateStack, // Keep as raw indices
				fullPath: state.fullPath, // Keep as raw indices
				depth: state.stateStack.length,
			},
			currentToken: token || null,
			rulesMatched: rulesApplied,
			stateTransitionsAtPosition: stateTransitions, // NEW: All transitions at this position
			allEventsAtPosition: allEventsAtPos, // NEW: All events at this position
			recentHistory: recentEvents,
			totalEventsProcessed: eventsUpToPos.length,
		};
	}

	// Get the state path as a string (e.g., "main -> string -> escape")
	getStatePathAtPosition(pos: number): string {
		const state = this.getStateAtPosition(pos);
		// Return the raw indices if we have a grammar mapper, otherwise format them
		if ((this.options as any).grammarMapper) {
			return (this.options as any).grammarMapper.getStatePath(state.fullPath);
		}
		return state.fullPath.map((s) => this._getStateName(s)).join(" → ");
	}

	// Get the full route taken to reach a position, including all sideways transitions
	getFullRouteToPosition(pos: number): RouteStep[] {
		const route: RouteStep[] = [];
		let currentState = this.initialState;
		let stateStack: number[] = [];
		let stackPtr = 0;
		let lastState = currentState;
		let lastMatchedRule: string | number | null = null;
		let lastTokenEmitted = false;

		// Add initial state
		route.push({
			type: "START",
			state: currentState,
			stateName: this._getStateName(currentState),
			position: 0,
			depth: 0,
		});

		for (const event of this.history) {
			if (event.pos !== undefined && event.pos > pos) break;

			// Track the last matched rule and token emission
			if (event.type === "MATCHED_RULE") {
				lastMatchedRule = event.ruleName || event.ruleIndex || null;
				lastTokenEmitted = !!event.tokenType;
			} else if (event.type === "EMITTED_TOKEN") {
				lastTokenEmitted = true;
			}

			if (event.type === "PUSHED_STATE") {
				// Push current state to stack and move to new state
				stateStack[stackPtr] =
					event.fromStateIndex !== undefined ? event.fromStateIndex : lastState;
				stackPtr++;
				currentState =
					event.toStateIndex !== undefined ? event.toStateIndex : currentState;

				route.push({
					type: "PUSH",
					from: lastState,
					fromName: this._getStateName(lastState),
					to: currentState,
					toName: this._getStateName(currentState),
					position:
						event.pos !== undefined && event.pos !== null ? event.pos : 0,
					depth: stackPtr,
					rule: lastMatchedRule,
					tokenEmitted: lastTokenEmitted,
				});
				lastState = currentState;
				lastMatchedRule = null;
				lastTokenEmitted = false;
			} else if (event.type === "POPPED_STATE") {
				// Pop from stack
				if (stackPtr > 0) {
					const poppedFrom = currentState;
					stackPtr--;
					// Use the toState from the event
					currentState =
						event.toStateIndex !== undefined
							? event.toStateIndex
							: typeof event.toState === "number"
								? event.toState
								: stateStack[stackPtr]; // Fallback to stack if event doesn't have toState
					route.push({
						type: "POP",
						from: poppedFrom,
						fromName: this._getStateName(poppedFrom),
						to: currentState,
						toName: this._getStateName(currentState),
						position:
							event.pos !== undefined && event.pos !== null ? event.pos : 0,
						depth: stackPtr,
						rule: lastMatchedRule,
						tokenEmitted: lastTokenEmitted,
					});
					lastState = currentState;
					lastMatchedRule = null;
					lastTokenEmitted = false;
				}
			} else if (event.type === "TRANSITIONED_STATE") {
				const toState =
					event.toStateIndex !== undefined
						? event.toStateIndex
						: typeof event.toState === "number"
							? event.toState
							: 0;

				route.push({
					type: "TRANSITION",
					from: lastState,
					fromName: this._getStateName(lastState),
					to: toState,
					toName: this._getStateName(toState),
					position:
						event.pos !== undefined && event.pos !== null ? event.pos : 0,
					depth: stackPtr,
					rule: event.ruleName || lastMatchedRule,
					tokenEmitted:
						event.tokenEmitted !== undefined
							? event.tokenEmitted
							: lastTokenEmitted,
				});
				currentState = toState;
				lastState = toState;
				lastMatchedRule = null;
				lastTokenEmitted = false;
			}
		}

		return route;
	}

	// Get a formatted string showing the full route
	formatFullRoute(pos: number): string {
		const route = this.getFullRouteToPosition(pos);
		const parts = [];

		for (const step of route) {
			switch (step.type) {
				case "START":
					parts.push(step.stateName);
					break;
				case "PUSH":
					parts.push(`↓${step.toName}`);
					break;
				case "POP":
					parts.push(`↑${step.toName}`);
					break;
				case "TRANSITION":
					parts.push(`→${step.toName}`);
					break;
			}
		}

		return parts.join(" ");
	}

	// Query methods for introspection
	getTokenAtPosition(pos: number): TokenInfo | undefined {
		return this.tokens.find((t) => t.start <= pos && pos < t.end);
	}

	getTokenHistory(tokenIndex: number): TokenHistory | null {
		const token = this.tokens[tokenIndex];
		if (!token) return null;

		const relevantHistory = this.history.filter((event) => {
			if (event.type === "EMITTED_TOKEN" && event.tokenIndex === tokenIndex) {
				return true;
			}
			if (event.type === "EXTENDED_TOKEN" && event.tokenIndex === tokenIndex) {
				return true;
			}
			if (event.pos && event.pos >= token.start && event.pos < token.end) {
				return true;
			}
			return false;
		});

		return {
			token,
			history: relevantHistory,
		};
	}

	getStateAtPosition(pos: number): StateInfo {
		// Find the last state before this position, including the full stack
		let currentState = this.initialState;
		let stateStack = [];
		let stackPtr = 0;
		for (const event of this.history) {
			if (event.pos !== undefined && event.pos > pos) break;

			if (event.type === "PUSHED_STATE") {
				// Push the fromState to stack (the state we're leaving)
				const stateToPush =
					event.fromStateIndex !== undefined
						? event.fromStateIndex
						: currentState;
				stateStack[stackPtr++] = stateToPush;
				// Move to the new state
				currentState =
					event.toStateIndex !== undefined
						? event.toStateIndex
						: typeof event.toState === "number"
							? event.toState
							: currentState;
			} else if (event.type === "POPPED_STATE") {
				// Pop from stack and use the toState from the event
				if (stackPtr > 0) {
					stackPtr--;
				}
				// Use the toState from the event, not from the stack
				currentState =
					event.toStateIndex !== undefined
						? event.toStateIndex
						: typeof event.toState === "number"
							? event.toState
							: currentState;
			} else if (event.type === "TRANSITIONED_STATE") {
				const prevState = currentState;
				currentState =
					event.toStateIndex !== undefined
						? event.toStateIndex
						: typeof event.toState === "number"
							? event.toState
							: currentState;
			}
		}
		return {
			currentState,
			stateStack: stateStack.slice(0, stackPtr),
			fullPath: [...stateStack.slice(0, stackPtr), currentState],
		};
	}

	getRulesAppliedAt(pos: number): IntrospectorEvent[] {
		return this.ruleMatches.filter((rule) => rule.pos === pos);
	}

	getProbeEvents(): IntrospectorEvent[] {
		return this.probeHistory;
	}

	// Get all state transitions that occur at a specific position
	getStateTransitionsAtPosition(pos: number): IntrospectorEvent[] {
		return this.history.filter((event) => {
			// Include all state transition events at this position
			if (event.pos !== pos) return false;
			return (
				event.type === "PUSHED_STATE" ||
				event.type === "POPPED_STATE" ||
				event.type === "TRANSITIONED_STATE" ||
				event.type === "ENTER_PROBE" ||
				event.type === "EXIT_PROBE"
			);
		});
	}

	// Get all events (including probe) that occur at a specific position
	getAllEventsAtPosition(pos: number): IntrospectorEvent[] {
		return this.history.filter((event) => event.pos === pos);
	}

	// Visualization helpers
	generateReport(): Report {
		const report: Report = {
			summary: {
				inputLength: this.input.length,
				tokenCount: this.tokens.length,
				stateTransitions: this.stateTransitions.length,
				ruleMatches: this.ruleMatches.length,
				probeEvents: this.probeHistory.length,
			},
			tokens: this.tokens,
			stateTransitions: this.stateTransitions,
			topRules: this._getTopRules(),
			probeHistory: this.probeHistory,
		};

		return report;
	}

	generateTokenTrace(tokenIndex: number): string | null {
		const tokenHistory = this.getTokenHistory(tokenIndex);
		if (!tokenHistory) return null;

		// Derive text from input if needed
		const text = this.input.substring(
			tokenHistory.token.start,
			tokenHistory.token.end
		);
		const trace = [
			`Token #${tokenIndex}: ${tokenHistory.token.tokenName}`,
			`  Text: "${text}"`,
			`  Position: ${tokenHistory.token.start}-${tokenHistory.token.end}`,
			"",
			"Trace:",
		];

		for (const event of tokenHistory.history) {
			trace.push(`  ${this._formatEvent(event)}`);
		}

		return trace.join("\n");
	}

	// Private helper methods
	private _addToHistory(event: IntrospectorEvent): void {
		if (this.options.collectHistory) {
			if (
				this.options?.maxHistorySize &&
				this.history.length >= this.options.maxHistorySize
			) {
				// Remove oldest 10% when we hit the limit
				const removeCount = Math.floor(this.options.maxHistorySize * 0.1);
				this.history.splice(0, removeCount);
			}
			this.history.push({ ...event, timestamp: Date.now() });
		}
	}

	private _log(type: string, data: any): void {
		if (this.options.log) {
			this.options.log(`[${type}]`, data);
		}
	}

	private _getStateName(stateIndex: number): string {
		// Check if we have a grammar mapper
		const mapper = (this.options as any).grammarMapper as
			| GrammarMapper
			| undefined;
		if (mapper) {
			return mapper.getStateName(stateIndex);
		}

		return `state_${stateIndex}`;
	}

	private _getRuleName(stateIndex: number, ruleIndex: number): string {
		// Check if we have a grammar mapper
		const mapper = (this.options as any).grammarMapper as
			| GrammarMapper
			| undefined;
		if (mapper) {
			return mapper.getRuleName(stateIndex, ruleIndex);
		}

		return `rule_${ruleIndex}`;
	}

	private _getTokenName(tokenType: number): string {
		// Check if we have a grammar mapper
		const mapper = (this.options as any).grammarMapper as
			| GrammarMapper
			| undefined;
		if (mapper) {
			return mapper.getTokenName(tokenType);
		}
		if (this.compiledGrammar && this.compiledGrammar.tokenTypes) {
			return `${this.compiledGrammar.tokenTypes[tokenType]} (${tokenType})`;
		}
		return `token_${tokenType}`;
	}

	private _getStackOpName(stackOp: number): string {
		switch (stackOp) {
			case 0:
				return "none";
			case 1:
				return "push";
			case 2:
				return "pop";
			default:
				return `unknown(${stackOp})`;
		}
	}

	private _getInputContext(
		pos: number,
		contextSize: number = 20
	): InputContext {
		const start = Math.max(0, pos - contextSize);
		const end = Math.min(this.input.length, pos + contextSize);
		const before = this.input.substring(start, pos);
		const char = pos < this.input.length ? this.input[pos] : "";
		const after = this.input.substring(pos + 1, end);

		return {
			before,
			char,
			after,
			display: `...${before}[${char}]${after}...`,
		};
	}

	private _getTopRules(
		limit: number = 10
	): Array<{ rule: string | number; count: number }> {
		const ruleCounts: Record<string | number, number> = {};
		for (const match of this.ruleMatches) {
			const key = (match.ruleName || match.ruleIndex)!;
			ruleCounts[key] = (ruleCounts[key] || 0) + 1;
		}

		return Object.entries(ruleCounts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, limit)
			.map(([rule, count]) => ({ rule, count }));
	}

	private _formatEvent(event: IntrospectorEvent): string {
		switch (event.type) {
			case "BEFORE_CHAR":
				return `[${event.pos}] '${event.charStr}' in ${event.currentState}`;
			case "MATCHED_RULE":
				return `[${event.pos}] Matched ${event.ruleName} → ${event.tokenType || "no token"}`;
			case "EMITTED_TOKEN":
				return `[${event.start}-${event.end}] Emitted ${event.tokenName}`;
			case "PUSHED_STATE":
				return `Pushed state: ${event.fromState} → ${event.toState}`;
			case "POPPED_STATE":
				return `Popped state: ${event.fromState} → ${event.toState}`;
			default:
				return `${event.type}`;
		}
	}
}
