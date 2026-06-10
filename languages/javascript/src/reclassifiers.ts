// JavaScript reclassifier rules.
//
// Each rule is a pattern over the raw JS token stream produced by the main
// grammar. Running these as a post-pass lets us recognize things that the
// state machine alone can't express cheaply:
//
//   - Function variables (`const foo = () => ...` → foo becomes `function`)
//   - Tagged template literals (`` html`...` ``, `` css`...` ``) — the body
//     is tokenized with the HTML or CSS language and spliced into the JS
//     token stream via the generic `embed_interleaved` transform, which
//     handles interpolations (`${expr}`) correctly by giving the sub
//     language full state continuity across holes.
//
// Rules here are **additive**: consumers who import just `grammar` get the
// base tokenizer behavior unchanged; consumers who import `language` also
// get these reclassifiers applied automatically.

import {
  always,
  any_of,
  as_claim_producer,
  balanced_parens,
  embed_interleaved,
  FRAME_BRACKET_BRACE,
  frame_track,
  make_token_view,
  param_list,
  promote_by_text_set,
  promote_by_upper_snake_case,
  promote_function_calls,
  rewrite_types,
  seq,
  tag,
  type,
} from "@twinkleplop/core";
import type {
  ClaimFn,
  ClaimingReclassifier,
  LanguagePipeline,
  Reclassifier,
} from "@twinkleplop/core";

import { tokenize as css_tokenize } from "@twinkleplop/css";
// Cross-language references are imported lazily so the HTML ↔ JS workspace
// cycle (HTML embeds JS for `<script>`, JS embeds HTML for `` html`...` ``)
// resolves cleanly. The imported bindings may be `undefined` at module-eval
// time; by wrapping the factory calls in memoized closures we defer both
// the lookup AND the pipeline build until the sub language is actually
// invoked, by which point both modules are ready.
import { tokenize as html_tokenize } from "@twinkleplop/html";

import type { LanguageFn } from "@twinkleplop/core";

let html_fn: LanguageFn | undefined;
let css_fn: LanguageFn | undefined;
const html_default: LanguageFn = (src) => (html_fn ??= html_tokenize())(src);
const css_default: LanguageFn = (src) => (css_fn ??= css_tokenize())(src);

// ---------------------------------------------------------------------------
// function-variable detection
// ---------------------------------------------------------------------------
//
// Recognizes identifiers assigned an arrow or function expression, and object
// property keys whose value is an arrow or function expression. This mirrors
// Prism's `function-variable` pattern:
//
//   const foo = () => ...          → foo becomes `function`
//   const foo = (a, b) => ...      → foo becomes `function`
//   const foo = async () => ...    → foo becomes `function`
//   const foo = function() {}      → foo becomes `function`
//   const foo = async function()   → foo becomes `function`
//   const foo = x => ...           → foo becomes `function`
//   { foo: () => ... }             → foo becomes `function`
//
// Limitations (same as Prism):
//   - `const foo = cond ? () => 1 : () => 2` — not detected (intervening `?`)
//   - `const foo = (() => fn)()`  — incorrectly matches (parses as arrow)
//   - deeply nested params `((a, b), c) => ...` — handled up to max_tokens
//
// Trivia (comments) is skipped between pattern elements, so
// `const foo /* wat */ = () => 1` still matches.

const function_expression = any_of(
  // `function(...)` or bare `function` keyword
  type("keyword", "function"),
  // `async function(...)`
  seq(type("keyword", "async"), type("keyword", "function")),
);

const arrow_function = any_of(
  // `(...) => ...` — balanced param list followed by fat arrow
  seq(balanced_parens("(", ")"), type("operator", "=>")),
  // `async (...) => ...`
  seq(type("keyword", "async"), balanced_parens("(", ")"), type("operator", "=>")),
  // `x => ...` — single unparenthesized parameter
  seq(type("identifier"), type("operator", "=>")),
  // `async x => ...`
  seq(type("keyword", "async"), type("identifier"), type("operator", "=>")),
);

// rules that recognize a function-valued binding and rewrite the anchor
// identifier to `function`. these rules ONLY produce `function` tokens, so
// they're safe to tag with exactly one `produces` entry.
//
// the rule set is intentionally narrow: ONLY `ident = arrow|fn` assignments.
// object-literal method shorthand (`{ foo: () => 1 }`) and type annotations
// (`interface I { cb: () => X }`, `class C { h: () => void }`) used to be
// handled here too, but that was a scope-blind rewrite — it overclaimed in
// class/interface/param contexts and had to be patched up by a demote pass
// and an interface-member re-promoter. step 6 moved all `ident :`
// classification into `claim_property_scope`, which has the scope context
// to make the right decision in one claim. assignment `=` has no such
// ambiguity: wherever `ident = arrow` appears, ident is a function binding.
export const function_variable_rules = [
  {
    anchor: "identifier",
    when: seq(type("operator", ["="]), any_of(function_expression, arrow_function)),
    rewrite: "function",
  },
];

