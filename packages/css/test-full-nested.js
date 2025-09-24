import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";
import fs from 'fs';

const testCode = fs.readFileSync('./test/nested_selectors.css', 'utf-8');

console.log("Full nested selector test:");
const result = tokenize(testCode, grammar);
console.log(`Total tokens: ${result.tokens.length / 3}`);

// Show first 20 tokens
for (let i = 0; i < Math.min(20, result.tokens.length / 3); i++) {
	const type = result.tokenTypes[result.tokens[i * 3]];
	const start = result.tokens[i * 3 + 1];
	const end = result.tokens[i * 3 + 2];
	const text = testCode.slice(start, end);
	console.log(`  ${i.toString().padStart(2)}: "${text.replace(/\n/g, '\\n').replace(/\t/g, '\\t')}" → ${type} [${start}-${end}]`);
}