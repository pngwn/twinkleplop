import { tokenize, compile } from "@twinkleplop/core";
import grammar from "./src/grammar-minimal-fix.js";

const compiled = compile(grammar);

function test(code, description, expectedPattern) {
	const result = tokenize(code, compiled);
	const tokens = [];
	
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.tokenTypes[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const text = code.slice(start, end);
		if (type) {
			tokens.push(`${type}:"${text}"`);
		}
	}
	
	const tokenStr = tokens.join(" ");
	const pass = !expectedPattern || tokenStr.includes(expectedPattern);
	
	console.log(`${pass ? "✓" : "✗"} ${description}`);
	if (!pass) {
		console.log(`  Code: ${code}`);
		console.log(`  Got: ${tokenStr}`);
		console.log(`  Expected to include: ${expectedPattern}`);
	}
	
	return pass;
}

console.log("Minimal Fix Grammar Test");
console.log("=".repeat(60));

// Basic functionality
test("// comment", "Single-line comment", 'comment:"// comment"');
test("/* block */", "Block comment", 'comment:"/* block */"');
test("'string'", "String single", 'string:"\'string\'"');
test('"string"', "String double", 'string:"\\"string\\""');
test("`template`", "Template literal", 'template:"`"');
test("123", "Number", 'number:"123"');
test("0xFF", "Hex number", 'number:"0xFF"');
test("true", "Boolean true", 'boolean:"true"');
test("false", "Boolean false", 'boolean:"false"');
test("null", "Null", 'keyword:"null"');
test("let x = 5", "Variable declaration", 'keyword:"let" identifier:"x"');
test("console.log", "Method call", 'identifier:"console"');

// Division cases
test("a / b", "Division", 'operator:"/"');
test("10 / 2", "Number division", 'operator:"/"');
test("(a + b) / c", "Grouped division", 'operator:"/"');
test("foo() / bar()", "Function division", 'operator:"/"');
test("this / that", "This division", 'operator:"/"');
test("x /= y", "Division assignment", 'operator:"/="');

// Regex cases
test("/pattern/g", "Regex with flag", 'regex:"/pattern/g"');
test("return /test/", "Return regex", 'regex:"/test/"');
test("throw /error/", "Throw regex", 'regex:"/error/"');
test("x = /test/g", "Assign regex", 'regex:"/test/g"');
test("(/test/)", "Grouped regex", 'regex:"/test/"');
test("[/pattern/]", "Array regex", 'regex:"/pattern/"');

// Complex cases
test("if (x > 0) { y / z }", "If with division", 'operator:"/"');
test("a ? b / c : d / e", "Ternary with division", 'operator:"/"');
test("new RegExp(/test/)", "New with regex", 'regex:"/test/"');

console.log("\n" + "=".repeat(60));