// ---------------------------------------------------------------------------
// property claim pass — scope-aware, single-pass, claim-producing
// ---------------------------------------------------------------------------
//
// emits a `property` claim for every identifier in property-key position
// (member start of an object literal, type literal, or interface body).
// scope classification, at_start tracking, and modifier transparency all
// come from the upstream frame_track stage -- this pass only reads the
// frame table and inspects the tokens around each candidate identifier.
//
// this single pass replaces three older reclassifiers:
//   - property_rules (rewrite_types DSL with exclusion rules)
//   - interface_member_promoter (stateful walker)
//   - class_field_demoter (post-hoc fixup)
//
// the key design decision: scope-aware claim EMISSION rather than
// claim-then-demote. class fields never get a property claim (class-kind
// frames are excluded at emit time), so no fixup pass is needed.
//
// frame kinds (from js_frame_track's brace_kinds spec):
//   class       — body of `class Foo { ... }` — NEVER claim.
//   interface   — body of `interface Foo { ... }` — claim.
//   object      — object literal / destructure pattern — claim.
//   type_literal — `: { ... }` annotation shapes — claim.
//   block / paren / bracket — NEVER claim (labeled statements, params,
//                 arrays, computed keys).

// a `:` whose next non-trivia is one of these keywords is a labeled
// statement introducer, not an object-property separator.
const LABEL_STATEMENT_KEYWORDS = new Set(["for", "while", "do", "if", "switch", "try", "with"]);

// step-6 precedence scheme. the goal is "one claim per token" — no two
// passes should emit different target types for the same position. this
// pass is now the SOLE owner of `ident :` classification:
//
//   OBJECT  literal `{ k : v }`:
//     - value is arrow / function  → claim FUNCTION at 30 (method shorthand)
//     - otherwise                  → claim PROPERTY at 20
//   INTERFACE body / TYPE LITERAL:
//     - always                     → claim PROPERTY at 20
//   CLASS / PAREN / BRACKET / BLOCK:
//     - never claims
//
// function_variable_rules was simultaneously narrowed to handle only `ident
// = value` (assignment), so there's no longer any overlap between the two
// passes. TPP dropped its annotation-position identifier claim at the same
// time — it's no longer needed because fn_var doesn't overclaim.
const PROP_PREC = 20;
const PROP_FN_PREC = 30; // matches the default `function` precedence.

const claim_property_scope_fn: ClaimFn = (input, tokens, token_types, sink, frames) => {
  const view = make_token_view(input, tokens, token_types);
  if (view.count === 0) return;
  // requires a frame_track stage upstream. without it, scope-aware claims
  // cannot fire -- skip the pass cleanly so a misconfigured pipeline produces
  // no claims rather than throwing in the hot path.
  if (frames === undefined) return;

  const identifier_id = token_types.indexOf("identifier");
  const keyword_id = token_types.indexOf("keyword");
  const punctuation_id = token_types.indexOf("punctuation");
  const operator_id = token_types.indexOf("operator");

  if (identifier_id < 0 || keyword_id < 0 || punctuation_id < 0 || operator_id < 0) {
    return;
  }

  let property_id = token_types.indexOf("property");
  if (property_id < 0) {
    property_id = token_types.length;
    token_types.push("property");
  }
  let function_id = token_types.indexOf("function");
  if (function_id < 0) {
    function_id = token_types.length;
    token_types.push("function");
  }

  // brace kinds come from the frame table -- js_frame_track's brace_kinds
  // spec owns the class / interface / object / type_literal / block
  // classification. resolve the claimable kind ids once per call.
  const kind_names = frames.kind_names;
  const object_kind = kind_names.indexOf("object");
  const interface_kind = kind_names.indexOf("interface");
  const type_literal_kind = kind_names.indexOf("type_literal");
  if (object_kind < 0 && interface_kind < 0 && type_literal_kind < 0) return;

  // peek past `:` at idx (the colon itself) to decide whether the value
  // is an arrow or function expression — i.e. whether the key of an
  // OBJECT literal should be classified as `function` (method shorthand)
  // rather than `property`. returns true when the value shape is any of
  // `function`, `async function`, `(...) =>`, `async (...) =>`,
  // `ident =>`, `async ident =>`. mirrors the patterns that
  // `function_variable_rules` used to match for `:`.
  const is_function_value = (colon_idx: number): boolean => {
    let j = view.next_non_trivia(colon_idx + 1);
    if (j < 0) return false;
    // optional leading `async`.
    if (view.kind_of(j) === keyword_id && view.text_of(j) === "async") {
      j = view.next_non_trivia(j + 1);
      if (j < 0) return false;
    }
    // `function` keyword → function expression.
    if (view.kind_of(j) === keyword_id && view.text_of(j) === "function") {
      return true;
    }
    // `ident =>` — single-param arrow without parens.
    if (view.kind_of(j) === identifier_id) {
      const after = view.next_non_trivia(j + 1);
      if (after >= 0 && view.kind_of(after) === operator_id && view.text_of(after) === "=>") {
        return true;
      }
      return false;
    }
    // `(...) =>` — arrow with parameter list. walk balanced parens in
    // punctuation tokens and look for `=>` after the matching `)`.
    if (view.kind_of(j) === punctuation_id) {
      const t = view.text_of(j);
      if (t.length === 0 || t[0] !== "(") return false;
      let depth = 0;
      let end_idx = -1;
      const max = Math.min(view.count, j + 200);
      outer: for (let k = j; k < max; k++) {
        if (view.kind_of(k) !== punctuation_id) continue;
        const tt = view.text_of(k);
        for (let c = 0; c < tt.length; c++) {
          const ch = tt[c];
          if (ch === "(") depth++;
          else if (ch === ")") {
            depth--;
            if (depth === 0) {
              end_idx = k;
              break outer;
            }
          }
        }
      }
      if (end_idx < 0) return false;
      const after = view.next_non_trivia(end_idx + 1);
      return after >= 0 && view.kind_of(after) === operator_id && view.text_of(after) === "=>";
    }
    return false;
  };

  const at_start_arr = frames.at_start;
  const active = frames.active_frame;
  const frame_list = frames.frames;

  // only identifiers at member-start positions need any work -- frame_track
  // owns scope classification and at_start, so every other token type falls
  // through with two integer compares.
  for (let i = 0; i < view.count; i++) {
    if (view.kind_of(i) !== identifier_id) continue;
    if (at_start_arr[i] !== 1) continue;

    // nearest enclosing BRACE frame: the active frame may be a paren or
    // bracket (e.g. after a `,` re-arm inside an argument list); walk the
    // parent chain so the kind test matches the old brace-only stack.
    let fi = active[i];
    let fr = frame_list[fi];
    while (fi > 0 && fr.bracket !== FRAME_BRACKET_BRACE) {
      fi = fr.parent;
      fr = frame_list[fi];
    }
    if (fr.bracket !== FRAME_BRACKET_BRACE) continue;
    const top = fr.kind;
    if (top !== object_kind && top !== interface_kind && top !== type_literal_kind) continue;

    const nxt = view.next_non_trivia(i + 1);
    if (nxt < 0) continue;
    const nk = view.kind_of(nxt);
    const nt = view.text_of(nxt);
    let is_colon = (nk === punctuation_id && nt === ":") || (nk === operator_id && nt === "?:");
    let colon_idx = nxt;
    if (!is_colon && nk === operator_id && nt === "?") {
      const after_q = view.next_non_trivia(nxt + 1);
      if (
        after_q >= 0 &&
        view.kind_of(after_q) === punctuation_id &&
        view.text_of(after_q) === ":"
      ) {
        is_colon = true;
        colon_idx = after_q;
      }
    }
    if (!is_colon) continue;
    const after = view.next_non_trivia(colon_idx + 1);
    let is_label = false;
    if (after >= 0 && view.kind_of(after) === keyword_id) {
      is_label = LABEL_STATEMENT_KEYWORDS.has(view.text_of(after));
    }
    if (is_label) continue;
    if (top === object_kind && is_function_value(colon_idx)) {
      sink.emit(i, function_id, PROP_FN_PREC);
    } else {
      sink.emit(i, property_id, PROP_PREC);
    }
  }
};

