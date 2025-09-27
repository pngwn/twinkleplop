import { bench, describe } from "vitest";
import { compile } from "@twinkleplop/core/compile";
import { tokenize } from "@twinkleplop/core";

// Real-world CSS test case
const cssGrammar = {
	name: "css",
	states: {
		main: {
			mode: "normal",
			rules: [
				{ match: ".", token: "class" },
				{ match: "#", token: "id" },
				{ match: "@", token: "at-rule" },
				{ match: ["{", "}", ":", ";", "(", ")", ","], token: "punctuation" },
				{ match: [" ", "\n", "\t", "\r"], token: "whitespace" },
				{ match: ["//"], token: "comment", state: "line_comment" },
				{ match: "/*", state: "block_comment" },
				{ match: '"', state: "string_double" },
				{ match: "'", state: "string_single" },
				{ match: "-", token: "dash" },
				{ match: "%", token: "percent" },
				{ match: "!", token: "important" },
				{ range: [["a", "z"], ["A", "Z"]], token: "identifier" },
				{ range: ["0", "9"], token: "number" },
			]
		},
		line_comment: {
			mode: "normal",
			rules: [
				{ match: "\n", exit: true, token: "comment" },
				{ any: true, token: "comment" },
			]
		},
		block_comment: {
			mode: "normal",
			rules: [
				{ match: "*/", exit: true, token: "comment" },
				{ any: true, token: "comment" },
			]
		},
		string_double: {
			mode: "normal",
			rules: [
				{ match: '"', exit: true, token: "string" },
				{ match: "\\", state: "escape_double" },
				{ any: true, token: "string" },
			]
		},
		string_single: {
			mode: "normal",
			rules: [
				{ match: "'", exit: true, token: "string" },
				{ match: "\\", state: "escape_single" },
				{ any: true, token: "string" },
			]
		},
		escape_double: {
			mode: "normal",
			rules: [
				{ any: true, exit: true, token: "string" },
			]
		},
		escape_single: {
			mode: "normal",
			rules: [
				{ any: true, exit: true, token: "string" },
			]
		}
	}
};

// Test input with various CSS constructs
const cssCode = `
/* Reset styles */
* {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
}

.container {
	display: flex;
	flex-direction: column;
	max-width: 1200px;
	margin: 0 auto;
	padding: 2rem;
}

.button {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	padding: 0.75rem 1.5rem;
	border: none;
	border-radius: 0.5rem;
	font-size: 1rem;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.3s ease;
}

.button:hover {
	transform: translateY(-2px);
	box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
	.container {
		padding: 1rem;
	}
	
	.button {
		width: 100%;
	}
}

/* Comments with special chars: // not a line comment */
#header {
	position: sticky;
	top: 0;
	z-index: 100;
	background: rgba(255, 255, 255, 0.95);
}

.nav-link[aria-current="page"] {
	color: #667eea;
	font-weight: bold;
}
`;

const compiled = compile(cssGrammar);

