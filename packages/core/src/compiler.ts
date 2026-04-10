import type {
	Grammar,
	CompiledGrammar,
	PatternInfo,
	GrammarState,
	GrammarRule,
	Ruleset,
} from "./types";
import {
	ASCII,
	DIGIT,
	LETTER,
	LOWER,
	UPPER,
	ALNUM,
	SPACE,
	WORD,
	HEX,
	PRINT,
	PUNCT,
	CONTROL,
} from "./constants";

function cloneRules(rules: GrammarRule[] = []): GrammarRule[] {
	return rules.map((rule) => ({ ...rule }));
}

function toArray(value?: string | string[]): string[] {
	if (!value) {
		return [];
	}
	return Array.isArray(value) ? value : [value];
}

// Flatten a ruleset's include chain into a single ordered rule list (DFS, cycle-safe).
function flattenRulesets(
	rulesets: Record<string, Ruleset>,
	stateNames: Set<string>,
): Map<string, GrammarRule[]> {
	const result = new Map<string, GrammarRule[]>();
	const resolving: string[] = []; // ordered path for cycle reporting

	const resolveRuleset = (name: string): GrammarRule[] => {
		const cached = result.get(name);
		if (cached) return cached;

		if (resolving.includes(name)) {
			const cycleStart = resolving.indexOf(name);
			const cyclePath = [...resolving.slice(cycleStart), name].join(" → ");
			throw new Error(`rule sets form a cycle: ${cyclePath}`);
		}

		const ruleset = rulesets[name];
		if (!ruleset) {
			throw new Error(`unknown rule set "${name}"`);
		}

		resolving.push(name);
		const flat: GrammarRule[] = [];

		for (const includeName of toArray(ruleset.include)) {
			if (stateNames.has(includeName)) {
				throw new Error(
					`"${includeName}" refers to a tokeniser state; include accepts rule-set names only`,
				);
			}
			if (!rulesets[includeName]) {
				throw new Error(
					`unknown rule set "${includeName}" in rule set "${name}"`,
				);
			}
			flat.push(...resolveRuleset(includeName));
		}

		flat.push(...ruleset.rules);
		resolving.pop();
		result.set(name, flat);
		return flat;
	};

	for (const name of Object.keys(rulesets)) {
		resolveRuleset(name);
	}

	return result;
}

// Resolve `include` fields on states and rule sets into flat rule lists.
// Must be called before normalizeGrammar.
export function resolveIncludes(grammar: Grammar): Grammar {
	const hasRulesets =
		grammar.rulesets && Object.keys(grammar.rulesets).length > 0;
	const hasStateIncludes = Object.values(grammar.states).some(
		(s) => s.include,
	);
	if (!hasRulesets && !hasStateIncludes) return grammar;

	const stateNames = new Set(Object.keys(grammar.states));
	const flatRulesets = flattenRulesets(grammar.rulesets ?? {}, stateNames);

	// Track which ruleset names are actually referenced (for unused-ruleset warning)
	const referencedRulesets = new Set<string>();

	// Record references within ruleset includes
	for (const rs of Object.values(grammar.rulesets ?? {})) {
		for (const name of toArray(rs.include)) {
			referencedRulesets.add(name);
		}
	}

	const resolvedStates: Record<string, GrammarState> = {};

	for (const [stateName, state] of Object.entries(grammar.states)) {
		const includes = toArray(state.include);
		if (includes.length === 0) {
			resolvedStates[stateName] = state;
			continue;
		}

		const seen = new Set<string>();
		const effectiveRules: GrammarRule[] = [];

		for (const includeName of includes) {
			if (stateNames.has(includeName)) {
				throw new Error(
					`"${includeName}" refers to a tokeniser state; include accepts rule-set names only`,
				);
			}
			if (!flatRulesets.has(includeName)) {
				throw new Error(
					`unknown rule set "${includeName}" in include of state "${stateName}"`,
				);
			}
			if (seen.has(includeName)) {
				throw new Error(
					`duplicate include "${includeName}" in state "${stateName}"`,
				);
			}
			seen.add(includeName);
			referencedRulesets.add(includeName);
			effectiveRules.push(...(flatRulesets.get(includeName) as GrammarRule[]));
		}

		const ownRules = state.rules ?? [];

		// Dead rule detection: warn when a local rule's match pattern is already
		// claimed by an earlier included rule (simplified string-equality check).
		for (const ownRule of ownRules) {
			if (ownRule.match === undefined) continue;
			const ownMatch = JSON.stringify(ownRule.match);
			for (const includeName of includes) {
				const includedRules = flatRulesets.get(includeName) as GrammarRule[];
				for (const incRule of includedRules) {
					if (
						incRule.match !== undefined &&
						JSON.stringify(incRule.match) === ownMatch
					) {
						console.warn(
							`Grammar warning: rule in state "${stateName}" is shadowed by an earlier rule from included set "${includeName}"`,
						);
						break;
					}
				}
			}
		}

		effectiveRules.push(...ownRules);

		if (effectiveRules.length === 0) {
			throw new Error(
				`state "${stateName}" has no rules and no non-empty includes`,
			);
		}

		const { include, ...rest } = state;
		resolvedStates[stateName] = { ...rest, rules: effectiveRules };
	}

	// Warn about rulesets defined but never referenced
	for (const name of Object.keys(grammar.rulesets ?? {})) {
		if (!referencedRulesets.has(name)) {
			console.warn(`Grammar warning: rule set "${name}" is defined but never used`);
		}
	}

	const { rulesets, ...grammarRest } = grammar;
	return { ...grammarRest, states: resolvedStates };
}