export const claim_property_scope: ClaimingReclassifier =
  as_claim_producer(claim_property_scope_fn);

// shared frame_track config for JS/TS/TSX/Svelte. exported so language
// packages that reuse claim_property_scope insert the same frame_track stage
// upstream in their own pipelines -- otherwise claim_property_scope has no
// frames to read from and emits no claims.
export const js_frame_track = frame_track({
  punct_type: "punctuation",
  brackets: {
    paren: { open: "(", close: ")" },
    brace: { open: "{", close: "}" },
    bracket: { open: "[", close: "]" },
  },
  brace_kinds: {
    body_markers: [
      { type: "keyword", text: "class", kind: "class" },
      { type: "keyword", text: "interface", kind: "interface" },
    ],
    // a `{` inside a generic constraint while a body marker is armed is a
    // type literal -- `class C<T extends { id: V }> { ... }`.
    pending_in_angles_kind: "type_literal",
    angles: {
      type: "operator",
      open: "<",
      closes: [
        { text: ">", pops: 1 },
        { text: ">>", pops: 2 },
        { text: ">>>", pops: 3 },
      ],
    },
    prev_rules: [
      { prev_type: "operator", prev_texts: ["=>"], kind: "block" },
      // `:` is punctuation in the grammar (separator, not operator); a
      // brace after it is an annotation / return-position type literal.
      { prev_type: "punctuation", prev_texts: [":"], kind: "type_literal" },
      { prev_type: "keyword", prev_texts: ["do", "try", "else", "finally"], kind: "block" },
      { prev_type: "punctuation", prev_last_char_in: ")", kind: "block" },
    ],
    default_kind: "object",
    start_kind: "block",
  },
  at_start: {
    reset_chars: ",;",
    // class / interface members have no separator between a method's
    // closing `}` and the next member name.
    rearm_after_close_kinds: ["class", "interface"],
    transparent_texts_for_type: [
      {
        type: "keyword",
        texts: [
          "readonly",
          "public",
          "private",
          "protected",
          "static",
          "abstract",
          "override",
          "accessor",
          "declare",
          "class",
          "interface",
          "get",
          "set",
          "async",
        ],
      },
      // generator marker stays transparent so `*gen() {}` still sees the
      // method name at member start.
      { type: "operator", texts: ["*"] },
    ],
  },
});

