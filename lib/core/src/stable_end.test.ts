import { describe, expect, test } from "vitest";
import { compile } from "./compiler";
import { to_html } from "./generator";
import { create_language } from "./reclassifier";
import { tokenize } from "./tokenizer";
import { visible_text } from "./visible_text";
import type { AnnotationPlugin, Grammar } from "./types";

const grammar = compile<Grammar>({
  name: "toy",
  states: {
    root: {
      rules: [
        { match: "//", token: "comment", state: "line_comment" },
        { match: "/*", token: "comment", state: "block_comment" },
        { match: '"', token: "string", state: "string" },
        { match: "let", token: "keyword", boundary: true },
        { match: "===", token: "operator" },
        { match: "=", token: "operator" },
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
    block_comment: {
      rules: [
        { match: "*/", token: "comment", exit: true },
        { any: true, token: "comment" },
      ],
    },
    string: {
      rules: [
        { match: '"', token: "string", exit: true },
        { any: true, token: "string" },
      ],
    },
  },
});

const stable = (input: string) => tokenize(input, grammar, null, true).stable_end;

const hl: AnnotationPlugin = {
  verbs: ["hl"],
  handle: ({ range }) => ({
    overlays: [{ start: range.start, end: range.end, classification: "hl", line_mode: true }],
  }),
};

describe("stable_end", () => {
  test("is only set for an open input", () => {
    const input = "alpha = 1\nbeta = 2\n";
    expect(tokenize(input, grammar).stable_end).toBeUndefined();
    expect(create_language(grammar)()(input).stable_end).toBeUndefined();
    expect(create_language(grammar)()(input, { open: true }).stable_end).toBe(10);
  });

  test("sits at the start of the last line that can still change", () => {
    expect(stable("")).toBe(0);
    expect(stable("alpha = 1")).toBe(0);
    expect(stable("alpha = 1\nbeta = 2\ngamma = le")).toBe(19);
    expect(stable("alpha = 1\nbeta = 2\ngamma = 3 =")).toBe(19);
  });

  test("a last line shorter than the longest pattern holds the line before it too", () => {
    expect(stable("alpha = 1\nbeta = 2\n")).toBe(10);
    expect(stable("alpha = 1\nbeta = 2\ng")).toBe(10);
  });

  test("an unfinished token holds everything from where it starts", () => {
    expect(stable('alpha = 1\nbeta = "two\nthree\nfour')).toBe(10);
    expect(stable("alpha = 1\n/* one\ntwo\nthree")).toBe(10);
    expect(stable("alpha = 1\n/* one\ntwo */\nbeta\ngamma delta")).toBe(29);
  });

  test("a directive comment the input ends in is never before it", () => {
    const language = create_language(grammar)({ annotation: { plugins: [hl] } });
    const input = "alpha\nbeta /* [!hl]\n\ngamma delta";
    const result = language(input, { open: true });
    expect(result.overlays!.undecided).toBe(11);
    expect(result.stable_end).toBe(6);
  });
});

describe("held_tail", () => {
  const language = create_language(grammar)();
  const input = 'alpha = 1\nlet beta\ngamma = "x y z';
  const result = language(input, { open: true });

  test("draws the tail as the rest by default", () => {
    expect(result.stable_end).toBe(19);
    expect(to_html(input, result)).toContain('<span class="tok string">&quot;x y z</span>');
  });

  test("plain draws the tail without tokens", () => {
    const html = to_html(input, result, { held_tail: "plain" });
    expect(html).toContain('<span class="tok keyword">let</span>');
    expect(html).toContain('<span class="l">gamma = &quot;x y z</span>');
    expect(visible_text(input, result, { held_tail: "plain" })).toBe(input);
  });

  test("hide leaves the tail out", () => {
    const html = to_html(input, result, { held_tail: "hide" });
    expect(html).toContain('<span class="tok keyword">let</span>');
    expect(html.match(/class="l"/g)).toHaveLength(2);
    expect(html).not.toContain("&quot;");
    expect(visible_text(input, result, { held_tail: "hide" })).toBe("alpha = 1\nlet beta");
    expect(to_html("a = 1", language("a = 1", { open: true }), { held_tail: "hide" })).toBe(
      to_html("", language("")),
    );
  });

  test("hide matches a closed render of the settled text", () => {
    const settled = input.slice(0, result.stable_end! - 1);
    expect(to_html(input, result, { held_tail: "hide", line_numbers: true })).toBe(
      to_html(settled, language(settled), { line_numbers: true }),
    );
  });

  test("overlays are cut with the tail", () => {
    const annotated = create_language(grammar)({ annotation: { plugins: [hl] } });
    const source = "alpha // [!hl +5]\nbeta\ngamma\ndelta epsilon";
    const open = annotated(source, { open: true });
    expect(open.stable_end).toBe(29);
    const html = to_html(source, open, { held_tail: "hide" });
    expect(html.match(/class="l hl"/g)).toHaveLength(2);
    expect(html).not.toContain("delta");
  });

  test("a closed result ignores the option", () => {
    const closed = language(input);
    expect(to_html(input, closed, { held_tail: "hide" })).toBe(to_html(input, closed));
  });
});
