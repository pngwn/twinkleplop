import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";

// Test cases that were problematic
const tests = [
	"div { transform: translateY(-100px); }",  // Was incorrectly treating -100px as css-variable
	"div { color: var(--theme-color); }",      // Should correctly recognize --theme-color
	"div { margin: -10px; }",                  // Negative number
	"div { --spacing: 1rem; }",                // CSS custom property
];

for (const input of tests) {
	console.log(`\nInput: "${input}"`);
	const result = tokenize(input, grammar);
	
	console.log("Tokens:");
	for (let i = 0; i < result.tokens.length; i += 3) {
		const type = result.tokenTypes[result.tokens[i]];
		const start = result.tokens[i + 1];
		const end = result.tokens[i + 2];
		const text = input.substring(start, end);
		console.log(`  ${type}: "${text}"`);
	}
}