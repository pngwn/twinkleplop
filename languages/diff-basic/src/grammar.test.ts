import { describe, it, expect, test } from "vitest";
import { tokenize } from "@twinkleplop/core";
import { verify } from "@twinkleplop/core/compile";
import { grammar, raw_grammar } from "./index.js";
import fs from "node:fs";
import path from "node:path";

const test_path = path.join(import.meta.dirname, "..", "test");
const test_files = fs.readdirSync(test_path);

const input_files = test_files
  .filter((file) => file.endsWith(".txt"))
  .map((file) => [file, fs.readFileSync(path.join(test_path, file), "utf-8")]);

const output_modules = import.meta.glob("../test/*.js", {
  eager: true,
}) as Record<string, { test: string }>;

const output_files = Object.entries(output_modules)
  .filter((module) => !module[0].includes("index.js"))
  .map((module) => [path.basename(module[0]), module[1].test]);

input_files.sort((a, b) => a[0].localeCompare(b[0]));
output_files
  .sort((a, b) => a[0].localeCompare(b[0]))
  .filter((file) => !file[0].includes(".output.js"));

function get_tokens(input: string) {
  const result = tokenize(input, grammar);
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

describe("Diff Basic Grammar", () => {
  test("verify", () => {
    const issues = verify(raw_grammar);
    expect(issues).toEqual([]);
  });

  for (let i = 0; i < input_files.length; i++) {
    const test_name = input_files[i][0].replace(".txt", "");
    it(`should tokenize ${test_name}`, () => {
      const tokens = get_tokens(input_files[i][1]);
      expect(tokens).toEqual(output_files[i][1]);
    });
  }
});

describe("stack balance", () => {
  // the state stack has 256 slots, a pop past it loses multi char patterns such as the hunk marker
  it("tokenizes the tail after 300 of every hunk header form", () => {
    const unit = "@@ -1,2 +1,2 @@ fn\n-a\n+b\n@@@ -1 -1 +1 @@@\n";
    const input = `${unit.repeat(300)}+c\n@@ -9 +9 @@\n`;
    const tail = get_tokens(input)
      .slice(-8)
      .map((t) => [t.type, t.match]);
    expect(tail).toEqual([
      ["inserted_marker", "+"],
      ["inserted", "c"],
      ["label", "@@"],
      ["punctuation", "-"],
      ["number", "9"],
      ["punctuation", "+"],
      ["number", "9"],
      ["label", "@@"],
    ]);
  });
});
