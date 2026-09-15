// the three plugins take the same options and produce the same html for the
// same fence; only how they hand it back to their toolchain differs.
//
// remark and markdown-it hand back the string, so they match byte for byte.
// rehype hands back hast by default and the pipeline's stringifier spells
// entities its own way, so it is compared as markup rather than as bytes.

import { describe, expect, test } from "vitest";
import { language as typescript } from "@twinkleplop/typescript";
import type { MarkdownOptions } from "@twinkleplop/markdown-core";
import markdown_it from "markdown-it";
import markdown_it_twinkleplop from "@twinkleplop/markdown-it";
import remark_twinkleplop from "@twinkleplop/remark";
import rehype_stringify from "rehype-stringify";
import remark_parse from "remark-parse";
import remark_rehype from "remark-rehype";
import { unified } from "unified";
import rehype_twinkleplop from "./index";
import { markup } from "./markup";

const ts = typescript();

function options(extra: Partial<MarkdownOptions>): MarkdownOptions {
  return { languages: { ts, js: "ts" }, ...extra };
}

function through_rehype(markdown: string, extra: Partial<MarkdownOptions> = {}): string {
  return unified()
    .use(remark_parse)
    .use(remark_rehype, { allowDangerousHtml: true })
    .use(rehype_twinkleplop, options(extra))
    .use(rehype_stringify, { allowDangerousHtml: true })
    .processSync(markdown)
    .toString()
    .trim();
}

function through_remark(markdown: string, extra: Partial<MarkdownOptions> = {}): string {
  return unified()
    .use(remark_parse)
    .use(remark_twinkleplop, options(extra))
    .use(remark_rehype, { allowDangerousHtml: true })
    .use(rehype_stringify, { allowDangerousHtml: true })
    .processSync(markdown)
    .toString()
    .trim();
}

function through_markdown_it(markdown: string, extra: Partial<MarkdownOptions> = {}): string {
  return markdown_it().use(markdown_it_twinkleplop, options(extra)).render(markdown).trim();
}

const DOCUMENT =
  '```ts {1,3-4} /total/ :line-numbers=10 title="math.ts"\n' +
  "const total = add(1, 2);\n" +
  "const other = 2;\n" +
  "export { total };\n" +
  "export { other };\n" +
  "```\n";

describe("the same fence through each plugin", () => {
  test("produces the same html", () => {
    const remark = through_remark(DOCUMENT);
    expect(through_markdown_it(DOCUMENT)).toBe(remark);
    expect(markup(through_rehype(DOCUMENT))).toEqual(markup(remark));
  });

  test("covers every convention the same way", () => {
    const document =
      '```ts {1}#g /const/#w showLineNumbers{3} caption="c"\nconst a = 1;\nconst b = 2;\n```\n';
    const remark = through_remark(document);
    expect(remark).toContain('data-highlighted-line-id="g"');
    expect(remark).toContain('data-chars-id="w"');
    expect(remark).toContain('<span class="ln">3</span>');
    expect(remark).toContain('<figcaption class="twinkleplop-caption">c</figcaption>');
    expect(through_markdown_it(document)).toBe(remark);
    expect(markup(through_rehype(document))).toEqual(markup(remark));
  });

  test("agrees on inline code", () => {
    const document = "Inline `const x = 1{:ts}` in prose.";
    const extra: Partial<MarkdownOptions> = { inline: "tailing-curly-colon" };
    const remark = through_remark(document, extra);
    expect(remark).toContain('<code class="twinkleplop-inline language-ts">');
    expect(through_markdown_it(document, extra)).toBe(remark);
    expect(markup(through_rehype(document, extra))).toEqual(markup(remark));
  });

  test("agrees on an aliased fence", () => {
    const document = "```js\nconst a = 1;\n```\n";
    const remark = through_remark(document);
    expect(remark).toContain('data-language="js"');
    expect(through_markdown_it(document)).toBe(remark);
    expect(markup(through_rehype(document))).toEqual(markup(remark));
  });

  test("agrees on an unknown language rendered as plain text", () => {
    const document = "```rust\nfn main() {}\n```\n";
    const extra: Partial<MarkdownOptions> = { on_unknown_language: "plain" };
    const remark = through_remark(document, extra);
    expect(through_markdown_it(document, extra)).toBe(remark);
    expect(markup(through_rehype(document, extra))).toEqual(markup(remark));
  });
});
