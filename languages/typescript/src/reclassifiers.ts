// TypeScript reclassifiers.
//
// The JavaScript pipeline (function-variable detection, scope-aware property
// claims, tagged-template embedding) still applies. In addition, TypeScript
// runs a `type_position_promoter` that walks the token stream once and
// rewrites identifiers appearing in type position to the `type` token, so
// custom type references (User, Promise, Array, ...) highlight the same as
// built-in types.

import type {
  ClaimFn,
  ClaimingReclassifier,
  LanguagePipeline,
  Reclassifier,
} from "@twinkleplop/core";
import {
  always,
  as_claim_producer,
  embed_interleaved,
  make_token_view,
  promote_by_text_set,
  rewrite_types,
  tag,
} from "@twinkleplop/core";

import {
  claim_property_scope,
  class_name_promoter,
  function_variable_rules,
  js_frame_track,
  promote_boolean_literals,
  promote_call_site_functions,
  promote_js_const_bindings,
  promote_js_constants,
  promote_js_namespaces,
  promote_js_parameters,
  scan_tagged_template,
} from "@twinkleplop/javascript";

import { BUILTIN_TYPES } from "./grammar.js";

export {
  claim_property_scope,
  class_name_promoter,
  function_variable_rules,
  promote_boolean_literals,
  promote_call_site_functions,
  scan_tagged_template,
};

// restore the `type` token that the grammar no longer emits directly.
// BUILTIN_TYPES words used to be matched via a keyword() rule emitting
// TOKENS.type; we moved the classification out so consumers can opt in.
export const promote_builtin_types: Reclassifier = promote_by_text_set(
  "identifier",
  "type",
  BUILTIN_TYPES,
);

// type-only declarations whose name positions aren't reached by
// type_position_promoter:
//
//   type Foo = ...                       → Foo
//   export type Foo = ...                → Foo
//   declare type Foo = ...               → Foo
//   import type Foo from "..."           → Foo
//   import type { A, B as C } from "..." → A, C  (`as` is type-transparent)
//   export type { A, B } [from "..."]    → A, B
//
// the alias-name (`Foo` in `type Foo = ...`) is handled here rather than
// from inside type_position_promoter so the claim runs as a plain pass —
// the alias state machine already advances on the name; this pass adds
// the missing token rewrite so the name is tagged `type` rather than
// being left as a plain identifier.
//
// `import type * as X from "..."` and `export type * as X from "..."`
// are NOT touched here — the namespace promoter owns `* as X` shapes.
export const promote_ts_type_only_bindings: Reclassifier = (input, result) => {
  const { tokens, token_types } = result;
  const identifier_id = token_types.indexOf("identifier");
  const keyword_id = token_types.indexOf("keyword");
  const punctuation_id = token_types.indexOf("punctuation");
  const operator_id = token_types.indexOf("operator");
  if (identifier_id < 0 || keyword_id < 0 || punctuation_id < 0) return result;
  let type_id = token_types.indexOf("type");
  if (type_id < 0) {
    type_id = token_types.length;
    token_types.push("type");
  }
  const view = make_token_view(input, tokens, token_types);
  const n = view.count;

  // walk a `{ A, B as C, ... }` binding list. tags every identifier
  // inside as `type`. assumes tokens[start_idx] starts with `{`.
  const tag_binding_list = (start_idx: number): void => {
    let depth = 0;
    const start_text = view.text_of(start_idx);
    for (const ch of start_text) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    if (depth <= 0) return;
    let m = start_idx + 1;
    while (m < n && depth > 0) {
      if (view.is_trivia(m)) {
        m++;
        continue;
      }
      const mk = view.kind_of(m);
      const mt = view.text_of(m);
      if (mk === punctuation_id) {
        for (const ch of mt) {
          if (ch === "{") depth++;
          else if (ch === "}") {
            depth--;
            if (depth === 0) break;
          }
        }
      } else if (mk === identifier_id) {
        tokens[m * 3] = type_id;
      }
      m++;
    }
  };

  for (let i = 0; i < n; i++) {
    if (view.is_trivia(i)) continue;
    if (view.kind_of(i) !== keyword_id) continue;
    const t = view.text_of(i);

    // `type Foo = ...` — claim Foo. require statement-start so we don't
    // grab a member named `type` inside an object literal etc.
    if (t === "type") {
      const prev = view.prev_non_trivia(i - 1);
      let stmt_start = prev < 0;
      if (!stmt_start && prev >= 0) {
        const pk = view.kind_of(prev);
        const pt = view.text_of(prev);
        if (
          pk === punctuation_id &&
          pt.length > 0 &&
          (pt[pt.length - 1] === ";" || pt[pt.length - 1] === "}")
        ) {
          stmt_start = true;
        }
        if (pk === keyword_id && (pt === "export" || pt === "declare")) {
          stmt_start = true;
        }
      }
      if (!stmt_start) continue;
      const j = view.next_non_trivia(i + 1);
      if (j >= 0 && view.kind_of(j) === identifier_id) {
        tokens[j * 3] = type_id;
      }
      continue;
    }

    // `import type ...` / `export type ...`
    if (t === "import" || t === "export") {
      const j = view.next_non_trivia(i + 1);
      if (j < 0 || view.kind_of(j) !== keyword_id || view.text_of(j) !== "type") {
        continue;
      }
      const k = view.next_non_trivia(j + 1);
      if (k < 0) continue;
      const kk = view.kind_of(k);
      const kt = view.text_of(k);
      if (kk === operator_id && kt === "*") continue; // namespace shape
      if (kk === punctuation_id && kt.length > 0 && kt[0] === "{") {
        tag_binding_list(k);
        continue;
      }
      // `import type Foo from "..."` — Foo is a default-import type.
      if (kk === identifier_id && t === "import") {
        tokens[k * 3] = type_id;
      }
      // `export type Foo = ...` falls through to the `type` branch on
      // the next outer-loop iteration.
      continue;
    }
  }
  return result;
};

