// fidelity matrix — verifies the `fidelity` option on every language's
// `create_language` factory correctly switches each category on/off.
//
// each row declares one (language × category × mechanism) triple. the
// harness below asserts four outcomes per row:
//
//   high        fidelity 'high' (and the default undefined) → rich token
//   low         fidelity 'low'                              → base token
//   allow_in    fidelity [<category>]                        → rich token
//   allow_out   fidelity [<other_category>]                  → base token
//
// the `mechanism` field labels whether the rich token comes from a tag-
// gated reclassifier (UPGRADE — grammar emits identifier, reclassifier
// promotes at high fidelity) or from the grammar itself (DOWNGRADE —
// grammar bakes the rich token; the core's GRAMMAR_EXTENSION_DOWNGRADES
// remaps it to identifier at low fidelity).

import { describe, expect, it } from "vitest";
import type { FidelitySpec, LanguageFactory } from "@twinkleplop/core";

import { tokenize as bash } from "@twinkleplop/bash";
import { tokenize as go } from "@twinkleplop/go";
import { tokenize as javascript } from "@twinkleplop/javascript";
import { tokenize as python } from "@twinkleplop/python";
import { tokenize as rust } from "@twinkleplop/rust";
import { tokenize as sql } from "@twinkleplop/sql";
import { tokenize as tsx } from "@twinkleplop/tsx";
import { tokenize as typescript } from "@twinkleplop/typescript";

type Mechanism = "upgrade" | "downgrade";

interface Row {
  language: LanguageFactory;
  lang_name: string;
  category: string;
  mechanism: Mechanism;
  source: string;
  // the exact source slice whose token we assert on.
  target: string;
  // expected token type under high fidelity (the "rich" label).
  rich: string;
  // expected token type under low fidelity (typically "identifier").
  base: string;
  // a known-other category to prove allowlist filtering excludes this row.
  other_category: string;
}

