// Go reclassifier pipeline.
//
// The Go grammar emits richer token types directly (predeclared types as
// `keyword`, predeclared builtins as `function`), so most highlighting work
// is done at lex time. this pipeline layers on identifier-level distinctions
// that a text predicate can resolve cheaply after tokenization.
//
// idiomatic Go prefers MixedCaps (`MaxSize`) over UPPER_SNAKE_CASE for
// constants, but `const MAX_BYTES = 1024` is still common. the UPPER_SNAKE
// promoter handles the latter. pascal_case promotion is deliberately omitted:
// exported names in Go are PascalCase regardless of whether they're types,
// functions, variables, or constants, so a blind case-based promotion overfits.

import {
  as_claim_producer,
  make_token_view,
  promote_by_upper_snake_case,
  tag,
} from "@twinkleplop/core";
import type { ClaimFn, LanguagePipeline, Reclassifier } from "@twinkleplop/core";

import { chunker } from "./chunker.js";

// go's pipeline priority is structural-over-casing: namespace position
// beats parameter position beats function position beats the upper-snake
// constant convention (table precedence 55). the shared precedence table
// encodes the inverse, js-style casing-first convention, so the go passes
// state their ordering explicitly.
const GO_NAMESPACE_PREC = 65;
const GO_PARAMETER_PREC = 60;
const GO_FUNCTION_PREC = 58;

export const promote_go_constants: Reclassifier = promote_by_upper_snake_case(
  "identifier",
  "constant",
);

// Function promotion:
//   - declaration names: `func f(...)`, `func F[T any](...)`
//   - call sites: `f(...)`, `pkg.F(...)`, `F[T](...)`
// Go's square-bracket generic call syntax is lexically indistinguishable from
// indexing followed by a call (`table[key](x)`), so the bracket+paren branch
// intentionally favors useful highlighting over parser-level precision.
const promote_go_functions_fn: ClaimFn = (input, tokens, token_types, sink) => {
  const identifier_id = token_types.indexOf("identifier");
  const punctuation_id = token_types.indexOf("punctuation");
  if (identifier_id < 0 || punctuation_id < 0) return;
  let function_id = token_types.indexOf("function");
  if (function_id < 0) {
    function_id = token_types.length;
    token_types.push("function");
  }
  const view = make_token_view(input, tokens, token_types);
  const n = view.count;

  const matching_close = (
    start_idx: number,
    open: string,
    close: string,
  ): { idx: number; offset: number } | null => {
    if (start_idx < 0 || view.kind_of(start_idx) !== punctuation_id) {
      return null;
    }
    const first = view.text_of(start_idx);
    if (first[0] !== open) return null;
    let depth = 0;
    for (let k = start_idx; k < n; k++) {
      if (view.is_trivia(k)) continue;
      if (view.kind_of(k) !== punctuation_id) continue;
      const text = view.text_of(k);
      for (let offset = 0; offset < text.length; offset++) {
        const ch = text[offset];
        if (ch === open) depth++;
        else if (ch === close) {
          depth--;
          if (depth === 0) return { idx: k, offset: offset + 1 };
        }
      }
    }
    return null;
  };

  const has_open_paren_after = (pos: { idx: number; offset: number }): boolean => {
    const text = view.text_of(pos.idx);
    if (pos.offset < text.length) return text[pos.offset] === "(";
    const next = view.next_non_trivia(pos.idx + 1);
    return next >= 0 && view.kind_of(next) === punctuation_id && view.text_of(next).startsWith("(");
  };

  const is_function_position = (idx: number): boolean => {
    const next = view.next_non_trivia(idx + 1);
    if (next < 0 || view.kind_of(next) !== punctuation_id) return false;
    const text = view.text_of(next);
    if (text.startsWith("(")) return true;
    if (!text.startsWith("[")) return false;
    const close = matching_close(next, "[", "]");
    return close != null && has_open_paren_after(close);
  };

  for (let i = 0; i < n; i++) {
    if (view.kind_of(i) !== identifier_id) continue;
    if (is_function_position(i)) sink.emit(i, function_id, GO_FUNCTION_PREC);
  }
};

