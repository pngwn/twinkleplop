import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";

function getTokens(input) {
	const result = tokenize(input, grammar);
	const tokens = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.tokenTypes[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const text = input.slice(start, end);
		tokens.push({ type, text });
	}
	return tokens;
}

// Edge cases
const tests = [
	// Complex template literal with nested expression
	"`Hello ${user.name || 'Guest'}!`",
	
	// Nested template literals
	"`Outer ${`Inner ${x}`} end`",
	
	// Regular expression (note: regex detection is complex)
	"/[a-z]+/gi",
	
	// BigInt
	"123n",
	
	// Binary and octal numbers
	"0b1010",
	"0o755",
	
	// JSX-like (won't work perfectly without JSX support)
	"<div className='test' />",
	
	// Destructuring with defaults
	"const { a = 1, ...rest } = obj;",
];

console.log("JavaScript Edge Cases\n" + "=".repeat(50));

for (const test of tests) {
	console.log(`\nInput: ${JSON.stringify(test)}`);
	const tokens = getTokens(test);
	console.log("Tokens:");
	tokens.forEach(t => {
		console.log(`  ${t.type.padEnd(12)} ${JSON.stringify(t.text)}`);
	});
}