// ---------------------------------------------------------------------------
// type_position_promoter
// ---------------------------------------------------------------------------
//
// Type position is entered on:
//   - `:` (non-ternary) that introduces a type annotation: after `)` for
//     return type, inside a param list, inside a class/interface body, or
//     after a `let`/`const`/`var` declarator
//   - `as` / `satisfies` keywords
//   - `extends` in interface heads and type-parameter constraints (NOT the
//     class extends value position, which references a super-class value)
//   - `implements` keyword
//   - `<...>` generic argument lists after an identifier / type reference
//   - `type X = ...` right-hand side
//
// Inside type mode, identifiers become `type` unless immediately followed
// by `:` — those are parameter names in a function type `(x: T) => U` or
// property keys in an object type `{ x: T }`.
//
// Known limitations:
//   - Generic type-args in value position (`foo<T>(x)`, `new Map<K,V>()`):
//     the call target stays as identifier/function, but `T`, `K`, `V` are
//     still promoted inside the angle brackets.
//   - Mapped type key/value modifiers (`-readonly`, `+?`) not specially
//     handled — the key and value types still promote correctly.
//   - Complex arrow return types like `(): (x: T) => U => body` use a
//     small heuristic (`=>` after `)` stays in-type) that may misfire in
//     contrived code.
//   - We don't distinguish ternary `?` `:` inside `as`/`satisfies` cleanly
//     — the common shape `x as T` ending at `?` is handled, but a pattern
//     like `(x as T) ? a : b` exits type mode at `)` anyway, so this is
//     fine in practice.

type BraceCtx = "class" | "interface" | "type_lit" | "other";

interface Scope {
  kind: "top" | "paren" | "brace" | "bracket";
  brace_ctx?: BraceCtx;
  qmark: number;
}

type TypeModeKind =
  | "annotation_param"
  | "annotation_var"
  | "annotation_field"
  | "return"
  | "as"
  | "extends_list"
  | "implements_list"
  | "generics"
  | "alias_rhs";

interface TypeMode {
  kind: TypeModeKind;
  entry_paren: number;
  entry_brace: number;
  entry_bracket: number;
  entry_angle: number;
}

// operators that unambiguously mean "value expression, not a type".
const VALUE_OP_TERMINATORS = new Set([
  "+",
  "-",
  "*",
  "/",
  "%",
  "**",
  "==",
  "!=",
  "===",
  "!==",
  "<=",
  ">=",
  "&&",
  "||",
  "??",
  "?.",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "&&=",
  "||=",
  "??=",
  "<<",
  ">>",
  ">>>",
  "<<=",
  ">>=",
  ">>>=",
  "**=",
  "++",
  "--",
]);

// statement-starter keywords that terminate any type expression.
const STMT_KEYWORD_TERMINATORS = new Set([
  "return",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "throw",
  "try",
  "catch",
  "finally",
  "function",
  "class",
  "interface",
  "enum",
  "namespace",
  "module",
  "let",
  "const",
  "var",
  "import",
  "export",
  "type",
]);

// keywords that can legitimately be the LAST token of a type expression.
// used by the `{` exit check so return annotations like `(): this {` and
// `(): T | undefined {` correctly terminate type mode at the method body.
const TYPE_TERMINAL_KEYWORDS = new Set([
  "this",
  "void",
  "undefined",
  "null",
  "never",
  "unknown",
  "any",
  "object",
]);

// keywords that reset the in-var-decl flag (start a fresh statement).
const STMT_STARTERS = new Set([
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "throw",
  "try",
  "catch",
  "finally",
  "function",
  "class",
  "interface",
  "enum",
  "namespace",
  "module",
  "import",
  "export",
  "return",
]);

// precedence for TPP's type claims. uses the default `type` precedence
// (45), which beats function (30) / property (20) / identifier (0). TPP no
// longer emits claims on annotation anchors — `claim_property_scope` and
// `function_variable_rules` are now each the SOLE owner of their shape
// (scope-aware `:` classification and `=`-assignment respectively), so
// there's no over-claimer for TPP to correct.
const TPP_TYPE_PREC = 45;

