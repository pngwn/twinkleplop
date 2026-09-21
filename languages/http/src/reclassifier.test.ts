import { describe, it, expect } from "vitest";
import { tokenize as make_language } from "./index.js";

const language = make_language();

function tokens_of(src: string) {
  const result = language(src);
  const out = [];
  for (let i = 0; i < result.tokens.length / 3; i++) {
    out.push({
      type: result.token_types[result.tokens[i * 3]],
      value: src.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2]),
      start: result.tokens[i * 3 + 1],
      end: result.tokens[i * 3 + 2],
    });
  }
  return out;
}

function pairs(src: string) {
  return tokens_of(src).map((t) => [t.value, t.type]);
}

describe("body embedding", () => {
  it("leaves no raw placeholders behind", () => {
    const src = [
      "POST /x",
      "",
      '{"a": "{{b}}"}',
      "",
      "###",
      "POST /y",
      "",
      "<a>{{c}}</a>",
      "",
      "> {% client.log(1) %}",
      "",
      "###",
      "curl https://example.com",
      "",
    ].join("\n");
    const types = new Set(tokens_of(src).map((t) => t.type));
    for (const raw of ["raw_json", "raw_markup", "raw_script", "raw_shell"]) {
      expect(types.has(raw)).toBe(false);
    }
  });

  it("keeps a JSON string intact around a variable hole", () => {
    const src = 'POST /x\n\n{"when": "{{$datetime iso8601}}", "n": 1}\n';
    expect(pairs(src).slice(2)).toEqual([
      ["{", "punctuation"],
      ['"when"', "string"],
      [":", "punctuation"],
      ['"', "string"],
      ["{{", "punctuation"],
      ["$datetime", "builtin"],
      ["iso8601", "string"],
      ["}}", "punctuation"],
      ['"', "string"],
      [",", "punctuation"],
      ['"n"', "string"],
      [":", "punctuation"],
      ["1", "number"],
      ["}", "punctuation"],
    ]);
  });

  it("tokenizes JSON on both sides of a comment line as one document", () => {
    const src = 'POST /x\n\n{\n  // note\n  "a": true\n}\n';
    expect(pairs(src).slice(2)).toEqual([
      ["{", "punctuation"],
      ["// note", "comment"],
      ['"a"', "string"],
      [":", "punctuation"],
      ["true", "boolean"],
      ["}", "punctuation"],
    ]);
  });

  it("embeds markup bodies with variables in attribute values", () => {
    const src = 'POST /x\n\n<item id="{{id}}">ok</item>\n';
    const tokens = pairs(src);
    expect(tokens).toContainEqual(["item", "tag_name"]);
    expect(tokens).toContainEqual(["id", "attr_name"]);
    expect(tokens).toContainEqual(["{{", "punctuation"]);
    expect(tokens).toContainEqual(["id", "variable"]);
  });

  it("ends a body group at the request separator", () => {
    const src = 'POST /a\n\n{"a": 1}\n###\nPOST /b\n\n{"b": 2}\n';
    const tokens = tokens_of(src);
    const sep = tokens.find((t) => t.value === "###");
    expect(sep?.type).toBe("comment");
    expect(tokens.find((t) => t.value === "POST" && t.start > sep!.start)?.type).toBe("keyword");
    expect(tokens.find((t) => t.value === '"b"')?.type).toBe("string");
  });

  it("does not pull a response handler into the JSON body", () => {
    const src = 'POST /a\n\n{"a": 1}\n\n> {% client.global.set("a", 1); %}\n';
    const tokens = pairs(src);
    expect(tokens).toContainEqual(["> ", "operator"]);
    expect(tokens).toContainEqual(["set", "function"]);
    expect(tokens).toContainEqual(["%}", "punctuation"]);
  });
});

describe("script and shell embedding", () => {
  it("tokenizes a pre-request script as JavaScript", () => {
    const src = '< {%\n  request.variables.set("ts", Date.now());\n%}\nGET /x\n';
    const tokens = pairs(src);
    expect(tokens).toContainEqual(['"ts"', "string"]);
    expect(tokens).toContainEqual(["GET", "keyword"]);
  });

  it("tokenizes a curl request as shell", () => {
    const src = "curl -X POST https://example.com \\\n  -H 'Accept: */*'\n";
    const tokens = pairs(src);
    // bash tags command names as identifiers
    expect(tokens[0]).toEqual(["curl", "identifier"]);
    expect(tokens).toContainEqual(["'Accept: */*'", "string"]);
  });
});
