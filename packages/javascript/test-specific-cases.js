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

// Specific test cases
const tests = [
	"return /test/",
	"return /test/gi",
	"throw /error/",
	"x = /regex/g",
];

console.log("Specific Test Cases\n" + "=".repeat(50));

for (const test of tests) {
	console.log(`\nInput: ${JSON.stringify(test)}`);
	const tokens = getTokens(test);
	console.log("Tokens:");
	tokens.forEach(t => {
		console.log(`  [${t.start}-${t.end}] ${t.type.padEnd(12)} ${JSON.stringify(t.text)}`);
	});
}