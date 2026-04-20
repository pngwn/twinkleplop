import fs from "node:fs";
import path from "node:path";
import { tokenize } from "@twinkleplop/core";
import { verify } from "@twinkleplop/core/compile";
import { describe, expect, it, test } from "vitest";
import { grammar, language as make_language, raw_grammar } from "./index.js";

const language = make_language();

const yaml_path = path.join(import.meta.dirname, "..", "test");
const yaml_files = fs.readdirSync(yaml_path);

const input_files = yaml_files
	.filter((file) => file.endsWith(".yaml"))
	.map((file) => [file, fs.readFileSync(path.join(yaml_path, file), "utf-8")]);

const output_modules = import.meta.glob("../test/*.js", {
	eager: true,
}) as Record<string, { test: unknown }>;

const output_files = Object.entries(output_modules)
	.filter((module) => !module[0].includes("index.js"))
	.map((module) => [path.basename(module[0]), module[1].test]);

input_files.sort((a, b) => (a[0] as string).localeCompare(b[0] as string));
output_files.sort((a, b) => (a[0] as string).localeCompare(b[0] as string));

function get_tokens(input: string) {
	const result = language(input);
	const tokens = [] as Array<{
		type: string;
		start: number;
		end: number;
		match: string;
	}>;
	for (let i = 0; i < result.tokens.length / 3; i++) {
		const type = result.token_types[result.tokens[i * 3]];
		const start = result.tokens[i * 3 + 1];
		const end = result.tokens[i * 3 + 2];
		const match = input.substring(start, end);
		tokens.push({ type, start, end, match });
	}
	return tokens;
}

describe("YAML Grammar", () => {
	test("verify", () => {
		const issues = verify(raw_grammar);
		expect(issues).toEqual([]);
	});

	for (let i = 0; i < input_files.length; i++) {
		const test_name = (input_files[i][0] as string).replace(".yaml", "");
		it(`should tokenize ${test_name}`, () => {
			const tokens = get_tokens(input_files[i][1] as string);
			expect(tokens).toEqual(output_files[i][1]);
		});
	}
});