// ---------------------------------------------------------------------------
// Tagged template literal embedding
// ---------------------------------------------------------------------------
//
// A single scanner recognizes `` html`...` `` and `` css`...` `` tagged
// templates, describing each as a GroupDescriptor for the generic
// `embed_interleaved` transform. The transform handles the rest:
//
//   1. Builds a virtual source by concatenating template content chunks
//      with space-filled interpolation holes.
//   2. Tokenizes it in ONE call to the sub language (HTML or CSS),
//      giving the sub language full state continuity across holes — so
//      attribute-position interpolations like `<p class="${cls}">hi</p>`
//      work correctly: the sub tokenizer sees a well-formed attribute
//      value and emits a single string token, which is then split at the
//      hole boundary in the output.
//   3. Splices the result back into the JS stream, preserving the
//      original interpolation tokens (`${`, expression, `}`) verbatim.
//
// The backticks at the start and end of the template are emitted as
// synthetic `template` tokens so they stay styled.

// per-token_types type_id cache. The scanner is called once per host token
// position in the stream, which means a naive `token_types.indexOf(...)` per
// call costs O(n * m) per tokenize pass (n = token count, m = types per
// lookup). We memoize on the token_types array reference — a WeakMap lets
// different compiled grammars share one scanner without holding onto their
// token_types arrays once they go out of scope.
const type_id_cache = new WeakMap();

function get_type_ids(token_types) {
  let ids = type_id_cache.get(token_types);
  if (ids === undefined) {
    ids = {
      identifier_id: token_types.indexOf("identifier"),
      template_id: token_types.indexOf("template"),
      punctuation_id: token_types.indexOf("punctuation"),
    };
    type_id_cache.set(token_types, ids);
  }
  return ids;
}

/**
 * Scanner called at each host token position. Returns a GroupDescriptor if
 * a tagged template starts here, or null otherwise.
 *
 * @param {Uint32Array} tokens
 * @param {string} input
 * @param {number} i
 * @param {string[]} token_types
 * @returns {import("@twinkleplop/core").GroupDescriptor | null}
 */
export function scan_tagged_template(tokens, input, i, token_types) {
  const { identifier_id, template_id, punctuation_id } = get_type_ids(token_types);
  if (identifier_id < 0 || template_id < 0 || punctuation_id < 0) return null;
  const count = tokens.length / 3;
  if (i >= count) return null;

  // fast reject: trigger is an identifier. If the current token isn't an
  // identifier, no work to do — this rejects 99% of positions on a typical
  // token stream before any source-text comparison.
  if (tokens[i * 3] !== identifier_id) return null;
  const tag_start = tokens[i * 3 + 1];
  const tag_end = tokens[i * 3 + 2];
  const tag_name = input.slice(tag_start, tag_end);
  let language: LanguageFn;
  if (tag_name === "html") language = html_default;
  else if (tag_name === "css") language = css_default;
  else return null;

  const first_chunk = i + 1;
  if (first_chunk >= count || tokens[first_chunk * 3] !== template_id) return null;
  const first_start = tokens[first_chunk * 3 + 1];
  if (input[first_start] !== "`") return null;

  const regions = [];
  // opening backtick as a synthetic template token (one char).
  regions.push({
    kind: "synthetic",
    source_start: first_start,
    source_end: first_start + 1,
    type_name: "template",
  });

  let k = first_chunk;
  let in_hole = false;
  let depth = 0;
  let hole_tok_start = 0;
  let hole_source_start = 0;

  while (k < count) {
    const tk = tokens[k * 3];
    const ts = tokens[k * 3 + 1];
    const te = tokens[k * 3 + 2];

    if (!in_hole) {
      if (tk === template_id) {
        // a content chunk. The first chunk has a leading backtick;
        // the last chunk has a trailing backtick (marking end of
        // group). Both can be the same chunk for a non-interpolated
        // template like `html`<div></div>`` — in which case the
        // single token contains both backticks. BUT for a 1-char
        // first chunk (a bare opening backtick followed immediately
        // by `${`, as in `html`${x}``), the single char is ONLY the
        // opening — it is not simultaneously a closing. `start_offset`
        // below guards against treating the same byte as both.
        const is_first = k === first_chunk;
        const start_offset = is_first ? 1 : 0;
        const has_closing_backtick = te - ts > start_offset && input[te - 1] === "`";
        const content_start = ts + start_offset;
        const content_end = has_closing_backtick ? te - 1 : te;
        if (content_end > content_start) {
          regions.push({
            kind: "content",
            source_start: content_start,
            source_end: content_end,
          });
        }
        k++;
        if (has_closing_backtick) {
          // closing backtick as a synthetic template token.
          regions.push({
            kind: "synthetic",
            source_start: te - 1,
            source_end: te,
            type_name: "template",
          });
          // the trigger identifier (`html`/`css`) stays in the
          // host stream — only the template chunks + interpolations
          // are replaced.
          return {
            token_start: first_chunk,
            token_end: k,
            regions,
            language,
          };
        }
      } else if (tk === punctuation_id && input.slice(ts, te) === "${") {
        // start of interpolation hole. Brace depth begins at 1.
        in_hole = true;
        hole_tok_start = k;
        hole_source_start = ts;
        depth = 1;
        k++;
      } else {
        // unexpected token between template chunks → malformed. Bail.
        return null;
      }
    } else {
      // inside an interpolation. Track brace depth via any `{` / `}`
      // chars that appear in punctuation tokens (object literals,
      // function bodies, nested `${` all contribute).
      if (tk === punctuation_id) {
        const src = input.slice(ts, te);
        for (let c = 0; c < src.length; c++) {
          const ch = src.charCodeAt(c);
          if (ch === 0x7b /* { */) depth++;
          else if (ch === 0x7d /* } */) depth--;
        }
        if (depth === 0) {
          // hole closes at this token. Record it and resume content.
          regions.push({
            kind: "hole",
            source_start: hole_source_start,
            source_end: te,
            token_start: hole_tok_start,
            token_end: k + 1,
          });
          in_hole = false;
        }
      }
      k++;
    }
  }
  // ran off the end without a closing backtick — malformed template.
  return null;
}

