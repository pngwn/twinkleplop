import { describe, it, expect, test } from "vitest";
import { tokenize } from "@twinkleplop/core";
import { verify } from "@twinkleplop/core/compile";
import { grammar, raw_grammar } from "./index.js";
import fs from "node:fs";
import path from "node:path";

const test_dir = path.join(import.meta.dirname, "..", "test");
const input_files = fs
  .readdirSync(test_dir)
  .filter((file) => file.endsWith(".env"))
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
    const match = input.substring(start, end);
    tokens.push({ type, start, end, match });
  }
  return tokens;
}

describe("dotenv grammar", () => {
  test("verify", () => {
    const issues = verify(raw_grammar);
    expect(issues).toEqual([]);
  });

  test("every fixture has a snapshot", () => {
    expect(output_files.map(([file]) => file)).toEqual(
      input_files.map(([file]) => file.replace(".env", ".output.js")),
    );
  });

  for (let i = 0; i < input_files.length; i++) {
    const test_name = input_files[i][0].replace(".env", "");
    it(`should tokenize ${test_name}`, () => {
      const tokens = get_tokens(input_files[i][1]);
      expect(tokens).toEqual(output_files[i][1]);
    });
  }
});

describe("stack balance", () => {
  // the stack has 256 slots, a frame leaked per use sends the closing } to the wrong state
  it("tokenizes the tail after 300 of every line form", () => {
    const unit = [
      "# comment",
      "export KEY=value # c",
      "export=1",
      "exported value junk # c",
      "PORT=5432",
      "RATIO=-0.5 # c",
      "DEBUG=true",
      "IP=1.2.3.4",
      "EMPTY=",
      "BARE",
      "Q='It\\'s ${A}'",
      "T=`x`",
      'D="a\\n${A:-${B:+c}}$C$(d $(e) (f))"',
      "U=${A:-${B:?e}} $C $(d (e)) \\$",
      "OPEN=${A:-${B",
      "OPEN_CMD=$(a (b",
      'ABORT="${A:-"x"}"',
      'ABORT_CMD="$(a "b")"',
      'MULTI="${A',
      '}"',
      "HASH=${A:-#c}",
      "REF=$VAR",
      "K: v",
      "ключ=значение",
    ].join("\n");
    const input = `${unit}\n`.repeat(300) + 'AFTER="${A:-${B}}"';
    const tail = get_tokens(input)
      .slice(-11)
      .map((t) => [t.type, t.match]);
    expect(tail).toEqual([
      ["property", "AFTER"],
      ["operator", "="],
      ["string", '"'],
      ["punctuation", "${"],
      ["variable", "A"],
      ["operator", ":-"],
      ["punctuation", "${"],
      ["variable", "B"],
      ["punctuation", "}"],
      ["punctuation", "}"],
      ["string", '"'],
    ]);
  });
});
