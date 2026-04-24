---
name: theme-builder
description: Port an existing editor theme (e.g. rose-pine, catppuccin, tokyo-night, ayu, github) into twinkleplop as a standalone package containing BOTH a light and a dark variant. Produces `@twinkleplop/theme-<name>` with CSS and JS token exports, and wires the theme into the _site Tweaks panel.
---

You are porting an existing editor theme into twinkleplop. The deliverable is a new standalone package `lib/theme-<name>` containing both a light and a dark variant of the theme, plus site integration that makes the theme togglable from the Tweaks panel.

An LLM writing colors from memory will hallucinate plausible-looking hex values that do not match the real theme. Anchor every color to a source you can cite. If you cannot point at the URL the hex came from, do not write it.

Follow the phases below in order. Do not skip phases or invent colors.

---

## Precondition: both variants MUST exist

Light and dark are a hard requirement. Every theme ships both variants OR it does not ship. No exceptions.

This is a package-level rule, not a per-variant one. The two variants live inside the same package and are named after the pair, not individually:

- `ayu` package ships `ayu-light` and `ayu-dark` (both inside `@twinkleplop/theme-ayu`)
- `github` package ships `github-light` and `github-dark` (both inside `@twinkleplop/theme-github`)
- `catppuccin` package ships `catppuccin-latte` (light) and `catppuccin-mocha` (dark) — upstream names, kept as-is

If upstream only publishes one variant, STOP. Tell the user the theme does not qualify and ask them to pick another. Do not invert a dark variant to fake a light one — the result will not match any real user expectation of the theme.

Pick a canonical package slug in kebab-case (`ayu`, `github`, `rose-pine`, `catppuccin`, `tokyo-night`, `one`, `solarized`). The package becomes `@twinkleplop/theme-<slug>`. If the user has not specified one, ask.

---

## Phase 1: Research

Find and read the canonical source for BOTH variants. If either cannot be located, return to the precondition check and stop.

Record URLs and file paths for each variant at the top of `lib/theme-<name>/src/tokens.ts` as a comment block so later revisions can re-check.

Priority order for sources (stop at the highest available):

1. **Upstream theme repo** — e.g. `rose-pine/rose-pine-theme`, `catppuccin/catppuccin`, `folke/tokyonight.nvim`, `ayu-theme/vscode-ayu`. Look for a `palette.json`, `colors.toml`, or equivalent manifest. This is ground truth.
2. **Official VSCode theme package** — `themes/*.json` inside the VSCode extension. Maintained closely with upstream. Use `tokenColors` entries, NOT `colors` (those are UI chrome).
3. **Published style guides or branding docs** — hex tables in README files.
4. **tree-sitter, Prism, or Shiki port** — last resort. Port authors often improvise; cite what you used.

When the primary source and a secondary source disagree, upstream wins. Record the discrepancy in a comment on the affected palette line.

---

## Phase 2: Token mapping

The canonical list of token names lives in `lib/core/src/tokens.ts`, exported as `@twinkleplop/core/tokens`. Every string exported from that module is a token name a grammar in this repo can emit. Palette keys MUST exactly match those strings — no aliases, no abbreviations. The previous `func` / `ident` / `punct` aliasing is historical and is being retired as part of this skill's first-run migration (see Phase 6).

The palette is therefore a `Record<token_name, string>` plus one extra key, `background_color` (see Phase 4). Every token export MUST have a corresponding entry in both `light` and `dark`. No extras. No omissions. The validation test in Phase 5 enforces this; if it fails, the palette is wrong, not the test.

For each token, pick the upstream theme color that semantically matches. VSCode `tokenColors` entries map via their `scope` field. Common mappings:

