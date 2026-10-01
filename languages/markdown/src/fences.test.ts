import { describe, expect, it } from "vitest";
import type { LanguageFn, TokenizeResult } from "@twinkleplop/core";
import { tokenize as css_tokenize } from "@twinkleplop/css";
import { tokenize as js_tokenize } from "@twinkleplop/javascript";
import { tokenize as yaml_tokenize } from "@twinkleplop/yaml";
import { language, tokenize } from "./index.js";

const js = js_tokenize();
const css = css_tokenize();
const yaml = yaml_tokenize();

function named(input: string, result: TokenizeResult) {
  const out: [string, string][] = [];
  for (let i = 0; i < result.tokens.length / 3; i++) {
    const start = result.tokens[i * 3 + 1];
    const end = result.tokens[i * 3 + 2];
    out.push([result.token_types[result.tokens[i * 3]], input.slice(start, end)]);
  }
  return out;
}

describe("fenced code embedding", () => {
  it("splices the named language into a fence body at global positions", () => {
    const input = "# Title\n\n```js\nconst x = 1;\n```\n";
    const result = tokenize({ languages: { js } })(input);
    const body = "const x = 1;";

    expect(named(input, result)).toEqual([
      ["heading_marker", "#"],
      ["heading", " Title"],
      ["code_fence", "```"],
      ["code_language", "js"],
      ...named(body, js(body)),
      ["code_fence", "```\n"],
    ]);
  });

  it("uses the first word of the info string and handles tilde fences", () => {
    const input = '~~~ css title="a.css"\na { color: red }\n~~~\n';
    const tokens = named(input, tokenize({ languages: { css } })(input));
    const body = "a { color: red }";
    expect(tokens.slice(2, -1)).toEqual(named(body, css(body)));
  });

  it("highlights every fence with its own language", () => {
    const input = "```js\nlet a\n```\n\n```css\nb {}\n```\n\n```js\nlet c\n```\n";
    const tokens = named(input, tokenize({ languages: { js, css } })(input));
    expect(tokens.filter(([type]) => type === "raw_code_block")).toEqual([]);
    expect(tokens.filter(([, text]) => text === "let")).toHaveLength(2);
  });

  it("leaves fences with no info string or an unknown language as raw code", () => {
    const input = "```\nplain\n```\n\n```rust\nfn main() {}\n```\n";
    const tokens = named(input, tokenize({ languages: { js } })(input));
    expect(tokens).toEqual(named(input, tokenize()(input)));
    expect(tokens).toContainEqual(["raw_code_block", "\nplain\n"]);
  });

  it("does not look up prototype keys", () => {
    const input = "```constructor\nx\n```\n";
    const tokens = named(input, tokenize({ languages: { js } })(input));
    expect(tokens).toContainEqual(["raw_code_block", "\nx\n"]);
  });

  it("skips an empty fence and survives an unclosed one", () => {
    const empty = "```js\n```\n";
    expect(named(empty, tokenize({ languages: { js } })(empty))).toEqual(
      named(empty, tokenize()(empty)),
    );
    const open = "```js\nlet a = 1\n";
    const tokens = named(open, tokenize({ languages: { js } })(open));
    expect(tokens.slice(2)).toEqual(named("let a = 1", js("let a = 1")));
  });

  it("feeds the language whole lines when the document uses crlf", () => {
    const seen: string[] = [];
    const spy: LanguageFn = (src) => {
      seen.push(src);
      return js(src);
    };
    const input = "```js\r\nlet a\r\nlet b\r\n```\r\n";
    tokenize({ languages: { js: spy } })(input);
    expect(seen).toEqual(["let a\r\nlet b"]);
  });

  it("renders embedded tokens through language()", () => {
    const html = language({ languages: { js } })("```js\nconst x = 1;\n```\n");
    expect(html).toContain('<span class="tok keyword">const</span>');
  });
});

describe("front matter embedding", () => {
  const input = "---\ntitle: Hello\ntags: [a, b]\n---\n\n```js\nlet a\n```\n";

  it("highlights front matter and leaves fences raw without languages", () => {
    const tokens = named(input, tokenize({ front_matter: yaml })(input));
    const body = "title: Hello\ntags: [a, b]";
    expect(tokens.slice(0, -4)).toEqual([
      ["front_matter_marker", "---\n"],
      ...named(body, yaml(body)),
      ["front_matter_marker", "\n---\n"],
    ]);
    expect(tokens).toContainEqual(["raw_code_block", "\nlet a\n"]);
  });

  it("composes with fence languages", () => {
    const tokens = named(input, tokenize({ front_matter: yaml, languages: { js } })(input));
    expect(tokens.filter(([type]) => type.startsWith("raw_"))).toEqual([]);
  });

  it("leaves a document without front matter alone", () => {
    const plain = "# Title\n\ntitle: not front matter\n";
    expect(named(plain, tokenize({ front_matter: yaml })(plain))).toEqual(
      named(plain, tokenize()(plain)),
    );
  });
});
