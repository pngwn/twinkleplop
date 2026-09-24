// TypeScript reclassifiers.
//
// The JavaScript pipeline (function-variable detection, scope-aware property
// claims, tagged-template embedding) still applies. In addition, TypeScript
// runs the type-position rules: anchor-gated rewrite rules whose type_span()
// patterns claim identifiers appearing in type position as `type`, so custom
// type references (User, Promise, Array, ...) highlight the same as built-in
// types. See the "type position rules" section for the entry catalogue.

import type {
  ClaimFn,
  ClaimingReclassifier,
  FrameTable,
  LanguagePipeline,
  Reclassifier,
  RewriteRule,
} from "@twinkleplop/core";
import {
  FRAME_BRACKET_BRACE,
  FRAME_BRACKET_BRACKET,
  always,
  as_claim_producer,
  embed_interleaved,
  frame_track,
  make_token_view,
  precedence_for,
  promote_by_text_set,
  rewrite_types,
  seq,
  tag,
  type,
  type_span,
} from "@twinkleplop/core";

import {
  claim_property_scope,
  class_name_promoter,
  classify_reserved_names,
  function_variable_rules,
  EMBEDDED_GROUP_TRIGGERS,
  js_frame_spec,
  may_embed_groups,
  promote_boolean_literals,
  promote_call_site_functions,
  promote_js_const_bindings,
  promote_js_constants,
  promote_js_namespaces,
  promote_js_parameters,
  scan_embedded_groups,
  scan_jsdoc,
  scan_tagged_template,
} from "@twinkleplop/javascript";

import { BUILTIN_TYPES } from "./grammar.js";

