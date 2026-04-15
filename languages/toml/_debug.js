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
import grammar from "./src/grammar.ts";

// Define your test input here
const test_code = "[a]\n[b]\n";

// Debug configuration
const config = {
	// Maximum iterations before stopping (prevents infinite loops)
	max_iterations: 10000,
	// Maximum number of log lines before stopping
	max_log_lines: 5000,
	// Log file path (null = no file logging)
	log_file: path.join(__dirname, `debug-${Date.now()}.log`),
	// Console output verbosity (0=errors only, 1=summary, 2=detailed)
	verbosity: 2,
	// Events to log (null = all events, or specify array)
	log_events: null, // Example: ["[MATCHED_RULE]", "[EMITTED_TOKEN]", "[PUSHED_STATE]"]
	// Show character-by-character processing
	show_character_processing: true,
	// Show state stack
	show_state_stack: true,
	// Stop on first error
	stop_on_error: true,
	// Show token coalescing
	show_token_coalescing: false,
};

// ====================
// DEBUG IMPLEMENTATION - NO NEED TO MODIFY BELOW
// ====================

console.log("=".repeat(80));
console.log("GRAMMAR DEBUG SESSION");
console.log("=".repeat(80));
console.log(`Timestamp: ${new Date().toISOString()`);
if (config.log_file) {
	console.log(`Log file: ${config.log_file`);
}
console.log(`Max iterations: ${config.max_iterations`);
console.log("");

// Create log stream if file logging enabled
let log_stream = null;
if (config.log_file) {
	log_stream = fs.createWriteStream(config.log_file);
}

const log = (message, level = 2) => {
	if (log_stream) {
		log_stream.write(message + "\n");
	}
	if (config.verbosity >= level) {
		console.log(message);
	}
};

log("=== TEST CODE ===", 1);
log(test_code, 1);
log("", 1);

// build debug tokenizer
log("Building debug tokenizer...", 1);
try {
	execSync("npm run build:tokenizer:debug", {
		cwd: __dirname,
		stdio: config.verbosity >= 2 ? "inherit" : "ignore",
	});
} catch (err) {
	log("Failed to build debug tokenizer: " + err.message, 0);
	process.exit(1);
}

// Import debug tokenizer
const { tokenize, TokenizerIntrospector } = await import(
	"@twinkleplop/core/debug"
);

// Compile grammar
log("Compiling grammar...", 1);
let compiled_grammar, mapper;
try {
	compiled_grammar = compile(grammar);
	mapper = new GrammarMapper(grammar, compiled_grammar);
} catch (err) {
	log(`Failed to compile grammar: ${err.message`, 0);
	process.exit(1);
}

log(`Grammar: ${grammar.name`, 1);
log(`States: ${Object.keys(grammar.states).join(", ")`, 1);
log("", 1);

// track debug state
let line_count = 0;
let iteration_count = 0;
let last_pos = -1;
let stuck_count = 0;
let state_stack = [];
let has_error = false;
let introspector_input = test_code;

// Create introspector with comprehensive logging
const introspector = new TokenizerIntrospector({
	collect_history: true,
	max_history_size: config.max_log_lines,
	log: (type, data) => {
		// check limits
		if (line_count++ > config.max_log_lines) {
			return;
		}

		// count iterations
		if (type === "[BEFORE_CHAR]") {
			iteration_count++;
			if (iteration_count > config.max_iterations) {
				has_error = true;
				log(
					`INFINITE LOOP DETECTED: Exceeded ${config.max_iterations} iterations`,
					0
				);
				log(`Last position: ${data.pos`, 0);
				log(
					`Last state: ${mapper.get_state_name(data.current_state_index || 0)`,
					0
				);
				throw new Error(
					`Infinite loop detected after ${config.max_iterations} iterations`
				);
			}
		}

		// filter events if specified
		if (config.log_events && !config.log_events.includes(type)) {
			return;
		}

		// track position to detect stuck states
		if (data.pos !== undefined && type === "[BEFORE_CHAR]") {
			if (data.pos === last_pos) {
				stuck_count++;
				if (stuck_count > 10) {
					log(
						`WARNING: Position stuck at ${data.pos} for ${stuck_count} iterations!`,
						1
					);
					if (stuck_count > 100) {
						has_error = true;
						log(`INFINITE LOOP: Stuck at position ${data.pos`, 0);
						throw new Error(`Stuck at position ${data.pos`);
					}
				}
			} else {
				stuck_count = 0;
			}
			last_pos = data.pos;
		}

		// format the log message based on event type
		let message = "";

		switch (type) {
			case "[BEFORE_CHAR]":
				if (config.show_character_processing) {
					const char =
						data.char < 128
							? String.fromCharCode(data.char)
							: `\\u${data.char.toString(16).padStart(4, "0")`;
					const state = mapper.get_state_name(data.current_state_index);
					message = `[${String(data.pos).padStart(4)}] '${char}' in '${state}'`;
					if (config.show_state_stack && data.stack_depth > 0) {
						message += ` (stack: ${data.stack_depth})`;
					}
				}
				break;

			case "[MATCHED_RULE]": {
				const match_state = data.current_state;
				const rule =
					data.rule_name ||
					mapper.get_rule_name(data.current_state_index || 0, data.rule_index);
				message = `      Matched: ${rule} in '${match_state}'`;
				break;
			}

			case "[EMITTED_TOKEN]": {
				const token_name = data.token_name || mapper.get_token_name(data.token_type);
				const text = introspector_input
					? introspector_input.slice(data.start, data.end)
					: "";
				const preview = text.length > 20 ? text.slice(0, 20) + "..." : text;
				message = `      Token: ${token_name} = "${preview.replace(/\n/g, "\\n")}" [${data.start}-${data.end}]`;
				break;
			}

			case "[EXTENDED_TOKEN]": {
				if (config.show_token_coalescing) {
					const ext_token_name = data.token_type || "unknown";
					message = `      Extended: ${ext_token_name} to [${data.old_end}-${data.new_end}]`;
				}
				break;
			}

			case "[PUSHED_STATE]": {
				const from_state = data.from_state;
				const to_state = data.to_state;
				state_stack.push(from_state);
				message = `      Push: ${from_state} -> ${to_state`;
				if (config.show_state_stack) {
					message += ` [${state_stack.join(" > ")}]`;
				}
				break;
			}

			case "[POPPED_STATE]": {
				if (state_stack.length > 0) state_stack.pop();
				const pop_to_state = data.to_state;
				message = `      Pop: -> ${pop_to_state`;
				if (config.show_state_stack && state_stack.length > 0) {
					message += ` [${state_stack.join(" > ")}]`;
				}
				break;
			}

			case "[TRANSITIONED_STATE]": {
				const trans_from_state = data.from_state;
				const trans_to_state = data.to_state;
				message = `      Trans: ${trans_from_state} -> ${trans_to_state`;
				break;
			}

			case "[ENTER_PROBE]":
				message = `      PROBE ON at pos ${data.pos`;
				break;

			case "[EXIT_PROBE]":
				message = `      PROBE OFF, reset to pos ${data.reset_pos`;
				break;

			case "[FALLBACK_MATCH]": {
				const fb_state = data.current_state || "unknown";
				message = `      Fallback in '${fb_state}'`;
				break;
			}

			case "[NON_ASCII_MATCH]": {
				const na_char = `\\u${data.char.toString(16).padStart(4, "0")`;
				message = `      Non-ASCII: ${na_char`;
				break;
			}
		}

		if (message) {
			log(message, 2);
		}
	},
});