const type_position_promoter_fn: ClaimFn = (input, tokens, token_types, sink) => {
  const n = tokens.length / 3;
  if (n === 0) return;

  const identifier_id = token_types.indexOf("identifier");
  const keyword_id = token_types.indexOf("keyword");
  const punctuation_id = token_types.indexOf("punctuation");
  const operator_id = token_types.indexOf("operator");
  // append the target type if absent. the pass must NOT depend on a
  // sibling having registered "type" first -- batch members all read the
  // same frozen base and may run in any order.
  let type_id = token_types.indexOf("type");
  if (type_id < 0) {
    type_id = token_types.length;
    token_types.push("type");
  }
  if (identifier_id < 0 || keyword_id < 0 || punctuation_id < 0 || operator_id < 0) {
    return;
  }

  const view = make_token_view(input, tokens, token_types);
  const kind_of = view.kind_of;
  const text_of = view.text_of;
  const is_trivia = view.is_trivia;
  const next_nt = view.next_non_trivia;
  const prev_nt = view.prev_non_trivia;

  let paren_depth = 0;
  let brace_depth = 0;
  let bracket_depth = 0;
  // angle_depth is meaningful only while `mode !== null`.
  let angle_depth = 0;

  const scope_stack: Scope[] = [{ kind: "top", qmark: 0 }];
  const cur_scope = (): Scope => scope_stack[scope_stack.length - 1];

  let in_var_decl = false;

  // state machine for `type IDENT [<...>] =` detection. When we see the
  // `=`, enter alias_rhs mode.
  type AliasState =
    | { kind: "none" }
    | { kind: "saw_type" }
    | { kind: "saw_name"; angle_depth: number };
  let alias_state: AliasState = { kind: "none" };

  let mode: TypeMode | null = null;

  const enter_mode = (kind: TypeModeKind): void => {
    mode = {
      kind,
      entry_paren: paren_depth,
      entry_brace: brace_depth,
      entry_bracket: bracket_depth,
      entry_angle: angle_depth,
    };
  };

  const exit_mode = (): void => {
    mode = null;
    angle_depth = 0;
  };

  const at_entry_depth = (m: TypeMode): boolean =>
    paren_depth === m.entry_paren &&
    brace_depth === m.entry_brace &&
    bracket_depth === m.entry_bracket &&
    angle_depth === m.entry_angle;

  // classify a `{` we're about to enter. returns the brace context.
  const classify_brace = (open_idx: number): BraceCtx => {
    if (mode !== null) return "type_lit";
    const prev = prev_nt(open_idx - 1);
    if (prev < 0) return "other";
    const pk = kind_of(prev);
    const pt = text_of(prev);
    if (pk === operator_id && pt === "=>") return "other";
    if (pk === keyword_id && (pt === "else" || pt === "do" || pt === "try" || pt === "finally")) {
      return "other";
    }
    if (pk === punctuation_id && pt.endsWith(")")) return "other";

    // walk back through a class/interface header: [kw] NAME [<...>]
    //   [extends (NAME [.NAME]* [<...>])(, NAME ...)*]
    //   [implements ... — only for classes]
    let i = prev_nt(open_idx - 1);
    while (i >= 0) {
      const k = kind_of(i);
      const t = text_of(i);
      if (
        k === identifier_id ||
        k === type_id ||
        (k === punctuation_id && (t === "." || t === ",")) ||
        (k === keyword_id && (t === "extends" || t === "implements"))
      ) {
        i = prev_nt(i - 1);
        continue;
      }
      if (k === operator_id && t === ">") {
        // walk back through a balanced <...> group
        let depth = 1;
        i = prev_nt(i - 1);
        while (i >= 0 && depth > 0) {
          const kk = kind_of(i);
          const tt = text_of(i);
          if (kk === operator_id && tt === ">") {
            depth++;
          } else if (kk === operator_id && tt === "<") {
            depth--;
            if (depth === 0) {
              i = prev_nt(i - 1);
              break;
            }
          }
          i = prev_nt(i - 1);
        }
        if (depth !== 0) return "other";
        continue;
      }
      break;
    }
    if (i < 0) return "other";
    if (kind_of(i) === keyword_id) {
      const kw = text_of(i);
      if (kw === "class") return "class";
      if (kw === "interface") return "interface";
    }
    return "other";
  };

  // decide whether a `:` at position idx introduces a type annotation.
  const classify_colon = (idx: number): TypeModeKind | null => {
    const prev = prev_nt(idx - 1);
    if (prev < 0) return null;
    // prev token may be a merged punctuation bundle (e.g. `()`, `]);`);
    // match on the last non-empty char.
    if (kind_of(prev) === punctuation_id) {
      const pt = text_of(prev);
      if (pt.length > 0 && pt[pt.length - 1] === ")") return "return";
    }
    const scope = cur_scope();
    if (scope.kind === "paren") return "annotation_param";
    if (scope.kind === "brace") {
      if (scope.brace_ctx === "class" || scope.brace_ctx === "interface") {
        return "annotation_field";
      }
      return null;
    }
    if (scope.kind === "top" && in_var_decl) return "annotation_var";
    return null;
  };

  // is this `extends` a type-list introducer (interface extends, type
  // parameter constraint) rather than a value reference (class extends
  // SuperClass)?
  const detect_extends_context = (idx: number): boolean => {
    let i = prev_nt(idx - 1);
    while (i >= 0) {
      const k = kind_of(i);
      const t = text_of(i);
      if (k === identifier_id || k === type_id || (k === punctuation_id && t === ".")) {
        i = prev_nt(i - 1);
        continue;
      }
      if (k === operator_id && t === ">") {
        let depth = 1;
        i = prev_nt(i - 1);
        while (i >= 0 && depth > 0) {
          const kk = kind_of(i);
          const tt = text_of(i);
          if (kk === operator_id && tt === ">") {
            depth++;
          } else if (kk === operator_id && tt === "<") {
            depth--;
            if (depth === 0) {
              i = prev_nt(i - 1);
              break;
            }
          }
          i = prev_nt(i - 1);
        }
        if (depth !== 0) return false;
        continue;
      }
      break;
    }
    if (i < 0) return false;
    const k = kind_of(i);
    const t = text_of(i);
    if (k === keyword_id && t === "interface") return true;
    if (k === keyword_id && t === "class") return false;
    // inside a generic parameter list: `<T extends U>` — entering type mode
    if (k === operator_id && t === "<") return true;
    // inside an extends list for another interface: `extends A, B` where
    // we arrive at the previous identifier — already a type context.
    if (k === keyword_id && t === "extends") return true;
    return false;
  };

  // does `<` at open_idx look like the start of generic type arguments?
  // heuristic: preceded by an identifier/type, matching `>` closes cleanly
  // before a token that's consistent with generics finishing (call, member
  // access, type-list separator, etc.).
  const looks_like_generic_args = (open_idx: number): boolean => {
    const prev = prev_nt(open_idx - 1);
    if (prev < 0) return false;
    const pk = kind_of(prev);
    if (pk !== identifier_id && pk !== type_id) return false;
    let depth = 1;
    let brace_depth = 0;
    let j = open_idx + 1;
    let matched_close = -1;
    while (j < n) {
      if (is_trivia(j)) {
        j++;
        continue;
      }
      const kk = kind_of(j);
      const tt = text_of(j);
      if (kk === operator_id) {
        if (tt === "<") {
          depth++;
        } else if (tt === ">") {
          if (brace_depth === 0) {
            depth--;
            if (depth === 0) {
              matched_close = j;
              break;
            }
          }
        }
      } else if (kk === punctuation_id) {
        // object-type literal in a type-parameter constraint
        // (`<T extends { id: number }>`) lives inside the angle group;
        // track brace depth so the inner `{...}` doesn't false-reject.
        // `;` outside braces still terminates — generics can't span
        // statements — but `;` inside is a valid type-literal member
        // separator.
        for (const ch of tt) {
          if (ch === "{") brace_depth++;
          else if (ch === "}") {
            if (brace_depth === 0) return false;
            brace_depth--;
          } else if (ch === ";" && brace_depth === 0) {
            return false;
          }
        }
      }
      j++;
    }
    if (matched_close < 0) return false;
    const after = next_nt(matched_close + 1);
    if (after < 0) return true;
    const ak = kind_of(after);
    const at = text_of(after);
    if (ak === punctuation_id) {
      // punctuation tokens coalesce same-type adjacent chars (`{}`,
      // `();`, `}))`), so the FIRST char tells us what comes next.
      const c = at.length > 0 ? at[0] : "";
      return (
        c === "(" ||
        c === ")" ||
        c === "{" ||
        c === "}" ||
        c === "[" ||
        c === "]" ||
        c === "," ||
        c === ";" ||
        c === "." ||
        c === ":"
      );
    }
    if (ak === operator_id) {
      return (
        at === "=" ||
        at === "=>" ||
        at === "?:" ||
        at === "|" ||
        at === "&" ||
        at === ">" ||
        at === "?" ||
        at === "!"
      );
    }
    if (ak === keyword_id) {
      // `Foo<T> extends ...`, `Foo<T> implements ...` — generic
      return at === "extends" || at === "implements";
    }
    return false;
  };

  // returns the index of the last non-trivia char in prev tokens that
  // effectively precedes token `i` — taking into account that the prev
  // token may be a multi-char punctuation bundle (e.g. `()`, `[];`, `}))`).
  const prev_effective_char = (i: number): string | null => {
    const p = prev_nt(i - 1);
    if (p < 0) return null;
    const pt = text_of(p);
    return pt.length > 0 ? pt[pt.length - 1] : null;
  };

  // process a single punctuation char within a (possibly merged) token.
  // returns true if the outer loop should `continue` (punctuation already
  // handled here, no further work on this token).
  const process_punct_char = (ch: string, i: number): boolean => {
    if (ch === "(") {
      paren_depth++;
      scope_stack.push({ kind: "paren", qmark: 0 });
      return false;
    }
    if (ch === ")") {
      paren_depth--;
      if (scope_stack.length > 1) scope_stack.pop();
      if (mode && paren_depth < mode.entry_paren) exit_mode();
      return false;
    }
    if (ch === "{") {
      if (
        mode &&
        brace_depth === mode.entry_brace &&
        paren_depth === mode.entry_paren &&
        (mode.kind === "return" || mode.kind === "extends_list" || mode.kind === "implements_list")
      ) {
        const prev_ch = prev_effective_char(i);
        const prev_is_type_closer = prev_ch === "]" || prev_ch === ")";
        let closer_from_prev_token = prev_is_type_closer;
        if (!closer_from_prev_token) {
          const p = prev_nt(i - 1);
          if (p >= 0) {
            const pk = kind_of(p);
            if (pk === identifier_id || pk === type_id) {
              closer_from_prev_token = true;
            } else if (pk === operator_id && text_of(p) === ">") {
              closer_from_prev_token = true;
            } else if (pk === keyword_id && TYPE_TERMINAL_KEYWORDS.has(text_of(p))) {
              // type expressions often end on a keyword like
              // `this`, `void`, `undefined`, etc. — treat them as
              // the same closing signal as an identifier / type.
              closer_from_prev_token = true;
            }
          }
        }
        if (closer_from_prev_token) exit_mode();
      }
      const ctx = classify_brace(i);
      brace_depth++;
      scope_stack.push({ kind: "brace", brace_ctx: ctx, qmark: 0 });
      return false;
    }
    if (ch === "}") {
      brace_depth--;
      if (scope_stack.length > 1) scope_stack.pop();
      if (mode && brace_depth < mode.entry_brace) exit_mode();
      if (brace_depth === 0 && paren_depth === 0) {
        in_var_decl = false;
        alias_state = { kind: "none" };
      }
      return false;
    }
    if (ch === "[") {
      bracket_depth++;
      scope_stack.push({ kind: "bracket", qmark: 0 });
      return false;
    }
    if (ch === "]") {
      bracket_depth--;
      if (scope_stack.length > 1) scope_stack.pop();
      if (mode && bracket_depth < mode.entry_bracket) exit_mode();
      return false;
    }
    if (ch === ";") {
      if (mode && at_entry_depth(mode)) exit_mode();
      if (paren_depth === 0 && brace_depth === 0) {
        in_var_decl = false;
        alias_state = { kind: "none" };
      }
      return false;
    }
    // `,`, `.`, other punct: depth-neutral, handled by later termination
    // logic when appropriate.
    return false;
  };

  for (let i = 0; i < n; i++) {
    if (is_trivia(i)) continue;

    const k = kind_of(i);
    const t = text_of(i);

    // ------------------------------------------------------------------
    // bracket handling runs BEFORE mode-specific work so that depth
    // tracking stays consistent even when entering/exiting modes.
    // ------------------------------------------------------------------

    if (k === punctuation_id) {
      // the tokenizer coalesces adjacent punctuation of the same type
      // into a single token (e.g. `()`, `[];`, `}))`). iterate each
      // char so depth tracking stays in sync.
      for (let c = 0; c < t.length; c++) {
        process_punct_char(t[c], i);
      }
      // after consuming this punctuation, check for `,` termination in
      // type modes — commas at entry depth end some kinds.
      if (mode && at_entry_depth(mode) && t.includes(",")) {
        const m = mode;
        if (m.kind !== "extends_list" && m.kind !== "implements_list" && m.kind !== "generics") {
          exit_mode();
        }
      }
      // `:` is now a punctuation token (separator, not operator). when
      // out of mode it can introduce a type annotation. handles both the
      // standalone form and coalesced shapes like `):` (return type),
      // `]:` (mapped type marker after `]` close), `}:` (rare), etc.
      if (mode === null && t.length > 0 && t[t.length - 1] === ":") {
        if (cur_scope().qmark > 0) {
          cur_scope().qmark--;
        } else {
          let kind: TypeModeKind | null = null;
          // coalesced `):` — `:` immediately follows the `)` close.
          // classify_colon's prev_nt lookup wouldn't see the `)` here
          // since it's WITHIN this same token, so detect that case
          // explicitly.
          if (t.length >= 2 && t[t.length - 2] === ")") {
            kind = "return";
          } else {
            kind = classify_colon(i);
          }
          if (kind) enter_mode(kind);
        }
      }
      continue;
    }

    // angle-bracket tracking (only while inside type mode).
    if (mode !== null && k === operator_id) {
      if (t === "<") {
        angle_depth++;
        continue;
      }
      if (t === ">") {
        if (angle_depth > 0) {
          angle_depth--;
          if (angle_depth < mode.entry_angle) exit_mode();
          continue;
        }
        // `>` at entry angle 0 without a matching `<`: leave alone.
      }
      // TS grammar doesn't split `>>` / `>>>` at generic closes — if it
      // did, we'd handle that here. Current grammar emits each `>` as
      // its own operator when adjacent to type args.
    }

    // ------------------------------------------------------------------
    // IN-MODE: termination checks and identifier reclassification
    // ------------------------------------------------------------------

    if (mode !== null) {
      const m = mode;

      // termination only considered when we're back at entry depth.
      // (punctuation including `,` / `;` is already handled above and
      // `continue`d before reaching here.)
      if (at_entry_depth(m)) {
        if (k === operator_id) {
          if (t === "=") {
            if (
              m.kind === "annotation_var" ||
              m.kind === "annotation_param" ||
              m.kind === "annotation_field"
            ) {
              exit_mode();
              continue;
            }
            // inside generics, `=` introduces a default type — stay.
            if (m.kind === "generics") continue;
            // alias_rhs was entered ON `=`, so we're past it. other
            // kinds: unexpected, terminate defensively.
            exit_mode();
            continue;
          }
          if (t === "=>") {
            // `=>` preceded by `)` is part of a function type
            // `(x: T) => U` — keep consuming the type. otherwise
            // it's the arrow-function separator and terminates.
            const prev_ch = prev_effective_char(i);
            if (prev_ch === ")") continue;
            exit_mode();
            continue;
          }
          if (t === "?") {
            // `as`/`satisfies` end at the first ternary `?`.
            if (m.kind === "as") {
              exit_mode();
              continue;
            }
            // in other kinds: type-level `?` (optional, conditional).
          }
          if (VALUE_OP_TERMINATORS.has(t)) {
            exit_mode();
            continue;
          }
        }
        if (k === keyword_id && STMT_KEYWORD_TERMINATORS.has(t)) {
          exit_mode();
          continue;
        }
      }

      // reclassify identifiers, unless they're clearly in "key
      // position" — preceding a `:` INSIDE a nested paren or brace
      // (function type `(x: T) => U`, object type `{ x: T }`). at
      // the root of the type expression, `:` is the conditional
      // type separator (`T extends U ? A : B`), not a key marker.
      if (k === identifier_id) {
        let skip = false;
        if (paren_depth > m.entry_paren || brace_depth > m.entry_brace) {
          const nxt = next_nt(i + 1);
          if (nxt >= 0) {
            const nk = kind_of(nxt);
            const nt = text_of(nxt);
            // `:` is now punctuation; `?:` is still an operator token.
            if ((nk === punctuation_id && nt === ":") || (nk === operator_id && nt === "?:")) {
              skip = true;
            }
          }
        }
        if (!skip) {
          sink.emit(i, type_id, TPP_TYPE_PREC);
        }
      }
      continue;
    }

    // ------------------------------------------------------------------
    // OUT OF MODE: scan for entry triggers and maintain statement state
    // ------------------------------------------------------------------

    // `?:` operator — TS optional-member marker, possibly introducing a
    // type annotation. (the bare `:` punctuation form is handled in the
    // punctuation block above.)
    if (k === operator_id && t === "?:") {
      const kind = classify_colon(i);
      if (kind) {
        // step 6 change: no identifier claim is emitted on the anchor
        // anymore. the old "demote function → identifier" hack was
        // needed because function_variable_rules overclaimed `function`
        // on any `ident : arrow` shape (class fields, function params,
        // interface members). fn_var now only claims for `=` shapes,
        // and claim_property_scope is the sole owner of `:` positions,
        // so class fields and function params simply never receive a
        // competing claim — they stay `identifier` by default. the
        // type-mode state machine below is unchanged.
        enter_mode(kind);
      }
      continue;
    }

    if (k === operator_id && t === "?") {
      cur_scope().qmark++;
      continue;
    }

    if (k === keyword_id) {
      if (t === "as" || t === "satisfies") {
        enter_mode("as");
        continue;
      }
      if (t === "extends") {
        if (detect_extends_context(i)) enter_mode("extends_list");
        continue;
      }
      if (t === "implements") {
        enter_mode("implements_list");
        continue;
      }
      if (t === "let" || t === "const" || t === "var") {
        if (paren_depth === 0 && brace_depth === 0) in_var_decl = true;
        continue;
      }
      if (t === "type") {
        if (paren_depth === 0 && brace_depth === 0) {
          alias_state = { kind: "saw_type" };
        }
        continue;
      }
      if (STMT_STARTERS.has(t)) {
        in_var_decl = false;
        alias_state = { kind: "none" };
        continue;
      }
      continue;
    }

    // alias state machine: `type NAME [<...>] =`. the `<...>` piece is
    // delegated to generics mode (below) which handles depth + promotion.
    // here we just advance the outer state machine on NAME and watch for
    // `=` at the top level.
    if (alias_state.kind === "saw_type" && k === identifier_id) {
      alias_state = { kind: "saw_name", angle_depth: 0 };
      continue;
    }
    if (alias_state.kind === "saw_name" && k === operator_id && t === "=") {
      enter_mode("alias_rhs");
      alias_state = { kind: "none" };
      continue;
    }

    // generic type-arguments: `Foo<T, U>`
    if (k === operator_id && t === "<") {
      if (looks_like_generic_args(i)) {
        angle_depth = 1;
        enter_mode("generics");
        // entry_angle captures angle_depth AFTER the bump (== 1), so
        // the matching `>` takes angle_depth back to 0 which is `<
        // entry_angle` and triggers the exit in the angle handler.
        continue;
      }
    }
  }
};

