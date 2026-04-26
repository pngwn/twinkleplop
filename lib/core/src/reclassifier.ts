// post-tokenization reclassifier pipeline.
//
// a Reclassifier is a pure function `(input, TokenizeResult) -> TokenizeResult`
// that operates on the dense Uint32Array triplet stream. phase 1 supports the
// `rewrite_types` transform: pattern-match local windows of tokens and rewrite
// the anchor token's type in place. future phases add `embed_grammars` for
// cross-language sub-tokenization and splicing.
//
// the matcher skips trivia tokens (e.g. `comment` in JS) between consecutive
// pattern elements. token type names in patterns are resolved to integer
// type_ids once per reclassify call, so the hot loop is integer-only.

import { tokenize } from "./tokenizer";
import type {
  AnyOfPatternSpec,
  BalancedPatternSpec,
  CapturePatternSpec,
  ClaimFn,
  ClaimSink,
  ClaimingReclassifier,
  CompiledGrammar,
  EmbedEntry,
  EmbedInterleavedConfig,
  EmbedMapping,
  FidelitySpec,
  GroupDescriptor,
  LanguageFactory,
  LanguageFn,
  LanguageOptions,
  LanguagePipeline,
  OptionalPatternSpec,
  Reclassifier,
  ReclassifierEntry,
  ReclassifierLayer,
  ReclassifierPipeline,
  Region,
  RewriteOptions,
  RewriteRule,
  SeqPatternSpec,
  TaggedReclassifier,
  TokenizeResult,
  TokenPatternSpec,
  TypePatternSpec,
} from "./types";

// ---------------------------------------------------------------------------
// DSL combinators
// ---------------------------------------------------------------------------

/** Match a single token of the given type, optionally with a source-text value constraint. */
export function type(type_name: string, value?: string | string[]): TypePatternSpec {
  return { __kind: "type", type_name, value };
}

/** Match a sequence of sub-patterns in order, skipping trivia between them. */
export function seq(...children: TokenPatternSpec[]): SeqPatternSpec {
  return { __kind: "seq", children };
}

/** Match the first alternative that succeeds. */
export function any_of(...branches: TokenPatternSpec[]): AnyOfPatternSpec {
  return { __kind: "anyOf", branches };
}

/** Match the inner pattern if possible; succeed without consuming anything otherwise. */
export function optional(inner: TokenPatternSpec): OptionalPatternSpec {
  return { __kind: "optional", inner };
}

/** Tag the inner pattern's span with a capture name (reserved for future rewrite targeting). */
export function capture(name: string, inner: TokenPatternSpec): CapturePatternSpec {
  return { __kind: "capture", name, inner };
}

/**
 * Walk tokens counting paren depth inside punctuation tokens until depth
 * returns to zero. Advances across all token types (strings, identifiers,
 * etc.) but only counts parens that appear in `punctuation`-typed tokens,
 * so parens in string/comment content don't affect the depth.
 *
 * The max_tokens bound prevents pathological runaway scans.
 */
export function balanced_parens(open = "(", close = ")", max_tokens = 200): BalancedPatternSpec {
  return { __kind: "balanced", open, close, max_tokens };
}

// ---------------------------------------------------------------------------
// Pattern compilation
// ---------------------------------------------------------------------------
//
// patterns are compiled once per reclassify call against the current
// TokenizeResult's token_types array, resolving all type-name references to
// integer type_ids. unknown type names compile to a sentinel that never
// matches, so rules targeting types not present in the result silently fail
// instead of erroring at runtime.

const NEVER_MATCHES = -1;

type CompiledPattern =
  | CompiledType
  | CompiledSeq
  | CompiledAnyOf
  | CompiledOptional
  | CompiledCapture
  | CompiledBalanced;

interface CompiledType {
  kind: 0;
  type_id: number;
  // null -> any value; string -> exact match; string[] -> any of
  values: string[] | null;
}

interface CompiledSeq {
  kind: 1;
  children: CompiledPattern[];
}

interface CompiledAnyOf {
  kind: 2;
  branches: CompiledPattern[];
}

interface CompiledOptional {
  kind: 3;
  inner: CompiledPattern;
}

interface CompiledBalanced {
  kind: 4;
  punctuation_type_id: number;
  open_code: number;
  close_code: number;
  max_tokens: number;
}

interface CompiledCapture {
  kind: 5;
  name: string;
  inner: CompiledPattern;
}

