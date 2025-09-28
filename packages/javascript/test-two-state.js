import { tokenize, compile } from "@twinkleplop/core";
import twoStateGrammar from "./src/grammar-two-state.js";

// Compile grammar
const grammar = compile(twoStateGrammar);

function getTokens(input) {
	const result = tokenize(input, grammar);
	const tokens = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.tokenTypes[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const text = input.slice(start, end);
		if (type) {
			tokens.push({ type, text });
		}
	}
	return tokens;
}

// Test cases
const tests = [
	// Basic functionality
	{ code: "// comment", expect: "comment" },
	{ code: "/* block */", expect: "comment" },
	{ code: "'string'", expect: "string" },
	{ code: '"string"', expect: "string" },
	{ code: "`template`", expect: "template" },
	{ code: "123", expect: "number" },
	{ code: "0xFF", expect: "number" },
	{ code: "true", expect: "boolean" },
	{ code: "false", expect: "boolean" },
	{ code: "null", expect: "keyword" },
	{ code: "identifier", expect: "identifier" },
	{ code: "func()", expect: "function" },
	
	// Division cases
	{ code: "a / b", expect: "division", check: "/" },
	{ code: "10 / 2", expect: "division", check: "/" },
	{ code: "(a + b) / c", expect: "division", check: "/" },
	{ code: "foo() / bar()", expect: "division", check: "/" },
	{ code: "this / that", expect: "division", check: "/" },
	{ code: "super / 2", expect: "division", check: "/" },
	
	// Regex cases  
	{ code: "/pattern/g", expect: "regex" },
	{ code: "return /test/", expect: "regex" },
	{ code: "throw /error/", expect: "regex" },
	{ code: "x = /test/g", expect: "regex" },
	{ code: "(/test/)", expect: "regex" },
	{ code: "[/pattern/]", expect: "regex" },
	{ code: "func(/test/)", expect: "regex" },
	
	// Complex cases
	{ code: "x++ + y", expect: "correct operators" },
	{ code: "++x + y", expect: "correct operators" },
	{ code: "a /= b", expect: "division assignment" },
];

console.log("Two-State Grammar Test");
console.log("=".repeat(60));

let passed = 0;
let failed = 0;

for (const test of tests) {
	const tokens = getTokens(test.code);
	let success = false;
	
	if (test.check === "/") {
		// Check for division operator
		success = tokens.some(t => t.text === "/" && t.type === "operator");
	} else if (test.expect === "regex") {
		// Check for regex token
		success = tokens.some(t => t.type === "regex");
	} else if (test.expect === "division assignment") {
		// Check for /= operator
		success = tokens.some(t => t.text === "/=" && t.type === "operator");
	} else if (test.expect) {
		// Check for specific token type
		success = tokens.some(t => t.type === test.expect);
	} else {
		// General success (no errors)
		success = tokens.length > 0;
	}
	
	if (success) {
		passed++;
		console.log(`✓ ${test.code}`);
	} else {
		failed++;
		console.log(`✗ ${test.code}`);
		console.log(`  Tokens:`, tokens.map(t => `${t.type}:"${t.text}"`).join(" "));
	}
}

console.log("\n" + "=".repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
	console.log("✅ All tests passed!");
}