import { describe, expect, it } from "vitest";
import { create_language } from "@twinkleplop/core";
import { grammar, reclassifiers, tokenize } from "./index.js";

function named(input: string, fidelity: "high" | "low" | string[] = "high") {
  const result = tokenize({ fidelity })(input);
  return Array.from({ length: result.tokens.length / 3 }, (_, i) => ({
    type: result.token_types[result.tokens[3 * i]],
    value: input.slice(result.tokens[3 * i + 1], result.tokens[3 * i + 2]),
    start: result.tokens[3 * i + 1],
    end: result.tokens[3 * i + 2],
  }));
}
const of = (input: string, category: string) =>
  named(input)
    .filter((t) => t.type === category)
    .map((t) => t.value);

describe("C fidelity", () => {
  it("highlights type declarations aliases and conventional names", () => {
    expect(
      of(
        "struct record { int field; }; struct record item; typedef unsigned long count; count n; size_t len; Widget widget;",
        "class_name",
      ),
    ).toEqual(["record", "record", "count", "count", "size_t", "Widget"]);
    expect(
      of("typedef struct { int member; } node; typedef int (*callback)(int);", "class_name"),
    ).toEqual(["node", "callback"]);
  });
  it("highlights macros uppercase constants and enumerators", () => {
    expect(
      of(
        "#define limit 8\n#define apply(x) (x)\nenum state { idle, busy = call(1, 2), done }; MAX_BYTES;",
        "constant",
      ),
    ).toEqual(["limit", "apply", "idle", "busy", "done", "MAX_BYTES"]);
  });
  it("distinguishes members from methods and call arguments", () => {
    const input = "obj.field; ptr->member; ptr->RUN(value); call(value, other);";
    expect(of(input, "property")).toEqual(["field", "member"]);
    expect(of(input, "function")).toEqual(["RUN", "call"]);
    expect(of(input, "parameter")).toEqual([]);
  });
  it("highlights named parameters without changing unnamed types", () => {
    const input =
      "int run(int count, const char *name, struct record *item, widget value, void (*visit)(int), int values[8], size_t);";
    expect(of(input, "parameter")).toEqual(["count", "name", "item", "value", "visit", "values"]);
    expect(
      of("return run(a * b, value); if (ready) run(value); sizeof(run(value));", "parameter"),
    ).toEqual([]);
  });
  it("keeps cpp words available as c parameter names", () => {
    expect(of("void run(int class, int namespace, int typename);", "parameter")).toEqual([
      "class",
      "namespace",
      "typename",
    ]);
    expect(of("struct record {}; int record;", "class_name")).toEqual(["record"]);
  });
  it("supports each fidelity category independently and preserves offsets", () => {
    const input = "struct record {}; int run(record item) { return item.field + MAX_BYTES; }";
    const high = named(input);
    const low = named(input, "low");
    expect(named(input, [])).toEqual(low);
    expect(
      low.some((t) =>
        ["class_name", "constant", "function", "parameter", "property"].includes(t.type),
      ),
    ).toBe(false);
    for (const category of ["class_name", "constant", "function", "parameter", "property"]) {
      const partial = named(input, [category]);
      expect(partial.filter((t) => t.type === category).length).toBeGreaterThan(0);
      expect(
        partial.every(
          (t) => t.type === category || low.some((b) => b.start === t.start && b.type === t.type),
        ),
      ).toBe(true);
      expect(partial.map((t) => [t.value, t.start, t.end])).toEqual(
        high.map((t) => [t.value, t.start, t.end]),
      );
    }
    expect(named(input, ["unknown"])).toEqual(low);
  });
  it("keeps claim ordering and repeated tokenization stable", () => {
    const input = "typedef int Count; int RUN(Count VALUE) { return obj.VALUE; }";
    const expected = tokenize()(input);
    const reversed = create_language(grammar, [...reclassifiers].reverse())()(input);
    const names = (r: typeof expected) =>
      Array.from({ length: r.tokens.length / 3 }, (_, i) => r.token_types[r.tokens[3 * i]]);
    expect(names(reversed)).toEqual(names(expected));
    expect(tokenize({ fidelity: "low" })(input).token_types).not.toContain("parameter");
    expect(tokenize()(input)).toEqual(expected);
  });
});
