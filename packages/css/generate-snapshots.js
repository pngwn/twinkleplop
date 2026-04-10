import { tokenize } from "@twinkleplop/core";
import { grammar } from "./src/index.js";
import fs from "node:fs";
import path from "node:path";

const test_dir = path.join(import.meta.dirname, "test");
const files = fs.readdirSync(test_dir);

const input_files = files
	.filter((file) => file.endsWith(".css"))
	.map((file) => [file, fs.readFileSync(path.join(test_dir, file), "utf-8")]);

function getTokens(input) {
	const result = tokenize(input, grammar);
	const tokens = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.tokenTypes[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const match = input.substring(start, end);
		tokens.push({ type, start, end, match });
	}
	return tokens;
}

const targets = process.argv.slice(2);

for (const [filename, content] of input_files) {
	const baseName = filename.replace(".css", "");
	if (targets.length > 0 && !targets.includes(baseName)) continue;
	const tokens = getTokens(content);
	const outputPath = path.join(test_dir, `${baseName}.output.js`);
	const output = `export const test = ${JSON.stringify(tokens, null, "\t")};\n`;
	fs.writeFileSync(outputPath, output);
	console.log(`Generated ${baseName}.output.js (${tokens.length} tokens)`);
}
