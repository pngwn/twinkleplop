// renderer tests for the overlay-aware path. asserts:
//   - byte-for-byte equality of no-overlay output (the unchanged fast path).
//   - line-mode classes attach to <span class="l">.
//   - skip ranges substitute marker bytes with spaces.
//   - elided lines are removed entirely (line numbers continue source-aligned).

import { describe, expect, test } from "vitest";
import { compile } from "./compiler";
import { to_html } from "./generator";
import { build_annotation_extractor } from "./annotation";
import { tokenize } from "./tokenizer";
import type {
  Grammar,
  AnnotationPlugin,
  OverlayResult,
  RenderOptions,
  TokenizeResult,
} from "./types";

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

// auto line-mode: bare/+N/:N/:N..M render line-mode (whole line styled);
// anchor ranges and =anchor render token-mode (wrapper hugs the matched
// content). matches the behaviour of the real @twinkleplop/annotation
// plugins so generator tests exercise the rendering path each kind takes.
const em: AnnotationPlugin = {
  verbs: ["em"],
  handle: ({ args, range }) => ({
    overlays: [
      {
        start: range.start,
        end: range.end,
        classification: "emphasis",
        line_mode: args.kind === "bare" || args.kind === "lineCount" || args.kind === "lineRef",
      },
    ],
  }),
};

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

