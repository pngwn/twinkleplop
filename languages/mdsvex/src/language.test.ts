import { describe, expect, it } from "vitest";
import type { TokenizeResult } from "@twinkleplop/core";
import { tokenize as js_tokenize } from "@twinkleplop/javascript";
import { tokenize as yaml_tokenize } from "@twinkleplop/yaml";
import { language, tokenize } from "./index.js";

const js = js_tokenize();
const yaml = yaml_tokenize();

function named(input: string, result: TokenizeResult) {
  const out: [string, string][] = [];
  for (let i = 0; i < result.tokens.length / 3; i++) {
    const start = result.tokens[i * 3 + 1];
    const end = result.tokens[i * 3 + 2];
    out.push([result.token_types[result.tokens[i * 3]], input.slice(start, end)]);
  }
  return out;
}

const run = (input: string) => named(input, tokenize()(input));

describe("embedding", () => {
  it("highlights front matter as yaml and imports as javascript", () => {
    const front = "title: Hi";
    const imports = "import A from './A.svelte'";
    const input = `---\n${front}\n---\n${imports}\n\n# Hi\n`;
    expect(run(input)).toEqual([
      ["front_matter_marker", "---\n"],
      ...named(front, yaml(front)),
      ["front_matter_marker", "\n---\n"],
      ...named(imports, js(imports)),
      ["heading_marker", "# "],
      ["heading", "Hi"],
    ]);
  });

  it("highlights script, style and expressions", () => {
    const tokens = run(
      "<script>\nlet a = 1;\n</script>\n\n<style>\np { color: red }\n</style>\n\n{a + 1}\n",
    );
    expect(tokens).toContainEqual(["keyword", "let"]);
    expect(tokens).toContainEqual(["property", "color"]);
    expect(tokens).toContainEqual(["operator", "+"]);
    expect(tokens.filter(([type]) => type.startsWith("raw_"))).toEqual([]);
  });

  it("highlights an expression inside emphasis", () => {
    const tokens = run("*total {a + 1}*");
    expect(tokens).toEqual([
      ["bold", "*"],
      ["bold", "total "],
      ["bold expression", "{"],
      ["bold identifier", "a"],
      ["bold operator", "+"],
      ["bold number", "1"],
      ["bold expression", "}"],
      ["bold", "*"],
    ]);
  });

  it("turns the braces of a block into punctuation", () => {
    expect(run("{#if a}\ntext\n{/if}\n")).toEqual([
      ["punctuation", "{"],
      ["punctuation", "#"],
      ["svelte_block", "if"],
      ["identifier", "a"],
      ["punctuation", "}"],
      ["punctuation", "{"],
      ["punctuation", "/"],
      ["svelte_block", "if"],
      ["punctuation", "}"],
    ]);
  });
});

describe("fences", () => {
  it("highlights the languages this package depends on", () => {
    const body = "const x = 1;";
    const input = `\`\`\`js\n${body}\n\`\`\`\n`;
    expect(run(input)).toEqual([
      ["code_fence", "```"],
      ["code_language", "js"],
      ...named(body, js(body)),
      ["code_fence", "```\n"],
    ]);
  });

  it("leaves a language it does not know as raw code", () => {
    expect(run("```rust\nfn main() {}\n```\n")).toContainEqual([
      "raw_code_block",
      "\nfn main() {}\n",
    ]);
  });

  it("takes more languages and lets them replace a default", () => {
    const upper = (input: string) => ({
      tokens: new Uint32Array([0, 0, input.length]),
      token_types: ["shout"],
    });
    const fn = tokenize({ languages: { rust: upper as never, js: upper as never } });
    for (const lang of ["rust", "js"]) {
      const input = `\`\`\`${lang}\nx\n\`\`\`\n`;
      expect(named(input, fn(input)).map(([type]) => type)).toContain("shout");
    }
  });
});

describe("language", () => {
  it("renders html", () => {
    const html = language()("# Hi _there_\n");
    expect(html).toContain('<span class="tok heading_marker"># </span>');
    expect(html).toContain('<span class="tok italic">_there_</span>');
  });
});
