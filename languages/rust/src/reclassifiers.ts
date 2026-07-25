// Rust reclassifier rules.
//
// Rewrites identifier tokens that appear in function-call position to the
// `function` token type. This gives themes a hook to color call sites
// differently from plain identifiers.
//
//   foo()           → foo becomes `function`
//   self.method()   → method becomes `function`
//   Vec::new()      → new becomes `function`
//   println!()      → println stays `identifier` (macro `!` is separate)
//
// Also rewrites `<` / `>` / `>>` from `operator` to `punctuation` when they
// delimit type-position generics (Option<T>, fn foo<'a>, impl<T>, Foo::<U>).
//
// Finally, extends a lifetime token forward to absorb an immediately-
// following identifier (the referenced type), so `&'a str` yields one
// `lifetime` token spanning `a str`, one `punctuation` token for `'`, and
// one `operator` token for `&`.

import {
  always,
  any_of,
  balanced_parens,
  make_token_view,
  merge_adjacent,
  promote_by_text_set,
  promote_by_upper_snake_case,
  promote_pascal_case,
  rewrite_types,
  seq,
  tag,
  type,
} from "@twinkleplop/core";
import type { LanguagePipeline, Reclassifier, TokenizeResult } from "@twinkleplop/core";

import { BOOLEAN_LITERALS, PRIMITIVE_TYPES } from "./grammar.js";

// restoration passes. the grammar emits every name-like token as
// `identifier`; these layer back the distinctions it used to make at lex
// time, in an order that avoids overlap.
//
// booleans (`true`, `false`) are all-lowercase so they don't overlap with
// PascalCase promotion. PRIMITIVE_TYPES are also all-lowercase. pascal_case
// runs last and catches user-defined types (Vec, String, Option, …).
export const promote_rust_booleans: Reclassifier = promote_by_text_set(
  "identifier",
  "boolean",
  BOOLEAN_LITERALS,
);

export const promote_rust_primitive_types: Reclassifier = promote_by_text_set(
  "identifier",
  "class_name",
  PRIMITIVE_TYPES,
);

export const promote_rust_pascal_case: Reclassifier = promote_pascal_case(
  "identifier",
  "class_name",
);

// UPPER_SNAKE_CASE identifiers are Rust `const` / `static` convention
// (`MAX_SIZE`, `PI`). runs before pascal_case so multi-char all-upper
// names resolve to constant, not class_name. single-uppercase names
// (`T`, `U`) are left for pascal_case.
export const promote_rust_constants: Reclassifier = promote_by_upper_snake_case(
  "identifier",
  "constant",
);

// variant promotion: `Name :: Name` OUTSIDE a `use` statement promotes the
// trailing name to `variant`. this catches the common enum access shape
// (`Color::Red`, `Option::Some`) at value positions. excluded from `use`
// statements because there the trailing segment is a plain import
// (`use std::collections::HashMap;` — HashMap is a type, not a variant).
//
// the PascalCase check is done here rather than relying on a pre-existing
// `class_name` tag so this pass works independently of whether
// promote_rust_pascal_case also ran (e.g. under `fidelity: ["variant"]`
// alone, class_name promotion is excluded but variants must still work).
// accepted source token kinds are `identifier`, `class_name`, and
// `namespace` — any name-shape the earlier promoters might have assigned.
export const promote_rust_variants: Reclassifier = (input, result) => {
  const { tokens, token_types } = result;
  const identifier_id = token_types.indexOf("identifier");
  const class_name_id = token_types.indexOf("class_name");
  const namespace_id = token_types.indexOf("namespace");
  const keyword_id = token_types.indexOf("keyword");
  const punctuation_id = token_types.indexOf("punctuation");
  if (identifier_id < 0 || keyword_id < 0 || punctuation_id < 0) {
    return result;
  }
  let variant_id = token_types.indexOf("variant");
  if (variant_id < 0) {
    variant_id = token_types.length;
    token_types.push("variant");
  }
  const view = make_token_view(input, tokens, token_types);
  const n = view.count;

  // accept identifier / class_name / namespace as "name-shape" tokens.
  const is_name = (k: number): boolean =>
    k === identifier_id || k === class_name_id || (namespace_id >= 0 && k === namespace_id);

  // PascalCase predicate on the source-text first char — [A-Z].
  const is_pascal = (idx: number): boolean => {
    const s = tokens[idx * 3 + 1];
    const e = tokens[idx * 3 + 2];
    if (e <= s) return false;
    const c = input.charCodeAt(s);
    return c >= 0x41 && c <= 0x5a;
  };

  // pre-scan to find ranges covered by `use` statements so we can skip
  // them during the main pass. every `use` runs until the next `;` at
  // the top level.
  const in_use = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (view.is_trivia(i)) continue;
    if (view.kind_of(i) !== keyword_id) continue;
    if (view.text_of(i) !== "use") continue;
    for (let j = i; j < n; j++) {
      in_use[j] = 1;
      if (view.kind_of(j) === punctuation_id && view.text_of(j) === ";") {
        break;
      }
    }
  }

  for (let i = 0; i < n - 2; i++) {
    if (in_use[i]) continue;
    if (view.is_trivia(i)) continue;
    const lk = view.kind_of(i);
    if (!is_name(lk) || !is_pascal(i)) continue;
    const sep = view.next_non_trivia(i + 1);
    if (sep < 0 || view.kind_of(sep) !== punctuation_id || !view.text_of(sep).startsWith("::")) {
      continue;
    }
    const trailing = view.next_non_trivia(sep + 1);
    if (trailing < 0) continue;
    const tk = view.kind_of(trailing);
    if (!is_name(tk) || !is_pascal(trailing)) continue;
    tokens[trailing * 3] = variant_id;
  }

  return { tokens, token_types };
};

