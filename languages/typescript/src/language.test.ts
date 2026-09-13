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
