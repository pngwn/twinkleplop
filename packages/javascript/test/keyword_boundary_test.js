import { tokenize } from "@twinkleplop/core";
import { grammar } from "../src/index.js";

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

console.log("Keyword Boundary Issue Test");
console.log("=".repeat(60));

const testCases = [
	// Problem cases - partial keyword matches
	{ code: `setTimeout`, expected: "identifier", description: "setTimeout contains 'set' keyword" },
	{ code: `setInterval`, expected: "identifier", description: "setInterval contains 'set' keyword" },
	{ code: `getter`, expected: "identifier", description: "getter contains 'get' keyword" },
	{ code: `setter`, expected: "identifier", description: "setter contains 'set' keyword" },
	{ code: `innerHTML`, expected: "identifier", description: "innerHTML contains 'in' keyword" },
	{ code: `doSomething`, expected: "identifier", description: "doSomething contains 'do' keyword" },
	{ code: `withCredentials`, expected: "identifier", description: "withCredentials contains 'with' keyword" },
	{ code: `classNames`, expected: "identifier", description: "classNames contains 'class' keyword" },
	{ code: `className`, expected: "identifier", description: "className contains 'class' keyword" },
	{ code: `forEach`, expected: "identifier", description: "forEach contains 'for' keyword" },
	{ code: `valueOf`, expected: "identifier", description: "valueOf contains 'of' keyword" },
	{ code: `instanceof`, expected: "keyword", description: "instanceof is a keyword" },
	{ code: `asyncFunction`, expected: "identifier", description: "asyncFunction contains 'async' keyword" },
	{ code: `awaitPromise`, expected: "identifier", description: "awaitPromise contains 'await' keyword" },
	{ code: `returnValue`, expected: "identifier", description: "returnValue contains 'return' keyword" },
	{ code: `tryAgain`, expected: "identifier", description: "tryAgain contains 'try' keyword" },
	{ code: `catchError`, expected: "identifier", description: "catchError contains 'catch' keyword" },
	{ code: `throwError`, expected: "identifier", description: "throwError contains 'throw' keyword" },
	{ code: `finallyBlock`, expected: "identifier", description: "finallyBlock contains 'finally' keyword" },
	{ code: `constructor`, expected: "identifier", description: "constructor contains 'const' keyword" },
	{ code: `variable`, expected: "identifier", description: "variable contains 'var' keyword" },
	{ code: `letters`, expected: "identifier", description: "letters contains 'let' keyword" },
	{ code: `thisValue`, expected: "identifier", description: "thisValue contains 'this' keyword" },
	{ code: `superintendent`, expected: "identifier", description: "superintendent contains 'super' keyword" },
	{ code: `nullish`, expected: "identifier", description: "nullish contains 'null' keyword" },
	{ code: `trueValue`, expected: "identifier", description: "trueValue contains 'true' keyword" },
	{ code: `falsePositive`, expected: "identifier", description: "falsePositive contains 'false' keyword" },
	{ code: `undefinedVariable`, expected: "identifier", description: "undefinedVariable contains 'undefined' keyword" },
	{ code: `newItem`, expected: "identifier", description: "newItem contains 'new' keyword" },
	{ code: `deleteButton`, expected: "identifier", description: "deleteButton contains 'delete' keyword" },
	{ code: `voidFunction`, expected: "identifier", description: "voidFunction contains 'void' keyword" },
	{ code: `typeofCheck`, expected: "identifier", description: "typeofCheck contains 'typeof' keyword" },
	
	// Actual keywords (should be detected correctly)
	{ code: `set`, expected: "keyword", description: "set is a keyword" },
	{ code: `get`, expected: "keyword", description: "get is a keyword" },
	{ code: `in`, expected: "keyword", description: "in is a keyword" },
	{ code: `do`, expected: "keyword", description: "do is a keyword" },
	{ code: `with`, expected: "keyword", description: "with is a keyword" },
	{ code: `class`, expected: "keyword", description: "class is a keyword" },
	{ code: `for`, expected: "keyword", description: "for is a keyword" },
	{ code: `of`, expected: "keyword", description: "of is a keyword" },
	{ code: `async`, expected: "keyword", description: "async is a keyword" },
	{ code: `await`, expected: "keyword", description: "await is a keyword" },
	{ code: `return`, expected: "keyword", description: "return is a keyword" },
	{ code: `try`, expected: "keyword", description: "try is a keyword" },
	{ code: `catch`, expected: "keyword", description: "catch is a keyword" },
	{ code: `throw`, expected: "keyword", description: "throw is a keyword" },
	{ code: `finally`, expected: "keyword", description: "finally is a keyword" },
	{ code: `const`, expected: "keyword", description: "const is a keyword" },
	{ code: `var`, expected: "keyword", description: "var is a keyword" },
	{ code: `let`, expected: "keyword", description: "let is a keyword" },
	{ code: `this`, expected: "keyword", description: "this is a keyword" },
	{ code: `super`, expected: "keyword", description: "super is a keyword" },
	{ code: `null`, expected: "keyword", description: "null is a keyword" },
	{ code: `true`, expected: "boolean", description: "true is a boolean literal" },
	{ code: `false`, expected: "boolean", description: "false is a boolean literal" },
	{ code: `undefined`, expected: "keyword", description: "undefined is a special value" },
	{ code: `new`, expected: "keyword", description: "new is a keyword" },
	{ code: `delete`, expected: "keyword", description: "delete is a keyword" },
	{ code: `void`, expected: "keyword", description: "void is a keyword" },
	{ code: `typeof`, expected: "keyword", description: "typeof is a keyword" },
];

let failures = 0;
let successes = 0;

for (const test of testCases) {
	const tokens = getTokens(test.code);
	const actualType = tokens[0]?.type || "none";
	const isCorrect = actualType === test.expected || 
	                  (test.expected === "identifier" && actualType === "function");
	
	if (!isCorrect) {
		console.log(`❌ FAIL: ${test.description}`);
		console.log(`   Code: "${test.code}"`);
		console.log(`   Expected: ${test.expected}, Got: ${actualType}`);
		console.log(`   Tokens:`, tokens.map(t => `${t.type}:"${t.text}"`).join(' '));
		failures++;
	} else {
		console.log(`✅ PASS: ${test.description}`);
		successes++;
	}
}

console.log("\n" + "=".repeat(60));
console.log(`Results: ${successes} passed, ${failures} failed out of ${testCases.length} tests`);
if (failures > 0) {
	console.log(`\n⚠️  ${failures} tests failed due to partial keyword matching`);
}