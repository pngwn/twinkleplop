/**
 * Grammar mapper for introspection - maps compiled indices back to grammar names
 */

import type {
	Grammar,
	GrammarRule,
	CompiledGrammar,
	IGrammarMapper,
	RuleDetails,
	TokenDescription,
	Analysis,
	PositionAnalysis,
	RouteStep,
	IntrospectorOptions,
	TokenizerIntrospector,
} from "./types";

export class GrammarMapper {
	originalGrammar: Grammar;
	compiledGrammar: CompiledGrammar;
	stateNames: Record<number, string>;
	stateRules: Record<number, Record<number, string>>;
	ruleDescriptions: Record<number, Record<number, RuleDetails>>;
	tokenNames: Record<number, string>;

	constructor(originalGrammar: Grammar, compiledGrammar: CompiledGrammar) {
		this.originalGrammar = originalGrammar;
		this.compiledGrammar = compiledGrammar;

		// Build mappings
		this.stateNames = {};
		this.stateRules = {};
		this.ruleDescriptions = {};
		this.tokenNames = {};

		this._buildMappings();
	}

	private _buildMappings(): void {
		// Map state indices to state names
		const stateNames = Object.keys(this.originalGrammar.states);
		stateNames.forEach((name, idx) => {
			this.stateNames[idx] = name;

			// Get rules for this state
			const stateRules = this.originalGrammar.states[name];
			const rules = stateRules.rules || (stateRules as any); // Handle both formats

			if (Array.isArray(rules)) {
				this.stateRules[idx] = {};
				rules.forEach((rule, ruleIdx) => {
					const desc = this._describeRule(rule);
					this.stateRules[idx][ruleIdx] = desc;

					// Store full description
					if (!this.ruleDescriptions[idx]) {
						this.ruleDescriptions[idx] = {};
					}
					this.ruleDescriptions[idx][ruleIdx] = {
						pattern: this._getPattern(rule),
						token: rule.token,
						action: this._getAction(rule),
						description: desc,
						original: rule,
					};
				});
			}
		});

		// Map token type indices to names
		if (this.compiledGrammar.tokenTypes) {
			this.compiledGrammar.tokenTypes.forEach((name, idx) => {
				this.tokenNames[idx] = name;
			});
		}
	}

	private _getPattern(rule: GrammarRule): string {
		if (rule.match) {
			if (rule.match instanceof RegExp) {
				return rule.match.toString();
			} else if (Array.isArray(rule.match)) {
				return JSON.stringify(rule.match);
			} else {
				return JSON.stringify(rule.match);
			}
		} else if (rule.range) {
			if (Array.isArray(rule.range[0])) {
				// Multiple ranges
				return (rule.range as Array<[string | number, string | number]>)
					.map((r) => `[${r[0]}-${r[1]}]`)
					.join(", ");
			} else {
				// Single range
				const r = rule.range as [string | number, string | number];
				return `[${r[0]}-${r[1]}]`;
			}
		}
		return "unknown";
	}

	private _getAction(rule: GrammarRule): string | null {
		if (rule.state) {
			return `push(${rule.state})`;
		} else if (rule.exit) {
			return "pop()";
		}
		return null;
	}

	private _describeRule(rule: GrammarRule): string {
		const parts: string[] = [];

		// Pattern
		if (rule.match) {
			if (rule.match instanceof RegExp) {
				parts.push(rule.match.toString());
			} else if (typeof rule.match === "string") {
				parts.push(`"${rule.match}"`);
			} else if (Array.isArray(rule.match)) {
				parts.push(`[${rule.match.map((m) => `"${m}"`).join(", ")}]`);
			}
		} else if (rule.range) {
			if (Array.isArray(rule.range[0])) {
				// Multiple ranges
				parts.push(
					(rule.range as Array<[string | number, string | number]>)
						.map((r) => `[${r[0]}-${r[1]}]`)
						.join(", ")
				);
			} else {
				// Single range
				const r = rule.range as [string | number, string | number];
				parts.push(`[${r[0]}-${r[1]}]`);
			}
		}

		// Token
		if (rule.token) {
			parts.push(`→ ${rule.token}`);
		}

		// Action
		if (rule.state) {
			parts.push(`↓ ${rule.state}`);
		} else if (rule.exit) {
			parts.push("↑ exit");
		}

		return parts.join(" ");
	}

