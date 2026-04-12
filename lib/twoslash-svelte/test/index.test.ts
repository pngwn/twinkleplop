// Snapshot tests for @twinkleplop/twoslash-svelte.
//
// Three fixtures pinned with vitest snapshots (hover / query / error)
// plus balance and structural checks. The highlighter is built once in
// beforeAll so the underlying twoslash TypeScript environment is reused
// across tests — otherwise each test spins up a fresh TS language
// service, which is slow.
//
// Note: twoslash's `// @errors:` directive scanner requires the comment
// to be at column 0. Our error fixture therefore has no leading
// indentation on the directive line.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { create_highlighter } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name:string) => readFileSync(join(here, "fixtures", name), "utf8");

describe("@twinkleplop/twoslash-svelte", () => {
	let highlight: (code: string) => string;

	beforeAll(() => {
		highlight = create_highlighter();
	});

	it("renders hovers on script + template identifiers", () => {
		const html = highlight(fixture("hover.svelte"));
		expect(html).toContain(`class="twoslash-hover"`);
		// Template interpolation `{count}` should also carry a hover.
		expect(html.match(/twoslash-hover/g)?.length ?? 0).toBeGreaterThan(3);
		expect(html).toMatchSnapshot();
	});

	it("renders a ^? query inside a script block", () => {
		const html = highlight(fixture("query.svelte"));
		expect(html).toContain(`class="twoslash-query"`);
		expect(html).toMatchSnapshot();
	});

	it("renders an expected error with a sibling error-line", () => {
		const html = highlight(fixture("error.svelte"));
		expect(html).toContain(`class="twoslash-error"`);
		expect(html).toContain(`class="twoslash-error-line"`);
		expect(html).toMatchSnapshot();
	});

	it("produces a well-formed <pre><code> wrapper", () => {
		const html = highlight(fixture("hover.svelte"));
		expect(html.startsWith(`<pre class="highlight twoslash"><code>`)).toBe(true);
		expect(html.endsWith(`</code></pre>`)).toBe(true);
	});

	it("closes every span it opens", () => {
		const html = highlight(fixture("hover.svelte"));
		const opens = (html.match(/<span\b/g) ?? []).length;
		const closes = (html.match(/<\/span>/g) ?? []).length;
		expect(opens).toBe(closes);
	});
});
