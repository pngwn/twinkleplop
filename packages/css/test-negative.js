import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";

const input = "div {\n\tmargin: -10px -5%;\n\ttop: -20rem;\n}";
console.log("Input:", JSON.stringify(input));

const result = tokenize(input, grammar);
console.log("\nTokens:");

for (let i = 0; i < result.tokens.length; i += 3) {
	const type = result.tokenTypes[result.tokens[i]];
	const start = result.tokens[i + 1];
	const end = result.tokens[i + 2];
	const text = input.substring(start, end);
	console.log(`  [${start}-${end}] ${type}: "${text}"`);
}