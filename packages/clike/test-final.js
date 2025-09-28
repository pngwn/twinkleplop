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

const tests = [
	// Basic cases
	{ code: "foo", expect: "identifier foo" },
	{ code: "foo()", expect: "function foo" },
	{ code: "foo(bar)", expect: "function foo, identifier bar inside" },
	{ code: "foo ()", expect: "function foo with space" },
	
	// Real world cases  
	{ code: "console.log('hello')", expect: "console identifier, log function" },
	{ code: "const result = calculate(x, y)", expect: "calculate as function" },
	{ code: "if (check()) { run(); }", expect: "check and run as functions" },
	{ code: "array.map(item => process(item))", expect: "map and process as functions" },
];

for (const test of tests) {
	console.log(`Test: "${test.code}"`);
	console.log(`Expected: ${test.expect}`);
	const tokens = getTokens(test.code);
	const summary = tokens
		.filter(t => t.type === 'function' || t.type === 'identifier')
		.map(t => `${t.type}:${t.text}`)
		.join(', ');
	console.log(`Got: ${summary}`);
	console.log();
}