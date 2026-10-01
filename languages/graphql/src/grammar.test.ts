import { describe, it, expect, test } from "vitest";
import { tokenize as core_tokenize } from "@twinkleplop/core";
import { verify } from "@twinkleplop/core/compile";
import { grammar, raw_grammar, tokenize, language } from "./index.js";
import fs from "node:fs";
import path from "node:path";

const test_dir = path.join(import.meta.dirname, "..", "test");
const snapshots = import.meta.glob("../test/*.output.js", { eager: true }) as Record<
  string,
  { test: { type: string; start: number; end: number; match: string }[] }
>;

function get_tokens(input: string) {
  const result = core_tokenize(input, grammar);
  const tokens = [];
  for (let i = 0; i < result.tokens.length; i += 3) {
    const type = result.token_types[result.tokens[i]];
    const start = result.tokens[i + 1];
    const end = result.tokens[i + 2];
    tokens.push({ type, start, end, match: input.slice(start, end) });
  }
  return tokens;
}
const pairs = (input: string) => get_tokens(input).map((t) => [t.type, t.match]);
const of_type = (input: string, type: string) =>
  get_tokens(input)
    .filter((t) => t.type === type)
    .map((t) => t.match);

describe("GraphQL grammar", () => {
  test("verify", () => expect(verify(raw_grammar)).toEqual([]));

  for (const file of fs
    .readdirSync(test_dir)
    .filter((f) => f.endsWith(".graphql") || f.endsWith(".gql"))) {
    it(`tokenizes ${file}`, () => {
      const input = fs.readFileSync(path.join(test_dir, file), "utf8");
      const base = file.slice(0, file.lastIndexOf("."));
      expect(get_tokens(input)).toEqual(snapshots[`../test/${base}.output.js`].test);
    });
  }

  it("matches the research traces for nested objects and signed decimals", () => {
    expect(pairs("{ nearestThing(location: { lon: 12.43, lat: -53.211 }) }")).toEqual([
      ["punctuation", "{"],
      ["property", "nearestThing"],
      ["punctuation", "("],
      ["property", "location"],
      ["punctuation", ":"],
      ["punctuation", "{"],
      ["property", "lon"],
      ["punctuation", ":"],
      ["number", "12.43"],
      ["punctuation", ","],
      ["property", "lat"],
      ["punctuation", ":"],
      ["number", "-53.211"],
      ["punctuation", "})"],
      ["punctuation", "}"],
    ]);
  });

  it("keeps keyword-spelled names contextual", () => {
    const input =
      "query query($type: type) { query(type: query, true: false) { type true null ...on type { on } } }";
    expect(of_type(input, "keyword")).toEqual(["query", "on"]);
    expect(of_type(input, "type")).toEqual(["type", "type"]);
    expect(of_type(input, "constant")).toEqual(["query"]);
    expect(of_type(input, "boolean")).toEqual(["false"]);
    expect(of_type(input, "property")).toEqual([
      "query",
      "type",
      "true",
      "type",
      "true",
      "null",
      "on",
    ]);
  });

  it("protects keyword prefixes and case-sensitive names", () => {
    const input = "{ f(values: [true false null trueValue falseValue nullValue TRUE queryName]) }";
    expect(of_type(input, "boolean")).toEqual(["true", "false"]);
    expect(of_type(input, "null")).toEqual(["null"]);
    expect(of_type(input, "constant")).toEqual([
      "trueValue",
      "falseValue",
      "nullValue",
      "TRUE",
      "queryName",
    ]);
  });

  it("treats dollar as a name boundary between adjacent values", () => {
    const input = "{ f(v: [true$x false$y null$z trueValue nullish]) }";
    expect(of_type(input, "boolean")).toEqual(["true", "false"]);
    expect(of_type(input, "null")).toEqual(["null"]);
    expect(of_type(input, "variable")).toEqual(["$x", "$y", "$z"]);
    expect(of_type(input, "constant")).toEqual(["trueValue", "nullish"]);
  });

  it("handles nested type wrappers, defaults and directive arguments independently", () => {
    const input =
      "query Q($x: [[lower!]!]! = [[null, true, {type: query}]]) @type(if: false) { f(v: $x) }";
    expect(of_type(input, "type")).toEqual(["lower"]);
    expect(of_type(input, "constant")).toEqual(["query"]);
    expect(of_type(input, "boolean")).toEqual(["true", "false"]);
    expect(of_type(input, "property")).toEqual(["type", "if", "f", "v"]);
    expect(of_type(input, "decorator")).toEqual(["@type"]);
    expect(of_type(input, "variable")).toEqual(["$x", "$x"]);
  });

  it("allows ignored tokens between sigils and names", () => {
    const input = "{ f(x: $ , # variable\r\nquery) @\uFEFF# directive\rtype }";
    expect(of_type(input, "variable")).toEqual(["$", "query"]);
    expect(of_type(input, "decorator")).toEqual(["@", "type"]);
    expect(of_type(input, "comment")).toEqual(["# variable", "# directive"]);
    expect(of_type(input, "keyword")).toEqual([]);
  });

  it("handles all decimal number phases", () => {
    const values = ["0", "-0", "12", "-12", "0.5", "-0.5", "1e3", "1E+3", "1e-3", "-1.25E+10"];
    expect(of_type(`{ f(v: [${values.join(" ")}]) }`, "number")).toEqual(values);
  });

  it("keeps escaped quotes, Unicode escapes and interpolation-like text inside strings", () => {
    const value = String.raw`"\" \\ \/ \b \f \n \r \t \u0041 \uD83D\uDE00 \u{1F600} # $x ${"${noInterpolation}"}"`;
    expect(of_type(`{ f(v: ${value}) after }`, "string").join("")).toBe(value);
    expect(of_type(`{ f(v: ${value}) after }`, "property")).toEqual(["f", "v", "after"]);
  });

  it("only treats escaped triple quotes specially in block strings", () => {
    const value = '"""\nraw \\n " "" \\""" still \\\\""" inside # $x\n"""';
    expect(of_type(`{ f(v: ${value}) after }`, "string").join("")).toBe(value);
    expect(of_type(`{ f(v: ${value}) after }`, "property")).toEqual(["f", "v", "after"]);
    expect(of_type('{ f(v: """""") }', "string").join("")).toBe('""""""');
  });

  it.each(["\n", "\r", "\r\n"])("recovers ordinary strings and comments at %j", (newline) => {
    expect(
      of_type(`{ f(v: "broken\\${newline}) after # ignored${newline} tail }`, "property"),
    ).toEqual(["f", "v", "after", "tail"]);
    expect(of_type(`{ f } # eof`, "comment")).toEqual(["# eof"]);
  });

  it("keeps unterminated block strings through EOF", () => {
    expect(of_type('{ f(v: """unfinished\n# still string', "string")).toEqual([
      '"""unfinished\n# still string',
    ]);
  });

  it("returns from bodyless definitions and keeps names distinct from keywords", () => {
    const input =
      "scalar type type query @tag enum type { query } union on = query | type directive @on repeatable on FIELD | OBJECT query type { query }";
    expect(of_type(input, "keyword")).toEqual([
      "scalar",
      "type",
      "enum",
      "union",
      "directive",
      "repeatable",
      "on",
      "query",
    ]);
    expect(of_type(input, "type")).toEqual(["type", "query", "type", "on", "query", "type"]);
    expect(of_type(input, "constant")).toEqual(["query", "FIELD", "OBJECT"]);
  });

  it("balances the stack across hundreds of sibling constructs", () => {
    const unit =
      'scalar S type T implements A & B { f(x: [[T!]!]! = [[{a: -1.2e+3, b: true, c: null, d: "x", e: """y"""}]]) : T @d(v: $x) } union U = T | S directive @d(v: T) repeatable on FIELD | OBJECT query Q($x: T = null) { f(v: [{a: 1}]) { ...F ...on T { f } } } fragment F on T { f }\n';
    const input = unit.repeat(600) + "query Tail { after(v: false) }";
    const tail = pairs("query Tail { after(v: false) }");
    expect(pairs(input).slice(-tail.length)).toEqual(tail);
    expect(of_type(input, "keyword").filter((t) => t === "query")).toHaveLength(601);
  });

  it("exports tokenization and HTML rendering", () => {
    const source = '{ f(v: "<>&") }';
    expect(tokenize()(source).tokens).toEqual(core_tokenize(source, grammar).tokens);
    expect(language()(source)).toContain("&lt;&gt;&amp;");
    expect(language()(source)).toContain('class="tok property"');
  });
});
