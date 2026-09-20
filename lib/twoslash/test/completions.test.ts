// `^|` completion lists.
//
// twoslash reports a completion as a zero-length node, so it is the one
// annotation that decorates no text: `render` anchors it to a single offset
// and emits an empty host there. These tests pin that shape — a range-based
// wrapper covers no characters and so emits nothing at all, which is how
// `^|` came to render as silently missing markup.

import { describe, it, expect, beforeAll } from "vitest";
import type { TwoslashReturn } from "twoslash";
import { create_highlighter, language, render } from "../src/index.js";

/** drive `render` directly with a hand-built node; no language service. */
function render_completion_node(
  code: string,
  node: { start: number; completionsPrefix: string; completions: unknown[] },
) {
  const result = {
    nodes: [{ type: "completion", length: 0, line: 0, character: 0, ...node }],
  } as unknown as TwoslashReturn;
  return render(code, language(code), result);
}

describe("completions", () => {
  let highlight: (code: string) => string;

  beforeAll(() => {
    highlight = create_highlighter();
  });

  // `users.find` with the caret after `fin`: the only string[] members that
  // match the prefix are `find` and `findIndex`.
  const snippet = `const users = ["ada", "grace"]\nconst found = users.find\n//                     ^|\n`;

  it("renders a list for a `^|` marker", () => {
    const html = highlight(snippet);
    expect(html).toContain(`<span class="twoslash-completions">`);
    expect(html).toContain(
      `<span class="twoslash-completion-entry" data-kind="method">find</span>`,
    );
    expect(html).toContain(
      `<span class="twoslash-completion-entry" data-kind="method">findIndex</span>`,
    );
  });

  it("carries the typed prefix on the host", () => {
    expect(highlight(snippet)).toContain(`<span class="twoslash-completion" data-prefix="fin">`);
  });

  it("anchors the host at the caret, wrapping no text", () => {
    const html = highlight(snippet);
    // the caret sits between `fin` and the `d` of `find`, so the host lands
    // between the two halves of the identifier and contains only the list.
    expect(html).toMatch(
      /fin<\/span><span class="twoslash-completion" data-prefix="fin"><span class="twoslash-completions">.*?<\/span><\/span><span class="identifier">d<\/span>/s,
    );
  });

  it("does not split the hover the caret falls inside", () => {
    const html = highlight(snippet);
    // the snippet has four hovers (users, found, users, find) — the
    // completion sitting inside the `find` hover must not fork it into a
    // fifth, which is what unwinding the stack to emit it would do.
    const hovers = (html.match(/class="twoslash-hover"/g) ?? []).length;
    const popovers = (html.match(/class="twoslash-popover"/g) ?? []).length;
    expect(hovers).toBe(4);
    expect(popovers).toBe(4);
  });

  it("closes every span it opens", () => {
    const html = highlight(snippet);
    const opens = (html.match(/<span\b/g) ?? []).length;
    const closes = (html.match(/<\/span>/g) ?? []).length;
    expect(opens).toBe(closes);
  });

  it("strips the `^|` comment line from the output", () => {
    expect(highlight(snippet)).not.toContain("^|");
  });

  it("escapes entry names and kinds", () => {
    const html = render_completion_node("const a = 1\n", {
      start: 6,
      completionsPrefix: "a",
      completions: [{ name: `a<b>&"`, kind: `co"nst` }],
    });
    expect(html).toContain(
      `<span class="twoslash-completion-entry" data-kind="co&quot;nst">a&lt;b&gt;&amp;&quot;</span>`,
    );
  });

  it("emits nothing when the compiler returned no entries", () => {
    const html = render_completion_node("const a = 1\n", {
      start: 6,
      completionsPrefix: "a",
      completions: [],
    });
    expect(html).not.toContain("twoslash-completion");
  });

  it("emits a completion anchored at the very end of the input", () => {
    const code = "const a = 1\n";
    const html = render_completion_node(code, {
      start: code.length,
      completionsPrefix: "a",
      completions: [{ name: "abc", kind: "const" }],
    });
    expect(html).toContain(
      `<span class="twoslash-completion" data-prefix="a">` +
        `<span class="twoslash-completions">` +
        `<span class="twoslash-completion-entry" data-kind="const">abc</span>` +
        `</span></span></code></pre>`,
    );
  });

  it("keeps two completions anchored at the same offset", () => {
    const code = "const a = 1\n";
    const result = {
      nodes: [
        {
          type: "completion",
          start: 6,
          length: 0,
          line: 0,
          character: 6,
          completionsPrefix: "a",
          completions: [{ name: "abc" }],
        },
        {
          type: "completion",
          start: 6,
          length: 0,
          line: 0,
          character: 6,
          completionsPrefix: "a",
          completions: [{ name: "axy" }],
        },
      ],
    } as unknown as TwoslashReturn;
    const html = render(code, language(code), result);
    expect((html.match(/class="twoslash-completions"/g) ?? []).length).toBe(2);
    expect(html.indexOf("abc")).toBeLessThan(html.indexOf("axy"));
  });
});
