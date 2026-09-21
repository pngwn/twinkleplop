import { describe, it, expect, test } from "vitest";
import { tokenize } from "@twinkleplop/core";
import { verify } from "@twinkleplop/core/compile";
import { grammar, raw_grammar } from "./index.js";
import fs from "node:fs";
import path from "node:path";

const test_dir = path.join(import.meta.dirname, "..", "test");
const files = fs.readdirSync(test_dir);

const input_files = files
  .filter((file) => file.endsWith(".rs"))
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

describe("Rust Grammar", () => {
  test("verify", () => {
    const issues = verify(raw_grammar);
    expect(issues).toEqual([]);
  });

  for (let i = 0; i < input_files.length; i++) {
    const test_name = input_files[i][0].replace(".rs", "");
    it(`should tokenize ${test_name}`, () => {
      const tokens = get_tokens(input_files[i][1]);
      expect(tokens).toEqual(output_files[i][1]);
    });
  }
});

describe("stack balance", () => {
  it("tokenizes the tail after 300 of every number form", () => {
    const unit =
      "let x = [1, 1.5, 1e5, 1.5e-3, 1_000, 0x1F, 0o17, 0b101, " +
      "1u8, 1.5f32, 1e5f64, 0xFFu16, 1e];\nlet r = 1..2;\n";
    const input = `${unit.repeat(300)}let s = "after";\nif x {}`;
    const tail = get_tokens(input)
      .slice(-5)
      .map((t) => [t.type, input.slice(t.start, t.end)]);
    expect(tail).toEqual([
      ["string", '"after"'],
      ["punctuation", ";"],
      ["keyword", "if"],
      ["identifier", "x"],
      ["punctuation", "{}"],
    ]);
  });
});
