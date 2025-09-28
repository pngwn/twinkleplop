import { tokenize } from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
import raw_grammar from "./src/grammar-refactored.js";

// Compile the grammar first
const grammar = compile(raw_grammar);

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

// Test various JavaScript features
const tests = [
	// Comments
	"// Single line comment",
	"/* Multi-line comment */",
	
	// Variables and keywords
	"let foo = 42;",
	"const bar = 'hello';",
	"var baz = true;",
	
	// Special values
	"undefined === null",
	"NaN !== Infinity",
	
	// Numbers
	"0xFF",
	"0b1010",
	"0o777",
	"123n",
	"3.14",
	"1.5e-10",
	
	// Template literals
	"`Hello ${name}!`",
	
	// Regular expressions
	"/test.*pattern/gim",
	
	// Modern operators
	"a === b",
	"x >>>= 1",
	"...",
	"a ?? b",
	"x ** 2",
	"() => {}",
	
	// JavaScript-specific keywords
	"switch (x) { case 1: break; default: return; }",
	"debugger;",
	"yield value;",
	"class Foo { get x() {} set x(v) {} }",
	
	// Async/await
	"async function test() { await promise; }",
	
	// Try-catch
	"try { } catch (e) { } finally { }",
	
	// Modules
	"import { x } from 'module';",
	"export default class Foo {}",
];

console.log("Testing refactored JavaScript grammar...\n");
console.log("=" * 60);

let allPassed = true;

for (const test of tests) {
	try {
		const tokens = getTokens(test);
		console.log(`✓ ${test.substring(0, 50)}${test.length > 50 ? '...' : ''}`);
		
		// Show token details for the first few tests
		if (tests.indexOf(test) < 3) {
			tokens.forEach(t => {
				console.log(`    ${t.type.padEnd(12)} ${JSON.stringify(t.text)}`);
			});
		}
	} catch (error) {
		console.log(`✗ ${test.substring(0, 50)}${test.length > 50 ? '...' : ''}`);
		console.log(`    Error: ${error.message}`);
		allPassed = false;
	}
}

console.log("\n" + "=" * 60);
console.log(allPassed ? "All tests passed!" : "Some tests failed.");