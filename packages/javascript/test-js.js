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
		tokens.push({ type, text });
	}
	return tokens;
}

// Test JavaScript-specific features
const tests = [
	// ES6+ features
	"const arrow = () => console.log('test');",
	"let { a, b } = obj;",
	"const [...rest] = array;",
	"async function test() { await fetch(); }",
	
	// Template literals
	"`Hello ${name}!`",
	"`Multi\nline\ntemplate`",
	
	// Modern operators
	"a ?? b",
	"obj?.prop",
	"a **= 2",
	"x >>>= 1",
	
	// Special values
	"undefined === null",
	"NaN !== Infinity",
	
	// Keywords
	"export default class Test extends Base {}",
	"import { something } from 'module';",
	"yield* generator()",
];

console.log("JavaScript Grammar Test\n" + "=".repeat(50));

for (const test of tests) {
	console.log(`\nInput: ${JSON.stringify(test)}`);
	const tokens = getTokens(test);
	console.log("Tokens:");
	tokens.forEach(t => {
		console.log(`  ${t.type.padEnd(12)} ${JSON.stringify(t.text)}`);
	});
}