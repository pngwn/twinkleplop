// end-to-end test: build a language with annotation enabled and confirm
// the rendered output reflects the markers. uses a synthetic JS-like
// grammar (line + block comments) rather than depending on a real
// language package, which keeps this package's deps minimal.

import { describe, expect, test } from "vitest";
import { compile, create_language, to_html } from "@twinkleplop/core";
import type { Grammar } from "@twinkleplop/core";
import { add, del } from "../diff";
import { em } from "../em";
import { hl } from "../hl";

const grammar = compile<Grammar>({
  name: "toy",
  states: {
    root: {
      rules: [
        { match: "//", token: "comment", state: "line_comment" },
        { match: " ", token: "punctuation" },
        { match: "\n", token: "punctuation" },
        {
          range: [
            ["a", "z"],
            ["A", "Z"],
            ["0", "9"],
          ],
          token: "identifier",
        },
        { any: true, token: "punctuation" },
      ],
    },
    line_comment: {
      rules: [
        { match: "\n", token: "comment", exit: true },
        { any: true, token: "comment" },
      ],
    },
  },
});

describe("end-to-end: create_language + annotation", () => {
  test("annotation disabled -> output identical to a plain factory call", () => {
    const factory = create_language(grammar);
    const plain = factory();
    const with_annotation = create_language(grammar)({
      // intentionally no annotation key.
    });
    const input = "alpha\nfoo bar\nbaz\n";
    expect(to_html(input, plain(input))).toBe(to_html(input, with_annotation(input)));
  });

  test("annotation enabled but no markers in source -> overlays absent", () => {
    const fn = create_language(grammar)({ annotation: { plugins: [em, hl] } });
    const result = fn("plain text\nno markers here\n");
    expect(result.overlays).toBeUndefined();
  });

  test("em + hl markers compose on rendered html", () => {
    const fn = create_language(grammar)({ annotation: { plugins: [em, hl] } });
    const input = "first\nfoo // [!em]\nbar // [!hl]\nlast\n";
    const result = fn(input);
    expect(result.overlays).toBeDefined();
    const html = to_html(input, result);
    expect(html).toMatch(/<span class="l emphasis">/);
    expect(html).toMatch(/<span class="l highlight">/);
  });

  test("the pre element gains a has- class per classification, in source order", () => {
    const fn = create_language(grammar)({ annotation: { plugins: [add, del] } });
    const input = "foo // [!add]\nbar // [!del]\nbaz // [!add]\n";
    const html = to_html(input, fn(input));
    expect(html).toMatch(/^<pre class="twinkleplop has-diff-add has-diff-del"><code>/);
    expect(to_html(input, fn(input), { has_classes: false })).toMatch(
      /^<pre class="twinkleplop"><code>/,
    );
  });

  test("a snippet without markers gets no has- class", () => {
    const fn = create_language(grammar)({ annotation: { plugins: [add, del] } });
    const input = "foo\nbar\n";
    expect(to_html(input, fn(input))).toMatch(/^<pre class="twinkleplop"><code>/);
  });
});

describe("markers combined with the overlays render option", () => {
  test("classes and has- classes from both sources apply", () => {
    const fn = create_language(grammar)({ annotation: { plugins: [add, hl] } });
    const input = "foo bar // [!add]\nbaz qux\n";
    const html = to_html(input, fn(input), {
      overlays: [
        { start: { line: 2, character: 4 }, end: { line: 2, character: 7 }, class: "mark" },
        { start: 0, end: 3, hide: true },
      ],
    });
    expect(html).toMatch(/^<pre class="twinkleplop has-diff-add has-mark"><code>/);
    expect(html).toMatch(/<span class="l diff-add">/);
    expect(html).toContain('<span class="tok mark"><span class="tok identifier">qux</span></span>');
    expect(html).not.toContain("foo");
    expect(html).not.toContain("[!add]");
    expect(html).toContain('<span class="tok identifier">bar</span></span>\n');
  });

  test("the option alone works without any annotation config", () => {
    const fn = create_language(grammar)();
    const input = "foo\nbar\n";
    const html = to_html(input, fn(input), { overlays: [{ line: 2, class: "highlight" }] });
    expect(html).toMatch(/^<pre class="twinkleplop has-highlight"><code>/);
    expect(html).toContain('<span class="l highlight"><span class="tok identifier">bar</span>');
  });
});
