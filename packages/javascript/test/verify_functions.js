import { tokenize } from "@twinkleplop/core";
import { grammar } from "../src/index.js";

function getTokens(input) {
	const result = tokenize(input, grammar);
	const tokens = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.tokenTypes[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const text = input.slice(start, end);
		tokens.push({ type, text, start, end });
	}
	return tokens;
}

// Test function detection
const testCases = [
	`foo()`,
	`console.log("hello")`,
	`arr.map(x => x * 2)`,
	`setTimeout(() => {}, 1000)`,
	`myFunction (arg1, arg2)`,
	`obj.method(param)`,
	`new Date()`,
	`super.call()`,
	`this.init()`,
	// Not functions
	`let foo = 5`,
	`const bar = "test"`,
	`if (x > 5)`,
	`return value`,
];

console.log("Function Detection Test");
console.log("=".repeat(50));

testCases.forEach(code => {
	console.log(`\nCode: ${code}`);
	const tokens = getTokens(code);
	const functionTokens = tokens.filter(t => t.type === 'function');
	if (functionTokens.length > 0) {
		console.log("✅ Function detected:", functionTokens.map(t => t.text).join(', '));
	} else {
		console.log("⚪ No functions detected");
	}
	
	// Show all tokens for debugging
	console.log("All tokens:", tokens.map(t => `${t.type}:"${t.text}"`).join(' '));
});