function compile_pattern(spec: TokenPatternSpec, name_to_id: Map<string, number>): CompiledPattern {
  switch (spec.__kind) {
    case "type": {
      const type_id = name_to_id.get(spec.type_name) ?? NEVER_MATCHES;
      let values: string[] | null = null;
      if (spec.value !== undefined) {
        values = Array.isArray(spec.value) ? spec.value : [spec.value];
      }
      return { kind: 0, type_id, values };
    }
    case "seq":
      return {
        kind: 1,
        children: spec.children.map((c) => compile_pattern(c, name_to_id)),
      };
    case "anyOf":
      return {
        kind: 2,
        branches: spec.branches.map((b) => compile_pattern(b, name_to_id)),
      };
    case "optional":
      return { kind: 3, inner: compile_pattern(spec.inner, name_to_id) };
    case "capture":
      return {
        kind: 5,
        name: spec.name,
        inner: compile_pattern(spec.inner, name_to_id),
      };
    case "balanced": {
      const punctuation_type_id = name_to_id.get("punctuation") ?? NEVER_MATCHES;
      return {
        kind: 4,
        punctuation_type_id,
        open_code: spec.open.charCodeAt(0),
        close_code: spec.close.charCodeAt(0),
        max_tokens: spec.max_tokens ?? 200,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Matcher engine
// ---------------------------------------------------------------------------

// sentinel returned by the matchers to indicate a failed match; callers
// use `=== NO_MATCH` checks rather than sentinel-aware arithmetic so the
// value is otherwise opaque.
const NO_MATCH = -2;

function skip_trivia_backward(tokens: Uint32Array, idx: number, trivia: Uint8Array): number {
  while (idx >= 0 && trivia[tokens[idx * 3]]) idx--;
  return idx;
}

// the forward matcher used to be a recursive descent over `CompiledPattern`
// with a per-match `captures: Map`. it has been replaced by the bytecode
// interpreter (see match_bytecode below). the `CompiledPattern` tree is
// retained only for `before` lookbehind, which uses a different scan
// direction and ends-with value semantics.

// ---------------------------------------------------------------------------
// backward matcher (for `before` lookbehind patterns)
// ---------------------------------------------------------------------------
//
// matches a compiled pattern against the token stream scanning LEFT from the
// given index. supports type, seq (right-to-left), any_of, and optional.
// balanced_parens and capture are not supported in lookbehind — they are
// forward-only constructs.
//
// value matching uses ends-with semantics rather than exact match. this
// handles token coalescing: adjacent punctuation like `({` is one token,
// but for lookbehind you care about the trailing character (the part
// immediately before the anchor). `type("punctuation", ["{"])` matches
// a token ending with `{`, so `({` and `{` both match.

function match_pattern_backward(
  pattern: CompiledPattern,
  tokens: Uint32Array,
  idx: number,
  input: string,
  trivia: Uint8Array,
): number {
  idx = skip_trivia_backward(tokens, idx, trivia);

  switch (pattern.kind) {
    case 0: {
      // TYPE (ends-with value matching for lookbehind)
      if (idx < 0) return NO_MATCH;
      const base = idx * 3;
      if (tokens[base] !== pattern.type_id) return NO_MATCH;
      if (pattern.values !== null) {
        const start = tokens[base + 1];
        const end = tokens[base + 2];
        const source = input.slice(start, end);
        let ok = false;
        for (let i = 0; i < pattern.values.length; i++) {
          if (source.endsWith(pattern.values[i])) {
            ok = true;
            break;
          }
        }
        if (!ok) return NO_MATCH;
      }
      return idx - 1;
    }
    case 1: {
      // SEQ (match children right-to-left)
      let cur = idx;
      for (let i = pattern.children.length - 1; i >= 0; i--) {
        cur = match_pattern_backward(pattern.children[i], tokens, cur, input, trivia);
        if (cur === NO_MATCH) return NO_MATCH;
      }
      return cur;
    }
    case 2: {
      // ANY_OF
      for (let i = 0; i < pattern.branches.length; i++) {
        const r = match_pattern_backward(pattern.branches[i], tokens, idx, input, trivia);
        if (r !== NO_MATCH) return r;
      }
      return NO_MATCH;
    }
    case 3: {
      // OPTIONAL
      const r = match_pattern_backward(pattern.inner, tokens, idx, input, trivia);
      return r !== NO_MATCH ? r : idx;
    }
    default:
      // balanced_parens and capture are not supported in lookbehind
      return NO_MATCH;
  }
}

// ---------------------------------------------------------------------------
// bytecode compilation (forward matcher)
// ---------------------------------------------------------------------------
//
// compiles the forward pattern tree to a flat Int32Array program executed by
// `match_bytecode`. the tree form above is kept alive to back `before`
// lookbehind only. rationale: the forward matcher is the hot path, and a
// bytecode VM removes per-node recursion, object-ref pointer chasing, and
// (with the side-table value pool below) `input.slice()` allocation on
// value checks. the backward matcher is rarely used and has ends-with
// semantics that don't share the same implementation.
//
// opcode shapes (int32 slots):
//   OP_TYPE       type_id values_id          — 3 slots
//   OP_ALT        alt_pc                     — 2 slots  (push backtrack)
//   OP_JUMP       target_pc                  — 2 slots
//   OP_COMMIT                                — 1 slot   (pop backtrack)
//   OP_CAP_BEGIN  slot_id                    — 2 slots
//   OP_CAP_END    slot_id                    — 2 slots
//   OP_BALANCED   punct_id open close maxtok — 5 slots
//   OP_MATCH                                 — 1 slot
//
// any_of(A, B, C):
//   ALT L1; <A>; COMMIT; JUMP end;
//   L1: ALT L2; <B>; COMMIT; JUMP end;
//   L2: <C>;            (last branch — no ALT, failure propagates)
//   end:
//
// optional(inner):
//   ALT end; <inner>; COMMIT; end:
//
// value_id -1 means "no value constraint". otherwise indexes a packed
// Uint16Array value pool with an int32 offsets side table — see
// compile_value_set / value_set_matches below.

const OP_TYPE = 0;
const OP_ALT = 1;
const OP_JUMP = 2;
const OP_COMMIT = 3;
const OP_CAP_BEGIN = 4;
const OP_CAP_END = 5;
const OP_BALANCED = 6;
const OP_MATCH = 7;

// per-rule-group compilation context. one `CompileCtx` is built per
// `rewrite_types` call and threaded through every rule compile. the program
// buffer grows monotonically; all rules' code shares it with per-rule
// `when_pc` entry points. value_pool and value_offsets are similarly shared
// across all rules in the group.
interface CompileCtx {
  program: Int32Array; // growable via reserve()
  program_len: number; // current write cursor (valid slots = program[0..len))
  value_pool: Uint16Array; // growable
  value_pool_len: number;
  value_offsets: Int32Array; // [2 * id] = offset, [2 * id + 1] = n_values
  value_offsets_len: number; // # of allocated value sets (entries = 2 * this)
}

function make_compile_ctx(): CompileCtx {
  return {
    program: new Int32Array(64),
    program_len: 0,
    value_pool: new Uint16Array(32),
    value_pool_len: 0,
    value_offsets: new Int32Array(16),
    value_offsets_len: 0,
  };
}

function reserve_program(ctx: CompileCtx, slots: number): void {
  const need = ctx.program_len + slots;
  if (need <= ctx.program.length) return;
  let next = ctx.program.length * 2;
  while (next < need) next *= 2;
  const grown = new Int32Array(next);
  grown.set(ctx.program);
  ctx.program = grown;
}

function emit(ctx: CompileCtx, ...words: number[]): void {
  reserve_program(ctx, words.length);
  for (let i = 0; i < words.length; i++) {
    ctx.program[ctx.program_len++] = words[i];
  }
}

// compile a value set (string[] | null) into the shared pool, return id.
// id -1 means "no constraint". no dedup — value sets are small and rules few.
function compile_value_set(ctx: CompileCtx, values: string[] | null): number {
  if (values === null) return -1;
  // grow value_offsets if needed (each entry = 2 int32 slots).
  if ((ctx.value_offsets_len + 1) * 2 > ctx.value_offsets.length) {
    const grown = new Int32Array(ctx.value_offsets.length * 2);
    grown.set(ctx.value_offsets);
    ctx.value_offsets = grown;
  }
  // compute total code units across all values (+ 1 length header each).
  let total = 0;
  for (let i = 0; i < values.length; i++) total += 1 + values[i].length;
  if (ctx.value_pool_len + total > ctx.value_pool.length) {
    let next = ctx.value_pool.length * 2;
    while (next < ctx.value_pool_len + total) next *= 2;
    const grown = new Uint16Array(next);
    grown.set(ctx.value_pool);
    ctx.value_pool = grown;
  }
  const id = ctx.value_offsets_len;
  const offset = ctx.value_pool_len;
  ctx.value_offsets[id * 2] = offset;
  ctx.value_offsets[id * 2 + 1] = values.length;
  ctx.value_offsets_len++;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    ctx.value_pool[ctx.value_pool_len++] = v.length;
    for (let j = 0; j < v.length; j++) {
      ctx.value_pool[ctx.value_pool_len++] = v.charCodeAt(j);
    }
  }
  return id;
}

// capture-slot allocator scoped to a single rule. distinct names get dense
// indices 0..n-1. max_slots is read by run_rewrite_loop to clear the dirty
// bitfield at rule entry.
interface CaptureSlots {
  name_to_slot: Map<string, number>;
  max_slots: number;
}

function make_capture_slots(): CaptureSlots {
  return { name_to_slot: new Map(), max_slots: 0 };
}

function allocate_slot(slots: CaptureSlots, name: string): number {
  let id = slots.name_to_slot.get(name);
  if (id === undefined) {
    id = slots.max_slots++;
    slots.name_to_slot.set(name, id);
  }
  return id;
}

// recursive emitter. all forward jumps are back-patched: when the target PC
// is not yet known (ALT next_alt_pc, JUMP end_pc), we emit a placeholder
// (0) and record the operand PC in a local patch list, then overwrite the
// slot once the target PC is known.
function compile_pattern_bytecode(
  spec: TokenPatternSpec,
  name_to_id: Map<string, number>,
  ctx: CompileCtx,
  slots: CaptureSlots,
): void {
  switch (spec.__kind) {
    case "type": {
      const type_id = name_to_id.get(spec.type_name) ?? NEVER_MATCHES;
      let value_values: string[] | null = null;
      if (spec.value !== undefined) {
        value_values = Array.isArray(spec.value) ? spec.value : [spec.value];
      }
      const values_id = compile_value_set(ctx, value_values);
      emit(ctx, OP_TYPE, type_id, values_id);
      return;
    }
    case "seq": {
      for (let i = 0; i < spec.children.length; i++) {
        compile_pattern_bytecode(spec.children[i], name_to_id, ctx, slots);
      }
      return;
    }
    case "anyOf": {
      // emit each branch; all but the last is preceded by ALT and
      // followed by COMMIT + JUMP end. patch addresses once known.
      const end_patch_pcs: number[] = [];
      const branches = spec.branches;
      for (let i = 0; i < branches.length; i++) {
        const is_last = i === branches.length - 1;
        let alt_patch_pc = -1;
        if (!is_last) {
          emit(ctx, OP_ALT, 0);
          alt_patch_pc = ctx.program_len - 1;
        }
        compile_pattern_bytecode(branches[i], name_to_id, ctx, slots);
        if (!is_last) {
          emit(ctx, OP_COMMIT);
          emit(ctx, OP_JUMP, 0);
          end_patch_pcs.push(ctx.program_len - 1);
          // back-patch ALT -> next branch start
          ctx.program[alt_patch_pc] = ctx.program_len;
        }
      }
      const end_pc = ctx.program_len;
      for (let i = 0; i < end_patch_pcs.length; i++) {
        ctx.program[end_patch_pcs[i]] = end_pc;
      }
      return;
    }
    case "optional": {
      emit(ctx, OP_ALT, 0);
      const alt_patch_pc = ctx.program_len - 1;
      compile_pattern_bytecode(spec.inner, name_to_id, ctx, slots);
      emit(ctx, OP_COMMIT);
      ctx.program[alt_patch_pc] = ctx.program_len;
      return;
    }
    case "capture": {
      const slot = allocate_slot(slots, spec.name);
      emit(ctx, OP_CAP_BEGIN, slot);
      compile_pattern_bytecode(spec.inner, name_to_id, ctx, slots);
      emit(ctx, OP_CAP_END, slot);
      return;
    }
    case "balanced": {
      const punct_id = name_to_id.get("punctuation") ?? NEVER_MATCHES;
      emit(
        ctx,
        OP_BALANCED,
        punct_id,
        spec.open.charCodeAt(0),
        spec.close.charCodeAt(0),
        spec.max_tokens ?? 200,
      );
      return;
    }
  }
}

// dev-only helper. prints one-opcode-per-line disassembly starting at
// start_pc, stopping when it hits the first OP_MATCH. useful for debugging
// the compiler output when tests disagree with expectations.
//
// not exported — call from a debugger or temporarily export during bring-up.
function disassemble_program(program: Int32Array, start_pc: number, end_pc: number): string {
  const lines: string[] = [];
  let pc = start_pc;
  while (pc < end_pc) {
    const op = program[pc];
    let line: string;
    switch (op) {
      case OP_TYPE:
        line = `${pc}: TYPE type=${program[pc + 1]} values=${program[pc + 2]}`;
        pc += 3;
        break;
      case OP_ALT:
        line = `${pc}: ALT -> ${program[pc + 1]}`;
        pc += 2;
        break;
      case OP_JUMP:
        line = `${pc}: JUMP -> ${program[pc + 1]}`;
        pc += 2;
        break;
      case OP_COMMIT:
        line = `${pc}: COMMIT`;
        pc += 1;
        break;
      case OP_CAP_BEGIN:
        line = `${pc}: CAP_BEGIN slot=${program[pc + 1]}`;
        pc += 2;
        break;
      case OP_CAP_END:
        line = `${pc}: CAP_END slot=${program[pc + 1]}`;
        pc += 2;
        break;
      case OP_BALANCED:
        line = `${pc}: BALANCED punct=${program[pc + 1]} open=${program[pc + 2]} close=${program[pc + 3]} max=${program[pc + 4]}`;
        pc += 5;
        break;
      case OP_MATCH:
        line = `${pc}: MATCH`;
        pc += 1;
        break;
      default:
        line = `${pc}: <unknown op ${op}>`;
        pc += 1;
        break;
    }
    lines.push(line);
    if (op === OP_MATCH) break;
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// bytecode interpreter (forward matcher)
// ---------------------------------------------------------------------------
//
// module-scope state, reused across all matches. we pay allocation cost once
// and grow on demand when a rule has more than 128 backtrack frames deep or
// more than 32 capture slots — neither has ever been observed in practice.
//
// bt_stack is a flat pair-packed Int32Array: each push writes (alt_pc, idx)
// at [sp] and [sp+1]. BT_STRIDE = 2. sp counts ints, not pairs, so capacity
// checks use `sp + 2 > length`.
//
// cap_starts / cap_ends are indexed by slot_id. cap_dirty_words is a
// bitfield: word w = cap_dirty_words[slot >>> 5], bit = 1 << (slot & 31).
// at rule entry we clear only the words covering that rule's max slots,
// which is almost always a single `cap_dirty_words[0] = 0`.

const BT_STRIDE = 2;
let bt_stack = new Int32Array(128 * BT_STRIDE);

let cap_starts = new Uint32Array(8);
let cap_ends = new Uint32Array(8);
let cap_dirty_words = new Uint32Array(1);

function ensure_cap_capacity(slots: number): void {
  if (slots > cap_starts.length) {
    let next = cap_starts.length * 2;
    while (next < slots) next *= 2;
    const new_starts = new Uint32Array(next);
    new_starts.set(cap_starts);
    cap_starts = new_starts;
    const new_ends = new Uint32Array(next);
    new_ends.set(cap_ends);
    cap_ends = new_ends;
  }
  const words_needed = slots > 0 ? (slots + 31) >>> 5 : 0;
  if (words_needed > cap_dirty_words.length) {
    const grown = new Uint32Array(words_needed);
    grown.set(cap_dirty_words);
    cap_dirty_words = grown;
  }
}

// compare a token's source range against one of the packed value sets.
// returns true if any value in the set equals the token's source text.
// length mismatch is the fast reject; only on length-match do we compare
// code units. no `input.slice()` — saves a string alloc per check.
function value_set_matches(
  pool: Uint16Array,
  offsets: Int32Array,
  id: number,
  input: string,
  s: number,
  e: number,
): boolean {
  const token_len = e - s;
  const base = id * 2;
  const start = offsets[base];
  const n = offsets[base + 1];
  let p = start;
  for (let i = 0; i < n; i++) {
    const len = pool[p++];
    if (len === token_len) {
      let ok = true;
      for (let j = 0; j < len; j++) {
        if (pool[p + j] !== input.charCodeAt(s + j)) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
    p += len;
  }
  return false;
}

// balanced-paren scanner lifted out of the old match_balanced — identical
// logic, just called from the OP_BALANCED handler. reads the open paren
// from the token at `idx`, then walks subsequent punctuation tokens until
// depth returns to zero. returns the idx after the closing token or
// NO_MATCH on failure / overflow.
function run_balanced(
  tokens: Uint32Array,
  idx: number,
  count: number,
  input: string,
  punct_id: number,
  open_code: number,
  close_code: number,
  max_tokens: number,
): number {
  if (idx >= count) return NO_MATCH;
  const base = idx * 3;
  if (tokens[base] !== punct_id) return NO_MATCH;
  let depth = 0;
  const start = tokens[base + 1];
  const end = tokens[base + 2];
  if (input.charCodeAt(start) !== open_code) return NO_MATCH;
  for (let p = start; p < end; p++) {
    const c = input.charCodeAt(p);
    if (c === open_code) depth++;
    else if (c === close_code) {
      depth--;
      if (depth === 0) return idx + 1;
    }
  }
  const limit = Math.min(count, idx + 1 + max_tokens);
  for (let i = idx + 1; i < limit; i++) {
    const b = i * 3;
    if (tokens[b] === punct_id) {
      const s = tokens[b + 1];
      const e = tokens[b + 2];
      for (let p = s; p < e; p++) {
        const c = input.charCodeAt(p);
        if (c === open_code) depth++;
        else if (c === close_code) {
          depth--;
          if (depth === 0) return i + 1;
        }
      }
    }
  }
  return NO_MATCH;
}

// iterative bytecode VM for the forward matcher. returns the token idx
// after the last matched token on success, or NO_MATCH on full failure.
// clears the capture dirty bitfield at entry so the caller can read only
// slots that were written during this match.
//
// trivia skipping is done inside OP_TYPE, OP_BALANCED, and OP_CAP_BEGIN —
// matching the semantics of the tree matcher where `skip_trivia` was
// called at the top of each match_pattern invocation but not for
// non-advancing constructs (ALT/COMMIT/JUMP/CAP_END).
//
// backtrack semantics intentionally do NOT roll back captures (preserving
// reclassifier.ts semantics where failed branches within any_of leave
// stale captures that later successful branches overwrite, and on full
// rule failure the caller discards everything).
function match_bytecode(
  program: Int32Array,
  start_pc: number,
  tokens: Uint32Array,
  idx: number,
  count: number,
  input: string,
  trivia: Uint8Array,
  value_pool: Uint16Array,
  value_offsets: Int32Array,
  max_capture_slots: number,
): number {
  if (max_capture_slots > 0) {
    ensure_cap_capacity(max_capture_slots);
    const n_words = (max_capture_slots + 31) >>> 5;
    for (let w = 0; w < n_words; w++) cap_dirty_words[w] = 0;
  }

  let pc = start_pc;
  let bt_sp = 0;
  let bt = bt_stack;
  let failed = false;

  while (true) {
    const op = program[pc];
    switch (op) {
      case OP_TYPE: {
        while (idx < count && trivia[tokens[idx * 3]]) idx++;
        if (idx >= count) {
          failed = true;
          break;
        }
        const type_id = program[pc + 1];
        const base = idx * 3;
        if (tokens[base] !== type_id) {
          failed = true;
          break;
        }
        const values_id = program[pc + 2];
        if (values_id >= 0) {
          if (
            !value_set_matches(
              value_pool,
              value_offsets,
              values_id,
              input,
              tokens[base + 1],
              tokens[base + 2],
            )
          ) {
            failed = true;
            break;
          }
        }
        idx++;
        pc += 3;
        break;
      }
      case OP_ALT: {
        if (bt_sp + BT_STRIDE > bt.length) {
          const grown = new Int32Array(bt.length * 2);
          grown.set(bt);
          bt = grown;
          bt_stack = grown;
        }
        bt[bt_sp++] = program[pc + 1];
        bt[bt_sp++] = idx;
        pc += 2;
        break;
      }
      case OP_JUMP: {
        pc = program[pc + 1];
        break;
      }
      case OP_COMMIT: {
        bt_sp -= BT_STRIDE;
        pc += 1;
        break;
      }
      case OP_CAP_BEGIN: {
        while (idx < count && trivia[tokens[idx * 3]]) idx++;
        const slot = program[pc + 1];
        cap_starts[slot] = idx;
        pc += 2;
        break;
      }
      case OP_CAP_END: {
        const slot = program[pc + 1];
        cap_ends[slot] = idx;
        cap_dirty_words[slot >>> 5] |= 1 << (slot & 31);
        pc += 2;
        break;
      }
      case OP_BALANCED: {
        while (idx < count && trivia[tokens[idx * 3]]) idx++;
        const punct_id = program[pc + 1];
        const open_code = program[pc + 2];
        const close_code = program[pc + 3];
        const max_tokens = program[pc + 4];
        const new_idx = run_balanced(
          tokens,
          idx,
          count,
          input,
          punct_id,
          open_code,
          close_code,
          max_tokens,
        );
        if (new_idx === NO_MATCH) {
          failed = true;
          break;
        }
        idx = new_idx;
        pc += 5;
        break;
      }
      case OP_MATCH: {
        return idx;
      }
      default: {
        // unreachable — defensive. treat as failure.
        failed = true;
        break;
      }
    }
    if (failed) {
      if (bt_sp === 0) return NO_MATCH;
      bt_sp -= BT_STRIDE;
      pc = bt[bt_sp];
      idx = bt[bt_sp + 1];
      failed = false;
    }
  }
}

// silence "declared but not used" for the dev-only disassembler until we
// choose to export it. referenced here so Biome doesn't strip it.
void disassemble_program;

// ---------------------------------------------------------------------------
// claim helpers
// ---------------------------------------------------------------------------
//
// claims express "this token should be type X with precedence P". within a
// single claim-producing pass, `rewrite_types`' first-match-wins semantics
// means at most one claim per token per pass. across batched passes, multiple
// claims for the same token may coexist and merge_claims resolves the winner
// by precedence (higher wins; ties broken by emission order).
//
// the precedence table below reflects JS/TS conventions, because those are
// the pipelines with 2+ rewrite_types calls where conflicts actually occur.
// the mapping is "more specific role wins over less specific" — a class_name
// beats a type beats a function beats a property beats a bare identifier.
// types that never conflict in practice (keywords, literals, punctuation,
// operators) get stable but arbitrary positions.

// ordered from lowest to highest precedence. types absent from this map
// fall back to DEFAULT_PRECEDENCE, which sits above `identifier` but below
// the language-specific roles — so unknown claims still beat a bare
// identifier but lose to an explicit role claim.
const PRECEDENCE_TABLE: Record<string, number> = {
  identifier: 0,
  punctuation: 5,
  operator: 5,
  variable: 10,
  property: 20,
  function: 30,
  builtin: 40,
  type: 45,
  class_name: 50,
  lifetime: 55,
  keyword: 70,
  boolean: 75,
  null: 75,
  number: 75,
  comment: 80,
  string: 80,
};
const DEFAULT_PRECEDENCE = 25;

function precedence_for(type_name: string): number {
  const p = PRECEDENCE_TABLE[type_name];
  return p === undefined ? DEFAULT_PRECEDENCE : p;
}

// allocation-free claim collector. emit() stores (token_idx, type_id,
// precedence) triplets in three parallel Int32Arrays. the same sink is
// reused across all producers in a batch and across calls (see
// shared_sink below) so no per-match allocation happens in the hot path.
class ClaimBuffer implements ClaimSink {
  count = 0;
  capacity: number;
  token_idx: Int32Array;
  type_id: Int32Array;
  precedence: Int32Array;

  constructor(initial_capacity = 1024) {
    this.capacity = initial_capacity;
    this.token_idx = new Int32Array(initial_capacity);
    this.type_id = new Int32Array(initial_capacity);
    this.precedence = new Int32Array(initial_capacity);
  }

  emit(token_idx: number, type_id: number, precedence: number): void {
    if (this.count >= this.capacity) this.grow();
    this.token_idx[this.count] = token_idx;
    this.type_id[this.count] = type_id;
    this.precedence[this.count] = precedence;
    this.count++;
  }

  reset(): void {
    this.count = 0;
  }

  private grow(): void {
    const cap = this.capacity * 2;
    const new_token_idx = new Int32Array(cap);
    const new_type_id = new Int32Array(cap);
    const new_precedence = new Int32Array(cap);
    new_token_idx.set(this.token_idx);
    new_type_id.set(this.type_id);
    new_precedence.set(this.precedence);
    this.token_idx = new_token_idx;
    this.type_id = new_type_id;
    this.precedence = new_precedence;
    this.capacity = cap;
  }
}

// shared sink reused across reclassifier invocations — avoids reallocating
// the parallel arrays every call. safe because reclassify is synchronous
// and never nested (pipeline entries run sequentially).
const shared_sink = new ClaimBuffer();

// merge buffered claims into a dense per-token winner table and apply in
// one pass. higher precedence wins; on tie, the first-emitted claim wins
// (we use strict greater-than on later claims).
function merge_and_apply_buffer(tokens: Uint32Array, buf: ClaimBuffer): void {
  if (buf.count === 0) return;
  const token_count = tokens.length / 3;
  // -1 sentinel marks "no winner yet" since valid type_ids are >= 0.
  const winner_type = new Int32Array(token_count).fill(-1);
  const winner_prec = new Int32Array(token_count);
  const bti = buf.token_idx;
  const btt = buf.type_id;
  const btp = buf.precedence;
  for (let i = 0; i < buf.count; i++) {
    const idx = bti[i];
    const prec = btp[i];
    if (winner_type[idx] === -1 || prec > winner_prec[idx]) {
      winner_type[idx] = btt[i];
      winner_prec[idx] = prec;
    }
  }
  for (let i = 0; i < token_count; i++) {
    const t = winner_type[i];
    if (t !== -1) tokens[i * 3] = t;
  }
}

// ---------------------------------------------------------------------------
// rewrite_types
// ---------------------------------------------------------------------------

interface CompiledRule {
  anchor_id: number;
  // -1 means no value constraint; otherwise an id into the shared value
  // pool (same layout as the bytecode matcher's value_set_matches).
  anchor_value_id: number;
  // anchor rewrite target (phase 1 form). -1 means no anchor rewrite.
  anchor_target_id: number;
  // capture rewrite targets (phase 3 form). null if no capture rewrites.
  // slot_id is the dense slot index assigned by the bytecode compiler
  // and used to read cap_starts / cap_ends / cap_dirty_words after a
  // successful match.
  capture_targets: { slot_id: number; target_id: number }[] | null;
  before: CompiledPattern | null;
  // bytecode-compiled forward matcher: `when_pc` is the entry into the
  // shared program buffer; `max_capture_slots` is how many slots this
  // rule reserves so the interpreter clears only those dirty bits.
  when_pc: number;
  max_capture_slots: number;
}

/**
 * build a Reclassifier that walks the token stream once and, for each rule,
 * attempts to match at every token whose type equals the rule's anchor. on
 * match, either the anchor token's type or a set of captured token spans
 * are rewritten to the rule's target type(s).
 *
 * rules within one `rewrite_types` call apply first-match-wins per position.
 * for cascading rewrites, compose multiple `rewrite_types(...)` transforms in
 * the pipeline passed to `reclassify`.
 */
// compiled form of a rewrite_types() call. anchor_id and the bytecode's
// matcher type_ids reference the ORIGINAL vocabulary seen at compile time
// (indices 0..compile_base_len) — those are always stable across calls.
// target ids (anchor_target_id, capture_targets[].target_id) may reference
// types appended during compile; appended_names captures those by name so
// the caller can re-resolve them against its runtime token_types and build
// a remap table when the two don't line up (batched claim mode).
interface CompiledRewriteState {
  compile_base_len: number;
  appended_names: string[];
  compiled: CompiledRule[];
  anchor_offset: Int32Array;
  anchor_count: Uint8Array;
  rule_table: CompiledRule[];
  trivia: Uint8Array;
  program: Int32Array;
  value_pool: Uint16Array;
  value_offsets: Int32Array;
}

function compile_rewrite(
  rules: RewriteRule[],
  options: RewriteOptions,
  input_types: string[],
): CompiledRewriteState {
  // compile against a scratch copy so we don't pollute the caller's input
  // token_types (grammars share token_types arrays across calls via the
  // tokenizer, and earlier versions of this code accidentally grew that
  // shared array).
  const scratch = input_types.slice();
  const name_to_id = new Map<string, number>();
  for (let i = 0; i < scratch.length; i++) name_to_id.set(scratch[i], i);
  const compile_base_len = scratch.length;
  const ensure_id = (name: string): number => {
    let id = name_to_id.get(name);
    if (id === undefined) {
      id = scratch.length;
      scratch.push(name);
      name_to_id.set(name, id);
    }
    return id;
  };

  const ctx = make_compile_ctx();
  const compiled: CompiledRule[] = [];
  for (const rule of rules) {
    const anchor_spec =
      typeof rule.anchor === "string"
        ? {
            type_name: rule.anchor,
            value: undefined as string | string[] | undefined,
          }
        : { type_name: rule.anchor.type_name, value: rule.anchor.value };
    const anchor_id = name_to_id.get(anchor_spec.type_name);
    if (anchor_id === undefined) continue;

    const slots = make_capture_slots();
    const when_pc = ctx.program_len;
    if (rule.when !== undefined) {
      compile_pattern_bytecode(rule.when, name_to_id, ctx, slots);
    }
    emit(ctx, OP_MATCH);

    let anchor_target_id = -1;
    let capture_targets: { slot_id: number; target_id: number }[] | null = null;
    if (typeof rule.rewrite === "string") {
      anchor_target_id = ensure_id(rule.rewrite);
    } else {
      capture_targets = [];
      for (const name of Object.keys(rule.rewrite)) {
        const slot_id = slots.name_to_slot.get(name);
        if (slot_id === undefined) continue;
        capture_targets.push({
          slot_id,
          target_id: ensure_id(rule.rewrite[name]),
        });
      }
    }

    let anchor_value_id = -1;
    if (anchor_spec.value !== undefined) {
      const values = Array.isArray(anchor_spec.value) ? anchor_spec.value : [anchor_spec.value];
      anchor_value_id = compile_value_set(ctx, values);
    }

    compiled.push({
      anchor_id,
      anchor_value_id,
      anchor_target_id,
      capture_targets,
      before: rule.before ? compile_pattern(rule.before, name_to_id) : null,
      when_pc,
      max_capture_slots: slots.max_slots,
    });
  }

  const type_count = Math.max(256, scratch.length);
  const anchor_offset = new Int32Array(type_count);
  anchor_offset.fill(-1);
  const anchor_count = new Uint8Array(type_count);
  const rule_table: CompiledRule[] = [];
  const buckets = new Map<number, CompiledRule[]>();
  for (const r of compiled) {
    let list = buckets.get(r.anchor_id);
    if (!list) {
      list = [];
      buckets.set(r.anchor_id, list);
    }
    list.push(r);
  }
  for (const [anchor_id, list] of buckets) {
    anchor_offset[anchor_id] = rule_table.length;
    anchor_count[anchor_id] = list.length;
    for (const r of list) rule_table.push(r);
  }

  const trivia = new Uint8Array(Math.max(256, scratch.length));
  if (options.trivia) {
    for (const name of options.trivia) {
      const id = name_to_id.get(name);
      if (id !== undefined) trivia[id] = 1;
    }
  }

  const program = ctx.program.slice(0, ctx.program_len);
  const value_pool = ctx.value_pool.slice(0, ctx.value_pool_len);
  const value_offsets = ctx.value_offsets.slice(0, ctx.value_offsets_len * 2);

  return {
    compile_base_len,
    appended_names: scratch.slice(compile_base_len),
    compiled,
    anchor_offset,
    anchor_count,
    rule_table,
    trivia,
    program,
    value_pool,
    value_offsets,
  };
}

// resolve each appended_name to its current id in token_types, extending
// token_types when the name isn't already present. returns a remap from
// compile-time index to runtime id so the loop can translate target_ids.
// note: the caller owns token_types — apply mode passes a cloned copy,
// claim mode passes the shared batch copy (and accepts the in-place push).
function resolve_appended(state: CompiledRewriteState, token_types: string[]): Int32Array {
  const n = state.appended_names.length;
  const remap = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const name = state.appended_names[i];
    let id = -1;
    for (let k = 0; k < token_types.length; k++) {
      if (token_types[k] === name) {
        id = k;
        break;
      }
    }
    if (id < 0) {
      id = token_types.length;
      token_types.push(name);
    }
    remap[i] = id;
  }
  return remap;
}

// translate a compile-time target id to a runtime id. ids below
// compile_base_len reference the original vocabulary and are stable; ids at
// or above compile_base_len are entries in appended_names and need remap.
function runtime_target(
  compile_time_id: number,
  state: CompiledRewriteState,
  remap: Int32Array,
): number {
  if (compile_time_id < state.compile_base_len) return compile_time_id;
  return remap[compile_time_id - state.compile_base_len];
}

/**
 * build a Reclassifier that walks the token stream once and, for each rule,
 * attempts to match at every token whose type equals the rule's anchor. on
 * match, either the anchor token's type or a set of captured token spans
 * are rewritten to the rule's target type(s).
 *
 * rules within one `rewrite_types` call apply first-match-wins per position.
 * the returned reclassifier is claim-producing: it can run in apply mode
 * (the default — callable as a Reclassifier, mutates its own cloned stream)
 * or in batch mode via `.__claim`, where the pipeline runner collects claims
 * from multiple rewrite_types passes, merges them by precedence, and applies
 * once. across batched passes, ordering no longer matters — the winner for
 * each token is determined by the precedence of the claimed type.
 */
export function rewrite_types(
  rules: RewriteRule[],
  options: RewriteOptions = {},
): ClaimingReclassifier {
  // cache the compiled state, keyed on the input token_types reference.
  // in apply mode this rarely hits (tokenize returns fresh arrays) but the
  // cache is cheap to maintain and avoids recompiling for repeated calls
  // that happen to share an input. the batch-mode pipeline hits the cache
  // reliably for consecutive calls within one invocation.
  let cached_input_types: string[] | null = null;
  let cached_state: CompiledRewriteState | null = null;

  function get_state(input_types: string[]): CompiledRewriteState {
    if (cached_input_types === input_types && cached_state !== null) {
      return cached_state;
    }
    cached_state = compile_rewrite(rules, options, input_types);
    cached_input_types = input_types;
    return cached_state;
  }

  function collect(
    input: string,
    tokens: Uint32Array,
    token_types: string[],
    state: CompiledRewriteState,
    sink: ClaimSink,
  ): void {
    if (state.compiled.length === 0) return;
    const remap = resolve_appended(state, token_types);
    run_rewrite_loop_claims(input, tokens, token_types, state, remap, sink);
  }

  const apply_fn: Reclassifier = (input, result) => {
    const tokens = new Uint32Array(result.tokens);
    const token_types = result.token_types.slice();
    const state = get_state(result.token_types);
    // local sink — apply_fn may be called reentrantly while the shared
    // sink is in use by an outer batch.
    const sink = new ClaimBuffer(256);
    collect(input, tokens, token_types, state, sink);
    merge_and_apply_buffer(tokens, sink);
    return { tokens, token_types };
  };

  const claim_fn: ClaimFn = (input, tokens, token_types, sink) => {
    const state = get_state(token_types);
    collect(input, tokens, token_types, state, sink);
  };

  const fn = apply_fn as ClaimingReclassifier;
  fn.__claim = claim_fn;
  return fn;
}

// walk the token stream emitting claims for every first-match anchor
// position. target ids are translated via `remap` so callers can freely
// share token_types with other passes without id collisions. the matcher
// type_ids in the bytecode (OP_TYPE etc.) reference original-vocab indices
// and never need remapping — they refer to types the grammar actually
// emits.
function run_rewrite_loop_claims(
  input: string,
  tokens: Uint32Array,
  token_types: string[],
  state: CompiledRewriteState,
  remap: Int32Array,
  sink: ClaimSink,
): void {
  const count = tokens.length / 3;
  const { anchor_offset, anchor_count, rule_table, trivia, program, value_pool, value_offsets } =
    state;
  for (let i = 0; i < count; i++) {
    const type = tokens[i * 3];
    if (trivia[type]) continue;
    const offset = anchor_offset[type];
    if (offset < 0) continue;
    const rcount = anchor_count[type];

    for (let r = 0; r < rcount; r++) {
      const rule = rule_table[offset + r];
      if (rule.anchor_value_id !== -1) {
        const s = tokens[i * 3 + 1];
        const e = tokens[i * 3 + 2];
        if (!value_set_matches(value_pool, value_offsets, rule.anchor_value_id, input, s, e)) {
          continue;
        }
      }
      if (rule.before !== null) {
        const behind = match_pattern_backward(rule.before, tokens, i - 1, input, trivia);
        if (behind === NO_MATCH) continue;
      }
      const end = match_bytecode(
        program,
        rule.when_pc,
        tokens,
        i + 1,
        count,
        input,
        trivia,
        value_pool,
        value_offsets,
        rule.max_capture_slots,
      );
      if (end === NO_MATCH) continue;

      // emit claims. anchor-target form flips the anchor's type;
      // capture-target form claims every token inside each captured
      // range (only when the slot's dirty bit is set, i.e. the capture
      // actually fired — optional captures may not).
      if (rule.anchor_target_id !== -1) {
        const target_id = runtime_target(rule.anchor_target_id, state, remap);
        sink.emit(i, target_id, precedence_for(token_types[target_id]));
      }
      if (rule.capture_targets !== null) {
        for (let c = 0; c < rule.capture_targets.length; c++) {
          const target = rule.capture_targets[c];
          const slot = target.slot_id;
          if ((cap_dirty_words[slot >>> 5] & (1 << (slot & 31))) === 0) {
            continue;
          }
          const s = cap_starts[slot];
          const e = cap_ends[slot];
          const target_id = runtime_target(target.target_id, state, remap);
          const p = precedence_for(token_types[target_id]);
          for (let t = s; t < e; t++) {
            sink.emit(t, target_id, p);
          }
        }
      }
      break; // first-match-wins per position
    }
  }
}

// ---------------------------------------------------------------------------
// embed_grammars
// ---------------------------------------------------------------------------
//
// match tokens of specific host types and replace them with sub-tokenized
// content from another language. the sub language function is expected to
// be the output of `create_language` (or any equivalent shape) -- it takes the
// host token's source slice and returns a fully enriched TokenizeResult in
// its own vocabulary.
//
// **flat merging.** sub token types are merged into the host's token_types
// array by name. if the sub has "identifier" and the host already has
// "identifier", they share an ID in the merged array. if the sub has a
// type the host doesn't (e.g. "selector" from CSS), it's appended. sub
// token IDs are remapped via a per-embed remap table built from the merge.
// host token IDs are preserved, so any later transforms that were compiled
// against the host's original vocabulary keep working unchanged.
//
// **positions.** sub tokens come out with offsets relative to the content
// slice. each sub token's start/end is shifted by the host token's start
// so that positions remain global to the original `input`.
//
// **sub reclassifiers.** the sub's reclassifiers run inside its own
// language function before splicing, so they only see sub tokens and the
// isolation is automatic. host-level transforms that run AFTER embedding
// see the merged stream and can potentially fire on sub tokens; the
// convention is to run host rewrite rules BEFORE embed_grammars in the
// pipeline so host rules only see host tokens.

interface NormalizedEmbedEntry {
  language: LanguageFn;
  trim_start: number;
  trim_end: number;
  wrap_token: string | null;
}

function normalize_embed_entry(value: LanguageFn | EmbedEntry): NormalizedEmbedEntry {
  if (typeof value === "function") {
    return { language: value, trim_start: 0, trim_end: 0, wrap_token: null };
  }
  return {
    language: value.language,
    trim_start: value.trim_start ?? 0,
    trim_end: value.trim_end ?? 0,
    wrap_token: value.wrap_token ?? null,
  };
}

export function embed_grammars(mapping: EmbedMapping): Reclassifier {
  return (input: string, result: TokenizeResult): TokenizeResult => {
    const host_tokens = result.tokens;
    const host_types = result.token_types;
    const host_count = host_tokens.length / 3;

    // resolve mapping keys to host type_ids. keys that don't exist in the
    // host's token_types map to -1 and are silently ignored, so embed rules
    // referencing tokens the host doesn't emit are harmless.
    const by_type_id = new Map<number, NormalizedEmbedEntry>();
    for (const name of Object.keys(mapping)) {
      const id = host_types.indexOf(name);
      if (id !== -1) by_type_id.set(id, normalize_embed_entry(mapping[name]));
    }
    if (by_type_id.size === 0) return result;

    // first pass: scan for matches, sub-tokenize, and compute the final
    // token count so we can allocate the output Uint32Array once.
    interface Embed {
      host_idx: number;
      sub: TokenizeResult;
      content_start: number; // input-global start of sub content
      entry: NormalizedEmbedEntry;
      host_start: number; // input-global start of the original host token
      host_end: number; // input-global end of the original host token
    }
    const embeds: Embed[] = [];
    let new_count = host_count;
    for (let i = 0; i < host_count; i++) {
      const type_id = host_tokens[i * 3];
      const entry = by_type_id.get(type_id);
      if (!entry) continue;
      const host_start = host_tokens[i * 3 + 1];
      const host_end = host_tokens[i * 3 + 2];
      // trim a fixed number of chars from each end before sub-tokenizing.
      // guards against the trim being larger than the token itself.
      const content_start = Math.min(host_start + entry.trim_start, host_end);
      const content_end = Math.max(host_end - entry.trim_end, content_start);
      const content = input.slice(content_start, content_end);
      const sub = entry.language(content);
      const sub_count = sub.tokens.length / 3;
      embeds.push({
        host_idx: i,
        sub,
        content_start,
        entry,
        host_start,
        host_end,
      });
      // one host token is replaced by: [optional start wrapper] + sub
      // tokens + [optional end wrapper]. count the wrappers only when
      // the trim actually skipped something AND wrap_token is set.
      let replacement = sub_count;
      if (entry.wrap_token !== null) {
        if (entry.trim_start > 0) replacement++;
        if (entry.trim_end > 0) replacement++;
      }
      new_count = new_count - 1 + replacement;
    }

    if (embeds.length === 0) return result;

    // merge sub token_types into a cloned host token_types. dedup by name.
    const token_types = host_types.slice();
    const name_to_id = new Map<string, number>();
    for (let i = 0; i < token_types.length; i++) name_to_id.set(token_types[i], i);
    const ensure_id = (name: string): number => {
      let id = name_to_id.get(name);
      if (id === undefined) {
        id = token_types.length;
        token_types.push(name);
        name_to_id.set(name, id);
      }
      return id;
    };

    // build a per-embed remap: sub_type_id -> merged_type_id. cache by sub
    // token_types reference so repeated embeds of the same language reuse
    // one remap table (which also catches cached languages returning the
    // same token_types array).
    const remap_cache = new WeakMap<string[], Uint32Array>();
    const remap_for = (sub_types: string[]): Uint32Array => {
      let remap = remap_cache.get(sub_types);
      if (remap) return remap;
      remap = new Uint32Array(sub_types.length);
      for (let i = 0; i < sub_types.length; i++) {
        remap[i] = ensure_id(sub_types[i]);
      }
      remap_cache.set(sub_types, remap);
      return remap;
    };

    // second pass: write the merged token stream.
    const tokens = new Uint32Array(new_count * 3);
    let write_idx = 0;
    let embed_idx = 0;
    for (let i = 0; i < host_count; i++) {
      if (embed_idx < embeds.length && embeds[embed_idx].host_idx === i) {
        const { sub, content_start, entry, host_start, host_end } = embeds[embed_idx++];
        const remap = remap_for(sub.token_types);
        const wrap_id = entry.wrap_token !== null ? ensure_id(entry.wrap_token) : -1;

        // leading delimiter wrapper (e.g. opening backtick).
        if (wrap_id !== -1 && entry.trim_start > 0) {
          tokens[write_idx * 3] = wrap_id;
          tokens[write_idx * 3 + 1] = host_start;
          tokens[write_idx * 3 + 2] = content_start;
          write_idx++;
        }
        // sub tokens with positions offset to input-global coords.
        const sub_count = sub.tokens.length / 3;
        for (let j = 0; j < sub_count; j++) {
          const base = j * 3;
          tokens[write_idx * 3] = remap[sub.tokens[base]];
          tokens[write_idx * 3 + 1] = sub.tokens[base + 1] + content_start;
          tokens[write_idx * 3 + 2] = sub.tokens[base + 2] + content_start;
          write_idx++;
        }
        // trailing delimiter wrapper (e.g. closing backtick).
        if (wrap_id !== -1 && entry.trim_end > 0) {
          tokens[write_idx * 3] = wrap_id;
          tokens[write_idx * 3 + 1] = host_end - entry.trim_end;
          tokens[write_idx * 3 + 2] = host_end;
          write_idx++;
        }
      } else {
        const base = i * 3;
        tokens[write_idx * 3] = host_tokens[base];
        tokens[write_idx * 3 + 1] = host_tokens[base + 1];
        tokens[write_idx * 3 + 2] = host_tokens[base + 2];
        write_idx++;
      }
    }

    return { tokens, token_types };
  };
}

// ---------------------------------------------------------------------------
// embed_interleaved
// ---------------------------------------------------------------------------
//
// generic discontinuous embedding. a scanner callback identifies a "group"
// of host tokens where some source ranges are content (to be tokenized by a
// sub-language) and others are holes (host tokens to pass through verbatim).
// the transform builds a virtual source -- a single string where content
// chunks are concatenated and hole chunks are placeholder-filled -- tokenizes
// it in ONE call to the sub-language (state flows across holes), then maps
// the resulting sub-tokens back to real positions and splices host hole
// tokens into the output in source order.
//
// this is the correct solution for tagged templates with interpolations,
// JSX expression containers, Svelte/Vue/Angular templates, heredocs with
// variable substitution, and any other case where a sub-language's content
// is discontinuous in the host stream.

interface PosMapEntry {
  // virtual source range this entry covers [v_start, v_end).
  v_start: number;
  v_end: number;
  // for content entries: the real source start this virtual range maps to.
  // real_pos = real_start + (v_pos - v_start).
  real_start: number;
}

interface GroupBuild {
  // index in the output token sequence (not yet allocated) where the group
  // starts. emitted tokens for this group land at this position.
  out_idx: number;
  // all tokens to emit for this group, in source order.
  out: GroupToken[];
  // range in the host token stream this group replaces [token_start, token_end).
  token_start: number;
  token_end: number;
}

interface GroupToken {
  type: number; // type ID in the MERGED token_types
  start: number;
  end: number;
}

// safety bound on the iterative scan loop. in practice, nested tagged
// templates are shallow (1-3 levels); this just prevents a pathological or
// buggy scanner from running forever.
const MAX_EMBED_ITERATIONS = 16;

export function embed_interleaved(config: EmbedInterleavedConfig): Reclassifier {
  const hole_char = config.hole_char ?? " ";
  return (input: string, result: TokenizeResult): TokenizeResult => {
    // iterate the single-pass transform until it reaches a fixed point.
    //
    // why iterate: the scan loop advances past each matched group via
    // `i = desc.token_end`, so it skips over the group's hole tokens. if a
    // hole contains ANOTHER tagged template (e.g. `` html`<style>${css`...`}</style>` ``
    // has an inner `css`...`` living inside an interpolation hole of the
    // outer `html` template), the first pass never sees it -- the hole
    // tokens are emitted verbatim in the output. a second pass over the
    // new stream will find the inner template because its JS tokens are
    // still JS tokens (HTML/CSS tokens from the first pass get
    // fast-rejected by the scanner). each subsequent pass peels off one
    // more level of nesting. we stop as soon as a pass finds no groups.
    let current = result;
    for (let iter = 0; iter < MAX_EMBED_ITERATIONS; iter++) {
      const next = embed_interleaved_once(config, hole_char, input, current);
      if (next === current) return current;
      current = next;
    }
    // safety bound hit -- return whatever we have. shouldn't happen for
    // well-formed inputs and a reasonable scanner.
    return current;
  };
}

function embed_interleaved_once(
  config: EmbedInterleavedConfig,
  hole_char: string,
  input: string,
  result: TokenizeResult,
): TokenizeResult {
  const host_tokens = result.tokens;
  const host_types = result.token_types;
  const host_count = host_tokens.length / 3;

  // clone token_types so the transform is pure. we'll grow this as sub
  // grammars contribute new type names.
  const token_types = host_types.slice();
  const name_to_id = new Map<string, number>();
  for (let i = 0; i < token_types.length; i++) name_to_id.set(token_types[i], i);
  const ensure_id = (name: string): number => {
    let id = name_to_id.get(name);
    if (id === undefined) {
      id = token_types.length;
      token_types.push(name);
      name_to_id.set(name, id);
    }
    return id;
  };

  // cache per-sub-language type remaps so repeated groups of the same
  // language don't re-walk token_types.
  const remap_cache = new WeakMap<string[], Uint32Array>();
  const remap_for = (sub_types: string[]): Uint32Array => {
    let remap = remap_cache.get(sub_types);
    if (remap) return remap;
    remap = new Uint32Array(sub_types.length);
    for (let i = 0; i < sub_types.length; i++) {
      remap[i] = ensure_id(sub_types[i]);
    }
    remap_cache.set(sub_types, remap);
    return remap;
  };

  // first pass: walk host tokens, call scan at each index. for each
  // group returned, build the replacement output and record it.
  const groups: GroupBuild[] = [];
  let new_count = host_count;
  let i = 0;
  while (i < host_count) {
    const desc = config.scan(host_tokens, input, i, token_types);
    if (desc === null) {
      i++;
      continue;
    }
    const sub_lang = desc.language ?? config.language;
    if (sub_lang === undefined) {
      // scanner returned a descriptor but no language is available.
      // bail out of this group -- treat it as if scan returned null.
      i++;
      continue;
    }
    const group_out = process_group(
      desc,
      input,
      host_tokens,
      sub_lang,
      hole_char,
      remap_for,
      ensure_id,
    );
    groups.push({
      out_idx: 0, // filled in during the second pass
      out: group_out,
      token_start: desc.token_start,
      token_end: desc.token_end,
    });
    new_count += group_out.length - (desc.token_end - desc.token_start);
    i = desc.token_end > i ? desc.token_end : i + 1;
  }

  // fixed-point: no groups found this pass, return the SAME reference so
  // the caller can terminate the iteration.
  if (groups.length === 0) return result;

  // second pass: assemble the output token array, copying host tokens
  // outside group ranges verbatim and splicing each group's output at
  // its position.
  const tokens = new Uint32Array(new_count * 3);
  let write_idx = 0;
  let group_idx = 0;
  let host_idx = 0;
  while (host_idx < host_count) {
    if (group_idx < groups.length && groups[group_idx].token_start === host_idx) {
      const g = groups[group_idx++];
      for (let k = 0; k < g.out.length; k++) {
        const t = g.out[k];
        tokens[write_idx * 3] = t.type;
        tokens[write_idx * 3 + 1] = t.start;
        tokens[write_idx * 3 + 2] = t.end;
        write_idx++;
      }
      host_idx = g.token_end;
      continue;
    }
    const base = host_idx * 3;
    tokens[write_idx * 3] = host_tokens[base];
    tokens[write_idx * 3 + 1] = host_tokens[base + 1];
    tokens[write_idx * 3 + 2] = host_tokens[base + 2];
    write_idx++;
    host_idx++;
  }

  return {
    tokens: tokens.subarray(0, write_idx * 3),
    token_types,
  };
}

/**
 * build the replacement output for one group: construct virtual source +
 * position map, sub-tokenize, split sub-tokens at hole boundaries, and
 * emit regions in source order.
 */
function process_group(
  desc: GroupDescriptor,
  input: string,
  host_tokens: Uint32Array,
  sub_language: LanguageFn,
  hole_char: string,
  remap_for: (sub_types: string[]) => Uint32Array,
  ensure_id: (name: string) => number,
): GroupToken[] {
  // step 1: build virtual source and content position map.
  // the position map covers ONLY content regions -- their virtual ranges
  // are what sub-tokens will refer to. hole ranges in the virtual source
  // exist but sub-tokens covering them will be dropped (or split around).
  let virtual_source = "";
  const content_map: PosMapEntry[] = [];
  // virtual ranges of holes, in virtual-source order. used to split
  // sub-tokens that straddle a hole boundary.
  const hole_virtual_ranges: { v_start: number; v_end: number }[] = [];

  for (let r = 0; r < desc.regions.length; r++) {
    const region = desc.regions[r];
    if (region.kind === "content") {
      const slice = input.slice(region.source_start, region.source_end);
      const v_start = virtual_source.length;
      virtual_source += slice;
      content_map.push({
        v_start,
        v_end: virtual_source.length,
        real_start: region.source_start,
      });
    } else if (region.kind === "hole") {
      const len = region.source_end - region.source_start;
      const v_start = virtual_source.length;
      // use single-char placeholder repeated to match the byte length.
      // byte-aligned so positions map cleanly.
      virtual_source +=
        hole_char.length === 1 ? hole_char.repeat(len) : hole_char.repeat(len).slice(0, len);
      hole_virtual_ranges.push({ v_start, v_end: virtual_source.length });
    }
    // synthetic regions don't contribute to virtual source.
  }

  // step 2: tokenize the virtual source as one unit.
  const sub_result = sub_language(virtual_source);
  const sub_tokens = sub_result.tokens;
  const sub_count = sub_tokens.length / 3;
  const remap = remap_for(sub_result.token_types);

  // step 3: split each sub-token at hole boundaries and remap to real
  // positions. store the results keyed by the content region they fall
  // into so we can emit them in source order in step 4.
  //
  // a sub-token whose virtual range is [v_start, v_end) produces one piece
  // per content region it intersects. pieces entirely inside holes are
  // dropped.
  interface SubPiece {
    type: number;
    v_start: number; // for sorting + emission ordering
    real_start: number;
    real_end: number;
  }
  const sub_pieces: SubPiece[] = [];
  for (let j = 0; j < sub_count; j++) {
    const base = j * 3;
    const orig_type = sub_tokens[base];
    const v_start = sub_tokens[base + 1];
    const v_end = sub_tokens[base + 2];
    const mapped_type = remap[orig_type];
    // walk content map entries overlapping [v_start, v_end).
    for (let c = 0; c < content_map.length; c++) {
      const entry = content_map[c];
      if (entry.v_end <= v_start) continue;
      if (entry.v_start >= v_end) break;
      const piece_v_start = Math.max(v_start, entry.v_start);
      const piece_v_end = Math.min(v_end, entry.v_end);
      if (piece_v_end <= piece_v_start) continue;
      const real_start = entry.real_start + (piece_v_start - entry.v_start);
      const real_end = entry.real_start + (piece_v_end - entry.v_start);
      sub_pieces.push({
        type: mapped_type,
        v_start: piece_v_start,
        real_start,
        real_end,
      });
    }
  }
  // sort by virtual start just in case -- content map entries are already
  // in order so sub-pieces for one sub-token are in order, but two
  // sub-tokens with the same v_start (rare) aren't guaranteed to sort.
  sub_pieces.sort((a, b) => a.v_start - b.v_start);

  // step 4: emit regions in source order. for content regions, pull sub
  // pieces whose real_start lies within the region's source range. for
  // hole regions, emit the original host tokens. for synthetic regions,
  // emit a fresh token.
  const out: GroupToken[] = [];
  let piece_idx = 0;
  for (let r = 0; r < desc.regions.length; r++) {
    const region = desc.regions[r];
    if (region.kind === "content") {
      while (
        piece_idx < sub_pieces.length &&
        sub_pieces[piece_idx].real_start < region.source_end
      ) {
        const p = sub_pieces[piece_idx++];
        out.push({ type: p.type, start: p.real_start, end: p.real_end });
      }
    } else if (region.kind === "hole") {
      for (let ti = region.token_start; ti < region.token_end; ti++) {
        const base = ti * 3;
        out.push({
          type: host_tokens[base],
          start: host_tokens[base + 1],
          end: host_tokens[base + 2],
        });
      }
    } else if (region.kind === "synthetic") {
      out.push({
        type: ensure_id(region.type_name),
        start: region.source_start,
        end: region.source_end,
      });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/**
 * compose a list of Reclassifier transforms into a single function that
 * applies them in order. mutating reclassifiers run sequentially, each
 * seeing the previous pass's output. consecutive CLAIM-producing passes
 * (those with a `__claim` property, currently produced only by
 * `rewrite_types`) are BATCHED: they all see the same frozen input, their
 * claims accumulate, merge by precedence, and apply once. any mutating
 * pass between two claim-producers breaks the batch — the first batch
 * flushes before the mutating pass runs.
 *
 * effect: between claim-producers, ordering no longer matters — the winner
 * for each token is the claim with the highest precedence, not the
 * last-to-write. non-claim-producing passes keep their old sequential
 * semantics.
 *
 * ```
 * const enriched = reclassify([
 *   rewrite_types(js_function_variable_rules, { trivia: ["comment"] }),
 *   rewrite_types(js_property_rules, { trivia: ["comment"] }),
 * ])(input, tokenize(input, js_grammar));
 * ```
 */
function is_claiming(fn: Reclassifier): fn is ClaimingReclassifier {
  return "__claim" in fn && typeof (fn as ClaimingReclassifier).__claim === "function";
}

export function reclassify(
  pipeline: ReclassifierPipeline,
): (input: string, result: TokenizeResult) => TokenizeResult {
  return (input, result) => {
    let current = result;
    let batch: ClaimingReclassifier[] = [];
    for (let i = 0; i < pipeline.length; i++) {
      const fn = pipeline[i];
      if (is_claiming(fn)) {
        batch.push(fn);
        continue;
      }
      if (batch.length > 0) {
        current = flush_claim_batch(input, current, batch);
        batch = [];
      }
      current = fn(input, current);
    }
    if (batch.length > 0) {
      current = flush_claim_batch(input, current, batch);
    }
    return current;
  };
}

// run every claim-producer in `batch` against the same base `current`,
// accumulate their claims, merge by precedence, and apply once. the cloned
// token_types is shared across the batch so name→id extensions stay
// consistent (each claim-producer calls resolve_appended on the SAME
// array, deduping names that a prior batch member already appended).
function flush_claim_batch(
  input: string,
  current: TokenizeResult,
  batch: ClaimingReclassifier[],
): TokenizeResult {
  const tokens = new Uint32Array(current.tokens);
  const token_types = current.token_types.slice();
  // reuse the module-level sink. all batch producers emit into it
  // sequentially; we apply the merged winners once at the end.
  shared_sink.reset();
  for (let i = 0; i < batch.length; i++) {
    batch[i].__claim(input, tokens, token_types, shared_sink);
  }
  merge_and_apply_buffer(tokens, shared_sink);
  return { tokens, token_types };
}

// ---------------------------------------------------------------------------
// create_language
// ---------------------------------------------------------------------------

/**
 * tag a reclassifier with the token type(s) it produces so the language
 * factory can gate it on a fidelity setting. a pass tagged with `['function']`
 * runs under `fidelity: 'high'` or `fidelity: ['function', ...]`, and is
 * skipped under `fidelity: 'low'` or `fidelity: []`.
 *
 * the `layer` argument places the reclassifier in its execution tier:
 *
 *   shape       — changes token stream shape (merges/splits tokens).
 *   type_claim  — rewrites token TYPES only. the common case and the default.
 *   embed       — splices sub-language tokens into the host stream.
 *
 * for always-on correctness passes that should run at every fidelity, use
 * `always(reclassifier, layer)` instead of `tag` so they're explicitly labelled
 * rather than leaving the reclassifier as a bare function in the pipeline.
 */
export function tag(
  reclassifier: Reclassifier,
  produces: string[],
  layer: ReclassifierLayer = "type_claim",
): TaggedReclassifier {
  return { reclassifier, produces, layer };
}

/**
 * mark a reclassifier as always-on and assign it an execution layer.
 * always-on passes run at every fidelity setting; they're typically
 * correctness fixups (shape passes) or cross-language composition (embed
 * passes) rather than identifier-detail enrichment.
 */
export function always(reclassifier: Reclassifier, layer: ReclassifierLayer): TaggedReclassifier {
  return { reclassifier, produces: [], layer };
}

/**
 * wrap a raw ClaimFn into a ClaimingReclassifier — callable as a plain
 * Reclassifier (apply mode: clone tokens+token_types, run claim_fn, merge
 * by precedence, apply) and also exposes a `__claim` method so the
 * pipeline runner can batch this pass alongside other claim producers.
 *
 * apply mode runs merge_claims before applying so a single pass that
 * happens to emit multiple claims for one token (rare — most claim-fns
 * emit at most one per position) produces deterministic output.
 */
export function as_claim_producer(claim_fn: ClaimFn): ClaimingReclassifier {
  const apply_fn: Reclassifier = (input, result) => {
    const tokens = new Uint32Array(result.tokens);
    const token_types = result.token_types.slice();
    const sink = new ClaimBuffer(256);
    claim_fn(input, tokens, token_types, sink);
    merge_and_apply_buffer(tokens, sink);
    return { tokens, token_types };
  };
  const fn = apply_fn as ClaimingReclassifier;
  fn.__claim = claim_fn;
  return fn;
}

function is_tagged(entry: ReclassifierEntry): entry is TaggedReclassifier {
  return typeof entry !== "function";
}

// always-on = tagged entry whose produces list is empty. matches the
// old "plain Reclassifier in the pipeline" semantics now that every pass
// carries a layer label.
function is_always_on(entry: TaggedReclassifier): boolean {
  return entry.produces.length === 0;
}

function select_pipeline(
  pipeline: LanguagePipeline,
  fidelity: FidelitySpec | undefined,
): ReclassifierPipeline {
  // 'high' (or omitted) runs every pass.
  if (fidelity === undefined || fidelity === "high") {
    return pipeline.map((entry) => (is_tagged(entry) ? entry.reclassifier : entry));
  }
  if (fidelity === "low") {
    // keep plain Reclassifier entries (legacy always-on) and tagged
    // always-on entries (new layered correctness passes). drop every
    // fidelity-gated tagged entry.
    const selected: ReclassifierPipeline = [];
    for (const entry of pipeline) {
      if (!is_tagged(entry)) {
        selected.push(entry);
        continue;
      }
      if (is_always_on(entry)) selected.push(entry.reclassifier);
    }
    return selected;
  }
  // array allowlist — match by intersection with `produces`. unknown names
  // are tolerated (they simply exclude no extra passes). always-on entries
  // (empty produces) always run.
  const allow = new Set(fidelity);
  const selected: ReclassifierPipeline = [];
  for (const entry of pipeline) {
    if (!is_tagged(entry)) {
      selected.push(entry);
      continue;
    }
    if (is_always_on(entry)) {
      selected.push(entry.reclassifier);
      continue;
    }
    if (entry.produces.some((p) => allow.has(p))) {
      selected.push(entry.reclassifier);
    }
  }
  return selected;
}

/**
 * bundle a compiled grammar with its reclassifier pipeline into a tokenize
 * factory. every language package wraps one and re-exports it as `tokenize`
 * (raw tokens) alongside a `language` HTML wrapper:
 *
 * ```
 * // in @twinkleplop/javascript
 * export const tokenize = create_language(grammar, reclassifiers);
 * export function language(opts) {
 *   const t = tokenize(opts);
 *   return (src, render) => to_html(src, t(src), render);
 * }
 *
 * // in consumer code that wants raw tokens
 * import { tokenize as js } from "@twinkleplop/javascript";
 * const t      = js();                                // full fidelity
 * const bare   = js({ fidelity: "low" });             // no reclassifiers
 * const partial = js({ fidelity: ["function", "type"] });
 * const tokens = t(source);
 * ```
 *
 * pipeline entries may be plain reclassifier functions (always run) or
 * `tag(fn, produces)` (gated by fidelity). consumers who want a custom
 * pipeline can still import `grammar` and `reclassifiers` separately and
 * compose them manually.
 */
export function create_language(
  grammar: CompiledGrammar,
  pipeline: LanguagePipeline = [],
): LanguageFactory {
  return (options?: LanguageOptions): LanguageFn => {
    const run = reclassify(select_pipeline(pipeline, options?.fidelity));
    const downgrade = build_downgrade(grammar.token_types, options?.fidelity);
    return (input: string) => {
      const result = run(input, tokenize(input, grammar));
      if (downgrade !== null) apply_downgrade(result.tokens, downgrade);
      return result;
    };
  };
}

// grammar-native token types that the grammar state machine emits directly
// (without help from a reclassifier). when fidelity excludes them, the
// language factory remaps them to their base type at the end of the
// pipeline — preserves the "low fidelity = bare grammar tokens" contract
// even though the grammar itself runs at full detail.
export const GRAMMAR_EXTENSION_DOWNGRADES: Record<string, string> = {
  boolean: "identifier",
  function: "identifier",
  decorator: "identifier",
};

// categories that the grammar layer can emit directly (outside the
// reclassifier pipeline) and which the fidelity system knows how to
// downgrade. useful for UI layers that build toggle lists — a language
// offers any of these as opt-out categories when its compiled grammar's
// `token_types` includes the name.
export const GRAMMAR_EXTENSION_CATEGORIES: readonly string[] = Object.keys(
  GRAMMAR_EXTENSION_DOWNGRADES,
);

// build a dense per-type remap: remap[type_id] is the target id when
// that type should be downgraded, or -1 to leave it alone. returns null
// when no downgrade is needed (fidelity='high' or the allowlist already
// covers every grammar extension).
function build_downgrade(
  token_types: string[],
  fidelity: FidelitySpec | undefined,
): Int32Array | null {
  if (fidelity === undefined || fidelity === "high") return null;
  const allow = fidelity === "low" ? null : new Set<string>(fidelity as readonly string[]);
  const remap = new Int32Array(token_types.length);
  remap.fill(-1);
  let has_any = false;
  for (const [ext, base] of Object.entries(GRAMMAR_EXTENSION_DOWNGRADES)) {
    if (allow !== null && allow.has(ext)) continue;
    const src_id = token_types.indexOf(ext);
    if (src_id < 0) continue;
    const dst_id = token_types.indexOf(base);
    if (dst_id < 0) continue;
    remap[src_id] = dst_id;
    has_any = true;
  }
  return has_any ? remap : null;
}

function apply_downgrade(tokens: Uint32Array, remap: Int32Array): void {
  const n = tokens.length / 3;
  const cap = remap.length;
  for (let i = 0; i < n; i++) {
    const t = tokens[i * 3];
    if (t < cap) {
      const m = remap[t];
      if (m >= 0) tokens[i * 3] = m;
    }
  }
}