export const type_position_promoter: ClaimingReclassifier =
  as_claim_producer(type_position_promoter_fn);

// promote_ts_generic_calls
// ---------------------------------------------------------------------------
//
// the grammar's identifier_probe routes `ident(` to `function_name` and emits
// `function` directly. when generic type arguments intervene — `ident<T>(` —
// the probe exits to plain identifier on the `<` and never reaches the call
// detector. this pass restores the missing classification by scanning for
// `identifier` tokens followed by a balanced `<...>` group whose immediate
// next token is `(`. covers both call sites (`identity<string>("hello")`)
// and declarations (`function identity<T>(arg)`).
//
// disambiguation against `a < b > c` (comparison): we require a clean
// balance and a trailing `(`, and bail on `;`, `{`, `}` inside.
export const promote_ts_generic_calls: Reclassifier = (input, result) => {
  const { tokens, token_types } = result;
  const identifier_id = token_types.indexOf("identifier");
  const operator_id = token_types.indexOf("operator");
  const punctuation_id = token_types.indexOf("punctuation");
  if (identifier_id < 0 || operator_id < 0 || punctuation_id < 0) return result;
  let function_id = token_types.indexOf("function");
  if (function_id < 0) {
    function_id = token_types.length;
    token_types.push("function");
  }
  const view = make_token_view(input, tokens, token_types);
  const n = view.count;

  for (let i = 0; i < n; i++) {
    if (view.is_trivia(i)) continue;
    if (view.kind_of(i) !== identifier_id) continue;
    const lt = view.next_non_trivia(i + 1);
    if (lt < 0) continue;
    if (view.kind_of(lt) !== operator_id || view.text_of(lt) !== "<") continue;

    let depth = 1;
    let brace_depth = 0;
    let j = lt + 1;
    let matched_close = -1;
    let bail = false;
    while (j < n) {
      if (view.is_trivia(j)) {
        j++;
        continue;
      }
      const kk = view.kind_of(j);
      const tt = view.text_of(j);
      if (kk === operator_id) {
        if (tt === "<") {
          depth++;
        } else if (tt === ">") {
          if (brace_depth === 0) {
            depth--;
            if (depth === 0) {
              matched_close = j;
              break;
            }
          }
        }
      } else if (kk === punctuation_id) {
        for (const ch of tt) {
          if (ch === "{") brace_depth++;
          else if (ch === "}") {
            if (brace_depth === 0) {
              bail = true;
              break;
            }
            brace_depth--;
          } else if (ch === ";" && brace_depth === 0) {
            bail = true;
            break;
          }
        }
        if (bail) break;
      }
      j++;
    }
    if (matched_close < 0) continue;
    const after = view.next_non_trivia(matched_close + 1);
    if (after < 0) continue;
    if (view.kind_of(after) !== punctuation_id || !view.text_of(after).startsWith("(")) {
      continue;
    }
    tokens[i * 3] = function_id;
  }
  return result;
};

