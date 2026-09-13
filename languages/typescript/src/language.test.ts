// Smoke tests for the public `language(opts)(code, render?) → HTML` API.
// Covers the wiring path between `tokenize` and `to_html` in the language
// package, not grammar correctness (covered by grammar.test.js / reclassifier.test.ts).

import { describe, expect, it } from "vitest";
import { language, tokenize } from "./index.js";

describe("typescript language() — HTML output", () => {
  it("returns a <pre><code> wrapper with token spans", () => {
    const ts = language();
    const html = ts("1 + 2");
    expect(html).toMatch(/^<pre class="[^"]*"><code>/);
    expect(html).toMatch(/<\/code><\/pre>$/);
    expect(html).toMatch(/<span class="tok number">1<\/span>/);
  });

  it("forwards render options on each call", () => {
    const ts = language();
    const html = ts("const x = 1", { class_name: "code" });
    expect(html).toMatch(/^<pre class="code"><code>/);
  });

  it("renders line numbers when requested", () => {
    const ts = language();
    const html = ts("a\nb", { line_numbers: true });
    expect(html).toContain('<span class="ln">1</span>');
    expect(html).toContain('<span class="ln">2</span>');
  });

  it("numbers lines from a custom start", () => {
    const ts = language();
    const html = ts("a\nb\nc", { line_numbers: { start: 10 } });
    const numbers = [...html.matchAll(/<span class="ln">(\d+)<\/span>/g)].map((m) => m[1]);
    expect(numbers).toEqual(["10", "11", "12"]);
  });

  it("emits attributes on the pre element after the class", () => {
    const ts = language();
    const html = ts("1", {
      attributes: { "data-title": 'a"b', tabindex: 0, hidden: true, draggable: false },
    });
    expect(html).toMatch(
      /^<pre class="twinkleplop" data-title="a&quot;b" tabindex="0" hidden><code>/,
    );
    expect(html).not.toContain("draggable");
  });

  it("rejects reserved attribute names", () => {
    const ts = language();
    expect(() => ts("1", { attributes: { class: "x" } })).toThrow(/class/);
    expect(() => ts("1", { attributes: { style: "x" } })).toThrow(/style/);
  });

  it("escapes HTML-significant characters in source", () => {
    const ts = language();
    const html = ts('const s = "<div>";');
    expect(html).not.toContain("<div>");
    expect(html).toContain("&lt;div&gt;");
  });

  it("respects fidelity option (low keeps interface members as identifiers)", () => {
    // a category-level smoke test: low fidelity strips the interface member
    // promotion that the high-fidelity pipeline adds. exact behaviour is
    // covered in reclassifier.test.ts; this just proves the option flows
    // through the HTML wrapper.
    const high = language({ fidelity: "high" });
    const low = language({ fidelity: "low" });
    const src = "interface I { x: number; }";
    expect(high(src)).not.toEqual(low(src));
  });
});

describe("typescript tokenize() — raw tokens passthrough", () => {
  it("returns the same shape the language() wrapper consumes", () => {
    const t = tokenize();
    const r = t("1 + 2");
    expect(r.tokens).toBeInstanceOf(Uint32Array);
    expect(Array.isArray(r.token_types)).toBe(true);
    expect(r.tokens.length % 3).toBe(0);
  });
});

describe("typescript language() — overlays option", () => {
  // `total` sits at 6..11, line 2 is `console.log(total);`, line 3 is
  // `let a = 2;` at 37..47.
  const code = "const total = 1;\nconsole.log(total);\nlet a = 2;\nlet b = 3;";
  const items = [
    { start: 6, end: 11, class: "highlighted-word" },
    { start: { line: 2, character: 0 }, end: { line: 2, character: 7 }, class: "mark" },
    { lines: [1, [3, 4]], class: "highlight" },
    { start: 41, end: 47, hide: true },
  ];

  it("applies ranges, lines and hidden ranges from one call", () => {
    const html = language()(code, { overlays: items });
    expect(html).toMatch(/^<pre class="twinkleplop has-highlight has-highlighted-word has-mark">/);
    expect(html).toContain(
      '<span class="tok highlighted-word"><span class="tok constant">total</span></span>',
    );
    expect(html).toContain(
      '<span class="tok mark"><span class="tok identifier">console</span></span>',
    );
    expect(html.match(/<span class="l[^"]*">/g)).toEqual([
      '<span class="l highlight">',
      '<span class="l">',
      '<span class="l highlight">',
      '<span class="l highlight">',
    ]);
    expect(html).toContain('<span class="tok keyword">let</span></span>\n');
    expect(html).not.toContain("= 2");
  });

  it("matches the tokenize + overlays() + to_html pipeline", async () => {
    const { overlays, to_html } = await import("@twinkleplop/core");
    const result = tokenize()(code);
    result.overlays = overlays(code, items);
    expect(to_html(code, result)).toBe(language()(code, { overlays: items }));
  });

  it("rejects a malformed item and an out of range position", () => {
    const ts = language();
    expect(() => ts(code, { overlays: [{ line: 1, class: "bad class!" }] })).toThrow(TypeError);
    expect(() => ts(code, { overlays: [{ line: 9, class: "x" }] })).toThrow(RangeError);
  });
});