const rows: Row[] = [
  // ---------------------------------------------------------------------
  // JavaScript
  // ---------------------------------------------------------------------
  {
    language: javascript,
    lang_name: "javascript",
    category: "function",
    mechanism: "downgrade",
    source: "foo()",
    target: "foo",
    rich: "function",
    base: "identifier",
    other_category: "constant",
  },
  {
    language: javascript,
    lang_name: "javascript",
    category: "boolean",
    mechanism: "downgrade",
    source: "const ok = true;",
    target: "true",
    rich: "boolean",
    base: "identifier",
    other_category: "constant",
  },
  {
    language: javascript,
    lang_name: "javascript",
    category: "constant",
    mechanism: "upgrade",
    source: "const MAX_SIZE = 100;",
    target: "MAX_SIZE",
    rich: "constant",
    base: "identifier",
    other_category: "function",
  },
  {
    language: javascript,
    lang_name: "javascript",
    category: "class_name",
    mechanism: "upgrade",
    source: "class Foo {}",
    target: "Foo",
    rich: "class_name",
    base: "identifier",
    other_category: "function",
  },
  {
    language: javascript,
    lang_name: "javascript",
    category: "property",
    mechanism: "upgrade",
    source: "const o = { key: 1 };",
    target: "key",
    rich: "property",
    base: "identifier",
    other_category: "function",
  },
  {
    language: javascript,
    lang_name: "javascript",
    category: "namespace",
    mechanism: "upgrade",
    source: 'import * as React from "react";',
    target: "React",
    rich: "namespace",
    base: "identifier",
    other_category: "function",
  },
  {
    language: javascript,
    lang_name: "javascript",
    category: "parameter",
    mechanism: "upgrade",
    source: "function f(xparam) { return xparam; }",
    target: "xparam",
    rich: "parameter",
    base: "identifier",
    other_category: "function",
  },

  // ---------------------------------------------------------------------
  // TypeScript
  // ---------------------------------------------------------------------
  {
    language: typescript,
    lang_name: "typescript",
    category: "decorator",
    mechanism: "downgrade",
    source: "@Component\nclass A {}",
    target: "@Component",
    rich: "decorator",
    base: "identifier",
    other_category: "function",
  },
  {
    language: typescript,
    lang_name: "typescript",
    category: "type",
    mechanism: "upgrade",
    source: "let x: MyType = 1;",
    target: "MyType",
    rich: "type",
    base: "identifier",
    other_category: "function",
  },
  {
    language: typescript,
    lang_name: "typescript",
    category: "constant",
    mechanism: "upgrade",
    source: "const MAX_SIZE: number = 100;",
    target: "MAX_SIZE",
    rich: "constant",
    base: "identifier",
    other_category: "function",
  },
  {
    language: typescript,
    lang_name: "typescript",
    category: "namespace",
    mechanism: "upgrade",
    source: "namespace Utils { export const x = 1; }",
    target: "Utils",
    rich: "namespace",
    base: "identifier",
    other_category: "function",
  },
  {
    language: typescript,
    lang_name: "typescript",
    category: "parameter",
    mechanism: "upgrade",
    source: "function f(xparam: number) { return xparam; }",
    target: "xparam",
    rich: "parameter",
    base: "identifier",
    other_category: "function",
  },

  // ---------------------------------------------------------------------
  // TSX — inherits TS pipeline; smoke-test a couple of representative rows
  // ---------------------------------------------------------------------
  {
    language: tsx,
    lang_name: "tsx",
    category: "decorator",
    mechanism: "downgrade",
    source: "@Component\nclass A {}",
    target: "@Component",
    rich: "decorator",
    base: "identifier",
    other_category: "function",
  },
  {
    language: tsx,
    lang_name: "tsx",
    category: "parameter",
    mechanism: "upgrade",
    source: "function f(xparam: number) { return xparam; }",
    target: "xparam",
    rich: "parameter",
    base: "identifier",
    other_category: "function",
  },

  // ---------------------------------------------------------------------
  // Python
  // ---------------------------------------------------------------------
  {
    language: python,
    lang_name: "python",
    category: "boolean",
    mechanism: "upgrade",
    source: "x = True",
    target: "True",
    rich: "boolean",
    base: "identifier",
    other_category: "function",
  },
  {
    language: python,
    lang_name: "python",
    category: "builtin",
    mechanism: "upgrade",
    source: "x: int = 1",
    target: "int",
    rich: "builtin",
    base: "identifier",
    other_category: "function",
  },
  {
    language: python,
    lang_name: "python",
    category: "constant",
    mechanism: "upgrade",
    source: "MAX_BYTES = 1024",
    target: "MAX_BYTES",
    rich: "constant",
    base: "identifier",
    other_category: "function",
  },
  {
    language: python,
    lang_name: "python",
    category: "class_name",
    mechanism: "upgrade",
    source: "class MyClass: pass",
    target: "MyClass",
    rich: "class_name",
    base: "identifier",
    other_category: "function",
  },
  {
    language: python,
    lang_name: "python",
    category: "function",
    mechanism: "upgrade",
    source: "result = greet(world)",
    target: "greet",
    rich: "function",
    base: "identifier",
    other_category: "constant",
  },
  {
    language: python,
    lang_name: "python",
    category: "namespace",
    mechanism: "upgrade",
    source: "import math",
    target: "math",
    rich: "namespace",
    base: "identifier",
    other_category: "function",
  },
  {
    language: python,
    lang_name: "python",
    category: "parameter",
    mechanism: "upgrade",
    source: "def f(xparam): return xparam",
    target: "xparam",
    rich: "parameter",
    base: "identifier",
    other_category: "function",
  },

  // ---------------------------------------------------------------------
  // Rust
  // ---------------------------------------------------------------------
  {
    language: rust,
    lang_name: "rust",
    category: "boolean",
    mechanism: "upgrade",
    source: "let ok = true;",
    target: "true",
    rich: "boolean",
    base: "identifier",
    other_category: "function",
  },
  {
    language: rust,
    lang_name: "rust",
    category: "class_name",
    mechanism: "upgrade",
    source: "struct Foo { x: i32 }",
    target: "Foo",
    rich: "class_name",
    base: "identifier",
    other_category: "function",
  },
  {
    language: rust,
    lang_name: "rust",
    category: "constant",
    mechanism: "upgrade",
    source: "const MAX_SIZE: usize = 1024;",
    target: "MAX_SIZE",
    rich: "constant",
    base: "identifier",
    other_category: "function",
  },
  {
    language: rust,
    lang_name: "rust",
    category: "function",
    mechanism: "upgrade",
    source: "fn main() { foo(); }",
    target: "foo",
    rich: "function",
    base: "identifier",
    other_category: "constant",
  },
  {
    language: rust,
    lang_name: "rust",
    category: "namespace",
    mechanism: "upgrade",
    source: "use std::fs;",
    target: "std",
    rich: "namespace",
    base: "identifier",
    other_category: "function",
  },
  {
    language: rust,
    lang_name: "rust",
    category: "variant",
    mechanism: "upgrade",
    source: "let x = Color::Red;",
    target: "Red",
    rich: "variant",
    base: "identifier",
    other_category: "function",
  },
  {
    language: rust,
    lang_name: "rust",
    category: "parameter",
    mechanism: "upgrade",
    source: "fn f(xparam: i32) {}",
    target: "xparam",
    rich: "parameter",
    base: "identifier",
    other_category: "function",
  },

  // ---------------------------------------------------------------------
  // Go
  // ---------------------------------------------------------------------
  {
    language: go,
    lang_name: "go",
    category: "function",
    mechanism: "downgrade",
    source: "func demo() { _ = len(xs); }",
    target: "len",
    rich: "function",
    base: "identifier",
    other_category: "constant",
  },
  {
    language: go,
    lang_name: "go",
    category: "boolean",
    mechanism: "downgrade",
    source: "var ok = true",
    target: "true",
    rich: "boolean",
    base: "identifier",
    other_category: "constant",
  },
  {
    language: go,
    lang_name: "go",
    category: "constant",
    mechanism: "upgrade",
    source: "const MAX_SIZE = 1024",
    target: "MAX_SIZE",
    rich: "constant",
    base: "identifier",
    other_category: "function",
  },
  {
    language: go,
    lang_name: "go",
    category: "namespace",
    mechanism: "upgrade",
    source: "package main",
    target: "main",
    rich: "namespace",
    base: "identifier",
    other_category: "function",
  },
  {
    language: go,
    lang_name: "go",
    category: "parameter",
    mechanism: "upgrade",
    source: "func f(xparam int) int { return xparam }",
    target: "xparam",
    rich: "parameter",
    base: "identifier",
    other_category: "function",
  },

  // ---------------------------------------------------------------------
  // Bash
  // ---------------------------------------------------------------------
  {
    language: bash,
    lang_name: "bash",
    category: "function",
    mechanism: "upgrade",
    source: "myfunc() { echo ok; }",
    target: "myfunc",
    rich: "function",
    base: "identifier",
    other_category: "keyword",
  },

  // ---------------------------------------------------------------------
  // SQL
  // ---------------------------------------------------------------------
  {
    language: sql,
    lang_name: "sql",
    category: "function",
    mechanism: "upgrade",
    source: "SELECT mycount(*) FROM t",
    target: "mycount",
    rich: "function",
    base: "identifier",
    other_category: "keyword",
  },
];