	// Public API

	getStatePath(stateIndices: number[]): string {
		// Convert array of state indices to readable path
		if (!Array.isArray(stateIndices)) return "";
		return stateIndices.map((idx) => this.getStateName(idx)).join(" → ");
	}

	getStateName(stateIndex: number): string {
		if (this.stateNames[stateIndex]) {
			return this.stateNames[stateIndex];
		}
		return `state_${stateIndex}`;
	}

	getRuleName(stateIndex: number, ruleIndex: number): string {
		if (this.stateRules[stateIndex] && this.stateRules[stateIndex][ruleIndex]) {
			return this.stateRules[stateIndex][ruleIndex];
		}
		return `rule_${ruleIndex}`;
	}

	getRuleDetails(stateIndex: number, ruleIndex: number): RuleDetails | null {
		if (this.ruleDescriptions[stateIndex]) {
			return this.ruleDescriptions[stateIndex][ruleIndex] || null;
		}
		return null;
	}

	getTokenName(tokenType: number): string {
		return this.tokenNames[tokenType] || `token_${tokenType}`;
	}

	describeTransition(
		fromState: number,
		toState: number,
		stackOp: number
	): string {
		const from = this.getStateName(fromState);
		const to = this.getStateName(toState);

		if (stackOp === 1) {
			return `Push: ${from} → ${to} (stack depth increases)`;
		} else if (stackOp === 2) {
			return `Pop: ${from} ← ${to} (returned from ${from})`;
		} else {
			return `Goto: ${from} → ${to}`;
		}
	}

	describeToken(
		tokenType: number,
		start: number,
		end: number,
		text?: string
	): TokenDescription {
		const name = this.getTokenName(tokenType);
		return {
			name,
			position: `[${start}:${end}]`,
			text: text
				? text.length > 20
					? text.substring(0, 20) + "..."
					: text
				: "",
			length: end - start,
		};
	}

	// Enhanced introspector integration

	createEnhancedIntrospector<T extends TokenizerIntrospector>(
		IntrospectorClass: new (options: IntrospectorOptions) => T,
		options: IntrospectorOptions = {}
	): T {
		const mapper = this;

		// Create introspector with pre-configured logging that uses grammar names
		return new IntrospectorClass({
			...options,
			// Store mapper reference for queries
			grammarMapper: mapper as any,

			// Override the name getters to use mapper
			stateNames: this.stateNames,
			ruleNames: this.stateRules,

			// Enhanced logging if requested
			log:
				options.log ||
				(options.enhancedLogging
					? (type: string, data: any) => {
							this._enhancedLog(type, data, mapper);
						}
					: null),
		});
	}

	private _enhancedLog(type: string, data: any, mapper: GrammarMapper): void {
		const indent = "  ";

		switch (type) {
			case "[BEFORE_CHAR]":
				if (data.fullStatePath && data.fullStatePath.length > 0) {
					const path = data.fullStatePath.join(" → ");
					console.log(`${indent}[${data.pos}] '${data.charStr}' in: ${path}`);
				} else {
					console.log(
						`${indent}[${data.pos}] '${data.charStr}' in state: ${data.currentState}`
					);
				}
				break;

			case "[MATCHED_RULE]":
				const rule = mapper.getRuleDetails(data.currentState, data.ruleIndex);
				if (rule) {
					console.log(`${indent}✓ Matched: ${rule.description}`);
				}
				break;

			case "[EMITTED_TOKEN]":
				const token = mapper.describeToken(
					data.tokenType,
					data.start,
					data.end,
					data.text
				);
				console.log(
					`${indent}📝 Token: ${token.name} ${token.position} "${token.text}"`
				);
				break;

			case "[PUSHED_STATE]":
				console.log(
					`${indent}↓ Push: ${data.fromState} → ${data.toState} (depth: ${data.stackDepth})`
				);
				break;

			case "[POPPED_STATE]":
				console.log(
					`${indent}↑ Pop: ${mapper.getStateName(data.fromState)} ← ${mapper.getStateName(data.toState)}`
				);
				break;

			case "[TRANSITIONED_STATE]":
				console.log(
					`${indent}→ Goto: ${mapper.getStateName(data.fromState)} → ${mapper.getStateName(data.toState)}`
				);
				break;
		}
	}