// parameter promotion: after `fn name(...)` tag identifiers in parameter
// position as `parameter`. skips `self` receivers and the `mut`/`&`
// qualifiers that precede the parameter name. misses destructuring and
// closure parameters (|x, y| ...), consistent with the plan's scope.
export const promote_rust_parameters: Reclassifier = (input, result) => {
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

  for (let i = 0; i < n; i++) {
    if (view.is_trivia(i)) continue;
    if (view.kind_of(i) !== keyword_id) continue;
    if (view.text_of(i) !== "fn") continue;

    // walk forward past optional generic `<...>` and the function name
    // until we find the parameter-list `(`.
    let j = view.next_non_trivia(i + 1);
    // function name (optional — e.g. `fn()` in closure types, rare)
    if (j >= 0 && view.kind_of(j) === identifier_id) {
      j = view.next_non_trivia(j + 1);
    }
    // skip generic params `<...>` by brace depth on angle operators.
    if (j >= 0 && view.kind_of(j) === operator_id && view.text_of(j) === "<") {
      let depth = 1;
      j++;
      while (j < n && depth > 0) {
        if (view.is_trivia(j)) {
          j++;
          continue;
        }
        if (view.kind_of(j) === operator_id) {
          const t = view.text_of(j);
          if (t === "<") depth++;
          else if (t === ">") depth--;
          else if (t === ">>") depth = Math.max(0, depth - 2);
        }
        j++;
      }
    }
    j = view.next_non_trivia(j);
    if (j < 0 || view.kind_of(j) !== punctuation_id || !view.text_of(j).startsWith("(")) {
      continue;
    }

    // walk parameter list. track `(...)`, `[...]`, `<...>` depth (for
    // generic types inside param type position). promote identifier
    // that appears at depth 1 as the FIRST non-trivia token after `(`
    // or `,`, skipping `self` and leading `&`/`mut`.
    let depth = 1;
    let expect_param = true;
    let k = j + 1;
    while (k < n && depth > 0) {
      if (view.is_trivia(k)) {
        k++;
        continue;
      }
      const kind = view.kind_of(k);
      const t = view.text_of(k);
      if (kind === punctuation_id) {
        for (const ch of t) {
          if (ch === "(" || ch === "[" || ch === "{") depth++;
          else if (ch === ")" || ch === "]" || ch === "}") {
            depth--;
            if (depth === 0) break;
          } else if (ch === "," && depth === 1) {
            expect_param = true;
          }
        }
        k++;
        continue;
      }
      if (depth === 1 && expect_param) {
        if (kind === keyword_id && (t === "self" || t === "mut")) {
          k++;
          continue;
        }
        if (kind === operator_id && t === "&") {
          k++;
          continue;
        }
        if (kind === identifier_id) {
          tokens[k * 3] = parameter_id;
          expect_param = false;
        } else {
          expect_param = false;
        }
      }
      k++;
    }
    i = k - 1;
  }

  return { tokens, token_types };
};

