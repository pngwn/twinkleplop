// Runtime consumer checks — plain node, no bundler, no loader. Several of the
// defects this guards against only appear outside a bundler: an export
// pointing at TypeScript source, or output whose classes no theme can style.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { strict as assert } from "node:assert";

import { highlight } from "@twinkleplop/twoslash";
import { highlight as svelte_highlight } from "@twinkleplop/twoslash-svelte";
import { light, dark } from "@twinkleplop/theme-github/tokens";
import { language } from "@twinkleplop/typescript";

const require_ = createRequire(import.meta.url);
const check = (label, fn) => {
  fn();
  console.log(`  ok  ${label}`);
};

// -- finding 4: twoslash output has to carry the class themes bind to --------

check("twoslash output is styleable by a theme", () => {
  const classes = highlight('const greeting: string = "hi";\n')
    .match(/<pre class="([^"]*)"/)[1]
    .split(" ");
  assert.ok(
    classes.includes("twinkleplop"),
    `twoslash <pre> is class="${classes.join(" ")}"; themes bind .twinkleplop .<token>, so this renders uncoloured`,
  );
  // the twoslash class carries the popover/query styling, so it has to survive
  // any change to the default.
  assert.ok(classes.includes("twoslash"), "twoslash <pre> lost its `twoslash` class");
});

check("svelte twoslash output matches", () => {
  const classes = svelte_highlight('<script lang="ts">\n  const x: number = 1;\n</script>\n')
    .match(/<pre class="([^"]*)"/)[1]
    .split(" ");
  assert.ok(classes.includes("twinkleplop"), "svelte twoslash <pre> is missing the theme class");
});

check("a theme actually binds that class", () => {
  const css = readFileSync(require_.resolve("@twinkleplop/theme-github/light"), "utf8");
  assert.match(css, /\.twinkleplop \.keyword/);
});

check("twoslash ships the css its popovers need", () => {
  const sheet = readFileSync(require_.resolve("@twinkleplop/twoslash/style.css"), "utf8");
  // without this rule every popover renders inline, putting hover type text in
  // the middle of the code.
  assert.match(sheet, /\.twoslash-popover\s*\{\s*display:\s*none/);
});

// -- finding 5: the palette has to load in plain node ------------------------

check("theme palettes load without a bundler", () => {
  for (const [name, palette] of [
    ["light", light],
    ["dark", dark],
  ]) {
    assert.equal(typeof palette.keyword, "string", `${name}.keyword is not a string`);
    assert.match(
      palette.background_color,
      /^#[0-9a-fA-F]{3,8}$/,
      `${name}.background_color is not a hex colour`,
    );
  }
});

// -- finding 6: indent guides are adjacent siblings, as documented -----------

check("indent guides are adjacent, one span per level", () => {
  const out = language()("        const x = 1;\n", { indent_guides: { size: 4 } });
  const spans = out.match(/<span class="indent">[^<]*<\/span>/g) ?? [];
  assert.equal(spans.length, 2, "eight spaces at size 4 should be two indent spans");
  assert.doesNotMatch(
    out,
    /<span class="indent">\s*<span class="indent">/,
    "indent spans are nested; the docs describe adjacent siblings",
  );
});

// -- the ordinary path a reader of the docs takes ----------------------------

check("the getting-started example produces highlighted html", () => {
  const html = language()("const total = 1 + 2;");
  assert.match(html, /<pre class="twinkleplop"><code>/);
  assert.match(html, /class="tok keyword"/);
});
