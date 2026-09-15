import { describe, expect, test } from "vitest";
import { language as css } from "@twinkleplop/css";
import { language as typescript } from "@twinkleplop/typescript";
import { create_renderer } from "./render";
import type { MarkdownOptions } from "./types";

const ts = typescript();

const renderer = (extra: Partial<MarkdownOptions> = {}) =>
  create_renderer({ languages: { ts, js: "ts", css: css() }, ...extra });

const CODE = "const total = add(1, 2);\nconst other = 2;\nexport { total };\nexport { other };\n";

describe("language selection", () => {
  test("renders a fence through its registry entry", () => {
    const html = renderer().fence("ts", "", "const x = 1;\n");
    expect(html).toBe(
      '<pre class="twinkleplop language-ts" data-language="ts"><code>' +
        '<span class="l"><span class="tok keyword">const</span> <span class="tok constant">x</span>' +
        ' <span class="tok operator">=</span> <span class="tok number">1</span>' +
        '<span class="tok punctuation">;</span></span></code></pre>',
    );
  });

  test("an alias renders identically but keeps the name it was written with", () => {
    const md = renderer();
    const aliased = md.fence("js", "{1}", CODE);
    const target = md.fence("ts", "{1}", CODE);
    expect(aliased).toBe(
      target!
        .replace("language-ts", "language-js")
        .replace('data-language="ts"', 'data-language="js"'),
    );
  });

  test("a fence with no language is left to the toolchain", () => {
    expect(renderer().fence(undefined, "", "plain\n")).toBe(null);
    expect(renderer().fence("", "", "plain\n")).toBe(null);
  });

  test("default_language covers a fence with no language of its own", () => {
    const html = renderer({ default_language: "ts" }).fence(undefined, "", "const x = 1;\n");
    expect(html).toContain('data-language="ts"');
  });

  test("matching is case sensitive", () => {
    expect(() => renderer().fence("TS", "", "x\n")).toThrow('unknown fence language "TS"');
  });
});

describe("unknown languages", () => {
  test("throw with the language and the source location", () => {
    expect(() =>
      renderer().fence("rust", "", "fn main() {}\n", { file: "docs/a.md", line: 41 }),
    ).toThrow('unknown fence language "rust" at docs/a.md:41');
  });

  test('render as escaped plain text under "plain"', () => {
    const html = renderer({ on_unknown_language: "plain" }).fence("rust", "", 'let x = "<b>";\n');
    expect(html).toBe(
      '<pre class="twinkleplop language-rust" data-language="rust"><code>' +
        '<span class="l">let x = &quot;&lt;b&gt;&quot;;</span></code></pre>',
    );
  });

  test("a plain fence still honours the meta conventions", () => {
    const html = renderer({ on_unknown_language: "plain" }).fence(
      "rust",
      "{2} :line-numbers",
      "a\nb\n",
    );
    expect(html).toContain('<span class="l highlight"><span class="ln">2</span>b</span>');
  });
});

describe("line highlights", () => {
  test("highlights the named lines", () => {
    const html = renderer().fence("ts", "{2}", "const a = 1;\nconst b = 2;\n");
    expect(html).toContain('<span class="l highlight">');
    expect(html).toContain("has-highlight");
  });

  test("a line beyond the fence names the fence", () => {
    expect(() =>
      renderer().fence("ts", "{3}", "const a = 1;\nconst b = 2;\n", {
        file: "docs/a.md",
        line: 41,
      }),
    ).toThrow("line 3 is beyond the fence's 2 lines (`ts` fence at docs/a.md:41)");
  });

  test("a backwards range names the fence", () => {
    expect(() => renderer().fence("ts", "{2-1}", "a\nb\n")).toThrow(
      "line range 2-1 runs backwards",
    );
  });

  test("an id group adds data-highlighted-line-id to those lines only", () => {
    const html = renderer().fence("ts", "{1}#v", "const a = 1;\nconst b = 2;\n")!;
    expect(html).toContain('<span class="l highlight" data-highlighted-line-id="v">');
    expect(html.match(/data-highlighted-line-id/g)).toHaveLength(1);
  });
});

