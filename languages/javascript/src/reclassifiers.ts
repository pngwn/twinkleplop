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
  capture,
  create_language,
  embed_interleaved,
  frame_track,
  make_token_view,
  not,
  optional,
  params,
  precedence_for,
  promote_by_text_set,
  promote_by_upper_snake_case,
  promote_function_calls,
  rewrite_types,
  seq,
  tag,
  type,
} from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
import type {
  BraceKindScan,
  ClaimFn,
  ClaimingReclassifier,
  FrameSpec,
  GroupDescriptor,
  LanguagePipeline,
  Reclassifier,
  Region,
  RewriteRule,
  TokenView,
} from "@twinkleplop/core";

import { default as jsdoc_grammar } from "./jsdoc.js";

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
// property claim pass — scope-aware, declarative
// ---------------------------------------------------------------------------
//
// claims `property` (and `function` for method shorthand) for identifiers
// in property-key position: member start of an object literal, type
// literal, or interface body. scope classification, at_start tracking, and
// modifier transparency all come from the upstream frame_track stage; the
// rules below gate their anchors on that frame data directly.
//
// this pass replaces three older reclassifiers (property_rules,
// interface_member_promoter, class_field_demeter) with scope-aware claim
// EMISSION rather than claim-then-demote: class fields never get a
// property claim (class-kind frames are excluded by the anchor gate), so
// no fixup pass is needed. target precedences come from the shared table:
// function (30) and property (20), so a method-shorthand key resolves to
// function over a competing property claim within the batch.
//
// frame kinds (from js_frame_track's brace_kinds spec):
//   class        — body of `class Foo { ... }` — NEVER claim.
//   interface    — body of `interface Foo { ... }` — claim property.
//   object       — object literal / destructure pattern — claim property,
//                  or function when the value is an arrow / function.
//   type_literal — `: { ... }` annotation shapes — claim property.
//   block / paren / bracket — NEVER claim (labeled statements, params,
//                  arrays, computed keys).
//
// every member rule gates on the DIRECT frame. the tracker re-arms at_start
// after a `,` in any frame, so the `b` in `{ f(a: T, b: U) {} }` is at the
// start of a paren element. a gate that walked through the paren to the
// enclosing object would read that parameter as a member key.

// the member separator in all its forms: `x:`, `x?:` (single operator
// token or split `?` + `:`).
const member_colon = any_of(
  type("punctuation", ":"),
  type("operator", "?:"),
  seq(type("operator", "?"), type("punctuation", ":")),
);

// value shapes that make an object key a method: `function`,
// `async function`, `ident =>`, `async ident =>`, `(...) =>`,
// `async (...) =>`. mirrors what function_variable_rules matches for `=`.
const function_value = seq(
  optional(type("keyword", "async")),
  any_of(
    type("keyword", "function"),
    seq(type("identifier"), type("operator", "=>")),
    seq(balanced_parens("(", ")"), type("operator", "=>")),
  ),
);

// Reserved words used as names. Every reserved word is a legal property
// name, so `{ default: 1 }` and `class C { default() {} }` need the
// frame table to tell an object literal from a block. Member access
// (`obj.delete`) is settled earlier, by the grammar's `member_access`
// state.

// frames whose members are named: `{ k: v }`, `interface I { k: v }`,
// `: { k: v }`. block frames are excluded, so a labelled statement and a
// `switch` arm keep their keywords.
const NAMED_MEMBER_KINDS = ["object", "interface", "type_literal"];

// `object` is the frame tracker's fallback kind, so this list is only
// safe while every brace it cannot place is a genuine object literal --
// the return-type and `case` label rules in `js_frame_spec` are what make
// that true. `type_literal` is absent because a type alias's `= {` is
// already `object`.
const METHOD_MEMBER_KINDS = ["class", "interface", "object"];

// `true` / `false` arrive as `boolean` rather than `keyword`; both are
// legal keys.
const reserved_word = any_of(type("keyword"), type("boolean"));

