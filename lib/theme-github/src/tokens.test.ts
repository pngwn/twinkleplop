import fs from "node:fs";
import { describe, expect, it } from "vitest";
import * as TOKENS from "@twinkleplop/core/tokens";
import { dark, dark_styles, light, light_styles } from "./tokens.ts";

const EXTRA_KEYS = ["background_color"] as const;
const FONT_STYLES = new Set(["italic", "bold", "underline", "strikethrough"]);

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

const describe_styles = (name: string, styles: Record<string, readonly string[] | undefined>) => {
  describe(name, () => {
    const tokens = canonical_token_names();

    it("styles only canonical tokens", () => {
      const unknown = Object.keys(styles).filter((k) => !tokens.has(k) || k === "background_color");
      expect(unknown).toEqual([]);
    });

    it("uses only vs code font style keywords", () => {
      const bad = Object.entries(styles).filter(
        ([, style]) => !style?.length || !style.every((s) => FONT_STYLES.has(s)),
      );
      expect(bad).toEqual([]);
    });
  });
};

describe_styles("light_styles", light_styles);
describe_styles("dark_styles", dark_styles);

describe("dist/tokens.js", () => {
  const dist = new URL("../dist/tokens.js", import.meta.url);

  if (!fs.existsSync(dist.pathname)) {
    it("exists (run `pnpm --filter=@twinkleplop/theme-github build`)", () => {
      expect(fs.existsSync(dist.pathname)).toBe(true);
    });
  } else {
    it("matches the palettes declared here", async () => {
      const built = await import(dist.href);
      expect(built.light).toEqual(light);
      expect(built.dark).toEqual(dark);
      expect(built.light_styles).toEqual(light_styles);
      expect(built.dark_styles).toEqual(dark_styles);
    });
  }
});