describe("word highlights", () => {
  test("wraps every occurrence", () => {
    const html = renderer().fence("ts", "/total/", CODE)!;
    expect(html.match(/tok highlighted-word/g)).toHaveLength(2);
  });

  test("an occurrence range picks a slice of them", () => {
    const html = renderer().fence("ts", "/total/2-2", CODE)!;
    expect(html.match(/tok highlighted-word/g)).toHaveLength(1);
    expect(html).toContain(
      '<span class="tok highlighted-word"><span class="tok identifier">total</span>',
    );
  });

  test("a word with no occurrence renders normally", () => {
    const plain = renderer().fence("ts", "", CODE);
    expect(renderer().fence("ts", "/nowhere/", CODE)).toBe(plain);
  });

  test("an id group adds data-chars-id to the wrapped tokens", () => {
    const html = renderer().fence("ts", "/total/#v", CODE)!;
    expect(html.match(/data-chars-id="v"/g)).toHaveLength(2);
  });
});

describe("line numbers", () => {
  test(":line-numbers=5 numbers from 5", () => {
    const html = renderer().fence("ts", ":line-numbers=5", "a;\nb;\n")!;
    expect(html).toContain('<span class="ln">5</span>');
    expect(html).toContain('<span class="ln">6</span>');
  });

  test("showLineNumbers{5} does the same", () => {
    const html = renderer().fence("ts", "showLineNumbers{5}", "a;\nb;\n")!;
    expect(html).toContain('<span class="ln">5</span>');
  });

  test(":no-line-numbers turns off the site default", () => {
    const md = renderer({ line_numbers: true });
    expect(md.fence("ts", "", "a;\n")).toContain('<span class="ln">1</span>');
    expect(md.fence("ts", ":no-line-numbers", "a;\n")).not.toContain("ln");
  });
});

describe("titles and captions", () => {
  test("a title wraps the block in a figure", () => {
    const html = renderer().fence("ts", 'title="math.ts"', "a;\n")!;
    expect(html.startsWith('<figure class="twinkleplop-block" data-language="ts">\n')).toBe(true);
    expect(html).toContain('<figcaption class="twinkleplop-title">math.ts</figcaption>');
    expect(html.endsWith("</figure>")).toBe(true);
  });

  test("a caption renders below the block", () => {
    const html = renderer().fence("ts", 'caption="the sum"', "a;\n")!;
    expect(html).toContain('</pre>\n<figcaption class="twinkleplop-caption">the sum</figcaption>');
  });

  test("a title is escaped", () => {
    const html = renderer().fence("ts", 'title="a\\"<b>"', "a;\n")!;
    expect(html).toContain('<figcaption class="twinkleplop-title">a\\&quot;&lt;b&gt;</figcaption>');
  });

  test("a fence with neither is a bare pre", () => {
    expect(renderer().fence("ts", "", "a;\n")!.startsWith("<pre")).toBe(true);
  });

  test("an empty body still renders the figure and captions", () => {
    expect(renderer().fence("ts", 'title="t" caption="c"', "")).toBe(
      '<figure class="twinkleplop-block" data-language="ts">\n' +
        '<figcaption class="twinkleplop-title">t</figcaption>\n' +
        '<pre class="twinkleplop language-ts" data-language="ts"><code><span class="l"></span></code></pre>\n' +
        '<figcaption class="twinkleplop-caption">c</figcaption>\n</figure>',
    );
  });
});

describe("twoslash", () => {
  test("the meta word routes to the entry's twoslash highlighter", () => {
    const md = create_renderer({
      languages: { ts: { highlight: ts, twoslash: () => "<pre>twoslashed</pre>" } },
    });
    expect(md.fence("ts", "twoslash", "a;\n")).toBe("<pre>twoslashed</pre>");
    expect(md.fence("ts", "", "a;\n")).toContain("twinkleplop");
  });

  test('twoslash: "always" routes every fence', () => {
    const md = create_renderer({
      languages: { ts: { highlight: ts, twoslash: () => "<pre>twoslashed</pre>" } },
      twoslash: "always",
    });
    expect(md.fence("ts", "", "a;\n")).toBe("<pre>twoslashed</pre>");
  });

  test("asking an entry with no twoslash highlighter names the fence", () => {
    expect(() => renderer().fence("ts", "twoslash", "a;\n")).toThrow(
      '"ts" has no twoslash highlighter (`ts` fence)',
    );
  });
});

