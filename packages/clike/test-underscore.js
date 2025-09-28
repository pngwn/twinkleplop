// Test if underscore matches properly
const IDENTIFIER_CONTINUE = [["a", "z"], ["A", "Z"], ["0", "9"], "_", "$"];

// Check if underscore would match
console.log("Testing underscore match in range:");
console.log("Range:", JSON.stringify(IDENTIFIER_CONTINUE));

// Test with simple grammar
const testGrammar = {
	name: "test",
	states: {
		main: {
			rules: [
				{
					match: "_",
					token: "underscore"
				},
				{
					range: [["a", "z"], "_"],
					token: "identifier"
				}
			]
		}
	}
};

import { tokenize } from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
const compiled = compile(testGrammar);
const result = tokenize("_abc_def", compiled);

console.log("\nTokenizing '_abc_def':");
for (let i = 0; i < result.tokens.length / 3; i++) {
	const type = result.tokenTypes[result.tokens[i * 3]];
	const start = result.tokens[i * 3 + 1];
	const end = result.tokens[i * 3 + 2];
	const text = "_abc_def".slice(start, end);
	console.log(`  ${type}: "${text}"`);
}