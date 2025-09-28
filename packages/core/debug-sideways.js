import { tokenize } from "./dist/twinkleplop.production.js";
import { compile } from "./dist/twinkleplop.compiler.js";

const grammar = {
	name: "nested-sideways",
	states: {
		root: {
			rules: [
				{ match: "(", token: "paren", state: "level1" },
			],
		},
		level1: {
			rules: [
				{ match: "[", token: "bracket", state: "level2a" },
				{ match: "{", token: "brace", state: "level2b" },
				{ match: ")", token: "paren", exit: true },
			],
		},
		level2a: {
			rules: [
				{ match: "]", token: "bracket", exit: true },
				{ match: ">", token: "arrow", state: "level2b", exit: true }, // Sideways to sibling
				{ match: "a", token: "a" },
			],
		},
		level2b: {
			rules: [
				{ match: "}", token: "brace", exit: true },
				{ match: "<", token: "arrow", state: "level2a", exit: true }, // Sideways to sibling
				{ match: "b", token: "b" },
			],
		},
	},
};

const compiled = compile(grammar);
console.log("Compiled grammar:", JSON.stringify(compiled, null, 2));

const input = "([a>b<a])";
const result = tokenize(input, compiled);

// Extract tokens
const tokens = [];
for (let i = 0; i < result.tokens.length / 3; i++) {
	const type = result.tokenTypes[result.tokens[i * 3]];
	const start = result.tokens[i * 3 + 1];
	const end = result.tokens[i * 3 + 2];
	tokens.push({
		type,
		value: input.substring(start, end),
		start,
		end
	});
}

console.log("\nInput:", input);
console.log("\nTokens:", JSON.stringify(tokens, null, 2));