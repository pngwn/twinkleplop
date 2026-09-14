// `shiki_notation` runs against the real javascript grammar so the fixtures
// from @shikijs/transformers 4.4.3 can be compared line for line. expected
// values are the per-line class sets and highlighted words shiki produces
// for the same inputs (packages/transformers/test/fixtures at v4.4.3),
// including the empty line both keep after the final newline.

import { describe, expect, test } from "vitest";
import type { AnnotationIssue, AnnotationPlugin } from "@twinkleplop/core";
import { language as javascript } from "@twinkleplop/javascript";
import { shiki_notation } from "../shiki";

function highlighter(plugin: AnnotationPlugin, on_error?: (issue: AnnotationIssue) => void) {
  return javascript({ annotation: { plugins: [plugin], on_error } });
}

const twinkleplop = highlighter(shiki_notation());
const shiki = highlighter(shiki_notation({ classes: "shiki" }));

// sorted class list per visible line.
function line_classes(html: string): string[][] {
  const out: string[][] = [];
  for (const m of html.matchAll(/<span class="l([^"]*)">/g)) {
    out.push(m[1].split(" ").filter(Boolean).sort());
  }
  return out;
}

// true when a comment token still shows `[!code`; string literals may.
function marker_in_comment(html: string): boolean {
  return /<span class="tok comment">[^<]*\[!code/.test(html);
}

function decode(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// text of every token-mode wrapper carrying `cls`, in document order.
function highlighted_words(html: string, cls: string): string[] {
  const re = new RegExp(
    `<span class="tok ${cls}">((?:<span class="tok [^"]*">[^<]*</span>|[^<])*)</span>`,
    "g",
  );
  return [...html.matchAll(re)].map((m) => decode(m[1].replace(/<[^>]+>/g, "")));
}

function pre_classes(html: string): string {
  return /^<pre class="([^"]*)"/.exec(html)![1];
}

const H = ["highlighted"];
const F = ["focused"];

describe("shiki_notation: spec snippet", () => {
  const snippet = [
    "const a = 1 // [!code highlight]",
    "// [!code focus:2]",
    "const b = 2",
    "const c = 3 // [!code --]",
    "const d = 4 // [!code ++]",
  ].join("\n");

  test("default classes use the twinkleplop vocabulary", () => {
    const html = twinkleplop(snippet);
    expect(pre_classes(html)).toBe("twinkleplop has-highlight has-focus has-diff-del has-diff-add");
    expect(line_classes(html)).toEqual([
      ["highlight"],
      ["focus"],
      ["diff-del", "focus"],
      ["diff-add"],
    ]);
    expect(html).not.toContain("[!code");
  });

  test("classes: shiki uses shiki's vocabulary and has- names", () => {
    const html = shiki(snippet);
    expect(pre_classes(html)).toBe("twinkleplop has-highlighted has-focused has-diff");
    expect(line_classes(html)).toEqual([H, F, ["diff", "focused", "remove"], ["add", "diff"]]);
  });

  test("the plugin claims only the code verb", () => {
    expect(shiki_notation().verbs).toEqual(["code"]);
    expect(shiki_notation().parse).toBe("raw");
  });

  test("two plugins claiming code collide at registration", () => {
    expect(() =>
      javascript({ annotation: { plugins: [shiki_notation(), shiki_notation()] } }),
    ).toThrow(/code/);
  });
});

