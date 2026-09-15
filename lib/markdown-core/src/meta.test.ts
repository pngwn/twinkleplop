import { describe, expect, test } from "vitest";
import { parse_meta, split_info } from "./meta";

const fail = (message: string): never => {
  throw new Error(message);
};

const parse = (meta: string) => parse_meta(meta, fail);

describe("split_info", () => {
  test("takes the language from the first word and the meta from the rest", () => {
    expect(split_info('ts {1,3-4} title="math.ts"')).toEqual({
      lang: "ts",
      meta: '{1,3-4} title="math.ts"',
    });
  });

  test("matches exactly and case sensitively", () => {
    expect(split_info("TS").lang).toBe("TS");
    expect(split_info("  ts  ").lang).toBe("ts");
    expect(split_info("").lang).toBe("");
  });
});

describe("line groups", () => {
  test("reads single lines and ranges", () => {
    expect(parse("{1,3-4}").line_groups).toEqual([{ lines: [1, [3, 4]] }]);
  });

  test("reads an id suffix", () => {
    expect(parse("{2}#v").line_groups).toEqual([{ lines: [2], id: "v" }]);
  });

  test("leaves a brace group that is not a line list alone", () => {
    expect(parse('{"a":1}').line_groups).toEqual([]);
  });
});

describe("word groups", () => {
  test("reads a bare word", () => {
    expect(parse("/total/").word_groups).toEqual([{ text: "total" }]);
  });

  test("reads an occurrence range and an id", () => {
    expect(parse("/total/3-5").word_groups).toEqual([{ text: "total", from: 3, to: 5 }]);
    expect(parse("/total/#v").word_groups).toEqual([{ text: "total", id: "v" }]);
  });

  test("keeps spaces inside the pattern and unescapes a slash", () => {
    expect(parse("/two words/").word_groups).toEqual([{ text: "two words" }]);
    expect(parse("/a\\/b/").word_groups).toEqual([{ text: "a/b" }]);
  });

  test("ignores an unterminated pattern", () => {
    expect(parse("/total").word_groups).toEqual([]);
  });
});

describe("line numbers", () => {
  test("reads both families", () => {
    expect(parse(":line-numbers").line_numbers).toEqual({ start: 1 });
    expect(parse(":line-numbers=10").line_numbers).toEqual({ start: 10 });
    expect(parse(":no-line-numbers").line_numbers).toBe(false);
    expect(parse("showLineNumbers").line_numbers).toEqual({ start: 1 });
    expect(parse("showLineNumbers{5}").line_numbers).toEqual({ start: 5 });
  });

  test("says nothing when the meta says nothing", () => {
    expect(parse("{1}").line_numbers).toBe(undefined);
  });
});

describe("titles and captions", () => {
  test("reads both title conventions and a caption", () => {
    expect(parse("[math.ts]").title).toBe("math.ts");
    expect(parse('title="math.ts"').title).toBe("math.ts");
    expect(parse("title='math.ts'").title).toBe("math.ts");
    expect(parse('caption="the sum"').caption).toBe("the sum");
  });

  test("keeps spaces inside a quoted value and a bracket title", () => {
    expect(parse('title="two words"').title).toBe("two words");
    expect(parse("[two words]").title).toBe("two words");
  });

  test("two title conventions on one fence fail", () => {
    expect(() => parse('[a] title="b"')).toThrow("two title conventions");
  });
});

describe("twoslash", () => {
  test("is a bare word", () => {
    expect(parse("twoslash").twoslash).toBe(true);
    expect(parse("{1}").twoslash).toBe(false);
  });
});

describe("unrecognised parts", () => {
  test("are ignored", () => {
    const parsed = parse("copy=false weird {1} data-x");
    expect(parsed.line_groups).toEqual([{ lines: [1] }]);
    expect(parsed.title).toBe(undefined);
  });
});

test("one meta string carries every convention at once", () => {
  const parsed = parse(
    '{1,3-4}#g /total/2-3 :line-numbers=10 title="math.ts" caption="c" twoslash',
  );
  expect(parsed).toEqual({
    line_groups: [{ lines: [1, [3, 4]], id: "g" }],
    word_groups: [{ text: "total", from: 2, to: 3 }],
    line_numbers: { start: 10 },
    title: "math.ts",
    caption: "c",
    twoslash: true,
  });
});