function render(input: string, plugins: AnnotationPlugin[] = []): string {
  const result = tokenize(input, grammar);
  if (plugins.length > 0) {
    const extractor = build_annotation_extractor({ plugins }, result.token_types);
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
    // run again with annotation configured but no markers in source: still no
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

  test('whitespace inside an overlay span is not wrapped in <span class="tok ...">', () => {
    // line-mode overlay covers a line with `a b` (whitespace gap between
    // tokens). the renderer must not wrap that whitespace in a `<span
    // class="tok emphasis">` — the no-overlay path never wraps inter-token
    // whitespace and the overlay path should match.
    const input = "a b // [!em]\n";
    const html = render(input, [em]);
    // there is no `<span class="tok emphasis">` wrapping a single space.
    expect(html).not.toMatch(/<span class="tok emphasis">\s+<\/span>/);
    expect(html).not.toMatch(/<span class="tok [^"]*emphasis[^"]*">\s+<\/span>/);
  });

  test("token-mode overlay across whitespace omits span around whitespace", () => {
    // anchor range that spans `foo bar` — the gap between tokens is just a
    // space, which should NOT get its own `<span class="tok emphasis">`.
    const input = "foo bar baz // [!em foo...bar]\n";
    const html = render(input, [em]);
    expect(html).not.toMatch(/<span class="tok emphasis"> <\/span>/);
  });

  test("token-mode overlay opens one wrapper around its tokens", () => {
    // `foo...bar` should produce a single `<span class="tok emphasis">` that
    // wraps the inner identifier/whitespace/identifier — NOT three sibling
    // spans, each with the emphasis class. the whitespace between tokens
    // sits inside the wrapper so the highlight is visually contiguous.
    const input = "foo bar baz // [!em foo...bar]\n";
    const html = render(input, [em]);
    // exactly one wrapper opens with class "tok emphasis" on the first line.
    const wrappers = html.match(/<span class="tok emphasis">/g) ?? [];
    expect(wrappers.length).toBe(1);
    // the wrapper contains the inner identifier spans for foo and bar.
    expect(html).toMatch(
      /<span class="tok emphasis"><span class="tok identifier">foo<\/span> <span class="tok identifier">bar<\/span><\/span>/,
    );
    // baz, outside the wrapper, has no emphasis class baked into its tok span.
    expect(html).toMatch(/<span class="tok identifier">baz<\/span>/);
  });

  test("token-mode wrapper trims leading/trailing whitespace of overlay range", () => {
    // overlay covers `   foo  ` with surrounding whitespace; wrapper should
    // hug the non-whitespace content only.
    const input = "  foo  bar // [!em foo..bar]\n";
    const html = render(input, [em]);
    // exclusive `..` means wrapper covers the gap between foo and bar:
    // first non-ws after foo's end (the space) gets trimmed, last non-ws
    // before bar's start ("the space) too — leaves nothing. so no wrapper.
    // change the input to have content inside the range.
    const html2 = render("  foo middle bar // [!em foo..bar]\n", [em]);
    const wrappers = html2.match(/<span class="tok emphasis">/g) ?? [];
    expect(wrappers.length).toBe(1);
    // the wrapper opens at "middle" (first non-ws after foo's end) and
    // closes after "middle" (last non-ws before bar's start).
    expect(html2).toMatch(
      /<span class="tok emphasis"><span class="tok identifier">middle<\/span><\/span>/,
    );
    // sanity — the extra invocation has been used.
    expect(html.length).toBeGreaterThan(0);
  });

  test("trailing marker-only comment is trimmed (no run-on whitespace at line end)", () => {
    // the comment `// [!em]` is fully covered by skip ranges. emitting it
    // as substituted spaces would leave trailing whitespace on the line;
    // those bytes must be dropped from the output entirely.
    const input = "let x = 1; // [!em]\n";
    const html = render(input, [em]);
    // the line span ends with the `;` (plus its closing tag), then the
    // closing `</span>\n` for the line — no run of substituted spaces in
    // between. assertion: the rendered line has no spaces between `;`'s
    // closing tag and the line's closing `</span>`.
    expect(html).toMatch(/;<\/span><\/span>\n/);
    // sanity: no marker source bytes leaked through.
    expect(html).not.toContain("[!em");
  });

  test("elided marker comment leaves no overlay wrapper around whitespace", () => {
    // a marker-only comment line is elided entirely. on the marker's source
    // line we still have the leading whitespace + the comment bytes that
    // got substituted to spaces. neither should produce a `<span
    // class="tok comment ...">` wrapping the substituted whitespace.
    const input = "alpha\n  // [!em :1]\nbeta\n";
    const html = render(input, [em]);
    // no `<span class="tok comment ...">` containing only whitespace.
    expect(html).not.toMatch(/<span class="tok comment[^"]*">\s+<\/span>/);
    // and the marker text bytes are gone, not just classed.
    expect(html).not.toContain("[!em");
  });

  test("line numbers renumber after elision (visible position, not source)", () => {
    function render_with_lines(input: string, plugins: AnnotationPlugin[] = []): string {
      const result = tokenize(input, grammar);
      if (plugins.length > 0) {
        const extractor = build_annotation_extractor({ plugins }, result.token_types);
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

// hand-built overlays: `OverlayResult` is public on `TokenizeResult.overlays`,
// so a consumer can attach one without going through the annotation
// extractor (the programmatic equivalent of shiki's `decorations`). such a
// consumer has no reason to allocate `elided_lines` or `skip_ranges`, and
// naturally describes an empty line as an empty byte range — neither of
// which the extractor ever produces.
describe("to_html with hand-built overlays", () => {
  function render_with(input: string, ranges: number[], classifications: string[]): string {
    const result = tokenize(input, grammar);
    const overlays: OverlayResult = {
      ranges: new Uint32Array(ranges),
      classifications,
      skip_ranges: new Uint32Array(0),
      elided_lines: new Uint8Array(0),
    };
    result.overlays = overlays;
    return to_html(input, result);
  }

  function line_opens(html: string): string[] {
    return html.match(/<span class="l[^"]*">/g) ?? [];
  }

  test("line-mode overlay renders with an empty elided_lines array", () => {
    // line 3 is `c` at bytes [4, 5). flags bit 0 = line-mode.
    const input = "a\nb\nc\n";
    const html = render_with(input, [4, 5, 0, 1], ["highlight"]);
    expect(line_opens(html)).toEqual([
      '<span class="l">',
      '<span class="l">',
      '<span class="l highlight">',
      '<span class="l">',
    ]);
    expect(html).toContain('<span class="l highlight"><span class="tok identifier">c</span>');
  });

  test("empty line-mode range on an empty line applies to that line", () => {
    // line 2 is empty: its start and end are both byte 2. an empty range
    // must land on line 2, not on the line before it.
    const input = "a\n\nb";
    const html = render_with(input, [2, 2, 0, 1], ["highlight"]);
    expect(line_opens(html)).toEqual([
      '<span class="l">',
      '<span class="l highlight">',
      '<span class="l">',
    ]);
    expect(html).toContain('<span class="l highlight"></span>\n');
  });

  test("matches the annotation path for an empty target line", () => {
    // the extractor encodes `:2` as [2, 3) — up to the start of line 3 — so
    // it never emits an empty range. the hand-built [2, 2) form above must
    // render the same line span this produces.
    const input = "a\n\nb\n// [!hl :2]\n";
    const html = render(input, [hl]);
    expect(line_opens(html)[1]).toBe('<span class="l highlight">');
    expect(html).toContain('<span class="l highlight"></span>\n');
  });
});

describe("to_html with type ids past token_types", () => {
  const input = "abcdef";
  const variants: [string, RenderOptions][] = [
    ["default", {}],
    ["inline", { structure: "inline" }],
    ["line_numbers", { line_numbers: true }],
    ["token hook", { token: (_, start) => (start === 2 ? { class: "x" } : undefined) }],
  ];

  function render_ids(token_types: string[], tokens: number[], options: RenderOptions): string {
    return to_html(input, { tokens: new Uint32Array(tokens), token_types }, options);
  }

  function wrap(name: string, body: string): string {
    if (name === "inline") return body;
    const ln = name === "line_numbers" ? '<span class="ln">1</span>' : "";
    return `<pre class="twinkleplop"><code><span class="l">${ln}${body}</span></code></pre>`;
  }

  test.each(variants)("empty token_types, %s", (name, options) => {
    const hooked = name === "token hook";
    expect(render_ids([], [0, 0, 2, 1, 2, 4], options)).toBe(
      wrap(
        name,
        hooked
          ? '<span class="tok undefined">ab</span><span class="tok undefined x">cd</span>ef'
          : '<span class="tok undefined">abcd</span>ef',
      ),
    );
    expect(render_ids([], [0, 0, 2, 1, 2, 4, 5, 4, 6], options)).toBe(
      wrap(
        name,
        hooked
          ? '<span class="tok undefined">ab</span><span class="tok undefined x">cd</span><span class="tok undefined">ef</span>'
          : '<span class="tok undefined">abcdef</span>',
      ),
    );
  });

  test.each(variants)("known id next to an unknown one, %s", (name, options) => {
    const hooked = name === "token hook";
    expect(render_ids(["a"], [0, 0, 2, 1, 2, 4, 5, 4, 6], options)).toBe(
      wrap(
        name,
        hooked
          ? '<span class="tok a">ab</span><span class="tok undefined x">cd</span><span class="tok undefined">ef</span>'
          : '<span class="tok a">ab</span><span class="tok undefined">cdef</span>',
      ),
    );
  });

  test("an id keeps no tag from an earlier call with other classes", () => {
    const tokens = [0, 0, 2, 300, 2, 4];
    for (const token_types of [["a"], ["b"], [""], ["a"]]) {
      token_types[300] = token_types[0] + "z";
      const cls = token_types[0];
      expect(render_ids(token_types, tokens, {})).toBe(
        wrap("default", `<span class="tok ${cls}">ab</span><span class="tok ${cls}z">cd</span>ef`),
      );
    }
  });
});

// the no-option output is pinned byte for byte because every render option
// has to be invisible when it is absent.
describe("render options", () => {
  const add: AnnotationPlugin = {
    verbs: ["add"],
    handle: ({ range }) => ({
      overlays: [
        { start: range.start, end: range.end, classification: "diff-add", line_mode: true },
      ],
    }),
  };
  const del: AnnotationPlugin = {
    verbs: ["del"],
    handle: ({ range }) => ({
      overlays: [
        { start: range.start, end: range.end, classification: "diff-del", line_mode: true },
      ],
    }),
  };
  // classifications holding two classes, the shape a shiki compat mapping
  // emits.
  const shiki_add: AnnotationPlugin = {
    verbs: ["sadd"],
    handle: ({ range }) => ({
      overlays: [
        { start: range.start, end: range.end, classification: "diff add", line_mode: true },
      ],
    }),
  };
  const shiki_del: AnnotationPlugin = {
    verbs: ["sdel"],
    handle: ({ range }) => ({
      overlays: [
        { start: range.start, end: range.end, classification: "diff del", line_mode: true },
      ],
    }),
  };

  function render_with_options(
    input: string,
    options: RenderOptions,
    plugins: AnnotationPlugin[] = [],
  ): string {
    const result = tokenize(input, grammar);
    if (plugins.length > 0) {
      const extractor = build_annotation_extractor({ plugins }, result.token_types);
      const overlays = extractor(input, result);
      if (overlays !== undefined) result.overlays = overlays;
    }
    return to_html(input, result, options);
  }

  function pre_open(html: string): string {
    return html.substring(0, html.indexOf("<code>"));
  }

  function numbers_of(html: string): string[] {
    return [...html.matchAll(/<span class="ln">(-?\d+)<\/span>/g)].map((m) => m[1]);
  }

  describe("absent options leave the output untouched", () => {
    test("no options", () => {
      expect(render_with_options("a", {})).toBe(
        '<pre class="twinkleplop"><code><span class="l"><span class="tok identifier">a</span></span></code></pre>',
      );
    });

    test("line_numbers: true", () => {
      expect(render_with_options("a", { line_numbers: true })).toBe(
        '<pre class="twinkleplop"><code><span class="l"><span class="ln">1</span><span class="tok identifier">a</span></span></code></pre>',
      );
    });

    test("defaults spelled out match defaults left out", () => {
      const input = "a b\nc // [!em]\nd\n";
      for (const plugins of [[], [em]]) {
        const baseline = render_with_options(input, {}, plugins);
        expect(
          render_with_options(
            input,
            { line_numbers: false, class_name: "twinkleplop", has_classes: true, attributes: {} },
            plugins,
          ),
        ).toBe(baseline);
        const numbered = render_with_options(input, { line_numbers: true }, plugins);
        expect(render_with_options(input, { line_numbers: {} }, plugins)).toBe(numbered);
        expect(render_with_options(input, { line_numbers: { start: 1 } }, plugins)).toBe(numbered);
      }
    });

    test("no overlays: the class attribute is identical for every old option combination", () => {
      const input = "a b\nc\n";
      const combinations: RenderOptions[] = [
        {},
        { line_numbers: true },
        { class_name: "x" },
        { class_name: "x", line_numbers: true },
        { class_name: "" },
      ];
      for (const options of combinations) {
        const plain = render_with_options(input, options);
        expect(plain).not.toContain("has-");
        expect(render_with_options(input, options, [em])).toBe(plain);
        expect(render_with_options(input, { ...options, has_classes: false }, [em])).toBe(plain);
        expect(render_with_options(input, { ...options, has_classes: true }, [em])).toBe(plain);
      }
      expect(pre_open(render_with_options(input, { class_name: "" }))).toBe('<pre class="">');
    });
  });

  describe("line_numbers", () => {
    test("{ start } numbers the first line start", () => {
      const html = render_with_options("a\nb\nc", { line_numbers: { start: 10 } });
      expect(numbers_of(html)).toEqual(["10", "11", "12"]);
    });

    test("true, {} and { start: undefined } number from 1", () => {
      for (const line_numbers of [true, {}, { start: undefined }]) {
        expect(numbers_of(render_with_options("a\nb", { line_numbers }))).toEqual(["1", "2"]);
      }
    });

    test("false and absent emit no numbers", () => {
      expect(render_with_options("a\nb", { line_numbers: false })).not.toContain('class="ln"');
      expect(render_with_options("a\nb", {})).not.toContain('class="ln"');
    });

    test("zero and negative starts number literally", () => {
      expect(numbers_of(render_with_options("a\nb", { line_numbers: { start: 0 } }))).toEqual([
        "0",
        "1",
      ]);
      expect(numbers_of(render_with_options("a\nb\nc", { line_numbers: { start: -1 } }))).toEqual([
        "-1",
        "0",
        "1",
      ]);
    });

    test("a start that is not a finite integer throws a RangeError", () => {
      const bad: unknown[] = [1.5, NaN, Infinity, -Infinity, "3", null];
      for (const start of bad) {
        expect(() =>
          render_with_options("a", { line_numbers: { start: start as number } }),
        ).toThrow(RangeError);
      }
    });

    test("start applies on the overlay path", () => {
      const html = render_with_options("a\nb // [!em]\nc", { line_numbers: { start: 10 } }, [em]);
      expect(numbers_of(html)).toEqual(["10", "11", "12"]);
      expect(html).toContain('<span class="l emphasis"><span class="ln">11</span>');
    });

    test("an elided first line does not consume a number", () => {
      const html = render_with_options(
        "// [!em :2]\nalpha\nbeta",
        { line_numbers: { start: 10 } },
        [em],
      );
      expect(numbers_of(html)).toEqual(["10", "11"]);
      expect(html).not.toContain("[!em");
    });
  });

  describe("attributes", () => {
    test("strings, numbers and booleans, in the order given, after class", () => {
      const html = render_with_options("a", {
        attributes: { "data-title": 'a"b', tabindex: 0, hidden: true, draggable: false },
      });
      expect(pre_open(html)).toBe(
        '<pre class="twinkleplop" data-title="a&quot;b" tabindex="0" hidden>',
      );
    });

    test("a value cannot break out of the attribute", () => {
      const html = render_with_options("a", { attributes: { "data-x": "\"><script>&'" } });
      expect(pre_open(html)).toBe(
        '<pre class="twinkleplop" data-x="&quot;&gt;&lt;script&gt;&amp;&#39;">',
      );
    });

    test("an empty object emits nothing", () => {
      expect(render_with_options("a", { attributes: {} })).toBe(render_with_options("a", {}));
    });

    test("class and style are reserved", () => {
      expect(() => render_with_options("a", { attributes: { class: "x" } })).toThrow(TypeError);
      expect(() => render_with_options("a", { attributes: { class: "x" } })).toThrow(/class/);
      expect(() => render_with_options("a", { attributes: { style: "color: red" } })).toThrow(
        /style/,
      );
    });

    test("an invalid attribute name throws", () => {
      for (const name of ["", "1x", "a b", "on<click", 'x"y', "a=b", "é", "a/b"]) {
        expect(() => render_with_options("a", { attributes: { [name]: "v" } })).toThrow(TypeError);
      }
    });

    test("valid attribute names are accepted", () => {
      const html = render_with_options("a", {
        attributes: { "data-x": 1, "xml:lang": "en", "a.b": "c", _x: "y", Data9: "z" },
      });
      expect(pre_open(html)).toBe(
        '<pre class="twinkleplop" data-x="1" xml:lang="en" a.b="c" _x="y" Data9="z">',
      );
    });

    test("a value of another type throws", () => {
      const values: unknown[] = [null, undefined, {}, [], () => 1];
      for (const value of values) {
        expect(() =>
          render_with_options("a", { attributes: { "data-x": value as string } }),
        ).toThrow(TypeError);
      }
    });

    test("attributes are emitted on the overlay path", () => {
      const html = render_with_options("a // [!em]", { attributes: { "data-title": "t" } }, [em]);
      expect(pre_open(html)).toBe('<pre class="twinkleplop has-emphasis" data-title="t">');
    });
  });

  describe("has-* classes", () => {
    test("one class per classification, ordered by first appearance in the source", () => {
      const html = render_with_options("a // [!del]\nb // [!add]\n", {}, [add, del]);
      expect(pre_open(html)).toBe('<pre class="twinkleplop has-diff-del has-diff-add">');
      const flipped = render_with_options("a // [!add]\nb // [!del]\n", {}, [add, del]);
      expect(pre_open(flipped)).toBe('<pre class="twinkleplop has-diff-add has-diff-del">');
    });

    test("duplicates collapse", () => {
      const html = render_with_options("a // [!add]\nb // [!add]\n", {}, [add]);
      expect(pre_open(html)).toBe('<pre class="twinkleplop has-diff-add">');
    });

    test("token-mode overlays count", () => {
      const html = render_with_options("foo bar // [!em =foo]\n", {}, [em]);
      expect(pre_open(html)).toBe('<pre class="twinkleplop has-emphasis">');
    });

    test("only the first token of a multi-class classification is prefixed", () => {
      const html = render_with_options("a // [!sadd]\nb // [!sdel]\n", {}, [shiki_add, shiki_del]);
      expect(pre_open(html)).toBe('<pre class="twinkleplop has-diff">');
      expect(html).toContain('<span class="l diff add">');
      expect(html).toContain('<span class="l diff del">');
    });

    test("has_classes: false suppresses them", () => {
      const html = render_with_options("a // [!del]\nb // [!add]\n", { has_classes: false }, [
        add,
        del,
      ]);
      expect(pre_open(html)).toBe('<pre class="twinkleplop">');
      expect(html).toContain('<span class="l diff-del">');
    });

    test('with class_name: "" the class attribute holds only the has- classes', () => {
      const html = render_with_options("a // [!add]\n", { class_name: "" }, [add]);
      expect(pre_open(html)).toBe('<pre class="has-diff-add">');
    });

    test("hand-built ranges are ordered by source position, not array order", () => {
      const input = "a\nb\nc\n";
      const result = tokenize(input, grammar);
      result.overlays = {
        ranges: new Uint32Array([4, 5, 0, 1, 0, 1, 1, 1]),
        classifications: ["highlight", "emphasis"],
        skip_ranges: new Uint32Array(0),
        elided_lines: new Uint8Array(0),
      };
      expect(pre_open(to_html(input, result))).toBe(
        '<pre class="twinkleplop has-emphasis has-highlight">',
      );
    });

    test("an overlay result without ranges adds nothing", () => {
      const input = "a\n";
      const result = tokenize(input, grammar);
      result.overlays = {
        ranges: new Uint32Array(0),
        classifications: ["highlight"],
        skip_ranges: new Uint32Array(0),
        elided_lines: new Uint8Array(0),
      };
      expect(to_html(input, result)).toBe(to_html(input, tokenize(input, grammar)));
    });
  });

  test("the options compose", () => {
    const html = render_with_options(
      "a // [!del]\nb // [!add]\nc",
      {
        class_name: "code",
        line_numbers: { start: 10 },
        attributes: { "data-title": "math.ts", tabindex: 0 },
      },
      [add, del],
    );
    expect(pre_open(html)).toBe(
      '<pre class="code has-diff-del has-diff-add" data-title="math.ts" tabindex="0">',
    );
    expect(numbers_of(html)).toEqual(["10", "11", "12"]);
    expect(html).toContain('<span class="l diff-del"><span class="ln">10</span>');
    expect(html).toContain('<span class="l diff-add"><span class="ln">11</span>');
  });
});

describe("inline structure and hooks", () => {
  function render_opts(
    input: string,
    options: RenderOptions,
    plugins: AnnotationPlugin[] = [],
  ): string {
    const result = tokenize(input, grammar);
    if (plugins.length > 0) {
      const extractor = build_annotation_extractor({ plugins }, result.token_types);
      const overlays = extractor(input, result);
      if (overlays !== undefined) result.overlays = overlays;
    }
    return to_html(input, result, options);
  }

  // the tokenizer merges same type runs, so adjacent tokens of one type need
  // a hand built result.
  function hand_built(types: string[], triples: number[]): TokenizeResult {
    return { tokens: new Uint32Array(triples), token_types: types };
  }

  const IDENT = (s: string) => `<span class="tok identifier">${s}</span>`;
  const SPACE = '<span class="tok punctuation"> </span>';

  describe("structure", () => {
    test('"inline" emits bare tokens with <br> between lines', () => {
      expect(render_opts("a b\nc", { structure: "inline" })).toBe(
        `${IDENT("a")}${SPACE}${IDENT("b")}<br>${IDENT("c")}`,
      );
    });

    test("a single line has no <br>", () => {
      expect(render_opts("a", { structure: "inline" })).toBe(IDENT("a"));
    });

    test("a trailing newline emits a trailing <br>", () => {
      expect(render_opts("a\n", { structure: "inline" })).toBe(`${IDENT("a")}<br>`);
      expect(render_opts("a\n\n", { structure: "inline" })).toBe(`${IDENT("a")}<br><br>`);
    });

    test('"classic" and absent are the same', () => {
      for (const plugins of [[], [hl]]) {
        const input = "a b // [!hl]\nc\n";
        expect(render_opts(input, { structure: "classic" }, plugins)).toBe(
          render_opts(input, {}, plugins),
        );
      }
    });

    test("token mode overlays and hidden ranges still apply", () => {
      const html = render_opts("foo bar baz // [!hl foo...bar]\nb", { structure: "inline" }, [hl]);
      expect(html).toBe(
        `<span class="tok highlight">${IDENT("foo")} ${IDENT("bar")}</span> ${IDENT("baz")}<br>${IDENT("b")}`,
      );
      expect(html).not.toContain("[!hl");
    });

    test("line mode overlays are dropped silently", () => {
      const html = render_opts("a // [!hl]\nb", { structure: "inline" }, [hl]);
      expect(html).toBe(`${IDENT("a")}<br>${IDENT("b")}`);
      expect(html).not.toContain("highlight");
    });

    test("a hidden line produces no <br>", () => {
      const input = "a\n// [!hl]\nb\n// [!hl]";
      const inline = render_opts(input, { structure: "inline" }, [hl]);
      expect(inline).toBe(`${IDENT("a")}<br>${IDENT("b")}<br>`);
      const classic = render_opts(input, {}, [hl]);
      expect(inline.match(/<br>/g)?.length).toBe(classic.match(/<\/span>\n/g)?.length);
    });

    test("the overlays option follows the same rules", () => {
      const html = render_opts("ab cd\nef", {
        structure: "inline",
        overlays: [
          { start: 0, end: 2, class: "mark" },
          { line: 2, class: "highlight" },
          { start: 3, end: 5, hide: true },
        ],
      });
      expect(html).toBe(`<span class="tok mark">${IDENT("ab")}</span><br>${IDENT("ef")}`);
    });

    test("block and line level options are ignored without error", () => {
      const base = { structure: "inline" as const };
      const noisy: RenderOptions = {
        ...base,
        line_numbers: { start: "ten" as unknown as number },
        class_name: "code",
        attributes: { class: "x", "1bad": true },
        has_classes: true,
        line: () => {
          throw new Error("line hook must not run inline");
        },
      };
      expect(render_opts("a\nb", noisy)).toBe(render_opts("a\nb", base));
      const marked = "foo bar // [!hl foo...bar]\nb // [!hl]";
      expect(render_opts(marked, noisy, [hl])).toBe(render_opts(marked, base, [hl]));
    });
  });

  describe("line hook", () => {
    test("receives the visible index and the source line", () => {
      const calls: [number, number][] = [];
      render_opts(
        "a\n// [!hl]\nb",
        {
          line: (n, source_line) => {
            calls.push([n, source_line]);
          },
        },
        [hl],
      );
      expect(calls).toEqual([
        [1, 1],
        [2, 3],
      ]);
    });

    test("the visible index ignores the line_numbers start", () => {
      const calls: number[] = [];
      const html = render_opts("a\nb", {
        line_numbers: { start: 10 },
        line: (n) => {
          calls.push(n);
          return { attrs: { "data-n": n } };
        },
      });
      expect(calls).toEqual([1, 2]);
      expect(html).toContain('<span class="l" data-n="1"><span class="ln">10</span>');
      expect(html).toContain('<span class="l" data-n="2"><span class="ln">11</span>');
    });

    test("class goes after overlay classes and attrs after the class", () => {
      const html = render_opts(
        "a // [!hl]\nb\n",
        { line: (n) => ({ class: "x", attrs: { "data-line": String(n), hidden: true } }) },
        [hl],
      );
      expect(html).toContain('<span class="l highlight x" data-line="1" hidden>');
      expect(html).toContain('<span class="l x" data-line="2" hidden>');
    });

    test("works on the no overlay path with line numbers", () => {
      expect(render_opts("a\nb", { line_numbers: true, line: () => ({ class: "x" }) })).toBe(
        `<pre class="twinkleplop"><code><span class="l x"><span class="ln">1</span>${IDENT("a")}</span>\n<span class="l x"><span class="ln">2</span>${IDENT("b")}</span></code></pre>`,
      );
    });

    test("an empty class, an empty object, nothing and null add nothing", () => {
      const input = "a\nb // [!hl]\n";
      for (const plugins of [[], [hl]]) {
        const plain = render_opts(input, {}, plugins);
        expect(render_opts(input, { line: () => ({ class: "" }) }, plugins)).toBe(plain);
        expect(render_opts(input, { line: () => ({}) }, plugins)).toBe(plain);
        expect(render_opts(input, { line: () => undefined }, plugins)).toBe(plain);
        expect(render_opts(input, { line: () => null as unknown as undefined }, plugins)).toBe(
          plain,
        );
      }
    });

    test("the class is escaped", () => {
      expect(render_opts("a", { line: () => ({ class: 'x"><b' }) })).toContain(
        '<span class="l x&quot;&gt;&lt;b">',
      );
    });

    test("bad return values and reserved attrs throw", () => {
      for (const plugins of [[], [hl]]) {
        const input = "a // [!hl]";
        expect(() =>
          render_opts(input, { line: () => false as unknown as undefined }, plugins),
        ).toThrow(TypeError);
        expect(() =>
          render_opts(input, { line: () => "x" as unknown as undefined }, plugins),
        ).toThrow(TypeError);
        expect(() =>
          render_opts(input, { line: () => ({ attrs: { class: "x" } }) }, plugins),
        ).toThrow(/class/);
        expect(() =>
          render_opts(input, { line: () => ({ attrs: { style: "x" } }) }, plugins),
        ).toThrow(TypeError);
        expect(() =>
          render_opts(input, { line: () => ({ attrs: { "1x": "x" } }) }, plugins),
        ).toThrow(TypeError);
        expect(() =>
          render_opts(
            input,
            {
              line: () => {
                throw new Error("boom");
              },
            },
            plugins,
          ),
        ).toThrow("boom");
      }
    });
  });

  describe("token hook", () => {
    test("is called once per token in order with type and range", () => {
      const input = "a b // c\nd";
      const result = tokenize(input, grammar);
      const expected: [string, number, number][] = [];
      for (let i = 0; i < result.tokens.length; i += 3) {
        expected.push([
          result.token_types[result.tokens[i]],
          result.tokens[i + 1],
          result.tokens[i + 2],
        ]);
      }
      const calls: [string, number, number][] = [];
      to_html(input, result, { token: (t, s, e) => void calls.push([t, s, e]) });
      expect(calls).toEqual(expected);
    });

    test("decorated tokens carry the attrs and other spans are untouched", () => {
      const input = "a b\nc d";
      const plain = render_opts(input, {});
      const html = render_opts(input, {
        token: (type, start, end) =>
          type === "identifier" ? { attrs: { "data-range": `${start}-${end}` } } : undefined,
      });
      expect(html).toContain('<span class="tok identifier" data-range="0-1">a</span>');
      expect(html).toContain('<span class="tok identifier" data-range="6-7">d</span>');
      expect(html.replace(/ data-range="\d+-\d+"/g, "")).toBe(plain);
    });

    test("the class goes after the type and the attrs after the class", () => {
      expect(
        render_opts("a", {
          token: () => ({ class: "x y", attrs: { "data-a": 1, "data-b": "z" } }),
        }),
      ).toContain('<span class="tok identifier x y" data-a="1" data-b="z">a</span>');
    });

    test("a decorated token is never merged with its neighbours", () => {
      const input = "a.,b";
      const result = hand_built(
        ["identifier", "punctuation"],
        [0, 0, 1, 1, 1, 2, 1, 2, 3, 0, 3, 4],
      );
      expect(to_html(input, result)).toContain('<span class="tok punctuation">.,</span>');
      const second = to_html(input, result, {
        token: (_, start) => (start === 2 ? { attrs: { "data-x": 1 } } : undefined),
      });
      expect(second).toContain(
        '<span class="tok punctuation">.</span><span class="tok punctuation" data-x="1">,</span>',
      );
      const first = to_html(input, result, {
        token: (_, start) => (start === 1 ? {} : undefined),
      });
      expect(first).toContain(
        '<span class="tok punctuation">.</span><span class="tok punctuation">,</span>',
      );
      const both = to_html(input, result, {
        token: (type) => (type === "punctuation" ? {} : undefined),
      });
      expect(both).toContain(
        '<span class="tok punctuation">.</span><span class="tok punctuation">,</span>',
      );
    });

    test("inside an overlay wrapper the output goes on the token span", () => {
      const html = render_opts(
        "foo bar baz // [!hl foo...bar]",
        { token: (_, start) => (start === 0 ? { attrs: { "data-t": 1 } } : undefined) },
        [hl],
      );
      expect(html).toContain(
        `<span class="tok highlight"><span class="tok identifier" data-t="1">foo</span> ${IDENT("bar")}</span>`,
      );
    });

    test("a token that spans a line break reopens with the same tag", () => {
      const input = "x\ny";
      const result = hand_built(["string"], [0, 0, 3]);
      const options: RenderOptions = { token: () => ({ attrs: { "data-s": 1 } }) };
      expect(to_html(input, result, options)).toBe(
        '<pre class="twinkleplop"><code><span class="l"><span class="tok string" data-s="1">x</span></span>\n<span class="l"><span class="tok string" data-s="1">y</span></span></code></pre>',
      );
      expect(to_html(input, result, { ...options, structure: "inline" })).toBe(
        '<span class="tok string" data-s="1">x</span><br><span class="tok string" data-s="1">y</span>',
      );
    });

    test("applies in inline mode too", () => {
      expect(
        render_opts("a b", {
          structure: "inline",
          token: (t) => (t === "identifier" ? { class: "i" } : undefined),
        }),
      ).toBe(
        `<span class="tok identifier i">a</span>${SPACE}<span class="tok identifier i">b</span>`,
      );
    });

    test("bad return values and reserved attrs throw", () => {
      for (const plugins of [[], [hl]]) {
        const input = "a // [!hl]";
        expect(() =>
          render_opts(input, { token: () => ({ attrs: { class: "x" } }) }, plugins),
        ).toThrow(/class/);
        expect(() =>
          render_opts(input, { token: () => ({ attrs: { style: "x" } }) }, plugins),
        ).toThrow(TypeError);
        expect(() =>
          render_opts(input, { token: () => false as unknown as undefined }, plugins),
        ).toThrow(TypeError);
        expect(() =>
          render_opts(input, { token: () => "x" as unknown as undefined }, plugins),
        ).toThrow(TypeError);
        expect(() =>
          render_opts(input, { token: () => ({ class: 1 as unknown as string }) }, plugins),
        ).toThrow(TypeError);
        expect(() =>
          render_opts(
            input,
            {
              token: () => {
                throw new Error("boom");
              },
            },
            plugins,
          ),
        ).toThrow("boom");
      }
    });
  });

  test("absent hooks and classic structure leave the output byte identical", () => {
    const input = "a b // [!hl foo...bar]\nc // [!hl]\nd\n";
    for (const plugins of [[], [hl]]) {
      for (const options of [{}, { line_numbers: { start: 3 }, class_name: "c" }]) {
        const plain = render_opts(input, options, plugins);
        expect(
          render_opts(
            input,
            { ...options, structure: "classic", line: undefined, token: undefined },
            plugins,
          ),
        ).toBe(plain);
        expect(render_opts(input, { ...options, token: () => undefined }, plugins)).toBe(plain);
      }
    }
  });
});

describe("whitespace and indent guides", () => {
  // the toy grammar above tokenizes spaces, so these use one that leaves
  // whitespace between tokens as bare text the way the real grammars do.
  const gap_grammar = compile<Grammar>({
    name: "gaps",
    states: {
      root: {
        rules: [
          { match: "//", token: "comment", state: "line_comment" },
          { match: "'", token: "string", state: "string" },
          {
            range: [
              ["a", "z"],
              ["A", "Z"],
              ["0", "9"],
            ],
            token: "identifier",
          },
          { match: ";", token: "punctuation" },
          { match: "<", token: "punctuation" },
        ],
      },
      string: {
        rules: [
          { match: "'", token: "string", exit: true },
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

  function render_ws(
    input: string,
    options: RenderOptions,
    plugins: AnnotationPlugin[] = [],
  ): string {
    const result = tokenize(input, gap_grammar);
    if (plugins.length > 0) {
      const extractor = build_annotation_extractor({ plugins }, result.token_types);
      const overlays = extractor(input, result);
      if (overlays !== undefined) result.overlays = overlays;
    }
    return to_html(input, result, options);
  }

  function lines(html: string): string[] {
    const body = html.replace(/^<pre[^>]*><code>/, "").replace(/<\/code><\/pre>$/, "");
    return body
      .split("\n")
      .map((l) => l.replace(/^<span class="l[^"]*">/, "").replace(/<\/span>$/, ""));
  }

  const ID = (s: string) => `<span class="tok identifier">${s}</span>`;
  const SEMI = '<span class="tok punctuation">;</span>';
  const SP = '<span class="tok space"> </span>';
  const TAB = '<span class="tok tab">\t</span>';
  const IND = (s: string) => `<span class="indent">${s}</span>`;

  describe("whitespace", () => {
    test('"all" wraps every space between tokens and none inside a token', () => {
      const html = render_ws("return  1;\n'a b'", { whitespace: "all" });
      expect(lines(html)).toEqual([
        `${ID("return")}${SP}${SP}${ID("1")}${SEMI}`,
        `<span class="tok string">&#39;a b&#39;</span>`,
      ]);
    });

    test('"trailing" wraps only the whitespace after the last token', () => {
      const html = render_ws("  return  1;  ", { whitespace: "trailing" });
      expect(lines(html)).toEqual([`  ${ID("return")}  ${ID("1")}${SEMI}${SP}${SP}`]);
    });

    test('"leading" wraps only the whitespace before the first token', () => {
      const html = render_ws("  return  1;  ", { whitespace: "leading" });
      expect(lines(html)).toEqual([`${SP}${SP}${ID("return")}  ${ID("1")}${SEMI}  `]);
    });

    test('"boundary" wraps both ends and leaves the middle bare', () => {
      const html = render_ws("\treturn  1;  ", { whitespace: "boundary" });
      expect(lines(html)).toEqual([`${TAB}${ID("return")}  ${ID("1")}${SEMI}${SP}${SP}`]);
    });

    test("a whitespace only line is wrapped once", () => {
      for (const whitespace of ["leading", "trailing", "boundary", "all"] as const) {
        expect(lines(render_ws("a\n  \nb", { whitespace }))).toEqual([ID("a"), SP + SP, ID("b")]);
      }
    });

    test("an empty line renders nothing extra", () => {
      for (const whitespace of ["leading", "trailing", "boundary", "all"] as const) {
        expect(lines(render_ws("a\n\nb\n", { whitespace, indent_guides: true }))).toEqual([
          ID("a"),
          "",
          ID("b"),
          "",
        ]);
      }
    });

    test("a gap spanning several lines classifies each run by its own line", () => {
      const html = render_ws("a  \n  \n  b", { whitespace: "boundary" });
      expect(lines(html)).toEqual([`${ID("a")}${SP}${SP}`, SP + SP, `${SP}${SP}${ID("b")}`]);
    });

    test("carriage returns are left bare and still end the line", () => {
      const html = render_ws("a  \r\nb", { whitespace: "trailing" });
      expect(lines(html)).toEqual([`${ID("a")}${SP}${SP}\r`, ID("b")]);
    });

    test("bare text between tokens is escaped as before", () => {
      const html = render_ws("a & b", { whitespace: "all" });
      expect(lines(html)).toEqual([`${ID("a")}${SP}&amp;${SP}${ID("b")}`]);
    });

    test("an unknown mode throws a TypeError", () => {
      expect(() => render_ws("a", { whitespace: "both" as unknown as "all" })).toThrow(TypeError);
    });
  });

  describe("indent_guides", () => {
    test("each tab is one level", () => {
      expect(lines(render_ws("\t\ta", { indent_guides: true }))).toEqual([
        `${IND("\t")}${IND("\t")}${ID("a")}`,
      ]);
    });

    test("size spaces are one level and a remainder stays bare", () => {
      expect(lines(render_ws("    a", { indent_guides: { size: 2 } }))).toEqual([
        `${IND("  ")}${IND("  ")}${ID("a")}`,
      ]);
      expect(lines(render_ws("   a", { indent_guides: true }))).toEqual([
        `${IND("  ")} ${ID("a")}`,
      ]);
      expect(lines(render_ws("    a", { indent_guides: { size: 4 } }))).toEqual([
        `${IND("    ")}${ID("a")}`,
      ]);
      expect(lines(render_ws("    a", { indent_guides: {} }))).toEqual([
        `${IND("  ")}${IND("  ")}${ID("a")}`,
      ]);
    });

    test("mixed tabs and spaces count levels in order of appearance", () => {
      expect(lines(render_ws("\t  a", { indent_guides: true }))).toEqual([
        `${IND("\t")}${IND("  ")}${ID("a")}`,
      ]);
      expect(lines(render_ws(" \t a", { indent_guides: true }))).toEqual([
        ` ${IND("\t")} ${ID("a")}`,
      ]);
    });

    test("a whitespace only line is treated as indentation", () => {
      expect(lines(render_ws("a\n   \nb", { indent_guides: true }))).toEqual([
        ID("a"),
        `${IND("  ")} `,
        ID("b"),
      ]);
    });

    test("whitespace after the first token is not indentation", () => {
      expect(lines(render_ws("a    b  ", { indent_guides: true }))).toEqual([
        `${ID("a")}    ${ID("b")}  `,
      ]);
    });

    test("the line number comes before the indent", () => {
      expect(render_ws("  a", { indent_guides: true, line_numbers: true })).toContain(
        `<span class="ln">1</span>${IND("  ")}${ID("a")}`,
      );
    });

    test("false is the same as absent", () => {
      expect(render_ws("  a", { indent_guides: false })).toBe(render_ws("  a", {}));
    });

    test("a size that is not a positive integer throws a RangeError", () => {
      for (const size of [0, -1, 1.5, NaN, Infinity, "2"]) {
        expect(() => render_ws("a", { indent_guides: { size: size as number } })).toThrow(
          RangeError,
        );
      }
    });
  });

  test("with both options the indent span contains the whitespace spans", () => {
    const html = render_ws("\tif\n\t\treturn  1;  \n", {
      whitespace: "trailing",
      indent_guides: true,
    });
    expect(lines(html)).toEqual([
      `${IND("\t")}${ID("if")}`,
      `${IND("\t")}${IND("\t")}${ID("return")}  ${ID("1")}${SEMI}${SP}${SP}`,
      "",
    ]);
    expect(lines(render_ws("\t  a", { whitespace: "all", indent_guides: true }))).toEqual([
      `${IND(TAB)}${IND(SP + SP)}${ID("a")}`,
    ]);
    expect(lines(render_ws("   a", { whitespace: "leading", indent_guides: true }))).toEqual([
      `${IND(SP + SP)}${SP}${ID("a")}`,
    ]);
  });

  test("inline structure wraps whitespace the same way", () => {
    expect(
      render_ws("\ta  b\n  c  ", {
        whitespace: "boundary",
        indent_guides: true,
        structure: "inline",
      }),
    ).toBe(`${IND(TAB)}${ID("a")}  ${ID("b")}<br>${IND(SP + SP)}${ID("c")}${SP}${SP}`);
  });

  describe("with overlays", () => {
    const options: RenderOptions = { whitespace: "all", indent_guides: true };

    test("spaces substituted for a hidden range are not wrapped", () => {
      const html = render_ws("a // [!hl] b\n  b", { ...options }, [hl]);
      expect(html).toContain('<span class="l highlight">');
      expect(lines(html)).toEqual([
        `${ID("a")}${SP}<span class="tok comment">//       b</span>`,
        `${IND(SP + SP)}${ID("b")}`,
      ]);
      const hidden = render_ws("a /* x */ b", {
        ...options,
        overlays: [{ start: 2, end: 9, hide: true }],
      });
      expect(lines(hidden)).toEqual([`${ID("a")}${SP}       ${SP}${ID("b")}`]);
    });

    test("whitespace stays outside a token mode wrapper and is wrapped inside it", () => {
      const html = render_ws("  foo bar  // [!hl foo...bar]", options, [hl]);
      expect(lines(html)).toEqual([
        `${IND(SP + SP)}<span class="tok highlight">${ID("foo")}${SP}${ID("bar")}</span>`,
      ]);
    });

    test("a line mode class stays on the line element", () => {
      const html = render_ws("  a  \nb", { ...options, overlays: [{ line: 1, class: "mark" }] });
      expect(html).toContain(`<span class="l mark">${IND(SP + SP)}${ID("a")}${SP}${SP}</span>`);
    });

    test("trailing source whitespace is kept when it is being rendered", () => {
      const overlays = [{ line: 2, class: "mark" }];
      expect(lines(render_ws("a  \nb", { overlays }))).toEqual([ID("a"), ID("b")]);
      expect(lines(render_ws("a  \nb", { overlays, whitespace: "leading" }))).toEqual([
        `${ID("a")}  `,
        ID("b"),
      ]);
      expect(lines(render_ws("a  \nb", { overlays, whitespace: "trailing" }))).toEqual([
        `${ID("a")}${SP}${SP}`,
        ID("b"),
      ]);
    });

    test("whitespace around a hidden marker goes with the marker", () => {
      const html = render_ws("a  // [!hl]  \nb", options, [hl]);
      expect(lines(html)).toEqual([ID("a"), ID("b")]);
    });

    test("both structures agree", () => {
      const input = "\ta  b  // [!hl a...b]\n  // [!hl]\n  c  ";
      const classic = lines(render_ws(input, options, [hl]));
      const inline = render_ws(input, { ...options, structure: "inline" }, [hl]);
      expect(inline).toBe(classic.join("<br>"));
    });
  });

  test("hooks compose with the whitespace spans", () => {
    const html = render_ws("  a b", {
      whitespace: "all",
      indent_guides: true,
      line: (n) => ({ attrs: { "data-line": n } }),
      token: (type) => (type === "identifier" ? { class: "x" } : undefined),
    });
    expect(html).toContain(
      `<span class="l" data-line="1">${IND(SP + SP)}<span class="tok identifier x">a</span>${SP}<span class="tok identifier x">b</span></span>`,
    );
  });

  test("absent options leave the output byte identical", () => {
    const input = "\ta  b // [!hl a...b]\n  c  \n\n  // [!hl]\nd\n";
    for (const plugins of [[], [hl]]) {
      for (const structure of ["classic", "inline"] as const) {
        const plain = render_ws(input, { structure }, plugins);
        expect(
          render_ws(input, { structure, whitespace: undefined, indent_guides: false }, plugins),
        ).toBe(plain);
      }
    }
  });
});
