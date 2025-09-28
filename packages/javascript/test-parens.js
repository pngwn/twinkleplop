import { tokenize, compile } from "@twinkleplop/core";
import grammar from "./src/grammar.js";

const compiled = compile(grammar);

function test(input) {
	console.log(`\nInput: "${input}"`);
	const result = tokenize(input, compiled);
	
	console.log("Raw tokens:", result.tokens);
	console.log("Token types:", result.tokenTypes);
	
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const typeIdx = result.tokens[i * 3];
		const type = result.tokenTypes[typeIdx];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const text = input.slice(start, end);
		console.log(`  [${i}] type="${type}" (${typeIdx}), text="${text}", pos=${start}-${end}`);
	}
}

test("(");
test("foo");
test("foo(");
test("foo()");
test("foo(bar)");