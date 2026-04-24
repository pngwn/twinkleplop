// Python reclassifier rules.
//
// The base grammar emits every identifier-family token as `identifier`.
// Restoration passes layer the distinctions back on top:
//
//   - boolean   — "True" / "False" (before PascalCase — uppercase-first)
//   - builtin   — BUILTIN_TYPES word set (all lowercase)
//   - class_name — remaining PascalCase identifiers
//   - function  — identifier followed by `(...)`, excluding class_name and
//     builtin so constructors and built-in callables keep their own colour
//
// Plus one correctness pass:
//
//   - type_alias_rules — PEP 695 soft-keyword `type` at the start of a type
//     alias statement becomes `keyword`. Same text can be a builtin class
//     (`type(x)`) or a soft keyword (`type Vec[T] = list[T]`); lookahead
//     disambiguates.

import {
  always,
  any_of,
  balanced_parens,
  make_token_view,
  optional,
  promote_by_text_set,
  promote_by_upper_snake_case,
  promote_function_calls,
  promote_pascal_case,
  rewrite_types,
  seq,
  tag,
  type,
} from "@twinkleplop/core";
import type { LanguagePipeline, Reclassifier } from "@twinkleplop/core";

import { BOOLEAN_LITERALS, BUILTIN_TYPES } from "./grammar.js";

// restoration. order matters: boolean promotion runs before PascalCase so
// "True" / "False" (which start with uppercase) are classified as boolean
// before promote_pascal_case would otherwise tag them class_name.
export const promote_python_booleans: Reclassifier = promote_by_text_set(
  "identifier",
  "boolean",
  BOOLEAN_LITERALS,
);

export const promote_python_builtins: Reclassifier = promote_by_text_set(
  "identifier",
  "builtin",
  BUILTIN_TYPES,
);

export const promote_python_pascal_case: Reclassifier = promote_pascal_case(
  "identifier",
  "class_name",
);

// PEP 8 reserves UPPER_SNAKE_CASE for module-level constants. runs before
// pascal_case so multi-char all-upper names (`MAX_VALUE`) are constants
// rather than class_names.
export const promote_python_constants: Reclassifier = promote_by_upper_snake_case(
  "identifier",
  "constant",
);

export const type_alias_rules = [
  {
    anchor: type("builtin", "type"),
    when: seq(
      // the alias name. PascalCase by convention (`type Vec = ...`) so
      // usually class_name; lowercase aliases (`type my_alias = ...`)
      // are accepted too.
      any_of(type("class_name"), type("identifier")),
      // optional pep 695 generic parameter list: `type Vec[T, U] = ...`
      optional(balanced_parens("[", "]")),
      // the `=` that ends the alias header.
      type("operator", "="),
    ),
    rewrite: "keyword",
  },
];

export const promote_python_function_calls: Reclassifier = promote_function_calls(
  "identifier",
  "function",
  { plain: true },
  { trivia: ["comment"] },
);

// parameter promotion: walk `def name(...)` and `lambda ... :` and tag
// parameter-position identifiers as `parameter`. scope is the outermost
// paren group after `def name`, or everything between `lambda` and the
// first top-level `:`. destructuring / annotation / default-value edge
// cases are simplified to "first identifier after `(`, `,`, or `*` /
// `**` at depth 1" — misses some patterns but avoids false positives.
export const promote_python_parameters: Reclassifier = (input, result) => {
  const { tokens, token_types } = result;
  const identifier_id = token_types.indexOf("identifier");
  const keyword_id = token_types.indexOf("keyword");
  const punctuation_id = token_types.indexOf("punctuation");
  const operator_id = token_types.indexOf("operator");
  if (identifier_id < 0 || keyword_id < 0 || punctuation_id < 0) {
    return result;
  }
  let parameter_id = token_types.indexOf("parameter");
  if (parameter_id < 0) {
    parameter_id = token_types.length;
    token_types.push("parameter");
  }
  const view = make_token_view(input, tokens, token_types);
  const n = view.count;

  const promote_params_in_parens = (open_idx: number): number => {
    let depth = 1;
    let expect_param = true;
    let j = open_idx + 1;
    while (j < n && depth > 0) {
      if (view.is_trivia(j)) {
        j++;
        continue;
      }
      const k = view.kind_of(j);
      const t = view.text_of(j);
      if (k === punctuation_id) {
        for (const ch of t) {
          if (ch === "(" || ch === "[") depth++;
          else if (ch === ")" || ch === "]") {
            depth--;
            if (depth === 0) return j + 1;
          } else if (ch === "," && depth === 1) {
            expect_param = true;
          }
        }
        j++;
        continue;
      }
      if (depth === 1 && expect_param && k === identifier_id) {
        tokens[j * 3] = parameter_id;
        expect_param = false;
      } else if (!(k === operator_id && (t === "*" || t === "**"))) {
        // anything except `*` / `**` retires the expect_param state;
        // those markers precede the named parameter they annotate.
        expect_param = false;
      }
      j++;
    }
    return j;
  };

  for (let i = 0; i < n; i++) {
    if (view.is_trivia(i)) continue;
    if (view.kind_of(i) !== keyword_id) continue;
    const kw = view.text_of(i);

    if (kw === "def") {
      let j = view.next_non_trivia(i + 1);
      if (j < 0 || view.kind_of(j) !== identifier_id) continue;
      j = view.next_non_trivia(j + 1);
      if (j < 0 || view.kind_of(j) !== punctuation_id || !view.text_of(j).startsWith("(")) {
        continue;
      }
      i = promote_params_in_parens(j) - 1;
      continue;
    }

    if (kw === "lambda") {
      let expect_param = true;
      let j = view.next_non_trivia(i + 1);
      while (j < n) {
        if (view.is_trivia(j)) {
          j++;
          continue;
        }
        const k = view.kind_of(j);
        const t = view.text_of(j);
        if (k === operator_id && t === ":") break;
        if (k === punctuation_id && (t === "," || t === "(" || t === ")")) {
          if (t === ",") expect_param = true;
          j++;
          continue;
        }
        if (k === identifier_id && expect_param) {
          tokens[j * 3] = parameter_id;
          expect_param = false;
        }
        j++;
      }
      i = j;
    }
  }

  return { tokens, token_types };
};

