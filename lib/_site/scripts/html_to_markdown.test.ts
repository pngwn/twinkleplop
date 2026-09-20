import { describe, it, expect } from "vitest";
import { page_to_markdown } from "./html_to_markdown.mjs";

const ctx = { url: "https://twinkleplop.pngwn.at/docs/x", origin: "https://twinkleplop.pngwn.at" };

const page = (body: string) =>
  page_to_markdown(`<main class="pane"><div class="content">${body}</div></main>`, ctx) ?? "";

describe("page_to_markdown", () => {
  it("keeps a twoslash popover out of the code", () => {
    // the shape @twinkleplop/twoslash emits
    const md = page(`<div class="code">
      <div class="head"><span class="fname">a<span class="ext">.ts</span></span> <span class="copy" aria-hidden="true">copy</span></div>
      <pre class="twinkleplop twoslash"><code><span class="keyword">const</span> <span class="twoslash-hover"><span class="twoslash-target"><span class="constant">greeting</span></span><span class="twoslash-popover" aria-hidden="true"><span class="twoslash-popover-type">const greeting: "hello world"</span></span></span> <span class="operator">=</span> <span class="string">&quot;hello world&quot;</span>
</code></pre></div>`);

    expect(md).toContain('```ts title="a.ts"\nconst greeting = "hello world"\n```');
    expect(md).not.toContain("twoslash");
  });

  it("gives a line annotation its own line, without opening a blank one", () => {
    // the stylesheet makes these blocks; in the text stream they are inline
    const md = page(`<div class="code">
      <div class="head"><span class="fname">a<span class="ext">.ts</span></span></div>
      <pre class="twinkleplop"><code><span class="l">const x = 1;</span>
<span class="twoslash-tag" data-tag-name="log">x is 1</span><span class="l">const y = x + 1;</span>
</code></pre></div>`);

    expect(md).toContain("const x = 1;\nx is 1\nconst y = x + 1;");
    expect(md).not.toContain("\n\nx is 1");
  });

  it("drops decorative heading glyphs", () => {
    const md = page(
      `<h2 class="sec"><span class="hash" aria-hidden="true">#</span> <span>themes</span> <span class="num" aria-hidden="true">§ 02</span></h2>`,
    );
    expect(md.trim()).toBe("## themes");
  });

  it("wraps inline code in the shortest fence that works", () => {
    const md = page("<p>Use <code>language()</code> to start.</p>");
    expect(md.trim()).toBe("Use `language()` to start.");
  });

  it("outruns backticks the code already contains", () => {
    const md = page("<p><code>a ` b</code></p>");
    expect(md.trim()).toBe("``a ` b``");
  });

  it("reads a container of inline content as one paragraph", () => {
    const md = page(
      `<div class="callout"><span class="mark" aria-hidden="true">▸</span><div class="body">Map its scope colours to <a href="/docs/themes-ref">token types</a>.</div></div>`,
    );
    expect(md.trim()).toBe(
      "> Map its scope colours to [token types](https://twinkleplop.pngwn.at/docs/themes-ref).",
    );
  });

  it("always opens a fence with a language", () => {
    // parsers read the first word of the info string as the language
    const md = page(
      `<div class="code"><div class="head"><span class="fname">terminal</span></div><pre><code>pnpm add @twinkleplop/typescript</code></pre></div>`,
    );
    expect(md).toContain('```text title="terminal"');
  });

  it("renders a table", () => {
    const md = page(
      `<table><thead><tr><th>option</th><th>default</th></tr></thead><tbody><tr><td>lang</td><td>"ts"</td></tr></tbody></table>`,
    );
    expect(md.trim()).toBe(["| option | default |", "| --- | --- |", '| lang | "ts" |'].join("\n"));
  });

  it("skips navigation and pages with no article", () => {
    expect(page(`<p>body</p><div class="prev-next"><a href="/docs/a">prev</a></div>`).trim()).toBe(
      "body",
    );
    expect(page_to_markdown("<div>no main here</div>", ctx)).toBeNull();
  });
});
