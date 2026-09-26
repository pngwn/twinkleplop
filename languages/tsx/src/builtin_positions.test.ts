import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  oracle_mismatches,
  read_fixture,
  rename_differences,
} from "../../typescript/test/position_oracle/index.js";
import { tokenize as make_language } from "./index.js";

const tokenize = make_language();
// the typescript fixture has no angle bracket casts, so it is valid tsx
const shared = read_fixture("builtin_positions.txt");
const tsx = readFileSync(
  new URL("../test/position_oracle/builtin_positions.txt", import.meta.url),
  "utf8",
);

describe("TSX builtin type names are classified by position", () => {
  for (const [name, src] of [
    ["shared TypeScript fixture", shared],
    ["TSX fixture", tsx],
  ]) {
    it(`match the compiler's type positions (${name})`, () => {
      expect(oracle_mismatches(tokenize, src, true)).toEqual([]);
    });

    it(`classify the same as any other name (${name})`, () => {
      expect(rename_differences(tokenize, src)).toEqual([]);
    });
  }
});
