import { tokenize } from "@twinkleplop/core";
import grammar from "./src/grammar.js";

// Simple test of -- vs - tokenization
const tests = [
	{ code: ".test { margin: -10px; }", desc: "Negative number" },
	{ code: ".test { --var: blue; }", desc: "CSS variable definition" },
	{ code: ".test { color: var(--theme); }", desc: "CSS variable in var()" },
];

for (const { code, desc } of tests) {
	console.log(`\n${desc}: "${code}"`);
	try {
		const result = tokenize(code, grammar);
		const tokens = [];
		
		for (let i = 0; i < result.tokens.length; i += 3) {
			const type = result.tokenTypes[result.tokens[i * 3]];
			const start = result.tokens[i * 3 + 1];
			const end = result.tokens[i * 3 + 2];
			const text = code.substring(start, end);
			tokens.push(`${type}:"${text}"`);
		}
		
		console.log("  →", tokens.join(" "));
	} catch (e) {
		console.log("  ERROR:", e.message);
	}
}