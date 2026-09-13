// the `overlays` render option and the `overlays()` builder. the marker path
// is covered in generator.test.ts; these tests pin the programmatic surface:
// item shapes, position resolution, order independence, merging with marker
// overlays, and the untouched no-option output.

import { describe, expect, test } from "vitest";
import { compile } from "./compiler";
import { to_html } from "./generator";
import { overlays } from "./overlays";
import { build_annotation_extractor } from "./annotation";
import { tokenize } from "./tokenizer";
import type { Grammar, AnnotationPlugin, OverlayItem, RenderOptions } from "./types";

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

const hl: AnnotationPlugin = {
  verbs: ["hl"],
  handle: ({ args, range }) => ({
    overlays: [
      {
        start: range.start,
        end: range.end,
        classification: "highlight",
        line_mode: args.kind === "bare" || args.kind === "lineCount" || args.kind === "lineRef",
      },
    ],
  }),
};

function render(input: string, options: RenderOptions = {}, plugins: AnnotationPlugin[] = []) {
  const result = tokenize(input, grammar);
  if (plugins.length > 0) {
    const extractor = build_annotation_extractor({ plugins }, result.token_types);
    const found = extractor(input, result);
    if (found !== undefined) result.overlays = found;
  }
  return to_html(input, result, options);
}

function line_opens(html: string): string[] {
  return html.match(/<span class="l[^"]*">/g) ?? [];
}

function wrappers(html: string): string[] {
  return [...html.matchAll(/<span class="tok ([^"]*)"><span class="tok/g)].map((m) => m[1]);
}

// three lines: `aa bb cc` at 0..8, `dd ee` at 9..14, `ff` at 15..17.
const THREE = "aa bb cc\ndd ee\nff";

describe("item forms", () => {
  test("a range by offset wraps the run it covers", () => {
    const html = render(THREE, { overlays: [{ start: 3, end: 8, class: "mark" }] });
    expect(html).toContain(
      '<span class="tok mark"><span class="tok identifier">bb</span> <span class="tok identifier">cc</span></span>',
    );
    expect(line_opens(html)).toEqual(['<span class="l">', '<span class="l">', '<span class="l">']);
  });

  test("a range by line and character resolves within that line", () => {
    const html = render(THREE, {
      overlays: [
        { start: { line: 2, character: 3 }, end: { line: 2, character: 5 }, class: "mark" },
      ],
    });
    expect(html).toContain('<span class="tok mark"><span class="tok identifier">ee</span></span>');
    expect(html).not.toContain('mark"><span class="tok identifier">dd');
  });

  test("a single line adds its class to that line span", () => {
    const html = render(THREE, { overlays: [{ line: 2, class: "highlight" }] });
    expect(line_opens(html)).toEqual([
      '<span class="l">',
      '<span class="l highlight">',
      '<span class="l">',
    ]);
  });

  test("a set of lines mixes numbers and inclusive pairs", () => {
    const html = render("a\nb\nc\nd\ne", {
      overlays: [{ lines: [1, [3, 4]], class: "highlight" }],
    });
    expect(line_opens(html)).toEqual([
      '<span class="l highlight">',
      '<span class="l">',
      '<span class="l highlight">',
      '<span class="l highlight">',
      '<span class="l">',
    ]);
  });

  test("a hidden range renders as spaces of equal width", () => {
    const html = render(THREE, { overlays: [{ start: 3, end: 5, hide: true }] });
    expect(html).toContain(
      '<span class="tok identifier">aa</span>    <span class="tok identifier">cc</span>',
    );
    expect(html).not.toContain("bb");
  });

  test("a hidden range that empties a line drops the line", () => {
    const html = render(THREE, { overlays: [{ start: 9, end: 14, hide: true }] });
    expect(line_opens(html).length).toBe(2);
    expect(html).not.toContain("dd");
    expect(html).toContain("ff");
  });

  test("hidden lines do not consume a line number", () => {
    const html = render(THREE, {
      line_numbers: { start: 10 },
      overlays: [{ start: 9, end: 14, hide: true }],
    });
    expect([...html.matchAll(/<span class="ln">(\d+)<\/span>/g)].map((m) => m[1])).toEqual([
      "10",
      "11",
    ]);
  });
});

