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
	"foo",
	"foo()",
	"foo ()",
	"foo  ()",
	"foo.bar",
	"foo123",
];

for (const test of tests) {
	console.log(`"${test}":`);
	const tokens = getTokens(test);
	if (tokens.length === 0) {
		console.log("  NO TOKENS!");
	} else {
		tokens.forEach(t => {
			console.log(`  ${t.type.padEnd(15)} "${t.text}" [${t.start}-${t.end}]`);
		});
	}
}