	// Analysis helpers

	analyzeTokenization(introspector: TokenizerIntrospector): Analysis {
		const analysis: Analysis = {
			summary: {
				totalTokens: introspector.tokens.length,
				uniqueTokenTypes: new Set(introspector.tokens.map((t) => t.tokenType))
					.size,
				statesVisited: new Set(
					introspector.stateTransitions.map((t) => (t as any).fromState)
				).size,
				maxStackDepth: Math.max(
					...introspector.stateTransitions.map(
						(t) => (t as any).stackDepth || 0
					)
				),
			},
			tokensByType: {},
			stateVisits: {},
			ruleUsage: {},
		};

		// Count tokens by type
		for (const token of introspector.tokens) {
			const name = this.getTokenName(token.tokenType);
			if (!analysis.tokensByType[name]) {
				analysis.tokensByType[name] = {
					count: 0,
					examples: [],
					totalLength: 0,
				};
			}
			analysis.tokensByType[name].count++;
			analysis.tokensByType[name].totalLength += token.end - token.start;
			if (
				analysis.tokensByType[name].examples.length < 3 &&
				introspector.input
			) {
				// Derive text from input if available
				const text = introspector.input.substring(token.start, token.end);
				analysis.tokensByType[name].examples.push(text);
			}
		}

		// Count state visits
		for (const transition of introspector.stateTransitions) {
			// The transition already has state names as strings, not indices
			// If it starts with "state_", extract the index and remap it
			let toStateName = (transition as any).toState;
			if (typeof toStateName === "string" && toStateName.startsWith("state_")) {
				const idx = parseInt(toStateName.replace("state_", ""));
				if (!isNaN(idx)) {
					toStateName = this.getStateName(idx);
				}
			}
			analysis.stateVisits[toStateName] =
				(analysis.stateVisits[toStateName] || 0) + 1;
		}

		// Count rule usage
		for (const match of introspector.ruleMatches) {
			const currentState =
				typeof (match as any).currentState === "number"
					? (match as any).currentState
					: (match as any).currentStateIndex || 0;
			const ruleIndex = (match as any).ruleIndex || 0;
			const ruleName = this.getRuleName(currentState, ruleIndex);
			if (!analysis.ruleUsage[ruleName]) {
				analysis.ruleUsage[ruleName] = {
					count: 0,
					state: this.getStateName(currentState),
					details: this.getRuleDetails(currentState, ruleIndex),
				};
			}
			analysis.ruleUsage[ruleName].count++;
		}

		return analysis;
	}

	generateReport(introspector: TokenizerIntrospector): string {
		const analysis = this.analyzeTokenization(introspector);
		const lines: string[] = [];

		lines.push("=== TOKENIZATION REPORT ===");
		lines.push("");
		lines.push("Summary:");
		lines.push(`  Total tokens: ${analysis.summary.totalTokens}`);
		lines.push(`  Token types: ${analysis.summary.uniqueTokenTypes}`);
		lines.push(`  States visited: ${analysis.summary.statesVisited}`);
		lines.push(`  Max stack depth: ${analysis.summary.maxStackDepth}`);
		lines.push("");

		lines.push("Tokens by Type:");
		for (const [type, info] of Object.entries(analysis.tokensByType)) {
			lines.push(`  ${type}: ${info.count} occurrences`);
			lines.push(
				`    Average length: ${(info.totalLength / info.count).toFixed(1)} chars`
			);
			lines.push(
				`    Examples: ${info.examples.map((e) => `"${e}"`).join(", ")}`
			);
		}
		lines.push("");

		lines.push("State Visits:");
		for (const [state, count] of Object.entries(analysis.stateVisits)) {
			lines.push(`  ${state}: ${count} times`);
		}
		lines.push("");

		lines.push("Most Used Rules:");
		const sortedRules = Object.entries(analysis.ruleUsage)
			.sort((a, b) => b[1].count - a[1].count)
			.slice(0, 10);
		for (const [rule, info] of sortedRules) {
			lines.push(`  ${info.count}x: ${rule}`);
			if (info.details) {
				lines.push(`      Pattern: ${info.details.pattern}`);
				if (info.details.token) {
					lines.push(`      Token: ${info.details.token}`);
				}
			}
		}

		return lines.join("\n");
	}