// Expand group references and extend chains into concrete state definitions
export function normalizeGrammar(grammar: Grammar): Grammar {
	const hasGroups = Boolean(grammar.groups && Object.keys(grammar.groups).length);
	const hasExtends = Object.values(grammar.states).some((state) => state.extend);
	if (!hasGroups && !hasExtends) {
		return grammar;
	}

	const groupCache = new Map<string, GrammarState>();
	const resolving = new Set<string>();

	const resolveGroup = (groupName: string): GrammarState => {
		const cached = groupCache.get(groupName);
		if (cached) {
			return { ...cached, rules: cloneRules(cached.rules) };
		}

		const groups = grammar.groups || {};
		const group = groups[groupName];
		if (!group) {
			throw new Error(`Unknown grammar group "${groupName}"`);
		}

		if (resolving.has(groupName)) {
			throw new Error(`Circular grammar group dependency detected for "${groupName}"`);
		}
		resolving.add(groupName);

		let inheritedMode: GrammarState["mode"] | undefined;
		let inheritedFallback: string | undefined;
		const inheritedRules: GrammarRule[] = [];

		try {
			for (const parentName of toArray(group.extend)) {
				const parent = resolveGroup(parentName);
				inheritedRules.push(...parent.rules);
				if (inheritedMode === undefined && parent.mode !== undefined) {
					inheritedMode = parent.mode;
				}
				if (inheritedFallback === undefined && parent.fallback !== undefined) {
					inheritedFallback = parent.fallback;
				}
			}
		} finally {
			resolving.delete(groupName);
		}

		const groupRules = cloneRules(group.rules);
		const resolved: GrammarState = {
			rules: [...inheritedRules, ...groupRules],
			mode: group.mode ?? inheritedMode,
			fallback: group.fallback ?? inheritedFallback,
		};

		groupCache.set(groupName, {
			rules: cloneRules(resolved.rules),
			mode: resolved.mode,
			fallback: resolved.fallback,
		});

		return {
			rules: cloneRules(resolved.rules),
			mode: resolved.mode,
			fallback: resolved.fallback,
		};
	};

	const normalizedStates: Record<string, GrammarState> = {};

	for (const [stateName, originalState] of Object.entries(grammar.states)) {
		const extendsList = toArray(originalState.extend);
		const inheritedRules: GrammarRule[] = [];
		let inheritedMode: GrammarState["mode"] | undefined;
		let inheritedFallback: string | undefined;

		for (const groupName of extendsList) {
			const groupState = resolveGroup(groupName);
			inheritedRules.push(...groupState.rules);
			if (inheritedMode === undefined && groupState.mode !== undefined) {
				inheritedMode = groupState.mode;
			}
			if (inheritedFallback === undefined && groupState.fallback !== undefined) {
				inheritedFallback = groupState.fallback;
			}
		}

		const { extend, include, rules = [], ...rest } = originalState;
		const normalized: GrammarState = {
			...rest,
			rules: [...inheritedRules, ...cloneRules(rules)],
		};

		if (normalized.mode === undefined && inheritedMode !== undefined) {
			normalized.mode = inheritedMode;
		}
		if (normalized.fallback === undefined && inheritedFallback !== undefined) {
			normalized.fallback = inheritedFallback;
		}

		normalizedStates[stateName] = normalized;
	}

	return {
		name: grammar.name,
		states: normalizedStates,
		groups: grammar.groups,
	};
}

