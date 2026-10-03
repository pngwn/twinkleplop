import { describe, expect, it } from "vitest";
import { create_language } from "@twinkleplop/core";
import { grammar, reclassifiers, tokenize } from "./index.js";

function names(input: string, fidelity: "high" | "low" | string[] = "high") {
  const result = tokenize({ fidelity })(input);
  return Array.from({ length: result.tokens.length / 3 }, (_, i) => [
    result.token_types[result.tokens[3 * i]],
    input.slice(result.tokens[3 * i + 1], result.tokens[3 * i + 2]),
  ]);
}
const of = (input: string, category: string) =>
  names(input)
    .filter(([t]) => t === category)
    .map(([, v]) => v);

describe("C++ fidelity", () => {
  it("highlights namespaces classes and aliases", () => {
    const input =
      "namespace Acme::detail {} namespace alias = Acme; class widget {}; using value_type = widget; std::vector<value_type> values;";
    expect(of(input, "namespace")).toEqual(["Acme", "detail", "alias", "Acme", "std"]);
    expect(of(input, "class_name")).toContain("widget");
    expect(of(input, "class_name").filter((t) => t === "value_type")).toHaveLength(2);
  });
  it("recognizes nested template calls and member methods", () => {
    const input =
      "make<std::vector<int>>(value); obj.get<Item>(); obj.field; ptr->size(); a < b; a >> b;";
    expect(of(input, "function")).toEqual(["make", "get", "size"]);
    expect(of(input, "property")).toEqual(["field"]);
    expect(of(input, "parameter")).toEqual([]);
  });
  it("handles references defaults templates and unnamed parameters", () => {
    const input =
      "void visit(const std::string& name, std::vector<std::pair<int, int>> values, int count = call(1, 2), const std::string&, Widget);";
    expect(of(input, "parameter")).toEqual(["name", "values", "count"]);
  });
  it("handles qualified definitions and template return types", () => {
    expect(
      of("int Widget::run(int count) {} std::vector<int> make(int count) {}", "parameter"),
    ).toEqual(["count", "count"]);
  });
  it("recognizes scoped enums without promoting initializer names", () => {
    expect(of("enum class Color : int { red, green = factory(1, 2), blue };", "constant")).toEqual([
      "red",
      "green",
      "blue",
    ]);
  });
  it("highlights lambda parameters without changing subscript calls", () => {
    expect(
      of(
        "auto f = [factor = 2](auto x, const Widget& item) { return x; }; table[index](value);",
        "parameter",
      ),
    ).toEqual(["x", "item"]);
  });
  it("keeps unfinished template chains bounded", () => {
    const input = "name < ".repeat(2000) + "tail";
    expect(of(input, "class_name")).toEqual([]);
  });
  it("gates every enrichment without depending on other passes", () => {
    const input =
      "namespace app {} class Widget {}; int run(Widget item) { return app::MAX_BYTES + item.field; }";
    const categories = ["class_name", "constant", "function", "parameter", "property", "namespace"];
    const low = names(input, "low");
    expect(names(input, [])).toEqual(low);
    for (const category of categories) {
      const partial = names(input, [category]);
      expect(partial.some(([t]) => t === category)).toBe(true);
      expect(partial.every(([t], i) => t === category || t === low[i][0])).toBe(true);
    }
    const result = create_language(grammar, [...reclassifiers].reverse())()(input);
    expect(
      Array.from(
        { length: result.tokens.length / 3 },
        (_, i) => result.token_types[result.tokens[3 * i]],
      ),
    ).toEqual(names(input).map(([t]) => t));
  });
});
