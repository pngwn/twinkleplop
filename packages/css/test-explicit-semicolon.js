import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";

// Test with explicit semicolon handling
const testCode = `div {
	transform: translate(10px) ;
	transform: scale(2) ;
}`;

console.log("Test with space before semicolon:");
const result = tokenize(testCode, grammar);
for (let i = 0; i < result.tokens.length / 3; i++) {
	const type = result.tokenTypes[result.tokens[i * 3]];
	const start = result.tokens[i * 3 + 1];
	const end = result.tokens[i * 3 + 2];
	const text = testCode.slice(start, end);
	console.log(`  ${i}: "${text}" → ${type}`);
}