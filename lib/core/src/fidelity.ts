// shared fidelity reclassifiers.
//
// these are the post-tokenization building blocks that promote low-fidelity
// identifier tokens to higher-fidelity types (`function`, `class_name`,
// `builtin`, `boolean`, `type`, etc.) using simple text or case checks.
// before these existed each language re-implemented them inline; they are
// factored here so a language's reclassifier pipeline is just a few calls
// plus any language-specific stateful passes.
//
// every helper returns a claim-producing reclassifier: matches emit claims
// at the target type's table precedence, so consecutive promoters batch
// together (one flush, conflicts resolved by precedence) and never mutate
// the caller's tokens or shared token_types array.

import { debug_enabled, warn_once } from "./debug";
import {
  any_of,
  as_claim_producer,
  balanced_parens,
  precedence_for,
  rewrite_types,
  seq,
  type,
} from "./reclassifier";
import type {
  ClaimFn,
  ClaimingReclassifier,
  Reclassifier,
  RewriteOptions,
  TokenPatternSpec,
} from "./types";

// ---------------------------------------------------------------------------
// promote_by_text_set
// ---------------------------------------------------------------------------
//
// rewrites tokens of `source_type` whose source text appears in `text_set`
// to `target_type`. does not need a Set — iterables are fine — but a Set
// is what callers almost always have. allocates the target_type entry in
// the token_types array if it's not already present.
//
// common uses: Python builtin types (list, dict, …) → builtin; Rust
// PRIMITIVE_TYPES (i32, u64, …) → class_name; JS / Python / Rust boolean
// literals → boolean.

// candidate texts compiled to code-unit arrays, bucketed by leading char.
// membership then answers from `input` directly instead of materialising a
// substring per candidate token: `input.slice(s, e)` allocated a string for
// every token of the source type on every highlight purely to feed
// Set.has, and these passes run over the whole stream.
const ASCII_BUCKETS = 128;

interface CompiledTextSet {
  buckets: (Uint16Array[] | null)[];
  // entries whose first code unit is outside ascii keep the string path.
  wide: Set<string> | null;
  min_len: number;
  max_len: number;
}

function compile_text_set(texts: Iterable<string>): CompiledTextSet {
  const buckets: (Uint16Array[] | null)[] = new Array(ASCII_BUCKETS).fill(null);
  let wide: Set<string> | null = null;
  let min_len = Infinity;
  let max_len = 0;
  for (const text of texts) {
    if (text.length === 0) continue;
    if (text.length < min_len) min_len = text.length;
    if (text.length > max_len) max_len = text.length;
    const first = text.charCodeAt(0);
    if (first >= ASCII_BUCKETS) {
      wide ??= new Set();
      wide.add(text);
      continue;
    }
    const codes = new Uint16Array(text.length);
    for (let i = 0; i < text.length; i++) codes[i] = text.charCodeAt(i);
    let bucket = buckets[first];
    if (bucket === null) {
      bucket = [];
      buckets[first] = bucket;
    }
    bucket.push(codes);
  }
  return { buckets, wide, min_len: min_len === Infinity ? 1 : min_len, max_len };
}