describe("positions", () => {
  test("{ line, character } maps to the same offset", () => {
    const by_offset = render("a\nbc", { overlays: [{ start: 2, end: 3, class: "m" }] });
    const by_line = render("a\nbc", {
      overlays: [{ start: { line: 2, character: 0 }, end: { line: 2, character: 1 }, class: "m" }],
    });
    expect(by_line).toBe(by_offset);
    expect(by_line).toContain('<span class="tok m"><span class="tok identifier">b</span></span>');
  });

  test("a character past the end of its line throws a RangeError naming the field", () => {
    expect(() =>
      render("a\nbc", {
        overlays: [
          { start: { line: 2, character: 0 }, end: { line: 2, character: 3 }, class: "m" },
        ],
      }),
    ).toThrow(/overlays\[0\]\.end\.character 3/);
    expect(() =>
      render("a\nbc", {
        overlays: [
          { start: { line: 2, character: 0 }, end: { line: 2, character: 3 }, class: "m" },
        ],
      }),
    ).toThrow(RangeError);
  });

  test("character may point at the end of the line", () => {
    const html = render("a\nbc", {
      overlays: [{ start: { line: 1, character: 0 }, end: { line: 1, character: 1 }, class: "m" }],
    });
    expect(html).toContain('<span class="tok m"><span class="tok identifier">a</span></span>');
  });

  test("offsets, lines and backwards ranges are bounds checked", () => {
    const bad: [OverlayItem, RegExp][] = [
      [{ start: 0, end: 18, class: "m" }, /overlays\[0\]\.end offset 18/],
      [{ start: -1, end: 2, class: "m" }, /overlays\[0\]\.start offset -1/],
      [{ start: 5, end: 3, class: "m" }, /overlays\[0\]\.end \(3\) is before its start \(5\)/],
      [{ start: 1.5, end: 3, class: "m" }, /overlays\[0\]\.start must be an integer/],
      [{ line: 0, class: "m" }, /overlays\[0\]\.line 0 is outside 1\.\.3/],
      [{ line: 4, class: "m" }, /overlays\[0\]\.line 4 is outside 1\.\.3/],
      [{ lines: [1, 9], class: "m" }, /overlays\[0\]\.lines 9/],
      [{ lines: [[3, 2]], class: "m" }, /runs backwards/],
      [{ start: { line: 5, character: 0 }, end: 3, class: "m" }, /overlays\[0\]\.start\.line 5/],
      [{ start: 0, end: 20, hide: true }, /overlays\[0\]\.end offset 20/],
    ];
    for (const [item, message] of bad) {
      expect(() => render(THREE, { overlays: [item] })).toThrow(RangeError);
      expect(() => render(THREE, { overlays: [item] })).toThrow(message);
    }
  });

  test("the offending item is named by index", () => {
    expect(() =>
      render(THREE, {
        overlays: [
          { line: 1, class: "m" },
          { start: 0, end: 99, class: "m" },
        ],
      }),
    ).toThrow(/overlays\[1\]\.end/);
  });

  test("an empty range applies nothing", () => {
    const plain = render(THREE);
    expect(render(THREE, { overlays: [{ start: 4, end: 4, class: "m" }] })).toBe(plain);
    expect(render(THREE, { overlays: [{ start: 4, end: 4, hide: true }] })).toBe(plain);
  });
});

describe("shapes and classes", () => {
  test("anything but the four forms throws a TypeError", () => {
    const bad: unknown[] = [
      null,
      1,
      "x",
      [],
      {},
      { start: 0, end: 1 },
      { class: "m" },
      { line: 1 },
      { line: 1, lines: [2], class: "m" },
      { start: 0, end: 1, line: 1, class: "m" },
      { start: 0, end: 1, hide: false },
      { start: 0, end: 1, hide: true, class: "m" },
      { start: 0, end: 1, class: "m", extra: 1 },
      { lines: 2, class: "m" },
      { lines: [[1, 2, 3]], class: "m" },
    ];
    for (const item of bad) {
      expect(() => render(THREE, { overlays: [item as OverlayItem] })).toThrow(TypeError);
    }
  });

  test("a class must be one or more class tokens separated by single spaces", () => {
    const bad = ["", " ", "a ", " a", "a  b", "bad class!", '"><b>', "1x", "a\tb", "a\nb"];
    for (const cls of bad) {
      expect(() => render(THREE, { overlays: [{ line: 1, class: cls }] })).toThrow(TypeError);
      expect(() => render(THREE, { overlays: [{ line: 1, class: cls }] })).toThrow(
        /overlays\[0\]\.class/,
      );
    }
    const html = render(THREE, { overlays: [{ line: 1, class: "two words" }] });
    expect(line_opens(html)[0]).toBe('<span class="l two words">');
    expect(render(THREE, { overlays: [{ line: 1, class: "-leading_ok9 über" }] })).toContain(
      '<span class="l -leading_ok9 über">',
    );
  });

  test("a non-array option throws", () => {
    expect(() => render(THREE, { overlays: {} as unknown as OverlayItem[] })).toThrow(TypeError);
  });
});

