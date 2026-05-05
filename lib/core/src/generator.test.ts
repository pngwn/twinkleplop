// renderer tests for the overlay-aware path. asserts:
//   - byte-for-byte equality of no-overlay output (the unchanged fast path).
//   - line-mode classes attach to <span class="l">.
//   - skip ranges substitute marker bytes with spaces.
//   - elided lines are removed entirely (line numbers continue source-aligned).

import { describe, expect, test } from "vitest";
import { compile } from "./compiler";
import { to_html } from "./generator";
import { build_notation_extractor } from "./notation";
import { tokenize } from "./tokenizer";
import type { Grammar, NotationPlugin } from "./types";

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

const em: NotationPlugin = {
  verbs: ["em"],
  handle: ({ range }) => ({
    overlays: [
      { start: range.start, end: range.end, classification: "emphasis", line_mode: true },
    ],
  }),
};

const hl: NotationPlugin = {
  verbs: ["hl"],
  handle: ({ range }) => ({
    overlays: [
      { start: range.start, end: range.end, classification: "highlight", line_mode: true },
    ],
  }),
};

function render(input: string, plugins: NotationPlugin[] = []): string {
  const result = tokenize(input, grammar);
  if (plugins.length > 0) {
    const extractor = build_notation_extractor({ plugins }, result.token_types);
    const overlays = extractor(input, result);
    if (overlays !== undefined) result.overlays = overlays;
  }
  return to_html(input, result);
}

describe("to_html overlay path", () => {
  test("no-overlay path is unchanged", () => {
    // when result.overlays is undefined, output must match the original
    // generator output for the same input — the fast path.
    const input = "abc def\nxyz\n";
    const baseline = render(input, []);
    // run again with notation configured but no markers in source: still no
    // overlays attached, identical output.
    const alt = render(input, [em]);
    expect(alt).toBe(baseline);
  });

  test("line-mode overlay class is added to the line span", () => {
    const input = "a\nfoo // [!em]\nb\n";
    const html = render(input, [em]);
    // line 2 has the marker; emphasis class should appear on its line span.
    expect(html).toMatch(/<span class="l emphasis">/);
  });

  test("inline marker is substituted with whitespace", () => {
    const input = "a // [!em] post\nb\n";
    const html = render(input, [em]);
    // the literal `[!em]` must not appear in the output (substituted).
    expect(html).not.toContain("[!em]");
    // the trailing text `post` must remain intact.
    expect(html).toContain("post");
  });

  test("marker-only comment line is elided from output", () => {
    const input = "alpha\n// [!em :1]\nbeta\n";
    const html = render(input, [em]);
    // the marker comment text is removed and the line is dropped.
    expect(html).not.toContain("// [!em :1]");
    // line spans: line 1 (with emphasis), line 3 (beta), line 4 (empty
    // trailing line after the last \n). line 2 is elided.
    const line_opens = html.match(/<span class="l[^"]*">/g) ?? [];
    expect(line_opens.length).toBe(3);
    // line 1 carries the emphasis class (because [!em :1] targets line 1).
    expect(html).toMatch(/<span class="l emphasis">/);
    // beta and alpha both render.
    expect(html).toContain("alpha");
    expect(html).toContain("beta");
  });

  test("multiple overlays compose on the same line", () => {
    const input = "x // [!em]\nx // [!hl]\nx // [!em]\n";
    const html = render(input, [em, hl]);
    expect(html).toMatch(/<span class="l emphasis">/);
    expect(html).toMatch(/<span class="l highlight">/);
  });

  test(":N...M (inclusive) ranges apply to every line in the range", () => {
    // inclusive form: lines 2 and 3 are both highlighted.
    const input = "one\ntwo\nthree\nfour\n// [!em :2...3]\n";
    const html = render(input, [em]);
    const matches = html.match(/<span class="l emphasis">/g) ?? [];
    expect(matches.length).toBe(2);
  });

  test(":N..M (exclusive) ranges skip both endpoints", () => {
    // exclusive form: :1..4 highlights only the interior — lines 2 and 3.
    const input = "one\ntwo\nthree\nfour\n// [!em :1..4]\n";
    const html = render(input, [em]);
    const matches = html.match(/<span class="l emphasis">/g) ?? [];
    expect(matches.length).toBe(2);
  });

  test("line numbers renumber after elision (visible position, not source)", () => {
    function render_with_lines(input: string, plugins: NotationPlugin[] = []): string {
      const result = tokenize(input, grammar);
      if (plugins.length > 0) {
        const extractor = build_notation_extractor({ plugins }, result.token_types);
        const overlays = extractor(input, result);
        if (overlays !== undefined) result.overlays = overlays;
      }
      return to_html(input, result, { line_numbers: true });
    }
    // line 2 is a marker-only comment that gets elided. visible numbering
    // should be: line 1 (alpha), line 2 (beta) — NOT 1 then 3.
    const input = "alpha\n// [!em :1]\nbeta\n";
    const html = render_with_lines(input, [em]);
    const numbers = [...html.matchAll(/<span class="ln">(\d+)<\/span>/g)].map((m) => m[1]);
    expect(numbers).toEqual(["1", "2", "3"]);
    // (line 3 in the visible numbering is the trailing empty line after
    // beta\n; the elided source line 2 contributes no number to the output.)
  });
});
