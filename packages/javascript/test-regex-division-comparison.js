import { tokenize, compile } from "@twinkleplop/core";
import originalGrammar from "./src/grammar.js";
import fixedGrammar from "./src/grammar-fixed.js";

// Compile grammars
const originalCompiled = compile(originalGrammar);
const fixedCompiled = compile(fixedGrammar);

function getTokens(input, grammar) {
	const result = tokenize(input, grammar);
	const tokens = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.tokenTypes[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const text = input.slice(start, end);
		// Ignore whitespace tokens for cleaner output
		if (type) {
			tokens.push({ type, text });
		}
	}
	return tokens;
}

// Test cases with expected interpretations
const tests = [
	// Clear division cases
	{ code: "a / b", expectDivision: true },
	{ code: "10 / 2", expectDivision: true },
	{ code: "(a + b) / c", expectDivision: true },
	{ code: "foo() / bar()", expectDivision: true },
	{ code: "arr[0] / 5", expectDivision: true },
	{ code: "obj.prop / value", expectDivision: true },
	{ code: ") / x", expectDivision: true },
	{ code: "] / y", expectDivision: true },
	{ code: "} / z", expectDivision: true },
	{ code: "x++ / y", expectDivision: true },
	{ code: "y-- / 2", expectDivision: true },
	{ code: "this / that", expectDivision: true },
	{ code: "super / 2", expectDivision: true },
	{ code: "true / false", expectDivision: true },
	{ code: "null / undefined", expectDivision: true },
	
	// Clear regex cases
	{ code: "/pattern/g", expectDivision: false },
	{ code: "return /test/", expectDivision: false },
	{ code: "throw /error/", expectDivision: false },
	{ code: "typeof /regex/", expectDivision: false },
	{ code: "new /pattern/", expectDivision: false },
	{ code: "void /test/", expectDivision: false },
	{ code: "delete /prop/", expectDivision: false },
	{ code: "case /pattern/:", expectDivision: false },
	{ code: "x = /test/g", expectDivision: false },
	{ code: "y + /pattern/", expectDivision: false },
	{ code: "z - /regex/", expectDivision: false },
	{ code: "a * /test/", expectDivision: false },
	{ code: "b === /pattern/", expectDivision: false },
	{ code: "c && /regex/", expectDivision: false },
	{ code: "d || /test/", expectDivision: false },
	{ code: "(/test/)", expectDivision: false },
	{ code: "[/pattern/]", expectDivision: false },
	{ code: "{x: /regex/}", expectDivision: false },
	{ code: "func(/test/)", expectDivision: false },
	{ code: ", /regex/", expectDivision: false },
	{ code: "; /test/", expectDivision: false },
	
	// Division assignment
	{ code: "x /= 2", expectDivision: true },
	{ code: "a /= b", expectDivision: true },
	
	// Edge cases with method calls
	{ code: "/regex/.test(s)", expectDivision: false },
	{ code: "foo.bar() / 2", expectDivision: true },
	
	// After else keyword
	{ code: "else /test/", expectDivision: false },
	
	// Complex expressions
	{ code: "x ? a / b : c / d", expectDivision: true },
	{ code: "x ? /a/ : /b/", expectDivision: false },
];

console.log("Regex vs Division Disambiguation Test");
console.log("=" .repeat(60));

let originalCorrect = 0;
let fixedCorrect = 0;

for (const test of tests) {
	const originalTokens = getTokens(test.code, originalCompiled);
	const fixedTokens = getTokens(test.code, fixedCompiled);
	
	// Check if "/" was tokenized correctly
	const originalHasDivision = originalTokens.some(t => t.text === "/" && t.type === "operator");
	const originalHasRegex = originalTokens.some(t => t.type === "regex");
	const fixedHasDivision = fixedTokens.some(t => t.text === "/" && t.type === "operator");
	const fixedHasRegex = fixedTokens.some(t => t.type === "regex");
	
	const originalCorrectForTest = test.expectDivision ? originalHasDivision : originalHasRegex;
	const fixedCorrectForTest = test.expectDivision ? fixedHasDivision : fixedHasRegex;
	
	if (originalCorrectForTest) originalCorrect++;
	if (fixedCorrectForTest) fixedCorrect++;
	
	// Only show failures or improvements
	if (!originalCorrectForTest || !fixedCorrectForTest) {
		console.log(`\nTest: ${JSON.stringify(test.code)}`);
		console.log(`  Expected: ${test.expectDivision ? "division" : "regex"}`);
		console.log(`  Original: ${originalCorrectForTest ? "✓" : "✗"} ${originalHasDivision ? "division" : originalHasRegex ? "regex" : "neither"}`);
		console.log(`  Fixed:    ${fixedCorrectForTest ? "✓" : "✗"} ${fixedHasDivision ? "division" : fixedHasRegex ? "regex" : "neither"}`);
		
		if (!fixedCorrectForTest) {
			console.log(`  Fixed tokens:`, fixedTokens);
		}
	}
}

console.log("\n" + "=".repeat(60));
console.log(`Original grammar: ${originalCorrect}/${tests.length} correct`);
console.log(`Fixed grammar:    ${fixedCorrect}/${tests.length} correct`);

if (fixedCorrect > originalCorrect) {
	console.log(`\n✅ Fixed grammar improved by ${fixedCorrect - originalCorrect} cases!`);
} else if (fixedCorrect === originalCorrect) {
	console.log(`\n➡️ Fixed grammar performs the same as original`);
} else {
	console.log(`\n⚠️ Fixed grammar regressed by ${originalCorrect - fixedCorrect} cases`);
}