// ---------------------------------------------------------------------------
// class_name_promoter
// ---------------------------------------------------------------------------
//
// Promotes identifiers to `class_name` when they appear in positions that
// syntactically denote a class/interface name:
//
//   class Foo { }                     Foo
//   class Foo extends Bar { }         Foo, Bar
//   class Foo extends pkg.Bar { }     Foo, Bar   (only the last in a chain)
//   class Foo<T> extends Bar<U> { }   Foo, Bar   (generics skipped)
//   class Foo implements A, B { }     Foo, A, B
//   interface Foo { }                 Foo
//   interface Foo extends A, B { }    Foo, A, B
//   new Foo()                         Foo
//   new pkg.util.Foo()                Foo       (last-in-chain)
//   x instanceof Foo                  Foo
//
// This pass runs AFTER function_variable_rules and (in TypeScript) AFTER
// type_position_promoter, so it can upgrade either `identifier` or `type`
// tokens that sit in these positions.

export const class_name_promoter: Reclassifier = (input, result) => {
  const { tokens, token_types } = result;
  const view = make_token_view(input, tokens, token_types);
  const n = view.count;
  if (n === 0) return result;

  const identifier_id = token_types.indexOf("identifier");
  const keyword_id = token_types.indexOf("keyword");
  const punctuation_id = token_types.indexOf("punctuation");
  const operator_id = token_types.indexOf("operator");
  const type_id = token_types.indexOf("type");
  const function_id = token_types.indexOf("function");

  if (identifier_id < 0 || keyword_id < 0) return result;

  let class_name_id = token_types.indexOf("class_name");
  if (class_name_id < 0) {
    class_name_id = token_types.length;
    token_types.push("class_name");
  }

  // next-non-trivia convention for this pass matches the rest: returns
  // the index of the first non-trivia at or after `from`, or -1. the old
  // implementation returned `n` on failure; keep the same caller shape
  // by checking `>= 0` instead of `< n`.
  const skip_trivia = (from: number): number => view.next_non_trivia(from);

  // a name-shaped token: identifier, TS `type` (our own pass may have
  // already promoted it), or `function` (the JS probe mis-classifies
  // `new Foo(`, `instanceof Foo` as `function` because of the trailing
  // `(`). all three are eligible for re-promotion to `class_name`.
  const is_name_token = (i: number): boolean => {
    if (i < 0 || i >= n) return false;
    const k = view.kind_of(i);
    return k === identifier_id || k === type_id || k === function_id;
  };

  // skip a balanced `<...>` angle group starting at `from` (which points at
  // the opening `<`). returns the index after the closing `>`.
  const skip_angles = (from: number): number => {
    if (from < 0 || from >= n) return from;
    if (view.kind_of(from) !== operator_id || view.text_of(from) !== "<") {
      return from;
    }
    let depth = 1;
    let j = from + 1;
    while (j < n && depth > 0) {
      if (!view.is_trivia(j) && view.kind_of(j) === operator_id) {
        const t = view.text_of(j);
        if (t === "<") depth++;
        else if (t === ">") depth--;
      }
      j++;
    }
    return j;
  };

  // walk a dotted identifier chain (`foo.bar.Baz`), promote the LAST
  // identifier to `class_name`. returns index after the chain.
  const promote_chain_last = (from: number): number => {
    let j = skip_trivia(from);
    let last = -1;
    while (j >= 0 && j < n) {
      if (!is_name_token(j)) break;
      last = j;
      j = skip_trivia(j + 1);
      if (j >= 0 && view.kind_of(j) === punctuation_id && view.text_of(j) === ".") {
        j = skip_trivia(j + 1);
        continue;
      }
      break;
    }
    if (last >= 0) tokens[last * 3] = class_name_id;
    return j < 0 ? n : j;
  };

  // walk a comma-separated list of (chain [<generics>]) entries. returns
  // index after the list.
  const promote_list = (from: number): number => {
    let j = skip_trivia(from);
    while (j >= 0 && j < n) {
      if (!is_name_token(j)) break;
      j = promote_chain_last(j);
      j = skip_trivia(j);
      if (j >= 0 && view.kind_of(j) === operator_id && view.text_of(j) === "<") {
        j = skip_angles(j);
        j = skip_trivia(j);
      }
      if (j >= 0 && view.kind_of(j) === punctuation_id && view.text_of(j) === ",") {
        j = skip_trivia(j + 1);
        continue;
      }
      break;
    }
    return j < 0 ? n : j;
  };

  for (let i = 0; i < n; i++) {
    if (view.is_trivia(i)) continue;
    if (view.kind_of(i) !== keyword_id) continue;
    const kw = view.text_of(i);

    if (kw === "class" || kw === "interface") {
      // head: [name] [<...>] [extends LIST]* [implements LIST]?  {
      let j = skip_trivia(i + 1);
      if (is_name_token(j)) {
        tokens[j * 3] = class_name_id;
        j = skip_trivia(j + 1);
      }
      if (j >= 0 && view.kind_of(j) === operator_id && view.text_of(j) === "<") {
        j = skip_angles(j);
        j = skip_trivia(j);
      }
      // extends / implements can appear in either order syntactically,
      // but typescript only accepts extends-before-implements. allow
      // both and iterate up to twice.
      for (let iter = 0; iter < 2; iter++) {
        j = skip_trivia(j);
        if (
          j >= 0 &&
          view.kind_of(j) === keyword_id &&
          (view.text_of(j) === "extends" || view.text_of(j) === "implements")
        ) {
          j = promote_list(j + 1);
          continue;
        }
        break;
      }
      continue;
    }

    if (kw === "new" || kw === "instanceof") {
      promote_chain_last(i + 1);
      continue;
    }
  }

  return result;
};

