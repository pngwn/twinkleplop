import { describe, it, expect, test } from "vitest";
import { tokenize } from "@twinkleplop/core";
import { verify } from "@twinkleplop/core/compile";
import { grammar, raw_grammar } from "./index.js";
import fs from "node:fs";
import path from "node:path";

const test_path = path.join(import.meta.dirname, "..", "test");
const test_files = fs.readdirSync(test_path);

const input_files = test_files
  .filter((file) => file.endsWith(".ini"))
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

describe("INI Grammar", () => {
  test("verify", () => {
    const issues = verify(raw_grammar);
    expect(issues).toEqual([]);
  });

  for (let i = 0; i < input_files.length; i++) {
    const test_name = input_files[i][0].replace(".ini", "");
    it(`should tokenize ${test_name}`, () => {
      const tokens = get_tokens(input_files[i][1]);
      expect(tokens).toEqual(output_files[i][1]);
    });
  }
});

const shape = (input: string) => get_tokens(input).map(({ type, match }) => [type, match]);

describe("INI line handling", () => {
  test("every construct repeated past the stack size tokenizes like the first", () => {
    const block = [
      "[section]",
      "  [indented header] ; c",
      '[a "quoted ] sub" [nested]]',
      "[unclosed [header",
      "key = value ; comment",
      'path: C:\\dir\\ "dq \\" x" \'sq',
      "\tindented_key = v \\",
      "\t\tcontinued",
      "",
      "    # comment in the run",
      "bare",
      "Name[de]=a;b;",
      "",
    ].join("\n");
    const first = shape(block);
    const many = shape(block.repeat(300));
    expect(many.slice(-first.length)).toEqual(first);
  });

  test("CRLF line endings tokenize like LF", () => {
    const lf = ["[s]", "k = v ; c", "  more", '\tkey: "x" \\', "done"].join("\n") + "\n";
    const crlf = lf.replace(/\n/g, "\r\n");
    expect(shape(crlf)).toEqual(shape(lf));
  });

  test("input may end inside any construct", () => {
    expect(shape("[sec")).toEqual([
      ["punctuation", "["],
      ["namespace", "sec"],
    ]);
    expect(shape('[a "b')).toEqual([
      ["punctuation", "["],
      ["namespace", "a "],
      ["string", '"b'],
    ]);
    expect(shape('k = "open')).toEqual([
      ["property", "k"],
      ["operator", "="],
      ["string", '"open'],
    ]);
    expect(shape("k = x \\")).toEqual([
      ["property", "k"],
      ["operator", "="],
      ["plain_scalar", "x"],
      ["plain_scalar", "\\"],
    ]);
    expect(shape("key:")).toEqual([
      ["property", "key"],
      ["operator", ":"],
    ]);
    expect(shape("[s]\n   ")).toEqual([
      ["punctuation", "["],
      ["namespace", "s"],
      ["punctuation", "]"],
    ]);
  });

  test("a key's indent decides which indented lines continue it", () => {
    const input = ["  a = 1", "    b = 2", "  c = 3", "d = 4", " e"].join("\n");
    expect(shape(input)).toEqual([
      ["property", "a"],
      ["operator", "="],
      ["plain_scalar", "1"],
      ["plain_scalar", "b"],
      ["plain_scalar", "="],
      ["plain_scalar", "2"],
      ["property", "c"],
      ["operator", "="],
      ["plain_scalar", "3"],
      ["property", "d"],
      ["operator", "="],
      ["plain_scalar", "4"],
      ["plain_scalar", "e"],
    ]);
  });
});
