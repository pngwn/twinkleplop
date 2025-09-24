import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";

const testCode = `.parent {
	color: blue;

	.child {
		color: red;
	}
}`;

console.log("Nested selector test:");
const result = tokenize(testCode, grammar);
for (let i = 0; i < result.tokens.length / 3; i++) {
	const type = result.tokenTypes[result.tokens[i * 3]];
	const start = result.tokens[i * 3 + 1];
	const end = result.tokens[i * 3 + 2];
	const text = testCode.slice(start, end);
	console.log(`  ${i.toString().padStart(2)}: "${text.replace(/\n/g, '\\n')}" → ${type} [${start}-${end}]`);
}