// Create a version with manual inlining for comparison
function tokenizeWithInlining(input, grammar) {
	const {
		transitions,
		charMaps,
		tokenTypes,
		patterns,
		fallbackTransitions,
		nonAsciiChars,
		probeStates,
		alternativeRules,
	} = grammar;

	const len = input.length;
	const tokens = new Uint32Array(len * 3);
	let tokenCount = 0;
	
	const stateStack = new Uint16Array(32);
	let stackPtr = 0;
	let currentState = 0;
	let pos = 0;
	
	let lastTokenType = 255;
	let lastTokenEnd = -1;
	
	const failedProbes = new Set();
	let probeEntry = null;
	
	// Inline these lookups
	let stateBuckets = patterns ? patterns.get(currentState) : undefined;
	let charMapBase = currentState * 128;
	let transBase3 = currentState * 256 * 3;
	
	while (pos < len) {
		const char = input.charCodeAt(pos);
		
		// INLINED: isInProbeState check
		const isInProbeState = probeStates ? probeStates.has(currentState) : false;
		
		if (char < 128) {
			let matchedLength = 0;
			let matchedRuleIdx = 255;
			
			// INLINED: bucket check
			if (stateBuckets) {
				const bucket = stateBuckets[char];
				if (bucket) {
					const bucketLength = bucket.length;
					for (let b = 0; b < bucketLength; b++) {
						const pat = bucket[b];
						const pLen = pat.length;
						if (pos + pLen > len) continue;
						
						const codes = pat.codes;
						let matched = true;
						for (let i = 1; i < pLen; i++) {
							if (input.charCodeAt(pos + i) !== codes[i]) {
								matched = false;
								break;
							}
						}
						if (matched) {
							const testKey = (pos << 16) | (currentState << 8) | pat.ruleIdx;
							if (failedProbes.has(testKey)) continue;
							matchedLength = pLen;
							matchedRuleIdx = pat.ruleIdx;
							break;
						}
					}
				}
			}
			
			// INLINED: charClass lookup
			let charClass = matchedRuleIdx !== 255 ? matchedRuleIdx : charMaps[charMapBase + char];
			
			if (charClass !== 255) {
				// INLINED: transition lookup
				const tBase = transBase3 + charClass * 3;
				const transition = transitions[tBase];
				const tokenType = transitions[tBase + 1];
				const stackOp = transitions[tBase + 2];
				
				// INLINED: target state determination
				const targetState = transition !== 255 ? transition : 
					(stackOp === 2 && stackPtr > 0 ? stateStack[stackPtr - 1] : currentState);
				
				const isTargetProbeState = probeStates ? probeStates.has(targetState) : false;
				
				// Handle probe entry
				if (!isInProbeState && isTargetProbeState) {
					probeEntry = {
						pos: pos,
						state: currentState,
						stackPtr: stackPtr,
						ruleIdx: charClass,
					};
				}
				
				// INLINED: token emission
				if (!isInProbeState && tokenType !== 255) {
					const consume = matchedLength || 1;
					const newEnd = pos + consume;
					
					if (tokenType === lastTokenType && pos === lastTokenEnd) {
						// Extend token inline
						tokens[(tokenCount - 1) * 3 + 2] = newEnd;
					} else {
						// Emit token inline
						tokens[tokenCount * 3] = tokenType;
						tokens[tokenCount * 3 + 1] = pos;
						tokens[tokenCount * 3 + 2] = newEnd;
						tokenCount++;
					}
					lastTokenType = tokenType;
					lastTokenEnd = newEnd;
					pos = newEnd;
				} else {
					if (stackOp !== 2) {
						pos += matchedLength || 1;
					}
				}
				
				// INLINED: state transitions
				if (stackOp === 1) {
					stateStack[stackPtr++] = currentState;
					currentState = transition;
					// INLINED: cache refresh
					stateBuckets = patterns ? patterns.get(currentState) : undefined;
					charMapBase = currentState * 128;
					transBase3 = currentState * 256 * 3;
				} else if (stackOp === 2) {
					if (stackPtr > 0) {
						currentState = stateStack[--stackPtr];
						// INLINED: cache refresh
						stateBuckets = patterns ? patterns.get(currentState) : undefined;
						charMapBase = currentState * 128;
						transBase3 = currentState * 256 * 3;
					}
				} else if (transition !== 255) {
					currentState = transition;
					// INLINED: cache refresh
					stateBuckets = patterns ? patterns.get(currentState) : undefined;
					charMapBase = currentState * 128;
					transBase3 = currentState * 256 * 3;
				}
				
				// Check probe exit
				if (isInProbeState && !isTargetProbeState && probeEntry) {
					pos = probeEntry.pos;
					stackPtr = probeEntry.stackPtr;
					if (stackOp === 1) {
						stateStack[stackPtr++] = probeEntry.state;
					}
					probeEntry = null;
				}
			} else {
				// No match
				if (isInProbeState && probeEntry) {
					const key = (probeEntry.pos << 16) | (probeEntry.state << 8) | probeEntry.ruleIdx;
					failedProbes.add(key);
					pos = probeEntry.pos;
					currentState = probeEntry.state;
					stackPtr = probeEntry.stackPtr;
					probeEntry = null;
					// INLINED: cache refresh
					stateBuckets = patterns ? patterns.get(currentState) : undefined;
					charMapBase = currentState * 128;
					transBase3 = currentState * 256 * 3;
				} else {
					pos++;
				}
			}
		} else {
			// Non-ASCII handling (simplified)
			pos++;
		}
	}
	
	return tokens.slice(0, tokenCount * 3);
}

describe("Inlining Optimization Tests", () => {
	bench("Standard tokenizer", () => {
		const tokens = tokenize(cssCode, compiled);
		return tokens;
	});
	
	bench("Manually inlined tokenizer", () => {
		const tokens = tokenizeWithInlining(cssCode, compiled);
		return tokens;
	});
	
	// Test specific inlining scenarios
	bench("Inline pattern: ternary for cache", () => {
		let sum = 0;
		const patterns = new Map([[0, [1, 2, 3]], [1, [4, 5, 6]]]);
		for (let i = 0; i < 100000; i++) {
			const state = i & 1;
			// Non-inlined
			const buckets = patterns && patterns.get(state);
			if (buckets) sum += buckets[0];
		}
		return sum;
	});
	
	bench("Inline pattern: direct check", () => {
		let sum = 0;
		const patterns = new Map([[0, [1, 2, 3]], [1, [4, 5, 6]]]);
		for (let i = 0; i < 100000; i++) {
			const state = i & 1;
			// Inlined
			const buckets = patterns ? patterns.get(state) : undefined;
			if (buckets) sum += buckets[0];
		}
		return sum;
	});
	
	bench("Inline pattern: if-else for cache", () => {
		let sum = 0;
		const patterns = new Map([[0, [1, 2, 3]], [1, [4, 5, 6]]]);
		for (let i = 0; i < 100000; i++) {
			const state = i & 1;
			// Alternative inline
			let buckets;
			if (patterns) {
				buckets = patterns.get(state);
			} else {
				buckets = undefined;
			}
			if (buckets) sum += buckets[0];
		}
		return sum;
	});
});