	// Get complete analysis at a specific position
	analyzePosition(
		introspector: TokenizerIntrospector,
		pos: number
	): PositionAnalysis {
		const completeState = introspector.getCompleteStateAtPosition(pos);

		// Map all the state indices to names
		const analysis: PositionAnalysis = {
			position: pos,
			character: completeState.char || "",
			inputContext: completeState.context.display,
			statePath: this.getStatePath(completeState.state.fullPath),
			stateStack: completeState.state.stack.map((idx) =>
				this.getStateName(idx)
			),
			currentState: this.getStateName(completeState.state.current),
			depth: completeState.state.depth,
			currentToken: completeState.currentToken
				? {
						...completeState.currentToken,
						typeName: this.getTokenName(completeState.currentToken.tokenType),
					}
				: null,
			matchedRules: completeState.rulesMatched.map((r) => ({
				rule: this.getRuleName(
					typeof (r as any).currentState === "number"
						? (r as any).currentState
						: (r as any).currentStateIndex || 0,
					(r as any).ruleIndex || 0
				),
				details: this.getRuleDetails(
					typeof (r as any).currentState === "number"
						? (r as any).currentState
						: (r as any).currentStateIndex || 0,
					(r as any).ruleIndex || 0
				),
			})),
			recentEvents: completeState.recentHistory.map((e) =>
				this._describeEvent(e)
			),
		};

		return analysis;
	}

	private _describeEvent(event: any): string {
		switch (event.type) {
			case "BEFORE_CHAR":
				return `[${event.pos}] Processing '${event.charStr}'`;
			case "MATCHED_RULE":
				const currentState =
					typeof event.currentState === "number"
						? event.currentState
						: event.currentStateIndex || 0;
				return `Matched: ${this.getRuleName(currentState, event.ruleIndex)}`;
			case "EMITTED_TOKEN":
				return `Token: ${this.getTokenName(event.tokenType)} [${event.start}:${event.end}]`;
			case "PUSHED_STATE":
				return `Push → ${this.getStateName(event.toStateIndex || event.toState)}`;
			case "POPPED_STATE":
				return `Pop ← ${this.getStateName(event.toStateIndex || event.toState)}`;
			default:
				return event.type;
		}
	}

	// Get the full route with all transitions (including sideways)
	getFullRoute(introspector: TokenizerIntrospector, pos: number): RouteStep[] {
		const route = introspector.getFullRouteToPosition(pos);

		// The route already has state names from introspector, but double check
		return route.map((step) => {
			const mapped = { ...step };

			// If names look like "state_X", convert them
			if (mapped.stateName && mapped.stateName.startsWith("state_")) {
				const idx = parseInt(mapped.stateName.replace("state_", ""));
				if (!isNaN(idx)) {
					mapped.stateName = this.getStateName(idx);
				}
			}
			if (mapped.fromName && mapped.fromName.startsWith("state_")) {
				const idx = parseInt(mapped.fromName.replace("state_", ""));
				if (!isNaN(idx)) {
					mapped.fromName = this.getStateName(idx);
				}
			}
			if (mapped.toName && mapped.toName.startsWith("state_")) {
				const idx = parseInt(mapped.toName.replace("state_", ""));
				if (!isNaN(idx)) {
					mapped.toName = this.getStateName(idx);
				}
			}

			return mapped;
		});
	}

	// Format the full route as a readable string
	formatRoute(introspector: TokenizerIntrospector, pos: number): string {
		const route = this.getFullRoute(introspector, pos);
		const parts: string[] = [];

		for (const step of route) {
			switch (step.type) {
				case "START":
					parts.push(step.stateName || "");
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
}

// Helper function to create mapper from grammar
export function createGrammarMapper(
	originalGrammar: Grammar,
	compiledGrammar: CompiledGrammar
): GrammarMapper {
	return new GrammarMapper(originalGrammar, compiledGrammar);
}
