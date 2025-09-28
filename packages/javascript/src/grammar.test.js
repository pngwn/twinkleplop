import { describe, it, expect } from "vitest";
import { tokenize } from "@twinkleplop/core";
import { grammar } from "./index.js";
import fs from "node:fs";
import path from "node:path";

const test_dir = path.join(import.meta.dirname, "..", "test");
const files = fs.readdirSync(test_dir);

const input_files = files
	.filter((file) => file.endsWith(".txt"))
	.map((file) => [file, fs.readFileSync(path.join(test_dir, file), "utf-8")]);

const output_modules = import.meta.glob("../test/*.js", {
	eager: true,
});

const output_files = Object.entries(output_modules)
	.filter((module) => !module[0].includes("index.js"))
	.map((module) => [path.basename(module[0]), module[1].default]);
// Sort both arrays to ensure they match
input_files.sort((a, b) => a[0].localeCompare(b[0]));
output_files
	.sort((a, b) => a[0].localeCompare(b[0]))
	.filter((file) => !file[0].includes(".output.js"));

function getTokens(input) {
	const result = tokenize(input, grammar);
	const tokens = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.tokenTypes[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		tokens.push({ type, start, end });
	}
	return tokens;
}

describe("C-Like Grammar", () => {
	for (let i = 0; i < input_files.length; i++) {
		const testName = input_files[i][0].replace(".txt", "");
		it(`should tokenize ${testName}`, () => {
			const tokens = getTokens(input_files[i][1]);
			console.log(tokens);
			expect(tokens).toEqual(output_files[i][1]);
		});
	}
});
