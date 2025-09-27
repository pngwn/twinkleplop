import { tokenize } from "@twinkleplop/core";
import grammar from "./src/grammar.js";

// Test case: CSS variable vs negative number in function args
const testCases = [
	"translateY(-100px)",  // Should tokenize - as operator, 100 as number
	"var(--theme-color)",   // Should tokenize -- as css-variable start
	"calc(-1 * --spacing)", // Both - and -- in same context
];

for (const test of testCases) {
	console.log(`\nTest: "${test}"`);
	const result = tokenize(`div { transform: ${test}; }`, grammar);
	
	// Find the relevant tokens (skip div, {, transform, :)
	let pos = 0;
	const tokens = [];
	for (let i = 0; i < result.tokens.length; i += 3) {
		const type = result.tokenTypes[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const text = test.substring(start - 17, end - 17); // Adjust for "div { transform: " prefix
		
		if (start >= 17) { // After "div { transform: "
			tokens.push(`${type}: "${text}"`);
		}
	}
	
	console.log("Tokens:", tokens.join(", "));
}

// Direct test of the specific issue
const directTest = "var(--theme-color, blue)";
console.log(`\n\nDirect test: "${directTest}"`);
const directResult = tokenize(directTest, grammar);

for (let i = 0; i < directResult.tokens.length; i += 3) {
	const type = directResult.tokenTypes[directResult.tokens[i * 3]];
	const start = directResult.tokens[i * 3 + 1];
	const end = directResult.tokens[i * 3 + 2];
	const text = directTest.substring(start, end);
	console.log(`  ${type}: "${text}" [${start}-${end}]`);
}