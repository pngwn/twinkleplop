import { describe, expect, test } from "vitest";
import { create_renderer } from "./render";
import { resolve_registry } from "./registry";

const highlight = () => "<pre></pre>";

describe("resolve_registry", () => {
  test("wraps a bare highlight function in an entry", () => {
    expect(resolve_registry({ ts: highlight }).get("ts")).toEqual({ highlight });
  });

  test("keeps a twoslash highlighter on the entry", () => {
    const twoslash = () => "<pre>ts</pre>";
    expect(resolve_registry({ ts: { highlight, twoslash } }).get("ts")).toEqual({
      highlight,
      twoslash,
    });
  });

  test("resolves an alias transitively", () => {
    const registry = resolve_registry({ ts: highlight, js: "ts", mjs: "js" });
    expect(registry.get("mjs")).toEqual({ highlight });
  });

  test("an alias cycle is a setup error naming the cycle", () => {
    expect(() => resolve_registry({ a: "b", b: "a" })).toThrow(
      "alias cycle in languages: a -> b -> a",
    );
  });

  test("an alias to nothing is a setup error", () => {
    expect(() => resolve_registry({ js: "ts" })).toThrow('languages.js aliases "ts"');
  });

  test("a default_language outside the registry is a setup error", () => {
    expect(() => resolve_registry({ ts: highlight }, "js")).toThrow('default_language "js"');
  });

  test("a value of the wrong shape is a setup error naming the entry", () => {
    expect(() => resolve_registry({ ts: 1 as never })).toThrow("languages.ts must be");
  });
});

describe("setup cost", () => {
  test("a registry is resolved once, not per fence", () => {
    let calls = 0;
    const counting = () => {
      calls++;
      return "<pre></pre>";
    };
    let resolutions = 0;
    const languages = {
      get ts() {
        resolutions++;
        return counting;
      },
    };
    const md = create_renderer({ languages });
    for (let i = 0; i < 200; i++) md.fence("ts", "", "a\n");
    expect(resolutions).toBe(1);
    expect(calls).toBe(200);
  });
});
