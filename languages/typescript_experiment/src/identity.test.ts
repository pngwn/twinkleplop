import fs from "node:fs";
import path from "node:path";
import { language as ts_language } from "@twinkleplop/typescript";
import { describe, expect, it } from "vitest";
import { language as ts_exp_language } from "./index.js";

// end-to-end parity check: after the full language pipeline (tokenize +
// reclassify), the experimental package produces the same final tokens as
// @twinkleplop/typescript. this test asserts on the reclassified output
// because that's what consumers actually see.

const ts_test_dir = path.join(
	import.meta.dirname,
	"..",
	"..",
	"typescript",
	"test",
);
const files = fs
	.readdirSync(ts_test_dir)
	.filter((f) => f.endsWith(".txt"))
	.sort();

function decode(result: { tokens: Uint32Array; token_types: string[] }) {
	const out = [];
	for (let i = 0; i < result.tokens.length / 3; i++) {
		out.push({
			type: result.token_types[result.tokens[i * 3]],
			start: result.tokens[i * 3 + 1],
			end: result.tokens[i * 3 + 2],
		});
	}
	return out;
}

describe("typescript_experiment — end-to-end parity with @twinkleplop/typescript", () => {
	for (const file of files) {
		const content = fs.readFileSync(path.join(ts_test_dir, file), "utf-8");
		it(`produces matching tokens for ${file}`, () => {
			const ts_tokens = decode(ts_language(content));
			const exp_tokens = decode(ts_exp_language(content));
			expect(exp_tokens).toEqual(ts_tokens);
		});
	}
});
