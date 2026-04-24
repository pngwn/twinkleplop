import type { token_palette } from "./themes";

// produces an inline style string (without the `style=` wrapper) that
// maps a twinkleplop token palette onto css variables. the explore
// stylesheet colors tokens via `var(--twp-<type>)` so switching palettes
// is a no-repaint swap of the wrapper's style attribute.
//
// `background_color` is emitted as `--twp-background`, matching the
// convention the theme packages' generated stylesheets use — consumers
// opt into it with `background: var(--twp-background)` wherever they
// want the theme's editor background to show through.
export function palette_to_vars(palette: token_palette): string {
  const parts: string[] = [];
  for (const key in palette) {
    const var_name = key === "background_color" ? "background" : key;
    parts.push(`--twp-${var_name}:${palette[key]}`);
  }
  return parts.join(";");
}
