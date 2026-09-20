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

// The text a reader gets from rendered HTML. `aria: true` drops `aria-hidden`
// subtrees as an accessibility tree does; without it this is `textContent`.
function text_of(html: string, { aria = false }: { aria?: boolean } = {}): string {
  let out = "";
  let i = 0;
  let depth = 0; // open elements inside an aria-hidden subtree, 0 = outside

  const tag = /<(\/?)([a-zA-Z][^\s/>]*)([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(html))) {
    if (depth === 0) out += html.slice(i, m.index);
    i = tag.lastIndex;

    const closing = m[1] === "/";
    if (depth > 0) {
      depth += closing ? -1 : 1;
    } else if (aria && !closing && /\saria-hidden=["']true["']/.test(m[3])) {
      depth = 1;
    }
  }
  if (depth === 0) out += html.slice(i);

  return out
    .replace(/<pre[^>]*>|<\/pre>|<code[^>]*>|<\/code>/g, "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

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

  // popovers sit inline between the tokens they describe, and the CSS that
  // hides them is unavailable to a screen reader, indexer or fetcher
  it("keeps hover popovers out of the code's text", () => {
    const source = `const greeting = "hello world"\nconst n = greeting.length\n`;
    const html = highlight(source);

    expect(text_of(html, { aria: true })).toBe(source);

    // not vacuous: without the marker their text lands in the code
    expect(html).toContain(`twoslash-popover-type`);
    expect(text_of(html)).toContain(`const greeting: "hello world"`);
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
