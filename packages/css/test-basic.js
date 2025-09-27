import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";

const code = "div { color: red; }";
console.log("Code:", code);

try {
	const result = tokenize(code, grammar);
	console.log("Result:", result);
	console.log("\nTokens:");
	
	for (let i = 0; i < result.tokens.length; i += 3) {
		const typeIndex = result.tokens[i * 3];
		const type = result.tokenTypes[typeIndex];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const text = code.substring(start, end);
		
		console.log(`  [${start}-${end}] ${type}: "${text}"`);
		
		if (i > 20) {
			console.log("  ... (truncated)");
			break;
		}
	}
} catch (e) {
	console.error("Error:", e);
	console.error(e.stack);
}