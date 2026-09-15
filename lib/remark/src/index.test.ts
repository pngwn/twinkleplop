import { describe, expect, test } from "vitest";
import { language as typescript } from "@twinkleplop/typescript";
import type { MarkdownOptions } from "@twinkleplop/markdown-core";
import rehype_stringify from "rehype-stringify";
import remark_parse from "remark-parse";
import remark_rehype from "remark-rehype";
import { unified } from "unified";
import remark_twinkleplop from "./index";

const ts = typescript();

function render(markdown: string, options: Partial<MarkdownOptions> = {}, path?: string): string {
  const pipeline = unified()
    .use(remark_parse)
    .use(remark_twinkleplop, { languages: { ts, js: "ts" }, ...options })
    .use(remark_rehype, { allowDangerousHtml: true })
    .use(rehype_stringify, { allowDangerousHtml: true });
  const input = path === undefined ? markdown : { path, value: markdown };
  return pipeline.processSync(input).toString();
}

const fence = (info: string, code: string) => "```" + info + "\n" + code + "\n```\n";

describe("fences", () => {
  test("a highlighted fence becomes an html node", () => {
    const html = render(fence("ts {2}", "const a = 1;\nconst b = 2;"));
    expect(
      html.startsWith('<pre class="twinkleplop language-ts has-highlight" data-language="ts">'),
    ).toBe(true);
    expect(html).toContain('<span class="l highlight">');
  });

  test("an alias keeps the name the author wrote", () => {
    expect(render(fence("js", "const a = 1;"))).toContain('data-language="js"');
  });

  test("a fence with no language is left untouched", () => {
    expect(render(fence("", "plain text"))).toBe("<pre><code>plain text\n</code></pre>");
  });

  test("a title wraps the block in a figure", () => {
    const html = render(fence('ts title="math.ts"', "const a = 1;"));
    expect(html).toContain('<figcaption class="twinkleplop-title">math.ts</figcaption>');
  });

  test("an unknown language names the file and line", () => {
    expect(() => render("intro\n\n" + fence("rust", "fn main() {}"), {}, "docs/guide.md")).toThrow(
      'unknown fence language "rust" at docs/guide.md:3',
    );
  });

  test('on_unknown_language: "plain" renders escaped text in the block markup', () => {
    const html = render(fence("rust", 'let x = "<b>";'), { on_unknown_language: "plain" });
    expect(html).toBe(
      '<pre class="twinkleplop language-rust" data-language="rust"><code>' +
        '<span class="l">let x = &quot;&lt;b&gt;&quot;;</span></code></pre>',
    );
  });
});

describe("inline code", () => {
  test("is untouched by default", () => {
    expect(render("Inline `const x = 1{:ts}` in prose.")).toBe(
      "<p>Inline <code>const x = 1{:ts}</code> in prose.</p>",
    );
  });

  test("renders inline structure when enabled", () => {
    expect(render("Inline `const x = 1{:ts}` in prose.", { inline: "tailing-curly-colon" })).toBe(
      '<p>Inline <code class="twinkleplop-inline language-ts"><span class="tok keyword">const</span> ' +
        '<span class="tok constant">x</span> <span class="tok operator">=</span> ' +
        '<span class="tok number">1</span></code> in prose.</p>',
    );
  });
});

describe("nested content", () => {
  test("a fence inside a list or a quote is highlighted too", () => {
    const html = render("- item\n\n  ```ts\n  const a = 1;\n  ```\n");
    expect(html).toContain('<pre class="twinkleplop language-ts"');
  });
});