export const property_scope_rules: RewriteRule[] = [
  // object method shorthand: the key of a function-valued member reads as
  // a function, not a property.
  {
    anchor: {
      type_name: "identifier",
      at_start: true,
      frame_kinds: ["object"],
      frame_direct: true,
    },
    when: seq(member_colon, function_value),
    rewrite: "function",
  },
  // property keys at member start. a `:` introducing a labeled statement
  // (`loop: for (...)`) is excluded; label keywords cannot start the
  // function-value shapes above, so the first rule needs no exclusion.
  {
    anchor: {
      type_name: "identifier",
      at_start: true,
      frame_kinds: ["object", "interface", "type_literal"],
      frame_direct: true,
    },
    when: seq(
      member_colon,
      not(type("keyword", ["for", "while", "do", "if", "switch", "try", "with"])),
    ),
    rewrite: "property",
  },
];

// Correctness rather than enrichment, so this runs at every fidelity
// setting. The targets are where a plain name would land: `identifier`,
// which `claim_property_scope` promotes to `property` when fidelity
// allows, and `function`, which the fidelity downgrade maps back to
// `identifier` on its own.
export const reserved_name_rules: RewriteRule[] = [
  // `interface I { new (): T }` is a construct signature, not a method
  // named `new`. claiming `keyword` both keeps the word highlighted and
  // stops the method rule below from matching the position — rules are
  // first-match-wins per anchor. a class body has no construct signature,
  // so `class C { new() {} }` still reads as a method.
  {
    anchor: {
      type_name: "keyword",
      value: "new",
      at_start: true,
      frame_kinds: ["interface"],
      frame_direct: true,
    },
    when: balanced_parens("(", ")"),
    rewrite: "keyword",
  },
  // `class C { default() {} }` — method shorthand.
  {
    anchor: {
      type_name: "keyword",
      at_start: true,
      frame_kinds: METHOD_MEMBER_KINDS,
      frame_direct: true,
    },
    when: balanced_parens("(", ")"),
    rewrite: "function",
  },
  // `{ default: 1 }`, `interface I { new: number }` — a property key.
  {
    anchor: {
      type_name: "keyword",
      at_start: true,
      frame_kinds: NAMED_MEMBER_KINDS,
      frame_direct: true,
    },
    when: member_colon,
    rewrite: "identifier",
  },
  {
    anchor: {
      type_name: "boolean",
      at_start: true,
      frame_kinds: NAMED_MEMBER_KINDS,
      frame_direct: true,
    },
    when: member_colon,
    rewrite: "identifier",
  },
];

const GENERATOR_MEMBER_KINDS = ["class", "object"];

// a generator star is never a multiplication, so it is fixed at every fidelity
// operator anchored rules cost every operator token, so only the member start form uses one
export const generator_star_rules: RewriteRule[] = [
  {
    anchor: { type_name: "keyword", value: ["function", "yield", "static", "async"] },
    when: capture("star", type("operator", "*")),
    rewrite: { star: "keyword" },
  },
  {
    anchor: {
      type_name: "operator",
      value: "*",
      at_start: true,
      frame_kinds: GENERATOR_MEMBER_KINDS,
      frame_direct: true,
    },
    rewrite: "keyword",
  },
];

// A plain Reclassifier on purpose. Without `__claim` it is a barrier, so
// the claim batch below sees its output and `claim_property_scope`'s
// ordinary identifier rules do the promoting — and the batch stays one
// segment, leaving the order-independence permutation count unchanged.
const reserved_names_pass = rewrite_types([...reserved_name_rules, ...generator_star_rules], {
  trivia: ["comment"],
});
export const classify_reserved_names: Reclassifier = (input, result) =>
  reserved_names_pass(input, result);

export const claim_property_scope: ClaimingReclassifier = rewrite_types(property_scope_rules, {
  trivia: ["comment"],
});

// keywords the grammar emits that can sit inside a type expression.
// `string` / `number` / `boolean` and the rest of the builtin type names
// are plain identifiers at this stage -- builtin-type promotion is a
// reclassifier that runs downstream of frame_track.
const TYPE_EXPR_KEYWORDS = [
  "void",
  "null",
  "undefined",
  "this",
  "typeof",
  "keyof",
  "readonly",
  "infer",
  "is",
  "asserts",
];

