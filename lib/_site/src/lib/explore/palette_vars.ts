import type { token_palette } from "./themes";

// produces an inline style string (without the `style=` wrapper) that
// maps a twinkleplop token palette onto css variables. the explore
// stylesheet colors tokens via `var(--c-<type>)` so switching palettes
// is a no-repaint swap of the wrapper's style attribute.
export function palette_to_vars(palette: token_palette): string {
	const parts: string[] = [];
	for (const key in palette) {
		parts.push(`--c-${key}:${palette[key]}`);
	}
	return parts.join(";");
}