// namespace promotion: walk `use` statements and promote every name-shaped
// segment that is followed by `::` to `namespace`. confined to `use`
// statements (not arbitrary `Foo::bar` expressions elsewhere) because
// outside imports the left-of-`::` position is commonly a type (`String::
// from`), a variant (`Color::Red`), `Self::`, or an enum path. import
// contexts are unambiguous: every path segment is a module or crate name.
export const promote_rust_namespaces: Reclassifier = (input, result) => {
  const { tokens, token_types } = result;
  const identifier_id = token_types.indexOf("identifier");
  const keyword_id = token_types.indexOf("keyword");
  const punctuation_id = token_types.indexOf("punctuation");
  const class_name_id = token_types.indexOf("class_name");
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

  for (let i = 0; i < n; i++) {
    if (view.is_trivia(i)) continue;
    if (view.kind_of(i) !== keyword_id) continue;
    if (view.text_of(i) !== "use") continue;

    // scan forward until `;` (top level) or end of use statement. promote
    // any identifier / class_name whose immediate next non-trivia token
    // is `::`. braces `{...}` and nested paths are handled by the same
    // predicate — inside `use a::{b::c, d::e}` we promote `a`, `b`, `d`
    // (each followed by `::`), leaving `c` and `e` alone.
    for (let j = i + 1; j < n; j++) {
      if (view.is_trivia(j)) continue;
      const k = view.kind_of(j);
      if (k === punctuation_id && view.text_of(j) === ";") break;
      if (k !== identifier_id && k !== class_name_id) continue;
      const next = view.next_non_trivia(j + 1);
      // `::` at the punctuation boundary — the tokenizer coalesces
      // adjacent punctuation (`::` + `{` becomes `::{`), so match on
      // the prefix rather than the whole string.
      if (
        next >= 0 &&
        view.kind_of(next) === punctuation_id &&
        view.text_of(next).startsWith("::")
      ) {
        tokens[j * 3] = namespace_id;
      }
    }
  }

  return { tokens, token_types };
};

// an identifier immediately followed by `(` is a function call. using
// balanced_parens for the trailing `(` lets the rule tolerate punctuation
// coalescing (e.g. `();` as one punctuation token in `foo();`). also covers
// macros (`println!()`), generic function declarations (`fn foo<'a>(...)`),
// and turbofish calls (`collect::<Vec<T>>()`).
const paren_call = balanced_parens("(", ")");
const function_call_rules = [
  {
    anchor: "identifier",
    when: any_of(
      seq(paren_call),
      seq(type("builtin", ["!"]), paren_call),
      seq(balanced_parens("<", ">"), paren_call),
      seq(type("punctuation", ["::"]), balanced_parens("<", ">"), paren_call),
    ),
    rewrite: "function",
  },
];

// keywords that, when immediately preceding `<`, signal a generic parameter
// list rather than a comparison operator:
//   impl<T>, for<'a>, fn foo<T>, etc.
const GENERIC_LEADING_KEYWORDS = new Set(["impl", "for"]);

// keywords that introduce a name whose `<` opens a generic parameter list:
//   fn foo<T>, impl<T> Trait<T>, fn foo (when foo is an identifier).
const GENERIC_NAME_LEADING_KEYWORDS = new Set(["fn", "impl", "for"]);

