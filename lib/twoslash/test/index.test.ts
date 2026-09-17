// Snapshot tests for @twinkleplop/twoslash.
//
// Uses vitest's `toMatchSnapshot` to pin the rendered HTML for a handful of
// representative inputs covering: plain hover, explicit query, type error,
// and TS-only keywords. Snapshots live alongside this file in __snapshots__/.
//
// The highlighter is built once per suite via `create_highlighter` so the
// twoslash language-service instance is reused across tests.

import { describe, it, expect, beforeAll } from "vitest";
import { create_highlighter } from "../src/index.js";

describe("@twinkleplop/twoslash", () => {
  /** @type {(code: string) => string} */
  let highlight: (code: string) => string;

  beforeAll(() => {
    highlight = create_highlighter();
  });

  it("renders a plain hover on an identifier", () => {
    const html = highlight(`const greeting = "hello world"\n`);
    expect(html).toMatchSnapshot();
  });

  it("renders a ^? query annotation", () => {
    const html = highlight(`const point = { x: 1, y: 2 }\n//    ^?\n`);
    expect(html).toMatchSnapshot();
  });

  it("renders a type error with a sibling error-line", () => {
    const html = highlight(`// @errors: 2322\nconst n: string = 42\n`);
    expect(html).toMatchSnapshot();
  });

  it("tags TS-only keywords as `keyword`", () => {
    const html = highlight(`interface User { name: string }\ntype UserName = User["name"]\n`);
    // Cheap structural check: `interface` and `type` should both be
    // wrapped in a keyword span.
    expect(html).toContain(`<span class="keyword">interface</span>`);
    expect(html).toContain(`<span class="keyword">type</span>`);
    expect(html).toMatchSnapshot();
  });

  it("produces a well-formed <pre><code> wrapper", () => {
    const html = highlight(`const x = 1\n`);
    expect(html.startsWith(`<pre class="twinkleplop twoslash"><code>`)).toBe(true);
    expect(html.endsWith(`</code></pre>`)).toBe(true);
  });

  it("closes every span it opens", () => {
    const html = highlight(
      `// @errors: 2322\nconst x: string = 42\nconst y = { a: 1 }\n//    ^?\n`,
    );
    // Count <span vs </span> — must balance.
    const opens = (html.match(/<span\b/g) ?? []).length;
    const closes = (html.match(/<\/span>/g) ?? []).length;
    expect(opens).toBe(closes);
  });
});
