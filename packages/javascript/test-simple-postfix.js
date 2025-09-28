// Simpler test to debug postfix ++ issue

import { tokenize, compile } from "@twinkleplop/core";

// Minimal grammar to test the issue
const testGrammar = {
	name: "test",
	states: {
		main: {
			rules: [
				// Identifier
				{ match: ["x", "y"], token: "identifier", state: "after_id" },
				// Whitespace
				{ match: [" "], token: null },
			]
		},
		after_id: {
			rules: [
				// ++ MUST come before +
				{ match: "++", token: "increment" },
				{ match: "--", token: "decrement" },
				{ match: "+", token: "plus" },
				{ match: "-", token: "minus" },
				// Back to main
				{ match: [" "], token: null, state: "main" },
				// Any other char
				{ any: true, state: "main", rewind: true },
			]
		}
	}
};

const grammar = compile(testGrammar);

function test(input) {
	const result = tokenize(input, grammar);
	const tokens = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.tokenTypes[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const text = input.slice(start, end);
		if (type) tokens.push(`${type}:${text}`);
	}
	console.log(`"${input}" => ${tokens.join(" ")}`);
}

test("x++");
test("x+");
test("x+++y");
test("x++ y");