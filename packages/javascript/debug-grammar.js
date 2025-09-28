import { tokenize, compile } from "@twinkleplop/core";
import grammar from "./src/grammar.js";

// Simple test cases that should work
const tests = [
	"foo",
	"foo()",
	"a / b",
	"/regex/",
	"/regex/g",
];

console.log("Testing grammar...\n");

const compiled = compile(grammar);

for (const test of tests) {
	console.log(`Input: "${test}"`);
	console.log("-".repeat(40));
	
	try {
		// Add a timeout to detect infinite loops
		const startTime = Date.now();
		const timeout = 100; // 100ms timeout
		
		const result = tokenize(test, compiled);
		
		const elapsed = Date.now() - startTime;
		if (elapsed > timeout) {
			console.log(`⚠️ Warning: Took ${elapsed}ms (possible infinite loop)\n`);
			continue;
		}
		
		// Process tokens
		const tokens = [];
		for (let i = 0; i < result.tokens.length / 3; i++) {
			const type = result.tokenTypes[result.tokens[i * 3]];
			const start = result.tokens[i * 3 + 1];
			const end = result.tokens[i * 3 + 2];
			const text = test.slice(start, end);
			if (type) {
				tokens.push(`${type}:"${text}"`);
			}
		}
		
		console.log(`✓ Tokens: ${tokens.join(" ")}`);
		console.log(`  Time: ${elapsed}ms\n`);
		
	} catch (error) {
		console.log(`✗ Error: ${error.message}\n`);
	}
}