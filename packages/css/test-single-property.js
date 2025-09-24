import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";

// Test with single property first
const testCode1 = `div {
	transform: translate(10px);
}`;

console.log("Test 1 - Single property:");
const result1 = tokenize(testCode1, grammar);
for (let i = 0; i < result1.tokens.length / 3; i++) {
	const type = result1.tokenTypes[result1.tokens[i * 3]];
	const start = result1.tokens[i * 3 + 1];
	const end = result1.tokens[i * 3 + 2];
	const text = testCode1.slice(start, end);
	console.log(`  ${i}: "${text}" → ${type}`);
}

// Test with two properties
const testCode2 = `div {
	transform: translate(10px);
	color: red;
}`;

console.log("\nTest 2 - Two different properties:");
const result2 = tokenize(testCode2, grammar);
for (let i = 0; i < result2.tokens.length / 3; i++) {
	const type = result2.tokenTypes[result2.tokens[i * 3]];
	const start = result2.tokens[i * 3 + 1];
	const end = result2.tokens[i * 3 + 2];
	const text = testCode2.slice(start, end);
	console.log(`  ${i}: "${text}" → ${type}`);
}

// Test with two same properties  
const testCode3 = `div {
	transform: translate(10px);
	transform: scale(2);
}`;

console.log("\nTest 3 - Two same properties:");
const result3 = tokenize(testCode3, grammar);
for (let i = 0; i < result3.tokens.length / 3; i++) {
	const type = result3.tokenTypes[result3.tokens[i * 3]];
	const start = result3.tokens[i * 3 + 1];
	const end = result3.tokens[i * 3 + 2];
	const text = testCode3.slice(start, end);
	console.log(`  ${i}: "${text}" → ${type}`);
}