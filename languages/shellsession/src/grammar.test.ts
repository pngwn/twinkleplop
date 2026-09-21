import { describe, it, expect, test } from "vitest";
import { tokenize } from "@twinkleplop/core";
import { verify } from "@twinkleplop/core/compile";
import { grammar, raw_grammar } from "./index.js";
import fs from "node:fs";
import path from "node:path";

const test_path = path.join(import.meta.dirname, "..", "test");
const test_files = fs.readdirSync(test_path);

const input_files = test_files
  .filter((file) => file.endsWith(".sh-session"))
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
  const result = tokenize(input, grammar);
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

function pairs(input: string) {
  return get_tokens(input).map((t) => [t.type, t.match]);
}

describe("Shell Session Grammar", () => {
  test("verify", () => {
    const issues = verify(raw_grammar);
    expect(issues).toEqual([]);
  });

  for (let i = 0; i < input_files.length; i++) {
    const test_name = input_files[i][0].replace(".sh-session", "");
    it(`should tokenize ${test_name}`, () => {
      const tokens = get_tokens(input_files[i][1]);
      expect(tokens).toEqual(output_files[i][1]);
    });
  }
});

describe("prompt boundaries", () => {
  it("ends the prompt at the leftmost symbol that follows a complete prefix", () => {
    expect(pairs("user@host:~$ cat > f")).toEqual([
      ["prompt_prefix", "user@host:~"],
      ["prompt", "$"],
      ["raw_shell", "cat > f"],
    ]);
    expect(pairs("root@host:~# ls # note")).toEqual([
      ["prompt_prefix", "root@host:~"],
      ["prompt", "#"],
      ["raw_shell", "ls # note"],
    ]);
  });

  it("skips a symbol inside a bracketed prefix that has not closed", () => {
    expect(pairs("[user@host $ dir] $ ls")).toEqual([
      ["prompt_prefix", "[user@host $ dir] "],
      ["prompt", "$"],
      ["raw_shell", "ls"],
    ]);
  });

  it("treats a symbol followed by text as prefix text", () => {
    expect(pairs("user@host:~$x@y $ ls")).toEqual([
      ["prompt_prefix", "user@host:~$x@y "],
      ["prompt", "$"],
      ["raw_shell", "ls"],
    ]);
  });

  it("accepts a prompt symbol at the end of the input", () => {
    expect(pairs("$")).toEqual([["prompt", "$"]]);
    expect(pairs("user@host:~$")).toEqual([
      ["prompt_prefix", "user@host:~"],
      ["prompt", "$"],
    ]);
    expect(pairs("out\nλ")).toEqual([
      ["output", "out"],
      ["prompt", "λ"],
    ]);
  });

  it("recognizes a bare virtualenv and the bash default prompt", () => {
    expect(pairs("(venv) $ ls")).toEqual([
      ["prompt_prefix", "(venv) "],
      ["prompt", "$"],
      ["raw_shell", "ls"],
    ]);
    expect(pairs("bash-5.2# ls")).toEqual([
      ["prompt_prefix", "bash-5.2"],
      ["prompt", "#"],
      ["raw_shell", "ls"],
    ]);
  });

  it("keeps the gap between the symbol and the command unscoped", () => {
    const tokens = get_tokens(">     make");
    expect(tokens.map((t) => [t.type, t.start, t.end])).toEqual([
      ["prompt", 0, 1],
      ["raw_shell", 6, 10],
    ]);
  });
});

describe("output lines", () => {
  it.each([
    ["$ls"],
    ["  $ ls"],
    ["$$ ls"],
    ["#!/bin/bash"],
    ["host% make"],
    ["shell$ ls"],
    ["50% done"],
    ["Done:100%x"],
    ["bash foo $ ls"],
    ["user@host ~ word $ ls"],
    ["if you see this"],
    ["🍺  installed"],
  ])("%s", (line) => {
    expect(pairs(line)).toEqual([["output", line]]);
  });

  it("emits nothing for a blank line and output for a whitespace-only one", () => {
    expect(pairs("a\n\nb")).toEqual([
      ["output", "a"],
      ["output", "b"],
    ]);
    expect(pairs("a\n \nb")).toEqual([
      ["output", "a"],
      ["output", " "],
      ["output", "b"],
    ]);
  });
});

describe("line endings", () => {
  it("keeps carriage returns out of every token", () => {
    expect(pairs("$ ls\r\nout\r\nuser@host:~$\r\n\r\n$ pwd")).toEqual([
      ["prompt", "$"],
      ["raw_shell", "ls"],
      ["output", "out"],
      ["prompt_prefix", "user@host:~"],
      ["prompt", "$"],
      ["prompt", "$"],
      ["raw_shell", "pwd"],
    ]);
  });

  it("stays correct over thousands of lines", () => {
    const block = '(venv) user@host:~/src$ echo "hi"\nhi\n[root@box ~]# ls\n> more\n';
    const input = block.repeat(2000) + "❯ done";
    const tokens = pairs(input);
    expect(tokens.slice(-2)).toEqual([
      ["prompt", "❯"],
      ["raw_shell", "done"],
    ]);
    expect(tokens.filter(([type]) => type === "prompt")).toHaveLength(2000 * 3 + 1);
  });
});
