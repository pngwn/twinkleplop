import { describe, expect, test } from "vitest";
import { compile } from "./compiler";
import { to_html, to_lines, to_parts } from "./generator";
import { create_language } from "./reclassifier";
import type { AnnotationPlugin, Grammar, RenderOptions } from "./types";

const grammar = compile<Grammar>({
  name: "toy",
  states: {
    root: {
      rules: [
        { match: "//", token: "comment", state: "line_comment" },
        { match: "/*", token: "comment", state: "block_comment" },
        { match: "let", token: "keyword", boundary: true },
        { match: "=", token: "operator" },
        {
          range: [
            ["a", "z"],
            ["A", "Z"],
            ["0", "9"],
          ],
          token: "identifier",
        },
      ],
    },
    line_comment: {
      rules: [
        { match: "\n", token: "comment", exit: true },
        { any: true, token: "comment" },
      ],
    },
    block_comment: {
      rules: [
        { match: "*/", token: "comment", exit: true },
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
        classification: "hl",
        line_mode: typeof args === "object" && args.kind !== "range",
      },
    ],
  }),
};

const language = create_language(grammar)({ annotation: { plugins: [hl] } });

const source = [
  "let alpha = 1",
  "// [!hl :4..6]",
  "\tlet beta = alpha // [!hl beta..alpha]",
  "/* a comment",
  "   over three lines",
  "   ends here */ let gamma = 2",
  "",
  "// [!hl +1]",
  "  let delta = gamma",
  "let last = delta",
  "",
].join("\n");

const line_starts = [0];
for (let i = 0; i < source.length; i++) if (source[i] === "\n") line_starts.push(i + 1);

function in_pieces(options: RenderOptions, cuts: number[]): string {
  const result = language(source);
  const edges = [0, ...cuts, source.length];
  const pieces: string[] = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    const from = edges[i];
    const to = i + 2 === edges.length ? undefined : edges[i + 1];
    if (from === to) {
      expect(to_lines(source, result, { ...options, range: { from, to } })).toBe("");
      continue;
    }
    const lines = to_lines(source, result, { ...options, range: { from, to } });
    if (lines !== "") pieces.push(lines);
  }
  return pieces.join("\n");
}

const variants: Record<string, RenderOptions> = {
  plain: {},
  "line numbers": { line_numbers: { start: 7 } },
  "whitespace and indent guides": { whitespace: "all", indent_guides: true },
  "user overlays": {
    overlays: [
      { lines: [1, [9, 10]], class: "mark" },
      { start: 4, end: 9, class: "word" },
      { start: 60, end: 70, hide: true },
    ],
  },
  hooks: {
    line: (n, source_line) => ({ attrs: { "data-n": n, "data-line": source_line } }),
    token: (type, start, end) =>
      type === "keyword" ? { attrs: { "data-at": `${start}-${end}` } } : undefined,
  },
};

describe("range", () => {
  for (const [name, options] of Object.entries(variants)) {
    test(`pieces join into the whole document: ${name}`, () => {
      const whole = to_lines(source, language(source), options);
      for (let a = 0; a < line_starts.length; a++) {
        for (let b = a; b < line_starts.length; b++) {
          expect(in_pieces(options, [line_starts[a], line_starts[b]]), `${a} ${b}`).toBe(whole);
        }
      }
    });
  }

  test("to_lines is the inside of the code element", () => {
    const result = language(source);
    expect(to_parts(source, result).body).toBe(`<code>${to_lines(source, result)}</code>`);
  });

  test("the block keeps the classes of the whole input", () => {
    const result = language(source);
    const html = to_html(source, result, { range: { from: line_starts[9] } });
    expect(html).toMatch(/^<pre class="twinkleplop has-hl">/);
    expect(html.match(/class="l/g)).toHaveLength(2);
    expect(to_parts(source, result, { range: { from: 0, to: 0 } }).body).toBe("<code></code>");
  });

  test("an offset inside a line is refused", () => {
    const result = language(source);
    expect(() => to_lines(source, result, { range: { from: 3 } })).toThrow(
      "not the start of a line",
    );
    expect(() => to_lines(source, result, { range: { to: 3 } })).toThrow("not the start of a line");
    expect(() => to_lines(source, result, { range: { from: 9999 } })).toThrow(RangeError);
    expect(to_lines(source, result, { range: { to: 9999 } })).toBe(to_lines(source, result));
  });

  test("settled lines drawn once as text arrives add up to the closed render", () => {
    const settled: string[] = [];
    let drawn_to = 0;
    for (let cut = 1; cut < source.length; cut++) {
      const input = source.slice(0, cut);
      const result = language(input, { open: true });
      const stable_end = result.stable_end!;
      if (stable_end <= drawn_to) continue;
      const lines = to_lines(input, result, { range: { from: drawn_to, to: stable_end } });
      if (lines !== "") settled.push(lines);
      drawn_to = stable_end;
    }
    expect(drawn_to).toBeGreaterThan(source.length / 2);
    const closed = language(source);
    settled.push(to_lines(source, closed, { range: { from: drawn_to } }));
    expect(settled.join("\n")).toBe(to_lines(source, closed));
  });
});