describe("composition", () => {
  test("the same items in any order yield the same html", () => {
    const items: OverlayItem[] = [
      { start: 0, end: 5, class: "a" },
      { start: 3, end: 8, class: "b" },
      { start: 0, end: 5, class: "c" },
      { line: 1, class: "x" },
      { lines: [[1, 2]], class: "y" },
      { start: 9, end: 11, hide: true },
      { start: 10, end: 14, hide: true },
    ];
    const forward = render(THREE, { overlays: items });
    const reversed = render(THREE, { overlays: items.slice().reverse() });
    const rotated = render(THREE, { overlays: [...items.slice(3), ...items.slice(0, 3)] });
    expect(reversed).toBe(forward);
    expect(rotated).toBe(forward);
  });

  test("overlapping ranges split into class-merged wrappers", () => {
    const html = render("aa bb cc dd", {
      overlays: [
        { start: 0, end: 5, class: "a" },
        { start: 3, end: 8, class: "b" },
      ],
    });
    expect(wrappers(html)).toEqual(["a", "a b", "b"]);
  });

  test("identical bounds with different classes yield one wrapper with both", () => {
    const html = render(THREE, {
      overlays: [
        { start: 3, end: 5, class: "b" },
        { start: 3, end: 5, class: "a" },
      ],
    });
    expect(wrappers(html)).toEqual(["a b"]);
  });

  test("the same class twice on a line applies once", () => {
    const html = render(THREE, {
      overlays: [
        { line: 1, class: "highlight" },
        { lines: [1, 1, [1, 1]], class: "highlight" },
        { start: 0, end: 2, class: "m" },
        { start: 0, end: 2, class: "m" },
      ],
    });
    expect(line_opens(html)[0]).toBe('<span class="l highlight">');
    expect(wrappers(html)).toEqual(["m"]);
  });

  test("a range across lines is applied per line", () => {
    const html = render(THREE, { overlays: [{ start: 6, end: 11, class: "m" }] });
    expect(html).toContain(
      '<span class="tok m"><span class="tok identifier">cc</span></span></span>\n',
    );
    expect(html).toContain(
      '<span class="l"><span class="tok m"><span class="tok identifier">dd</span></span>',
    );
    expect(html).not.toMatch(/<span class="tok m">[^<]*\n/);
  });

  test("a line item on an empty line still classes the line", () => {
    const html = render("a\n\nb", { overlays: [{ lines: [2], class: "highlight" }] });
    expect(line_opens(html)).toEqual([
      '<span class="l">',
      '<span class="l highlight">',
      '<span class="l">',
    ]);
    expect(html).toContain('<span class="l highlight"></span>\n');
    expect(render("a\n\nb", { overlays: [{ line: 2, class: "highlight" }] })).toBe(html);
  });

  test("a class entirely inside a hidden range renders no wrapper", () => {
    const html = render(THREE, {
      overlays: [
        { start: 3, end: 5, class: "m" },
        { start: 3, end: 5, hide: true },
      ],
    });
    expect(html).not.toContain('class="tok m"');
    expect(html).toContain(
      '<span class="tok identifier">aa</span>    <span class="tok identifier">cc</span>',
    );
  });

  test("overlapping hidden ranges behave as their union", () => {
    const html = render(THREE, {
      overlays: [
        { start: 3, end: 6, hide: true },
        { start: 4, end: 8, hide: true },
        { start: 6, end: 7, hide: true },
      ],
    });
    expect(html).toBe(render(THREE, { overlays: [{ start: 3, end: 8, hide: true }] }));
    expect(html).toContain('<span class="tok identifier">aa</span></span>\n');
  });

  test("a hidden range across lines hides each line's part", () => {
    const html = render(THREE, { overlays: [{ start: 6, end: 12, hide: true }] });
    expect(html).not.toContain("cc");
    expect(html).not.toContain("dd");
    expect(html).toContain('<span class="tok identifier">bb</span></span>\n<span class="l">');
    expect(html).toContain('   <span class="tok identifier">ee</span>');
  });

  test("option overlays combine with marker overlays", () => {
    const input = "aa bb // [!hl]\ncc dd\nee";
    const html = render(input, { overlays: [{ start: 15, end: 17, class: "mark" }] }, [hl]);
    expect(line_opens(html)[0]).toBe('<span class="l highlight">');
    expect(html).toContain('<span class="tok mark"><span class="tok identifier">cc</span></span>');
    expect(html).not.toContain("[!hl]");
    expect(html).toMatch(/^<pre class="twinkleplop has-highlight has-mark">/);
  });

  test("marker and option hidden ranges both apply", () => {
    const input = "bb cc // [!hl =bb]\ndd";
    const html = render(input, { overlays: [{ start: 3, end: 5, hide: true }] }, [hl]);
    expect(line_opens(html).length).toBe(2);
    expect(html).toContain('<span class="tok identifier">bb</span></span></span>\n');
    expect(html).toContain(
      '<span class="tok highlight"><span class="tok identifier">bb</span></span>',
    );
    expect(html).not.toContain("cc");
  });

  test("has- classes follow first appearance and respect has_classes", () => {
    const html = render(THREE, {
      overlays: [
        { line: 3, class: "zeta" },
        { start: 0, end: 2, class: "alpha beta" },
      ],
    });
    expect(html).toMatch(/^<pre class="twinkleplop has-alpha has-zeta">/);
    expect(render(THREE, { has_classes: false, overlays: [{ line: 3, class: "zeta" }] })).toMatch(
      /^<pre class="twinkleplop"><code>/,
    );
  });

  test("the other render options still apply", () => {
    const html = render(THREE, {
      class_name: "x",
      line_numbers: { start: 5 },
      attributes: { "data-title": "t" },
      overlays: [{ line: 1, class: "m" }],
    });
    expect(html).toMatch(
      /^<pre class="x has-m" data-title="t"><code><span class="l m"><span class="ln">5<\/span>/,
    );
  });
});

