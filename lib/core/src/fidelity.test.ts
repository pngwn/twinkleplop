import { describe, expect, test } from "vitest";
import { promote_by_upper_snake_case, promote_pascal_case } from "./fidelity";
import { reclassify } from "./reclassifier";
import type { Reclassifier } from "./types";

const INPUT = "Foo x Bar";
const SPANS = [
  [0, 3],
  [4, 5],
  [6, 6],
  [6, 9],
];

function run_types(pipeline: Reclassifier[]): string[] {
  const tokens = new Uint32Array(SPANS.length * 3);
  for (let i = 0; i < SPANS.length; i++) {
    tokens[i * 3 + 1] = SPANS[i][0];
    tokens[i * 3 + 2] = SPANS[i][1];
  }
  const result = reclassify(pipeline)(INPUT, { tokens, token_types: ["identifier"] });
  const types: string[] = [];
  for (let i = 0; i < SPANS.length; i++) types.push(result.token_types[result.tokens[i * 3]]);
  return types;
}

const EXPECTED = ["class_name", "identifier", "class_name", "class_name"];

describe("identifier promoters", () => {
  test("pascal case alone", () => {
    expect(run_types([promote_pascal_case("identifier", "class_name")])).toEqual(EXPECTED);
  });

  test("fused with upper snake case matches pascal case alone", () => {
    const pipeline = [
      promote_by_upper_snake_case("identifier", "constant"),
      promote_pascal_case("identifier", "class_name"),
    ];
    expect(run_types(pipeline)).toEqual(EXPECTED);
  });
});
