import { tokenize, compile } from "@twinkleplop/core";
import grammar from "./src/grammar-minimal-fix.js";

const compiled = compile(grammar);

function debug(code) {
	console.log(`Code: ${code}`);
	const result = tokenize(code, compiled);
	
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.tokenTypes[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const text = code.slice(start, end);
		if (type) {
			console.log(`  ${type}: "${text}"`);
		}
	}
}

debug("new RegExp(/test/)");
debug("func(/test/)");
debug("(/test/)");