describe("parse_meta", () => {
  test("receives the raw meta and the options the conventions produced", () => {
    let seen: unknown;
    const md = renderer({
      parse_meta: (raw, parsed) => {
        seen = { raw, overlays: parsed.overlays };
        return { ...parsed, class_name: parsed.class_name + " house" };
      },
    });
    const html = md.fence("ts", "{1} weird", "const a = 1;\n")!;
    expect(seen).toEqual({ raw: "{1} weird", overlays: [{ lines: [1], class: "highlight" }] });
    expect(html).toContain('class="twinkleplop language-ts house has-highlight"');
  });
});

describe("render defaults", () => {
  test("site render options sit under the per-fence ones", () => {
    const md = renderer({ render: { class_name: "site", attributes: { tabindex: 0 } } });
    const html = md.fence("ts", "", "a;\n")!;
    expect(html).toContain('<pre class="site language-ts" tabindex="0" data-language="ts">');
  });
});

describe("inline code", () => {
  test("is left alone by default", () => {
    expect(renderer().inline).toBe(false);
    expect(renderer().inline_code("const x = 1{:ts}")).toBe(null);
  });

  test("renders inline structure inside a twinkleplop-inline code element", () => {
    const md = renderer({ inline: "tailing-curly-colon" });
    expect(md.inline_code("const x = 1{:ts}")).toBe(
      '<code class="twinkleplop-inline language-ts">' +
        '<span class="tok keyword">const</span> <span class="tok constant">x</span>' +
        ' <span class="tok operator">=</span> <span class="tok number">1</span></code>',
    );
  });

  test("code with no suffix is left alone", () => {
    expect(renderer({ inline: "tailing-curly-colon" }).inline_code("const x = 1")).toBe(null);
  });

  test("an unknown inline language follows on_unknown_language", () => {
    const md = renderer({ inline: "tailing-curly-colon" });
    expect(() => md.inline_code("fn main(){:rust}")).toThrow('unknown inline code language "rust"');
    const plain = renderer({ inline: "tailing-curly-colon", on_unknown_language: "plain" });
    expect(plain.inline_code("a<b{:rust}")).toBe(
      '<code class="twinkleplop-inline language-rust">a&lt;b</code>',
    );
  });
});

describe("the fence body", () => {
  test("keeps tabs and drops only the trailing newline", () => {
    const html = renderer().fence("ts", "", "\tconst a = 1;\n\n")!;
    expect(html).toContain('<span class="l">\t<span class="tok keyword">const</span>');
    expect(html).toContain('<span class="l"></span></code>');
  });

  test("a language name from the document cannot break out of the markup", () => {
    const html = renderer({ on_unknown_language: "plain" }).fence('"><script>', "", "a\n")!;
    expect(html).not.toContain("<script>");
    expect(html).toContain('class="twinkleplop language-&quot;&gt;&lt;script&gt;"');
  });
});

describe("diagnostics from the highlighter", () => {
  test("keep their class and gain the position the toolchain knew", () => {
    const md = create_renderer({
      languages: {
        ts: () => {
          throw new RangeError("anchor `foo` not found");
        },
      },
    });
    expect(() => md.fence("ts", "", "a\n", { file: "docs/a.md", line: 7 })).toThrow(RangeError);
    expect(() => md.fence("ts", "", "a\n", { file: "docs/a.md", line: 7 })).toThrow(
      "anchor `foo` not found (`ts` fence at docs/a.md:7)",
    );
  });

  test("are untouched when the toolchain knows no position", () => {
    const md = create_renderer({
      languages: {
        ts: () => {
          throw new RangeError("anchor `foo` not found");
        },
      },
    });
    expect(() => md.fence("ts", "", "a\n")).toThrow("anchor `foo` not found");
  });
});
