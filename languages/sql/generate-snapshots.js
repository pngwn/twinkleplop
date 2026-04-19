import { tokenize } from "@twinkleplop/core";
import { grammar } from "./dist/index.js";
import fs from "node:fs";
import path from "node:path";

const test_dir = path.join(import.meta.dirname, "test");
const files = fs.readdirSync(test_dir);

const input_files = files
	.filter((file) => file.endsWith(".sql"))
	.map((file) => [file, fs.readFileSync(path.join(test_dir, file), "utf-8")]);

function get_tokens(input) {
	const result = tokenize(input, grammar);
	const tokens = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.token_types[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		tokens.push({ type, start, end });
	}
	return tokens;
}

const targets = process.argv.slice(2);

for (const [filename, content] of input_files) {
	const base_name = filename.replace(".sql", "");
	if (targets.length > 0 && !targets.includes(base_name)) continue;
	const tokens = get_tokens(content);
	const output_path = path.join(test_dir, `${base_name}.output.js`);
	const output = `export const test = ${JSON.stringify(tokens, null, "\t")};\n`;
	fs.writeFileSync(output_path, output);
	console.log(`Generated ${base_name}.output.js (${tokens.length} tokens)`);
}