describe("shiki_notation: matching rules", () => {
  test("several notations in one comment each apply", () => {
    const html = twinkleplop("a\nb // [!code highlight] [!code focus]\nc");
    expect(line_classes(html)).toEqual([[], ["focus", "highlight"], []]);
    expect(html).not.toContain("[!code");
  });

  test("a standalone marker disappears and counts the lines below it", () => {
    const html = twinkleplop("a\n// [!code highlight:2]\nb\nc\nd");
    expect(line_classes(html)).toEqual([[], ["highlight"], ["highlight"], []]);
  });

  test("a trailing marker counts from its own line", () => {
    const html = twinkleplop("a\nb // [!code highlight:2]\nc\nd");
    expect(line_classes(html)).toEqual([[], ["highlight"], ["highlight"], []]);
  });

  test("a count past the last line applies to the lines that exist", () => {
    const issues: AnnotationIssue[] = [];
    const html = highlighter(shiki_notation(), (i) => issues.push(i))("// [!code focus:9]\na\nb");
    expect(line_classes(html)).toEqual([["focus"], ["focus"]]);
    expect(issues).toEqual([]);
  });

  test("an unrecognised notation stays as comment text and is not reported", () => {
    const issues: AnnotationIssue[] = [];
    const html = highlighter(shiki_notation(), (i) => issues.push(i))(
      "a // [!code nope]\nb // [!code]",
    );
    expect(html).toContain("[!code nope]");
    expect(html).toContain("[!code]");
    expect(line_classes(html)).toEqual([[], []]);
    expect(issues).toEqual([]);
  });

  test("a recognised notation next to an unrecognised one keeps the other text", () => {
    const html = twinkleplop("a // [!code highlight] [!code nope]");
    expect(line_classes(html)).toEqual([["highlight"]]);
    expect(html).toContain("[!code nope]");
    expect(html).not.toContain("[!code highlight]");
  });

  test("notation names are case insensitive like shiki's", () => {
    expect(line_classes(twinkleplop("a // [!code HIGHLIGHT]"))).toEqual([["highlight"]]);
  });

  test("a zero or non-numeric count is malformed and the marker is still removed", () => {
    const issues: AnnotationIssue[] = [];
    const html = highlighter(shiki_notation(), (i) => issues.push(i))(
      "a // [!code highlight:0]\nb // [!code focus:x]",
    );
    expect(issues.map((i) => i.kind)).toEqual(["malformed", "malformed"]);
    expect(issues[0].position.line).toBe(1);
    expect(issues[1].position.line).toBe(2);
    expect(html).not.toContain("[!code");
    expect(line_classes(html)).toEqual([[], []]);
  });

  test("a comment with prose keeps the prose", () => {
    const html = twinkleplop("a // keep me [!code highlight]");
    expect(line_classes(html)).toEqual([["highlight"]]);
    expect(html).toContain("keep me");
    expect(html).not.toContain("[!code");
  });

  test("[\\!code highlight] is not a marker", () => {
    const issues: AnnotationIssue[] = [];
    const html = highlighter(shiki_notation(), (i) => issues.push(i))("a // [\\!code highlight]");
    expect(line_classes(html)).toEqual([[]]);
    expect(html).toContain("[\\!code highlight]");
    expect(issues).toEqual([]);
  });
});

describe("shiki_notation: word", () => {
  test("word:text highlights every occurrence on the lines after a standalone marker", () => {
    const html = twinkleplop('// [!code word:foo]\nconst foo = "foo"\nfoo()');
    expect(highlighted_words(html, "highlight")).toEqual(["foo", "foo", "foo"]);
    expect(line_classes(html)).toEqual([[], []]);
  });

  test("word:text:N stops after N lines", () => {
    const html = twinkleplop("// [!code word:foo:1]\nfoo()\nfoo()");
    expect(highlighted_words(html, "highlight")).toEqual(["foo"]);
  });

  test("a trailing word marker starts on its own line", () => {
    const html = twinkleplop("foo() // [!code word:foo:2]\nfoo()\nfoo()");
    expect(highlighted_words(html, "highlight")).toEqual(["foo", "foo"]);
  });

  test("occurrences inside comments are skipped", () => {
    const html = twinkleplop("// [!code word:foo]\nfoo() // foo\n/* foo */");
    expect(highlighted_words(html, "highlight")).toEqual(["foo"]);
  });

  test("\\: and \\] in the word are unescaped", () => {
    const html = twinkleplop('// [!code word:a\\:b\\]]\nconst x = "a:b]"');
    expect(highlighted_words(html, "highlight")).toEqual(["a:b]"]);
  });

  test("no occurrence is silent", () => {
    const issues: AnnotationIssue[] = [];
    const html = highlighter(shiki_notation(), (i) => issues.push(i))(
      "// [!code word:zzz:2]\na\nb",
    );
    expect(highlighted_words(html, "highlight")).toEqual([]);
    expect(issues).toEqual([]);
    expect(html).not.toContain("[!code");
  });

  test("shiki classes name the word highlighted-word and the pre has-highlighted-word", () => {
    const html = shiki("// [!code word:foo]\nfoo()");
    expect(highlighted_words(html, "highlighted-word")).toEqual(["foo"]);
    expect(pre_classes(html)).toBe("twinkleplop has-highlighted-word");
  });
});