| twinkleplop token | typical VSCode scope(s) |
|---|---|
| `keyword` | `keyword`, `keyword.control`, `storage.type` |
| `type` | `entity.name.type`, `support.type`, `support.class` |
| `string` | `string`, `string.quoted` |
| `number` | `constant.numeric` |
| `comment` | `comment` |
| `function` | `entity.name.function`, `support.function` |
| `identifier` / `variable` | `variable`, `variable.other` |
| `builtin` | `support.function`, `support.class` |
| `boolean` / `null` | `constant.language` |
| `operator` | `keyword.operator`, `punctuation.separator.operator` |
| `punctuation` | `punctuation` (often falls back to `text`/foreground) |
| `property` | `support.type.property-name`, `variable.other.property` |
| `decorator` | `meta.decorator`, `entity.name.decorator` |
| `tag_name` / `tag` | `entity.name.tag` |
| `attribute` / `attr_name` | `entity.other.attribute-name` |
| `lifetime` | `storage.modifier.lifetime` (Rust) — fall back to `keyword` |
| `selector` / `selector_class` / `selector_id` / `selector_pseudo` | `entity.other.attribute-name.class.css`, `entity.name.tag.css` |
| `unit` / `css_variable` | `support.type.property-name`, `variable.other` |
| `regex` | `string.regexp` |
| `template` | `string.template` |
| `class_name` | `entity.name.class` |
| `bold` / `italic` / `strike` (markdown) | `markup.bold`, `markup.italic`, `markup.strikethrough` |
| `heading` / `heading_marker` | `markup.heading` |
| `link_text` / `url` / `url_link` / `url_title` | `markup.underline.link`, `string.other.link` |
| `code` / `code_block` / `code_fence` / `code_language` | `markup.inline.raw`, `markup.fenced_code` |
| `inserted` / `deleted` / `changed` (diff) | `markup.inserted`, `markup.deleted`, `markup.changed` |
| `*_marker`, `*_open`, `*_close` | delimiter punctuation — fall back to the matching content token or `punctuation` |
| whitespace (`space`, `tab`, `newline`, `carriage_return`) | always `"inherit"` |
| `raw_*` | reclassifier placeholders — fall back to `text` |

When the upstream theme does not define a scope for a token, fall back to the most visually appropriate sibling color. Record every fallback as an inline comment on the palette line so reviewers can see the provenance. When in doubt between two plausible mappings, prefer the one that preserves the palette's color balance on a realistic sample (render the sample with the grammar-researcher's manual traces open, not a one-liner).

---

## Phase 3: Package scaffold

Each theme is its own package. Create `lib/theme-<name>/`:

```
lib/theme-<name>/
  package.json          — name: "@twinkleplop/theme-<name>"
  src/
    tokens.ts           — light + dark palettes as named exports (Phase 4)
    tokens.test.ts      — palette completeness validation (Phase 5)
    build.ts            — generates the three .css files from tokens.ts (Phase 6)
  dist/
    index.css           — both variants: light under :root, dark under .dark
    light.css           — light variant only, under :root
    dark.css            — dark variant only, under :root
  tsconfig.json         — extends root config
```

`lib/theme-<name>` is already matched by `lib/*` in `pnpm-workspace.yaml`. Run `pnpm install` once after creating `package.json` so the workspace picks it up.

`package.json` export conditions:

```json
{
  "name": "@twinkleplop/theme-<name>",
  "type": "module",
  "exports": {
    ".": "./dist/index.css",
    "./light": "./dist/light.css",
    "./dark": "./dist/dark.css",
    "./tokens": {
      "source": "./src/tokens.ts",
      "import": "./src/tokens.ts",
      "types": "./src/tokens.ts"
    }
  },
  "files": ["dist", "src"],
  "scripts": {
    "build": "tsx src/build.ts",
    "test": "vitest"
  }
}
```

Do NOT add a JS default export — the default (`.`) is the combined stylesheet. Consumers who want just one variant import `@twinkleplop/theme-<name>/light` or `/dark`. Consumers who want the palette data (for an inline-style approach like `palette_to_vars`) import `@twinkleplop/theme-<name>/tokens`.

---

## Phase 4: Tokens module

Write `lib/theme-<name>/src/tokens.ts` in this order:

1. Source-citation header (URLs consulted for both variants, upstream commits/tags if available)
2. `import type { theme_palette } from "@twinkleplop/core/types"` (one-time migration: define the `theme_palette` type in `@twinkleplop/core/types` so every theme package can import it without depending on the site)
3. Named export for light: `export const light: theme_palette = { ... }`
4. Named export for dark: `export const dark: theme_palette = { ... }`
5. No default export

The variants are simply named `light` and `dark` — the package name already carries the theme family, so `import { light, dark } from "@twinkleplop/theme-ayu/tokens"` reads naturally.

### Palette shape

`theme_palette` is a `Record<token_name, string>` where `token_name` is exactly the set of strings exported from `@twinkleplop/core/tokens`, PLUS one required extra key: `background_color`.

- Every token name exported from `@twinkleplop/core/tokens` MUST appear as a key.
- `background_color` MUST appear as a key.
- No other keys. Extra keys fail the validation test in Phase 5.

### `background_color`

Each variant specifies a background as an explicit palette key. This is the page/container background color the theme author intended — pulled from the VSCode theme's `colors["editor.background"]` entry or the equivalent upstream field.

`background_color` is NOT bound to any element in the generated CSS. It is exposed to the consumer as a CSS variable (`--twp-background`) so they can optionally apply it, but the theme does not force it. Rationale: users embedding highlighted code inside their own page usually want the host page's background to win; users rendering standalone code can pull the variable in themselves with `background: var(--twp-background)` on whatever container they choose.

