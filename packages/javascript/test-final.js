import { tokenize, compile } from "@twinkleplop/core";
import grammar from "./src/grammar.js";

const compiled = compile(grammar);

function test(input, expectedHas) {
	const result = tokenize(input, compiled);
	const tokens = [];
	
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.tokenTypes[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const text = input.slice(start, end);
		if (type) {
			tokens.push(`${type}:${JSON.stringify(text)}`);
		}
	}
	
	const tokenStr = tokens.join(" ");
	const pass = tokenStr.includes(expectedHas);
	
	console.log(`${pass ? "✓" : "✗"} ${input.padEnd(25)} → ${tokenStr}`);
	if (!pass) {
		console.log(`  Expected to contain: ${expectedHas}`);
	}
	return pass;
}

console.log("JavaScript Grammar - Regex vs Division Test");
console.log("=" .repeat(60));

console.log("\nDivision cases:");
test("a / b", 'operator:"/"');
test("10 / 2", 'operator:"/"');
test("(x + y) / z", 'operator:"/"');
test("foo() / bar()", 'operator:"/"');
test("this / that", 'operator:"/"');
test(") / x", 'operator:"/"');
test("] / y", 'operator:"/"');
test("} / z", 'operator:"/"');

console.log("\nRegex cases:");
test("/pattern/g", 'regex:');
test("return /test/", 'regex:');
test("throw /error/", 'regex:');
test("typeof /regex/", 'regex:');
test("x = /test/", 'regex:');
test("(/regex/)", 'regex:');
test("[/pattern/]", 'regex:');
test("{x: /test/}", 'regex:');
test("func(/test/)", 'regex:');

console.log("\nDivision assignment:");
test("x /= 2", 'operator:"/="');

console.log("\nComplex cases:");
test("x ? /a/ : /b/", 'regex:');
test("x ? a/b : c/d", 'operator:"/"');