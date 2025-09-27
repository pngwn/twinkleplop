import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";

// Test cases to understand the dash matching behavior
const tests = [
	"var(--foo)",      // Should match -- as css-variable
	"calc(-1)",        // Should match - as operator
	"calc(--var)",     // Should match -- as css-variable  
	"calc(-1 - 2)",    // Should match - as operators
];

for (const test of tests) {
	console.log(`\nTest: "${test}"`);
	const code = `.x { p: ${test}; }`;
	
	try {
		const result = tokenize(code, grammar);
		
		// Find tokens inside the function (after the opening paren)
		let inFunction = false;
		for (let i = 0; i < result.tokens.length; i += 3) {
			const type = result.tokenTypes[result.tokens[i * 3]];
			const start = result.tokens[i * 3 + 1];
			const end = result.tokens[i * 3 + 2];
			const text = code.substring(start, end);
			
			if (text === "(") {
				inFunction = true;
				continue;
			}
			if (text === ")") {
				break;
			}
			if (inFunction && text !== " ") {
				console.log(`  ${type}: "${text}"`);
			}
		}
	} catch (e) {
		console.error("  ERROR:", e.message);
	}
}