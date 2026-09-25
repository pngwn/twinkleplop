import { describe, expect, test } from "vitest";
import { compile_word_table, word_table_get } from "./word_table";

function by_sets(groups: Set<string>[], fold: boolean, text: string): number {
  const key = fold ? text.toLowerCase() : text;
  for (let g = 0; g < groups.length; g++) if (groups[g].has(key)) return g + 1;
  return 0;
}

const KELVIN = String.fromCharCode(0x212a);
const DOTTED_I = String.fromCharCode(0x130);
const LONG_S = String.fromCharCode(0x17f);

describe("word_table", () => {
  const groups = [
    new Set(["true", "false"]),
    new Set(["int", "key", "true"]),
    new Set(["select", "break", "a_very_long_keyword_past_the_overflow_slot"]),
  ];

  test("reads words in place from the middle of the input", () => {
    const table = compile_word_table(groups);
    const input = "(select int)";
    expect(word_table_get(table, input, 1, 7)).toBe(3);
    expect(word_table_get(table, input, 8, 11)).toBe(2);
    expect(word_table_get(table, input, 1, 6)).toBe(0);
  });

  test("the first group holding a word wins", () => {
    const table = compile_word_table(groups);
    expect(word_table_get(table, "true", 0, 4)).toBe(1);
  });

  test("agrees with sliced Set lookups, folded or not", () => {
    const inputs = [
      "select",
      "SELECT",
      "SeLeCt",
      "selects",
      "key",
      "KEY",
      `${KELVIN}ey`,
      `brea${KELVIN}`,
      `${DOTTED_I}nt`,
      `${LONG_S}elect`,
      "int",
      "INT",
      "a_very_long_keyword_past_the_overflow_slot",
      "A_VERY_LONG_KEYWORD_PAST_THE_OVERFLOW_SLOT",
      "a_very_long_keyword_past_the_overflow_slox",
      "",
      "x",
    ];
    for (const fold of [false, true]) {
      const table = compile_word_table(groups, { fold });
      for (const text of inputs) {
        expect([fold, text, word_table_get(table, text, 0, text.length)]).toEqual([
          fold,
          text,
          by_sets(groups, fold, text),
        ]);
      }
    }
  });
});