// the subset of those that can be the LAST token of a return type, i.e.
// the token a body brace actually follows.
const TYPE_TAIL_KEYWORDS = ["void", "null", "undefined", "this"];

// walk back over a return-type annotation to the `):` that opened it.
// `[`, `]` and `,` come in through `chars` rather than a text list
// because the grammar coalesces adjacent punctuation -- `readonly T[] {`
// arrives with a single `[]` token.
const RETURN_TYPE_SCAN: BraceKindScan = {
  over: [
    { type: "identifier" },
    // the TSX grammar tags the builtin type names (`string`, `number`)
    // as `type` directly, where the TS grammar leaves them identifiers
    // for a downstream pass. the walk has to accept both.
    { type: "type" },
    { type: "keyword", texts: TYPE_EXPR_KEYWORDS },
    { type: "string" },
    { type: "number" },
    { type: "boolean" },
    { type: "operator", texts: ["|", "&", "<", ">", ">>", ">>>"] },
    { type: "punctuation", chars: ".[]," },
  ],
  to: { type: "punctuation", last_char_in: ":", preceded_by_char_in: ")" },
};

// walk back over a switch label's expression to the `case` keyword.
const CASE_LABEL_SCAN: BraceKindScan = {
  over: [
    { type: "identifier" },
    { type: "string" },
    { type: "number" },
    { type: "boolean" },
    { type: "keyword", texts: ["this", "null", "undefined"] },
    { type: "operator", texts: ["-"] },
    { type: "punctuation", chars: "." },
  ],
  to: { type: "keyword", texts: ["case", "default"] },
};

// words that can precede a member name without being the name. shared by
// the frame table's at_start transparency, the member-method anchor set,
// and the parameter walk (a TS parameter property carries the same
// modifiers). the TS-only ones never tokenize as keywords in plain JS.
const MEMBER_LEADING_KEYWORDS = [
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
];

// shared frame_track config for JS/TS/TSX/Svelte. the spec object is
// exported separately so TS-family packages can extend it (ternary and
// stmt flag tracking for type-position rules) without re-stating the
// bracket / brace-kind / at_start configuration; consumers of
// claim_property_scope must run a tracker built from this spec (or a
// superset) upstream -- otherwise it has no frames to read from and
// emits no claims.
export const js_frame_spec: FrameSpec = {
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
    // `class` and `interface` are legal property names, so a key arms a
    // marker that never finds a brace of its own; discard it at the
    // separator that ends the member.
    marker_reset_chars: ";,:",
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
      // `<` is also less-than, so `for (i = 0; i < n; i++)` leaves the
      // counter armed. resynchronise at a statement separator.
      reset_chars: ";",
    },
    prev_rules: [
      { prev_type: "operator", prev_texts: ["=>"], kind: "block" },
      // `${` in a template: the brace opens an interpolated expression.
      // it shares a token with the `$`, so this matches on that character.
      { prev_type: "punctuation", prev_last_char_in: "$", kind: "block" },
      // a switch label ends in `:` too -- `case "bytes": { ... }` opens a
      // block, not the annotation type literal the next rule reads a bare
      // `:` as. the walk steps back over the label expression to the
      // `case` keyword. `in_kinds` is what keeps a reserved word used as
      // an object key out of it: in `{ default: { a: 1 } }` the walk lands
      // on `default` just the same, but the enclosing frame is the object
      // literal rather than a block.
      {
        prev_type: "punctuation",
        prev_texts: [":"],
        in_kinds: ["block"],
        scan_back: CASE_LABEL_SCAN,
        kind: "block",
      },
      // `:` is punctuation in the grammar (separator, not operator); a
      // brace after it is an annotation / return-position type literal.
      { prev_type: "punctuation", prev_texts: [":"], kind: "type_literal" },
      { prev_type: "keyword", prev_texts: ["do", "try", "else", "finally"], kind: "block" },
      { prev_type: "punctuation", prev_last_char_in: ")", kind: "block" },
      // a return-type annotation hides the parameter list from the rule
      // above: in `f(): Promise<void> {` the token before the body brace
      // is the tail of the type, not the `)`. one entry rule per shape a
      // type can end with, each walking back over the annotation to the
      // `):` that opened it -- keying on the annotation rather than on
      // whichever token happens to be last. the entry conditions stay
      // narrow on purpose; they are what keeps the walk off the object
      // literals that reach these rules (`= {`, `, {`, `return {` all
      // fail them without a step).
      { prev_type: "identifier", scan_back: RETURN_TYPE_SCAN, kind: "block" },
      { prev_type: "type", scan_back: RETURN_TYPE_SCAN, kind: "block" },
      {
        prev_type: "keyword",
        prev_texts: TYPE_TAIL_KEYWORDS,
        scan_back: RETURN_TYPE_SCAN,
        kind: "block",
      },
      {
        prev_type: "operator",
        prev_texts: [">", ">>", ">>>"],
        scan_back: RETURN_TYPE_SCAN,
        kind: "block",
      },
      {
        prev_type: "punctuation",
        prev_last_char_in: "]",
        scan_back: RETURN_TYPE_SCAN,
        kind: "block",
      },
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
      // `class` / `interface` arm a body marker, so they can't consume at_start.
      { type: "keyword", texts: [...MEMBER_LEADING_KEYWORDS, "class", "interface"] },
      // generator marker stays transparent so `*gen() {}` still sees the
      // method name at member start.
      { type: "operator", texts: ["*"] },
    ],
  },
};

