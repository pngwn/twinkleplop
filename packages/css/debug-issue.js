#!/usr/bin/env node

/**
 * Grammar Debug Template
 * 
 * A reusable template for debugging tokenization issues, including infinite loops.
 * Features:
 * - Iteration limit protection for infinite loops
 * - Full introspection with readable output  
 * - State and rule mapping
 * - Character-by-character analysis
 * - Automatic log file creation
 * 
 * Usage:
 * 1. Copy this template to your package directory
 * 2. Modify the grammar import and test code in the CONFIGURATION section
 * 3. Run with: node debug-grammar-template.js
 */

import { compile } from "@twinkleplop/core/compile";
import { execSync } from "child_process";
import { GrammarMapper } from "@twinkleplop/core/grammar-mapper";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====================
// CONFIGURATION SECTION - MODIFY THIS FOR YOUR GRAMMAR
// ====================

// Import your grammar here
// Example: import grammar from "./src/grammar.js";
import grammar from "./src/grammar.js";

// Define your test input here
const testCode = `div {
	transform: translate(10px, 20px);
	transform: scaleX(2);
}`;

// Debug configuration
const config = {
	// Maximum iterations before stopping (prevents infinite loops)
	maxIterations: 10000,
	// Maximum number of log lines before stopping
	maxLogLines: 5000,
	// Log file path (null = no file logging)
	logFile: path.join(__dirname, `debug-${Date.now()}.log`),
	// Console output verbosity (0=errors only, 1=summary, 2=detailed)
	verbosity: 2,
	// Events to log (null = all events, or specify array)
	logEvents: null, // Example: ["[MATCHED_RULE]", "[EMITTED_TOKEN]", "[PUSHED_STATE]"]
	// Show character-by-character processing
	showCharacterProcessing: true,
	// Show state stack
	showStateStack: true,
	// Stop on first error
	stopOnError: true,
	// Show token coalescing
	showTokenCoalescing: false,
};

// ====================
// DEBUG IMPLEMENTATION - NO NEED TO MODIFY BELOW
// ====================

console.log("=".repeat(80));
console.log("GRAMMAR DEBUG SESSION");
console.log("=".repeat(80));
console.log(`Timestamp: ${new Date().toISOString()}`);
if (config.logFile) {
	console.log(`Log file: ${config.logFile}`);
}
console.log(`Max iterations: ${config.maxIterations}`);
console.log("");

// Create log stream if file logging enabled
let logStream = null;
if (config.logFile) {
	logStream = fs.createWriteStream(config.logFile);
}

const log = (message, level = 2) => {
	if (logStream) {
		logStream.write(message + "\n");
	}
	if (config.verbosity >= level) {
		console.log(message);
	}
};

log("=== TEST CODE ===", 1);
log(testCode, 1);
log("", 1);

// Build debug tokenizer
log("Building debug tokenizer...", 1);
try {
	execSync("npm run build:tokenizer:debug", { 
		cwd: __dirname,
		stdio: config.verbosity >= 2 ? "inherit" : "ignore" 
	});
} catch (error) {
	log("Failed to build debug tokenizer: " + error.message, 0);
	process.exit(1);
}

// Import debug tokenizer
const { tokenize, TokenizerIntrospector } = await import("@twinkleplop/core/debug");

// Compile grammar
log("Compiling grammar...", 1);
let compiledGrammar, mapper;
try {
	compiledGrammar = compile(grammar);
	mapper = new GrammarMapper(grammar, compiledGrammar);
} catch (error) {
	log(`Failed to compile grammar: ${error.message}`, 0);
	process.exit(1);
}

log(`Grammar: ${grammar.name}`, 1);
log(`States: ${Object.keys(grammar.states).join(", ")}`, 1);
log("", 1);

// Track debug state
let lineCount = 0;
let iterationCount = 0;
let lastPos = -1;
let stuckCount = 0;
let stateStack = [];
let hasError = false;
let introspectorInput = testCode;

