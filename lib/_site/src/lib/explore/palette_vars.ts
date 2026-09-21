import type { theme_styles } from "@twinkleplop/core/types";
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

// the first rule outranks the italic comments and bold markdown explore.css gives every theme
export function styles_to_css(styles: theme_styles, scope: string): string {
  const rules = [`${scope} .tok.tok{font-style:normal;font-weight:normal;text-decoration:none}`];
  for (const [key, style = []] of Object.entries(styles)) {
    const decorations = [
      style.includes("underline") && "underline",
      style.includes("strikethrough") && "line-through",
    ].filter(Boolean);
    const declarations = [
      style.includes("italic") && "font-style:italic",
      style.includes("bold") && "font-weight:bold",
      decorations.length > 0 && `text-decoration:${decorations.join(" ")}`,
    ].filter(Boolean);
    rules.push(`${scope} .tok.${key}{${declarations.join(";")}}`);
  }
  return rules.join("\n");
}