export const js_frame_track = frame_track(js_frame_spec);

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
interface TypeIds {
  identifier_id: number;
  template_id: number;
  punctuation_id: number;
}

const type_id_cache = new WeakMap<string[], TypeIds>();
// the scanner sees the same token_types array at every position of a
// stream, so remembering the last one skips the WeakMap on all but the first.
let last_type_ids_key: string[] | null = null;
let last_type_ids: TypeIds | null = null;

function get_type_ids(token_types: string[]): TypeIds {
  if (token_types === last_type_ids_key) return last_type_ids!;
  let ids = type_id_cache.get(token_types);
  if (ids === undefined) {
    ids = {
      identifier_id: token_types.indexOf("identifier"),
      template_id: token_types.indexOf("template"),
      punctuation_id: token_types.indexOf("punctuation"),
    };
    type_id_cache.set(token_types, ids);
  }
  last_type_ids_key = token_types;
  last_type_ids = ids;
  return ids;
}

/**
 * Scanner called at each host token position. Returns a GroupDescriptor if
 * a tagged template starts here, or null otherwise. Matches `GroupScanFn`.
 */
export function scan_tagged_template(
  tokens: Uint32Array,
  input: string,
  i: number,
  token_types: string[],
): GroupDescriptor | null {
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
  // compare in place: slicing here allocated a string for every identifier.
  let language: LanguageFn;
  const tag_len = tag_end - tag_start;
  if (tag_len === 4 && input.startsWith("html", tag_start)) language = html_default;
  else if (tag_len === 3 && input.startsWith("css", tag_start)) language = css_default;
  else return null;

  const first_chunk = i + 1;
  if (first_chunk >= count || tokens[first_chunk * 3] !== template_id) return null;
  const first_start = tokens[first_chunk * 3 + 1];
  if (input[first_start] !== "`") return null;

  const regions: Region[] = [];
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
      } else if (tk === punctuation_id && te - ts === 2 && input.startsWith("${", ts)) {
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
// JSDoc comment embedding
// ---------------------------------------------------------------------------
//
// A `/** … */` comment is an embedded language the same way a tagged
// template is: the host grammar emits it as one `comment` token, and this
// scanner hands its body to the jsdoc grammar so tags and type
// expressions come back as their own tokens. Prose stays `comment`, so
// the only visible change is the structured parts.
//
// The host tokenizes a block comment as two tokens — the body (which
// carries the opening `/*`) and the closing `*/`. Only the body is
// replaced: `/**` is re-emitted as a synthetic `comment` token and
// everything after it becomes the content region.

// per-token_types comment id cache, same rationale as get_type_ids above:
// the scanner runs once per host token position, so the lookup must not
// be an indexOf per call.
const comment_id_cache = new WeakMap<string[], number>();
let last_comment_key: string[] | null = null;
let last_comment_id = -1;

function get_comment_id(token_types: string[]): number {
  if (token_types === last_comment_key) return last_comment_id;
  let id = comment_id_cache.get(token_types);
  if (id === undefined) {
    id = token_types.indexOf("comment");
    comment_id_cache.set(token_types, id);
  }
  last_comment_key = token_types;
  last_comment_id = id;
  return id;
}

let jsdoc_fn: LanguageFn | undefined;
// the grammar is compiled on first use, not at module load: a consumer
// whose sources carry no doc comments never pays for it.
const jsdoc_default: LanguageFn = (src) =>
  (jsdoc_fn ??= create_language(compile(jsdoc_grammar))())(src);

/**
 * Scanner called at each host token position. Returns a GroupDescriptor if
 * a doc comment starts here, or null otherwise. Matches `GroupScanFn`.
 */
export function scan_jsdoc(
  tokens: Uint32Array,
  input: string,
  i: number,
  token_types: string[],
): GroupDescriptor | null {
  const comment_id = get_comment_id(token_types);
  if (comment_id < 0) return null;
  const count = tokens.length / 3;
  if (i >= count) return null;
  if (tokens[i * 3] !== comment_id) return null;

  const start = tokens[i * 3 + 1];
  const end = tokens[i * 3 + 2];
  // `/**` plus at least one body character. the length test also keeps
  // the transform's fixed-point iteration from re-entering: the synthetic
  // `/**` token this emits is exactly three characters long, and `/**/`
  // (an empty block comment) tokenizes as a two-character `/*` body.
  if (end - start <= 3) return null;
  if (input.charCodeAt(start) !== 0x2f /* / */) return null;
  if (input.charCodeAt(start + 1) !== 0x2a /* * */) return null;
  if (input.charCodeAt(start + 2) !== 0x2a /* * */) return null;

  return {
    token_start: i,
    token_end: i + 1,
    regions: [
      { kind: "synthetic", source_start: start, source_end: start + 3, type_name: "comment" },
      { kind: "content", source_start: start + 3, source_end: end },
    ],
    language: jsdoc_default,
  };
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
// claims emit at the class_name table precedence (50), which outranks the
// function (30) and type (45) claims that may target the same token in a
// shared batch -- matching the old sequential behaviour where this pass ran
// last and re-promoted `identifier` / `type` / `function` tokens in these
// positions.

const class_name_promoter_fn: ClaimFn = (input, tokens, token_types, sink) => {
  const view = make_token_view(input, tokens, token_types);
  const n = view.count;
  if (n === 0) return;

  const identifier_id = token_types.indexOf("identifier");
  const keyword_id = token_types.indexOf("keyword");
  const punctuation_id = token_types.indexOf("punctuation");
  const operator_id = token_types.indexOf("operator");
  const type_id = token_types.indexOf("type");
  const function_id = token_types.indexOf("function");

  if (identifier_id < 0 || keyword_id < 0) return;

  let class_name_id = token_types.indexOf("class_name");
  if (class_name_id < 0) {
    class_name_id = token_types.length;
    token_types.push("class_name");
  }
  const class_name_prec = precedence_for("class_name");

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
    if (last >= 0) sink.emit(last, class_name_id, class_name_prec);
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
        sink.emit(j, class_name_id, class_name_prec);
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
};

export const class_name_promoter: ClaimingReclassifier = as_claim_producer(class_name_promoter_fn);

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
// (`const [a, , b, ...r] = arr`), and nested patterns. TS-style type
// annotations (`const x: Map<K, V> = foo`) are treated as RHS and their
// contents aren't tagged; the binding identifier (`x`) is still tagged.
//
// claims emit BELOW the function precedence (30): a function-valued const
// (`const foo = () => ...`) gets a competing function claim from
// function_variable_rules in the same batch, and the function claim is
// the one that should win.
const CONST_BINDING_PREC = 25;

/**
 * index of the whole module star after the import or export keyword at i, else -1
 * @example import * as ns from "x"
 * @example import def, * as ns from "x"
 * @example export * from "x"
 * @example export type * as ns from "x"
 */
function module_star_after(
  view: TokenView,
  i: number,
  operator_id: number,
  punctuation_id: number,
): number {
  let j = view.next_non_trivia(i + 1);
  if (j < 0) return -1;
  const k = view.next_non_trivia(j + 1);
  if (k >= 0 && view.kind_of(k) === punctuation_id && view.text_of(k) === ",") {
    j = view.next_non_trivia(k + 1);
  } else if (view.text_of(j) === "type") {
    j = k;
  }
  if (j < 0 || view.kind_of(j) !== operator_id || view.text_of(j) !== "*") return -1;
  return j;
}

// claimed from a constant pass so the star gates with constant fidelity
const MODULE_STAR_PREC = precedence_for("constant");

const promote_js_const_bindings_fn: ClaimFn = (input, tokens, token_types, sink) => {
  const identifier_id = token_types.indexOf("identifier");
  const keyword_id = token_types.indexOf("keyword");
  const operator_id = token_types.indexOf("operator");
  const punctuation_id = token_types.indexOf("punctuation");
  if (identifier_id < 0 || keyword_id < 0 || operator_id < 0 || punctuation_id < 0) {
    return;
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
    const kw = view.text_of(i);
    if (kw === "import" || kw === "export") {
      const star = module_star_after(view, i, operator_id, punctuation_id);
      if (star >= 0) sink.emit(star, constant_id, MODULE_STAR_PREC);
      continue;
    }
    if (kw !== "const") continue;

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
          sink.emit(k, constant_id, CONST_BINDING_PREC);
        }
      }
      at_binding_start = false;
    }
  }
};