// namespace promotion: walk `import X` and `from X import ...` statements
// and tag the module-path identifiers (plus `as`-aliases) as `namespace`.
// purely lexical — no scope tracking — so only declaration sites are
// promoted. use-site names like `math.pi` stay as identifier.
export const promote_python_namespaces: Reclassifier = (input, result) => {
  const { tokens, token_types } = result;
  const identifier_id = token_types.indexOf("identifier");
  const keyword_id = token_types.indexOf("keyword");
  const punctuation_id = token_types.indexOf("punctuation");
  if (identifier_id < 0 || keyword_id < 0 || punctuation_id < 0) {
    return result;
  }
  let namespace_id = token_types.indexOf("namespace");
  if (namespace_id < 0) {
    namespace_id = token_types.length;
    token_types.push("namespace");
  }
  const view = make_token_view(input, tokens, token_types);
  const n = view.count;

  // promote a chain `a.b.c` of identifiers + dots starting at `from`. stops
  // at first non-identifier/non-dot, returns the index of the stop token.
  const promote_chain = (from: number): number => {
    let j = from;
    while (j >= 0 && j < n) {
      if (view.is_trivia(j)) {
        j++;
        continue;
      }
      const k = view.kind_of(j);
      if (k === identifier_id) {
        tokens[j * 3] = namespace_id;
        j++;
        continue;
      }
      if (k === punctuation_id && view.text_of(j) === ".") {
        j++;
        continue;
      }
      break;
    }
    return j;
  };

  for (let i = 0; i < n; i++) {
    if (view.is_trivia(i)) continue;
    if (view.kind_of(i) !== keyword_id) continue;
    const kw = view.text_of(i);

    if (kw === "import") {
      // `import a.b, c as x` — promote every chain, including aliases
      // after `as`, separated by `,` at the top level.
      let j = view.next_non_trivia(i + 1);
      while (j >= 0 && j < n) {
        j = promote_chain(j);
        j = view.next_non_trivia(j);
        if (j < 0) break;
        // `as alias` — promote the alias as a namespace.
        if (view.kind_of(j) === keyword_id && view.text_of(j) === "as") {
          j = view.next_non_trivia(j + 1);
          if (j >= 0 && view.kind_of(j) === identifier_id) {
            tokens[j * 3] = namespace_id;
            j = view.next_non_trivia(j + 1);
          }
        }
        // `,` — continue to next chain.
        if (j >= 0 && view.kind_of(j) === punctuation_id && view.text_of(j) === ",") {
          j = view.next_non_trivia(j + 1);
          continue;
        }
        break;
      }
      continue;
    }

    if (kw === "from") {
      // `from a.b import c` — promote the chain, stop at `import`.
      let j = view.next_non_trivia(i + 1);
      j = promote_chain(j);
      // advance the outer loop past the trailing `import` keyword so
      // it isn't re-entered as a bare import statement (which would
      // wrongly promote the imported names).
      if (j >= 0 && view.kind_of(j) === keyword_id && view.text_of(j) === "import") {
        i = j;
      }
      continue;
    }
  }

  return { tokens, token_types };
};

// type_alias_rules disambiguates PEP 695 soft-keyword `type` — a correctness
// pass that should fire at every fidelity. the remaining restorations are
// fidelity-gated by the target token type they produce.
export const reclassifiers: LanguagePipeline = [
  tag(promote_python_booleans, ["boolean"]),
  tag(promote_python_builtins, ["builtin"]),
  tag(promote_python_constants, ["constant"]),
  tag(promote_python_pascal_case, ["class_name"]),
  always(rewrite_types(type_alias_rules, { trivia: ["comment"] }), "type_claim"),
  tag(promote_python_namespaces, ["namespace"]),
  tag(promote_python_parameters, ["parameter"]),
  tag(promote_python_function_calls, ["function"]),
];
