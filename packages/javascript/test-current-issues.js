import { tokenize, compile } from "@twinkleplop/core";
import grammar from "./src/grammar.js";

const compiled = compile(grammar);

function test(code, description) {
	console.log(`\nTest: ${description}`);
	console.log(`Code: ${JSON.stringify(code)}`);
	
	const result = tokenize(code, compiled);
	const tokens = [];
	
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.tokenTypes[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const text = code.slice(start, end);
		if (type) {
			tokens.push(`${type}:${JSON.stringify(text)}`);
		}
	}
	
	console.log("Tokens:", tokens.join(" "));
}

// Test basic functionality
test("// comment", "Single-line comment");
test("/* block */", "Block comment");
test("let x = 5", "Variable declaration");
test("function foo() {}", "Function declaration");
test("console.log('hello')", "Function call");
test("if (true) { }", "If statement");
test("const arr = [1, 2, 3]", "Array literal");
test("x + y", "Addition");
test("a / b", "Division");
test("/regex/g", "Regex");