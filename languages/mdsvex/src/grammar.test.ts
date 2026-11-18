import { describe, it, expect, test } from "vitest";
import { tokenize } from "@twinkleplop/core";
import { verify } from "@twinkleplop/core/compile";
import { grammar, raw_grammar } from "./index.js";
import fs from "node:fs";
import path from "node:path";

const test_dir = path.join(import.meta.dirname, "..", "test");
const input_files = fs
  .readdirSync(test_dir)
  .filter((file) => file.endsWith(".svx"))
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

const pairs = (input: string) => get_tokens(input).map((token) => [token.type, token.match]);

describe("mdsvex grammar", () => {
  test("verify", () => {
    const issues = verify(raw_grammar);
    expect(issues).toEqual([]);
  });

  test("every fixture has a snapshot", () => {
    expect(output_files.map(([file]) => file)).toEqual(
      input_files.map(([file]) => file.replace(".svx", ".output.js")),
    );
  });

  for (let i = 0; i < input_files.length; i++) {
    const test_name = input_files[i][0].replace(".svx", "");
    it(`should tokenize ${test_name}`, () => {
      const tokens = get_tokens(input_files[i][1]);
      expect(tokens).toEqual(output_files[i][1]);
    });
  }
});

describe("emphasis", () => {
  it("keeps the two delimiters apart", () => {
    expect(pairs("_a_ *b*")).toEqual([
      ["italic_open", "_"],
      ["italic", "a"],
      ["italic_close", "_"],
      ["bold_open", "*"],
      ["bold", "b"],
      ["bold_close", "*"],
    ]);
  });

  it.each(["snake_case_word", "2*3*4", "a * b * c", "_ a _", "_never closed", "a*b* c"])(
    "reads %s as text",
    (input) => {
      expect(pairs(input)).toEqual([]);
    },
  );

  it("closes strong before an underscore", () => {
    expect(pairs("_*a*_ b").map(([type]) => type)).toEqual([
      "italic_open",
      "bold_open",
      "bold",
      "bold_close",
      "italic_close",
    ]);
  });

  it("nests a doubled delimiter", () => {
    expect(pairs("**a** __b__ ***c***")).toEqual([
      ["bold_open", "**"],
      ["bold", "a"],
      ["bold_close", "**"],
      ["italic_open", "__"],
      ["italic", "b"],
      ["italic_close", "__"],
      ["bold_open", "***"],
      ["bold", "c"],
      ["bold_close", "***"],
    ]);
    expect(pairs("_a _b_ c_").map(([type]) => type)).toEqual([
      "italic_open",
      "italic",
      "italic_open",
      "italic",
      "italic_close",
      "italic",
      "italic_close",
    ]);
  });

  it("does not close after whitespace", () => {
    expect(pairs("_foo bar _")).toEqual([]);
  });

  it("stops at the end of a line", () => {
    expect(pairs("*a _b\nc*")).toEqual([]);
    expect(pairs("[a *b](u)\nc* d").slice(-2)).toEqual([
      ["url", "u"],
      ["url_link", ")"],
    ]);
  });
});

describe("lookahead", () => {
  it.each([
    ["[text] alone", []],
    ["AT&T", []],
    ["a :tada: b", []],
    ["a < b", []],
    ["x^2 + y^2", []],
    ["~ 5", []],
  ])("reads %s as text", (input, expected) => {
    expect(pairs(input)).toEqual(expected);
  });

  it("gives a rejected delimiter the heading token", () => {
    expect(pairs("# a: b & c [d] e_f")).toEqual([
      ["heading_marker", "# "],
      ["heading", "a: b & c [d] e_f"],
    ]);
  });

  it("tells a tag from an autolink", () => {
    expect(pairs("<svelte:head>").map(([type]) => type)).toEqual([
      "punctuation",
      "keyword",
      "punctuation",
      "tag_name",
      "punctuation",
    ]);
    expect(pairs("<https://a.b/c>")).toEqual([
      ["autolink_open", "<"],
      ["autolink", "https://a.b/c"],
      ["autolink_close", ">"],
    ]);
    expect(pairs('<a href="https://a.b">')[1]).toEqual(["tag_name", "a"]);
  });
});

describe("code spans", () => {
  it("runs over a line end but not a blank line", () => {
    expect(pairs("a `b\nc` d")).toEqual([
      ["code_open", "`"],
      ["code", "b\nc"],
      ["code_close", "`"],
    ]);
    expect(pairs("a `b\n\nc` d")).toEqual([]);
  });

  it("closes on a run of the same length", () => {
    const tokens = pairs("` `` ` b");
    expect(tokens.map(([type]) => type).join(" ")).toMatch(/^code_open (code )+code_close$/);
    expect(tokens.map(([, text]) => text).join("")).toBe("` `` `");
  });
});

