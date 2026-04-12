import { language } from "./src/index.js";

const input = process.argv[2] || "let x: Vec<String> = Vec::new();";
const result = language(input);

for (let i = 0; i < result.tokens.length / 3; i++) {
	const type = result.token_types[result.tokens[i * 3]];
	const start = result.tokens[i * 3 + 1];
	const end = result.tokens[i * 3 + 2];
	console.log(`${type.padEnd(15)} [${start}-${end}] ${JSON.stringify(input.substring(start, end))}`);
}