export const promote_js_const_bindings: ClaimingReclassifier = as_claim_producer(
  promote_js_const_bindings_fn,
);

// parameter promotion: tag identifiers in parameter position as `parameter`.
// covers every function form:
//   - function declarations / expressions:  `function f(a, b) {}`
//   - generator / async variants:            `async function* f(a) {}`
//   - arrow functions with paren param list: `(a, b) => ...`
//   - single-ident arrows:                   `x => ...`, `async x => ...`
//   - class methods and accessors:           `class C { m(a){} get p(){} set p(v){} *g(){} }`
//   - object method shorthand:               `{ m(a){} get p(){} }`
//   - TS parameter properties:               `constructor(public readonly n: T) {}`
// strategy: one linear pass with a small brace-scope stack that distinguishes
// class / interface / object-literal bodies from plain blocks. at each `(`
// we peek for `=>` after the matching `)` (skipping an optional TS return
// type) to detect arrow parameter lists; at each identifier in a member-
// start position we peek for `(` to detect method shorthand. the param
// walker then tags identifiers at paren-depth 1, transparent to `...rest`
// and to the member modifiers a parameter property may carry, and skips
// defaults / destructuring sub-trees.

// promote_js_parameters is the JS family's four canonical param-list opener
// shapes as rewrite rules over the `params()` walk construct (tag the first
// identifier at depth 1 per chunk, transparent to `...rest`, suspend after
// `=` until the next `,`). reused by TS / TSX with the same rules. the
// member rules read the shared frame table: at_start plus a DIRECT object /
// class / interface frame, so member starts nested inside call parens
// don't count as method positions.
const JS_PARAM_WALK = {
  into: "p",
  default_introducer: "=",
  transparent_texts_for_type: [
    { type: "operator", texts: ["..."] },
    { type: "keyword", texts: MEMBER_LEADING_KEYWORDS },
  ],
};
const MEMBER_BRACE_KINDS = ["class", "object", "interface"];
const member_method_rule = (type_name: string, value?: string[]): RewriteRule => ({
  anchor: {
    type_name,
    value,
    at_start: true,
    frame_kinds: MEMBER_BRACE_KINDS,
    frame_direct: true,
  },
  // a generic method puts its type parameters between the name and the
  // paren -- `make<T>(base: T)` -- so the walk has to step over them the
  // same way the function-declaration rule does.
  when: params({ ...JS_PARAM_WALK, skip_generics: true }),
  rewrite: { p: "parameter" },
});

