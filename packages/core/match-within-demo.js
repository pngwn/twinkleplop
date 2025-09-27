// Demonstration of the new match_within matcher feature
import { compile } from "./dist/twinkleplop.compiler.js";
import { tokenize } from "./dist/twinkleplop.production.js";

// Example grammar using match_within for different string types
const grammar = {
	name: "demo",
	states: {
		main: {
			rules: [
				// Double-quoted strings with backslash escapes
				{
					match_within: {
						start: '"',
						end: '"',
						escape: "\\"
					},
					token: "string"
				},
				
				// Template expressions like {{variable}}
				{
					match_within: {
						start: "{{",
						end: "}}"
					},
					token: "template"
				},
				
				// Comments
				{
					match_within: {
						start: "/*",
						end: "*/"
					},
					token: "comment"
				},
				
				// Other characters
				{
					range: [0, 127],
					token: "text"
				}
			]
		}
	}
};

console.log("Compiling grammar with match_within matchers...");
const compiled = compile(grammar);

// Test input
const testInput = `Hello "world with \\"quotes\\"" and {{template}} /* comment */`;

console.log("\nInput:");
console.log(testInput);

// Tokenize
const result = tokenize(testInput, compiled);

console.log("\nTokens:");
console.log("-------");
for (let i = 0; i < result.tokens.length; i += 3) {
	const type = result.tokens[i];
	const start = result.tokens[i + 1];
	const end = result.tokens[i + 2];
	
	if (type !== 255) {
		const tokenType = result.tokenTypes[type];
		const text = testInput.substring(start, end);
		console.log(`${tokenType.padEnd(10)} | ${JSON.stringify(text)}`);
	}
}

console.log("\n✅ match_within feature successfully implemented!");