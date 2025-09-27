import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";

const code = "div { transform: translateY(-100px); }";
console.log("Code:", code);

try {
	const result = tokenize(code, grammar);
	console.log("\nTokens:");
	
	for (let i = 0; i < result.tokens.length; i += 3) {
		const type = result.tokenTypes[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const text = code.substring(start, end);
		
		console.log(`  [${start}-${end}] ${type}: "${text}"`);
	}
} catch (e) {
	console.error("Error:", e);
}