export const js_parameter_rules: RewriteRule[] = [
  // function declaration / expression: function [*] [name] [<generics>] (
  {
    anchor: type("keyword", "function"),
    when: seq(
      optional(type("operator", "*")),
      optional(any_of(type("identifier"), type("function"))),
      params({ ...JS_PARAM_WALK, skip_generics: true }),
    ),
    rewrite: { p: "parameter" },
  },
  // member method: identifier (or call-site-promoted function, or a
  // method-leading keyword used as a method name) at member start of a
  // class / object / interface body, followed by `(`. interface method
  // signatures get the same treatment as class methods so their param
  // names highlight the same way users expect.
  member_method_rule("identifier"),
  member_method_rule("function"),
  member_method_rule("keyword", MEMBER_LEADING_KEYWORDS),
  // arrow function `(...) =>`, including `(x): T => ...` (TS return type).
  // skipped when in type position (`: (x: T) => Y` is a type signature).
  {
    anchor: "punctuation",
    when: params({
      ...JS_PARAM_WALK,
      find_open: "arrow",
      skip_ts_return_type: true,
      skip_in_type_position: true,
    }),
    rewrite: { p: "parameter" },
  },
  // single-identifier arrow: `x => ...`. tags the identifier itself.
  { anchor: "identifier", when: type("operator", "=>"), rewrite: "parameter" },
  { anchor: "function", when: type("operator", "=>"), rewrite: "parameter" },
];