### Key values

- `"inherit"` is valid and common for whitespace tokens (`space`, `tab`, `newline`, `carriage_return`). Do not color whitespace unless the source theme specifically does.
- Every other value must be a hex color (e.g. `"#ff7b72"`). Do not use shorthand or named colors.
- Every color MUST be copied verbatim from the source, not eyeballed. Paste the hex, do not transcribe it.

---

## Phase 5: Validation test

Write `lib/theme-<name>/src/tokens.test.ts`. Every theme package ships this test. It enforces the invariant that palette keys exactly equal the set of `@twinkleplop/core/tokens` exports plus `background_color`, for both variants. Run it with vitest.

The test is identical across themes — only the import path of the local tokens changes. Copy this template verbatim:

```ts
import { describe, expect, it } from "vitest";
import * as TOKENS from "@twinkleplop/core/tokens";
import { dark, light } from "./tokens.ts";

const EXTRA_KEYS = ["background_color"] as const;

const canonical_token_names = (): Set<string> => {
  const names = new Set<string>();
  for (const value of Object.values(TOKENS)) {
    if (typeof value === "string") names.add(value);
  }
  for (const extra of EXTRA_KEYS) names.add(extra);
  return names;
};

const describe_variant = (name: string, palette: Record<string, string>) => {
  describe(name, () => {
    const expected = canonical_token_names();
    const actual = new Set(Object.keys(palette));

    it("contains every canonical token", () => {
      const missing = [...expected].filter((k) => !actual.has(k)).sort();
      expect(missing).toEqual([]);
    });

    it("contains no unknown keys", () => {
      const extra = [...actual].filter((k) => !expected.has(k)).sort();
      expect(extra).toEqual([]);
    });

    it("declares a background_color", () => {
      expect(palette.background_color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    });
  });
};

describe_variant("light", light);
describe_variant("dark", dark);
```

Why the test runs per-variant rather than as a single assertion: when light and dark drift independently (common when a port was copied from only one variant), per-variant failures tell you exactly which palette to fix. A single combined assertion only tells you something is wrong somewhere.

Run it: `pnpm --filter @twinkleplop/theme-<name> test`. This must pass before Phase 6. If the test fails, fix `tokens.ts` — do not weaken the test, and do not list exceptions in `EXTRA_KEYS`. The canonical token set is ground truth; a theme that cannot satisfy it is incomplete.

When `@twinkleplop/core/tokens` adds a new token, every theme package's test will start failing. That is the intended signal: themes need explicit coverage for the new token, not a silent fallback. Fix the palettes, do not silence the test.

---

## Phase 6: Stylesheets

Three stylesheets per package, ALL generated by `lib/theme-<name>/src/build.ts` from `tokens.ts`. Do not hand-maintain — palette and CSS must not drift.

