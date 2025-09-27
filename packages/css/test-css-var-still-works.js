import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";

// Test that CSS variables still work
const tests = [
	"div { color: var(--theme-color); }",
	"div { --primary: blue; }",
	":root { --spacing: 1rem; }",
];

for (const input of tests) {
	console.log(`\nInput: "${input}"`);
	const result = tokenize(input, grammar);
	
	for (let i = 0; i < result.tokens.length; i += 3) {
		const type = result.tokenTypes[result.tokens[i]];
		const start = result.tokens[i + 1];
		const end = result.tokens[i + 2];
		const text = input.substring(start, end);
		
		if (text.includes("--")) {
			console.log(`  CSS Variable: [${start}-${end}] ${type}: "${text}"`);
		}
	}
}