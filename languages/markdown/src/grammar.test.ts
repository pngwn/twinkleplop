import { describe, expect, it, test } from "vitest";
import { verify } from "@twinkleplop/core/compile";
import fs from "node:fs";
import path from "node:path";
import { tokenize as make_language, raw_grammar } from "./index.js";

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

describe("stack balance", () => {
  // the state stack has 256 slots, a pop past it rereads the rest of the line as a new block
  it("tokenizes the tail after 300 of every block and inline form", () => {
    const unit = [
      "# Heading **bold",
      "## Tom & Jerry [x] here",
      "- item *open",
      "- [x] done `code",
      "* [link] &amp tail",
      "```js",
      "const x = 1;",
      "```",
      "~~~",
      "raw",
      "~~~",
      "---",
      "***x",
      "**nested \\",
      "line** _a ~~b [c](d",
      "[text](url) and [ref][label] <auto",
      "    indented code",
      "",
    ].join("\n");
    const input = `${unit.repeat(300)}some **b** # not a heading\n`;
    const tail = get_tokens(input)
      .slice(-4)
      .map((t) => [t.type, t.match]);
    expect(tail).toEqual([
      ["code_block", "    indented code\n"],
      ["bold", "**"],
      ["bold", "b"],
      ["bold", "**"],
    ]);
  });

  it("resumes the enclosing state after an entity or bare link text", () => {
    const input = "# Tom & Jerry [x] here\n**a &amp b [c] d** e\n";
    const tokens = get_tokens(input).map((t) => [t.type, t.match]);
    expect(tokens).toEqual([
      ["heading_marker", "#"],
      ["heading", " Tom "],
      ["entity", "&"],
      ["heading", " Jerry "],
      ["link_text", "["],
      ["link_text", "x"],
      ["link_text", "]"],
      ["heading", " here"],
      ["bold", "**"],
      ["bold", "a "],
      ["bold entity", "&amp"],
      ["bold", " b "],
      ["bold link_text", "["],
      ["bold link_text", "c"],
      ["bold link_text", "]"],
      ["bold", " d"],
      ["bold", "**"],
    ]);
  });
});