Each stylesheet is SELF-CONTAINED: it declares the variables AND binds them to token classes. The consumer just includes the file and adds a `twinkleplop` class to the container that wraps highlighted code (core's `toHtml` adds it automatically).

### Shared conventions

- **Variable prefix**: `--twp-<key>` (e.g. `--twp-keyword`, `--twp-interp-open`). The `twp` prefix isolates theme variables from the host page's custom properties.
- **Container class**: `.twinkleplop` is the scope for every token-binding rule. Nothing else is global.
- **Token class names**: `.tok` (base) plus `.<key>` (per type) — matching what `toHtml` emits. The `<key>` in the class and the `<key>` in the variable are the SAME string, drawn from the palette key list.

### `dist/index.css` — both variants, toggle via `.dark` class

Three sections: light vars at `:root`, dark vars at `.dark`, token-binding rules at `.twinkleplop`. Consumer adds `.dark` to any ancestor (`<html class="dark">` is typical, matching Tailwind).

```css
/* @twinkleplop/theme-<name> — generated from src/tokens.ts, do not edit */

:root {
  --twp-background: #...;    /* exposed, not applied */
  --twp-keyword: #...;
  --twp-string: #...;
  /* ...every key from light, including background_color as --twp-background... */
}

.dark {
  --twp-background: #...;
  --twp-keyword: #...;
  --twp-string: #...;
  /* ...every key from dark, including background_color as --twp-background... */
}

.twinkleplop .keyword { color: var(--twp-keyword); }
.twinkleplop .string { color: var(--twp-string); }
/* ...one rule per palette key EXCEPT background_color and whitespace tokens... */
.twinkleplop .space { white-space: pre; }
.twinkleplop .tab { white-space: pre; }
.twinkleplop .newline { white-space: pre; }
```

Two rules about the binding block:

1. `background_color` is emitted as `--twp-background` in the variable blocks but has NO corresponding binding selector. Consumers opt in with `background: var(--twp-background)` on whatever container they choose; the theme does not force it on `.twinkleplop` or `body`.
2. Whitespace tokens (`space`, `tab`, `newline`, `carriage_return`) get `white-space: pre` but no color rule — their palette value is typically `"inherit"` anyway, and suppressing their color lets them inherit from the surrounding span naturally.

For any other palette key whose value is `"inherit"`, skip the binding rule entirely (the token will inherit from `.twinkleplop`'s default foreground, which the consumer sets).

### `dist/light.css` — light variant only

Same token-binding rules, but variables declared directly at `:root` with no `.dark` block.

```css
:root {
  --twp-text: #...;
  /* ...light only... */
}

.twinkleplop .tok { color: var(--twp-text); }
.twinkleplop .tok--keyword { color: var(--twp-keyword); }
/* ...same binding rules... */
```

### `dist/dark.css` — dark variant only

```css
:root {
  --twp-text: #...;
  /* ...dark only... */
}

.twinkleplop .tok { color: var(--twp-text); }
/* ...same binding rules... */
```

Rationale for the split: `light.css` and `dark.css` are for consumers who already know which mode they want at load time (SSR reading a cookie, apps that only support one mode). `index.css` is for consumers who want class-based toggling at runtime. The binding rules are identical across all three — only the `:root` / `.dark` variable blocks differ.

### Writing the build script

`build.ts` imports `light` and `dark` from `./tokens.ts`, iterates the keys, and writes the three files. Keep it tiny — no templating library, no minification. Roughly:

```ts
import { light, dark } from "./tokens.ts";
import { writeFileSync } from "node:fs";

// keys that live in the variable block only — never bound to a selector.
// background_color is exposed for consumers to opt into; whitespace stays uncolored.
const VAR_ONLY_KEYS = new Set(["background_color"]);
const INHERIT_KEYS = new Set(["space", "tab", "newline", "carriage_return"]);

const var_block = (selector: string, palette: Record<string, string>) => {
  const body = Object.entries(palette)
    .map(([k, v]) => `\t--twp-${k}: ${v};`)
    .join("\n");
  return `${selector} {\n${body}\n}\n`;
};

const binding_block = (palette: Record<string, string>) => {
  const lines: string[] = [];
  for (const key of Object.keys(palette)) {
    if (VAR_ONLY_KEYS.has(key)) continue;
    if (INHERIT_KEYS.has(key)) continue;
    if (palette[key] === "inherit") continue;
    lines.push(`.twinkleplop .tok--${key} { color: var(--twp-${key}); }`);
  }
  // whitespace rules that must always be emitted regardless of palette value
  lines.push(".twinkleplop .tok--space { white-space: pre; }");
  lines.push(".twinkleplop .tok--tab { white-space: pre; }");
  lines.push(".twinkleplop .tok--newline { white-space: pre; }");
  return `${lines.join("\n")}\n`;
};

// both palettes MUST share the same key set (enforced by the validation test);
// bindings are derived from either.
const bindings = binding_block(light);

writeFileSync("dist/light.css", var_block(":root", light) + "\n" + bindings);
writeFileSync("dist/dark.css", var_block(":root", dark) + "\n" + bindings);
writeFileSync("dist/index.css",
  var_block(":root", light) + "\n" +
  var_block(".dark", dark) + "\n" +
  bindings);
```

Key rule: `background_color` MUST appear in every `:root { ... }` and `.dark { ... }` block as `--twp-background`, but MUST NOT appear in any binding selector. The variable is the theme's offer; the consumer decides where (if anywhere) to apply it.

Follow project conventions from `AGENTS.md` (tabs, double quotes, snake_case identifiers).

### One-time migration: align the site with the new prefix

The existing site uses `--c-*` variables (see `lib/_site/src/lib/styles/explore.css` and `lib/_site/src/lib/explore/palette_vars.ts`). On first-run of this skill, migrate the site to `--twp-*` so a single prefix is used everywhere:

1. In `lib/_site/src/lib/explore/palette_vars.ts`, change `--c-${key}` to `--twp-${key}`.
2. In `lib/_site/src/lib/styles/explore.css`, rename every `var(--c-...)` to `var(--twp-...)`. There are roughly 20 rules in the `/* token colors... */` block.
3. Verify the existing `plop-*` and `shiki-*` themes still render correctly after the rename.

This migration is a prerequisite, not an optional cleanup — without it, the inline-style approach the site uses for live swapping will write `--twp-*` while the CSS rules still read `--c-*`, and tokens will render as fallback text.

---

## Phase 7: Site integration

Wire the theme pair into the Tweaks panel so both variants are togglable live.

1. In `lib/_site/src/lib/explore/themes.ts`:
   - Create (or extend) a `ported_theme_name` union with the variant names: e.g. `"ayu-light" | "ayu-dark" | "github-light" | "github-dark"`. Keep the existing `plop_theme_name` and `shiki_theme_name` unions untouched so defaults stay first-class.
   - Create (or extend) a `PORTED_THEMES: Record<ported_theme_name, token_palette>` record. Import palettes from the new packages — do NOT duplicate hex values:
     ```ts
     import { light as ayu_light, dark as ayu_dark } from "@twinkleplop/theme-ayu/tokens";
     export const PORTED_THEMES: Record<ported_theme_name, token_palette> = {
       "ayu-light": ayu_light,
       "ayu-dark": ayu_dark,
       // ...
     };
     ```
2. In `lib/_site/src/lib/components/explore/TweaksPanel.svelte`:
   - Add a new section for ported themes (follow the `PLOP_THEMES_LIST` / `SHIKI_THEMES_LIST` chip pattern), listing both variants of each family so users see them grouped.
3. Extend `tweak_state` and `DEFAULT_TWEAKS` to carry a `ported_theme` field if you are making it a third selector alongside `plop_theme` and `shiki_theme`. Alternative: fold ported themes into the existing `plop_theme` slot by widening its union — decide based on whether you want them visible as a separate pane or as just another palette option for the twinkleplop pane.
4. Verify the toggle works: `pnpm --filter @twinkleplop/_site dev`, open the explore route, open Tweaks, click each new chip. Colors should swap instantly (no page reload) because the top-level wrapper's inline `style` attribute is the only thing that changes.

Do NOT import the generated CSS file into the site. The site uses `palette_to_vars()` at runtime to write the variables onto the wrapper element from the palette object directly. The shipped `.css` files are for external consumers of `@twinkleplop/theme-<name>`.

---

## Phase 8: Verification

Run in order:

1. `pnpm install` — picks up the new workspace package and export paths
2. `pnpm --filter @twinkleplop/theme-<name> test` — the Phase 5 validation test must pass before anything else (a missing/extra palette key will silently break the stylesheet)
3. `pnpm --filter @twinkleplop/theme-<name> build` — generates `dist/index.css`, `dist/light.css`, `dist/dark.css`
4. Sanity-check the three generated files: `index.css` must contain BOTH a `:root { ... }` block and a `.dark { ... }` block, with the same set of `--twp-*` keys in each. Both must include `--twp-background` but NO binding rule referencing `--twp-background`. `light.css` and `dark.css` must each contain exactly one `:root { ... }` block.
5. `pnpm --filter @twinkleplop/_site dev` — launch the explore route and cycle through both new chips (light AND dark)
6. Visual check: for each variant, view at least three languages with very different token vocabularies (e.g. rust, css, markdown). Token colors you picked for `lifetime`, `macro`, `property`, `selector`, markdown-only tokens only light up under the right language — do not skip this step because javascript looks fine.

If a token renders as plain text, the palette is missing a key. If a token renders as the wrong color, you either picked the wrong scope mapping in Phase 2 or transcribed the hex wrong in Phase 4. Compare against a screenshot from the upstream theme's README or the VSCode marketplace listing.

---

## Checkpoint

The skill is complete when:

- `lib/theme-<name>/src/tokens.ts` exports both `light` and `dark`, each containing every name from `@twinkleplop/core/tokens` plus `background_color`, and the source-citation header points at URLs you actually opened for both variants.
- `lib/theme-<name>/src/tokens.test.ts` exists and `pnpm --filter @twinkleplop/theme-<name> test` passes.
- `lib/theme-<name>/dist/index.css`, `light.css`, and `dark.css` exist and were generated from `tokens.ts` by `build.ts` (not hand-written). Each stylesheet declares `--twp-background` in its variable block(s) and has no selector binding it.
- `package.json` exports include `.`, `./light`, `./dark`, and `./tokens`; scripts include `build` and `test`.
- The Tweaks panel in the running dev site can toggle into BOTH variants and each token category renders with the color you recorded.

Report back to the user with:
- Which family shipped (always both variants, but name them explicitly).
- Any scope mappings that had to fall back (which tokens, to what, and why).
- Any sources that disagreed with upstream and which one won.
- The two `background_color` hexes chosen (light and dark) and the upstream field they came from.
