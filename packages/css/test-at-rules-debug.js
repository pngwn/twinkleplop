import { compile } from "@twinkleplop/core/compile";
import { tokenize } from "@twinkleplop/core";
import grammar from "./src/grammar.js";

const testCSS = `@media (min-width: 600px) {`;

console.log("Testing at-rule tokenization (DEBUG)...\n");
console.log("Input CSS:");
console.log("----------");
console.log(testCSS);
console.log("\n");

// Compile and tokenize
const compiled = compile(grammar);
const result = tokenize(testCSS, compiled);

// Extract ALL tokens without coalescing
console.log("Raw tokens (first 30):");
console.log("-----------------------");
for (let i = 0; i < Math.min(30, result.tokens.length / 3); i++) {
	const type = result.tokens[i * 3];
	const start = result.tokens[i * 3 + 1];
	const end = result.tokens[i * 3 + 2];
	
	if (type !== 255) {
		const tokenType = result.tokenTypes[type] || `unknown(${type})`;
		const text = testCSS.substring(start, end);
		console.log(`[${i}] ${start}-${end}: ${tokenType.padEnd(12)} | "${text}"`);
	}
}

console.log("\n\nCharacter by character:");
console.log("------------------------");
for (let i = 0; i < testCSS.length; i++) {
	console.log(`[${i}] '${testCSS[i]}' (${testCSS.charCodeAt(i)})`);
}