// options are baked in when the highlighter is built, so each case needs its
// own; one shared env cache keeps the suite to a single language service.

import { describe, it, expect } from "vitest";
import type { TwoslashReturn } from "twoslash";
import { create_highlighter, language, render, DEFAULT_CUSTOM_TAGS } from "../src/index.js";
import type { HighlightOptions } from "../src/types.js";

const env_cache = new Map();

function build(options: HighlightOptions = {}) {
  return create_highlighter({
    ...options,
    twoslash: { cache: env_cache, ...options.twoslash },
  });
}

const documented = `/**
 * Adds two numbers. **Bold** & <b>raw</b>.
 * @param a the first operand
 * @param b the second operand
 * @returns the sum
 */
function add(a: number, b: number) {
	return a + b
}
`;

const deprecated = `/**
 * Old and busted.
 * @deprecated
 */
function old() {}
`;

describe("custom tags", () => {
  it("renders a tag line with no configuration", () => {
    const html = build()(`// @log: hello\nconst a = 1\n`);
    expect(html).toContain(`<span class="twoslash-tag" data-tag-name="log">hello</span>`);
  });

  it("pre-registers annotate, log, warn and error", () => {
    expect(DEFAULT_CUSTOM_TAGS).toEqual(["annotate", "log", "warn", "error"]);
    // twoslash merges adjacent removals and drops the nodes inside one, so
    // stacked tag comments would collapse into the last.
    const html = build()(
      `// @annotate: a\nconst a = 1\n// @log: l\nconst b = 2\n` +
        `// @warn: w\nconst c = 3\n// @error: e\nconst d = 4\n`,
    );
    for (const name of DEFAULT_CUSTOM_TAGS) {
      expect(html).toContain(`data-tag-name="${name}"`);
    }
  });

  it("merges tags declared through the raw twoslash option", () => {
    const html = build({ twoslash: { customTags: ["note"] } })(
      `// @note: sidebar\nconst a = 1\n// @log: hello\nconst b = 2\n`,
    );
    expect(html).toContain(`data-tag-name="note"`);
    expect(html).toContain(`data-tag-name="log"`);
  });

  it("treats a disabled tag as the unknown flag it is", () => {
    let seen: unknown;
    const html = build({
      custom_tags: [],
      on_error: (error) => {
        seen = error;
        return "fallback";
      },
    })(`// @log: hello\nconst a = 1\n`);
    expect(html).toBe("fallback");
    expect((seen as Error).message).toContain("Unknown inline compiler flags");
  });
});

describe("on_error", () => {
  const rejected = `const n: string = 42\n`;

  it("returns the string the hook produced", () => {
    const html = build({ on_error: (_error, code) => `<pre>${code.trim()}</pre>` })(rejected);
    expect(html).toBe(`<pre>const n: string = 42</pre>`);
  });

  it("throws when no hook is given", () => {
    expect(() => build()(rejected)).toThrow();
  });

  it("rethrows the original error when the hook returns nothing", () => {
    let seen: unknown;
    let thrown: unknown;
    try {
      build({ on_error: (error) => void (seen = error) })(rejected);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBe(seen);
    expect(thrown).toBeInstanceOf(Error);
  });

  it("propagates an error the hook throws itself", () => {
    const boom = new Error("boom");
    expect(() =>
      build({
        on_error: () => {
          throw boom;
        },
      })(rejected),
    ).toThrow(boom);
  });
});

describe("render_docs", () => {
  it("escapes the docs when the hook is absent", () => {
    const html = build()(documented);
    expect(html).toContain(
      `<span class="twoslash-popover-docs">Adds two numbers. **Bold** &amp; &lt;b&gt;raw&lt;/b&gt;.</span>`,
    );
  });

  it("inserts the hook's output as-is", () => {
    const html = build({ render_docs: (md) => `<em>${md}</em>` })(documented);
    expect(html).toContain(
      `<span class="twoslash-popover-docs"><em>Adds two numbers. **Bold** & <b>raw</b>.</em></span>`,
    );
  });

  it("runs over doc-tag values too", () => {
    const html = build({ render_docs: (md) => `<em>${md}</em>` })(documented);
    expect(html).toContain(
      `<span class="twoslash-popover-tag" data-tag="returns"><em>the sum</em></span>`,
    );
  });

  // the compiler attaches no documentation to `^|` completion entries, so this
  // drives `render` with a node that has some.
  it("runs over completion entries that carry docs", () => {
    const code = `const a = 1\n`;
    const result = {
      nodes: [
        {
          type: "completion",
          start: 6,
          length: 1,
          line: 0,
          character: 6,
          completionsPrefix: "a",
          completions: [{ name: "abc", kind: "const", docs: "**counts**" }],
        },
      ],
    } as unknown as TwoslashReturn;
    const html = render(code, language(code), result, { render_docs: (md) => `<em>${md}</em>` });
    expect(html).toContain(
      `<span class="twoslash-completion-entry" data-kind="const">abc` +
        `<span class="twoslash-completion-docs"><em>**counts**</em></span></span>`,
    );
  });
});

describe("docs_tags", () => {
  it("gives every jsdoc tag its own element by default", () => {
    const html = build()(documented);
    expect(html).toContain(
      `<span class="twoslash-popover-tags">` +
        `<span class="twoslash-popover-tag" data-tag="param">` +
        `<span class="twoslash-popover-tag-name">a</span> the first operand</span>` +
        `<span class="twoslash-popover-tag" data-tag="param">` +
        `<span class="twoslash-popover-tag-name">b</span> the second operand</span>` +
        `<span class="twoslash-popover-tag" data-tag="returns">the sum</span>` +
        `</span>`,
    );
  });

  it("renders a valueless tag as an empty element", () => {
    const html = build()(deprecated);
    expect(html).toContain(`<span class="twoslash-popover-tag" data-tag="deprecated"></span>`);
  });

  it("splits tags under a query as well", () => {
    // the caret has to sit under `add`, at column 12 of the line above.
    const html = build()(`${documented}const sum = add(1, 2)\n//${" ".repeat(10)}^?\n`);
    expect(html).toContain(`<span class="twoslash-query-tags">`);
    expect(html).toContain(
      `<span class="twoslash-query-tag" data-tag="param">` +
        `<span class="twoslash-query-tag-name">a</span> the first operand</span>`,
    );
  });

  it("raw leaves the docs as a single escaped block and emits no tags", () => {
    const html = build({ docs_tags: "raw" })(documented);
    expect(html).not.toContain("twoslash-popover-tag");
    expect(html).toContain(
      `<span class="twoslash-popover-docs">Adds two numbers. **Bold** &amp; &lt;b&gt;raw&lt;/b&gt;.</span>`,
    );
  });
});

describe("process_type", () => {
  it("sees every hover and query type, and its output is what renders", () => {
    const seen: string[] = [];
    const html = build({
      process_type: (type) => {
        seen.push(type);
        return type.toUpperCase();
      },
    })(`const x = 1\n//    ^?\n`);
    expect(seen).toEqual(["const x: 1", "const x: 1"]);
    expect(html).toContain(
      `<span class="twoslash-popover-type"><span class="constant">CONST</span>`,
    );
    expect(html).toContain(`<span class="twoslash-query-type"><span class="constant">CONST</span>`);
  });

  it("renders an empty type element for an empty return", () => {
    const html = build({ process_type: () => "" })(`const x = 1\n`);
    expect(html).toContain(`<span class="twoslash-popover-type"></span>`);
  });
});

describe("defaults", () => {
  it("pins the markup for a documented hover", () => {
    expect(build()(documented)).toMatchSnapshot();
  });
});
