// the same options suite as @twinkleplop/twoslash, over .svelte fixtures.
// custom tags are the one case that genuinely differs: their nodes are built
// in this package rather than by the base twoslasher.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { create_highlighter } from "../src/index.js";
import type { HighlightOptions } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(join(here, "fixtures", name), "utf8");

const env_cache = new Map();

function build(options: HighlightOptions = {}) {
  return create_highlighter({
    ...options,
    twoslash: { cache: env_cache, ...options.twoslash },
  });
}

describe("custom tags", () => {
  it("renders a tag line with no configuration", () => {
    const html = build()(fixture("tag.svelte"));
    expect(html).toContain(`<span class="twoslash-tag" data-tag-name="log">hello</span>`);
    expect(html).toMatchSnapshot();
  });

  it("treats a disabled tag as the unknown flag it is", () => {
    let seen: unknown;
    const html = build({
      custom_tags: [],
      on_error: (error) => {
        seen = error;
        return "fallback";
      },
    })(fixture("tag.svelte"));
    expect(html).toBe("fallback");
    expect((seen as Error).message).toContain("Unknown inline compiler flags");
  });
});

describe("on_error", () => {
  const rejected = `<script lang="ts">\nconst n: string = 42;\n</script>\n`;

  it("returns the string the hook produced", () => {
    const html = build({ on_error: (_error, code) => `<pre>${code.trim()}</pre>` })(rejected);
    expect(html).toContain(`const n: string = 42;`);
    expect(html.startsWith("<pre>")).toBe(true);
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
});

describe("docs", () => {
  it("escapes the docs and splits the tags by default", () => {
    const html = build()(fixture("docs.svelte"));
    expect(html).toContain(
      `<span class="twoslash-popover-docs">Adds two numbers. **Bold** &amp; &quot;quoted&quot;.</span>`,
    );
    expect(html).toContain(
      `<span class="twoslash-popover-tags">` +
        `<span class="twoslash-popover-tag" data-tag="param">` +
        `<span class="twoslash-popover-tag-name">a</span> the first operand</span>` +
        `<span class="twoslash-popover-tag" data-tag="param">` +
        `<span class="twoslash-popover-tag-name">b</span> the second operand</span>` +
        `<span class="twoslash-popover-tag" data-tag="returns">the sum</span>` +
        `</span>`,
    );
    expect(html).toMatchSnapshot();
  });

  it("inserts render_docs output as-is, tag values included", () => {
    const html = build({ render_docs: (md) => `<em>${md}</em>` })(fixture("docs.svelte"));
    expect(html).toContain(
      `<span class="twoslash-popover-docs"><em>Adds two numbers. **Bold** & "quoted".</em></span>`,
    );
    expect(html).toContain(
      `<span class="twoslash-popover-tag" data-tag="returns"><em>the sum</em></span>`,
    );
  });

  it("raw leaves the docs as a single escaped block and emits no tags", () => {
    const html = build({ docs_tags: "raw" })(fixture("docs.svelte"));
    expect(html).not.toContain("twoslash-popover-tag");
    expect(html).toContain(
      `<span class="twoslash-popover-docs">Adds two numbers. **Bold** &amp; &quot;quoted&quot;.</span>`,
    );
  });
});

describe("process_type", () => {
  it("sees every hover type and its output is what renders", () => {
    const seen: string[] = [];
    const html = build({
      process_type: (type) => {
        seen.push(type);
        return type.toUpperCase();
      },
    })(fixture("query.svelte"));
    expect(seen.some((type) => type.startsWith("const user:"))).toBe(true);
    expect(html).toContain(`<span class="twoslash-query-type"><span class="constant">CONST</span>`);
  });
});