// rewrites angle brackets in type-position generics from `operator` to
// `punctuation`. invoked as a custom reclassifier (not via rewrite_types)
// because matching requires depth tracking across arbitrary tokens between
// the opening `<` and its matching `>` / `>>`.
const reclassify_generics = (): Reclassifier => {
  return (input: string, result: TokenizeResult): TokenizeResult => {
    const tokens = new Uint32Array(result.tokens);
    const token_types = result.token_types.slice();

    const operator_id = token_types.indexOf("operator");
    const punctuation_id = token_types.indexOf("punctuation");
    const class_name_id = token_types.indexOf("class_name");
    const keyword_id = token_types.indexOf("keyword");
    const identifier_id = token_types.indexOf("identifier");

    if (operator_id === -1 || punctuation_id === -1) {
      return { tokens, token_types };
    }

    const view = make_token_view(input, tokens, token_types);
    const count = view.count;

    // check if the `<` at index i likely opens a type-generics block.
    const is_type_position = (i: number): boolean => {
      const prev = view.prev_non_trivia(i - 1);
      if (prev < 0) return false;
      const prev_type = view.kind_of(prev);

      if (prev_type === class_name_id) return true;

      if (prev_type === punctuation_id && view.text_of(prev) === "::") {
        return true;
      }

      if (prev_type === keyword_id) {
        return GENERIC_LEADING_KEYWORDS.has(view.text_of(prev));
      }

      if (prev_type === identifier_id) {
        const prev_prev = view.prev_non_trivia(prev - 1);
        if (prev_prev < 0) return false;
        if (view.kind_of(prev_prev) !== keyword_id) return false;
        return GENERIC_NAME_LEADING_KEYWORDS.has(view.text_of(prev_prev));
      }

      return false;
    };

    // scan forward from just after a `<` at `start` looking for a matching
    // `>` / `>>`, counting nesting via `<` operator tokens. returns the
    // index of the closing token, or -1 if bailing out.
    const find_close = (start: number): number => {
      let depth = 1;
      for (let i = start + 1; i < count; i++) {
        if (view.kind_of(i) !== operator_id) continue;
        const value = view.text_of(i);

        if (value === "<") {
          depth++;
        } else if (value === ">") {
          depth--;
          if (depth === 0) return i;
        } else if (value === ">>") {
          depth -= 2;
          if (depth <= 0) return i;
        } else if (
          value === ">=" ||
          value === ">>=" ||
          value === "<=" ||
          value === "<<" ||
          value === "<<="
        ) {
          return -1;
        }
      }
      return -1;
    };

    for (let i = 0; i < count; i++) {
      if (view.kind_of(i) !== operator_id) continue;
      if (view.text_of(i) !== "<") continue;
      if (!is_type_position(i)) continue;

      const close_idx = find_close(i);
      if (close_idx === -1) continue;

      for (let j = i; j <= close_idx; j++) {
        if (view.kind_of(j) !== operator_id) continue;
        const v = view.text_of(j);
        if (v === "<" || v === ">" || v === ">>") {
          tokens[j * 3] = punctuation_id;
        }
      }

      i = close_idx;
    }

    return { tokens, token_types };
  };
};

// merges a lifetime token with the immediately-following identifier /
// class_name token into one lifetime-typed token. applies only when the
// two tokens are directly adjacent in the stream (possibly separated by
// source-level whitespace, which is tokenless, but not by any other token).
//
// refuses to merge if the candidate identifier is itself immediately
// followed by a `(` punctuation, i.e. it's a function call target. this
// keeps the pass order-independent with respect to `function_call_rules`:
// whether function_call runs first (turning the identifier into `function`,
// which isn't a type token and wouldn't be absorbed anyway) or lifetime
// extension runs first (seeing the identifier but refusing because of the
// trailing paren), the result is the same.
// extend lifetimes forward to absorb an immediately-following type token.
// `&'a str` -> single `lifetime` token spanning `'a str`. refuses when the
// token after the type starts with `(`, because that's `'a Fn(...)` (a
// function-trait generic) where the type token is a call target, not a
// fused part of the lifetime annotation.
const extend_lifetime_over_type = merge_adjacent({
  anchor_type: "lifetime",
  consume_next_types: ["identifier", "class_name"],
  refuse_if: { offset: 2, type_must_be: "punctuation", first_char_in: "(" },
});

// order: restoration passes run first so downstream passes see a stream
// that already has `boolean`, primitive-type `class_name`, and PascalCase
// `class_name` classified. then the correctness `reclassify_generics` can
// recognise type-position `<` by looking back at `class_name` tokens. then
// fidelity passes for function calls and lifetime absorption.
//
// extend_lifetime_over_type now refuses to absorb an identifier that is
// itself followed by `(`, so it commutes with function_call_rules — either
// ordering produces the same output.
// reclassify_generics is a correctness pass — it rewrites operator `<`/`>`
// to punctuation at type-generic boundaries so downstream consumers can
// distinguish generic brackets from comparison operators. it runs at every
// fidelity.
export const reclassifiers: LanguagePipeline = [
  tag(promote_rust_booleans, ["boolean"]),
  tag(promote_rust_primitive_types, ["class_name"]),
  tag(promote_rust_constants, ["constant"]),
  tag(promote_rust_pascal_case, ["class_name"]),
  tag(promote_rust_namespaces, ["namespace"]),
  // variant promotion runs AFTER namespaces so its `in_use` pre-scan sees
  // the final class_name state before use-path segments were rewritten,
  // and only touches non-use occurrences.
  tag(promote_rust_variants, ["variant"]),
  tag(promote_rust_parameters, ["parameter"]),
  always(reclassify_generics(), "type_claim"),
  tag(rewrite_types(function_call_rules, { trivia: ["comment"] }), ["function"]),
  tag(extend_lifetime_over_type, ["lifetime"], "shape"),
];
