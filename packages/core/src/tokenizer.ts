import type { CompiledGrammar, PatternInfo, TokenizeResult } from "./types";
import type { TokenizerIntrospector } from "./introspector";

interface ProbeEntry {
	pos: number; // Original position for reset
	entryPos: number; // Position where probe was entered (after consuming match)
	state: number;
	stackPtr: number;
	ruleIdx: number;
	probeState?: number;
	resolvedState?: number;
	resolvedPos?: number;
}

declare const INTROSPECTION: boolean;

// Helper function to check if a character is an identifier continuation character
function isIdentifierChar(charCode: number): boolean {
	return (
		(charCode >= 97 && charCode <= 122) || // a-z
		(charCode >= 65 && charCode <= 90) || // A-Z
		(charCode >= 48 && charCode <= 57) || // 0-9
		charCode === 95 || // _
		charCode === 36 // $
	);
}

export function tokenize(
	input: string,
	compiledGrammar: CompiledGrammar,
	introspector: TokenizerIntrospector | null = null
): TokenizeResult {
	const {
		transitions,
		charMaps,
		tokenTypes,
		patterns,
		fallbackTransitions,
		nonAsciiChars,
		probeStates,
		probeMask,
		probeFallbacks,
		boundaryRules,
	} = compiledGrammar;

	const len = input.length;
	const tokens = new Uint32Array(len * 3);
	let tokenCount = 0;

	const stateStack = new Uint8Array(256);
	let stackPtr = 0;
	let currentState = 0;

	// Cache per-state hot references to avoid Map.get and multiplies per char
	let stateBuckets: (PatternInfo[] | null)[] | undefined =
		patterns && patterns.get(0);
	let charMapBase: number = 0; // currentState * 128
	let transBase3: number = 0; // (currentState * 256) * 3
	let nonAsciiState: Record<number, number> | undefined =
		nonAsciiChars && nonAsciiChars.get(0 as any);

	let pos = 0;
	let prevAdvancedPos = -1;

	// Track the last token for coalescing
	let lastTokenType: number = 255;
	let lastTokenEnd: number = -1;

	// Probe mode tracking
	let probeEntry: ProbeEntry | null = null;

	// Track failed probe attempts - use numeric key for performance
	// Key = (pos << 16) | (state << 8) | ruleIdx
	const failedProbes = new Set<number>();
	let hasFailedProbes = false;

	// INTROSPECTION_START
	if (INTROSPECTION && introspector) {
		introspector.init({
			input,
			compiledGrammar,
			initialState: currentState,
		});
	}
	// INTROSPECTION_END

	while (pos < len) {
		// If we advanced since last iteration, clear failed probe cache
		if (pos > prevAdvancedPos) {
			if (hasFailedProbes) {
				failedProbes.clear();
				hasFailedProbes = false;
			}
			prevAdvancedPos = pos;
		}
		const char = input.charCodeAt(pos);
		const startPos = pos;

		// Compute probe-state membership for this iteration
		let isInProbeState = probeMask
			? !!probeMask[currentState]
			: !!(probeStates && probeStates.has(currentState));

		// INTROSPECTION_START
		if (INTROSPECTION && introspector) {
			introspector.beforeChar({
				pos,
				char,
				charStr: String.fromCharCode(char),
				currentState,
				stackPtr,
				stateStack: stateStack.slice(0, stackPtr),
				probeMode: isInProbeState,
			});
			if (stackPtr > 100) {
				pos = len;
				continue;
			}
		}
		// INTROSPECTION_END

		if (char < 128) {
			// Check bucketed multi-character patterns first
			let matchedLength: number = 0;
			let matchedRuleIdx: number = 255;
			// Early bail if no patterns for this state
			// Inline bucket check for hot path
			if (stateBuckets) {
				const bucket = stateBuckets[char];
				if (bucket) {
					const bucketLength = bucket.length;
					for (let b = 0; b < bucketLength; b++) {
						const pat = bucket[b];
						const pLen = pat.length;
						if (pos + pLen > len) continue;
						// We know first char matches; unroll first iteration
						const codes = pat.codes;
						let matched = true;
						for (let i = 1; i < pLen; i++) {
							if (input.charCodeAt(pos + i) !== codes[i]) {
								matched = false;
								break;
							}
						}
						if (matched) {
							// Check boundary if required
							if (pat.boundary && pos + pLen < len) {
								const nextChar = input.charCodeAt(pos + pLen);
								if (isIdentifierChar(nextChar)) {
									// Boundary check failed - pattern requires word boundary but next char is identifier char
									continue; // Skip this pattern and try next one
								}
							}

							// Check if this rule has failed before (only if we have failed probes)
							if (hasFailedProbes) {
								const testKey = (pos << 16) | (currentState << 8) | pat.ruleIdx;
								if (failedProbes.has(testKey)) {
									// INTROSPECTION_START
									if (INTROSPECTION && introspector) {
										introspector.skippedFailedProbe({
											pattern: pat,
											testKey,
										});
									}
									// INTROSPECTION_END
									continue; // Skip this pattern and try next one
								}
							}
							matchedLength = pLen;
							matchedRuleIdx = pat.ruleIdx;
							break; // buckets sorted by length desc → first fit is longest
						}
					}
				}
			}

			// Directly use matched rule or lookup char map
			let charClass = matchedRuleIdx;
			if (charClass === 255) {
				charClass = charMaps[charMapBase + char];
			}

			if (charClass !== 255) {
				// Check boundary for single-character matches if required
				if (
					matchedRuleIdx === 255 &&
					boundaryRules &&
					boundaryRules.has(currentState * 256 + charClass)
				) {
					// This is a single-char match that requires boundary checking
					if (pos + 1 < len) {
						const nextChar = input.charCodeAt(pos + 1);
						if (isIdentifierChar(nextChar)) {
							// Boundary check failed - skip this match
							charClass = 255;
						}
					}
				}
			}

			if (charClass !== 255) {
				const tBase = transBase3 + charClass * 3;
				const transition = transitions[tBase];
				const tokenType = transitions[tBase + 1];
				const stackOp = transitions[tBase + 2];

				// Determine target state
				let targetState = currentState;
				if (stackOp === 1 && transition !== 255) {
					targetState = transition;
				} else if (stackOp === 2 && stackPtr > 0) {
					targetState = stateStack[stackPtr - 1];
				} else if (transition !== 255) {
					targetState = transition;
				}

				const isTargetProbeState = probeMask
					? !!probeMask[targetState]
					: !!(probeStates && probeStates.has(targetState));

				if (isInProbeState && probeEntry && !isTargetProbeState) {
					probeEntry.resolvedState = targetState;
					probeEntry.resolvedPos = pos;
				}

				// INTROSPECTION_START
				if (INTROSPECTION && introspector) {
					introspector.matchedRule({
						charClass,
						matchedLength,
						transition,
						tokenType,
						stackOp,
						currentState,
						probeMode: isInProbeState,
						pos,
					});
				}
				// INTROSPECTION_END

				// Handle probe state entry
				if (!isInProbeState && isTargetProbeState) {
					// Save the position where we'll be after consuming the matched text
					// This is where the probe state will be entered
					const probeEntryPos = pos + (matchedLength || 1);
					probeEntry = {
						pos: pos, // Keep original pos for reset
						entryPos: probeEntryPos, // Position where probe is entered
						state: currentState,
						stackPtr: stackPtr,
						ruleIdx: charClass,
						probeState: targetState, // Save the probe state we're entering
					};
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.enterProbeMode({
							pos,
							currentState,
							stackPtr,
							charClass,
						});
					}
					// INTROSPECTION_END
				}

				// Emit token only if not in probe state
				if (!isInProbeState && tokenType !== 255) {
					const newEnd = pos + (matchedLength || 1);
					if (tokenType === lastTokenType && pos === lastTokenEnd) {
						// Extend previous token
						tokens[(tokenCount - 1) * 3 + 2] = newEnd;
						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.extendedToken({
								tokenType,
								oldEnd: lastTokenEnd,
								newEnd,
								tokenIndex: tokenCount - 1,
							});
						}
						// INTROSPECTION_END
					} else {
						// Emit new token
						const outIdx = tokenCount * 3;
						tokens[outIdx] = tokenType;
						tokens[outIdx + 1] = pos;
						tokens[outIdx + 2] = newEnd;
						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.emittedToken({
								tokenType,
								tokenName: tokenTypes[tokenType],
								start: pos,
								end: newEnd,
								text: input.substring(pos, newEnd),
								tokenIndex: tokenCount,
							});
						}
						// INTROSPECTION_END
						tokenCount++;
					}
					lastTokenType = tokenType;
					lastTokenEnd = newEnd;

					// Advance position
					// For sideways transitions (exit with state), always advance
					// For regular exits, advance (the token was consumed)
					pos = newEnd;
				} else {
					// No token to emit
					// For sideways transitions (exit with state), only advance if we matched a pattern
					// For regular exits (pop to parent), don't advance (re-process in parent)
					// For any: true rules with sideways transition, matchedLength is 0, so don't advance
					if (stackOp !== 2) {
						// Not an exit - advance by matched length
						pos += matchedLength || 1;
					} else if (stackOp === 2 && transition !== 255 && matchedLength > 0) {
						// Sideways transition with an explicit pattern match - advance by pattern length
						pos += matchedLength;
					}
					// Otherwise: exit without transition (pop), or sideways with no pattern match - don't advance
				}

				// Handle state transitions
				if (stackOp === 1) {
					stateStack[stackPtr++] = currentState;
					const prevState = currentState;
					currentState = transition;

					if (isInProbeState && probeEntry) {
						probeEntry.resolvedState = currentState;
						probeEntry.resolvedPos = pos;
					}

					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						// Record the state push only if not in probe mode
						// If in probe mode, it will be recorded when probe exits
						if (!isInProbeState) {
							// The entry position for the new state should be after the character that triggered the push
							// pos has already been advanced by matchedLength or to newEnd if a token was emitted
							introspector.pushedState({
								fromState: prevState,
								toState: currentState,
								stackPtr,
								pos: pos, // This is already the position after the matched character
							});
						}
					}
					// INTROSPECTION_END
					// refresh caches
					stateBuckets = patterns && patterns.get(currentState);
					charMapBase = currentState << 7; // *128
					transBase3 = (currentState << 8) * 3; // *256*3
					nonAsciiState =
						nonAsciiChars && (nonAsciiChars as any).get(currentState);
				} else if (stackOp === 2) {
					// Exit operation - either pop to parent or sideways transition
					const prevState = currentState;

					if (transition !== 255) {
						// Sideways transition: exit current state and enter new sibling state
						// The stack depth remains the same
						currentState = transition;
						const transitionPos =
							isInProbeState && probeEntry?.resolvedPos !== undefined
								? probeEntry.resolvedPos
								: pos;

						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							// Report as a transition, not a pop, since stack depth doesn't change
							introspector.transitionedState({
								fromState: prevState,
								toState: currentState,
								pos: transitionPos,
							});
						}
						// INTROSPECTION_END
					} else if (stackPtr > 0) {
						// Regular exit: pop from stack to parent state
						currentState = stateStack[--stackPtr];

						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.poppedState({
								fromState: prevState,
								toState: currentState,
								stackPtr,
								pos,
							});
						}
						// INTROSPECTION_END
					} else {
						// Can't pop from empty stack - stay in current state
						// This shouldn't normally happen in well-formed grammars
					}

					// refresh caches
					stateBuckets = patterns ? patterns.get(currentState) : undefined;
					charMapBase = currentState << 7;
					transBase3 = (currentState << 8) * 3;
					nonAsciiState =
						nonAsciiChars && (nonAsciiChars as any).get(currentState);
				} else if (transition !== 255) {
					const prevState = currentState;
					currentState = transition;
					const transitionPos =
						isInProbeState && probeEntry?.resolvedPos !== undefined
							? probeEntry.resolvedPos
							: pos;
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.transitionedState({
							fromState: prevState,
							toState: currentState,
							pos: transitionPos,
						});
					}
					// INTROSPECTION_END
					// refresh caches
					stateBuckets = patterns && patterns.get(currentState);
					charMapBase = currentState << 7;
					transBase3 = (currentState << 8) * 3;
					nonAsciiState =
						nonAsciiChars && (nonAsciiChars as any).get(currentState);
				}

				// Check if exiting probe state
				if (isInProbeState && !isTargetProbeState && probeEntry) {
					// Probe succeeded - reset to entry point and continue in new state
					const probeState = currentState; // Save the probe state we're exiting from
					pos = probeEntry.pos;
					// The current state is now the target state we transitioned to
					// Don't restore the old state - we want to continue in the new state
					stackPtr = probeEntry.stackPtr;
					// If the successful transition was a push, we need to handle it
					if (stackOp === 1) {
						// Push the saved entry state onto stack
						stateStack[stackPtr++] = probeEntry.state;
					}
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.exitProbeMode({
							success: true,
							resetPos: probeEntry.pos,
							currentState,
							pos: probeEntry.pos,
						});
						// Record the push that happened inside probe mode, now with correct depth
						if (stackOp === 1 && probeEntry.resolvedState) {
							introspector.pushedState({
								fromState: probeEntry.probeState ?? probeEntry.state,
								toState: probeEntry.resolvedState,
								stackPtr,
								pos: probeEntry.resolvedPos ?? probeEntry.pos,
							});
						}
					}
					// INTROSPECTION_END
					probeEntry = null; // Clear probe entry
					// refresh caches again in case state changed
					stateBuckets = patterns && patterns.get(currentState);
					charMapBase = currentState << 7;
					transBase3 = (currentState << 8) * 3;
					nonAsciiState =
						nonAsciiChars && (nonAsciiChars as any).get(currentState);
				}

				// Check if we've reached the end while in probe mode
				// This needs to be after state transition so currentState is updated
				if (
					probeStates &&
					probeStates.has(currentState) &&
					pos >= len &&
					probeEntry
				) {
					// Check if this probe state has a fallback
					const fallbackState = probeFallbacks?.get(currentState);
					if (fallbackState !== undefined) {
						// Transition to fallback state and exit probe mode
						// Reset position to where probe started
						pos = probeEntry.pos;
						// Push the state where probe was initiated so we can return to it
						stateStack[probeEntry.stackPtr] = probeEntry.state;
						stackPtr = probeEntry.stackPtr + 1;

						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							// Record the transition to fallback state
							// Use the probe entry position (where we entered the probe)
							introspector.pushedState({
								fromState: probeEntry.state,
								toState: fallbackState,
								stackPtr,
								pos: probeEntry.entryPos,
							});
						}
						// INTROSPECTION_END

						currentState = fallbackState;
						probeEntry = null;

						// Update caches for new state
						stateBuckets = patterns && patterns.get(currentState);
						charMapBase = currentState * 128;
						transBase3 = currentState * 256 * 3;

						// Continue from the beginning of the while loop
						continue;
					} else {
						// No fallback - probe failed, mark and reset
						const key =
							(probeEntry.pos << 16) |
							(probeEntry.state << 8) |
							probeEntry.ruleIdx;
						failedProbes.add(key);
						hasFailedProbes = true;
						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.probeFailed({
								key,
								reason: "reached_end",
								probeEntry,
							});
						}
						// INTROSPECTION_END

						// Reset to entry point
						pos = probeEntry.pos;
						currentState = probeEntry.state;
						stackPtr = probeEntry.stackPtr;
						probeEntry = null;

						// Update caches
						stateBuckets = patterns && patterns.get(currentState);
						charMapBase = currentState * 128;
						transBase3 = currentState * 256 * 3;

						// Continue from the beginning of the while loop
						continue;
					}
				}
			} else {
				// No match found
				if (isInProbeState && probeEntry) {
					// In probe mode, skip the non-matching character and continue scanning
					// Probe mode should skip characters until it finds a disambiguating match
					pos++;
					// If we reached end while probing, resolve via fallback or mark failure
					if (pos >= len) {
						const fallbackState = probeFallbacks?.get(currentState);
						if (fallbackState !== undefined) {
							// Transition to fallback state and exit probe mode
							pos = probeEntry.pos;
							stateStack[probeEntry.stackPtr] = probeEntry.state;
							stackPtr = probeEntry.stackPtr + 1;

							// INTROSPECTION_START
							if (INTROSPECTION && introspector) {
								// Record the transition to fallback state
								// Use the probe entry position (where we entered the probe)
								introspector.pushedState({
									fromState: probeEntry.state,
									toState: fallbackState,
									stackPtr,
									pos: probeEntry.entryPos,
								});
							}
							// INTROSPECTION_END

							currentState = fallbackState;
							probeEntry = null;

							// Update caches for new state
							stateBuckets = patterns && patterns.get(currentState);
							charMapBase = currentState * 128;
							transBase3 = currentState * 256 * 3;

							continue;
						} else {
							// No fallback - probe failed, mark and reset
							const key =
								(probeEntry.pos << 16) |
								(probeEntry.state << 8) |
								probeEntry.ruleIdx;
							failedProbes.add(key);
							hasFailedProbes = true;

							// Reset to entry point
							pos = probeEntry.pos;
							currentState = probeEntry.state;
							stackPtr = probeEntry.stackPtr;
							probeEntry = null;

							// Update caches
							stateBuckets = patterns && patterns.get(currentState);
							charMapBase = currentState * 128;
							transBase3 = currentState * 256 * 3;

							continue;
						}
					}
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						// introspector.skippedCharInProbe({
						// 	char: input[pos - 1],
						// 	pos: pos - 1,
						// 	currentState,
						// });
					}
					// INTROSPECTION_END
				} else {
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.noMatch({
							char,
							charStr: String.fromCharCode(char),
							pos,
							currentState,
						});
					}
					// INTROSPECTION_END
					pos++;
				}
			}
		} else {
			// Handle non-ASCII characters (>= 128)
			// First check if there's a specific match for this character
			let matchedRuleIdx = 255;
			// Early bail if no non-ASCII mappings exist at all
			if (nonAsciiState) {
				const v = (nonAsciiState as any)[char];
				if (v !== undefined) matchedRuleIdx = v as number;
			}

			if (matchedRuleIdx !== 255) {
				// Found a specific match for this non-ASCII character
				const tBase = transBase3 + matchedRuleIdx * 3;
				const transition = transitions[tBase];
				const tokenType = transitions[tBase + 1];
				const stackOp = transitions[tBase + 2];

				// Determine target state
				let targetState = currentState;
				if (stackOp === 1 && transition !== 255) {
					targetState = transition;
				} else if (stackOp === 2 && stackPtr > 0) {
					targetState = stateStack[stackPtr - 1];
				} else if (transition !== 255) {
					targetState = transition;
				}

				const isTargetProbeState = probeMask
					? !!probeMask[targetState]
					: !!(probeStates && probeStates.has(targetState));

				// INTROSPECTION_START
				if (INTROSPECTION && introspector) {
					introspector.nonAsciiMatch({
						char,
						tokenType,
						pos,
						currentState,
					});
				}
				// INTROSPECTION_END

				// Handle probe state entry
				if (!isInProbeState && isTargetProbeState) {
					// Calculate where we'll be after consuming the match
					const probeEntryPos = pos + (matchedLength || 1);
					probeEntry = {
						pos: pos, // Keep original pos for reset
						entryPos: probeEntryPos, // Position where probe is entered
						state: currentState,
						stackPtr: stackPtr,
						ruleIdx: matchedRuleIdx,
						probeState: targetState,
					};
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.enterProbeMode({
							charClass: matchedRuleIdx,
							pos,
							currentState,
							stackPtr,
						});
					}
					// INTROSPECTION_END
				}

				// Emit token only if not in probe state
				if (!isInProbeState && tokenType !== 255) {
					const newEnd = pos + 1;
					if (tokenType === lastTokenType && startPos === lastTokenEnd) {
						// Extend previous token
						tokens[(tokenCount - 1) * 3 + 2] = newEnd;
						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.extendedToken({
								tokenType,
								oldEnd: lastTokenEnd,
								newEnd,
								tokenIndex: tokenCount - 1,
							});
						}
						// INTROSPECTION_END
					} else {
						// Emit new token
						const outIdx = tokenCount * 3;
						tokens[outIdx] = tokenType;
						tokens[outIdx + 1] = pos;
						tokens[outIdx + 2] = newEnd;
						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.emittedToken({
								tokenType,
								tokenName: tokenTypes[tokenType],
								start: pos,
								end: newEnd,
								text: input.substring(pos, newEnd),
								tokenIndex: tokenCount,
								isNonAscii: true,
							});
						}
						// INTROSPECTION_END
						tokenCount++;
					}
					lastTokenType = tokenType;
					lastTokenEnd = newEnd;
					pos = newEnd;
				} else {
					// No token emitted - apply same logic as ASCII path
					// For sideways transitions with no pattern match (any: true), don't advance
					if (stackOp !== 2) {
						pos++;
					} else if (stackOp === 2 && transition !== 255) {
						// Sideways transition - don't advance to let new state process the character
					}
					// Otherwise: regular exit (pop) - don't advance
				}

				// Handle state transitions (same as ASCII path)
				if (stackOp === 1) {
					stateStack[stackPtr++] = currentState;
					const prevState = currentState;
					currentState = transition;

					if (isInProbeState && probeEntry) {
						probeEntry.resolvedState = currentState;
						probeEntry.resolvedPos = pos;
					}

					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						if (!isInProbeState) {
							introspector.pushedState({
								fromState: prevState,
								toState: currentState,
								stackPtr,
								pos,
							});
						}
					}
					// INTROSPECTION_END
					// refresh caches
					stateBuckets = patterns && patterns.get(currentState);
					charMapBase = currentState * 128;
					transBase3 = currentState * 256 * 3;
				} else if (stackOp === 2) {
					// Exit operation - either pop to parent or sideways transition
					const prevState = currentState;

					if (transition !== 255) {
						// Sideways transition: exit current state and enter new sibling state
						// The stack depth remains the same
						currentState = transition;
						const transitionPos =
							isInProbeState && probeEntry?.resolvedPos !== undefined
								? probeEntry.resolvedPos
								: pos;

						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							// Report as a transition, not a pop, since stack depth doesn't change
							introspector.transitionedState({
								fromState: prevState,
								toState: currentState,
								pos: transitionPos,
							});
						}
						// INTROSPECTION_END
					} else if (stackPtr > 0) {
						// Regular exit: pop from stack to parent state
						currentState = stateStack[--stackPtr];

						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.poppedState({
								fromState: prevState,
								toState: currentState,
								stackPtr,
								pos,
							});
						}
						// INTROSPECTION_END
					} else {
						// Can't pop from empty stack - stay in current state
						// This shouldn't normally happen in well-formed grammars
					}

					// refresh caches
					stateBuckets = patterns ? patterns.get(currentState) : undefined;
					charMapBase = currentState * 128;
					transBase3 = currentState * 256 * 3;
				} else if (transition !== 255) {
					const prevState = currentState;
					currentState = transition;
					const transitionPos =
						isInProbeState && probeEntry?.resolvedPos !== undefined
							? probeEntry.resolvedPos
							: pos;
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.transitionedState({
							fromState: prevState,
							toState: currentState,
							pos: transitionPos,
						});
					}
					// INTROSPECTION_END
					// refresh caches
					stateBuckets = patterns && patterns.get(currentState);
					charMapBase = currentState * 128;
					transBase3 = currentState * 256 * 3;
				}

				// Check if exiting probe state
				if (isInProbeState && !isTargetProbeState && probeEntry) {
					pos = probeEntry.pos;
					stackPtr = probeEntry.stackPtr;
					if (stackOp === 1) {
						stateStack[stackPtr++] = probeEntry.state;
					}
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.exitProbeMode({
							success: true,
							resetPos: probeEntry.pos,
							currentState,
							pos: probeEntry.pos,
						});
						if (stackOp === 1 && probeEntry.resolvedState) {
							introspector.pushedState({
								fromState: probeEntry.probeState ?? probeEntry.state,
								toState: probeEntry.resolvedState,
								stackPtr,
								pos: probeEntry.resolvedPos ?? probeEntry.pos,
							});
						}
					}
					// INTROSPECTION_END
					probeEntry = null;
				}
			} else if (fallbackTransitions) {
				// No specific match, use fallback transitions
				const idx = currentState * 3;
				const transition = fallbackTransitions[idx];
				const tokenType = fallbackTransitions[idx + 1];
				const stackOp = fallbackTransitions[idx + 2];

				// INTROSPECTION_START
				if (INTROSPECTION && introspector) {
					introspector.fallbackMatch({
						tokenType,
						pos,
						currentState,
					});
				}
				// INTROSPECTION_END

				// Emit token only if not in probe state
				if (!isInProbeState && tokenType !== 255) {
					const newEnd = pos + 1;
					if (tokenType === lastTokenType && startPos === lastTokenEnd) {
						// Extend previous token
						tokens[(tokenCount - 1) * 3 + 2] = newEnd;
						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.extendedToken({
								tokenType,
								oldEnd: lastTokenEnd,
								newEnd,
								tokenIndex: tokenCount - 1,
							});
						}
						// INTROSPECTION_END
					} else {
						// Emit new token
						const outIdx = tokenCount * 3;
						tokens[outIdx] = tokenType;
						tokens[outIdx + 1] = pos;
						tokens[outIdx + 2] = newEnd;
						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.emittedToken({
								tokenType,
								tokenName: tokenTypes[tokenType],
								start: pos,
								end: newEnd,
								text: input.substring(pos, newEnd),
								tokenIndex: tokenCount,
								isFallback: true,
								isNonAscii: true,
							});
						}
						// INTROSPECTION_END
						tokenCount++;
					}
					lastTokenType = tokenType;
					lastTokenEnd = newEnd;
					pos = newEnd;
				} else {
					pos++;
				}

				// Handle state transitions (same as ASCII path)
				if (stackOp === 1) {
					stateStack[stackPtr++] = currentState;
					const prevState = currentState;
					currentState = transition;

					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.pushedState({
							fromState: prevState,
							toState: currentState,
							stackPtr,
							pos,
						});
					}
					// INTROSPECTION_END
					// refresh caches
					stateBuckets = patterns && patterns.get(currentState);
					charMapBase = currentState * 128;
					transBase3 = currentState * 256 * 3;
				} else if (stackOp === 2) {
					// Exit operation - either pop to parent or sideways transition
					const prevState = currentState;

					if (transition !== 255) {
						// Sideways transition: exit current state and enter new sibling state
						// The stack depth remains the same
						currentState = transition;

						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							// Report as a transition, not a pop, since stack depth doesn't change
							introspector.transitionedState({
								fromState: prevState,
								toState: currentState,
								pos,
							});
						}
						// INTROSPECTION_END
					} else if (stackPtr > 0) {
						// Regular exit: pop from stack to parent state
						currentState = stateStack[--stackPtr];

						// INTROSPECTION_START
						if (INTROSPECTION && introspector) {
							introspector.poppedState({
								fromState: prevState,
								toState: currentState,
								stackPtr,
								pos,
							});
						}
						// INTROSPECTION_END
					} else {
						// Can't pop from empty stack - stay in current state
						// This shouldn't normally happen in well-formed grammars
					}

					// refresh caches
					stateBuckets = patterns ? patterns.get(currentState) : undefined;
					charMapBase = currentState * 128;
					transBase3 = currentState * 256 * 3;
				} else if (transition !== 255) {
					const prevState = currentState;
					currentState = transition;
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.transitionedState({
							fromState: prevState,
							toState: currentState,
							pos,
						});
					}
					// INTROSPECTION_END
					// refresh caches
					stateBuckets = patterns && patterns.get(currentState);
					charMapBase = currentState * 128;
					transBase3 = currentState * 256 * 3;
				}
			} else {
				// No match found
				if (isInProbeState && probeEntry) {
					// In probe mode, skip the non-matching character and continue scanning
					// Probe mode should skip characters until it finds a disambiguating match
					pos++;
					// If end reached during probe, resolve fallback or reset
					if (pos >= len) {
						const fallbackState = probeFallbacks?.get(currentState);
						if (fallbackState !== undefined) {
							pos = probeEntry.pos;
							stateStack[probeEntry.stackPtr] = probeEntry.state;
							stackPtr = probeEntry.stackPtr + 1;

							// INTROSPECTION_START
							if (INTROSPECTION && introspector) {
								// Record the transition to fallback state
								// Use the probe entry position (where we entered the probe)
								introspector.pushedState({
									fromState: probeEntry.state,
									toState: fallbackState,
									stackPtr,
									pos: probeEntry.entryPos,
								});
							}
							// INTROSPECTION_END

							currentState = fallbackState;
							probeEntry = null;

							// Update caches for new state
							stateBuckets = patterns && patterns.get(currentState);
							charMapBase = currentState * 128;
							transBase3 = currentState * 256 * 3;

							continue;
						} else {
							const key =
								(probeEntry.pos << 16) |
								(probeEntry.state << 8) |
								probeEntry.ruleIdx;
							failedProbes.add(key);
							hasFailedProbes = true;

							pos = probeEntry.pos;
							currentState = probeEntry.state;
							stackPtr = probeEntry.stackPtr;
							probeEntry = null;

							stateBuckets = patterns && patterns.get(currentState);
							charMapBase = currentState * 128;
							transBase3 = currentState * 256 * 3;

							continue;
						}
					}
					// INTROSPECTION_START
					// if (INTROSPECTION && introspector) {
					// 	introspector.skippedCharInProbe({
					// 		char: input[pos - 1],
					// 		pos: pos - 1,
					// 		currentState,
					// 	});
					// }
					// INTROSPECTION_END
				} else {
					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						introspector.noMatch({
							char,
							charStr: String.fromCharCode(char),
							pos,
							currentState,
							isNonAscii: true,
						});
					}
					// INTROSPECTION_END
					pos++;
				}
			}
		}
	}

	// INTROSPECTION_START
	if (INTROSPECTION && introspector) {
		introspector.complete({
			tokenCount,
			finalState: currentState,
			finalStackPtr: stackPtr,
		});
	}
	// INTROSPECTION_END

	return {
		tokens: tokens.subarray(0, tokenCount * 3),
		tokenTypes: tokenTypes,
	};
}