function text_set_has(set: CompiledTextSet, input: string, s: number, e: number): boolean {
  const len = e - s;
  if (len < set.min_len || len > set.max_len) return false;
  const first = input.charCodeAt(s);
  if (first >= ASCII_BUCKETS) {
    return set.wide !== null && set.wide.has(input.slice(s, e));
  }
  const bucket = set.buckets[first];
  if (bucket === null) return false;
  for (let b = 0; b < bucket.length; b++) {
    const codes = bucket[b];
    if (codes.length !== len) continue;
    let ok = true;
    for (let k = 1; k < len; k++) {
      if (input.charCodeAt(s + k) !== codes[k]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

export function promote_by_text_set(
  source_type: string,
  target_type: string,
  text_set: Iterable<string>,
): ClaimingReclassifier {
  const set = compile_text_set(text_set);
  const claim_fn: ClaimFn = (input, tokens, token_types, sink) => {
    const source_id = token_types.indexOf(source_type);
    if (source_id < 0) {
      if (debug_enabled()) {
        warn_once(
          "fidelity",
          `source-type:${source_type}`,
          `source type "${source_type}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }
    let target_id = token_types.indexOf(target_type);
    if (target_id < 0) {
      target_id = token_types.length;
      token_types.push(target_type);
    }
    const prec = precedence_for(target_type);
    const n = tokens.length / 3;
    for (let i = 0; i < n; i++) {
      if (tokens[i * 3] !== source_id) continue;
      const s = tokens[i * 3 + 1];
      const e = tokens[i * 3 + 2];
      if (text_set_has(set, input, s, e)) {
        sink.emit(i, target_id, prec);
      }
    }
  };
  return as_ident_promoter(claim_fn, {
    kind: IDENT_TEXT_SET,
    source_type,
    target_type,
    set,
  });
}

// ---------------------------------------------------------------------------
// promote_pascal_case
// ---------------------------------------------------------------------------
//
// rewrites tokens of `source_type` whose first character is ASCII uppercase
// (A-Z) to `target_type`. this mirrors the grammar-time case dispatch that
// Python and Rust historically had: an identifier starting with an uppercase
// letter is almost certainly a type name (class / struct / enum / trait).
//
// the check is a single char-code compare per identifier token. for
// non-ASCII-aware classification the caller can post-process further.

const ASCII_UPPER_MIN = 0x41;
const ASCII_UPPER_MAX = 0x5a;

export function promote_pascal_case(
  source_type: string,
  target_type: string,
): ClaimingReclassifier {
  const claim_fn: ClaimFn = (input, tokens, token_types, sink) => {
    const source_id = token_types.indexOf(source_type);
    if (source_id < 0) {
      if (debug_enabled()) {
        warn_once(
          "fidelity",
          `source-type:${source_type}`,
          `source type "${source_type}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }
    let target_id = token_types.indexOf(target_type);
    if (target_id < 0) {
      target_id = token_types.length;
      token_types.push(target_type);
    }
    const prec = precedence_for(target_type);
    const n = tokens.length / 3;
    for (let i = 0; i < n; i++) {
      if (tokens[i * 3] !== source_id) continue;
      const s = tokens[i * 3 + 1];
      const e = tokens[i * 3 + 2];
      if (is_pascal_case(input, s, e)) sink.emit(i, target_id, prec);
    }
  };
  return as_ident_promoter(claim_fn, {
    kind: IDENT_PASCAL_CASE,
    source_type,
    target_type,
    set: null,
  });
}

function is_pascal_case(input: string, s: number, e: number): boolean {
  const first = input.charCodeAt(s);
  if (first < ASCII_UPPER_MIN || first > ASCII_UPPER_MAX) return false;
  // reject all-upper multi-char names (`MAX_SIZE`, `PI`). these are
  // UPPER_SNAKE constants by convention, not PascalCase types. the
  // constant promoter (promote_by_upper_snake_case) is the right
  // home for them. single-char uppercase (generic params `T`, `X`)
  // still promote so languages that treat them as types don't lose
  // coverage. zero length spans take this path too: only longer names
  // were ever scanned for lowercase, and fusing must not change that.
  if (e - s < 2) return true;
  for (let k = s; k < e; k++) {
    const c = input.charCodeAt(k);
    if (c >= 0x61 && c <= 0x7a) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// promote_by_upper_snake_case
// ---------------------------------------------------------------------------
//
// rewrites tokens of `source_type` whose source text is UPPER_SNAKE_CASE to
// `target_type`. the predicate is: first char in [A-Z], every char in
// [A-Z0-9_], length >= 2. single-char uppercase identifiers (like generic
// type parameters `T`) are left alone so the pascal_case pass can claim them
// as class_name.
//
// common use: promoting convention-declared constants — `MAX_VALUE`, `PI`,
// `HTTP_STATUS` — to `constant`. pair with pascal_case ordering so the two
// predicates don't overlap: this pass claims `MAX_VALUE`, pascal_case then
// claims `MaxValue`.

const ASCII_DIGIT_MIN = 0x30;
const ASCII_DIGIT_MAX = 0x39;
const ASCII_UNDERSCORE = 0x5f;

function is_upper_snake_char(code: number): boolean {
  return (
    (code >= ASCII_UPPER_MIN && code <= ASCII_UPPER_MAX) ||
    (code >= ASCII_DIGIT_MIN && code <= ASCII_DIGIT_MAX) ||
    code === ASCII_UNDERSCORE
  );
}

export function promote_by_upper_snake_case(
  source_type: string,
  target_type: string,
): ClaimingReclassifier {
  const claim_fn: ClaimFn = (input, tokens, token_types, sink) => {
    const source_id = token_types.indexOf(source_type);
    if (source_id < 0) {
      if (debug_enabled()) {
        warn_once(
          "fidelity",
          `source-type:${source_type}`,
          `source type "${source_type}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }
    let target_id = token_types.indexOf(target_type);
    if (target_id < 0) {
      target_id = token_types.length;
      token_types.push(target_type);
    }
    const prec = precedence_for(target_type);
    const n = tokens.length / 3;
    for (let i = 0; i < n; i++) {
      if (tokens[i * 3] !== source_id) continue;
      const s = tokens[i * 3 + 1];
      const e = tokens[i * 3 + 2];
      if (is_upper_snake_case(input, s, e)) sink.emit(i, target_id, prec);
    }
  };
  return as_ident_promoter(claim_fn, {
    kind: IDENT_UPPER_SNAKE_CASE,
    source_type,
    target_type,
    set: null,
  });
}

function is_upper_snake_case(input: string, s: number, e: number): boolean {
  if (e - s < 2) return false;
  const first = input.charCodeAt(s);
  if (first < ASCII_UPPER_MIN || first > ASCII_UPPER_MAX) return false;
  for (let k = s + 1; k < e; k++) {
    if (!is_upper_snake_char(input.charCodeAt(k))) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// fused identifier promoters
// ---------------------------------------------------------------------------
//
// rust and python batch four adjacent promoters over `identifier`, and each
// one walks the whole token stream on its own. a fused run walks once and
// tests the members in their original order per token. claims merge per
// token with ties going to the first emitted, so emitting a token's claims
// in member order gives the same winners as the separate walks. target ids
// are appended in member order too, so the vocabulary matches.

const IDENT_TEXT_SET = 0;
const IDENT_PASCAL_CASE = 1;
const IDENT_UPPER_SNAKE_CASE = 2;

interface IdentSpec {
  kind: number;
  source_type: string;
  target_type: string;
  // compiled texts for IDENT_TEXT_SET, null for the case checks.
  set: CompiledTextSet | null;
}

type IdentPromoter = ClaimingReclassifier & { __ident: IdentSpec };

function as_ident_promoter(claim_fn: ClaimFn, spec: IdentSpec): ClaimingReclassifier {
  const fn = as_claim_producer(claim_fn) as IdentPromoter;
  fn.__ident = spec;
  return fn;
}

function ident_spec_of(fn: ClaimingReclassifier): IdentSpec | null {
  return (fn as Partial<IdentPromoter>).__ident ?? null;
}

function ident_matches(spec: IdentSpec, input: string, s: number, e: number): boolean {
  if (spec.kind === IDENT_TEXT_SET) return text_set_has(spec.set!, input, s, e);
  if (spec.kind === IDENT_PASCAL_CASE) return is_pascal_case(input, s, e);
  return is_upper_snake_case(input, s, e);
}

function fuse_ident_run(run: IdentSpec[]): ClaimingReclassifier {
  const source_type = run[0].source_type;
  const count = run.length;
  const precs = new Int32Array(count);
  for (let m = 0; m < count; m++) precs[m] = precedence_for(run[m].target_type);
  // resolved per call since each call brings its own vocabulary. calls are
  // synchronous and never nested, so one scratch array per run is safe.
  const target_ids = new Int32Array(count);
  const claim_fn: ClaimFn = (input, tokens, token_types, sink) => {
    const source_id = token_types.indexOf(source_type);
    if (source_id < 0) {
      if (debug_enabled()) {
        warn_once(
          "fidelity",
          `source-type:${source_type}`,
          `source type "${source_type}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }
    for (let m = 0; m < count; m++) {
      const target_type = run[m].target_type;
      let target_id = token_types.indexOf(target_type);
      if (target_id < 0) {
        target_id = token_types.length;
        token_types.push(target_type);
      }
      target_ids[m] = target_id;
    }
    const n = tokens.length / 3;
    for (let i = 0; i < n; i++) {
      if (tokens[i * 3] !== source_id) continue;
      const s = tokens[i * 3 + 1];
      const e = tokens[i * 3 + 2];
      for (let m = 0; m < count; m++) {
        if (ident_matches(run[m], input, s, e)) sink.emit(i, target_ids[m], precs[m]);
      }
    }
  };
  return as_claim_producer(claim_fn);
}

// replaces each maximal run of adjacent identifier promoters sharing a
// source type with one fused producer. a batch without such a run comes
// back as the same array.
export function fuse_ident_producers(batch: ClaimingReclassifier[]): ClaimingReclassifier[] {
  let fused: ClaimingReclassifier[] | null = null;
  let i = 0;
  while (i < batch.length) {
    const spec = ident_spec_of(batch[i]);
    let j = i + 1;
    if (spec !== null) {
      while (j < batch.length && ident_spec_of(batch[j])?.source_type === spec.source_type) j++;
    }
    if (j - i > 1) {
      fused ??= batch.slice(0, i);
      const run: IdentSpec[] = [];
      for (let k = i; k < j; k++) run.push(ident_spec_of(batch[k])!);
      fused.push(fuse_ident_run(run));
    } else if (fused !== null) {
      fused.push(batch[i]);
    }
    i = j;
  }
  return fused ?? batch;
}

// ---------------------------------------------------------------------------
// promote_function_calls
// ---------------------------------------------------------------------------
//
// rewrites identifier tokens that appear in function-call position to
// `function`. the simplest variant — `foo()` — is a single rewrite_types
// rule; extras handle language-specific call shapes.
//
//   plain:       ident (…)              — javascript, python, css
//   macro:       ident !(…)             — rust
//   generic:     ident <…>(…)           — rust (generic fn call)
//   turbofish:   ident ::<…>(…)         — rust
//   css-simple:  ident(                 — css emits `(` as its own token
//                                         more often, so pattern is tighter
//
// callers opt into variants via `variants`. returning one reclassifier
// means the call-site rewrite is a single rewrite_types pass.

export interface FunctionCallVariants {
  plain?: boolean;
  macro?: boolean;
  generic_fn?: boolean;
  turbofish?: boolean;
}

export function promote_function_calls(
  source_type = "identifier",
  target_type = "function",
  variants: FunctionCallVariants = { plain: true },
  options?: RewriteOptions,
): Reclassifier {
  const when_branches: TokenPatternSpec[] = [];
  const paren_call = balanced_parens("(", ")");
  if (variants.plain) {
    when_branches.push(paren_call);
  }
  if (variants.macro) {
    when_branches.push(seq(type("builtin", ["!"]), paren_call));
  }
  if (variants.generic_fn) {
    when_branches.push(seq(balanced_parens("<", ">"), paren_call));
  }
  if (variants.turbofish) {
    when_branches.push(seq(type("punctuation", ["::"]), balanced_parens("<", ">"), paren_call));
  }
  if (when_branches.length === 0) {
    return (_input, result) => result;
  }
  return rewrite_types(
    [
      {
        anchor: source_type,
        when: when_branches.length === 1 ? when_branches[0] : any_of(...when_branches),
        rewrite: target_type,
      },
    ],
    options,
  );
}
