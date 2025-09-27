import type { CompiledGrammar, PatternInfo, TokenizeResult } from "./types";
import type { TokenizerIntrospector } from "./introspector";

interface ProbeEntry {
	pos: number;
	state: number;
	stackPtr: number;
	ruleIdx: number;
}

declare const INTROSPECTION: boolean;

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
	let isInProbeState = probeMask ? !!probeMask[currentState] : !!(probeStates && probeStates.has(currentState));

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

				const isTargetProbeState = probeMask ? !!probeMask[targetState] : !!(probeStates && probeStates.has(targetState));

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
					probeEntry = {
						pos: pos,
						state: currentState,
						stackPtr: stackPtr,
						ruleIdx: charClass,
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

					// Advance by the matched pattern length or single char
					pos = newEnd;
				} else {
					// No token to emit
					// Only advance if we're not exiting (exit means re-process in parent state)
					if (stackOp !== 2) {
						pos += matchedLength || 1;
					}
				}

				// Handle state transitions
				if (stackOp === 1) {
					stateStack[stackPtr++] = currentState;
					const prevState = currentState;
					currentState = transition;

					// INTROSPECTION_START
					if (INTROSPECTION && introspector) {
						// Record the state push at the position where the match occurred
						// We need to be careful about when pos has been advanced
						// If a token was emitted, pos is now at newEnd
						// If no token was emitted, pos was incremented by matchedLength
						// We want the position where the character that triggered this transition is
						const transitionPos =
							!isInProbeState && tokenType !== 255
								? pos - (matchedLength || 1) // Token was emitted, pos is at end of token
								: pos - (matchedLength || 1); // No token, pos was still advanced
						introspector.pushedState({
							fromState: prevState,
							toState: currentState,
							stackPtr,
							pos: transitionPos,
						});
					}
					// INTROSPECTION_END
					// refresh caches
					stateBuckets = patterns && patterns.get(currentState);
					charMapBase = currentState << 7; // *128
					transBase3 = (currentState << 8) * 3; // *256*3
					nonAsciiState = nonAsciiChars && (nonAsciiChars as any).get(currentState);
				} else if (stackOp === 2) {
					// Check for token resolution on exit

					if (stackPtr > 0) {
						const prevState = currentState;
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
						// refresh caches
						stateBuckets = patterns ? patterns.get(currentState) : undefined;
						charMapBase = currentState << 7;
						transBase3 = (currentState << 8) * 3;
						nonAsciiState = nonAsciiChars && (nonAsciiChars as any).get(currentState);
					}
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
					charMapBase = currentState << 7;
					transBase3 = (currentState << 8) * 3;
					nonAsciiState = nonAsciiChars && (nonAsciiChars as any).get(currentState);
				}

				// Check if exiting probe state
				if (isInProbeState && !isTargetProbeState && probeEntry) {
					// Probe succeeded - reset to entry point and continue in new state
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
					}
					// INTROSPECTION_END
					probeEntry = null; // Clear probe entry
					// refresh caches again in case state changed
					stateBuckets = patterns && patterns.get(currentState);
					charMapBase = currentState << 7;
					transBase3 = (currentState << 8) * 3;
					nonAsciiState = nonAsciiChars && (nonAsciiChars as any).get(currentState);
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
					probeEntry = {
						pos: pos,
						state: currentState,
						stackPtr: stackPtr,
						ruleIdx: matchedRuleIdx,
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
					if (stackPtr > 0) {
						const prevState = currentState;
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
						// refresh caches
						stateBuckets = patterns ? patterns.get(currentState) : undefined;
						charMapBase = currentState * 128;
						transBase3 = currentState * 256 * 3;
					}
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
					if (stackPtr > 0) {
						const prevState = currentState;
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
						// refresh caches
						stateBuckets = patterns ? patterns.get(currentState) : undefined;
						charMapBase = currentState * 128;
						transBase3 = currentState * 256 * 3;
					}
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
