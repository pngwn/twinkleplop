import fs from "node:fs";
import path from "node:path";
import { tokenize } from "@twinkleplop/core";
import { verify } from "@twinkleplop/core/compile";
import { describe, expect, it, test } from "vitest";
import { grammar, raw_grammar } from "./index.js";

const test_dir = path.join(import.meta.dirname, "..", "test");
const files = fs.readdirSync(test_dir);

const input_files = files
	.filter((file) => file.endsWith(".go"))
	.map((file) => [file, fs.readFileSync(path.join(test_dir, file), "utf-8")]);

const output_modules = import.meta.glob("../test/*.output.js", {
	eager: true,
}) as Record<string, { test: string }>;

const output_files = Object.entries(output_modules).map((module) => [
	path.basename(module[0]),
	module[1].test,
]);

input_files.sort((a, b) => a[0].localeCompare(b[0]));
output_files.sort((a, b) => a[0].localeCompare(b[0]));

function get_tokens(input: string) {
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

describe("Go Grammar", () => {
	test("verify", () => {
		const issues = verify(raw_grammar);
		expect(issues).toEqual([]);
	});

	for (let i = 0; i < input_files.length; i++) {
		const test_name = input_files[i][0].replace(".go", "");
		it(`should tokenize ${test_name}`, () => {
			const tokens = get_tokens(input_files[i][1]);
			expect(tokens).toEqual(output_files[i][1]);
		});
	}
});
