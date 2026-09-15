import { describe, expect, test } from "vitest";
import { language as typescript } from "@twinkleplop/typescript";
import type { MarkdownOptions } from "@twinkleplop/markdown-core";
import markdown_it from "markdown-it";
import markdown_it_twinkleplop from "./index";

const ts = typescript();

function render(markdown: string, options: Partial<MarkdownOptions> = {}, env?: unknown): string {
  const md = markdown_it().use(markdown_it_twinkleplop, {
    languages: { ts, js: "ts" },
    ...options,
  });
  return md.render(markdown, env);
}

const fence = (info: string, code: string) => "```" + info + "\n" + code + "\n```\n";

describe("fences", () => {
  test("a highlighted fence replaces markdown-it's own markup", () => {
    const html = render(fence("ts {2}", "const a = 1;\nconst b = 2;"));
    expect(
      html.startsWith('<pre class="twinkleplop language-ts has-highlight" data-language="ts">'),
    ).toBe(true);
    expect(html.endsWith("</pre>\n")).toBe(true);
  });

  test("an alias keeps the name the author wrote", () => {
    expect(render(fence("js", "const a = 1;"))).toContain('data-language="js"');
  });

  test("a fence with no language falls back to the default renderer", () => {
    expect(render(fence("", "plain text"))).toBe("<pre><code>plain text\n</code></pre>\n");
  });

  test("the info string is unescaped before it is split", () => {
    expect(render(fence('ts title="a&amp;b"', "const a = 1;"))).toContain(
      '<figcaption class="twinkleplop-title">a&amp;b</figcaption>',
    );
  });

  test("an unknown language names the line, and the path when env carries one", () => {
    expect(() =>
      render("intro\n\n" + fence("rust", "fn main() {}"), {}, { path: "docs/guide.md" }),
    ).toThrow('unknown fence language "rust" at docs/guide.md:3');
    expect(() => render(fence("rust", "fn main() {}"))).toThrow(
      'unknown fence language "rust" at line 1',
    );
  });
});

describe("inline code", () => {
  test("is untouched by default", () => {
    expect(render("Inline `const x = 1{:ts}` in prose.")).toBe(
      "<p>Inline <code>const x = 1{:ts}</code> in prose.</p>\n",
    );
  });

  test("renders inline structure when enabled", () => {
    expect(render("Inline `const x = 1{:ts}` in prose.", { inline: "tailing-curly-colon" })).toBe(
      '<p>Inline <code class="twinkleplop-inline language-ts"><span class="tok keyword">const</span> ' +
        '<span class="tok constant">x</span> <span class="tok operator">=</span> ' +
        '<span class="tok number">1</span></code> in prose.</p>\n',
    );
  });

  test("code with no suffix keeps markdown-it's own markup", () => {
    expect(render("a `plain` b", { inline: "tailing-curly-colon" })).toBe(
      "<p>a <code>plain</code> b</p>\n",
    );
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
    const html = render(fence("ts", "const a = 1;").repeat(200), { languages });
    expect(resolutions).toBe(1);
    expect(calls).toBe(200);
    expect(html.match(/<pre /g)).toHaveLength(200);
  });
});
