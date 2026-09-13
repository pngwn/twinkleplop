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
import type { Grammar, AnnotationPlugin, OverlayResult, RenderOptions } from "./types";

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