// retag_generic_angles
// ---------------------------------------------------------------------------
//
// the grammar emits `<` and `>` as operators because their role can't be
// decided lexically — `a < b` is comparison, `Foo<T>` is a type argument
// list. by the time the rest of the pipeline has finished, the surrounding
// context lets us identify the angle pairs that actually delimit type
// arguments and promote them from `operator` to `punctuation`. handles
// coalesced closes `>>` / `>>>` (which the tokenizer emits as a single
// operator under maximal munch) by treating each char as one close — every
// such token is retagged as a unit.
//
// runs LAST so passes that depend on `<` / `>` being operators (TPP,
// promote_ts_generic_calls, class_name_promoter's skip_angles, the
// parameter walker's generic skip) see the original tokens.
export const retag_generic_angles: Reclassifier = (input, result) => {
  const { tokens, token_types } = result;
  const operator_id = token_types.indexOf("operator");
  const punctuation_id = token_types.indexOf("punctuation");
  if (operator_id < 0 || punctuation_id < 0) return result;
  const identifier_id = token_types.indexOf("identifier");
  const type_id = token_types.indexOf("type");
  const class_name_id = token_types.indexOf("class_name");
  const function_id = token_types.indexOf("function");
  const keyword_id = token_types.indexOf("keyword");
  const view = make_token_view(input, tokens, token_types);
  const n = view.count;

  const is_name_kind = (k: number): boolean =>
    k === identifier_id || k === type_id || k === class_name_id || k === function_id;

  const after_acceptable = (after: number): boolean => {
    if (after < 0) return true;
    const k = view.kind_of(after);
    const t = view.text_of(after);
    if (k === punctuation_id) {
      const c = t.length > 0 ? t[0] : "";
      return (
        c === "(" ||
        c === ")" ||
        c === "{" ||
        c === "}" ||
        c === "[" ||
        c === "]" ||
        c === "," ||
        c === ";" ||
        c === "." ||
        c === ":"
      );
    }
    if (k === operator_id) {
      return (
        t === "=" ||
        t === "=>" ||
        t === "?:" ||
        t === "|" ||
        t === "&" ||
        t === ">" ||
        t === ">>" ||
        t === ">>>" ||
        t === "?" ||
        t === "!"
      );
    }
    if (k === keyword_id) {
      return t === "extends" || t === "implements";
    }
    return false;
  };

  let i = 0;
  while (i < n) {
    if (view.is_trivia(i)) {
      i++;
      continue;
    }
    if (view.kind_of(i) !== operator_id || view.text_of(i) !== "<") {
      i++;
      continue;
    }
    const prev = view.prev_non_trivia(i - 1);
    if (prev < 0 || !is_name_kind(view.kind_of(prev))) {
      i++;
      continue;
    }

    let depth = 1;
    let brace_depth = 0;
    let j = i + 1;
    let close_idx = -1;
    const angles: number[] = [i];
    let bail = false;
    while (j < n) {
      if (view.is_trivia(j)) {
        j++;
        continue;
      }
      const k = view.kind_of(j);
      const t = view.text_of(j);
      if (k === operator_id) {
        if (t === "<") {
          depth++;
          angles.push(j);
        } else if (brace_depth === 0 && (t === ">" || t === ">>" || t === ">>>")) {
          depth -= t.length;
          angles.push(j);
          if (depth <= 0) {
            close_idx = j;
            break;
          }
        }
      } else if (k === punctuation_id) {
        for (const ch of t) {
          if (ch === "{") brace_depth++;
          else if (ch === "}") {
            if (brace_depth === 0) {
              bail = true;
              break;
            }
            brace_depth--;
          } else if (ch === ";" && brace_depth === 0) {
            bail = true;
            break;
          }
        }
        if (bail) break;
      }
      j++;
    }
    if (bail || close_idx < 0) {
      i++;
      continue;
    }
    const after = view.next_non_trivia(close_idx + 1);
    if (!after_acceptable(after)) {
      i++;
      continue;
    }
    for (const idx of angles) {
      tokens[idx * 3] = punctuation_id;
    }
    i = close_idx + 1;
  }

  return result;
};

