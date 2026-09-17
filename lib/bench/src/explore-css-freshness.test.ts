// explore.css freshness — the explore page colours tokens with per-class
// rules like `.explore-app .tok.<token> { color: var(--twp-<token>); }`.
// every canonical token must have a rule; without one, to_html emits an
// unstyled span and the token renders as default text (which is how the
// "constant isn't tokenised" regression manifested: new tokens landed in
// the theme palette but explore.css hadn't been updated to consume them).
//
// runs as part of the standard test suite so adding a new canonical token
// without wiring it into the explore pane fails CI loudly.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as TOKENS from "@twinkleplop/core/tokens";

const ROOT = path.resolve(new URL("../../..", import.meta.url).pathname);
const CSS_PATH = path.join(ROOT, "lib", "_site", "src", "lib", "styles", "explore.css");

// tokens whose colour is intentionally inherited from a compound rule (e.g.
// markdown open/close markers styled as a pair) or which the explore pane
// deliberately leaves unstyled. kept in sync with the comment blocks in
// explore.css itself.
const INHERITED_TOKENS = new Set([
  // `raw_*` tokens are grammar placeholders that are replaced by sub-
  // language tokens via embed_grammars before rendering — they should
  // never reach to_html output, so the explore pane intentionally does
  // not style them.
  "raw_code_block",
  "raw_front_matter",
  "raw_script",
  "raw_style",
  "raw_svelte_expression",
]);

function canonical_tokens(): string[] {
  const names = new Set<string>();
  for (const value of Object.values(TOKENS)) {
    if (typeof value === "string") names.add(value);
  }
  return [...names].sort();
}

describe("explore.css freshness", () => {
  const css = fs.readFileSync(CSS_PATH, "utf-8");
  for (const token of canonical_tokens()) {
    if (INHERITED_TOKENS.has(token)) continue;
    it(`has a .tok.${token} rule`, () => {
      expect(
        css,
        `lib/_site/src/lib/styles/explore.css is missing a rule for .tok.${token} — add \`.explore-app .tok.${token} { color: var(--twp-${token}); }\` to keep tokens styled in the explore pane`,
      ).toMatch(new RegExp(`\\.tok\\.${token}\\b`));
    });
  }
});
