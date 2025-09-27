import { compile } from "./compiler.js";
import { tokenize } from "./tokenizer.js";

// Example grammar using match_within for different string types
const grammar = {
	name: "example",
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
					token: "string.double"
				},
				
				// Single-quoted strings without escapes
				{
					match_within: {
						start: "'",
						end: "'"
					},
					token: "string.single"
				},
				
				// Template literals with backticks
				{
					match_within: {
						start: "`",
						end: "`",
						escape: "\\"
					},
					token: "string.template"
				},
				
				// Multi-line comments
				{
					match_within: {
						start: "/*",
						end: "*/"
					},
					token: "comment.multi"
				},
				
				// HTML/XML tags
				{
					match_within: {
						start: "<",
						end: ">"
					},
					token: "tag"
				},
				
				// Whitespace
				{
					match: [" ", "\t", "\n", "\r"],
					token: "whitespace"
				},
				
				// Default text
				{
					range: [33, 126],
					token: "text"
				}
			]
		}
	}
};

// Compile the grammar
const compiled = compile(grammar);

// Test input with various string types
const input = `
Hello "world with \\"quotes\\"" and 'single quotes'
Template \`literal with \\n escape\`
/* This is a comment */
<div class="container">content</div>
`;

// Tokenize the input
const result = tokenize(input, compiled);

// Extract and display tokens
console.log("Tokens:");
console.log("-------");
for (let i = 0; i < result.tokens.length; i += 3) {
	const type = result.tokens[i];
	const start = result.tokens[i + 1];
	const end = result.tokens[i + 2];
	
	if (type !== 255) {
		const tokenType = result.tokenTypes[type];
		const text = input.substring(start, end);
		console.log(`${tokenType.padEnd(15)} | ${JSON.stringify(text)}`);
	}
}

console.log("\nGrammar states after preprocessing:");
console.log("-----------------------------------");
const states = Object.keys(compiled.states.keys ? [...compiled.states.keys()] : compiled.states);
console.log("Generated states:", states.filter(s => s.startsWith("__match_within_")));