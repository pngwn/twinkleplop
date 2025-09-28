import { tokenize } from "./dist/twinkleplop.production.js";
import { compile } from "./dist/twinkleplop.compiler.js";

// Test sideways transition
const grammar = {
	name: "test",
	states: {
		root: {
			rules: [
				{ match: "(", token: "open", state: "stateA" },
				{ match: "x", token: "x" },
			],
		},
		stateA: {
			rules: [
				{ match: "=", token: "equals", state: "stateB", exit: true }, // Sideways transition
				{ match: ")", token: "close", exit: true },
				{ match: "a", token: "a" },
			],
		},
		stateB: {
			rules: [
				{ match: ")", token: "close", exit: true },
				{ match: "b", token: "b" },
			],
		},
	},
};

const compiled = compile(grammar);

// Test case 1: Simple sideways transition
const input1 = "(a=b)x";
console.log("Testing input 1:", input1);
console.log("Expected tokens: open, a, equals, b, close, x");

const result1 = tokenize(input1, compiled);

// Extract tokens
const tokens1 = [];
for (let i = 0; i < result1.tokens.length / 3; i++) {
	const type = result1.tokenTypes[result1.tokens[i * 3]];
	const start = result1.tokens[i * 3 + 1];
	const end = result1.tokens[i * 3 + 2];
	tokens1.push({
		type,
		value: input1.substring(start, end),
		start,
		end
	});
}

console.log("\nTokens found:");
tokens1.forEach(t => console.log(`  ${t.type}: "${t.value}" [${t.start}-${t.end}]`));

if (tokens1.length === 6) {
	console.log("✅ SUCCESS: All tokens found");
} else {
	console.log(`❌ FAIL: Expected 6 tokens, got ${tokens1.length}`);
	console.log("Missing token at position", tokens1[tokens1.length - 1].end, ":", 
		input1[tokens1[tokens1.length - 1].end]);
}