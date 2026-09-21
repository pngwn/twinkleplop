import fs from "node:fs";
import path from "node:path";
import { tokenize } from "@twinkleplop/core";
import type { TokenizeResult } from "@twinkleplop/core";
import { verify } from "@twinkleplop/core/compile";
import { describe, expect, it, test } from "vitest";
import { grammar, tokenize as make_language, raw_grammar } from "./index.js";

const language = make_language();

const jsonc_path = path.join(import.meta.dirname, "..", "test");
const jsonc_files = fs.readdirSync(jsonc_path);

const input_files = jsonc_files
  .filter((file) => file.endsWith(".jsonc"))
  .map((file) => [file, fs.readFileSync(path.join(jsonc_path, file), "utf-8")]);

const output_modules = import.meta.glob("../test/*.js", {
  eager: true,
}) as Record<string, { test: unknown }>;

const output_files = Object.entries(output_modules)
  .filter((module) => !module[0].includes("index.js"))
  .map((module) => [path.basename(module[0]), module[1].test]);

input_files.sort((a, b) => (a[0] as string).localeCompare(b[0] as string));
output_files.sort((a, b) => (a[0] as string).localeCompare(b[0] as string));

function to_list(input: string, result: TokenizeResult) {
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

const get_tokens = (input: string) => to_list(input, language(input));
const pairs = (input: string, result: TokenizeResult = language(input)) =>
  to_list(input, result).map(({ type, match }) => [type, match]);

describe("JSONC Grammar", () => {
  test("verify", () => {
    const issues = verify(raw_grammar);
    expect(issues).toEqual([]);
  });

  for (let i = 0; i < input_files.length; i++) {
    const test_name = (input_files[i][0] as string).replace(".jsonc", "");
    it(`should tokenize ${test_name}`, () => {
      const tokens = get_tokens(input_files[i][1] as string);
      expect(tokens).toEqual(output_files[i][1]);
    });
  }
});

// crlf lives here since formatters and git can rewrite fixture line endings
describe("CRLF input", () => {
  it("ends a line comment before the \\r", () => {
    expect(pairs('// c\r\n"a": 1')).toEqual([
      ["comment", "// c"],
      ["property", '"a"'],
      ["punctuation", ":"],
      ["number", "1"],
    ]);
  });

  it("ends an unterminated string before the \\r", () => {
    expect(pairs('["a\r\n, 1]')).toEqual([
      ["punctuation", "["],
      ["string", '"a'],
      ["punctuation", ","],
      ["number", "1"],
      ["punctuation", "]"],
    ]);
  });

  it("continues a string after a backslash-CRLF, as after backslash-LF", () => {
    expect(pairs('"a\\\r\nb"')).toEqual([
      ["string", '"a'],
      ["string_escape", "\\\r\n"],
      ["string", 'b"'],
    ]);
  });
});

describe("stack balance", () => {
  it("tokenizes the tail after more repeats of every construct than the stack has slots", () => {
    const unit =
      '{"k\\"\\u0041": -1.5e+3, "u": "\\u12", /* c ** */ "w": .5 NaN trueish, // x\n' +
      '"b": [0, 1., 1e, -, "s\\\nt", "open\n]},';
    const input = `[${unit.repeat(400)} "end": true]`;
    expect(pairs(input).slice(-4)).toEqual([
      ["property", '"end"'],
      ["punctuation", ":"],
      ["boolean", "true"],
      ["punctuation", "]"],
    ]);
  });
});

describe("key promotion", () => {
  it("is gated on the property fidelity tag", () => {
    const input = '{"a": "b"}';
    const low = make_language({ fidelity: "low" });
    expect(pairs(input, low(input))).toEqual([
      ["punctuation", "{"],
      ["string", '"a"'],
      ["punctuation", ":"],
      ["string", '"b"'],
      ["punctuation", "}"],
    ]);
    expect(pairs(input, make_language({ fidelity: ["property"] })(input))[1]).toEqual([
      "property",
      '"a"',
    ]);
  });

  it("does not run in the raw grammar", () => {
    const input = '{"a": 1}';
    expect(pairs(input, tokenize(input, grammar))[1]).toEqual(["string", '"a"']);
  });
});
