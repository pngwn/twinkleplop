import { compile } from "@twinkleplop/core/compile";
import { tokenize } from "@twinkleplop/core";
import grammar from "./src/grammar-simplified.js";

// Simpler test case to debug
const testCSS = `.card {
  display: grid;
}`;

console.log("Testing simplified CSS grammar with debug...\n");
console.log("Input CSS:");
console.log("----------");
console.log(testCSS);
console.log("\n");

try {
	// Compile and tokenize with a timeout
	const compiled = compile(grammar);
	
	console.log("Grammar compiled successfully");
	console.log("Number of states:", Object.keys(compiled.states).size || compiled.states.size);
	
	// Try tokenizing with a simple timeout mechanism
	const startTime = Date.now();
	const timeout = 1000; // 1 second timeout
	
	let result;
	const tokenizePromise = new Promise((resolve) => {
		result = tokenize(testCSS, compiled);
		resolve(result);
	});
	
	const timeoutPromise = new Promise((_, reject) => {
		setTimeout(() => reject(new Error("Tokenization timeout")), timeout);
	});
	
	Promise.race([tokenizePromise, timeoutPromise])
		.then((result) => {
			console.log("Tokenization complete!");
			console.log("Token count:", result.tokens.length / 3);
		})
		.catch((err) => {
			console.error("Error during tokenization:", err.message);
			console.log("\nLikely infinite loop detected. Check probe states and state transitions.");
		});
	
} catch (error) {
	console.error("Error:", error);
}