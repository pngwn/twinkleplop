import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";
import fs from "node:fs";
import path from "node:path";

const test_dir = path.join(process.cwd(), "test");
const files = fs.readdirSync(test_dir).filter(f => f.endsWith(".txt"));

function getTokens(input) {
	const result = tokenize(input, grammar);
	const tokens = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.tokenTypes[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const text = input.slice(start, end);
		tokens.push({ type, text, start, end });
	}
	return tokens;
}

for (const file of files) {
	console.log(`\n=== ${file} ===`);
	const content = fs.readFileSync(path.join(test_dir, file), "utf-8");
	console.log("Input:", JSON.stringify(content));
	const tokens = getTokens(content);
	console.log("Tokens:");
	tokens.forEach(t => {
		console.log(`  ${t.type.padEnd(15)} "${t.text}" [${t.start}-${t.end}]`);
	});
}