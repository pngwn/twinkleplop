import { tokenize } from "@twinkleplop/core";
import grammar from "./src/grammar.js";
import fs from "fs";
import path from "path";

// Test input that should differentiate function calls from plain identifiers
const testCode = `foo()`;

// Configuration
const config = {
	maxIterations: 1000,
	maxLogLines: 500,
	verbosity: 2, // 0=errors only, 1=summary, 2=detailed
	showCharacterProcessing: true,
	showStateStack: true,
	showRuleMatching: true,
	showTokenEmission: true,
	showProbeMode: true,
};

// Create log file with timestamp
const logFileName = `debug-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
const logFile = fs.createWriteStream(logFileName);

function log(message, toFile = true) {
	console.log(message);
	if (toFile) {
		logFile.write(message + "\n");
	}
}

log("=".repeat(80));
log("GRAMMAR DEBUG SESSION");
log("=".repeat(80));
log(`Test Code: "${testCode}"`);
log(`Grammar: ${grammar.name}`);
log("");

// Helper to get state name from compiled grammar
function getStateName(stateIndex) {
	const stateNames = Object.keys(grammar.states);
	return stateNames[stateIndex] || `state_${stateIndex}`;
}

// Helper to get rule description
function getRuleDescription(state, ruleIndex) {
	const stateName = getStateName(state);
	const stateObj = grammar.states[stateName];
	if (!stateObj || !stateObj.rules || !stateObj.rules[ruleIndex]) {
		return "unknown rule";
	}
	const rule = stateObj.rules[ruleIndex];
	let desc = "";
	if (rule.match) desc = `match: ${JSON.stringify(rule.match)}`;
	else if (rule.range) desc = `range: ${JSON.stringify(rule.range)}`;
	else if (rule.match_within) desc = `match_within: ${JSON.stringify(rule.match_within)}`;
	else if (rule.any) desc = "any: true";
	
	if (rule.token) desc += ` → ${rule.token}`;
	if (rule.state) desc += ` → push ${rule.state}`;
	if (rule.exit) desc += ` → exit`;
	if (rule.rewind) desc += ` → rewind`;
	
	return desc;
}

// Monkey-patch tokenize to add debugging
const originalTokenize = tokenize;
let iterations = 0;
let lastPosition = -1;
let samePositionCount = 0;
const positionHistory = [];

function debugTokenize(input, grammar) {
	log("\n" + "=".repeat(40));
	log("STARTING TOKENIZATION");
	log("=".repeat(40) + "\n");
	
	// We need to examine the tokenization process
	// Since we can't directly hook into the internal tokenizer,
	// let's trace through manually
	
	let position = 0;
	let stateStack = [0]; // Start with main state (index 0)
	let probeMode = false;
	let probeStartPosition = -1;
	
	while (position < input.length && iterations < config.maxIterations) {
		iterations++;
		
		const char = input[position];
		const charCode = char.charCodeAt(0);
		const currentState = stateStack[stateStack.length - 1];
		const stateName = getStateName(currentState);
		
		if (config.showCharacterProcessing) {
			log(`\n[${position.toString().padStart(4)}] '${char}' (${charCode}) in '${stateName}'`);
			if (config.showStateStack && stateStack.length > 1) {
				log(`      Stack: [${stateStack.map(s => getStateName(s)).join(" → ")}]`);
			}
		}
		
		// Check for infinite loop
		if (position === lastPosition) {
			samePositionCount++;
			if (samePositionCount > 10) {
				log("\n" + "!".repeat(60));
				log("ERROR: Possible infinite loop detected!");
				log(`Stuck at position ${position} for ${samePositionCount} iterations`);
				log(`Character: '${char}' (code: ${charCode})`);
				log(`State: ${stateName}`);
				log("!".repeat(60));
				break;
			}
		} else {
			lastPosition = position;
			samePositionCount = 0;
		}
		
		// Track position history
		positionHistory.push({ position, state: stateName, char });
		if (positionHistory.length > 100) {
			positionHistory.shift();
		}
		
		// Simulate state processing (simplified - actual tokenizer is more complex)
		const stateObj = grammar.states[stateName];
		if (stateObj) {
			// Check for probe mode
			if (stateObj.mode === "probe" && !probeMode) {
				probeMode = true;
				probeStartPosition = position;
				log(`      ↻ ENTERING PROBE MODE at position ${position}`);
			}
			
			let matched = false;
			for (let i = 0; i < stateObj.rules.length; i++) {
				const rule = stateObj.rules[i];
				
				if (config.verbosity >= 2 && config.showRuleMatching) {
					log(`      Trying rule ${i}: ${getRuleDescription(currentState, i)}`);
				}
				
				// Simplified rule matching logic
				let isMatch = false;
				if (rule.match) {
					const matches = Array.isArray(rule.match) ? rule.match : [rule.match];
					for (const m of matches) {
						if (input.substr(position, m.length) === m) {
							isMatch = true;
							break;
						}
					}
				} else if (rule.range) {
					const ranges = Array.isArray(rule.range[0]) ? rule.range : [rule.range];
					for (const [start, end] of ranges) {
						if (char >= start && char <= end) {
							isMatch = true;
							break;
						}
					}
				} else if (rule.any) {
					isMatch = true;
				}
				
				if (isMatch) {
					matched = true;
					log(`      ✓ Matched rule ${i}: ${getRuleDescription(currentState, i)}`);
					
					// Handle actions
					if (rule.token && config.showTokenEmission) {
						log(`      → Token: ${rule.token} = "${char}"`);
					}
					
					if (rule.state) {
						const newStateIndex = Object.keys(grammar.states).indexOf(rule.state);
						stateStack.push(newStateIndex);
						log(`      ↓ Push: ${rule.state}`);
					}
					
					if (rule.exit) {
						stateStack.pop();
						log(`      ↑ Exit state`);
					}
					
					if (!rule.rewind) {
						position++;
					} else {
						log(`      ← Rewind`);
					}
					
					break;
				}
			}
			
			if (!matched) {
				// Handle fallback or exit probe mode
				if (probeMode && stateObj.fallback) {
					log(`      ↺ PROBE FALLBACK to '${stateObj.fallback}'`);
					probeMode = false;
					position = probeStartPosition;
					const fallbackIndex = Object.keys(grammar.states).indexOf(stateObj.fallback);
					stateStack[stateStack.length - 1] = fallbackIndex;
				} else {
					log(`      ✗ No matching rule`);
					position++;
				}
			}
			
			// Check for exiting probe mode
			if (probeMode && stateObj.mode !== "probe") {
				log(`      ↺ EXITING PROBE MODE, resetting to position ${probeStartPosition}`);
				probeMode = false;
				position = probeStartPosition;
			}
		} else {
			log(`      ERROR: State '${stateName}' not found!`);
			position++;
		}
	}
	
	// Run actual tokenization
	const result = originalTokenize(input, grammar);
	
	log("\n" + "=".repeat(40));
	log("TOKENIZATION RESULT");
	log("=".repeat(40));
	
	const tokens = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.tokenTypes[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const text = input.slice(start, end);
		tokens.push({ type, text, start, end });
		log(`Token ${i}: ${type.padEnd(15)} "${text}" [${start}-${end}]`);
	}
	
	return result;
}

// Run the debug session
try {
	debugTokenize(testCode, grammar);
	
	log("\n" + "=".repeat(80));
	log("DEBUG SESSION COMPLETE");
	log(`Total iterations: ${iterations}`);
	log(`Log file: ${logFileName}`);
	log("=".repeat(80));
} catch (error) {
	log("\n" + "!".repeat(60));
	log("ERROR DURING TOKENIZATION:");
	log(error.stack);
	log("!".repeat(60));
} finally {
	logFile.end();
}