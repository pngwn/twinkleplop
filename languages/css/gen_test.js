import { grammar } from "./src/index.js";
import { tokenize } from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
import fs from "node:fs";
import path from "node:path";

const css_path = path.join(import.meta.dirname, "test");
const css_files = fs.readdirSync(css_path);

const input_files = css_files
	.filter((file) => file.endsWith(".css"))
	.map((file) => [file, fs.readFileSync(path.join(css_path, file), "utf-8")]);

for (const [file, input] of input_files) {
	// console.log(file, input);
	const tokens = get_tokens(input, grammar);
	const name = path.basename(file).split(".")[0];
	fs.writeFileSync(
		path.join(import.meta.dirname, "test", `${name}.output.js`),
		`export const test = ${JSON.stringify(tokens, null, 2)};`
	);
}

function get_tokens(input, compiled) {
	const result = tokenize(input, compiled);
	// console.log(result);
	const tokens = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.token_types[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const match = input.substring(start, end);
		tokens.push({ type, start, end, match });
	}
	return tokens;
}
