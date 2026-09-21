import { describe, it, expect } from "vitest";
import { tokenize } from "./index.js";

const run = tokenize();

function pairs(input: string, fn = run) {
  const result = fn(input);
  const out: [string, string][] = [];
  for (let i = 0; i < result.tokens.length / 3; i++) {
    out.push([
      result.token_types[result.tokens[i * 3]],
      input.slice(result.tokens[i * 3 + 1], result.tokens[i * 3 + 2]),
    ]);
  }
  return out;
}

describe("bash embedding", () => {
  it("tokenizes the command as bash and leaves prompts and output alone", () => {
    expect(pairs('user@host:~$ echo "hi $USER"\nhi pngwn')).toEqual([
      ["prompt_prefix", "user@host:~"],
      ["prompt", "$"],
      ["builtin", "echo"],
      ["string", '"hi '],
      ["variable", "$USER"],
      ["string", '"'],
      ["output", "hi pngwn"],
    ]);
  });

  it("embeds at every fidelity", () => {
    const low = tokenize({ fidelity: "low" });
    expect(pairs("$ echo hi", low)).toEqual([
      ["prompt", "$"],
      ["builtin", "echo"],
      ["identifier", "hi"],
    ]);
  });

  it("ends a trailing comment at the end of its line", () => {
    expect(pairs("$ ls # list\n> echo hi")).toEqual([
      ["prompt", "$"],
      ["identifier", "ls"],
      ["comment", "# list\n"],
      ["prompt", ">"],
      ["builtin", "echo"],
      ["identifier", "hi"],
    ]);
  });
});

describe("continuation lines", () => {
  it("continues a quoted string over a `> ` line", () => {
    expect(pairs("$ echo 'All\n> done!'\nAll\ndone!")).toEqual([
      ["prompt", "$"],
      ["builtin", "echo"],
      ["string", "'All\n"],
      ["prompt", ">"],
      ["string", "done!'"],
      ["output", "All"],
      ["output", "done!"],
    ]);
  });

  it("continues over zsh PS2 prompts, including multi-word ones", () => {
    expect(pairs('% echo "a\ndquote> b\nfor dquote> c"')).toEqual([
      ["prompt", "%"],
      ["builtin", "echo"],
      ["string", '"a\n'],
      ["prompt_prefix", "dquote"],
      ["prompt", ">"],
      ["string", "b\n"],
      ["prompt_prefix", "for "],
      ["prompt_prefix", "dquote"],
      ["prompt", ">"],
      ["string", 'c"'],
    ]);
  });

  it("keeps the line break of an empty continuation line", () => {
    expect(pairs('$ echo "a\n>\n> b"')).toEqual([
      ["prompt", "$"],
      ["builtin", "echo"],
      ["string", '"a\n'],
      ["prompt", ">"],
      ["string", "\n"],
      ["prompt", ">"],
      ["string", 'b"'],
    ]);
  });

  it("joins backslash-newline continuations", () => {
    expect(pairs("# dnf install \\\n>     git")).toEqual([
      ["prompt", "#"],
      ["identifier", "dnf"],
      ["identifier", "install"],
      ["operator", "\\\n"],
      ["prompt", ">"],
      ["identifier", "git"],
    ]);
  });

  it("starts a new program at a primary prompt", () => {
    expect(pairs('$ echo "a\n$ echo b')).toEqual([
      ["prompt", "$"],
      ["builtin", "echo"],
      ["string", '"a\n'],
      ["prompt", "$"],
      ["builtin", "echo"],
      ["identifier", "b"],
    ]);
  });

  it("does not treat a fish prompt ending in `>` as a continuation", () => {
    expect(pairs('$ echo "a\nuser@host ~> echo b')).toEqual([
      ["prompt", "$"],
      ["builtin", "echo"],
      ["string", '"a\n'],
      ["prompt_prefix", "user@host ~"],
      ["prompt", ">"],
      ["builtin", "echo"],
      ["identifier", "b"],
    ]);
  });

  it("does not join across an output line", () => {
    expect(pairs('$ echo "a\nout\n> echo b')).toEqual([
      ["prompt", "$"],
      ["builtin", "echo"],
      ["string", '"a\n'],
      ["output", "out"],
      ["prompt", ">"],
      ["builtin", "echo"],
      ["identifier", "b"],
    ]);
  });
});
