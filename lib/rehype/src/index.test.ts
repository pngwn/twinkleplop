import { describe, expect, test } from "vitest";
import { language as typescript } from "@twinkleplop/typescript";
import type { MarkdownOptions } from "@twinkleplop/markdown-core";
import type { RehypeOptions } from "./index";
import rehype_stringify from "rehype-stringify";
import remark_parse from "remark-parse";
import remark_rehype from "remark-rehype";
import { unified } from "unified";
import rehype_twinkleplop from "./index";
import { markup } from "./markup";

const ts = typescript();

function render(markdown: string, options: Partial<RehypeOptions> = {}, path?: string): string {
  const pipeline = unified()
    .use(remark_parse)
    .use(remark_rehype, { allowDangerousHtml: true })
    .use(rehype_twinkleplop, { languages: { ts, js: "ts" }, ...options })
    .use(rehype_stringify, { allowDangerousHtml: true });
  const input = path === undefined ? markdown : { path, value: markdown };
  return pipeline.processSync(input).toString();
}

const fence = (info: string, code: string) => "```" + info + "\n" + code + "\n```\n";

describe("fences", () => {
  test("the documented fence renders the documented markup", () => {
    const html = render(
      fence(
        'ts {1,3-4} /total/ :line-numbers=10 title="math.ts"',
        "const total = add(1, 2);\nconst other = 2;\nexport { total };\nexport { other };",
      ),
    );
    expect(html).toBe(
      '<figure class="twinkleplop-block" data-language="ts">\n' +
        '<figcaption class="twinkleplop-title">math.ts</figcaption>\n' +
        '<pre class="twinkleplop language-ts has-highlight has-highlighted-word" data-language="ts"><code>' +
        '<span class="l highlight"><span class="ln">10</span><span class="tok keyword">const</span> ' +
        '<span class="tok highlighted-word"><span class="tok constant">total</span></span> ' +
        '<span class="tok operator">=</span> <span class="tok function">add</span>' +
        '<span class="tok punctuation">(</span><span class="tok number">1</span>' +
        '<span class="tok punctuation">,</span> <span class="tok number">2</span>' +
        '<span class="tok punctuation">);</span></span>\n' +
        '<span class="l"><span class="ln">11</span><span class="tok keyword">const</span> ' +
        '<span class="tok constant">other</span> <span class="tok operator">=</span> ' +
        '<span class="tok number">2</span><span class="tok punctuation">;</span></span>\n' +
        '<span class="l highlight"><span class="ln">12</span><span class="tok keyword">export</span> ' +
        '<span class="tok punctuation">{</span> <span class="tok highlighted-word">' +
        '<span class="tok identifier">total</span></span> <span class="tok punctuation">};</span></span>\n' +
        '<span class="l highlight"><span class="ln">13</span><span class="tok keyword">export</span> ' +
        '<span class="tok punctuation">{</span> <span class="tok identifier">other</span> ' +
        '<span class="tok punctuation">};</span></span></code></pre>\n</figure>',
    );
  });

  test("a fence with no language is left untouched", () => {
    expect(render(fence("", "plain text"))).toBe("<pre><code>plain text\n</code></pre>");
  });

  test("the body reaches the highlighter with entities decoded and tabs kept", () => {
    const html = render(fence("ts", "\tconst a = \"<b> & 'c'\";"), { output: "raw" });
    expect(html).toContain('<span class="l">\t<span class="tok keyword">const</span>');
    expect(html).toContain("&lt;b&gt; &amp; &#39;c&#39;");
  });

  test("an unknown language names the file and line", () => {
    expect(() => render("intro\n\n" + fence("rust", "fn main() {}"), {}, "docs/guide.md")).toThrow(
      'unknown fence language "rust" at docs/guide.md:3',
    );
  });

  test("a line beyond the fence names the fence and the location", () => {
    expect(() =>
      render(fence("ts", "const a = 1;\nconst b = 2;").replace("ts", "ts {3}"), {}, "a.md"),
    ).toThrow("line 3 is beyond the fence's 2 lines (`ts` fence at a.md:1)");
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

  test("code with no suffix keeps markdown-it's own markup", () => {
    expect(render("a `plain` b", { inline: "tailing-curly-colon" })).toBe(
      "<p>a <code>plain</code> b</p>",
    );
  });
});

describe("a tree that did not come from markdown", () => {
  const tree = () => {
    const code = {
      type: "element",
      tagName: "code",
      properties: { className: ["language-ts"], metastring: "{1}" },
      children: [{ type: "text", value: "const a = 1;\n" }],
    };
    return {
      type: "root",
      children: [{ type: "element", tagName: "pre", properties: {}, children: [code] }],
    };
  };

  test("reads the language from the class and the meta from a metastring attribute", () => {
    const root = tree();
    rehype_twinkleplop({ languages: { ts } })(root as never);
    const block = root.children[0] as unknown as { type: string; tagName: string };
    expect(block.type).toBe("element");
    expect(block.tagName).toBe("pre");
  });

  test('output: "raw" puts the block in as one raw node instead', () => {
    const root = tree();
    rehype_twinkleplop({ languages: { ts }, output: "raw" })(root as never);
    const block = root.children[0] as unknown as { type: string; value: string };
    expect(block.type).toBe("raw");
    expect(block.value).toContain('<span class="l highlight">');
  });
});

describe("output modes", () => {
  test("the default needs nothing of the stringifier", () => {
    const html = unified()
      .use(remark_parse)
      .use(remark_rehype)
      .use(rehype_twinkleplop, { languages: { ts } })
      .use(rehype_stringify)
      .processSync(fence("ts", "const a = 1;"))
      .toString();
    expect(html).toContain('<pre class="twinkleplop language-ts" data-language="ts">');
  });

  test("both modes mean the same markup", () => {
    const document = fence('ts {1} /a/ title="t"', "const a = \"<b> & 'c'\";");
    expect(markup(render(document))).toEqual(markup(render(document, { output: "raw" })));
  });

  test("they differ only in how the stringifier spells entities", () => {
    const document = fence("ts", "const a = '<b>';");
    expect(render(document, { output: "raw" })).toContain("&lt;b&gt;");
    expect(render(document)).toContain("&#x3C;b>");
  });
});

describe("cost", () => {
  test("a 200 fence document reuses one highlighter", () => {
    let calls = 0;
    const counting = (code: string) => {
      calls++;
      return ts(code);
    };
    let resolutions = 0;
    const languages = {
      get ts() {
        resolutions++;
        return counting;
      },
    };
    const document = fence("ts", "const a = 1;").repeat(200);
    const html = render(document, { languages });
    expect(resolutions).toBe(1);
    expect(calls).toBe(200);
    expect(html.match(/<pre /g)).toHaveLength(200);
  });
});
