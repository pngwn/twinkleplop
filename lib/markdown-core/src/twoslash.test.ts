// the registry entry shape against the real twoslash package, so the
// routing is proven against what a site actually registers.

import { describe, expect, test } from "vitest";
import { language as typescript } from "@twinkleplop/typescript";
import { create_highlighter } from "@twinkleplop/twoslash";
import { create_renderer } from "./render";

const md = create_renderer({
  languages: { ts: { highlight: typescript(), twoslash: create_highlighter({ lang: "ts" }) } },
});

const CODE = "const a = 1;\n//     ^?\n";

describe("a registry entry with a twoslash highlighter", () => {
  test("the twoslash meta word routes through it", () => {
    const html = md.fence("ts", "twoslash", CODE)!;
    expect(html).toContain("twoslash-popover");
  });

  test("a fence without it gets the plain highlighter", () => {
    const html = md.fence("ts", "", CODE)!;
    expect(html).not.toContain("twoslash-popover");
    expect(html).toContain('data-language="ts"');
  });
});