export const promote_js_parameters: Reclassifier = rewrite_types(js_parameter_rules, {
  trivia: ["comment"],
});

// namespace promotion: targets positions where the syntax unambiguously
// marks an identifier as a module/namespace binding. covers:
//   - `import * as X from "..."`  → X = namespace  (both JS and TS)
//     also after a default binding or ts import type
//   - `export * as X from "..."`  → X = namespace  (both JS and TS)
//   - `import X = require("...")` → X = namespace  (TS)
//   - `namespace X { ... }`       → X = namespace  (TS)
//   - `module X { ... }`          → X = namespace  (TS, deprecated)
// everything else (default imports, dotted property chains) is left alone
// because identifying those as namespace would need scope tracking.
// namespace positions are syntactically unambiguous (`* as X`,
// `namespace X {`), so they outrank positional inferences that can
// overclaim the same token -- specifically the TS type promoter's
// `as`-cast heuristic firing on `import * as X` (type, 45). casing
// constants (55) still win: `import * as FOO` reads as a constant
// binding by author convention.
const NAMESPACE_PREC = 46;

const promote_js_namespaces_fn: ClaimFn = (input, tokens, token_types, sink) => {
  const identifier_id = token_types.indexOf("identifier");
  const keyword_id = token_types.indexOf("keyword");
  const operator_id = token_types.indexOf("operator");
  const punctuation_id = token_types.indexOf("punctuation");
  if (identifier_id < 0 || keyword_id < 0) return;
  let namespace_id = token_types.indexOf("namespace");
  if (namespace_id < 0) {
    namespace_id = token_types.length;
    token_types.push("namespace");
  }
  const namespace_prec = NAMESPACE_PREC;
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
      const j = module_star_after(view, i, operator_id, punctuation_id);
      if (j < 0) continue;
      const as = view.next_non_trivia(j + 1);
      if (as < 0 || view.kind_of(as) !== keyword_id || view.text_of(as) !== "as") {
        continue;
      }
      const name = view.next_non_trivia(as + 1);
      if (name >= 0 && view.kind_of(name) === identifier_id) {
        sink.emit(name, namespace_id, namespace_prec);
      }
      continue;
    }

    // TS `namespace Foo { ... }` and the deprecated `module Foo { ... }`.
    if (kw === "namespace" || kw === "module") {
      const name = view.next_non_trivia(i + 1);
      if (name >= 0 && view.kind_of(name) === identifier_id) {
        sink.emit(name, namespace_id, namespace_prec);
      }
      continue;
    }
  }
};

