import { describe, expect, it } from "vitest";
import {
  oracle_mismatches,
  read_fixture,
  rename_differences,
} from "../test/position_oracle/index.js";
import { tokenize as make_language } from "./index.js";

const tokenize = make_language();
const fixture = read_fixture("builtin_positions.txt");

describe("TypeScript builtin type names are classified by position", () => {
  it("match the compiler's type positions", () => {
    expect(oracle_mismatches(tokenize, fixture)).toEqual([]);
  });

  it("classify the same as any other name", () => {
    expect(rename_differences(tokenize, fixture)).toEqual([]);
  });

  it("the rename check reports a spelling-keyed rule", () => {
    expect(rename_differences(tokenize, "const a = true;", /\btrue\b/g)).not.toEqual([]);
  });

  it("the issue #123 repro keeps class fields and members as names", () => {
    const src = "class Hi {\n  any = 10;\n  string = 11;\n  hello = 12;\n}\n\nnew Hi().any";
    expect(oracle_mismatches(tokenize, src)).toEqual([]);
  });
});
