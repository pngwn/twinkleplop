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
		tokens.push({ type, text, start, end });
	}
	return tokens;
}

// Trace a specific case
const input = "{pattern: /test/}";
console.log(`Input: "${input}"\n`);

const tokens = getTokens(input);
console.log("Tokens:");
tokens.forEach((t, i) => {
	console.log(`  [${t.start}-${t.end}] ${t.type.padEnd(12)} ${JSON.stringify(t.text)}`);
});

// Show each character position
console.log("\nCharacter positions:");
for (let i = 0; i < input.length; i++) {
	console.log(`  ${i}: '${input[i]}'`);
}