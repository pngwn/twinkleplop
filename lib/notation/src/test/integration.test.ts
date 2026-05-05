// end-to-end test: build a language with notation enabled and confirm
// the rendered output reflects the markers. uses a synthetic JS-like
// grammar (line + block comments) rather than depending on a real
// language package, which keeps this package's deps minimal.

import { describe, expect, test } from "vitest";
import { compile, create_language, to_html } from "@twinkleplop/core";
import type { Grammar } from "@twinkleplop/core";
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

describe("end-to-end: create_language + notation", () => {
  test("notation disabled -> output identical to a plain factory call", () => {
    const factory = create_language(grammar);
    const plain = factory();
    const with_notation = create_language(grammar)({
      // intentionally no notation key.
    });
    const input = "alpha\nfoo bar\nbaz\n";
    expect(to_html(input, plain(input))).toBe(to_html(input, with_notation(input)));
  });

  test("notation enabled but no markers in source -> overlays absent", () => {
    const fn = create_language(grammar)({ notation: { plugins: [em, hl] } });
    const result = fn("plain text\nno markers here\n");
    expect(result.overlays).toBeUndefined();
  });

  test("em + hl markers compose on rendered html", () => {
    const fn = create_language(grammar)({ notation: { plugins: [em, hl] } });
    const input = "first\nfoo // [!em]\nbar // [!hl]\nlast\n";
    const result = fn(input);
    expect(result.overlays).toBeDefined();
    const html = to_html(input, result);
    expect(html).toMatch(/<span class="l emphasis">/);
    expect(html).toMatch(/<span class="l highlight">/);
  });
});
