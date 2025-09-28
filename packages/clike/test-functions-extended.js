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
	"foo",
	"foo()",
	"foo(bar)",
	"foo (bar)",
	
	// Multiple calls
	"foo() bar()",
	"foo(bar()) baz",
	
	// Method calls
	"obj.method()",
	"obj.prop",
	"this.method()",
	
	// Complex cases
	"function myFunc() {}",
	"const result = calculate(x, y)",
	"array.map(item => item * 2)",
	
	// Edge cases
	"_private()",
	"$jquery()",
	"foo123()",
	"foo\n()",
	"foo\t()",
];

for (const test of tests) {
	console.log(`"${test.replace(/\n/g, '\\n').replace(/\t/g, '\\t')}":`);
	const tokens = getTokens(test);
	tokens.forEach(t => {
		const displayText = t.text.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
		console.log(`  ${t.type.padEnd(15)} "${displayText}"`);
	});
	console.log();
}