// Create introspector with comprehensive logging
const introspector = new TokenizerIntrospector({
	collectHistory: true,
	maxHistorySize: config.maxLogLines,
	log: (type, data) => {
		// Check limits
		if (lineCount++ > config.maxLogLines) {
			return;
		}
		
		// Count iterations
		if (type === "[BEFORE_CHAR]") {
			iterationCount++;
			if (iterationCount > config.maxIterations) {
				hasError = true;
				log(`❌ INFINITE LOOP DETECTED: Exceeded ${config.maxIterations} iterations`, 0);
				log(`Last position: ${data.pos}`, 0);
				log(`Last state: ${mapper.getStateName(data.currentStateIndex || 0)}`, 0);
				throw new Error(`Infinite loop detected after ${config.maxIterations} iterations`);
			}
		}
		
		// Filter events if specified
		if (config.logEvents && !config.logEvents.includes(type)) {
			return;
		}
		
		// Track position to detect stuck states
		if (data.pos !== undefined && type === "[BEFORE_CHAR]") {
			if (data.pos === lastPos) {
				stuckCount++;
				if (stuckCount > 10) {
					log(`⚠️  WARNING: Position stuck at ${data.pos} for ${stuckCount} iterations!`, 1);
					if (stuckCount > 100) {
						hasError = true;
						log(`❌ INFINITE LOOP: Stuck at position ${data.pos}`, 0);
						throw new Error(`Stuck at position ${data.pos}`);
					}
				}
			} else {
				stuckCount = 0;
			}
			lastPos = data.pos;
		}
		
		// Format the log message based on event type
		let message = "";
		
		switch (type) {
			case "[BEFORE_CHAR]":
				if (config.showCharacterProcessing) {
					const char = data.char < 128 
						? String.fromCharCode(data.char) 
						: `\\u${data.char.toString(16).padStart(4, "0")}`;
					const state = mapper.getStateName(data.currentStateIndex);
					message = `[${String(data.pos).padStart(4)}] '${char}' in '${state}'`;
					if (config.showStateStack && data.stackDepth > 0) {
						message += ` (stack: ${data.stackDepth})`;
					}
				}
				break;
				
			case "[MATCHED_RULE]":
				const matchState = data.currentState;
				const rule = data.ruleName || mapper.getRuleName(data.currentStateIndex || 0, data.ruleIndex);
				message = `      ✓ Matched: ${rule} in '${matchState}'`;
				break;
				
			case "[EMITTED_TOKEN]":
				const tokenName = data.tokenName || mapper.getTokenName(data.tokenType);
				const text = introspectorInput ? introspectorInput.slice(data.start, data.end) : "";
				const preview = text.length > 20 ? text.slice(0, 20) + "..." : text;
				message = `      → Token: ${tokenName} = "${preview.replace(/\n/g, "\\n")}" [${data.start}-${data.end}]`;
				break;
				
			case "[EXTENDED_TOKEN]":
				if (config.showTokenCoalescing) {
					const extTokenName = data.tokenType || "unknown";
					message = `      ↗ Extended: ${extTokenName} to [${data.oldEnd}-${data.newEnd}]`;
				}
				break;
				
			case "[PUSHED_STATE]":
				const fromState = data.fromState;
				const toState = data.toState;
				stateStack.push(fromState);
				message = `      ↓ Push: ${fromState} → ${toState}`;
				if (config.showStateStack) {
					message += ` [${stateStack.join(" > ")}]`;
				}
				break;
				
			case "[POPPED_STATE]":
				if (stateStack.length > 0) stateStack.pop();
				const popToState = data.toState;
				message = `      ↑ Pop: → ${popToState}`;
				if (config.showStateStack && stateStack.length > 0) {
					message += ` [${stateStack.join(" > ")}]`;
				}
				break;
				
			case "[TRANSITIONED_STATE]":
				const transFromState = data.fromState;
				const transToState = data.toState;
				message = `      → Trans: ${transFromState} → ${transToState}`;
				break;
				
			case "[ENTER_PROBE]":
				message = `      🔍 PROBE ON at pos ${data.pos}`;
				break;
				
			case "[EXIT_PROBE]":
				message = `      🔍 PROBE OFF, reset to pos ${data.resetPos}`;
				break;
				
			case "[FALLBACK_MATCH]":
				const fbState = data.currentState || "unknown";
				message = `      ⚡ Fallback in '${fbState}'`;
				break;
				
			case "[NON_ASCII_MATCH]":
				const naChar = `\\u${data.char.toString(16).padStart(4, "0")}`;
				message = `      ⚡ Non-ASCII: ${naChar}`;
				break;
		}
		
		if (message) {
			log(message, 2);
		}
	}
});