// Helper function to set character mapping
function setCharMapping(
	charMaps: Uint16Array,
	stateId: number,
	charCode: number,
	ruleIdx: number
): void {
	const index = stateId * 128 + charCode;
	// Always use the first rule that matches a character
	// This gives us predictable precedence
	if (charMaps[index] === 65535) {
		charMaps[index] = ruleIdx;
	}
}

// Preprocess grammar to expand match_within rules into states
function preprocessGrammar(grammar: Grammar): Grammar {
	const processedGrammar: Grammar = {
		name: grammar.name,
		states: { ...grammar.states },
		groups: grammar.groups,
	};
	
	// Track generated states
	const generatedStates: Record<string, GrammarState> = {};
	let stateCounter = 0;
	
	// Process each state
	for (const [stateName, state] of Object.entries(processedGrammar.states)) {
		const processedRules: GrammarRule[] = [];
		
		for (const rule of state.rules ?? []) {
			if (rule.match_within) {
				if ((rule.match_within as any).begin !== undefined) {
					throw new Error(
						`Grammar error in state "${stateName}" rule ${processedRules.length}: ` +
						`match_within uses "start" not "begin". ` +
						`Change { begin: "..." } to { start: "..." }.`
					);
				}
				// Generate a unique state name for the content matcher
				const contentStateName = `__match_within_${stateName}_${stateCounter++}`;
				
				// Replace match_within rule with a rule that enters the generated state
				processedRules.push({
					match: rule.match_within.start,
					token: rule.token,
					state: contentStateName
				});
				
				// Create the content state
				const contentRules: GrammarRule[] = [];
				
				// Add escape handling if specified
				if (rule.match_within.escape) {
					contentRules.push({
						match: rule.match_within.escape,
						token: rule.token,
						state: `${contentStateName}_escape`
					});
					
					// Create escape state that consumes one character and returns
					generatedStates[`${contentStateName}_escape`] = {
						rules: [
							{
								range: [0, 127],
								token: rule.token,
								exit: true
							}
						]
					};
				}
				
				// Add end delimiter rule
				contentRules.push({
					match: rule.match_within.end,
					token: rule.token,
					exit: true
				});
				
				// Add default rule to consume any other character
				// When multiline is false, exclude \n (charCode 10) so strings don't span lines
				const contentRange: [number, number] | [number, number][] =
					rule.match_within.multiline === false
						? [[0, 9], [11, 127]]
						: [0, 127];
				contentRules.push({
					range: contentRange,
					token: rule.token
				});
				
				generatedStates[contentStateName] = {
					rules: contentRules
				};
			} else {
				// Keep non-match_within rules as-is
				processedRules.push(rule);
			}
		}
		
		processedGrammar.states[stateName] = {
			...state,
			rules: processedRules
		};
	}
	
	// Add generated states to the grammar
	Object.assign(processedGrammar.states, generatedStates);
	
	return processedGrammar;
}