function type_of(lang: ReturnType<LanguageFactory>, source: string, target: string) {
  const result = lang(source);
  for (let i = 0; i < result.tokens.length / 3; i++) {
    const s = result.tokens[i * 3 + 1];
    const e = result.tokens[i * 3 + 2];
    if (source.slice(s, e) === target) {
      return result.token_types[result.tokens[i * 3]];
    }
  }
  return undefined;
}

function expect_token(
  factory: LanguageFactory,
  source: string,
  target: string,
  expected: string,
  fidelity?: FidelitySpec,
) {
  const lang = factory(fidelity ? { fidelity } : undefined);
  const actual = type_of(lang, source, target);
  expect(
    actual,
    `\`${target}\` in ${JSON.stringify(source)} (fidelity=${JSON.stringify(fidelity)})`,
  ).toBe(expected);
}

// regressions for a UI bug where deselecting one category silently
// flipped the tokenisation of another. verify that disabling `constant`
// leaves UPPER_SNAKE names as identifier and that disabling `class_name`
// does NOT disturb constants.
describe("fidelity isolation — deselecting one category does not affect others", () => {
  const src = "const MAX_SIZE = 100;";
  function first_type(factory: LanguageFactory, fidelity: FidelitySpec, target: string) {
    const lang = factory({ fidelity });
    const result = lang(src);
    for (let i = 0; i < result.tokens.length / 3; i++) {
      const s = result.tokens[i * 3 + 1];
      const e = result.tokens[i * 3 + 2];
      if (src.slice(s, e) === target) {
        return result.token_types[result.tokens[i * 3]];
      }
    }
    return undefined;
  }
  const js_all = [
    "boolean",
    "function",
    "constant",
    "class_name",
    "property",
    "namespace",
    "parameter",
  ];
  it("JS: disabling only `constant` leaves MAX_SIZE as identifier", () => {
    const without_constant = js_all.filter((c) => c !== "constant");
    expect(first_type(javascript, without_constant, "MAX_SIZE")).toBe("identifier");
  });
  it("JS: disabling only `class_name` keeps MAX_SIZE as constant", () => {
    const without_class = js_all.filter((c) => c !== "class_name");
    expect(first_type(javascript, without_class, "MAX_SIZE")).toBe("constant");
  });
  it("JS: all categories enabled → MAX_SIZE is constant", () => {
    expect(first_type(javascript, js_all, "MAX_SIZE")).toBe("constant");
  });
});

describe("fidelity matrix", () => {
  for (const row of rows) {
    describe(`${row.lang_name} / ${row.category} (${row.mechanism})`, () => {
      it("high → rich", () => {
        expect_token(row.language, row.source, row.target, row.rich, "high");
      });
      it("undefined → rich (default is high)", () => {
        expect_token(row.language, row.source, row.target, row.rich);
      });
      it("low → base", () => {
        expect_token(row.language, row.source, row.target, row.base, "low");
      });
      it("allowlist [category] → rich", () => {
        expect_token(row.language, row.source, row.target, row.rich, [row.category]);
      });
      it("allowlist [other] → base", () => {
        expect_token(row.language, row.source, row.target, row.base, [row.other_category]);
      });
    });
  }
});
