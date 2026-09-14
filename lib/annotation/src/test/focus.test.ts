// the plugin itself is `hl` under another name; the block level `has-focus`
// class is what these tests are really about.

import { describe, expect, test } from "vitest";
import { compile, create_language, to_html } from "@twinkleplop/core";
import type { Grammar } from "@twinkleplop/core";
import { focus } from "../focus";

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

const fn = create_language(grammar)({ annotation: { plugins: [focus] } });

describe("focus plugin", () => {
  test("claims the `focus` verb and emits `focus`", () => {
    expect(focus.verbs).toEqual(["focus"]);
    const out = focus.handle({
      verb: "focus",
      args: { kind: "bare" },
      range: { start: 0, end: 10, start_line: 1, end_line: 1 },
      marker: { start: 0, end: 5, line: 1 },
      standalone: false,
      resolve: () => ({ start: 0, end: 0, start_line: 1, end_line: 1 }),
      resolve_all: () => [],
    });
    expect(out).toEqual({
      overlays: [{ start: 0, end: 10, classification: "focus", line_mode: true }],
    });
  });

  test("[!focus] renders a line-mode overlay and has-focus on pre", () => {
    const input = "alpha\nbeta // [!focus]\ngamma\n";
    const html = to_html(input, fn(input));
    expect(html).toMatch(/^<pre class="twinkleplop has-focus">/);
    expect(html).toContain('<span class="l focus">');
    expect(html.match(/<span class="l focus">/g)).toHaveLength(1);
  });

  test("[!focus +2] focuses the two lines below and drops the marker line", () => {
    const input = "// [!focus +2]\nalpha\nbeta\ngamma\n";
    const html = to_html(input, fn(input));
    expect(html).toMatch(/has-focus/);
    expect(html.match(/<span class="l focus">/g)).toHaveLength(2);
    expect(html).not.toContain("[!focus");
    expect(html).toMatch(/<span class="l">[^\n]*gamma/);
  });

  test("[!focus foo..bar] renders token-mode focus", () => {
    const input = "foo mid bar // [!focus foo..bar]\n";
    const html = to_html(input, fn(input));
    expect(html).toMatch(/has-focus/);
    expect(html).not.toContain('<span class="l focus">');
    expect(html).toContain(
      '<span class="tok focus"><span class="tok identifier">mid</span></span>',
    );
  });
});