// restoration of distinctions the grammar no longer emits. the grammar
// emits every call-site name and every "true"/"false" as `identifier`;
// these two passes restore the `function` and `boolean` token types so
// themes that rely on them keep working by default.
export const promote_boolean_literals: Reclassifier = promote_by_text_set("identifier", "boolean", [
  "true",
  "false",
]);

export const promote_call_site_functions: Reclassifier = promote_function_calls(
  "identifier",
  "function",
  { plain: true },
  { trivia: ["comment"] },
);

// UPPER_SNAKE_CASE identifiers read as convention-declared constants in JS
// (e.g. `MAX_SIZE`, `PI`, `HTTP_STATUS`). purely text-predicated so it's
// safe everywhere — function / property passes already work on the
// `identifier` stream they observe post-promotion.
export const promote_js_constants: Reclassifier = promote_by_upper_snake_case(
  "identifier",
  "constant",
);

// promotes identifiers introduced by a `const` declaration to `constant`.
// covers simple bindings (`const x = 1`), comma-separated bindings
// (`const x = 1, y = 2`), object destructuring with renaming / defaults
// / rest (`const { a, b: c, d = 5, ...rest } = o`), array destructuring
// (`const [a, , b, ...r] = arr`), and nested patterns. the pass only
// rewrites tokens whose current kind is still `identifier`, so anything
// already promoted upstream (e.g. `const foo = () => ...` → `function`
// via function_variable_rules) keeps its upstream classification. TS-
// style type annotations (`const x: Map<K, V> = foo`) are treated as
// RHS and their contents aren't tagged; the binding identifier (`x`)
// is still tagged.
export const promote_js_const_bindings: Reclassifier = (input, result) => {
  const { tokens, token_types } = result;
  const identifier_id = token_types.indexOf("identifier");
  const keyword_id = token_types.indexOf("keyword");
  const operator_id = token_types.indexOf("operator");
  const punctuation_id = token_types.indexOf("punctuation");
  if (identifier_id < 0 || keyword_id < 0 || operator_id < 0 || punctuation_id < 0) {
    return result;
  }
  let constant_id = token_types.indexOf("constant");
  if (constant_id < 0) {
    constant_id = token_types.length;
    token_types.push("constant");
  }

  const view = make_token_view(input, tokens, token_types);
  const n = view.count;

  for (let i = 0; i < n; i++) {
    if (view.is_trivia(i)) continue;
    if (view.kind_of(i) !== keyword_id) continue;
    if (view.text_of(i) !== "const") continue;

    // bracket depth of destructuring patterns; depth 0 is the top of the
    // binding list. the parallel is_object_pattern stack records whether
    // each open bracket is `{` — inside `{...}` an identifier followed
    // by `:` is the SOURCE key, not the binding.
    let depth = 0;
    const is_object_pattern: boolean[] = [];
    // tracks `<...>` for TS generic arguments while skipping a type
    // annotation or RHS expression. commas inside `<>` must not be
    // treated as binding-list separators.
    let angle_depth = 0;
    // next identifier is a new binding position (true just past `const`,
    // past `,` at any depth, past `:` inside an object pattern, or past
    // `...` rest marker).
    let at_binding_start = true;
    // inside `= expr` or `: TypeAnnotation` — don't tag identifiers.
    // resets at `,` at or below skip_base_depth, or at matching bracket
    // pop, or at `;` at depth 0.
    let skipping_rhs = false;
    let skip_base_depth = 0;

    let k = view.next_non_trivia(i + 1);
    if (k < 0) continue;
    for (; k < n; k++) {
      if (view.is_trivia(k)) continue;
      const kind = view.kind_of(k);
      const text = view.text_of(k);

      if (kind === punctuation_id) {
        for (let c = 0; c < text.length; c++) {
          const ch = text[c];
          if (ch === "{") {
            depth++;
            is_object_pattern.push(true);
            at_binding_start = true;
          } else if (ch === "[") {
            depth++;
            is_object_pattern.push(false);
            at_binding_start = true;
          } else if (ch === "(") {
            depth++;
            is_object_pattern.push(false);
            at_binding_start = false;
          } else if (ch === "}" || ch === "]" || ch === ")") {
            if (depth === 0) {
              k = n;
              break;
            }
            depth--;
            is_object_pattern.pop();
            if (skipping_rhs && depth < skip_base_depth) {
              skipping_rhs = false;
            }
            at_binding_start = false;
          } else if (ch === ",") {
            if (skipping_rhs && depth === skip_base_depth && angle_depth === 0) {
              skipping_rhs = false;
            }
            if (!skipping_rhs) at_binding_start = true;
          } else if (ch === ";") {
            if (depth === 0) {
              k = n;
              break;
            }
          } else if (ch === ":") {
            if (depth > 0 && is_object_pattern[is_object_pattern.length - 1]) {
              at_binding_start = true;
            } else if (!skipping_rhs) {
              skipping_rhs = true;
              skip_base_depth = depth;
            }
          } else {
            at_binding_start = false;
          }
        }
        continue;
      }

      if (kind === operator_id) {
        if (text === "<") {
          angle_depth++;
          at_binding_start = false;
          continue;
        }
        if (text === ">") {
          if (angle_depth > 0) angle_depth--;
          at_binding_start = false;
          continue;
        }
        if (text === ">>") {
          if (angle_depth >= 2) angle_depth -= 2;
          else angle_depth = 0;
          at_binding_start = false;
          continue;
        }
        if (text === ">>>") {
          if (angle_depth >= 3) angle_depth -= 3;
          else angle_depth = 0;
          at_binding_start = false;
          continue;
        }
        if (text === "=" && !skipping_rhs) {
          skipping_rhs = true;
          skip_base_depth = depth;
          at_binding_start = false;
          continue;
        }
        if (text === "..." && !skipping_rhs) {
          at_binding_start = true;
          continue;
        }
        at_binding_start = false;
        continue;
      }

      if (kind === keyword_id) {
        // `for (const x of xs)` / `for (const x in xs)` — the scanner
        // has already tagged `x` by the time we reach `of`/`in`. stop
        // here so we don't walk into the iterable expression.
        if ((text === "of" || text === "in") && depth === 0) {
          k = n;
          break;
        }
        at_binding_start = false;
        continue;
      }

      if (kind === identifier_id && !skipping_rhs && at_binding_start) {
        const in_object_pattern = depth > 0 && is_object_pattern[is_object_pattern.length - 1];
        let is_source_key = false;
        if (in_object_pattern) {
          const nxt = view.next_non_trivia(k + 1);
          if (nxt >= 0 && view.kind_of(nxt) === punctuation_id && view.text_of(nxt) === ":") {
            is_source_key = true;
          }
        }
        if (!is_source_key) {
          tokens[k * 3] = constant_id;
        }
      }
      at_binding_start = false;
    }
  }

  return { tokens, token_types };
};

