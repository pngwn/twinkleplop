import { compile } from "@twinkleplop/core/compile";
import { createIntrospector } from "@twinkleplop/core/introspector";
import grammar from "./src/grammar-simplified.js";

// Simple test case
const testCSS = `.card {
  display: grid;
}`;

console.log("Testing with introspection...\n");

const compiled = compile(grammar);

// Create introspector to see what's happening
const introspector = createIntrospector({
	log: (type, data) => {
		if (type === "char") {
			console.log(`[${data.pos}] '${data.charStr}' in '${data.currentState}'`);
		} else if (type === "transition") {
			console.log(`  → ${data.targetState}`);
		} else if (type === "token") {
			console.log(`  Token: ${data.tokenType} [${data.start}-${data.end}]`);
		} else if (type === "probe_enter") {
			console.log(`  ↓ Entering probe mode`);
		} else if (type === "probe_exit") {
			console.log(`  ↑ Exiting probe mode`);
		}
	},
	maxHistorySize: 100,
});

// Use a simple iteration limit to prevent infinite loops
let iterations = 0;
const maxIterations = 1000;

// We need to manually iterate to add the safety check
const { tokenize } = await import("@twinkleplop/core/debug");

try {
	const result = tokenize(testCSS, compiled, introspector);
	console.log("\nTokenization complete!");
} catch (error) {
	console.error("\nError during tokenization:", error.message);
}