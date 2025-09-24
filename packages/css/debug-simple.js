import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";

const testCode = `div {
	transform: translate(10px, 20px);
	transform: scaleX(2);
}`;

const result = tokenize(testCode, grammar);
const tokens = [];

for (let i = 0; i < result.tokens.length / 3; i++) {
	const type = result.tokenTypes[result.tokens[i * 3]];
	const start = result.tokens[i * 3 + 1];
	const end = result.tokens[i * 3 + 2];
	const text = testCode.slice(start, end);
	tokens.push({ type, text, start, end });
	console.log(`${i.toString().padStart(3)}: "${text}" → ${type} [${start}-${end}]`);
}