// parameter promotion: tag identifiers in parameter position as `parameter`.
// covers every function form:
//   - function declarations / expressions:  `function f(a, b) {}`
//   - generator / async variants:            `async function* f(a) {}`
//   - arrow functions with paren param list: `(a, b) => ...`
//   - single-ident arrows:                   `x => ...`, `async x => ...`
//   - class methods and accessors:           `class C { m(a){} get p(){} set p(v){} *g(){} }`
//   - object method shorthand:               `{ m(a){} get p(){} }`
// strategy: one linear pass with a small brace-scope stack that distinguishes
// class / interface / object-literal bodies from plain blocks. at each `(`
// we peek for `=>` after the matching `)` (skipping an optional TS return
// type) to detect arrow parameter lists; at each identifier in a member-
// start position we peek for `(` to detect method shorthand. the param
// walker then tags identifiers at paren-depth 1, transparent to `...rest`,
// and skips defaults / destructuring sub-trees.
//
// keywords that keep the member-start marker live in a class / object /
// interface body: accessor (`get`, `set`), the async modifier, and the TS
// member modifiers. a leading `*` for generators is likewise transparent.
const METHOD_LEADING_KEYWORDS = new Set([
  "get",
  "set",
  "async",
  "readonly",
  "public",
  "private",
  "protected",
  "static",
  "abstract",
  "override",
  "accessor",
  "declare",
]);

