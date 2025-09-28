import { tokenize, compile } from "@twinkleplop/core";
import twoStateGrammar from "./src/grammar-two-state.js";

const grammar = compile(twoStateGrammar);

function debugTokenize(input) {
	console.log(`\nInput: "${input}"`);
	console.log("-".repeat(40));
	
	const result = tokenize(input, grammar);
	
	console.log("Raw tokens array:", result.tokens);
	console.log("Token types:", result.tokenTypes);
	
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const typeIndex = result.tokens[i * 3];
		const type = result.tokenTypes[typeIndex];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const text = input.slice(start, end);
		console.log(`Token ${i}: type="${type}" (${typeIndex}), text="${text}", pos=${start}-${end}`);
	}
}

debugTokenize("x++");
debugTokenize("++x");
debugTokenize("x + y");
debugTokenize("x++ + y");