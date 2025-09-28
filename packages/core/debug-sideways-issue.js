import { tokenize } from "./dist/twinkleplop.debug.js";
import { compile } from "./dist/twinkleplop.compiler.js";
import { TokenizerIntrospector } from "./dist/twinkleplop.introspector.js";

const grammar = {
	name: "nested-sideways",
	states: {
		root: {
			rules: [{ match: "(", token: "paren", state: "level1" }],
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
const input = "([a>b<a])";

// Run with introspector to debug
const introspector = new TokenizerIntrospector();
const result = tokenize(input, compiled, introspector);

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
console.log("\nTokens found:", JSON.stringify(tokens, null, 2));
console.log("\nExpected final token: ')' at position 8");

// Get trace
const trace = introspector.getTrace();
console.log("\nFinal few trace entries:");
const lastEntries = trace.slice(-10);
for (const entry of lastEntries) {
	console.log(`  ${entry.type}:`, entry.data);
}