// promote_js_parameters is now a `param_list` primitive configuration: the
// JS family's four canonical param-list opener patterns plus the standard
// walk behaviour (tag identifiers at depth 1, transparent to `...rest`,
// suspend tagging after `=` until the next `,`). the primitive lives in
// lib/core and is reused by TS / TSX with the same config.
export const promote_js_parameters: Reclassifier = param_list({
  result_type: "parameter",
  default_introducer: "=",
  transparent_operators: ["..."],
  detectors: [
    // function declaration / expression: function [*] [name] [<generics>] (
    {
      kind: "after_keyword",
      keyword: "function",
      skip_generator_star: true,
      skip_optional_name: true,
      skip_optional_generics: true,
    },
    // member method: identifier (or method-leading keyword) at member-start
    // in a class / object / interface body, followed by `(`. interface
    // method signatures get the same treatment as class methods so their
    // param names highlight the same way users expect.
    {
      kind: "member_method",
      in_brace_kinds: ["class", "object", "interface"],
      method_leading_keywords: Array.from(METHOD_LEADING_KEYWORDS),
    },
    // arrow function `(...) =>`, including `(x): T => ...` (TS return type).
    // skipped when in type position (`: (x: T) => Y` is a type signature).
    {
      kind: "arrow_paren",
      skip_ts_return_type: true,
      skip_in_type_position: true,
    },
    // single-identifier arrow: `x => ...`. tags the identifier itself.
    { kind: "single_ident_arrow" },
  ],
});

// namespace promotion: targets positions where the syntax unambiguously
// marks an identifier as a module/namespace binding. covers:
//   - `import * as X from "..."`  → X = namespace  (both JS and TS)
//   - `export * as X from "..."`  → X = namespace  (both JS and TS)
//   - `import X = require("...")` → X = namespace  (TS)
//   - `namespace X { ... }`       → X = namespace  (TS)
//   - `module X { ... }`          → X = namespace  (TS, deprecated)
// everything else (default imports, dotted property chains) is left alone
// because identifying those as namespace would need scope tracking.
export const promote_js_namespaces: Reclassifier = (input, result) => {
  const { tokens, token_types } = result;
  const identifier_id = token_types.indexOf("identifier");
  const keyword_id = token_types.indexOf("keyword");
  const operator_id = token_types.indexOf("operator");
  if (identifier_id < 0 || keyword_id < 0) return result;
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

    // `import * as X from "..."` / `export * as X from "..."` — X is a
    // namespace binding. same shape after the keyword, so both branches
    // share the lookahead.
    if (kw === "import" || kw === "export") {
      const j = view.next_non_trivia(i + 1);
      if (j < 0 || view.kind_of(j) !== operator_id || view.text_of(j) !== "*") {
        continue;
      }
      const as = view.next_non_trivia(j + 1);
      if (as < 0 || view.kind_of(as) !== keyword_id || view.text_of(as) !== "as") {
        continue;
      }
      const name = view.next_non_trivia(as + 1);
      if (name >= 0 && view.kind_of(name) === identifier_id) {
        tokens[name * 3] = namespace_id;
      }
      continue;
    }

    // TS `namespace Foo { ... }` and the deprecated `module Foo { ... }`.
    if (kw === "namespace" || kw === "module") {
      const name = view.next_non_trivia(i + 1);
      if (name >= 0 && view.kind_of(name) === identifier_id) {
        tokens[name * 3] = namespace_id;
      }
      continue;
    }
  }

  return { tokens, token_types };
};

// pipeline entries are either fidelity-gated (wrapped with `tag(...)`) or
// always-on (plain reclassifier). the language factory drops every tagged
// entry under `fidelity: 'low'`; under `fidelity: ['function', ...]` it
// keeps tagged entries whose `produces` intersects the allowlist. the
// tagged-template embedder is always-on — embeds are not an identifier
// fidelity axis.
export const reclassifiers: LanguagePipeline = [
  // frame_track first: every subsequent claim reclassifier that needs
  // scope-aware data reads from `result.frames`. languages that reuse
  // claim_property_scope (TS, TSX, Svelte) must include js_frame_track in
  // their own pipelines too.
  always(js_frame_track, "type_claim"),
  // constant promotion first: UPPER_SNAKE_CASE identifiers become `constant`
  // so subsequent passes see the promoted stream. function / property /
  // class_name predicates all key on `identifier`, so converting an
  // identifier to `constant` upstream simply removes it from their view.
  tag(promote_js_constants, ["constant"]),
  tag(rewrite_types(function_variable_rules, { trivia: ["comment"] }), ["function"]),
  // const-binding promotion runs AFTER function_variable_rules so a
  // function-valued const (`const f = () => ...`) stays `function` —
  // this pass only rewrites tokens whose current kind is identifier,
  // which naturally excludes already-promoted binding names.
  tag(promote_js_const_bindings, ["constant"]),
  // claim_property_scope replaces three previous passes (property_rules,
  // interface_member_promoter, class_field_demoter) with a single scope-
  // aware claim producer. it batches with function_variable_rules above
  // so both see the base stream and merge by precedence — interface
  // members with function-type values resolve to property (prec 35 >
  // function's 30), object method shorthands to function (prec 30 >
  // object-property prec 20), and class fields never get a property
  // claim at all, so no post-hoc fixup is needed.
  tag(claim_property_scope, ["property"]),
  tag(class_name_promoter, ["class_name"]),
  tag(promote_js_parameters, ["parameter"]),
  // namespace promotion (import * as X, TS `namespace X { ... }`).
  tag(promote_js_namespaces, ["namespace"]),
  always(embed_interleaved({ scan: scan_tagged_template }), "embed"),
];
