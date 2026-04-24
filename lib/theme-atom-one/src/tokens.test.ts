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