export const promote_js_namespaces: ClaimingReclassifier =
  as_claim_producer(promote_js_namespaces_fn);

// pipeline entries are either fidelity-gated (wrapped with `tag(...)`) or
// always-on (plain reclassifier). the language factory drops every tagged
// entry under `fidelity: 'low'`; under `fidelity: ['function', ...]` it
// keeps tagged entries whose `produces` intersects the allowlist. the
// tagged-template embedder is always-on — embeds are not an identifier
// fidelity axis.
/**
 * The host embeds every group the same way, so both scanners share one
 * `embed_interleaved` pass rather than paying for two walks of the token
 * stream. Each rejects on its trigger token type before touching the
 * source, so the one that does not own a position costs a comparison.
 */
export function scan_embedded_groups(
  tokens: Uint32Array,
  input: string,
  i: number,
  token_types: string[],
): GroupDescriptor | null {
  return (
    scan_tagged_template(tokens, input, i, token_types) ?? scan_jsdoc(tokens, input, i, token_types)
  );
}

export const EMBEDDED_GROUP_TRIGGERS = ["identifier", "comment"];

function is_ascii_word_char(code: number): boolean {
  return (
    (code >= 0x61 && code <= 0x7a) ||
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x30 && code <= 0x39) ||
    code === 0x5f ||
    code === 0x24
  );
}

/**
 * true whenever scan_embedded_groups could find a group, a doc comment
 * opener or a backtick whose nearest preceding word ends in html or css
 */
export function may_embed_groups(input: string): boolean {
  if (input.includes("/**")) return true;
  let tick = input.indexOf("`");
  while (tick !== -1) {
    // the grammar drops some characters without a token, so skipping every
    // non word character keeps this a superset
    let end = tick;
    while (end > 0 && !is_ascii_word_char(input.charCodeAt(end - 1))) end--;
    if (input.startsWith("css", end - 3) || input.startsWith("html", end - 4)) return true;
    tick = input.indexOf("`", tick + 1);
  }
  return false;
}

export const reclassifiers: LanguagePipeline = [
  // frame_track first: every subsequent claim reclassifier that needs
  // scope-aware data reads from `result.frames`. languages that reuse
  // claim_property_scope (TS, TSX, Svelte) must include js_frame_track in
  // their own pipelines too.
  always(js_frame_track, "type_claim"),
  // correctness, not enrichment: a reserved word in a name position is
  // wrong at any fidelity. a barrier, so the claim batch below sees the
  // corrected stream and its ordinary identifier rules do the rest.
  always(classify_reserved_names, "shape"),
  // every pass below except the embedder is a claim producer: the runner
  // batches them against the same frozen base stream, claims merge by
  // precedence (ties resolve to the earlier pipeline entry), and the
  // winners apply in one flush. ordering between these entries no longer
  // decides conflicts -- the precedences do: constant (55) beats
  // class_name (50) beats function (30) beats const-binding constant
  // claims (25) beats property (20) beats parameter (15).
  tag(promote_js_constants, ["constant"]),
  tag(rewrite_types(function_variable_rules, { trivia: ["comment"] }), ["function"]),
  tag(promote_js_const_bindings, ["constant"]),
  // claim_property_scope replaces three previous passes (property_rules,
  // interface_member_promoter, class_field_demoter) with a single scope-
  // aware claim producer. class fields never get a property claim at all
  // (class-kind frames are excluded at emit time), and object method
  // shorthands emit `function` at 30 directly, so no post-hoc fixup pass
  // is needed.
  tag(claim_property_scope, ["property"]),
  tag(class_name_promoter, ["class_name"]),
  tag(promote_js_parameters, ["parameter"]),
  tag(promote_js_namespaces, ["namespace"]),
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
