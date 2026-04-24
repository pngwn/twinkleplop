import { describe, expect, it, test } from "vitest";
import { verify } from "@twinkleplop/core/compile";
import fs from "node:fs";
import path from "node:path";
import { language as make_language, raw_grammar } from "./index.js";

const language = make_language();

const md_path = path.join(import.meta.dirname, "..", "test");
const md_files = fs
  .readdirSync(md_path)
  .filter((file) => file.endsWith(".md"))
  .sort();

function get_tokens(input: string) {
  const result = language(input);
  const tokens: {
    type: string;
    start: number;
    end: number;
    match: string;
  }[] = [];
  for (let i = 0; i < result.tokens.length / 3; i++) {
    const type = result.token_types[result.tokens[i * 3]];
    const start = result.tokens[i * 3 + 1];
    const end = result.tokens[i * 3 + 2];
    const match = input.substring(start, end);
    tokens.push({ type, start, end, match });
  }
  return tokens;
}

describe("Markdown Grammar", () => {
  test("verify", () => {
    const issues = verify(raw_grammar);
    expect(issues).toEqual([]);
  });

  for (const file of md_files) {
    const test_name = file.replace(".md", "");
    it(`should tokenize ${test_name}`, async () => {
      const input = fs.readFileSync(path.join(md_path, file), "utf-8");
      const tokens = get_tokens(input);
      const snapshot_path = path.join(md_path, `${test_name}.output.js`);
      const payload = `export const test = ${JSON.stringify(tokens, null, "\t")};\n`;
      await expect(payload).toMatchFileSnapshot(snapshot_path);
    });
  }
});
