import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";

// Simplest possible test
const testCode = `div {
	color: red;
	background: blue;
}`;

console.log("Simple test with basic properties:");
const result = tokenize(testCode, grammar);
for (let i = 0; i < result.tokens.length / 3; i++) {
	const type = result.tokenTypes[result.tokens[i * 3]];
	const start = result.tokens[i * 3 + 1];
	const end = result.tokens[i * 3 + 2];
	const text = testCode.slice(start, end);
	console.log(`  ${i}: "${text}" → ${type}`);
}