export {
  claim_property_scope,
  class_name_promoter,
  classify_reserved_names,
  function_variable_rules,
  promote_boolean_literals,
  promote_call_site_functions,
  scan_embedded_groups,
  scan_jsdoc,
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

// keywords that reset the statement-context flags (start a fresh
// statement). deliberately excludes let / const / var / type, matching
// the imperative promoter this replaces: a declarator never cancelled
// the alias state machine and vice versa.
const STMT_STARTERS = [
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
];

// the shared js frame spec extended with the stream-continuous state the
// type-position rules need: per-frame ternary counting (so an annotation
// colon is distinguishable from `cond ? a : b`) and statement-context
// flags mirroring the imperative promoter's walker state -- var_decl
// (in_var_decl: a declarator keyword opened this statement), iface_head
// (between `interface` and its body brace, where `extends` introduces a
// type list), alias_head (between `type` and its `=`). all are armed on
// the frame that saw the keyword, hidden inside nested frames, and
// cleared by statement starters, `;`, and a closing brace. ternary
// counting is mode-blind, but type-level `? :` pairs (conditional types)
// are balanced, so the net effect at any later colon matches the
// mode-aware walker.
export const ts_frame_track = frame_track({
  ...js_frame_spec,
  ternary: { qmark: { type: "operator", text: "?" }, colon_char: ":" },
  stmt_flags: [
    {
      name: "var_decl",
      arm: { type: "keyword", texts: ["let", "const", "var"] },
      clear: { type: "keyword", texts: STMT_STARTERS },
      clear_chars: ";",
      clear_on_brace_close: true,
    },
    {
      name: "iface_head",
      arm: { type: "keyword", texts: ["interface"] },
      // the armer must not appear in its own clear list: arm and clear
      // triggers on the same text merge and clear wins.
      clear: { type: "keyword", texts: STMT_STARTERS.filter((k) => k !== "interface") },
      clear_chars: ";",
      clear_on_brace_close: true,
    },
    {
      name: "alias_head",
      arm: { type: "keyword", texts: ["type"] },
      clear: { type: "keyword", texts: STMT_STARTERS },
      clear_chars: ";",
      clear_on_brace_close: true,
    },
  ],
});

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
// type position rules
// ---------------------------------------------------------------------------
//
// declarative replacement for the imperative type_position_promoter walker:
// each of its nine type-mode entries is an anchor rule whose `when`
// pattern is a type_span() walk claiming every identifier in type
// position. the stream-continuous state the walker maintained itself now
// comes from ts_frame_track: ternary colon signals, the var_decl /
// iface_head / alias_head statement flags, and brace-kind frames.
//
// entries:
//   - `): T` return types (coalesced `):`  and spaced `) :` forms)
//   - `x: T` annotations, gated by position: parameter (paren frame),
//     field (class / interface frame), variable (top frame + var_decl).
//     an optional `x?: T` is the same colon token behind a `?`
//   - `as` / `satisfies` casts (end at a ternary `?`)
//   - `extends` in interface heads (iface_head armed) and type-parameter
//     constraints (`<T extends` / `, U extends`); class heritage matches
//     neither shape, so the superclass stays a value reference
//   - `implements` lists
//   - `Foo<T, U>` generic type arguments (verified angle group after a
//     name; `a < b` comparisons fail the verification)
//   - `type X = ...` alias right-hand sides (alias_head + top frame; the
//     generic `type X<T> = ...` form anchors on the `>` before the `=`)
//
// known limitations carried over from the imperative walker:
//   - generic type-args in value position (`foo<T>(x)`): the call target
//     stays function / identifier, but `T` still promotes.
//   - a colon coalesced with a following open bracket (`cb:(x)=>y` emits
//     one `:(` token) is not an anchor -- entries key on tokens ENDING
//     with `:`.
//
// one deliberate fix: when a cast ends at a ternary `?`
// (`const z = a as T ? b : c`), the matching `:` no longer reads as a
// variable annotation -- the frame tracker's mode-blind qmark counting
// survives the cast, where the old walker dropped the pending `?` on the
// cast's exit and then promoted the ternary's else branch.

// operators that unambiguously mean "value expression, not a type".
const VALUE_OP_TERMINATORS = [
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
];

// statement-starter keywords that terminate any type expression.
const STMT_KEYWORD_TERMINATORS = [
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
];

// keywords that can legitimately be the LAST token of a type expression.
// used by the brace exit so return annotations like `(): this {` and
// `(): T | undefined {` correctly terminate at the method body.
const TYPE_TERMINAL_KEYWORDS = [
  "this",
  "void",
  "undefined",
  "null",
  "never",
  "unknown",
  "any",
  "object",
];

const TS_SPAN_BASE = {
  into: "types",
  value_op_terminators: VALUE_OP_TERMINATORS,
  stmt_keyword_terminators: STMT_KEYWORD_TERMINATORS,
};

// `x: T` annotations: commas, `=` defaults, and value operators all end
// the type.
const annotation_span = type_span(TS_SPAN_BASE);
// `): T` return types additionally end at the method body brace.
const return_span = type_span({
  ...TS_SPAN_BASE,
  brace_exit_on_closer: true,
  type_terminal_keywords: TYPE_TERMINAL_KEYWORDS,
});
// extends / implements lists: commas separate more types; the body brace
// ends the list.
const heritage_span = type_span({
  ...TS_SPAN_BASE,
  exit_on_comma: false,
  brace_exit_on_closer: true,
  type_terminal_keywords: TYPE_TERMINAL_KEYWORDS,
});
// `as` / `satisfies` casts end at the first ternary `?`.
const cast_span = type_span({ ...TS_SPAN_BASE, exit_on_qmark: true });
// generic argument / parameter groups: the anchor `<` opened the angle
// group, commas separate arguments, `=` introduces default types.
const generics_span = type_span({
  ...TS_SPAN_BASE,
  enter_angle: true,
  exit_on_comma: false,
  exit_on_eq: false,
  verify_generic_args: true,
});

export const type_position_rules: RewriteRule[] = [
  // return type, coalesced form: the close paren shares the colon's
  // token (`):`,  `)):`,  ...). ordered before the bare-colon annotation
  // rules so a `):`  token resolves as a return type, never a parameter
  // annotation. a colon that consumed a ternary qmark is `cond ? f(x): y`
  // and never enters.
  {
    anchor: { type_name: "punctuation", value_ends_with: "):", ternary_colon: false },
    when: return_span,
    rewrite: { types: "type" },
  },
  // return type, spaced form: a bare `:` whose previous token ends with
  // the close paren.
  {
    anchor: { type_name: "punctuation", value: ":", ternary_colon: false },
    before: type("punctuation", ")"),
    when: return_span,
    rewrite: { types: "type" },
  },
  // parameter annotation: a colon directly inside a paren frame.
  {
    anchor: {
      type_name: "punctuation",
      value_ends_with: ":",
      ternary_colon: false,
      frame_kinds: ["paren"],
      frame_direct: true,
    },
    when: annotation_span,
    rewrite: { types: "type" },
  },
  // field annotation: a colon directly inside a class or interface body.
  // the suffix anchor also covers index signatures, whose `]` coalesces
  // with the colon (`[k: string]: V`).
  {
    anchor: {
      type_name: "punctuation",
      value_ends_with: ":",
      ternary_colon: false,
      frame_kinds: ["class", "interface"],
      frame_direct: true,
    },
    when: annotation_span,
    rewrite: { types: "type" },
  },
  // variable annotation: a colon at top level with a declarator armed.
  {
    anchor: {
      type_name: "punctuation",
      value_ends_with: ":",
      ternary_colon: false,
      frame_kinds: ["top"],
      frame_direct: true,
      stmt_flags_all: ["var_decl"],
    },
    when: annotation_span,
    rewrite: { types: "type" },
  },
  // `as` / `satisfies` casts.
  {
    anchor: { type_name: "keyword", value: ["as", "satisfies"] },
    when: cast_span,
    rewrite: { types: "type" },
  },
  // interface heritage: `interface I extends A, B`. the iface_head flag
  // is armed from the `interface` keyword to its body brace, so generic
  // heads (`interface I<T> extends ...`) need no lookbehind.
  {
    anchor: { type_name: "keyword", value: "extends", stmt_flags_all: ["iface_head"] },
    when: heritage_span,
    rewrite: { types: "type" },
  },
  // type-parameter constraints: `<T extends U>` and `, U extends V>`.
  // class heritage (`class C extends Base`) is preceded by the class
  // NAME whose own predecessor is the `class` keyword, matching neither
  // shape -- the superclass stays a value reference.
  {
    anchor: { type_name: "keyword", value: "extends" },
    before: seq(type("operator", "<"), type("identifier")),
    when: heritage_span,
    rewrite: { types: "type" },
  },
  {
    anchor: { type_name: "keyword", value: "extends" },
    before: seq(type("punctuation", ","), type("identifier")),
    when: heritage_span,
    rewrite: { types: "type" },
  },
  // implements lists are always type references.
  {
    anchor: { type_name: "keyword", value: "implements" },
    when: heritage_span,
    rewrite: { types: "type" },
  },
  // generic type arguments / parameters: `Foo<T, U>`, `function f<T>()`.
  // the span verifies the angle group before claiming, so comparisons
  // (`a < b`) fail the branch.
  {
    anchor: { type_name: "operator", value: "<" },
    before: type("identifier"),
    when: generics_span,
    rewrite: { types: "type" },
  },
  // alias right-hand side: `type X = ...`. the alias_head flag survives
  // the name and a generic parameter group, whose closing `>` directly
  // precedes the `=` in the second form.
  {
    anchor: {
      type_name: "operator",
      value: "=",
      stmt_flags_all: ["alias_head"],
      frame_kinds: ["top"],
      frame_direct: true,
    },
    before: type("identifier"),
    when: annotation_span,
    rewrite: { types: "type" },
  },
  {
    anchor: {
      type_name: "operator",
      value: "=",
      stmt_flags_all: ["alias_head"],
      frame_kinds: ["top"],
      frame_direct: true,
    },
    before: type("operator", ">"),
    when: annotation_span,
    rewrite: { types: "type" },
  },
];

// claims merge with the rest of the batch at the default `type`
// precedence (45), which beats function (30) / property (20) /
// identifier (0) -- the same precedence the imperative walker used.
export const type_position_promoter: ClaimingReclassifier = rewrite_types(type_position_rules, {
  trivia: ["comment"],
});

// tuple labels
// ---------------------------------------------------------------------------
//
// `start` in `[start: number]` (and `[b?: T]`, `[...rest: T[]]`) reads as
// `property`, like the key in `{ start: number }`. type_span() skips
// labels; this pass claims them, tagged `property` so `fidelity: ["type"]`
// leaves them as identifiers.
//
// a label is an identifier directly inside a bracket frame, first in its
// element, followed by `:`, `?:` or `?` `:`. the only other code with that
// shape is an index signature's key (`[k: string]: V`).
const TUPLE_LABEL_PREC = precedence_for("property");

const CH_COLON = 0x3a;
const CH_COMMA = 0x2c;
const CH_DOT = 0x2e;
const CH_QMARK = 0x3f;
const CH_BRACKET_OPEN = 0x5b;
const CH_BRACKET_CLOSE = 0x5d;

type View = ReturnType<typeof make_token_view>;

// is the token after `idx` a label's separator? the same forms
// type_span() accepts: a lone `:`, `?:`, or `?` then `:`.
function label_separator_follows(
  view: View,
  idx: number,
  punctuation_id: number,
  operator_id: number,
): boolean {
  const { input, tokens } = view;
  const nxt = view.next_non_trivia(idx + 1);
  if (nxt < 0) return false;
  const s = tokens[nxt * 3 + 1];
  const len = tokens[nxt * 3 + 2] - s;
  const c = input.charCodeAt(s);
  if (tokens[nxt * 3] === punctuation_id) return len === 1 && c === CH_COLON;
  if (tokens[nxt * 3] !== operator_id || c !== CH_QMARK) return false;
  if (len === 2) return input.charCodeAt(s + 1) === CH_COLON;
  if (len !== 1) return false;
  const after = view.next_non_trivia(nxt + 1);
  return (
    after >= 0 &&
    tokens[after * 3] === punctuation_id &&
    input.charCodeAt(tokens[after * 3 + 1]) === CH_COLON
  );
}

function ends_with_rest(input: string, s: number, e: number): boolean {
  return (
    e - s >= 3 &&
    input.charCodeAt(e - 1) === CH_DOT &&
    input.charCodeAt(e - 2) === CH_DOT &&
    input.charCodeAt(e - 3) === CH_DOT
  );
}

// an index signature's bracket sits directly in a brace body and closes
// onto a colon. a tuple can close onto one too, as a conditional type's
// true branch (`? [a: T] : U`), so a `?` before the bracket rules that
// out. `idx` is a token directly inside the bracket.
function opens_index_signature(
  view: View,
  frames: FrameTable,
  frame_idx: number,
  idx: number,
  punctuation_id: number,
  operator_id: number,
): boolean {
  const { input, tokens } = view;
  const frame = frames.frames[frame_idx];
  if (frame.parent < 0 || frames.frames[frame.parent].bracket !== FRAME_BRACKET_BRACE) {
    return false;
  }
  const open = frame.enter_idx;
  if (input.charCodeAt(tokens[open * 3 + 1]) === CH_BRACKET_OPEN) {
    const before = view.prev_non_trivia(open - 1);
    if (
      before >= 0 &&
      tokens[before * 3] === operator_id &&
      tokens[before * 3 + 2] - tokens[before * 3 + 1] === 1 &&
      input.charCodeAt(tokens[before * 3 + 1]) === CH_QMARK
    ) {
      return false;
    }
  }
  let depth = 1;
  for (let j = idx + 1; j < view.count; j++) {
    if (tokens[j * 3] !== punctuation_id) continue;
    const e = tokens[j * 3 + 2];
    for (let p = tokens[j * 3 + 1]; p < e; p++) {
      const c = input.charCodeAt(p);
      if (c === CH_BRACKET_OPEN) depth++;
      else if (c === CH_BRACKET_CLOSE && --depth === 0) {
        if (p + 1 < e) return input.charCodeAt(p + 1) === CH_COLON;
        const after = view.next_non_trivia(j + 1);
        return (
          after >= 0 &&
          tokens[after * 3] === punctuation_id &&
          input.charCodeAt(tokens[after * 3 + 1]) === CH_COLON
        );
      }
    }
  }
  return false;
}

const claim_tuple_labels_fn: ClaimFn = (input, tokens, token_types, sink, frames) => {
  if (frames === undefined) return;
  const identifier_id = token_types.indexOf("identifier");
  const punctuation_id = token_types.indexOf("punctuation");
  const operator_id = token_types.indexOf("operator");
  if (identifier_id < 0 || punctuation_id < 0 || operator_id < 0) return;
  const view = make_token_view(input, tokens, token_types);
  const n = view.count;
  const active = frames.active_frame;
  if (active.length < n) return;
  let property_id = -1;
  for (let i = 0; i < n; i++) {
    if (tokens[i * 3] !== identifier_id) continue;
    const frame_idx = active[i];
    if (frames.frames[frame_idx].bracket !== FRAME_BRACKET_BRACKET) continue;
    if (!label_separator_follows(view, i, punctuation_id, operator_id)) continue;
    const prev = view.prev_non_trivia(i - 1);
    if (prev < 0) continue;
    const ps = tokens[prev * 3 + 1];
    const pe = tokens[prev * 3 + 2];
    if (tokens[prev * 3] === punctuation_id) {
      const last = input.charCodeAt(pe - 1);
      if (last === CH_BRACKET_OPEN) {
        // only a first element can be an index signature's key.
        if (opens_index_signature(view, frames, frame_idx, i, punctuation_id, operator_id)) {
          continue;
        }
      } else if (last !== CH_COMMA && !ends_with_rest(input, ps, pe)) {
        continue;
      }
    } else if (
      tokens[prev * 3] !== operator_id ||
      pe - ps !== 3 ||
      !ends_with_rest(input, ps, pe)
    ) {
      continue;
    }
    if (property_id < 0) {
      property_id = token_types.indexOf("property");
      if (property_id < 0) {
        property_id = token_types.length;
        token_types.push("property");
      }
    }
    sink.emit(i, property_id, TUPLE_LABEL_PREC);
  }
};

// claim_property_scope plus tuple labels, as one batch member: both are
// `property` claims, and a separate producer would multiply the claim
// batch's permutation count in the order-independence test.
export const claim_ts_property_scope: ClaimingReclassifier = as_claim_producer(
  (input, tokens, token_types, sink, frames) => {
    claim_property_scope.__claim(input, tokens, token_types, sink, frames);
    claim_tuple_labels_fn(input, tokens, token_types, sink, frames);
  },
);

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
        } else if (brace_depth === 0 && (tt === ">" || tt === ">>" || tt === ">>>")) {
          // a run of `>` coalesces into one right-shift operator, so
          // `make<T extends Record<string, unknown>>(` closes both
          // groups on a single token.
          depth -= tt.length;
          if (depth <= 0) {
            matched_close = j;
            break;
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
  // read brace depths and at_start instead of maintaining its own. the TS
  // tracker extends the js spec with ternary / var_decl signals for the
  // type-position rules.
  always(ts_frame_track, "type_claim"),
  // see the note in the javascript package: correctness rather than
  // enrichment, and a barrier so the claim batch sees its output.
  always(classify_reserved_names, "shape"),
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
  tag(claim_ts_property_scope, ["property"]),
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
  // tagged templates and doc comments are both embeds, so they run at
  // every fidelity setting -- same rule as CSS inside a `<style>` tag.
  always(
    embed_interleaved({
      scan: scan_embedded_groups,
      trigger_types: EMBEDDED_GROUP_TRIGGERS,
      may_match: may_embed_groups,
    }),
    "embed",
  ),
];
