import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";

// Simple test case
const input = "calc(-100px)";
console.log("Input:", input);
console.log("Positions:");
for (let i = 0; i < input.length; i++) {
	console.log(`  ${i}: '${input[i]}' (${input.charCodeAt(i)})`);
}

// Check what happens at position 5 (the dash)
console.log("\nAt position 5 (dash):");
console.log("  Current char:", input[5], "code:", input.charCodeAt(5));
console.log("  Next char:", input[6], "code:", input.charCodeAt(6));

// Now tokenize and see what happens
const result = tokenize(input, grammar);
console.log("\nTokenization result:");
console.log("  Token count:", result.tokens.length / 3);

for (let i = 0; i < result.tokens.length; i += 3) {
	const type = result.tokenTypes[result.tokens[i]];
	const start = result.tokens[i + 1];
	const end = result.tokens[i + 2];
	const text = input.substring(start, end);
	console.log(`  [${start}-${end}] ${type}: "${text}"`);
}