// Run tokenization
log("=== STARTING TOKENIZATION ===", 1);
log("", 1);

const startTime = Date.now();
let result = null;
let error = null;

try {
	result = tokenize(testCode, compiledGrammar, introspector);
} catch (e) {
	error = e;
	hasError = true;
}

const endTime = Date.now();
const duration = endTime - startTime;

log("", 1);
log("=== TOKENIZATION COMPLETE ===", 1);
log(`Duration: ${duration}ms`, 1);
log(`Iterations: ${iterationCount}`, 1);

if (error) {
	log(`❌ ERROR: ${error.message}`, 0);
	if (config.verbosity >= 2 && error.stack) {
		log(error.stack, 2);
	}
	
	// Show last known position and state
	if (introspector.history && introspector.history.length > 0) {
		const lastEvents = introspector.history.slice(-10);
		log("", 1);
		log("Last 10 events before error:", 1);
		for (const event of lastEvents) {
			log(`  ${event.type}: ${JSON.stringify(event.data)}`, 1);
		}
	}
} else if (result) {
	const tokenCount = result.tokens.length / 3;
	log(`✅ SUCCESS: ${tokenCount} tokens generated`, 1);
	
	// Display tokens
	if (config.verbosity >= 1) {
		log("", 1);
		log("=== TOKENS ===", 1);
		for (let i = 0; i < Math.min(result.tokens.length, 300); i += 3) {
			const type = result.tokens[i];
			const start = result.tokens[i + 1];
			const end = result.tokens[i + 2];
			const typeName = result.tokenTypes[type] || `unknown_${type}`;
			const value = testCode.slice(start, end).replace(/\n/g, "\\n").slice(0, 30);
			log(`  [${String(start).padStart(3)}-${String(end).padStart(3)}] ${typeName.padEnd(20)} "${value}"`, 1);
		}
		if (result.tokens.length > 300) {
			log(`  ... and ${tokenCount - 100} more tokens`, 1);
		}
	}
}

// Generate analysis report
if (!hasError && introspector.history) {
	log("", 1);
	log("=== ANALYSIS REPORT ===", 1);
	const report = mapper.generateReport(introspector);
	log(report, 1);
}

// Grammar statistics
log("", 1);
log("=== GRAMMAR STATISTICS ===", 1);
log(`Total states: ${Object.keys(grammar.states).length}`, 1);
for (const [stateName, state] of Object.entries(grammar.states)) {
	const ruleCount = state.rules?.length || 0;
	log(`  ${stateName}: ${ruleCount} rules`, 2);
}

// Check for probe mode usage
if (compiledGrammar.modeMaps && compiledGrammar.modeMaps.size > 0) {
	log("", 1);
	log("Probe mode detected in states:", 1);
	for (const [stateId, modeMap] of compiledGrammar.modeMaps) {
		const stateName = mapper.getStateName(stateId);
		const probeRules = Array.from(modeMap.entries())
			.filter(([_, mode]) => mode === 1)
			.length;
		if (probeRules > 0) {
			log(`  ${stateName}: ${probeRules} probe rules`, 1);
		}
	}
}

// Performance metrics
if (!hasError && iterationCount > 0) {
	log("", 1);
	log("=== PERFORMANCE METRICS ===", 1);
	const charsPerIteration = testCode.length / iterationCount;
	log(`Characters processed: ${testCode.length}`, 1);
	log(`Total iterations: ${iterationCount}`, 1);
	log(`Avg chars/iteration: ${charsPerIteration.toFixed(2)}`, 1);
	log(`Iterations/ms: ${(iterationCount / duration).toFixed(2)}`, 1);
}

// Close log file
if (logStream) {
	log("", 1);
	log("=== END OF DEBUG SESSION ===", 1);
	logStream.end();
	console.log("");
	console.log(`Full log saved to: ${config.logFile}`);
}

// Exit with appropriate code
process.exit(hasError ? 1 : 0);