describe("builder", () => {
  test("overlays() then to_html equals the option", () => {
    const items: OverlayItem[] = [
      { start: 3, end: 8, class: "mark" },
      { lines: [2], class: "highlight" },
      { start: 15, end: 16, hide: true },
    ];
    const result = tokenize(THREE, grammar);
    result.overlays = overlays(THREE, items);
    expect(to_html(THREE, result)).toBe(render(THREE, { overlays: items }));
  });

  test("merging with an existing result keeps its class ids", () => {
    const input = "aa bb // [!hl]\ncc dd\nee";
    const result = tokenize(input, grammar);
    const extractor = build_annotation_extractor({ plugins: [hl] }, result.token_types);
    const existing = extractor(input, result)!;
    const merged = overlays(input, [{ start: 15, end: 17, class: "mark" }], existing);
    expect(merged.classifications).toEqual([...existing.classifications, "mark"]);
    expect(existing.classifications).toEqual(["highlight"]);
    result.overlays = merged;
    expect(to_html(input, result)).toBe(
      render(input, { overlays: [{ start: 15, end: 17, class: "mark" }] }, [hl]),
    );
  });

  test("the option leaves the tokenize result untouched", () => {
    const result = tokenize(THREE, grammar);
    to_html(THREE, result, { overlays: [{ line: 1, class: "m" }] });
    expect(result.overlays).toBeUndefined();
    const with_markers = "aa // [!hl]\nbb";
    const marked = tokenize(with_markers, grammar);
    const extractor = build_annotation_extractor({ plugins: [hl] }, marked.token_types);
    marked.overlays = extractor(with_markers, marked);
    const before = marked.overlays;
    to_html(with_markers, marked, { overlays: [{ line: 2, class: "m" }] });
    expect(marked.overlays).toBe(before);
    expect(before!.classifications).toEqual(["highlight"]);
  });

  test("a hidden range is stored per line and elides emptied lines", () => {
    const built = overlays(THREE, [{ start: 6, end: 14, hide: true }]);
    expect([...built.skip_ranges]).toEqual([6, 8, 9, 14]);
    expect([...built.elided_lines]).toEqual([0, 1, 0]);
  });
});

describe("absent option", () => {
  test("[] and undefined are identical to no option", () => {
    for (const plugins of [[], [hl]]) {
      const input = "aa bb // [!hl]\ncc";
      const plain = render(input, {}, plugins);
      expect(render(input, { overlays: [] }, plugins)).toBe(plain);
      expect(render(input, { overlays: undefined }, plugins)).toBe(plain);
    }
  });

  test("the no-option output is unchanged", () => {
    expect(render("a b\nc")).toBe(
      '<pre class="twinkleplop"><code><span class="l"><span class="tok identifier">a</span><span class="tok punctuation"> </span><span class="tok identifier">b</span></span>\n<span class="l"><span class="tok identifier">c</span></span></code></pre>',
    );
  });
});
