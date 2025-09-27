import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";

// Test in actual CSS context
const input = "div { transform: translateY(-100px); }";
console.log("Input:", input);

const result = tokenize(input, grammar);
console.log("\nTokenization result:");

for (let i = 0; i < result.tokens.length; i += 3) {
	const type = result.tokenTypes[result.tokens[i]];
	const start = result.tokens[i + 1];
	const end = result.tokens[i + 2];
	const text = input.substring(start, end);
	console.log(`  [${start}-${end}] ${type}: "${text}"`);
	
	// Focus on the area around -100px
	if (start >= 25 && start <= 35) {
		console.log("    ^^ This is around the -100px");
	}
}