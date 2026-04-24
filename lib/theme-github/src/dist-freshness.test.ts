// dist-freshness — the built CSS in `dist/` must contain a rule for every
// canonical token (and the background_color variable). catches the silent
// failure where someone adds a new token to `tokens.ts` but forgets to
// re-run `pnpm build`, leaving dist CSS missing rules and consumers
// rendering the new tokens as unstyled spans.

import fs from "node:fs";
import { describe, expect, it } from "vitest";
import * as TOKENS from "@twinkleplop/core/tokens";

const DIST = new URL("../dist/", import.meta.url).pathname;

function canonical_tokens(): string[] {
	const names = new Set<string>();
	for (const value of Object.values(TOKENS)) {
		if (typeof value === "string") names.add(value);
	}
	return [...names].sort();
}

for (const file of ["dark.css", "light.css", "index.css"]) {
	describe(file, () => {
		if (!fs.existsSync(DIST + file)) {
			it("exists (run `pnpm --filter=@twinkleplop/theme-github build`)", () => {
				expect(fs.existsSync(DIST + file)).toBe(true);
			});
			return;
		}
		const css = fs.readFileSync(DIST + file, "utf-8");
		for (const token of canonical_tokens()) {
			it(`has a rule for .${token}`, () => {
				// each canonical token should appear as a class selector in
				// the built CSS. test permissively (contains the name, not an
				// exact selector) so theme authors can bundle under nested
				// scopes or media queries without breaking this guard.
				expect(
					css,
					`built CSS is missing a rule referencing ${token}. did you forget to run the theme build after editing src/tokens.ts?`,
				).toContain(token);
			});
		}
	});
}
