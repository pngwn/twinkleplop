import { describe, expect, test } from "vitest";
import { compile } from "./compiler";
import { to_html } from "./generator";
import { build_annotation_extractor } from "./annotation";
import { tokenize } from "./tokenizer";
import { visible_text, visible_text_map } from "./visible_text";
import type { AnnotationPlugin, Grammar, RenderOptions, TokenizeResult } from "./types";

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

function run(input: string, markers = false): TokenizeResult {
  const result = tokenize(input, grammar);
  if (markers) {
    const found = build_annotation_extractor({ plugins: [hl] }, result.token_types)(input, result);
    if (found !== undefined) result.overlays = found;
  }
  return result;
}

function rendered_text(input: string, result: TokenizeResult, options: RenderOptions = {}): string {
  return to_html(input, result, options)
    .replace(/<span class="ln">\d+<\/span>/g, "")
    .replace(/<br>/g, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

describe("visible_text", () => {
  test("a snippet without overlays is the input unchanged", () => {
    const input = "aa bb  \r\ncc\t\n";
    expect(visible_text(input, run(input))).toBe(input);
  });

  test("a trailing marker goes with the whitespace before it", () => {
    const input = "aa bb // [!hl]\ncc dd";
    expect(visible_text(input, run(input, true))).toBe("aa bb\ncc dd");
  });

  test("a line holding only a marker is dropped", () => {
    const input = "aa\n  // [!hl]\nbb\ncc";
    expect(visible_text(input, run(input, true))).toBe("aa\nbb\ncc");
  });

  test("dropping the last line keeps the newline before it", () => {
    const input = "aa\nbb\n// [!hl]";
    expect(visible_text(input, run(input, true))).toBe("aa\nbb\n");
  });

  test("a hidden range mid-line is spaces of equal width", () => {
    const input = "aa bb cc\ndd";
    const options = { overlays: [{ start: 3, end: 5, hide: true as const }] };
    expect(visible_text(input, run(input), options)).toBe("aa    cc\ndd");
  });

  test("a hidden range that empties a line drops it", () => {
    const input = "aa\nbb cc\ndd";
    const options = { overlays: [{ start: 3, end: 8, hide: true as const }] };
    expect(visible_text(input, run(input), options)).toBe("aa\ndd");
  });

  test("a hidden range at the end of a line is trimmed with the whitespace before it", () => {
    const input = "aa bb cc\ndd";
    const options = { overlays: [{ start: 6, end: 8, hide: true as const }] };
    expect(visible_text(input, run(input), options)).toBe("aa bb\ndd");
  });

  test("option items that resolve to nothing leave the input unchanged", () => {
    const input = "aa  \nbb";
    const options = { overlays: [{ start: 1, end: 1, hide: true as const }] };
    expect(visible_text(input, run(input), options)).toBe(input);
  });

  test("shown whitespace keeps a trailing run unless something in it was hidden", () => {
    const input = "aa  \nbb cc  // [!hl]\ndd";
    expect(visible_text(input, run(input, true), { whitespace: "all" })).toBe("aa  \nbb cc\ndd");
    expect(visible_text(input, run(input, true))).toBe("aa\nbb cc\ndd");
  });

  test("the result is never the tokenize result's own overlays mutated", () => {
    const input = "aa bb\ncc";
    const result = run(input);
    visible_text(input, result, { overlays: [{ start: 0, end: 2, hide: true }] });
    expect(result.overlays).toBeUndefined();
  });
});

describe("matches the renderer", () => {
  const inputs = [
    "aa bb // [!hl]\ncc dd\nee",
    "// [!hl]\naa\n\n  bb  \n// [!hl]",
    "aa\r\n  bb // [!hl]\r\ncc  \r\n",
    "\taa <b> & 'c' // [!hl]\n\n\n",
    "aa // [!hl =aa]\n  aa bb aa  \nzz",
    "",
    "\n",
  ];
  const range_option: RenderOptions = { overlays: [{ start: 0, end: 2, class: "mark" }] };
  const option_sets: RenderOptions[] = [
    {},
    { line_numbers: true },
    { structure: "inline" },
    { whitespace: "all" },
    { whitespace: "trailing" },
    { indent_guides: true },
    range_option,
    { overlays: [{ line: 1, class: "mark" }] },
  ];

  for (const input of inputs) {
    for (const options of option_sets) {
      // the range option points past the end of shorter inputs
      if (options === range_option && input.length < 2) continue;
      for (const markers of [false, true]) {
        test(`${JSON.stringify(input)} ${JSON.stringify(options)} markers=${markers}`, () => {
          const result = run(input, markers);
          expect(visible_text(input, result, options)).toBe(rendered_text(input, result, options));
        });
      }
    }
  }

  test("with hidden ranges on and across lines", () => {
    const input = "aa bb cc\n  dd ee  \nff gg\nhh";
    const hides: [number, number][] = [
      [0, 2],
      [3, 5],
      [6, 8],
      [4, 13],
      [9, 18],
      [11, 24],
      [0, input.length],
    ];
    for (const [start, end] of hides) {
      for (const whitespace of [undefined, "all"] as const) {
        const result = run(input);
        const options: RenderOptions = { whitespace, overlays: [{ start, end, hide: true }] };
        expect(visible_text(input, result, options), `${start}..${end} ${whitespace}`).toBe(
          rendered_text(input, result, options),
        );
      }
    }
  });
});

describe("visible_text_map", () => {
  function check_segments(input: string, text: string, segments: Uint32Array) {
    let text_end = 0;
    for (let i = 0; i < segments.length; i += 3) {
      const [start, end, at] = [segments[i], segments[i + 1], segments[i + 2]];
      expect(at).toBeGreaterThanOrEqual(text_end);
      expect(text.slice(at, at + end - start)).toBe(input.slice(start, end));
      text_end = at + end - start;
    }
  }

  test("a snippet without overlays is one segment", () => {
    const input = "aa\nbb";
    const { text, segments } = visible_text_map(input, run(input));
    expect(text).toBe(input);
    expect([...segments]).toEqual([0, 5, 0]);
    expect([...visible_text_map("", run("")).segments]).toEqual([]);
  });

  test("segments skip marker bytes and elided lines", () => {
    const input = "aa bb // [!hl]\n// [!hl]\ncc dd\nee";
    const { text, segments } = visible_text_map(input, run(input, true));
    expect(text).toBe("aa bb\ncc dd\nee");
    expect([...segments]).toEqual([0, 5, 0, 14, 15, 5, 24, 32, 6]);
    check_segments(input, text, segments);
  });

  test("spaces standing in for hidden bytes belong to no segment", () => {
    const input = "aa bb cc";
    const { text, segments } = visible_text_map(input, run(input), {
      overlays: [{ start: 3, end: 5, hide: true }],
    });
    expect(text).toBe("aa    cc");
    expect([...segments]).toEqual([0, 3, 0, 5, 8, 5]);
    check_segments(input, text, segments);
  });

  test("a source offset maps through its segment", () => {
    const input = "  // [!hl]\nlet x = {a};\n";
    const { text, segments } = visible_text_map(input, run(input, true));
    const source_at = input.indexOf("{a}");
    let at = -1;
    for (let i = 0; i < segments.length; i += 3) {
      if (segments[i] <= source_at && source_at < segments[i + 1]) {
        at = segments[i + 2] + source_at - segments[i];
      }
    }
    expect(text.slice(at, at + 3)).toBe("{a}");
  });

  test("text is the same as visible_text", () => {
    const input = "aa\r\n  bb // [!hl]\r\ncc  \r\n";
    for (const options of [{}, { whitespace: "all" as const }]) {
      const result = run(input, true);
      const { text, segments } = visible_text_map(input, result, options);
      expect(text).toBe(visible_text(input, result, options));
      check_segments(input, text, segments);
    }
  });
});
