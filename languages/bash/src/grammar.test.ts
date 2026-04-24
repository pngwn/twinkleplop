import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, test } from "vitest";
import { verify } from "@twinkleplop/core/compile";
import { language as make_language, raw_grammar } from "./index.js";

const language = make_language();

const test_path = path.join(import.meta.dirname, "..", "test");
const test_files = fs.readdirSync(test_path);

const input_files = test_files
  .filter((file) => file.endsWith(".sh"))
  .map((file) => [file, fs.readFileSync(path.join(test_path, file), "utf-8")]);

const output_modules = import.meta.glob("../test/*.js", {
  eager: true,
}) as Record<string, { test: string }>;

const output_files = Object.entries(output_modules)
  .filter((module) => !module[0].includes("index.js"))
  .map((module) => [path.basename(module[0]), module[1].test]);

input_files.sort((a, b) => a[0].localeCompare(b[0]));
output_files.sort((a, b) => a[0].localeCompare(b[0]));

function get_tokens(input: string) {
  const result = language(input);
  const tokens = [];
  for (let i = 0; i < result.tokens.length / 3; i++) {
    const type = result.token_types[result.tokens[i * 3]];
    const start = result.tokens[i * 3 + 1];
    const end = result.tokens[i * 3 + 2];
    const match = input.substring(start, end);
    tokens.push({ type, start, end, match });
  }
  return tokens;
}

describe("Bash Grammar", () => {
  test("verify", () => {
    const issues = verify(raw_grammar);
    expect(issues).toEqual([]);
  });

  for (let i = 0; i < input_files.length; i++) {
    const test_name = input_files[i][0].replace(".sh", "");
    it(`should tokenize ${test_name}`, () => {
      const tokens = get_tokens(input_files[i][1]);
      expect(tokens).toEqual(output_files[i][1]);
    });
  }
});

describe("Bash fidelity — function-call promotion", () => {
  function tokens_of(input: string, options?: Parameters<typeof make_language>[0]) {
    const lang = make_language(options);
    const result = lang(input);
    const out: { type: string; value: string }[] = [];
    for (let i = 0; i < result.tokens.length / 3; i++) {
      out.push({
        type: result.token_types[result.tokens[i * 3]],
        value: input.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2]),
      });
    }
    return out;
  }
  const pick = (tokens: ReturnType<typeof tokens_of>, value: string): string | undefined =>
    tokens.find((t) => t.value === value)?.type;

  it("function definition `name()` promotes name to function", () => {
    const tokens = tokens_of("log_error() { echo bad; }");
    expect(pick(tokens, "log_error")).toBe("function");
  });

  it("plain command call stays identifier (no parens)", () => {
    // shell call sites don't require parens; `ls` here is a plain
    // identifier, not a parenthesized call.
    const tokens = tokens_of("ls -la");
    expect(pick(tokens, "ls")).toBe("identifier");
  });

  it("reserved word in front of `(` is not promoted (keyword wins first)", () => {
    // `if` as an identifier would be caught by promote_keywords first,
    // so it's already a `keyword` token by the time function_calls runs.
    const tokens = tokens_of("if (x); then echo y; fi");
    expect(pick(tokens, "if")).toBe("keyword");
  });

  it("fidelity='low' leaves function definition as identifier", () => {
    const tokens = tokens_of("log_error() { echo bad; }", {
      fidelity: "low",
    });
    expect(pick(tokens, "log_error")).toBe("identifier");
  });

  it("fidelity allowlist excluding 'function' leaves as identifier", () => {
    const tokens = tokens_of("log_error() { echo bad; }", {
      fidelity: ["keyword"],
    });
    expect(pick(tokens, "log_error")).toBe("identifier");
  });
});
