import { describe, expect, test } from "vitest";
import { compile } from "./compiler";
import { to_html } from "./generator";
import { overlays } from "./overlays";
import { build_annotation_extractor } from "./annotation";
import { tokenize } from "./tokenizer";
import { OVERLAY_VERBATIM } from "./types";
import type {
  AnnotationIssue,
  AnnotationPlugin,
  Grammar,
  OverlayContribution,
  OverlayItem,
  RenderOptions,
} from "./types";

const grammar = compile<Grammar>({
  name: "toy",
  states: {
    root: {
      rules: [
        { match: "//", token: "comment", state: "line_comment" },
        { match: '"', token: "string", state: "string" },
        { match: " ", token: "punctuation" },
        { match: "\n", token: "punctuation" },
        {
          range: [
            ["a", "z"],
            ["A", "Z"],
            ["0", "9"],
            ["_", "_"],
          ],
          token: "identifier",
        },
        { any: true, token: "punctuation" },
      ],
    },
    string: {
      rules: [
        { match: '"', token: "string", exit: true },
        { any: true, token: "string" },
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

const mdsvex_eval: AnnotationPlugin = {
  verbs: ["eval"],
  parse: "raw",
  handle: ({ args, resolve_all }) => ({
    overlays: resolve_all(args as string).map(
      (r): OverlayContribution => ({ start: r.start, end: r.end, verbatim: true }),
    ),
  }),
};

const em: AnnotationPlugin = {
  verbs: ["em"],
  handle: ({ range }) => ({
    overlays: [{ start: range.start, end: range.end, classification: "emphasis" }],
  }),
};

function render(
  input: string,
  options: RenderOptions = {},
  plugins: AnnotationPlugin[] = [],
  issues: AnnotationIssue[] = [],
) {
  const result = tokenize(input, grammar);
  if (plugins.length > 0) {
    const extractor = build_annotation_extractor(
      { plugins, on_error: (issue) => issues.push(issue) },
      result.token_types,
    );
    const found = extractor(input, result);
    if (found !== undefined) result.overlays = found;
  }
  return to_html(input, result, options);
}

function body(html: string): string {
  return html
    .replace(/^<pre[^>]*><code><span class="l[^"]*">/, "")
    .replace(/<\/span><\/code><\/pre>$/, "");
}

describe("rendering", () => {
  test("the range is written unescaped while the text around it is escaped", () => {
    const html = render("a < {b < c}", { overlays: [{ start: 4, end: 11, verbatim: true }] });
    expect(body(html)).toBe(
      '<span class="tok identifier">a</span><span class="tok punctuation"> &lt; </span><span class="tok">{b < c}</span>',
    );
  });

  test("a range made of several tokens is one span", () => {
    const html = render("f({x})", { overlays: [{ start: 2, end: 5, verbatim: true }] });
    expect(body(html)).toBe(
      '<span class="tok identifier">f</span><span class="tok punctuation">(</span><span class="tok">{x}</span><span class="tok punctuation">)</span>',
    );
  });

  test("a range inside a token splits it and takes its type", () => {
    const html = render('"a {b} c"', { overlays: [{ start: 3, end: 6, verbatim: true }] });
    expect(body(html)).toBe(
      '<span class="tok string">&quot;a </span><span class="tok string">{b}</span><span class="tok string"> c&quot;</span>',
    );
  });

  test("a range that touches text between tokens gets no type", () => {
    const html = render("a b", { overlays: [{ start: 0, end: 2, verbatim: true }] });
    expect(body(html)).toBe('<span class="tok">a </span><span class="tok identifier">b</span>');
  });

  test("type sets the class", () => {
    const html = render('"a {b} c"', {
      overlays: [{ start: 3, end: 6, verbatim: true, type: "expression" }],
    });
    expect(html).toContain('<span class="tok expression">{b}</span>');
  });

  test("a token-mode overlay over exactly the range adds its class to the span", () => {
    const html = render("f({x})", {
      overlays: [
        { start: 2, end: 5, verbatim: true, type: "expression" },
        { start: 2, end: 5, class: "mark" },
      ],
    });
    expect(html).toContain('<span class="tok expression mark">{x}</span>');
  });

  test("a token-mode overlay covering more than the range wraps it", () => {
    const html = render("f({x})", {
      overlays: [
        { start: 2, end: 5, verbatim: true },
        { start: 0, end: 6, class: "mark" },
      ],
    });
    expect(body(html)).toBe(
      '<span class="tok mark"><span class="tok identifier">f</span><span class="tok punctuation">(</span><span class="tok">{x}</span><span class="tok punctuation">)</span></span>',
    );
  });

  test("overlays reaching into the range are split at its edges and add their classes", () => {
    const html = render("aa {b} cc", {
      overlays: [
        { start: 3, end: 6, verbatim: true },
        { start: 0, end: 4, class: "left" },
        { start: 5, end: 9, class: "right" },
      ],
    });
    expect(body(html)).toBe(
      '<span class="tok left"><span class="tok identifier">aa</span></span> <span class="tok left right">{b}</span> <span class="tok right"><span class="tok identifier">cc</span></span>',
    );
  });

  test("line-mode overlays, has- classes and line numbers are unaffected", () => {
    const html = render("a\n{b}", {
      line_numbers: true,
      overlays: [
        { start: 2, end: 5, verbatim: true, type: "expression" },
        { line: 2, class: "highlight" },
      ],
    });
    expect(html).toBe(
      '<pre class="twinkleplop has-highlight"><code><span class="l"><span class="ln">1</span><span class="tok identifier">a</span></span>\n' +
        '<span class="l highlight"><span class="ln">2</span><span class="tok expression">{b}</span></span></code></pre>',
    );
  });

  test("a verbatim range alone adds no has- class", () => {
    const html = render("{b}", {
      overlays: [{ start: 0, end: 3, verbatim: true, type: "string" }],
    });
    expect(html.startsWith('<pre class="twinkleplop">')).toBe(true);
  });

  test("inline structure writes the same span", () => {
    const html = render("a\n{b < c}", {
      structure: "inline",
      overlays: [{ start: 2, end: 9, verbatim: true }],
    });
    expect(html).toBe('<span class="tok identifier">a</span><br><span class="tok">{b < c}</span>');
  });

  test("whitespace inside the range is not wrapped", () => {
    const html = render("a { b }", {
      whitespace: "all",
      overlays: [{ start: 2, end: 7, verbatim: true }],
    });
    expect(html).toContain('<span class="tok">{ b }</span>');
  });

  test("trailing whitespace in the range is trimmed like the rest of the line", () => {
    const html = render("foo {x}   \r\nbar", { overlays: [{ start: 4, end: 11, verbatim: true }] });
    expect(html).toContain('<span class="tok">{x}</span></span>\n');
  });

  test("trailing whitespace in the range is kept when whitespace renders", () => {
    const html = render("foo {x}  \nbar", {
      whitespace: "trailing",
      overlays: [{ start: 4, end: 9, verbatim: true }],
    });
    expect(html).toContain('<span class="tok">{x}  </span></span>\n');
  });

  test("a range of only trailing whitespace renders nothing", () => {
    const html = render("foo   \nbar", { overlays: [{ start: 3, end: 6, verbatim: true }] });
    expect(html).not.toContain('class="tok"');
    expect(html).toContain('<span class="tok identifier">foo</span></span>\n');
  });

  test("the token hook sees the span's type and range", () => {
    const seen: [string, number, number][] = [];
    const html = render('"{b}" {c}', {
      token: (type, start, end) => {
        seen.push([type, start, end]);
        return { class: "hooked" };
      },
      overlays: [
        { start: 1, end: 4, verbatim: true },
        { start: 6, end: 9, verbatim: true },
      ],
    });
    expect(seen).toContainEqual(["string", 1, 4]);
    expect(seen).toContainEqual(["", 6, 9]);
    expect(html).toContain('<span class="tok string hooked">{b}</span>');
    expect(html).toContain('<span class="tok hooked">{c}</span>');
  });
});

describe("option validation", () => {
  const bad: [string, OverlayItem[], RegExp][] = [
    [
      "a line break",
      [{ start: 0, end: 4, verbatim: true }],
      /overlays\[0\] is a verbatim range that spans a line break/,
    ],
    [
      "another verbatim range",
      [
        { start: 0, end: 2, verbatim: true },
        { start: 1, end: 3, verbatim: true },
      ],
      /overlays\[1\] is a verbatim range that overlaps another verbatim range/,
    ],
    [
      "a hidden range",
      [
        { start: 0, end: 2, verbatim: true },
        { start: 1, end: 3, hide: true },
      ],
      /overlays\[0\] is a verbatim range that overlaps a hidden range/,
    ],
  ];
  for (const [name, items, message] of bad) {
    test(`a verbatim range crossing ${name} throws`, () => {
      expect(() => render("abc\nd", { overlays: items })).toThrow(RangeError);
      expect(() => render("abc\nd", { overlays: items })).toThrow(message);
    });
  }

  test("type must be a class list and verbatim must be true", () => {
    expect(() =>
      render("abc", { overlays: [{ start: 0, end: 1, verbatim: true, type: 'a"b' }] }),
    ).toThrow(/overlays\[0\]\.type must be one or more css class tokens/);
    expect(() =>
      render("abc", {
        overlays: [{ start: 0, end: 1, verbatim: false } as unknown as OverlayItem],
      }),
    ).toThrow(/overlays\[0\]\.verbatim must be true/);
  });

  test("an empty range is ignored", () => {
    expect(render("abc", { overlays: [{ start: 1, end: 1, verbatim: true }] })).toBe(render("abc"));
  });

  test("the result flags verbatim ranges and names their type", () => {
    const result = overlays("{a} {b}", [
      { start: 0, end: 3, verbatim: true, type: "expression" },
      { start: 4, end: 7, verbatim: true },
    ]);
    expect([...result.ranges]).toEqual([0, 3, 0, OVERLAY_VERBATIM, 4, 7, 1, OVERLAY_VERBATIM]);
    expect(result.classifications).toEqual(["expression", ""]);
  });
});

describe("annotation plugins", () => {
  const source = 'log({ a: {some_val} }) // [!eval ="{some_val}"]';

  test("a plugin can mark a range live", () => {
    const issues: AnnotationIssue[] = [];
    const html = render(source, {}, [mdsvex_eval], issues);
    expect(issues).toEqual([]);
    expect(body(html)).toBe(
      '<span class="tok identifier">log</span><span class="tok punctuation">({ </span><span class="tok identifier">a</span><span class="tok punctuation">: </span><span class="tok">{some_val}</span><span class="tok punctuation"> })</span>',
    );
  });

  test("the tokenize result exposes the range", () => {
    const result = tokenize(source, grammar);
    const found = build_annotation_extractor({ plugins: [mdsvex_eval] }, result.token_types)(
      source,
      result,
    )!;
    expect([...found.ranges]).toEqual([9, 19, found.classifications.indexOf(""), OVERLAY_VERBATIM]);
  });

  test("a directive over the same range adds its class to the span", () => {
    const html = render('log({x}) // [!em ="{x}"] [!eval ="{x}"]', {}, [mdsvex_eval, em]);
    expect(html).toContain('<span class="tok emphasis">{x}</span>');
  });

  test("overlapping verbatim ranges report the later one and keep the first", () => {
    const issues: AnnotationIssue[] = [];
    const html = render('f({x}) // [!eval ="{x}"] [!eval ="x})"]', {}, [mdsvex_eval], issues);
    expect(issues.map((i) => [i.kind, i.message])).toEqual([
      ["malformed", "verbatim range overlaps another verbatim range"],
    ]);
    expect(html).toContain('<span class="tok">{x}</span>');
  });

  test("a verbatim range over a hidden marker is reported and dropped", () => {
    const over_marker: AnnotationPlugin = {
      verbs: ["raw"],
      handle: ({ marker }) => ({
        overlays: [{ start: marker.start, end: marker.end, verbatim: true }],
      }),
    };
    const issues: AnnotationIssue[] = [];
    const html = render("a // [!raw] note", {}, [over_marker], issues);
    expect(issues.map((i) => i.message)).toEqual(["verbatim range overlaps a hidden marker"]);
    expect(html).not.toContain("[!raw]");
  });

  test("a verbatim range across a line break is reported and dropped", () => {
    const issues: AnnotationIssue[] = [];
    const across: AnnotationPlugin = {
      verbs: ["raw"],
      handle: () => ({ overlays: [{ start: 0, end: 3, verbatim: true }] }),
    };
    const html = render("a\nb // [!raw]", {}, [across], issues);
    expect(issues.map((i) => i.message)).toEqual(["verbatim range spans a line break"]);
    expect(html).not.toContain('class="tok"');
  });

  test("an option range overlapping a plugin range throws", () => {
    expect(() =>
      render(source, { overlays: [{ start: 10, end: 12, verbatim: true }] }, [mdsvex_eval]),
    ).toThrow(/overlays\[0\] is a verbatim range that overlaps another verbatim range/);
  });
});

describe("hand-built results", () => {
  test("a range the rules reject renders as ordinary text", () => {
    const input = "a <\nb";
    const result = tokenize(input, grammar);
    result.overlays = {
      ranges: new Uint32Array([0, 5, 0, OVERLAY_VERBATIM]),
      classifications: [""],
      skip_ranges: new Uint32Array(0),
      elided_lines: new Uint8Array(0),
    };
    const html = to_html(input, result);
    expect(html).toContain("&lt;");
    expect(html).not.toContain('class="tok"');
  });
});
