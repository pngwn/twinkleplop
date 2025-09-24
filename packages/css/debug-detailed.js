import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";

const testCode = `div {
	transform: translate(10px, 20px);
	transform: scaleX(2);
}`;

// Show character codes around the problem area
console.log("Character analysis around position 40-45:");
for (let i = 38; i < 45; i++) {
	const char = testCode[i];
	const code = testCode.charCodeAt(i);
	console.log(`  pos ${i}: '${char}' (code: ${code})`);
}

const result = tokenize(testCode, grammar);
const tokens = [];

console.log("\nTokens:");
for (let i = 0; i < result.tokens.length / 3; i++) {
	const type = result.tokenTypes[result.tokens[i * 3]];
	const start = result.tokens[i * 3 + 1];
	const end = result.tokens[i * 3 + 2];
	const text = testCode.slice(start, end);
	tokens.push({ type, text, start, end });
	console.log(`${i.toString().padStart(3)}: "${text}" → ${type} [${start}-${end}]`);
}