export function compile(grammar: Grammar): CompiledGrammar {
	const resolvedGrammar = resolveIncludes(grammar);
	const normalizedGrammar = normalizeGrammar(resolvedGrammar);
	// Preprocess grammar to expand match_within rules
	const processedGrammar = preprocessGrammar(normalizedGrammar);
	const stateNames = Object.keys(processedGrammar.states);
	const stateMap = new Map<string, number>();
	stateNames.forEach((name, idx) => stateMap.set(name, idx));

	// Map token names to sequential IDs
	const tokenTypeSet = new Set<string>();
	for (const stateName of stateNames) {
		const state = processedGrammar.states[stateName];
		(state.rules ?? []).forEach((rule) => {
			if (rule.token) {
				tokenTypeSet.add(rule.token);
			}
		});
	}
	const tokenTypes = Array.from(tokenTypeSet);
	const tokenTypeMap = new Map<string, number>();
	tokenTypes.forEach((type, idx) => tokenTypeMap.set(type, idx));

	if (stateNames.length > 65534) {
		throw new Error(
			`Grammar exceeds state limit: ${stateNames.length} states (max 65534, including states generated by match_within).`
		);
	}

	// Warn about exit:true in the root state — there is no parent to return to
	const rootStateName = stateNames[0];
	const rootState = processedGrammar.states[rootStateName];
	(rootState.rules ?? []).forEach((rule, ruleIdx) => {
		if (rule.exit && !rule.state) {
			console.warn(
				`Grammar warning: rule ${ruleIdx} in root state "${rootStateName}" ` +
				`has exit:true but there is no parent state to return to. ` +
				`This exit will be a no-op.`
			);
		}
	});

	// Pre-allocate transitions and character maps
	const maxRules = 256;
	const transitions = new Uint16Array(stateNames.length * maxRules * 3);
	transitions.fill(65535);

	// Initialize charMaps with 65535 (no rule)
	const charMaps = new Uint16Array(stateNames.length * 128);
	charMaps.fill(65535);

	const fallbackTransitions = new Uint16Array(stateNames.length * 3);
	fallbackTransitions.fill(65535);

    const keywords = new Map();
    const patterns = new Map(); // state → char → Array<{codes, length, ruleIdx}>
    const nonAsciiChars = new Map<number, Record<number, number>>(); // state → object map: charCode -> ruleIdx
    const boundaryRules = new Set<number>(); // Track rules that require boundary checking

	// Track which states are probe states based on state.mode property
	const probeStates = new Set<number>();
	// Track fallback states for probe states
	const probeFallbacks = new Map<number, number>();

	stateNames.forEach((stateName) => {
		const state = processedGrammar.states[stateName];
		const stateId = stateMap.get(stateName);
		if (stateId === undefined) {
			throw new Error(`State ${stateName} not found in stateMap`);
		}

		// Check if this state has mode: "probe"
		if (state.mode === "probe") {
			probeStates.add(stateId);
			// If probe state has a fallback, store it
			if (state.fallback) {
				const fallbackStateId = stateMap.get(state.fallback);
				if (fallbackStateId === undefined) {
					throw new Error(
						`Grammar "${grammar.name ?? "unnamed"}": probe state "${stateName}" fallback references unknown state "${state.fallback}"`,
					);
				}
				probeFallbacks.set(stateId, fallbackStateId);
			}
		}

		// Build per-state buckets for multi-char patterns
		const stateBuckets: (PatternInfo[] | null)[] = Array(128);
		for (let i = 0; i < 128; i++) stateBuckets[i] = null;

		state.rules.forEach((rule, ruleIdx) => {
			let nextState = 65535;
			let stackOp = 0;
			
			// Handle state transitions and exits
			if (rule.state && rule.exit) {
				// Sideways transition: exit current state and enter new state
				const sid = stateMap.get(rule.state);
				if (sid === undefined) {
					throw new Error(
						`Grammar "${grammar.name ?? "unnamed"}": state "${stateName}" rule ${ruleIdx} references unknown state "${rule.state}"`,
					);
				}
				nextState = sid;
				stackOp = 2; // Use exit operation, but with a target state
			} else if (rule.state) {
				// Regular push transition
				const sid = stateMap.get(rule.state);
				if (sid === undefined) {
					throw new Error(
						`Grammar "${grammar.name ?? "unnamed"}": state "${stateName}" rule ${ruleIdx} references unknown state "${rule.state}"`,
					);
				}
				nextState = sid;
				stackOp = 1;
			} else if (rule.exit) {
				// Regular pop/exit
				stackOp = 2;
			}

			let tokenType = 65535;
			if (rule.token) {
				const mappedType = tokenTypeMap.get(rule.token);
				if (mappedType !== undefined) {
					tokenType = mappedType;
				}
			}

			const tBase = ((stateId << 8) + ruleIdx) * 3; // Optimize multiplication
			transitions[tBase] = nextState;
			transitions[tBase + 1] = tokenType;
			transitions[tBase + 2] = stackOp;

			// Handle patterns with smart validation
			if (rule.match) {
				const matches = Array.isArray(rule.match) ? rule.match : [rule.match];
				for (const match of matches) {
					// Handle symbol constants
					if (match === ASCII) {
						// All ASCII characters (0-127)
						for (let i = 0; i < 128; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
					} else if (match === DIGIT) {
						// Digits 0-9
						for (let i = 48; i <= 57; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
					} else if (match === LETTER) {
						// Letters a-z, A-Z
						for (let i = 65; i <= 90; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
						for (let i = 97; i <= 122; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
					} else if (match === LOWER) {
						// Lowercase letters a-z
						for (let i = 97; i <= 122; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
					} else if (match === UPPER) {
						// Uppercase letters A-Z
						for (let i = 65; i <= 90; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
					} else if (match === ALNUM) {
						// Alphanumeric: a-z, A-Z, 0-9
						for (let i = 48; i <= 57; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
						for (let i = 65; i <= 90; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
						for (let i = 97; i <= 122; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
					} else if (match === SPACE) {
						// Whitespace: space, tab, newline, carriage return
						const spaces = [32, 9, 10, 13];
						for (const i of spaces) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
					} else if (match === WORD) {
						// Word characters: a-z, A-Z, 0-9, _
						for (let i = 48; i <= 57; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
						for (let i = 65; i <= 90; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
						for (let i = 97; i <= 122; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
						// underscore
						setCharMapping(charMaps, stateId, 95, ruleIdx);
					} else if (match === HEX) {
						// Hex digits: 0-9, a-f, A-F
						for (let i = 48; i <= 57; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
						for (let i = 65; i <= 70; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
						for (let i = 97; i <= 102; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
					} else if (match === PRINT) {
						// Printable ASCII: 32-126
						for (let i = 32; i <= 126; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
					} else if (match === PUNCT) {
						// ASCII punctuation
						const punctRanges = [
							[33, 47], // ! " # $ % & ' ( ) * + , - . /
							[58, 64], // : ; < = > ? @
							[91, 96], // [ \ ] ^ _ `
							[123, 126], // { | } ~
						];
						for (const [start, end] of punctRanges) {
							for (let i = start; i <= end; i++) {
								setCharMapping(charMaps, stateId, i, ruleIdx);
							}
						}
					} else if (match === CONTROL) {
						// Control characters: 0-31, 127
						for (let i = 0; i <= 31; i++) {
							setCharMapping(charMaps, stateId, i, ruleIdx);
						}
						setCharMapping(charMaps, stateId, 127, ruleIdx);
					} else if (typeof match === "string") {
						if (match.length === 1) {
							// Single character
							const code = match.charCodeAt(0);
							if (code < 128) {
								setCharMapping(charMaps, stateId, code, ruleIdx);
								// Track if this rule requires boundary checking
								if (rule.boundary) {
									boundaryRules.add(stateId * 256 + ruleIdx);
								}
							} else {
                            // Non-ASCII character
                            if (!nonAsciiChars.has(stateId)) {
                                nonAsciiChars.set(stateId, Object.create(null));
                            }
                            const stateNonAscii = nonAsciiChars.get(stateId)!;
                            if (stateNonAscii[code] !== undefined) {
                                throw new Error(
                                    `Grammar validation error in state "${stateName}": ` +
                                        `Multiple rules match non-ASCII character '${match}' (code: ${code}). ` +
                                        `Rule ${stateNonAscii[code]} and rule ${ruleIdx} both match this character.`
                                );
                            }
                            stateNonAscii[code] = ruleIdx;
                            // Track if this rule requires boundary checking
                            if (rule.boundary) {
                                boundaryRules.add(stateId * 256 + ruleIdx);
                            }
							}
						} else if (match.length > 1) {
							// Multi-character pattern
							const firstChar = match.charCodeAt(0);
							if (firstChar < 128) {
                        // Store pattern
                        const codes = new Uint16Array(match.length);
                        for (let i = 0; i < match.length; i++) {
                            codes[i] = match.charCodeAt(i);
                        }

                        const info: PatternInfo = {
                            codes,
                            length: match.length,
                            ruleIdx,
                            boundary: rule.boundary,
                        };

								// Add to the appropriate bucket
								if (!stateBuckets[firstChar]) {
									stateBuckets[firstChar] = [];
								}
								stateBuckets[firstChar]!.push(info);

								// For multi-char patterns, we don't set charMap
								// They are only matched through the pattern bucket mechanism
								// The charMap should only be set for single-character matches
							}
						}
					}
				}
			}

			// Handle ranges
			if (rule.range) {
				const ranges = Array.isArray(rule.range[0]) ? rule.range : [rule.range];

				for (const range of ranges as Array<
					[string | number, string | number]
				>) {
					const start =
						typeof range[0] === "string" ? range[0].charCodeAt(0) : range[0];
					const end =
						typeof range[1] === "string" ? range[1].charCodeAt(0) : range[1];

					for (let code = start; code <= end; code++) {
						if (code < 128) {
							setCharMapping(charMaps, stateId, code, ruleIdx);
                    } else {
                        if (!nonAsciiChars.has(stateId)) {
                            nonAsciiChars.set(stateId, Object.create(null));
                        }
                        const stateNonAscii = nonAsciiChars.get(stateId)!;
                        if (stateNonAscii[code] !== undefined) {
                            throw new Error(
                                `Grammar validation error in state "${stateName}": ` +
                                    `Multiple rules match character with code ${code} in range. ` +
                                    `Rule ${stateNonAscii[code]} and rule ${ruleIdx} both match this character.`
                            );
                        }
                        stateNonAscii[code] = ruleIdx;
                    }
					}
				}
			}

			// Handle 'any' for matching any character (fallback)
			if (rule.any) {
				// Mark all unmapped characters
				for (let c = 0; c < 128; c++) {
					if (charMaps[stateId * 128 + c] === 65535) {
						charMaps[stateId * 128 + c] = ruleIdx;
					}
				}
				const idx = stateId * 3;
				fallbackTransitions[idx] = nextState;
				fallbackTransitions[idx + 1] = tokenType;
				fallbackTransitions[idx + 2] = stackOp;
			}
		});

		// Sort each bucket by descending length to enable first-fit longest match
		let hasAny = false;
		for (let i = 0; i < 128; i++) {
			if (stateBuckets[i] && stateBuckets[i]!.length > 0) {
				stateBuckets[i]!.sort((a, b) => b.length - a.length);
				hasAny = true;
			}
		}
		if (hasAny) patterns.set(stateId, stateBuckets);
	});

// Build a compact probe mask for hot path lookup
const probeMask = new Uint8Array(stateNames.length);
probeStates.forEach((id) => {
    probeMask[id] = 1;
});

return {
		states: stateMap,
		transitions,
		charMaps,
		keywords,
		tokenTypes,
		patterns: patterns,
		fallbackTransitions,
		nonAsciiChars: nonAsciiChars,
		probeStates: probeStates,
		probeMask,
		probeFallbacks: probeFallbacks,
		boundaryRules: boundaryRules.size > 0 ? boundaryRules : undefined,
	};
}