describe("directives", () => {
  it("reads a directive in a label, in link text and in emphasis", () => {
    for (const input of [":a[x :b[y](k=v) z]", "[x :b[y](k=v) z](/u)", "_x :b[y](k=v) z_"]) {
      expect(pairs(input)).toContainEqual(["function", "b"]);
      expect(pairs(input)).toContainEqual(["parameter", "k"]);
    }
  });

  it.each([
    "::name some text",
    "::name:",
    ":::name [x]",
    "::name(k=v) junk",
    ":: name",
    "::1name",
    ":d[unclosed",
    "see ::toc and :tada: at 10:30 with std::vector",
  ])("reads %s as text", (input) => {
    expect(pairs(input)).toEqual([]);
  });

  it("keeps a text colon in the style around it", () => {
    expect(pairs("*a: b*")).toEqual([
      ["bold_open", "*"],
      ["bold", "a: b"],
      ["bold_close", "*"],
    ]);
  });
});

describe("blocks", () => {
  it("tells a thematic break from strong", () => {
    expect(pairs("***\n")).toEqual([["hr", "***\n"]]);
    expect(pairs("***a***\n")[0]).toEqual(["bold_open", "***"]);
    expect(pairs("---a\n")).toEqual([]);
  });

  it("reads imports after a blank line but not after content", () => {
    const scripts = (input: string) =>
      pairs(input)
        .filter(([type]) => type === "raw_script")
        .map(([, text]) => text.trim());
    expect(scripts("import a from 'a'\n\nimport b from 'b'\n")).toEqual([
      "import a from 'a'",
      "import b from 'b'",
    ]);
    expect(pairs("# a\n\nimport b from 'b'\n").map(([type]) => type)).not.toContain("raw_script");
  });
});

describe("fences", () => {
  it("closes on at least as many backticks as opened it", () => {
    const input = "````md\n```js\nx\n```\n`````\nafter _a_\n";
    expect(pairs(input)).toEqual([
      ["code_fence", "````"],
      ["code_language", "md"],
      ["raw_code_block", "\n```js\nx\n```\n"],
      ["code_fence", "`````\n"],
      ["italic_open", "_"],
      ["italic", "a"],
      ["italic_close", "_"],
    ]);
  });

  it("keeps a line with text after the backticks as code", () => {
    const input = "```\n``` js\n```\n";
    expect(pairs(input)).toEqual([
      ["code_fence", "```"],
      ["raw_code_block", "\n``` js\n"],
      ["code_fence", "```\n"],
    ]);
  });

  it("runs an unclosed fence to the end", () => {
    expect(pairs("```js\nlet x\n").at(-1)).toEqual(["raw_code_block", "\nlet x\n"]);
  });
});

describe("stack balance", () => {
  // the stack has 256 slots, a frame leaked per line sends a later close to the wrong state
  it("tokenizes the tail after 300 of every line form", () => {
    const unit = [
      "# heading _a_ *b* `c` [d](e) :f[g](h=i) &amp; <J k={l} /> {m}",
      "para _a *b ~~c `d [e](f",
      "_unclosed *nested [link text",
      "a_b c*d [x] y & z : w < v ^ u ~ t",
      "x^2^ H~2~O $`m`$ ``c`` `#!js x`",
      "- [ ] task",
      "- # heading in item",
      "12. ordered *item",
      "> quote _a",
      "> > nested",
      "| a | *b | `c |",
      "| - | :-: |",
      "[ref]: /url 'title'",
      "[^note]: text _a",
      "::leaf[label *a](k=v, q='r'",
      "::leaf(k=",
      ":::container[open [nested",
      ":::",
      ":inline[label _a [b](c=",
      "![alt [x](y",
      "[![img](a)](b)",
      "<https://example.com",
      "<b>bold</b> <Component a='b {c}' {d} />",
      "{#if a}{:else}{/if}{@html b}",
      "```js",
      "code _a [b {c",
      "```",
      "````",
      "```",
      "````",
      "---",
      "text\\",
      "",
    ].join("\n");
    const input = `${unit}\n`.repeat(300) + "_a_ :b[c](d=e) <F g={h} />";
    const tail = get_tokens(input)
      .slice(-21)
      .map((token) => [token.type, token.match]);
    expect(tail).toEqual([
      ["italic_open", "_"],
      ["italic", "a"],
      ["italic_close", "_"],
      ["punctuation", ":"],
      ["function", "b"],
      ["link_text_open", "["],
      ["link_text", "c"],
      ["link_text_close", "]"],
      ["punctuation", "("],
      ["parameter", "d"],
      ["operator", "="],
      ["string", "e"],
      ["punctuation", ")"],
      ["punctuation", "<"],
      ["tag_name", "F"],
      ["attr_name", "g"],
      ["operator", "="],
      ["expression", "{"],
      ["raw_svelte_expression", "h"],
      ["expression", "}"],
      ["punctuation", "/>"],
    ]);
  });
});