export const reclassifiers: LanguagePipeline = [
  // shared scope-stack pre-pass. required by claim_property_scope so it can
  // read brace depths and at_start instead of maintaining its own.
  always(js_frame_track, "type_claim"),
  // constant promotion first: UPPER_SNAKE_CASE identifiers become `constant`
  // so subsequent passes see the promoted stream (same ordering as JS).
  tag(promote_js_constants, ["constant"]),
  // namespace promotion runs BEFORE type_position_promoter: the `as`
  // keyword in `import * as X from ...` otherwise reads as a TS type-
  // assertion cast, and X gets tagged as `type`. claiming it as
  // `namespace` first forecloses the false positive.
  tag(promote_js_namespaces, ["namespace"]),
  // boolean and call-site function are emitted directly by the shared JS
  // grammar now. builtin type promotion stays as a reclassifier — a
  // simple text-set that runs after the grammar.
  tag(promote_builtin_types, ["type"]),
  // claim_property_scope batches with function_variable_rules above —
  // both see the base stream, their claims merge by precedence. interface
  // members claim at prec 35 (beats function's 30) so `cb: () => X` in
  // an interface resolves to property without needing a separate
  // re-promotion pass. class fields never get a property claim, so
  // type_position_promoter doesn't need class_field_demoter to clean up
  // after it. class_name_promoter runs last among the identifier-rewriters
  // so it has the final say on positions it specifically owns
  // (class/interface heads, `new`, `instanceof`).
  tag(rewrite_types(function_variable_rules, { trivia: ["comment"] }), ["function"]),
  // const-binding promotion runs after function_variable_rules so a
  // function-valued const stays `function`. only rewrites identifiers,
  // so namespaces / builtin-types / function-vars are untouched.
  tag(promote_js_const_bindings, ["constant"]),
  tag(claim_property_scope, ["property"]),
  tag(type_position_promoter, ["type"]),
  // `type Foo = ...`, `import type ...`, `export type ...` — binding-name
  // positions that type_position_promoter doesn't claim. runs before
  // class_name_promoter so the names are tagged `type` rather than
  // falling through to `class_name`.
  tag(promote_ts_type_only_bindings, ["type"]),
  // call sites and declarations with explicit type arguments — `f<T>(...)`,
  // `function f<T>(...)`, `Foo<U>(...)`. the grammar's identifier probe
  // can't peek past `<...>` to spot the trailing `(`, so without this pass
  // the leading identifier stays `identifier` instead of `function`. runs
  // AFTER type_position_promoter so TPP's `looks_like_generic_args` still
  // sees the leading token as `identifier` and tags type args correctly,
  // and BEFORE class_name_promoter so PascalCase generic calls
  // (`Foo<T>()`) reach `function` rather than `class_name`.
  tag(promote_ts_generic_calls, ["function"]),
  // class_name_promoter retained for TS only — handles extends/implements
  // comma lists (interface J extends K, L; class C implements Foo, Bar)
  // and type-vs-class-name disambiguation inside generic constraints
  // (function f<T extends Base>). the JS grammar's class_name_pos covers
  // single-name and dotted-chain cases; this pass extends to lists and
  // demotes grammar-emitted class_name that should be type in TS context.
  tag(class_name_promoter, ["class_name"]),
  tag(promote_js_parameters, ["parameter"]),
  // last identifier-level pass: retag `<` / `>` that delimit type-argument
  // lists from `operator` to `punctuation`. all preceding passes that walk
  // angle groups (TPP, generic_calls, class_name_promoter, parameter
  // walker) need the original operator tokens, so this MUST stay at the
  // tail of the identifier rewriters.
  always(retag_generic_angles, "shape"),
  always(embed_interleaved({ scan: scan_tagged_template }), "embed"),
];