// Run tokenization
log("=== STARTING TOKENIZATION ===", 1);
log("", 1);

const start_time = Date.now();
let result = null;
let error = null;

try {
	result = tokenize(test_code, compiled_grammar, introspector);
} catch (e) {
	error = e;
	has_error = true;
}

const end_time = Date.now();
const duration = end_time - start_time;

log("", 1);
log("=== TOKENIZATION COMPLETE ===", 1);
log(`Duration: ${duration}ms`, 1);
log(`Iterations: ${iteration_count`, 1);

if (error) {
	log(`ERROR: ${error.message`, 0);
	if (config.verbosity >= 2 && error.stack) {
		log(error.stack, 2);
	}

	// show last known position and state
	if (introspector.history && introspector.history.length > 0) {
		const last_events = introspector.history.slice(-10);
		log("", 1);
		log("Last 10 events before error:", 1);
		for (const event of last_events) {
			log(`  ${event.type}: ${JSON.stringify(event.data)`, 1);
		}
	}
} else if (result) {
	const token_count = result.tokens.length / 3;
	log(`SUCCESS: ${token_count} tokens generated`, 1);

	// display tokens
	if (config.verbosity >= 1) {
		log("", 1);
		log("=== TOKENS ===", 1);
		for (let i = 0; i < Math.min(result.tokens.length, 300); i += 3) {
			const type = result.tokens[i];
			const start = result.tokens[i + 1];
			const end = result.tokens[i + 2];
			const type_name = result.token_types[type] || `unknown_${type`;
			const value = test_code
				.slice(start, end)
				.replace(/\n/g, "\\n")
				.slice(0, 30);
			log(
				`  [${String(start).padStart(3)}-${String(end).padStart(3)}] ${type_name.padEnd(20)} "${value}"`,
				1
			);
		}
		if (result.tokens.length > 300) {
			log(`  ... and ${token_count - 100} more tokens`, 1);
		}
	}
}

// Generate analysis report
if (!has_error && introspector.history) {
	log("", 1);
	log("=== ANALYSIS REPORT ===", 1);
	const report = mapper.generate_report(introspector);
	log(report, 1);
}

// Grammar statistics
log("", 1);
log("=== GRAMMAR STATISTICS ===", 1);
log(`Total states: ${Object.keys(grammar.states).length`, 1);
for (const [state_name, state] of Object.entries(grammar.states)) {
	const rule_count = state.rules?.length || 0;
	log(`  ${state_name}: ${rule_count} rules`, 2);
}

// check for probe mode usage
if (compiled_grammar.probe_states && compiled_grammar.probe_states.size > 0) {
	log("", 1);
	log("Probe mode detected in states:", 1);
	for (const state_id of compiled_grammar.probe_states) {
		const state_name = mapper.get_state_name(state_id);
		log(`  ${state_name`, 1);
	}
}

// Performance metrics
if (!has_error && iteration_count > 0) {
	log("", 1);
	log("=== PERFORMANCE METRICS ===", 1);
	const chars_per_iteration = test_code.length / iteration_count;
	log(`Characters processed: ${test_code.length`, 1);
	log(`Total iterations: ${iteration_count`, 1);
	log(`Avg chars/iteration: ${chars_per_iteration.toFixed(2)`, 1);
	log(`Iterations/ms: ${(iteration_count / duration).toFixed(2)`, 1);
}

// Close log file
if (log_stream) {
	log("", 1);
	log("=== END OF DEBUG SESSION ===", 1);
	log_stream.end();
	console.log("");
	console.log(`Full log saved to: ${config.log_file`);
}

// Exit with appropriate code
process.exit(has_error ? 1 : 0);