export const promote_go_functions: Reclassifier = as_claim_producer(promote_go_functions_fn);

// namespace promotion for Go package declarations and aliased imports:
//   - `package foo`               → foo = namespace
//   - `import f "fmt"`            → f = namespace  (aliased import)
//   - `import ( f "fmt"; x "os" )` → f, x = namespace
// un-aliased imports `import "fmt"` use a string literal so there's no
// identifier to promote. use-site package references (`fmt.Println`) need
// scope tracking and are left as identifier.
const promote_go_namespaces_fn: ClaimFn = (input, tokens, token_types, sink) => {
  const identifier_id = token_types.indexOf("identifier");
  const keyword_id = token_types.indexOf("keyword");
  const punctuation_id = token_types.indexOf("punctuation");
  const string_id = token_types.indexOf("string");
  if (identifier_id < 0 || keyword_id < 0) return;
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
    const kw = view.text_of(i);

    // `package X` — the next identifier is the package name.
    if (kw === "package") {
      const j = view.next_non_trivia(i + 1);
      if (j >= 0 && view.kind_of(j) === identifier_id) {
        sink.emit(j, namespace_id, GO_NAMESPACE_PREC);
      }
      continue;
    }

    // `import` — could be single `import "path"`, aliased
    // `import alias "path"`, or grouped `import ( ... )`. scan through
    // the spec block(s), promoting any identifier that is immediately
    // followed by a string literal (the import path). stop at the end
    // of the statement: the closing `)` for grouped, or newline/`;`
    // for single-line forms.
    if (kw === "import" && string_id >= 0 && punctuation_id >= 0) {
      let j = view.next_non_trivia(i + 1);
      let in_group = false;
      if (j >= 0 && view.kind_of(j) === punctuation_id && view.text_of(j) === "(") {
        in_group = true;
        j = view.next_non_trivia(j + 1);
      }
      while (j >= 0 && j < n) {
        const k = view.kind_of(j);
        const t = view.text_of(j);
        if (k === punctuation_id && t === ")") break;
        if (k === punctuation_id && t === ";") {
          if (!in_group) break;
          j = view.next_non_trivia(j + 1);
          continue;
        }
        // alias form: identifier immediately followed by a string
        // literal (skipping trivia).
        if (k === identifier_id) {
          const after = view.next_non_trivia(j + 1);
          if (after >= 0 && view.kind_of(after) === string_id) {
            sink.emit(j, namespace_id, GO_NAMESPACE_PREC);
            j = view.next_non_trivia(after + 1);
            continue;
          }
          // lone identifier (no string follows) — not an import
          // alias; stop for this statement when not grouped.
          if (!in_group) break;
        }
        if (k === string_id) {
          // un-aliased path; move past it.
          j = view.next_non_trivia(j + 1);
          continue;
        }
        // anything else inside a group (newlines are trivia): skip;
        // outside a group, end the statement.
        if (in_group) {
          j++;
        } else {
          break;
        }
      }
    }
  }
};

export const promote_go_namespaces: Reclassifier = as_claim_producer(promote_go_namespaces_fn);

// Parameter promotion: after `func name(...)`, `func name[T any](...)`, or
// `func (recv *R) name(...)`, tag declared parameter names. Go permits
// unnamed parameters (`func(T) U`) and shared types (`x, y int`), so this is
// chunk-based rather than "first identifier after every comma".
//
// implemented as the `chunker` primitive in lib/core: data-driven param
// detection with pending-name carryover for the shared-type form.
export const promote_go_parameters: Reclassifier = chunker({
  entry_keyword: "func",
  allow_method_receiver: true,
  separator_char: ",",
  depth_brackets: [
    { open: "(", close: ")" },
    { open: "[", close: "]" },
    { open: "{", close: "}" },
  ],
  result_type: "parameter",
  precedence: GO_PARAMETER_PREC,
  carry_pending_names: true,
});

export const reclassifiers: LanguagePipeline = [
  tag(promote_go_namespaces, ["namespace"]),
  tag(promote_go_parameters, ["parameter"]),
  tag(promote_go_functions, ["function"]),
  tag(promote_go_constants, ["constant"]),
];