// inputs copied from @shikijs/transformers 4.4.3 test/fixtures.
describe("shiki_notation: shiki fixtures", () => {
  const fixtures: { name: string; code: string; lines: string[][]; words?: string[] }[] = [
    {
      name: "diff/a.js",
      code: [
        "export function foo() {",
        "  console.log('hewwo') // [!code --]",
        "  console.log('hello') // [!code ++]",
        "}",
        "",
      ].join("\n"),
      lines: [[], ["diff", "remove"], ["add", "diff"], [], []],
    },
    {
      name: "highlight/a.js",
      code: [
        "export function foo() {",
        "  console.log('highlight') // [!code highlight]",
        "  console.log('hl') // [!code hl]",
        "",
        "  // should not be transformed:",
        "  console.log('[!code highlight]')",
        "}",
        "",
      ].join("\n"),
      lines: [[], H, H, [], [], [], [], []],
    },
    {
      name: "highlight/comment-highlight.js",
      code: [
        "export default {",
        "  data () {",
        "    return {",
        "      // msg1: '1 Highlighted!' // [!code highlight]",
        "    }",
        "  }",
        "}",
        "",
      ].join("\n"),
      lines: [[], [], [], H, [], [], [], []],
    },
    {
      name: "highlight/empty-line-comment-leading.js",
      code: [
        "// [!code highlight:4]",
        "export function transformerNotationFocus(",
        "  options = {},",
        ") {",
        "  const {",
        "    classFocused = 'focused',",
        "    classActivePre = 'has-focused',",
        "  } = options",
        "}",
        "",
      ].join("\n"),
      lines: [H, H, H, H, [], [], [], [], []],
    },
    {
      name: "highlight/empty-line-comment.js",
      code: [
        "export function transformerNotationFocus(",
        "  // [!code highlight:4]",
        "  options = {},",
        ") {",
        "  const {",
        "    classFocused = 'focused',",
        "    classActivePre = 'has-focused',",
        "  } = options",
        "}",
        "",
      ].join("\n"),
      lines: [[], H, H, H, H, [], [], [], []],
    },
    {
      name: "highlight/mutliple-lines.js",
      code: [
        "export function transformerNotationFocus(",
        "  options = {}, // [!code highlight:4]",
        ") {",
        "  const {",
        "    classFocused = 'focused',",
        "    classActivePre = 'has-focused',",
        "  } = options",
        "}",
        "",
      ].join("\n"),
      lines: [[], H, H, H, H, [], [], [], []],
    },
    {
      name: "focus/a.js",
      code: [
        "export function foo() {",
        "  console.log('focus') // [!code focus]",
        "",
        "  // should not be transformed:",
        "  console.log('[!code focus]')",
        "}",
        "",
      ].join("\n"),
      lines: [[], F, [], [], [], [], []],
    },
    {
      name: "focus/empty-line-comment.js",
      code: [
        "export function transformerNotationFocus(",
        "  // [!code focus:4]",
        "  options = {},",
        ") {",
        "  const {",
        "    classFocused = 'focused',",
        "    classActivePre = 'has-focused',",
        "  } = options",
        "}",
        "",
      ].join("\n"),
      lines: [[], F, F, F, F, [], [], [], []],
    },
    {
      name: "focus/mutliple-lines.js",
      code: [
        "export function transformerNotationFocus(",
        "  options = {}, // [!code focus:4]",
        ") {",
        "  const {",
        "    classFocused = 'focused',",
        "    classActivePre = 'has-focused',",
        "  } = options",
        "}",
        "",
      ].join("\n"),
      lines: [[], F, F, F, F, [], [], [], []],
    },
    {
      name: "error-level/a.js",
      code: [
        "export function foo() {",
        "  console.log('error') // [!code error]",
        "  console.log('warn') // [!code warning]",
        "  console.log('info') // [!code info]",
        "}",
        "",
      ].join("\n"),
      lines: [
        [],
        ["error", "highlighted"],
        ["highlighted", "warning"],
        ["highlighted", "info"],
        [],
        [],
      ],
    },
    {
      // shiki also wraps the `a` inside the "should not be transformed"
      // comment; twinkleplop never matches words inside comments.
      name: "highlight-word/basic.js",
      code: [
        "// [!code word:a]",
        "export function foo() {",
        '  const a = "Hello World"',
        "",
        "  // should not be transformed:",
        "  console.log('// [!code word:a]')",
        "}",
        "",
      ].join("\n"),
      lines: [[], [], [], [], [], [], []],
      words: ["a", "a"],
    },
    {
      name: "highlight-word/complex.js",
      code: [
        "export function transformerNotationFocus(",
        "  // [!code word:options.a]",
        "  options = {}, // [!code word:console.log:3]",
        ") {",
        "  const options = 'options'",
        "  console.log(options)",
        '  options.a = "HELLO"',
        "  console.log('// [!code word:options.a]')",
        "}",
        "",
      ].join("\n"),
      lines: [[], [], [], [], [], [], [], [], []],
      words: ["options.a", "options.a"],
    },
    {
      name: "highlight-word/mutliple-words.js",
      code: [
        "export function transformerNotationFocus(",
        "  // [!code word:options:2]",
        "  options = {}, // [!code word:log]",
        ") {",
        "  const options = 'options'",
        "  console.log(options)",
        '  options.a = "HELLO" // should not be highlighted',
        "}",
        "",
      ].join("\n"),
      lines: [[], [], [], [], [], [], [], []],
      words: ["options", "log"],
    },
    {
      name: "highlight-word/occurrence.js",
      code: [
        "export function transformerNotationFocus(",
        "  // [!code word:'options':4]",
        "  options = {},",
        ") {",
        "  const options = 'options'",
        "  console.log(options)",
        '  options.a = "HELLO" // should not be highlighted',
        "}",
        "",
      ].join("\n"),
      lines: [[], [], [], [], [], [], [], []],
      words: ["'options'"],
    },
    {
      name: "match-algorithm/v3.js",
      code: [
        "function hello(indentSize, type) {",
        "  console.log('error and focus'); // [!code error] [!code focus]",
        "}",
        "",
        "// [!code focus:4]",
        "console.log('focus')",
        "console.log('focus')",
        "console.log('focus')",
        "console.log('focus')",
        "",
        "// [!code highlight:2]",
        "console.log('highlighted')",
        "console.log('highlighted')",
        "",
        "console.log('highlighted') // [!code highlight:2]",
        "console.log('highlighted')",
        "",
        "// [!code word:options:3]",
        "let options = 'options'",
        "options = {}, // [!code word:log]",
        "console.log(options)",
        'options.a = "HELLO" // should not be highlighted',
        "",
      ].join("\n"),
      lines: [
        [],
        ["error", "focused", "highlighted"],
        [],
        [],
        F,
        F,
        F,
        F,
        [],
        H,
        H,
        [],
        H,
        H,
        [],
        [],
        [],
        [],
        [],
        [],
      ],
      words: ["options", "options", "options", "log", "options"],
    },
  ];

  for (const fixture of fixtures) {
    test(fixture.name, () => {
      const html = shiki(fixture.code);
      expect(line_classes(html)).toEqual(fixture.lines);
      expect(highlighted_words(html, "highlighted-word")).toEqual(fixture.words ?? []);
      expect(marker_in_comment(html)).toBe(false);
    });
  }

  test("word fixtures highlight through the default mapping too", () => {
    const html = twinkleplop(fixtures[fixtures.length - 1].code);
    expect(highlighted_words(html, "highlight")).toEqual([
      "options",
      "options",
      "options",
      "log",
      "options",
    ]);
  });
});
