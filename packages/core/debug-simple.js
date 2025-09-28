import { tokenize } from "./dist/twinkleplop.production.js";
import { compile } from "./dist/twinkleplop.compiler.js";

// Simple test case
const grammar = {
	name: "test",
	states: {
		root: {
			rules: [
				{ match: "(", token: "open", state: "inner" },
				{ match: "x", token: "x" },
			],
		},
		inner: {
			rules: [
				{ match: ")", token: "close", exit: true },
				{ match: "a", token: "a" },
			],
		},
	},
};

const compiled = compile(grammar);
const input = "(a)x";

console.log("Testing input:", input);
console.log("Expected tokens: open, a, close, x");

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

console.log("\nTokens found:");
tokens.forEach(t => console.log(`  ${t.type}: "${t.value}" [${t.start}-${t.end}]`));

if (tokens.length === 4) {
	console.log("\n✅ SUCCESS: All tokens found");
} else {
	console.log(`\n❌ FAIL: Expected 4 tokens, got ${tokens.length}`);
}