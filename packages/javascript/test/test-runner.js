import { tokenize } from "@twinkleplop/core";
import { grammar } from "../src/index.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// Get all test files
const testFiles = fs.readdirSync(__dirname)
	.filter(f => f.endsWith('.txt'))
	.sort();

console.log("JavaScript Grammar Test Suite");
console.log("=" .repeat(60));

for (const file of testFiles) {
	console.log(`\n📁 Testing: ${file}`);
	console.log("-".repeat(40));
	
	const content = fs.readFileSync(path.join(__dirname, file), 'utf-8');
	const lines = content.split('\n').slice(0, 5); // Show first 5 lines
	
	console.log("Sample input:");
	lines.forEach(line => {
		if (line.trim()) console.log(`  ${line}`);
	});
	
	const tokens = getTokens(content);
	
	// Statistics
	const stats = {};
	for (const token of tokens) {
		stats[token.type] = (stats[token.type] || 0) + 1;
	}
	
	console.log("\nToken statistics:");
	for (const [type, count] of Object.entries(stats).sort((a,b) => b[1] - a[1])) {
		console.log(`  ${type.padEnd(15)} ${count}`);
	}
	
	// Show a few interesting tokens
	const interesting = tokens.filter(t => 
		['template', 'async', 'await', 'arrow', 'spread', 'regex'].some(s => 
			t.type.includes(s) || t.text.includes(s)
		)
	).slice(0, 3);
	
	if (interesting.length > 0) {
		console.log("\nInteresting tokens:");
		interesting.forEach(t => {
			console.log(`  ${t.type.padEnd(15)} "${t.text}"`);
		});
	}
}

console.log("\n" + "=".repeat(60));
console.log("✅ Test suite complete!");