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

import { build_annotation_extractor } from "./annotation";
import { debug_enabled, warn_once } from "./debug";
import { tokenize } from "./tokenizer";
import { FRAME_BRACKET_BRACE, FRAME_KIND_TOP, SIGNAL_TERNARY_COLON } from "./types";
import type {
  AnyOfPatternSpec,
  BalancedPatternSpec,
  CapturePatternSpec,
  CharPredName,
  ClaimFn,
  ClaimSink,
  ClaimingReclassifier,
  CompiledGrammar,
  EmbedEntry,
  EmbedInterleavedConfig,
  EmbedMapping,
  FidelitySpec,
  FrameTable,
  GroupDescriptor,
  LanguageFactory,
  LanguageFn,
  LanguageOptions,
  LanguagePipeline,
  NotPatternSpec,
  OptionalPatternSpec,
  ParamsPatternSpec,
  Reclassifier,
  ReclassifierEntry,
  ReclassifierLayer,
  ReclassifierPipeline,
  Region,
  RepeatPatternSpec,
  RewriteOptions,
  RewriteRule,
  SeqPatternSpec,
  TaggedReclassifier,
  TokenizeResult,
  TokenPatternSpec,
  TypePatternSpec,
  TypeSpanPatternSpec,
} from "./types";

// ---------------------------------------------------------------------------
// DSL combinators
// ---------------------------------------------------------------------------

/**
 * Match a single token of the given type, optionally with a source-text
 * value constraint or a character-class predicate over its source text.
 *
 * `value` exact-matches against one of the provided strings.
 * `text_pred` runs a built-in predicate (e.g. "upper_snake_case") against
 * the token's source. Both filters apply when both are set.
 */
export function type(
  type_name: string,
  value?: string | string[],
  options?: { text_pred?: CharPredName },
): TypePatternSpec {
  return { __kind: "type", type_name, value, text_pred: options?.text_pred };
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

/**
 * Tag the inner pattern's span with a capture name for rewrite targeting.
 * Each successful match of the capture records one span, so a capture
 * inside a repeat body records every iteration; a `{ name: type }`
 * rewrite map retags every token in every recorded span. Spans recorded
 * inside branches the matcher later abandons are discarded.
 */
export function capture(name: string, inner: TokenPatternSpec): CapturePatternSpec {
  return { __kind: "capture", name, inner };
}

/**
 * Walk tokens counting paren depth inside bracket-carrying tokens until
 * depth returns to zero. Advances across all token types (strings,
 * identifiers, etc.) but only counts parens that appear in tokens of
 * `punct_type` (default "punctuation"), so parens in string/comment
 * content don't affect the depth.
 *
 * The max_tokens bound prevents pathological runaway scans.
 */
export function balanced_parens(
  open = "(",
  close = ")",
  max_tokens = 200,
  punct_type = "punctuation",
): BalancedPatternSpec {
  return { __kind: "balanced", open, close, max_tokens, punct_type };
}

/**
 * Match `inner` zero or more times, separated by `separator` when given
 * (`item`, `item sep item`, ... — the empty sequence also matches).
 *
 * The repetition is POSSESSIVE: once an iteration matches it is never
 * given back, so a pattern after the repeat must not also match an
 * iteration's start. An iteration that consumes nothing ends the loop.
 * Captures inside the body record one span per iteration.
 */
export function repeat(inner: TokenPatternSpec, separator?: TokenPatternSpec): RepeatPatternSpec {
  return { __kind: "repeat", inner, separator };
}

/**
 * Zero-width negative lookahead: succeed when the next non-trivia token
 * does NOT match `inner` (or the stream has ended), consuming nothing.
 * An `inner` naming an unknown type or predicate fails the whole pattern
 * (fail closed), consistent with the rest of the pattern language.
 */
export function not(inner: TypePatternSpec): NotPatternSpec {
  return { __kind: "not", inner };
}

/**
 * Char-aware parameter-list walk: locate an opening `(` from the current
 * position (see `find_open` modes), walk its separator chunks, and record
 * each tagged name token as one capture span under `into` — a
 * `{ into: type }` rewrite map then claims every parameter found.
 *
 * Grammars coalesce adjacent punctuation (`((`, `({`), so the paren body
 * is walked at character granularity. The walk itself never fails once
 * the open paren is located: an unterminated list still records the
 * names it reached, matching the imperative walkers this replaces.
 */
export function params(options: {
  into: string;
  find_open?: "starts_with" | "scan" | "arrow";
  strategy?: "first_ident" | "carry_pending";
  separator?: string;
  default_introducer?: string;
  transparent_texts_for_type?: { type: string; texts: string[] }[];
  skip_generics?: boolean;
  skip_ts_return_type?: boolean;
  skip_in_type_position?: boolean;
  scan_max_tokens?: number;
}): ParamsPatternSpec {
  return {
    __kind: "params",
    into: options.into,
    find_open: options.find_open ?? "starts_with",
    strategy: options.strategy ?? "first_ident",
    separator: options.separator ?? ",",
    default_introducer: options.default_introducer,
    transparent_texts_for_type: options.transparent_texts_for_type,
    skip_generics: options.skip_generics ?? false,
    skip_ts_return_type: options.skip_ts_return_type ?? false,
    skip_in_type_position: options.skip_in_type_position ?? false,
    scan_max_tokens: options.scan_max_tokens ?? 64,
  };
}

/**
 * Type-expression span walk: consume tokens in "type mode" from the
 * current position until a terminator, recording every identifier in
 * type position as one capture span under `into` — a `{ into: type }`
 * rewrite map then claims them all. See TypeSpanPatternSpec for the
 * exit rules. The walk itself never fails: an immediately-terminated
 * span matches empty and records nothing.
 */
export function type_span(options: {
  into: string;
  exit_on_comma?: boolean;
  exit_on_eq?: boolean;
  exit_on_qmark?: boolean;
  enter_angle?: boolean;
  brace_exit_on_closer?: boolean;
  value_op_terminators?: string[];
  stmt_keyword_terminators?: string[];
  type_terminal_keywords?: string[];
  verify_generic_args?: boolean;
}): TypeSpanPatternSpec {
  return {
    __kind: "type_span",
    into: options.into,
    exit_on_comma: options.exit_on_comma ?? true,
    exit_on_eq: options.exit_on_eq ?? true,
    exit_on_qmark: options.exit_on_qmark ?? false,
    enter_angle: options.enter_angle ?? false,
    brace_exit_on_closer: options.brace_exit_on_closer ?? false,
    value_op_terminators: options.value_op_terminators,
    stmt_keyword_terminators: options.stmt_keyword_terminators,
    type_terminal_keywords: options.type_terminal_keywords,
    verify_generic_args: options.verify_generic_args ?? false,
  };
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

// ---------------------------------------------------------------------------
// Matcher engine
// ---------------------------------------------------------------------------

// sentinel returned by the matchers to indicate a failed match; callers
// use `=== NO_MATCH` checks rather than sentinel-aware arithmetic so the
// value is otherwise opaque.
const NO_MATCH = -2;

// shared empty signals array for dispatch when no frame table is present,
// so the signal-gate path is a single length check either way.
const EMPTY_SIGNALS = new Uint8Array(0);

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
//   OP_TYPE       type_id values_id pred_id  — 4 slots
//   OP_ALT        alt_pc                     — 2 slots  (push backtrack)
//   OP_JUMP       target_pc                  — 2 slots
//   OP_COMMIT                                — 1 slot   (pop backtrack)
//   OP_CAP_BEGIN  slot_id                    — 2 slots
//   OP_CAP_END    slot_id                    — 2 slots
//   OP_BALANCED   punct_id open close maxtok — 5 slots
//   OP_MATCH                                 — 1 slot
//   OP_LOOP       body_pc                    — 2 slots  (possessive repeat)
//   OP_NOT_TYPE   type_id values_id pred_id  — 4 slots  (zero-width negation)
//   OP_PARAMS     spec_id slot_id            — 3 slots  (param-list walk)
//   OP_TYPE_SPAN  spec_id slot_id            — 3 slots  (type-mode walk)
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
// repeat(inner):
//   L: ALT end; <inner>; LOOP L; end:
// LOOP pops the iteration's ALT frame: no progress since the ALT ->
// fall through to the ALT's target (end); progress -> jump back to L.
// popping each iteration's frame is what makes the repeat possessive --
// the matcher can never backtrack into fewer iterations.
//
// repeat(inner, sep):
//   ALT end; <inner>; COMMIT; L: ALT end; <sep>; <inner>; LOOP L; end:
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
const OP_LOOP = 8;
const OP_NOT_TYPE = 9;
const OP_PARAMS = 10;
const OP_TYPE_SPAN = 11;

// resolved form of a ParamsPatternSpec: enum-coded modes, char codes, and
// type ids resolved against the compile-time vocabulary. referenced from
// OP_PARAMS by spec_id via the compile context's side table.
interface CompiledParamsSpec {
  find_open: number; // PARAMS_FIND_*
  strategy: number; // PARAMS_STRATEGY_*
  separator_code: number;
  default_introducer: string | null;
  // transparent texts indexed by token type id; null when none configured.
  transparent_by_type: (string[] | null)[] | null;
  skip_generics: boolean;
  skip_ts_return_type: boolean;
  skip_in_type_position: boolean;
  scan_max_tokens: number;
  ident_id: number;
  function_id: number; // -1 when the vocabulary has no "function"
  punct_id: number;
  operator_id: number; // -1 when the vocabulary has no "operator"
}

const PARAMS_FIND_STARTS_WITH = 0;
const PARAMS_FIND_SCAN = 1;
const PARAMS_FIND_ARROW = 2;
const PARAMS_STRATEGY_FIRST_IDENT = 0;
const PARAMS_STRATEGY_CARRY_PENDING = 1;

// a type name the vocabulary doesn't carry is dropped: no token can have it.
function compile_transparent_by_type(
  spec: ParamsPatternSpec,
  name_to_id: Map<string, number>,
): (string[] | null)[] | null {
  const entries = spec.transparent_texts_for_type;
  if (entries === undefined || entries.length === 0) return null;
  let by_type: (string[] | null)[] | null = null;
  for (const entry of entries) {
    if (entry.texts.length === 0) continue;
    const id = name_to_id.get(entry.type);
    if (id === undefined) continue;
    if (by_type === null) by_type = [];
    while (by_type.length <= id) by_type.push(null);
    const existing = by_type[id];
    by_type[id] = existing === null ? entry.texts.slice() : existing.concat(entry.texts);
  }
  return by_type;
}

function params_transparent_texts(spec: CompiledParamsSpec, kt: number): string[] | null {
  const by_type = spec.transparent_by_type;
  if (by_type === null || kt >= by_type.length) return null;
  return by_type[kt];
}

// a transparent text only steps aside when a name follows it: in
// `f(readonly: T)` the parameter IS `readonly`, and stepping over it would
// tag the annotation. punctuation ends the search, keeping it in the chunk.
function params_name_follows(
  spec: CompiledParamsSpec,
  tokens: Uint32Array,
  from: number,
  count: number,
  input: string,
  trivia: Uint8Array,
): boolean {
  for (let k = from; k < count; k++) {
    const base = k * 3;
    const kt = tokens[base];
    if (trivia[kt]) continue;
    if (kt === spec.ident_id) return true;
    const texts = params_transparent_texts(spec, kt);
    if (texts === null) return false;
    if (texts.indexOf(input.slice(tokens[base + 1], tokens[base + 2])) < 0) return false;
  }
  return false;
}

// resolved form of a TypeSpanPatternSpec: per-mode flags plus terminator
// sets compiled into the shared value pool, referenced from OP_TYPE_SPAN
// by spec_id via the compile context's side table.
interface CompiledTypeSpanSpec {
  exit_on_comma: boolean;
  exit_on_eq: boolean;
  exit_on_qmark: boolean;
  enter_angle: boolean;
  brace_exit_on_closer: boolean;
  verify_generic_args: boolean;
  // value-pool set ids, -1 when the set is empty / not configured.
  value_ops_id: number;
  stmt_keywords_id: number;
  terminal_keywords_id: number;
  ident_id: number;
  punct_id: number;
  // -1 when the vocabulary lacks the type; the related checks never match.
  keyword_id: number;
  operator_id: number;
  type_id: number;
}

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
  // side table for OP_PARAMS: resolved walk configs referenced by spec_id.
  params_specs: CompiledParamsSpec[];
  // side table for OP_TYPE_SPAN, same referencing scheme.
  span_specs: CompiledTypeSpanSpec[];
  // pc of the current rule's `when` entry, set by compile_rewrite before
  // each rule. lets position-sensitive constructs (arrow-mode params)
  // verify they sit first in the pattern.
  rule_start_pc: number;
}

function make_compile_ctx(): CompileCtx {
  return {
    program: new Int32Array(64),
    program_len: 0,
    value_pool: new Uint16Array(32),
    value_pool_len: 0,
    value_offsets: new Int32Array(16),
    value_offsets_len: 0,
    params_specs: [],
    span_specs: [],
    rule_start_pc: 0,
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
      let type_id = name_to_id.get(spec.type_name) ?? NEVER_MATCHES;
      if (type_id === NEVER_MATCHES) {
        warn_once(
          "rewrite_types",
          `pattern-type:${spec.type_name}`,
          `pattern references type "${spec.type_name}" which is not in the token vocabulary; the branch can never match`,
        );
      }
      let value_values: string[] | null = null;
      if (spec.value !== undefined) {
        value_values = Array.isArray(spec.value) ? spec.value : [spec.value];
      }
      const values_id = compile_value_set(ctx, value_values);
      let pred_id = -1;
      if (spec.text_pred !== undefined) {
        const resolved = resolve_char_pred(spec.text_pred);
        // misspelled predicate -> compile the type into NEVER_MATCHES so
        // the rule cannot fire, matching the anchor-level fail-closed rule.
        if (resolved < 0) {
          type_id = NEVER_MATCHES;
          warn_once(
            "rewrite_types",
            `pattern-pred:${spec.text_pred}`,
            `unknown text predicate "${spec.text_pred}"; the branch can never match`,
          );
        } else pred_id = resolved;
      }
      emit(ctx, OP_TYPE, type_id, values_id, pred_id);
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
      const punct_name = spec.punct_type ?? "punctuation";
      const punct_id = name_to_id.get(punct_name) ?? NEVER_MATCHES;
      if (punct_id === NEVER_MATCHES) {
        warn_once(
          "rewrite_types",
          `balanced-punct:${punct_name}`,
          `balanced pattern's bracket type "${punct_name}" is not in the token vocabulary; the branch can never match`,
        );
      }
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
    case "repeat": {
      if (spec.separator !== undefined) {
        // ALT end; <inner>; COMMIT; L: ALT end; <sep>; <inner>; LOOP L; end:
        emit(ctx, OP_ALT, 0);
        const zero_patch_pc = ctx.program_len - 1;
        compile_pattern_bytecode(spec.inner, name_to_id, ctx, slots);
        emit(ctx, OP_COMMIT);
        const loop_pc = ctx.program_len;
        emit(ctx, OP_ALT, 0);
        const iter_patch_pc = ctx.program_len - 1;
        compile_pattern_bytecode(spec.separator, name_to_id, ctx, slots);
        compile_pattern_bytecode(spec.inner, name_to_id, ctx, slots);
        emit(ctx, OP_LOOP, loop_pc);
        const end_pc = ctx.program_len;
        ctx.program[zero_patch_pc] = end_pc;
        ctx.program[iter_patch_pc] = end_pc;
        return;
      }
      // L: ALT end; <inner>; LOOP L; end:
      const loop_pc = ctx.program_len;
      emit(ctx, OP_ALT, 0);
      const iter_patch_pc = ctx.program_len - 1;
      compile_pattern_bytecode(spec.inner, name_to_id, ctx, slots);
      emit(ctx, OP_LOOP, loop_pc);
      ctx.program[iter_patch_pc] = ctx.program_len;
      return;
    }
    case "not": {
      const inner = spec.inner;
      let type_id = name_to_id.get(inner.type_name) ?? NEVER_MATCHES;
      let pred_id = -1;
      if (inner.text_pred !== undefined) {
        const resolved = resolve_char_pred(inner.text_pred);
        if (resolved < 0) type_id = NEVER_MATCHES;
        else pred_id = resolved;
      }
      // an inner spec that can never match would make the negation always
      // succeed -- fail OPEN. emit an always-fail instruction instead so a
      // misspelled name disables the rule, like everywhere else.
      if (type_id === NEVER_MATCHES) {
        warn_once(
          "rewrite_types",
          `not-inner:${inner.type_name}:${inner.text_pred ?? ""}`,
          `not() inner spec (type "${inner.type_name}") cannot resolve; the branch can never match`,
        );
        emit(ctx, OP_TYPE, NEVER_MATCHES, -1, -1);
        return;
      }
      let value_values: string[] | null = null;
      if (inner.value !== undefined) {
        value_values = Array.isArray(inner.value) ? inner.value : [inner.value];
      }
      const values_id = compile_value_set(ctx, value_values);
      emit(ctx, OP_NOT_TYPE, type_id, values_id, pred_id);
      return;
    }
    case "params": {
      const ident_id = name_to_id.get("identifier") ?? NEVER_MATCHES;
      const punct_id = name_to_id.get("punctuation") ?? NEVER_MATCHES;
      if (ident_id === NEVER_MATCHES || punct_id === NEVER_MATCHES) {
        warn_once(
          "rewrite_types",
          "params-base-types",
          'params() needs "identifier" and "punctuation" in the token vocabulary; the branch can never match',
        );
        emit(ctx, OP_TYPE, NEVER_MATCHES, -1, -1);
        return;
      }
      // arrow mode inspects the anchor token, which is only addressable
      // when nothing has consumed tokens before it. fail closed elsewhere.
      if (spec.find_open === "arrow" && ctx.program_len !== ctx.rule_start_pc) {
        warn_once(
          "rewrite_types",
          "params-arrow-position",
          'params({find_open: "arrow"}) must be the first element of when; the branch can never match',
        );
        emit(ctx, OP_TYPE, NEVER_MATCHES, -1, -1);
        return;
      }
      const slot = allocate_slot(slots, spec.into);
      const spec_id = ctx.params_specs.length;
      ctx.params_specs.push({
        find_open:
          spec.find_open === "starts_with"
            ? PARAMS_FIND_STARTS_WITH
            : spec.find_open === "scan"
              ? PARAMS_FIND_SCAN
              : PARAMS_FIND_ARROW,
        strategy:
          spec.strategy === "carry_pending"
            ? PARAMS_STRATEGY_CARRY_PENDING
            : PARAMS_STRATEGY_FIRST_IDENT,
        separator_code: spec.separator.charCodeAt(0),
        default_introducer: spec.default_introducer ?? null,
        transparent_by_type: compile_transparent_by_type(spec, name_to_id),
        skip_generics: spec.skip_generics,
        skip_ts_return_type: spec.skip_ts_return_type,
        skip_in_type_position: spec.skip_in_type_position,
        scan_max_tokens: spec.scan_max_tokens,
        ident_id,
        function_id: name_to_id.get("function") ?? -1,
        punct_id,
        operator_id: name_to_id.get("operator") ?? -1,
      });
      emit(ctx, OP_PARAMS, spec_id, slot);
      return;
    }
    case "type_span": {
      const ident_id = name_to_id.get("identifier") ?? NEVER_MATCHES;
      const punct_id = name_to_id.get("punctuation") ?? NEVER_MATCHES;
      if (ident_id === NEVER_MATCHES || punct_id === NEVER_MATCHES) {
        warn_once(
          "rewrite_types",
          "type-span-base-types",
          'type_span() needs "identifier" and "punctuation" in the token vocabulary; the branch can never match',
        );
        emit(ctx, OP_TYPE, NEVER_MATCHES, -1, -1);
        return;
      }
      const slot = allocate_slot(slots, spec.into);
      const spec_id = ctx.span_specs.length;
      const set_id = (values: string[] | undefined): number =>
        values !== undefined && values.length > 0 ? compile_value_set(ctx, values) : -1;
      ctx.span_specs.push({
        exit_on_comma: spec.exit_on_comma,
        exit_on_eq: spec.exit_on_eq,
        exit_on_qmark: spec.exit_on_qmark,
        enter_angle: spec.enter_angle,
        brace_exit_on_closer: spec.brace_exit_on_closer,
        verify_generic_args: spec.verify_generic_args,
        value_ops_id: set_id(spec.value_op_terminators),
        stmt_keywords_id: set_id(spec.stmt_keyword_terminators),
        terminal_keywords_id: set_id(spec.type_terminal_keywords),
        ident_id,
        punct_id,
        keyword_id: name_to_id.get("keyword") ?? -1,
        operator_id: name_to_id.get("operator") ?? -1,
        type_id: name_to_id.get("type") ?? -1,
      });
      emit(ctx, OP_TYPE_SPAN, spec_id, slot);
      return;
    }
  }
}

// compile a pattern for backward execution (`before` lookbehind clauses).
//
// shares opcodes with the forward compiler so the host runtime needs only
// one instruction set, but seq emits children in reverse order and
// balanced/capture aren't supported (lookbehind is bounded-left scanning
// only). misuses compile down to NEVER_MATCHES rather than throwing so a
// misconfigured rule fails closed at runtime.
function compile_reverse_pattern_bytecode(
  spec: TokenPatternSpec,
  name_to_id: Map<string, number>,
  ctx: CompileCtx,
): void {
  switch (spec.__kind) {
    case "type": {
      let type_id = name_to_id.get(spec.type_name) ?? NEVER_MATCHES;
      if (type_id === NEVER_MATCHES) {
        warn_once(
          "rewrite_types",
          `pattern-type:${spec.type_name}`,
          `pattern references type "${spec.type_name}" which is not in the token vocabulary; the branch can never match`,
        );
      }
      let value_values: string[] | null = null;
      if (spec.value !== undefined) {
        value_values = Array.isArray(spec.value) ? spec.value : [spec.value];
      }
      const values_id = compile_value_set(ctx, value_values);
      let pred_id = -1;
      if (spec.text_pred !== undefined) {
        const resolved = resolve_char_pred(spec.text_pred);
        if (resolved < 0) {
          type_id = NEVER_MATCHES;
          warn_once(
            "rewrite_types",
            `pattern-pred:${spec.text_pred}`,
            `unknown text predicate "${spec.text_pred}"; the branch can never match`,
          );
        } else pred_id = resolved;
      }
      emit(ctx, OP_TYPE, type_id, values_id, pred_id);
      return;
    }
    case "seq": {
      for (let i = spec.children.length - 1; i >= 0; i--) {
        compile_reverse_pattern_bytecode(spec.children[i], name_to_id, ctx);
      }
      return;
    }
    case "anyOf": {
      const end_patch_pcs: number[] = [];
      const branches = spec.branches;
      for (let i = 0; i < branches.length; i++) {
        const is_last = i === branches.length - 1;
        let alt_patch_pc = -1;
        if (!is_last) {
          emit(ctx, OP_ALT, 0);
          alt_patch_pc = ctx.program_len - 1;
        }
        compile_reverse_pattern_bytecode(branches[i], name_to_id, ctx);
        if (!is_last) {
          emit(ctx, OP_COMMIT);
          emit(ctx, OP_JUMP, 0);
          end_patch_pcs.push(ctx.program_len - 1);
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
      compile_reverse_pattern_bytecode(spec.inner, name_to_id, ctx);
      emit(ctx, OP_COMMIT);
      ctx.program[alt_patch_pc] = ctx.program_len;
      return;
    }
    case "capture":
    case "balanced":
    case "repeat":
    case "not":
    case "params":
    case "type_span":
      // not supported in lookbehind; emit an instruction that always fails.
      warn_once(
        "rewrite_types",
        `before-unsupported:${spec.__kind}`,
        `"${spec.__kind}" is not supported in before lookbehind; the rule can never match`,
      );
      emit(ctx, OP_TYPE, NEVER_MATCHES, -1, -1);
      return;
  }
}

// prints one-opcode-per-line disassembly starting at start_pc, stopping
// when it hits the first OP_MATCH. useful for debugging the compiler
// output when tests disagree with expectations. consumed by the exported
// `disassemble_rules` helper, which resolves type names for readability.
function disassemble_program(
  program: Int32Array,
  start_pc: number,
  end_pc: number,
  type_names?: string[],
): string {
  const name_of = (id: number): string =>
    type_names !== undefined && id >= 0 && id < type_names.length
      ? `${type_names[id]}(${id})`
      : `${id}`;
  const lines: string[] = [];
  let pc = start_pc;
  while (pc < end_pc) {
    const op = program[pc];
    let line: string;
    switch (op) {
      case OP_TYPE:
        line = `${pc}: TYPE type=${name_of(program[pc + 1])} values=${program[pc + 2]} pred=${program[pc + 3]}`;
        pc += 4;
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
        line = `${pc}: BALANCED punct=${name_of(program[pc + 1])} open=${program[pc + 2]} close=${program[pc + 3]} max=${program[pc + 4]}`;
        pc += 5;
        break;
      case OP_MATCH:
        line = `${pc}: MATCH`;
        pc += 1;
        break;
      case OP_LOOP:
        line = `${pc}: LOOP -> ${program[pc + 1]}`;
        pc += 2;
        break;
      case OP_NOT_TYPE:
        line = `${pc}: NOT_TYPE type=${name_of(program[pc + 1])} values=${program[pc + 2]} pred=${program[pc + 3]}`;
        pc += 4;
        break;
      case OP_PARAMS:
        line = `${pc}: PARAMS spec=${program[pc + 1]} slot=${program[pc + 2]}`;
        pc += 3;
        break;
      case OP_TYPE_SPAN:
        line = `${pc}: TYPE_SPAN spec=${program[pc + 1]} slot=${program[pc + 2]}`;
        pc += 3;
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
// more than 8 capture slots — neither has ever been observed in practice.
//
// bt_stack is a flat triple-packed Int32Array: each push writes (alt_pc,
// idx, cap_log_watermark) at [sp..sp+2]. BT_STRIDE = 3. sp counts ints,
// not frames, so capacity checks use `sp + 3 > length`.
//
// cap_starts is begin-position scratch indexed by slot_id. each completed
// capture appends a (slot, start_idx, end_idx) triplet to cap_log; a failed
// branch truncates the log back to its frame's watermark, so after a match
// the log holds exactly the captures of the successful path — one entry
// PER OCCURRENCE, which is what gives repeat() per-iteration captures.

const BT_STRIDE = 3;
let bt_stack = new Int32Array(128 * BT_STRIDE);

let cap_starts = new Uint32Array(8);
let cap_log = new Int32Array(64 * 3);
let cap_log_len = 0;

function ensure_cap_capacity(slots: number): void {
  if (slots > cap_starts.length) {
    let next = cap_starts.length * 2;
    while (next < slots) next *= 2;
    const new_starts = new Uint32Array(next);
    new_starts.set(cap_starts);
    cap_starts = new_starts;
  }
}

function push_cap_log(slot: number, start: number, end: number): void {
  if (cap_log_len + 3 > cap_log.length) {
    const grown = new Int32Array(cap_log.length * 2);
    grown.set(cap_log);
    cap_log = grown;
  }
  cap_log[cap_log_len] = slot;
  cap_log[cap_log_len + 1] = start;
  cap_log[cap_log_len + 2] = end;
  cap_log_len += 3;
}

// char-class predicates keyed by integer id (matches CharPredName order
// in types.ts). hot path -- one function per predicate, no name lookup.
//
// CHAR_PRED_UPPER_SNAKE matches /^[A-Z][A-Z0-9_]+$/ (length >= 2).
// CHAR_PRED_PASCAL matches an initial uppercase letter plus at least one
// lowercase letter somewhere in the body (single uppercase letters like
// generic param `T` are still accepted -- they cannot be upper-snake by
// the length-2 rule and conventionally read as types).
const CHAR_PRED_UPPER_SNAKE = 0;
const CHAR_PRED_PASCAL = 1;

const ASCII_UPPER_MIN_C = 0x41;
const ASCII_UPPER_MAX_C = 0x5a;
const ASCII_LOWER_MIN_C = 0x61;
const ASCII_LOWER_MAX_C = 0x7a;
const ASCII_DIGIT_MIN_C = 0x30;
const ASCII_DIGIT_MAX_C = 0x39;
const ASCII_UNDERSCORE_C = 0x5f;

function pred_upper_snake(input: string, s: number, e: number): boolean {
  if (e - s < 2) return false;
  const first = input.charCodeAt(s);
  if (first < ASCII_UPPER_MIN_C || first > ASCII_UPPER_MAX_C) return false;
  for (let k = s + 1; k < e; k++) {
    const c = input.charCodeAt(k);
    if (
      !(
        (c >= ASCII_UPPER_MIN_C && c <= ASCII_UPPER_MAX_C) ||
        (c >= ASCII_DIGIT_MIN_C && c <= ASCII_DIGIT_MAX_C) ||
        c === ASCII_UNDERSCORE_C
      )
    ) {
      return false;
    }
  }
  return true;
}

function pred_pascal(input: string, s: number, e: number): boolean {
  const first = input.charCodeAt(s);
  if (first < ASCII_UPPER_MIN_C || first > ASCII_UPPER_MAX_C) return false;
  if (e - s <= 1) return true;
  for (let k = s + 1; k < e; k++) {
    const c = input.charCodeAt(k);
    if (c >= ASCII_LOWER_MIN_C && c <= ASCII_LOWER_MAX_C) return true;
  }
  return false;
}

function text_pred_matches(pred_id: number, input: string, s: number, e: number): boolean {
  switch (pred_id) {
    case CHAR_PRED_UPPER_SNAKE:
      return pred_upper_snake(input, s, e);
    case CHAR_PRED_PASCAL:
      return pred_pascal(input, s, e);
    default:
      return false;
  }
}

function resolve_char_pred(name: string): number {
  switch (name) {
    case "upper_snake_case":
      return CHAR_PRED_UPPER_SNAKE;
    case "pascal_case":
      return CHAR_PRED_PASCAL;
    default:
      return -1;
  }
}

// reverse-direction value match: returns true if any value in the set is
// a SUFFIX of the token's source text. used by the reverse VM so adjacent
// coalesced punctuation tokens like `({` still match against a lookbehind
// that asks for `{` -- the trailing character (closest to the anchor) is
// what the lookbehind cares about.
function value_set_ends_with(
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
    if (len <= token_len) {
      let ok = true;
      const tok_offset = e - len;
      for (let j = 0; j < len; j++) {
        if (pool[p + j] !== input.charCodeAt(tok_offset + j)) {
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

// ---------------------------------------------------------------------------
// params construct runtime (OP_PARAMS)
// ---------------------------------------------------------------------------
//
// char-aware parameter-list walker. grammars coalesce adjacent punctuation
// ("((", "({"), so locating and walking paren bodies needs character
// offsets the token-granular opcodes cannot see. tagged name tokens are
// recorded as single-token capture spans via push_cap_log, so a rule's
// `{ name: type }` rewrite map claims every parameter the walk found --
// the per-occurrence capture log is what makes the walk composable with
// ordinary rewrite rules (and what lets one rule walk several lists, e.g.
// a go method receiver plus its parameter list).

const CH_PAREN_OPEN = 0x28;
const CH_PAREN_CLOSE = 0x29;
const CH_BRACKET_OPEN = 0x5b;
const CH_BRACKET_CLOSE = 0x5d;
const CH_BRACE_OPEN = 0x7b;
const CH_BRACE_CLOSE = 0x7d;
const CH_COLON = 0x3a;
const CH_COMMA = 0x2c;
const CH_SEMI = 0x3b;
const CH_DOT = 0x2e;
const CH_LT = 0x3c;
const CH_GT = 0x3e;
const CH_EQ = 0x3d;

// open-paren location result scratch (token index + char offset within the
// token). module scope, valid until the next find call -- same reuse
// discipline as the capture state above.
let params_open_idx = 0;
let params_open_off = 0;
let params_close_idx = 0;
let params_close_off = 0;

function params_next_non_trivia(
  tokens: Uint32Array,
  from: number,
  count: number,
  trivia: Uint8Array,
): number {
  for (let i = from; i < count; i++) {
    if (!trivia[tokens[i * 3]]) return i;
  }
  return -1;
}

function params_prev_non_trivia(tokens: Uint32Array, from: number, trivia: Uint8Array): number {
  for (let i = from; i >= 0; i--) {
    if (!trivia[tokens[i * 3]]) return i;
  }
  return -1;
}

// "starts_with": the next non-trivia token must be punctuation whose text
// begins with the open paren.
function params_find_starts_with(
  spec: CompiledParamsSpec,
  tokens: Uint32Array,
  idx: number,
  count: number,
  input: string,
  trivia: Uint8Array,
): boolean {
  while (idx < count && trivia[tokens[idx * 3]]) idx++;
  if (idx >= count) return false;
  const base = idx * 3;
  if (tokens[base] !== spec.punct_id) return false;
  if (input.charCodeAt(tokens[base + 1]) !== CH_PAREN_OPEN) return false;
  params_open_idx = idx;
  params_open_off = 0;
  return true;
}

// "scan": ride over bracket/brace groups (go's `[T any]` generics) to the
// first "(" at top depth. the first non-trivia token must be punctuation;
// an unbalanced close or the scan bound means we left the construct.
function params_find_scan(
  spec: CompiledParamsSpec,
  tokens: Uint32Array,
  idx: number,
  count: number,
  input: string,
  trivia: Uint8Array,
): boolean {
  while (idx < count && trivia[tokens[idx * 3]]) idx++;
  if (idx >= count || tokens[idx * 3] !== spec.punct_id) return false;
  let bracket = 0;
  let brace = 0;
  const limit = Math.min(count, idx + spec.scan_max_tokens);
  for (let k = idx; k < limit; k++) {
    const base = k * 3;
    if (trivia[tokens[base]] || tokens[base] !== spec.punct_id) continue;
    const s = tokens[base + 1];
    const e = tokens[base + 2];
    for (let p = s; p < e; p++) {
      const c = input.charCodeAt(p);
      if (c === CH_BRACKET_OPEN) bracket++;
      else if (c === CH_BRACKET_CLOSE) {
        if (bracket === 0) return false;
        bracket--;
      } else if (c === CH_BRACE_OPEN) brace++;
      else if (c === CH_BRACE_CLOSE) {
        if (brace === 0) return false;
        brace--;
      } else if (c === CH_PAREN_OPEN) {
        if (bracket === 0 && brace === 0) {
          params_open_idx = k;
          params_open_off = p - s;
          return true;
        }
      } else if (c === CH_PAREN_CLOSE) {
        if (bracket === 0 && brace === 0) return false;
      }
    }
  }
  return false;
}

// matching close for the paren at (open_idx, open_off). all bracket types
// count toward depth, mirroring the imperative arrow detector. result in
// params_close_idx / params_close_off.
function params_find_matching_close(
  spec: CompiledParamsSpec,
  tokens: Uint32Array,
  open_idx: number,
  open_off: number,
  count: number,
  input: string,
): boolean {
  let depth = 1;
  const open_s = tokens[open_idx * 3 + 1];
  const open_e = tokens[open_idx * 3 + 2];
  for (let p = open_s + open_off + 1; p < open_e; p++) {
    const ch = input.charCodeAt(p);
    if (ch === CH_PAREN_OPEN || ch === CH_BRACKET_OPEN || ch === CH_BRACE_OPEN) depth++;
    else if (ch === CH_PAREN_CLOSE || ch === CH_BRACKET_CLOSE || ch === CH_BRACE_CLOSE) {
      depth--;
      if (depth === 0) {
        params_close_idx = open_idx;
        params_close_off = p - open_s;
        return true;
      }
    }
  }
  for (let k = open_idx + 1; k < count; k++) {
    const base = k * 3;
    if (tokens[base] !== spec.punct_id) continue;
    const s = tokens[base + 1];
    const e = tokens[base + 2];
    for (let p = s; p < e; p++) {
      const ch = input.charCodeAt(p);
      if (ch === CH_PAREN_OPEN || ch === CH_BRACKET_OPEN || ch === CH_BRACE_OPEN) depth++;
      else if (ch === CH_PAREN_CLOSE || ch === CH_BRACKET_CLOSE || ch === CH_BRACE_CLOSE) {
        depth--;
        if (depth === 0) {
          params_close_idx = k;
          params_close_off = p - s;
          return true;
        }
      }
    }
  }
  return false;
}

// arrow validation for the paren at (open_idx, open_off): the matching
// close must end its token and be followed by "=>", optionally through a
// `: ReturnType` annotation when skip_ts_return_type is set.
function params_detect_arrow(
  spec: CompiledParamsSpec,
  tokens: Uint32Array,
  open_idx: number,
  open_off: number,
  count: number,
  input: string,
  trivia: Uint8Array,
): boolean {
  if (!params_find_matching_close(spec, tokens, open_idx, open_off, count, input)) return false;
  const close_idx = params_close_idx;
  const cs = tokens[close_idx * 3 + 1];
  const ce = tokens[close_idx * 3 + 2];
  if (params_close_off + 1 < ce - cs) return false;
  const j = params_next_non_trivia(tokens, close_idx + 1, count, trivia);
  if (j < 0) return false;
  const jb = j * 3;
  if (spec.skip_ts_return_type && tokens[jb] === spec.punct_id) {
    const js = tokens[jb + 1];
    const je = tokens[jb + 2];
    if (je - js === 1 && input.charCodeAt(js) === CH_COLON) {
      // scan the annotation to "=>" at depth 0; any top-level close or
      // statement separator means this paren was not an arrow head.
      let td = 0;
      let m = j + 1;
      while (m < count) {
        const mb = m * 3;
        const mt = tokens[mb];
        if (trivia[mt]) {
          m++;
          continue;
        }
        if (mt === spec.punct_id) {
          const s = tokens[mb + 1];
          const e = tokens[mb + 2];
          for (let p = s; p < e; p++) {
            const ch = input.charCodeAt(p);
            if (ch === CH_PAREN_OPEN || ch === CH_BRACKET_OPEN || ch === CH_BRACE_OPEN) td++;
            else if (ch === CH_PAREN_CLOSE || ch === CH_BRACKET_CLOSE || ch === CH_BRACE_CLOSE) {
              if (td === 0) return false;
              td--;
            } else if ((ch === CH_COMMA || ch === CH_SEMI) && td === 0) return false;
          }
        } else if (mt === spec.operator_id && td === 0) {
          const s = tokens[mb + 1];
          if (
            tokens[mb + 2] - s === 2 &&
            input.charCodeAt(s) === CH_EQ &&
            input.charCodeAt(s + 1) === CH_GT
          ) {
            return true;
          }
        }
        m++;
      }
      return false;
    }
  }
  if (tokens[jb] !== spec.operator_id) return false;
  const js = tokens[jb + 1];
  return (
    tokens[jb + 2] - js === 2 &&
    input.charCodeAt(js) === CH_EQ &&
    input.charCodeAt(js + 1) === CH_GT
  );
}

// is the token directly before `idx` a bare "?" operator? catches an
// optional method's `?():`, whose parens hide the qmark from the frame
// tracker (`c ? (a): b` has the same shape there).
function params_qmark_before(
  spec: CompiledParamsSpec,
  tokens: Uint32Array,
  idx: number,
  input: string,
  trivia: Uint8Array,
): boolean {
  if (spec.operator_id < 0) return false;
  const before = params_prev_non_trivia(tokens, idx - 1, trivia);
  if (before < 0) return false;
  const b = before * 3;
  if (tokens[b] !== spec.operator_id) return false;
  const bs = tokens[b + 1];
  return tokens[b + 2] - bs === 1 && input.charCodeAt(bs) === CH_QMARK;
}

// "arrow": the anchor token (one to the left of the pattern cursor)
// carries the "(". try each offset, cheapest checks first.
function params_find_arrow(
  spec: CompiledParamsSpec,
  tokens: Uint32Array,
  anchor_idx: number,
  count: number,
  input: string,
  trivia: Uint8Array,
  frames: FrameTable | undefined,
): boolean {
  if (anchor_idx < 0) return false;
  const base = anchor_idx * 3;
  if (tokens[base] !== spec.punct_id) return false;
  const s = tokens[base + 1];
  const e = tokens[base + 2];
  let object_kind = -2;
  for (let off = 0; off < e - s; off++) {
    if (input.charCodeAt(s + off) !== CH_PAREN_OPEN) continue;
    if (spec.skip_in_type_position && off === 0 && frames !== undefined) {
      // `: (x: T) => Y` is a function TYPE, so the names in it are not
      // parameters. two shapes put a value after that colon instead:
      // an object-literal member (`key: (x) => x`), and a ternary
      // alternative (`c ? (x) => a : (x) => b`). the enclosing frame is
      // read after the previous token -- this token's own "(" has not
      // pushed yet.
      //
      // the ternary test needs the upstream tracker to count qmarks; it
      // fails closed against the empty signals array when it doesn't,
      // leaving the enclosing-frame test on its own as before.
      const prev = params_prev_non_trivia(tokens, anchor_idx - 1, trivia);
      if (prev >= 0 && tokens[prev * 3] === spec.punct_id) {
        const ps = tokens[prev * 3 + 1];
        const pe = tokens[prev * 3 + 2];
        if (pe > ps && input.charCodeAt(pe - 1) === CH_COLON) {
          if (object_kind === -2) object_kind = frames.kind_names.indexOf("object");
          const enclosing = frames.frames[anchor_idx > 0 ? frames.active_frame[anchor_idx - 1] : 0];
          const in_object =
            enclosing.bracket === FRAME_BRACKET_BRACE && enclosing.kind === object_kind;
          // the length test keeps the read in bounds: `signals` is a
          // shared zero-length singleton when the tracker does not count
          // ternaries, and an out-of-bounds typed-array load returns
          // undefined, which poisons this site for every pipeline in the
          // process -- not just the ones without signals.
          let ternary_colon =
            prev < frames.signals.length && (frames.signals[prev] & SIGNAL_TERNARY_COLON) !== 0;
          if (ternary_colon && params_qmark_before(spec, tokens, prev, input, trivia)) {
            // `onHover?(): (i) => void`: the colon consumed the optional
            // method's `?` as a ternary's, but a return type follows.
            ternary_colon = false;
          }
          if (!in_object && !ternary_colon) continue;
        }
      }
    }
    if (params_detect_arrow(spec, tokens, anchor_idx, off, count, input, trivia)) {
      params_open_idx = anchor_idx;
      params_open_off = off;
      return true;
    }
  }
  return false;
}

// leading generics skip before locating the paren: token-text angle
// counting over operator tokens ("<" ">" ">>" ">>>"), mirroring the
// imperative after_keyword detector. returns the index after the group,
// or the input index when no "<" leads.
function params_skip_generics(
  spec: CompiledParamsSpec,
  tokens: Uint32Array,
  idx: number,
  count: number,
  input: string,
  trivia: Uint8Array,
): number {
  while (idx < count && trivia[tokens[idx * 3]]) idx++;
  if (idx >= count) return idx;
  const base = idx * 3;
  if (tokens[base] !== spec.operator_id) return idx;
  const s = tokens[base + 1];
  if (tokens[base + 2] - s !== 1 || input.charCodeAt(s) !== CH_LT) return idx;
  let d = 1;
  let m = idx + 1;
  while (m < count && d > 0) {
    const mb = m * 3;
    if (trivia[tokens[mb]]) {
      m++;
      continue;
    }
    if (tokens[mb] === spec.operator_id) {
      const ms = tokens[mb + 1];
      const len = tokens[mb + 2] - ms;
      if (len === 1 && input.charCodeAt(ms) === CH_LT) d++;
      else if (len >= 1 && len <= 3 && input.charCodeAt(ms) === CH_GT) {
        let pops = 1;
        if (len >= 2 && input.charCodeAt(ms + 1) === CH_GT) pops = 2;
        if (len === 3 && input.charCodeAt(ms + 2) === CH_GT) pops = 3;
        if (pops === len) d = Math.max(0, d - pops);
      }
    }
    m++;
  }
  return m;
}

// first_ident chunk walk (the js-family shape): tag the first identifier
// at depth 1 of each separator chunk; the default introducer suspends
// tagging until the next chunk; transparent texts pass through.
// returns the token index after the close-carrying token (count when the
// list is unterminated -- the names reached are still recorded).
function params_walk_first_ident(
  spec: CompiledParamsSpec,
  slot: number,
  tokens: Uint32Array,
  open_idx: number,
  open_off: number,
  count: number,
  input: string,
  trivia: Uint8Array,
): number {
  let depth = 1;
  let expect_param = true;
  let saw_default = false;
  const sep = spec.separator_code;

  const open_s = tokens[open_idx * 3 + 1];
  const open_e = tokens[open_idx * 3 + 2];
  for (let p = open_s + open_off + 1; p < open_e; p++) {
    const ch = input.charCodeAt(p);
    if (ch === CH_PAREN_OPEN || ch === CH_BRACKET_OPEN || ch === CH_BRACE_OPEN) depth++;
    else if (ch === CH_PAREN_CLOSE || ch === CH_BRACKET_CLOSE || ch === CH_BRACE_CLOSE) {
      depth--;
      if (depth === 0) return open_idx + 1;
    } else if (ch === sep && depth === 1) {
      expect_param = true;
      saw_default = false;
    }
  }

  let k = open_idx + 1;
  while (k < count && depth > 0) {
    const base = k * 3;
    const kt = tokens[base];
    if (trivia[kt]) {
      k++;
      continue;
    }
    if (kt === spec.punct_id) {
      const s = tokens[base + 1];
      const e = tokens[base + 2];
      for (let p = s; p < e; p++) {
        const ch = input.charCodeAt(p);
        if (ch === CH_PAREN_OPEN || ch === CH_BRACKET_OPEN || ch === CH_BRACE_OPEN) depth++;
        else if (ch === CH_PAREN_CLOSE || ch === CH_BRACKET_CLOSE || ch === CH_BRACE_CLOSE) {
          depth--;
          if (depth === 0) break;
        } else if (ch === sep && depth === 1) {
          expect_param = true;
          saw_default = false;
        }
      }
      k++;
      continue;
    }
    if (depth === 1 && expect_param && !saw_default) {
      if (kt === spec.ident_id) {
        push_cap_log(slot, k, k + 1);
        expect_param = false;
        k++;
        continue;
      }
      const transparent = params_transparent_texts(spec, kt);
      const check_default = kt === spec.operator_id && spec.default_introducer !== null;
      if (transparent !== null || check_default) {
        const text = input.slice(tokens[base + 1], tokens[base + 2]);
        if (check_default && text === spec.default_introducer) {
          expect_param = false;
          saw_default = true;
          k++;
          continue;
        }
        if (
          transparent !== null &&
          transparent.indexOf(text) >= 0 &&
          params_name_follows(spec, tokens, k + 1, count, input, trivia)
        ) {
          k++;
          continue;
        }
      }
      expect_param = false;
    }
    k++;
  }
  return k;
}

// type-after-first heuristic for carry_pending chunks: a "."-led second
// token is a receiver chain (no type); a "["-led one is a type only when
// content follows the matching "]".
function params_chunk_has_type(
  spec: CompiledParamsSpec,
  tokens: Uint32Array,
  chunk: number[],
  input: string,
): boolean {
  if (chunk.length < 2) return false;
  const second = chunk[1];
  if (tokens[second * 3] === spec.punct_id) {
    const first_ch = input.charCodeAt(tokens[second * 3 + 1]);
    if (first_ch === CH_DOT) return false;
    if (first_ch === CH_BRACKET_OPEN) {
      return params_square_has_trailing_type(spec, tokens, chunk, 1, input);
    }
  }
  return true;
}

function params_square_has_trailing_type(
  spec: CompiledParamsSpec,
  tokens: Uint32Array,
  chunk: number[],
  start_pos: number,
  input: string,
): boolean {
  let depth = 0;
  let seen_open = false;
  for (let pos = start_pos; pos < chunk.length; pos++) {
    const idx = chunk[pos];
    if (tokens[idx * 3] !== spec.punct_id) continue;
    const text = input.slice(tokens[idx * 3 + 1], tokens[idx * 3 + 2]);
    for (let offset = 0; offset < text.length; offset++) {
      const ch = text[offset];
      if (ch === "[") {
        depth++;
        seen_open = true;
      } else if (ch === "]" && depth > 0) {
        depth--;
        if (seen_open && depth === 0) {
          for (let rest = offset + 1; rest < text.length; rest++) {
            const trailing = text[rest];
            if (trailing !== ")" && trailing !== ",") return true;
          }
          return pos < chunk.length - 1;
        }
      }
    }
  }
  return true;
}

// carry_pending chunk walk (the go shape): split the body into chunks at
// top-depth separators; a chunk with a type after its first name promotes
// that name and any pending bare names from earlier single-name chunks.
// returns the token index after the close-carrying token.
function params_walk_carry_pending(
  spec: CompiledParamsSpec,
  slot: number,
  tokens: Uint32Array,
  open_idx: number,
  open_off: number,
  count: number,
  input: string,
  trivia: Uint8Array,
): number {
  let paren_depth = 1;
  let bracket_depth = 0;
  let brace_depth = 0;
  const chunks: number[][] = [];
  let current: number[] = [];
  let k = open_idx;
  let offset = open_off + 1;
  const sep = spec.separator_code;

  while (k < count && paren_depth > 0) {
    const base = k * 3;
    if (trivia[tokens[base]]) {
      k++;
      offset = 0;
      continue;
    }
    if (tokens[base] !== spec.punct_id) {
      current.push(k);
      k++;
      offset = 0;
      continue;
    }
    const s = tokens[base + 1];
    const e = tokens[base + 2];
    let include = false;
    for (let p = s + offset; p < e; p++) {
      const code = input.charCodeAt(p);
      if (code === sep && paren_depth === 1 && bracket_depth === 0 && brace_depth === 0) {
        if (include) current.push(k);
        chunks.push(current);
        current = [];
        include = false;
        continue;
      }
      if (code === CH_PAREN_OPEN) {
        paren_depth++;
        include = true;
      } else if (code === CH_PAREN_CLOSE) {
        paren_depth--;
        if (paren_depth === 0) break;
        include = true;
      } else if (code === CH_BRACKET_OPEN) {
        bracket_depth++;
        include = true;
      } else if (code === CH_BRACKET_CLOSE) {
        bracket_depth = Math.max(0, bracket_depth - 1);
        include = true;
      } else if (code === CH_BRACE_OPEN) {
        brace_depth++;
        include = true;
      } else if (code === CH_BRACE_CLOSE) {
        brace_depth = Math.max(0, brace_depth - 1);
        include = true;
      } else {
        include = true;
      }
    }
    if (include) current.push(k);
    k++;
    offset = 0;
  }
  if (current.length > 0) chunks.push(current);

  let pending: number[] = [];
  for (const chunk of chunks) {
    if (chunk.length === 0) continue;
    const first = chunk[0];
    const ft = tokens[first * 3];
    if (ft !== spec.ident_id && !(spec.function_id >= 0 && ft === spec.function_id)) {
      pending = [];
      continue;
    }
    if (params_chunk_has_type(spec, tokens, chunk, input)) {
      for (const idx of pending) push_cap_log(slot, idx, idx + 1);
      push_cap_log(slot, first, first + 1);
      pending = [];
      continue;
    }
    if (chunk.length === 1) {
      pending.push(first);
    } else {
      pending = [];
    }
  }
  return k;
}

// ---------------------------------------------------------------------------
// type_span construct runtime (OP_TYPE_SPAN)
// ---------------------------------------------------------------------------
//
// type-mode walker. consumes tokens from the match position until a
// terminator (see TypeSpanPatternSpec for the exit rules), recording each
// type-position identifier as a single-token capture span via
// push_cap_log. depths are tracked RELATIVE to entry: the span doesn't
// know or care how deeply the anchor itself was nested -- a close that
// drops below zero belongs to an enclosing scope and ends the span.

const CH_QMARK = 0x3f;
const CH_PIPE = 0x7c;
const CH_AMP = 0x26;
const CH_BANG = 0x21;

// slice-free exact text compare for the small fixed keywords the verify
// scan needs.
function span_text_is(input: string, s: number, e: number, text: string): boolean {
  if (e - s !== text.length) return false;
  for (let i = 0; i < text.length; i++) {
    if (input.charCodeAt(s + i) !== text.charCodeAt(i)) return false;
  }
  return true;
}

// does the angle group starting at `idx` (the token after the opening
// `<`) look like generic type arguments rather than a comparison? a
// balanced single-char `>` close must exist -- `{...}` object literals in
// constraints ride along; a `;` outside braces or a stray `}` means we
// left the construct -- and the token after the close must be consistent
// with type arguments finishing. mirrors the imperative looks_like
// detector, including its ts-shaped follower lists (the same shape
// params() encodes for skip_ts_return_type).
// how many angle groups a `>` token closes. the tokenizer coalesces a run
// of `>` into one right-shift operator, so `Map<K, Set<V>>` ends both
// groups on a single token; anything else beginning with `>` (`>=`,
// `>>=`) closes none.
function angle_pops(input: string, s: number, e: number): number {
  const len = e - s;
  if (len < 1 || len > 3) return 0;
  for (let p = s; p < e; p++) {
    if (input.charCodeAt(p) !== CH_GT) return 0;
  }
  return len;
}

// does the angle group opening at `idx` close and hand straight over to a
// parameter list? that is a method signature's type parameters --
// `{ make<T>(base: T): T }` -- and the name before it is not a type.
function type_span_generic_call(
  spec: CompiledTypeSpanSpec,
  tokens: Uint32Array,
  idx: number,
  count: number,
  input: string,
  trivia: Uint8Array,
): boolean {
  if (spec.operator_id < 0) return false;
  let depth = 1;
  let j = idx + 1;
  while (j < count) {
    const base = j * 3;
    const t = tokens[base];
    if (trivia[t]) {
      j++;
      continue;
    }
    const s = tokens[base + 1];
    const e = tokens[base + 2];
    if (t === spec.operator_id) {
      if (e - s === 1 && input.charCodeAt(s) === CH_LT) {
        depth++;
      } else {
        const pops = angle_pops(input, s, e);
        if (pops > 0) {
          depth -= pops;
          if (depth <= 0) {
            const after = params_next_non_trivia(tokens, j + 1, count, trivia);
            return (
              after >= 0 &&
              tokens[after * 3] === spec.punct_id &&
              input.charCodeAt(tokens[after * 3 + 1]) === CH_PAREN_OPEN
            );
          }
        }
      }
    } else if (t === spec.punct_id) {
      // a type-argument list never crosses a member or statement end.
      for (let p = s; p < e; p++) {
        const c = input.charCodeAt(p);
        if (c === CH_SEMI || c === CH_BRACE_CLOSE) return false;
      }
    }
    j++;
  }
  return false;
}

function type_span_verify_angle(
  spec: CompiledTypeSpanSpec,
  tokens: Uint32Array,
  idx: number,
  count: number,
  input: string,
  trivia: Uint8Array,
): boolean {
  let depth = 1;
  let brace_depth = 0;
  let j = idx;
  let matched_close = -1;
  while (j < count) {
    const base = j * 3;
    const t = tokens[base];
    if (trivia[t]) {
      j++;
      continue;
    }
    const s = tokens[base + 1];
    const e = tokens[base + 2];
    if (spec.operator_id >= 0 && t === spec.operator_id) {
      if (e - s === 1 && input.charCodeAt(s) === CH_LT) {
        depth++;
      } else if (brace_depth === 0) {
        const pops = angle_pops(input, s, e);
        if (pops > 0) {
          depth -= pops;
          if (depth <= 0) {
            matched_close = j;
            break;
          }
        }
      }
    } else if (t === spec.punct_id) {
      for (let p = s; p < e; p++) {
        const c = input.charCodeAt(p);
        if (c === CH_BRACE_OPEN) brace_depth++;
        else if (c === CH_BRACE_CLOSE) {
          if (brace_depth === 0) return false;
          brace_depth--;
        } else if (c === CH_SEMI && brace_depth === 0) {
          return false;
        }
      }
    }
    j++;
  }
  if (matched_close < 0) return false;
  const after = params_next_non_trivia(tokens, matched_close + 1, count, trivia);
  if (after < 0) return true;
  const ab = after * 3;
  const at = tokens[ab];
  const as = tokens[ab + 1];
  const ae = tokens[ab + 2];
  if (at === spec.punct_id) {
    // punctuation coalesces same-type adjacent chars, so the FIRST char
    // tells us what comes next.
    const c = input.charCodeAt(as);
    return (
      c === CH_PAREN_OPEN ||
      c === CH_PAREN_CLOSE ||
      c === CH_BRACE_OPEN ||
      c === CH_BRACE_CLOSE ||
      c === CH_BRACKET_OPEN ||
      c === CH_BRACKET_CLOSE ||
      c === CH_COMMA ||
      c === CH_SEMI ||
      c === CH_DOT ||
      c === CH_COLON
    );
  }
  if (spec.operator_id >= 0 && at === spec.operator_id) {
    const len = ae - as;
    const c0 = input.charCodeAt(as);
    if (len === 1) {
      return (
        c0 === CH_EQ ||
        c0 === CH_PIPE ||
        c0 === CH_AMP ||
        c0 === CH_GT ||
        c0 === CH_QMARK ||
        c0 === CH_BANG
      );
    }
    if (len === 2) {
      const c1 = input.charCodeAt(as + 1);
      return (c0 === CH_EQ && c1 === CH_GT) || (c0 === CH_QMARK && c1 === CH_COLON);
    }
    return false;
  }
  if (spec.keyword_id >= 0 && at === spec.keyword_id) {
    return span_text_is(input, as, ae, "extends") || span_text_is(input, as, ae, "implements");
  }
  return false;
}

// does the token before `idx` read as the END of a type expression?
// used by the brace-exit check so `(): T {`, `(): T | undefined {` and
// `extends Foo<T> {` terminate at the body brace. mirrors the imperative
// promoter: a punctuation token ending in `]` / `)`, an identifier (or
// already-promoted type), a lone `>`, or a terminal keyword (`this`,
// `void`, ...).
function type_span_prev_is_closer(
  spec: CompiledTypeSpanSpec,
  tokens: Uint32Array,
  idx: number,
  input: string,
  trivia: Uint8Array,
  value_pool: Uint16Array,
  value_offsets: Int32Array,
): boolean {
  const prev = params_prev_non_trivia(tokens, idx - 1, trivia);
  if (prev < 0) return false;
  const base = prev * 3;
  const pt = tokens[base];
  const ps = tokens[base + 1];
  const pe = tokens[base + 2];
  if (pt === spec.punct_id) {
    const last = input.charCodeAt(pe - 1);
    return last === CH_BRACKET_CLOSE || last === CH_PAREN_CLOSE;
  }
  if (pt === spec.ident_id || (spec.type_id >= 0 && pt === spec.type_id)) return true;
  if (pt === spec.operator_id && pe - ps === 1 && input.charCodeAt(ps) === CH_GT) return true;
  if (pt === spec.keyword_id && spec.terminal_keywords_id >= 0) {
    return value_set_matches(value_pool, value_offsets, spec.terminal_keywords_id, input, ps, pe);
  }
  return false;
}

// OP_TYPE_SPAN entry: walk from `idx` until a terminator. returns the
// index of the FIRST unconsumed token (the terminator's token, or count
// for an unterminated span). identifiers in key position -- nested depth,
// directly followed by `:` or `?:` -- are parameter names / property keys
// and are not recorded. NO_MATCH only when verify_generic_args rejects
// the angle group; a verified (or unverified) span always matches.
function run_type_span(
  spec: CompiledTypeSpanSpec,
  slot: number,
  tokens: Uint32Array,
  idx: number,
  count: number,
  input: string,
  trivia: Uint8Array,
  value_pool: Uint16Array,
  value_offsets: Int32Array,
): number {
  if (spec.verify_generic_args) {
    if (!type_span_verify_angle(spec, tokens, idx, count, input, trivia)) return NO_MATCH;
  }
  let paren_rel = 0;
  let brace_rel = 0;
  let bracket_rel = 0;
  let angle_rel = 0;
  let i = idx;

  while (i < count) {
    const base = i * 3;
    const t = tokens[base];
    if (trivia[t]) {
      i++;
      continue;
    }
    const s = tokens[base + 1];
    const e = tokens[base + 2];

    if (t === spec.punct_id) {
      for (let p = s; p < e; p++) {
        const c = input.charCodeAt(p);
        if (c === CH_PAREN_OPEN) paren_rel++;
        else if (c === CH_PAREN_CLOSE) {
          paren_rel--;
          if (paren_rel < 0) return i;
        } else if (c === CH_BRACE_OPEN) {
          if (
            spec.brace_exit_on_closer &&
            brace_rel === 0 &&
            paren_rel === 0 &&
            type_span_prev_is_closer(spec, tokens, i, input, trivia, value_pool, value_offsets)
          ) {
            return i;
          }
          brace_rel++;
        } else if (c === CH_BRACE_CLOSE) {
          brace_rel--;
          if (brace_rel < 0) return i;
        } else if (c === CH_BRACKET_OPEN) bracket_rel++;
        else if (c === CH_BRACKET_CLOSE) {
          bracket_rel--;
          if (bracket_rel < 0) return i;
        } else if (c === CH_SEMI) {
          if (paren_rel === 0 && brace_rel === 0 && bracket_rel === 0 && angle_rel === 0) {
            return i;
          }
        }
      }
      // comma exit at token granularity AFTER the chars, mirroring the
      // imperative walker: depth changes within the token apply first.
      if (
        spec.exit_on_comma &&
        paren_rel === 0 &&
        brace_rel === 0 &&
        bracket_rel === 0 &&
        angle_rel === 0
      ) {
        for (let p = s; p < e; p++) {
          if (input.charCodeAt(p) === CH_COMMA) return i;
        }
      }
      i++;
      continue;
    }

    if (spec.operator_id >= 0 && t === spec.operator_id) {
      const len = e - s;
      // angle tracking precedes termination. a `>` above relative zero
      // closes a nested group; AT relative zero it closes the span's own
      // group when enter_angle is set, and is otherwise left alone (a
      // stray `>` cannot appear in a valid type).
      if (len === 1 && input.charCodeAt(s) === CH_LT) {
        angle_rel++;
        i++;
        continue;
      }
      const pops = angle_pops(input, s, e);
      if (pops > 0) {
        if (angle_rel >= pops) {
          angle_rel -= pops;
          i++;
          continue;
        }
        // the run closes more groups than this span opened, so the
        // surplus closes the span's own group.
        angle_rel = 0;
        if (spec.enter_angle) return i;
      }
      if (paren_rel === 0 && brace_rel === 0 && bracket_rel === 0 && angle_rel === 0) {
        if (len === 1 && input.charCodeAt(s) === CH_EQ) {
          if (spec.exit_on_eq) return i;
          // generics: `=` introduces a default type, keep walking.
          i++;
          continue;
        }
        if (len === 2 && input.charCodeAt(s) === CH_EQ && input.charCodeAt(s + 1) === CH_GT) {
          // `=>` after `)` is a function type's result arrow; anything
          // else is an arrow-function body separator and ends the span.
          const prev = params_prev_non_trivia(tokens, i - 1, trivia);
          if (prev >= 0 && input.charCodeAt(tokens[prev * 3 + 2] - 1) === CH_PAREN_CLOSE) {
            i++;
            continue;
          }
          return i;
        }
        if (len === 1 && input.charCodeAt(s) === CH_QMARK) {
          if (spec.exit_on_qmark) return i;
          // type-level `?` (optional marker, conditional type).
          i++;
          continue;
        }
        if (
          spec.value_ops_id >= 0 &&
          value_set_matches(value_pool, value_offsets, spec.value_ops_id, input, s, e)
        ) {
          return i;
        }
      }
      i++;
      continue;
    }

    if (spec.keyword_id >= 0 && t === spec.keyword_id) {
      if (
        paren_rel === 0 &&
        brace_rel === 0 &&
        bracket_rel === 0 &&
        angle_rel === 0 &&
        spec.stmt_keywords_id >= 0 &&
        value_set_matches(value_pool, value_offsets, spec.stmt_keywords_id, input, s, e)
      ) {
        return i;
      }
      i++;
      continue;
    }

    if (t === spec.ident_id) {
      // member position: at nested depth, an identifier that NAMES a
      // member rather than referring to one is not a type -- `a: T`,
      // `a?: T`, `m(): T`, `m<T>(): T`. at the span root, `:` is the
      // conditional-type separator and the identifier before it IS a
      // type.
      let skip = false;
      if (paren_rel > 0 || brace_rel > 0) {
        const nxt = params_next_non_trivia(tokens, i + 1, count, trivia);
        if (nxt >= 0) {
          const nb = nxt * 3;
          const ns = tokens[nb + 1];
          const nlen = tokens[nb + 2] - ns;
          const nt = tokens[nb];
          if (nt === spec.punct_id) {
            const c = input.charCodeAt(ns);
            // punctuation coalesces, so a `:` run still leads with it.
            if ((nlen === 1 && c === CH_COLON) || c === CH_PAREN_OPEN) skip = true;
          } else if (spec.operator_id >= 0 && nt === spec.operator_id) {
            const c = input.charCodeAt(ns);
            if (nlen === 2 && c === CH_QMARK && input.charCodeAt(ns + 1) === CH_COLON) {
              skip = true;
            } else if (nlen === 1 && c === CH_QMARK) {
              // `a?:` split in two, which is what the JS family emits.
              const after = params_next_non_trivia(tokens, nxt + 1, count, trivia);
              if (
                after >= 0 &&
                tokens[after * 3] === spec.punct_id &&
                input.charCodeAt(tokens[after * 3 + 1]) === CH_COLON
              ) {
                skip = true;
              }
            } else if (nlen === 1 && c === CH_LT) {
              // a plain reference (`a: Foo<T>`) must still be recorded,
              // so the group has to close straight onto a paren list.
              skip = type_span_generic_call(spec, tokens, nxt, count, input, trivia);
            }
          }
        }
      }
      if (!skip) push_cap_log(slot, i, i + 1);
      i++;
      continue;
    }

    // numbers, strings, template chunks, already-typed tokens: pass
    // through, the span continues over them (literal types, etc.).
    i++;
  }
  return count;
}

// OP_PARAMS entry: locate the open paren per the spec's mode, then run
// the chunk walk. NO_MATCH only when the paren cannot be located (or a
// frame-dependent mode runs without frames) -- a located list always
// matches, however short.
function run_params(
  spec: CompiledParamsSpec,
  slot: number,
  tokens: Uint32Array,
  idx: number,
  count: number,
  input: string,
  trivia: Uint8Array,
  frames: FrameTable | undefined,
): number {
  let found: boolean;
  if (spec.find_open === PARAMS_FIND_ARROW) {
    if (spec.skip_in_type_position && frames === undefined) {
      warn_once(
        "rewrite_types",
        "params-frames-missing",
        "params() with skip_in_type_position ran without a frame_track stage upstream; the branch is disabled",
      );
      return NO_MATCH;
    }
    found = params_find_arrow(spec, tokens, idx - 1, count, input, trivia, frames);
  } else {
    if (spec.skip_generics) {
      idx = params_skip_generics(spec, tokens, idx, count, input, trivia);
    }
    found =
      spec.find_open === PARAMS_FIND_SCAN
        ? params_find_scan(spec, tokens, idx, count, input, trivia)
        : params_find_starts_with(spec, tokens, idx, count, input, trivia);
  }
  if (!found) return NO_MATCH;
  return spec.strategy === PARAMS_STRATEGY_CARRY_PENDING
    ? params_walk_carry_pending(
        spec,
        slot,
        tokens,
        params_open_idx,
        params_open_off,
        count,
        input,
        trivia,
      )
    : params_walk_first_ident(
        spec,
        slot,
        tokens,
        params_open_idx,
        params_open_off,
        count,
        input,
        trivia,
      );
}

// iterative bytecode VM for the forward matcher. returns the token idx
// after the last matched token on success, or NO_MATCH on full failure.
// resets the capture log at entry; on return the log holds the successful
// path's captures as (slot, start, end) triplets in completion order.
//
// trivia skipping is done inside OP_TYPE, OP_BALANCED, and OP_CAP_BEGIN —
// matching the semantics of the tree matcher where `skip_trivia` was
// called at the top of each match_pattern invocation but not for
// non-advancing constructs (ALT/COMMIT/JUMP/CAP_END).
//
// backtrack semantics: a failed branch truncates the capture log to its
// frame's watermark, so captures recorded inside abandoned branches never
// leak into the result. OP_LOOP pops its frame WITHOUT truncating —
// completed repeat iterations keep their captures (possessive).
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
  params_specs: CompiledParamsSpec[],
  span_specs: CompiledTypeSpanSpec[],
  frames: FrameTable | undefined,
): number {
  if (max_capture_slots > 0) ensure_cap_capacity(max_capture_slots);
  cap_log_len = 0;

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
        const pred_id = program[pc + 3];
        if (pred_id >= 0) {
          if (!text_pred_matches(pred_id, input, tokens[base + 1], tokens[base + 2])) {
            failed = true;
            break;
          }
        }
        idx++;
        pc += 4;
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
        bt[bt_sp++] = cap_log_len;
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
        push_cap_log(slot, cap_starts[slot], idx);
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
      case OP_LOOP: {
        // pop the iteration's ALT frame: (end_pc, entry_idx, watermark).
        // progress since the ALT -> loop back for another iteration; an
        // empty iteration falls through to the ALT's target instead.
        // popping the frame makes the repeat possessive -- completed
        // iterations are never backtracked into, and their watermark is
        // deliberately not restored so their captures stay in the log.
        bt_sp -= BT_STRIDE;
        if (idx === bt[bt_sp + 1]) {
          pc = bt[bt_sp];
        } else {
          pc = program[pc + 1];
        }
        break;
      }
      case OP_NOT_TYPE: {
        while (idx < count && trivia[tokens[idx * 3]]) idx++;
        if (idx >= count) {
          // nothing follows: the negation holds. zero width, no consume.
          pc += 4;
          break;
        }
        const type_id = program[pc + 1];
        const base = idx * 3;
        let hit = tokens[base] === type_id;
        if (hit) {
          const values_id = program[pc + 2];
          if (values_id >= 0) {
            hit = value_set_matches(
              value_pool,
              value_offsets,
              values_id,
              input,
              tokens[base + 1],
              tokens[base + 2],
            );
          }
        }
        if (hit) {
          const pred_id = program[pc + 3];
          if (pred_id >= 0) {
            hit = text_pred_matches(pred_id, input, tokens[base + 1], tokens[base + 2]);
          }
        }
        if (hit) {
          failed = true;
          break;
        }
        pc += 4;
        break;
      }
      case OP_PARAMS: {
        const new_idx = run_params(
          params_specs[program[pc + 1]],
          program[pc + 2],
          tokens,
          idx,
          count,
          input,
          trivia,
          frames,
        );
        if (new_idx === NO_MATCH) {
          failed = true;
          break;
        }
        idx = new_idx;
        pc += 3;
        break;
      }
      case OP_TYPE_SPAN: {
        // the walk itself never fails -- an immediately-terminated span
        // matches empty and records nothing -- but verify_generic_args
        // can reject the whole branch before the walk starts.
        const new_idx = run_type_span(
          span_specs[program[pc + 1]],
          program[pc + 2],
          tokens,
          idx,
          count,
          input,
          trivia,
          value_pool,
          value_offsets,
        );
        if (new_idx === NO_MATCH) {
          failed = true;
          break;
        }
        idx = new_idx;
        pc += 3;
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
      cap_log_len = bt[bt_sp + 2];
      failed = false;
    }
  }
}

// reverse-direction VM used by `before` lookbehind clauses. shares the
// forward opcode set but walks LEFT (idx-- on each OP_TYPE), skips trivia
// backwards, and matches value sets with suffix semantics (so a coalesced
// punctuation token like `({` still satisfies a lookbehind asking for `{`).
//
// the caller passes the token index immediately to the left of the anchor
// as `idx`; success returns the new idx (further to the left); failure
// returns NO_MATCH. capture / balanced opcodes are not supported in this
// direction -- the reverse compiler emits NEVER_MATCHES for them.
//
// shares the bt_stack/cap_* module state with the forward VM but lookbehind
// rules in practice never emit captures, so the dirty-bit clear short-circuits.
function match_bytecode_reverse(
  program: Int32Array,
  start_pc: number,
  tokens: Uint32Array,
  idx: number,
  input: string,
  trivia: Uint8Array,
  value_pool: Uint16Array,
  value_offsets: Int32Array,
): number {
  let pc = start_pc;
  let bt_sp = 0;
  let bt = bt_stack;
  let failed = false;

  while (true) {
    const op = program[pc];
    switch (op) {
      case OP_TYPE: {
        while (idx >= 0 && trivia[tokens[idx * 3]]) idx--;
        if (idx < 0) {
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
            !value_set_ends_with(
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
        const pred_id = program[pc + 3];
        if (pred_id >= 0) {
          if (!text_pred_matches(pred_id, input, tokens[base + 1], tokens[base + 2])) {
            failed = true;
            break;
          }
        }
        idx--;
        pc += 4;
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
        // captures are unsupported in this direction; the watermark slot
        // is dead but keeps the frame layout shared with the forward vm.
        bt[bt_sp++] = 0;
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
      case OP_MATCH: {
        return idx;
      }
      default: {
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

/**
 * compile a rule set against a token vocabulary and return a readable
 * per-rule disassembly of the generated bytecode. authoring aid: shows
 * exactly what a `when` / `before` pattern compiled to, with type ids
 * resolved to names. rules whose anchor type is missing from the
 * vocabulary are compiled away entirely -- enable `set_debug_warnings`
 * to see why a rule is absent from the listing.
 */
export function disassemble_rules(
  rules: RewriteRule[],
  token_types: string[],
  options: RewriteOptions = {},
): string {
  const state = compile_rewrite(rules, options, token_types);
  // compile-time ids may reference names appended for rewrite targets;
  // rebuild the full compile-time vocabulary for display.
  const names = token_types.slice(0, state.compile_base_len).concat(state.appended_names);
  const target_name = (id: number): string => (id >= 0 && id < names.length ? names[id] : `${id}`);
  const lines: string[] = [];
  for (let i = 0; i < state.compiled.length; i++) {
    const r = state.compiled[i];
    const gates: string[] = [];
    if (r.anchor_at_start) gates.push("at_start");
    if (r.anchor_value_suffix_id >= 0) gates.push(`ends_with#${r.anchor_value_suffix_id}`);
    if (r.anchor_frame_kinds !== null) gates.push(`frame_kinds=${r.anchor_frame_kinds.join(",")}`);
    if (r.anchor_ternary_colon >= 0) gates.push(`ternary_colon=${r.anchor_ternary_colon === 1}`);
    if (r.anchor_flags_all !== null) gates.push(`stmt_flags_all=${r.anchor_flags_all.join(",")}`);
    if (r.anchor_flags_none !== null) {
      gates.push(`stmt_flags_none=${r.anchor_flags_none.join(",")}`);
    }
    const target =
      r.anchor_target_id >= 0
        ? target_name(r.anchor_target_id)
        : `captures{${(r.capture_targets ?? []).map((t) => target_name(t.target_id)).join(",")}}`;
    lines.push(
      `rule ${i}: anchor=${target_name(r.anchor_id)}${gates.length > 0 ? ` ${gates.join(" ")}` : ""} -> ${target}`,
    );
    lines.push("  when:");
    for (const line of disassemble_program(
      state.program,
      r.when_pc,
      state.program.length,
      names,
    ).split("\n")) {
      lines.push(`    ${line}`);
    }
    if (r.before_pc >= 0) {
      lines.push("  before (reverse):");
      for (const line of disassemble_program(
        state.program,
        r.before_pc,
        state.program.length,
        names,
      ).split("\n")) {
        lines.push(`    ${line}`);
      }
    }
  }
  return lines.join("\n");
}

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
// the table below is the DEFAULT band scheme for shared role names: "more
// specific role wins over less specific" — a class_name beats a type beats
// a function beats a property beats a bare identifier. types that never
// conflict in practice (keywords, literals, punctuation, operators) get
// stable but arbitrary positions. languages whose pipeline priorities
// deviate from these bands say so at the claim site: rewrite rules take a
// per-rule `precedence`, primitives take a config override, and custom
// ClaimFns pick their own values (go ranks structural position above the
// upper-snake constant convention this way). in-between values are
// legitimate — the bands are spaced to leave room.

// ordered from lowest to highest precedence. types absent from this map
// fall back to DEFAULT_PRECEDENCE, which sits above `identifier` but below
// the role bands — so unknown claims still beat a bare identifier but lose
// to an explicit role claim.
const PRECEDENCE_TABLE: Record<string, number> = {
  identifier: 0,
  punctuation: 5,
  operator: 5,
  variable: 10,
  // parameter sits below property and function: a token claimed as both a
  // parameter and a member key (TS method-shorthand params with
  // annotations) keeps the member classification, matching the old
  // sequential pipelines where param tagging ran last and gated on the
  // token still being a bare identifier.
  parameter: 15,
  property: 20,
  function: 30,
  builtin: 40,
  type: 45,
  class_name: 50,
  // casing-convention constants are an explicit author signal, so they
  // beat positional inferences (function-call shape, new/extends chains).
  // matches the old sequential pipelines where upper-snake promotion ran
  // first and later passes gated on bare identifiers.
  constant: 55,
  keyword: 70,
  boolean: 75,
  null: 75,
  number: 75,
  comment: 80,
  string: 80,
};
const DEFAULT_PRECEDENCE = 25;

// exported for claim-producing primitives and language ClaimFns that need
// table-consistent precedences for their emitted claims.
export function precedence_for(type_name: string): number {
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

// module-scope winner-table scratch reused across merges. claim batches
// flush once per pipeline run, and with most passes claim-producing the
// flush is on the hot path -- reallocating two token-count arrays per
// flush showed up as GC churn in the pipeline benches.
let winner_type = new Int32Array(1024);
let winner_prec = new Int32Array(1024);

// merge buffered claims into a dense per-token winner table and apply in
// one pass. higher precedence wins; on tie, the first-emitted claim wins
// (we use strict greater-than on later claims).
function merge_and_apply_buffer(tokens: Uint32Array, buf: ClaimBuffer): void {
  if (buf.count === 0) return;
  const token_count = tokens.length / 3;
  if (winner_type.length < token_count) {
    let next = winner_type.length * 2;
    while (next < token_count) next *= 2;
    winner_type = new Int32Array(next);
    winner_prec = new Int32Array(next);
  }
  // -1 sentinel marks "no winner yet" since valid type_ids are >= 0.
  winner_type.fill(-1, 0, token_count);
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
  // suffix form: the anchor's source text must END with a pool entry.
  // -1 when unset.
  anchor_value_suffix_id: number;
  // -1 means no text predicate; otherwise a CHAR_PRED_* id passed to
  // text_pred_matches() during dispatch. fast pre-filter on the anchor
  // token's source text -- replaces a whole class of hand-rolled
  // upper_snake_case / pascal_case promoters.
  anchor_text_pred_id: number;
  // anchor rewrite target (phase 1 form). -1 means no anchor rewrite.
  anchor_target_id: number;
  // capture rewrite targets (phase 3 form). null if no capture rewrites.
  // slot_id is the dense slot index assigned by the bytecode compiler.
  capture_targets: { slot_id: number; target_id: number }[] | null;
  // dense slot_id -> compile-time target id (-1 for untargeted slots),
  // sized max_capture_slots. the dispatch loop indexes this per capture
  // log entry after a successful match. null when capture_targets is
  // null or empty.
  capture_slot_targets: Int32Array | null;
  // bytecode-compiled reverse matcher entry pc, or -1 if the rule has no
  // `before` clause. emitted into the same shared program buffer as `when`
  // bytecode -- one VM, two directions.
  before_pc: number;
  // bytecode-compiled forward matcher: `when_pc` is the entry into the
  // shared program buffer; `max_capture_slots` is how many slots this
  // rule reserves so the interpreter clears only those dirty bits.
  when_pc: number;
  max_capture_slots: number;
  // frame gates from the anchor spec. kind names stay symbolic -- they
  // resolve against the frame table's kind_names per call, since the
  // table comes from whichever frame_track stage the pipeline runs.
  // frame_direct matches the token's innermost frame instead of walking
  // to the nearest enclosing brace.
  anchor_at_start: boolean;
  anchor_frame_kinds: string[] | null;
  anchor_frame_direct: boolean;
  // signal gates over the frame table's per-token signals array. ternary
  // is -1 unset / 0 require-clear / 1 require-set; flag names stay
  // symbolic and resolve to bit masks against flag_names per call.
  anchor_ternary_colon: number;
  anchor_flags_all: string[] | null;
  anchor_flags_none: string[] | null;
  // dispatch fast paths derived at compile time, all -1 when unused:
  // anchor_must_contain rejects anchors whose source text lacks this char
  // before any vm entry (arrow-mode params rules anchor every punctuation
  // token; roughly half carry no "(").
  anchor_must_contain: number;
  // when every entry of the anchor's value / suffix sets ends in the SAME
  // char, dispatch rejects on one charCodeAt before any gate runs --
  // colon-anchored rules would otherwise gate-check every punctuation
  // token in the stream.
  anchor_last_char: number;
  // when the whole `when` pattern is a single type() check, its operands
  // are inlined here and dispatch skips match_bytecode entirely. -1 means
  // "no fast path" (which also routes dead NEVER_MATCHES rules through
  // the vm, where they fail as before).
  inline_when_type: number;
  inline_when_values: number;
  inline_when_pred: number;
  // claim precedence for this rule's targets, -1 to use the target
  // type's shared-table precedence.
  precedence_override: number;
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
  params_specs: CompiledParamsSpec[];
  span_specs: CompiledTypeSpanSpec[];
  // true when any rule carries an anchor frame gate -- lets the dispatch
  // loop skip the per-call kind resolution entirely for gate-free groups.
  has_frame_gates: boolean;
  // true when any rule gates on the signals array (ternary / stmt flags).
  has_signal_gates: boolean;
  // gate resolution is a pure function of (rule_table, kind_names) and
  // (rule_table, flag_names). both name arrays are built once when the
  // frame_track instance is constructed and handed unchanged to every
  // frame table it produces, so keying on their identity turns a
  // per-highlight rebuild into one lookup. a table from a DIFFERENT
  // tracker instance misses and rebuilds -- the failure mode is a wasted
  // rebuild, never a stale resolution.
  kind_gate_cache: WeakMap<string[], (Int32Array | null)[]>;
  signal_gate_cache: WeakMap<string[], SignalGateMasks>;
}

interface SignalGateMasks {
  all: Int32Array;
  none: Int32Array;
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
            value_ends_with: undefined as string | string[] | undefined,
            text_pred: undefined as string | undefined,
            at_start: undefined as boolean | undefined,
            frame_kinds: undefined as string[] | undefined,
            frame_direct: undefined as boolean | undefined,
            ternary_colon: undefined as boolean | undefined,
            stmt_flags_all: undefined as string[] | undefined,
            stmt_flags_none: undefined as string[] | undefined,
          }
        : {
            type_name: rule.anchor.type_name,
            value: rule.anchor.value,
            value_ends_with: rule.anchor.value_ends_with,
            text_pred: rule.anchor.text_pred,
            at_start: rule.anchor.at_start,
            frame_kinds: rule.anchor.frame_kinds,
            frame_direct: rule.anchor.frame_direct,
            ternary_colon: rule.anchor.ternary_colon,
            stmt_flags_all: rule.anchor.stmt_flags_all,
            stmt_flags_none: rule.anchor.stmt_flags_none,
          };
    const anchor_id = name_to_id.get(anchor_spec.type_name);
    if (anchor_id === undefined) {
      warn_once(
        "rewrite_types",
        `anchor-type:${anchor_spec.type_name}`,
        `anchor type "${anchor_spec.type_name}" is not in the token vocabulary; rule disabled`,
      );
      continue;
    }

    const slots = make_capture_slots();
    const when_pc = ctx.program_len;
    ctx.rule_start_pc = when_pc;
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
        if (slot_id === undefined) {
          warn_once(
            "rewrite_types",
            `rewrite-capture:${name}`,
            `rewrite target references capture "${name}" which the when pattern never declares; target ignored`,
          );
          continue;
        }
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
    let anchor_value_suffix_id = -1;
    if (anchor_spec.value_ends_with !== undefined) {
      const suffixes = Array.isArray(anchor_spec.value_ends_with)
        ? anchor_spec.value_ends_with
        : [anchor_spec.value_ends_with];
      anchor_value_suffix_id = compile_value_set(ctx, suffixes);
    }

    // -1 (default) skips the predicate check. -2 marks an unknown predicate
    // name: the dispatch loop short-circuits the rule entirely so misspelled
    // names fail closed rather than fall through to "always match".
    let anchor_text_pred_id = -1;
    if (anchor_spec.text_pred !== undefined) {
      const resolved = resolve_char_pred(anchor_spec.text_pred);
      if (resolved < 0) {
        warn_once(
          "rewrite_types",
          `anchor-pred:${anchor_spec.text_pred}`,
          `unknown text predicate "${anchor_spec.text_pred}" on anchor; rule disabled`,
        );
      }
      anchor_text_pred_id = resolved < 0 ? -2 : resolved;
    }

    let before_pc = -1;
    if (rule.before !== undefined) {
      before_pc = ctx.program_len;
      compile_reverse_pattern_bytecode(rule.before, name_to_id, ctx);
      emit(ctx, OP_MATCH);
    }

    let capture_slot_targets: Int32Array | null = null;
    if (capture_targets !== null && capture_targets.length > 0) {
      capture_slot_targets = new Int32Array(slots.max_slots).fill(-1);
      for (const t of capture_targets) capture_slot_targets[t.slot_id] = t.target_id;
    }

    // dispatch fast paths read off the compiled program shape. an
    // arrow-mode params() leads the pattern (enforced above), so the
    // anchor must carry a "(" somewhere in its source text. a `when`
    // that is exactly one live type() check inlines into the dispatch
    // loop, skipping vm entry for the by-far-most-common rule shape.
    let anchor_must_contain = -1;
    if (
      ctx.program[when_pc] === OP_PARAMS &&
      ctx.params_specs[ctx.program[when_pc + 1]].find_open === PARAMS_FIND_ARROW
    ) {
      anchor_must_contain = CH_PAREN_OPEN;
    }
    // shared trailing char across every value / suffix entry, when the
    // anchor constrains its text at all.
    let anchor_last_char = -1;
    {
      const candidates: string[] = [];
      if (anchor_spec.value !== undefined) {
        candidates.push(
          ...(Array.isArray(anchor_spec.value) ? anchor_spec.value : [anchor_spec.value]),
        );
      }
      if (anchor_spec.value_ends_with !== undefined) {
        candidates.push(
          ...(Array.isArray(anchor_spec.value_ends_with)
            ? anchor_spec.value_ends_with
            : [anchor_spec.value_ends_with]),
        );
      }
      if (candidates.length > 0 && candidates.every((c) => c.length > 0)) {
        const last = candidates[0].charCodeAt(candidates[0].length - 1);
        if (candidates.every((c) => c.charCodeAt(c.length - 1) === last)) {
          anchor_last_char = last;
        }
      }
    }
    let inline_when_type = -1;
    let inline_when_values = -1;
    let inline_when_pred = -1;
    if (
      ctx.program[when_pc] === OP_TYPE &&
      ctx.program[when_pc + 1] !== NEVER_MATCHES &&
      ctx.program[when_pc + 4] === OP_MATCH
    ) {
      inline_when_type = ctx.program[when_pc + 1];
      inline_when_values = ctx.program[when_pc + 2];
      inline_when_pred = ctx.program[when_pc + 3];
    }

    compiled.push({
      anchor_id,
      anchor_value_id,
      anchor_value_suffix_id,
      anchor_text_pred_id,
      anchor_target_id,
      capture_targets,
      capture_slot_targets,
      before_pc,
      when_pc,
      max_capture_slots: slots.max_slots,
      anchor_at_start: anchor_spec.at_start === true,
      anchor_frame_kinds:
        anchor_spec.frame_kinds !== undefined && anchor_spec.frame_kinds.length > 0
          ? anchor_spec.frame_kinds
          : null,
      anchor_frame_direct: anchor_spec.frame_direct === true,
      anchor_ternary_colon:
        anchor_spec.ternary_colon === undefined ? -1 : anchor_spec.ternary_colon ? 1 : 0,
      anchor_flags_all:
        anchor_spec.stmt_flags_all !== undefined && anchor_spec.stmt_flags_all.length > 0
          ? anchor_spec.stmt_flags_all
          : null,
      anchor_flags_none:
        anchor_spec.stmt_flags_none !== undefined && anchor_spec.stmt_flags_none.length > 0
          ? anchor_spec.stmt_flags_none
          : null,
      anchor_must_contain,
      anchor_last_char,
      inline_when_type,
      inline_when_values,
      inline_when_pred,
      precedence_override: rule.precedence ?? -1,
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
    params_specs: ctx.params_specs,
    span_specs: ctx.span_specs,
    has_frame_gates: compiled.some((r) => r.anchor_at_start || r.anchor_frame_kinds !== null),
    has_signal_gates: compiled.some(
      (r) =>
        r.anchor_ternary_colon >= 0 || r.anchor_flags_all !== null || r.anchor_flags_none !== null,
    ),
    kind_gate_cache: new WeakMap(),
    signal_gate_cache: new WeakMap(),
  };
}

// resolve each gated rule's frame-kind names against one frame table's
// vocabulary, aligned with rule_table. unknown names resolve to -1 and never
// equal a real kind -- the gate (and so the rule) fails closed.
function build_kind_gates(rule_table: CompiledRule[], kind_names: string[]): (Int32Array | null)[] {
  return rule_table.map((r) => {
    if (r.anchor_frame_kinds === null) return null;
    const out = new Int32Array(r.anchor_frame_kinds.length);
    for (let k = 0; k < r.anchor_frame_kinds.length; k++) {
      out[k] = kind_names.indexOf(r.anchor_frame_kinds[k]);
      if (out[k] < 0 && debug_enabled()) {
        warn_once(
          "rewrite_types",
          `frame-kind:${r.anchor_frame_kinds[k]}`,
          `anchor frame kind "${r.anchor_frame_kinds[k]}" is not in the frame table's kind names; the gate can never pass`,
        );
      }
    }
    return out;
  });
}

// resolve signal-gate flag names to bit masks against one frame table's
// flag_names, aligned with rule_table. an unknown name in EITHER list
// poisons the require-all mask with a bit no signal byte can carry, so the
// rule fails closed instead of silently widening.
function build_signal_gates(rule_table: CompiledRule[], flag_names: string[]): SignalGateMasks {
  const all = new Int32Array(rule_table.length);
  const none = new Int32Array(rule_table.length);
  for (let r = 0; r < rule_table.length; r++) {
    const rule = rule_table[r];
    if (rule.anchor_flags_all === null && rule.anchor_flags_none === null) continue;
    let dead = false;
    const resolve = (names: string[] | null): number => {
      if (names === null) return 0;
      let mask = 0;
      for (const name of names) {
        const idx = flag_names.indexOf(name);
        if (idx < 0) {
          dead = true;
          if (debug_enabled()) {
            warn_once(
              "rewrite_types",
              `stmt-flag:${name}`,
              `anchor stmt flag "${name}" is not in the frame table's flag names; the gate can never pass`,
            );
          }
          continue;
        }
        mask |= 1 << (idx + 1);
      }
      return mask;
    };
    let all_mask = resolve(rule.anchor_flags_all);
    const none_mask = resolve(rule.anchor_flags_none);
    if (dead) all_mask |= 1 << 30;
    all[r] = all_mask;
    none[r] = none_mask;
  }
  return { all, none };
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
  // compiled states cached per vocabulary CONTENT, not array identity.
  // the batch runner hands every call a freshly sliced token_types, so an
  // identity key would miss on each call and recompile the bytecode per
  // highlight. content is deterministic per (pipeline, grammar, fidelity):
  // the same instance sees the same names in the same order every run, and
  // since slices copy string references the comparison is a pointer walk.
  // exact match (not prefix) so a shared instance running under different
  // fidelity configs -- where earlier producers append different names --
  // never reuses a state whose fail-closed name resolution would differ.
  interface CompiledCacheEntry {
    snapshot: string[];
    state: CompiledRewriteState;
  }
  const compiled_cache: CompiledCacheEntry[] = [];

  function get_state(input_types: string[]): CompiledRewriteState {
    outer: for (let c = 0; c < compiled_cache.length; c++) {
      const snap = compiled_cache[c].snapshot;
      if (snap.length !== input_types.length) continue;
      for (let k = 0; k < snap.length; k++) {
        if (snap[k] !== input_types[k]) continue outer;
      }
      return compiled_cache[c].state;
    }
    const state = compile_rewrite(rules, options, input_types);
    // bound the cache defensively: embed-merged vocabularies could in
    // principle vary per input. distinct vocabularies per instance are
    // 1-2 in practice (one per language/fidelity config sharing the rules).
    if (compiled_cache.length >= 8) compiled_cache.length = 0;
    compiled_cache.push({ snapshot: input_types.slice(), state });
    return state;
  }

  function collect(
    input: string,
    tokens: Uint32Array,
    token_types: string[],
    state: CompiledRewriteState,
    sink: ClaimSink,
    frames: FrameTable | undefined,
  ): void {
    if (state.compiled.length === 0) return;
    const remap = resolve_appended(state, token_types);
    run_rewrite_loop_claims(input, tokens, token_types, state, remap, sink, frames);
  }

  const apply_fn: Reclassifier = (input, result) => {
    const tokens = new Uint32Array(result.tokens);
    const token_types = result.token_types.slice();
    const state = get_state(result.token_types);
    // local sink — apply_fn may be called reentrantly while the shared
    // sink is in use by an outer batch.
    const sink = new ClaimBuffer(256);
    collect(input, tokens, token_types, state, sink, result.frames);
    merge_and_apply_buffer(tokens, sink);
    return { tokens, token_types, frames: result.frames };
  };

  const claim_fn: ClaimFn = (input, tokens, token_types, sink, frames) => {
    const state = get_state(token_types);
    collect(input, tokens, token_types, state, sink, frames);
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
  frames: FrameTable | undefined,
): void {
  const count = tokens.length / 3;
  const {
    anchor_offset,
    anchor_count,
    rule_table,
    trivia,
    program,
    value_pool,
    value_offsets,
    params_specs,
    span_specs,
  } = state;

  let resolved_kinds: (Int32Array | null)[] | null = null;
  if (state.has_frame_gates && frames !== undefined) {
    resolved_kinds = state.kind_gate_cache.get(frames.kind_names) ?? null;
    if (resolved_kinds === null) {
      resolved_kinds = build_kind_gates(rule_table, frames.kind_names);
      state.kind_gate_cache.set(frames.kind_names, resolved_kinds);
    }
  }
  if (state.has_frame_gates && frames === undefined && debug_enabled()) {
    warn_once(
      "rewrite_types",
      "frames-missing",
      "rules with frame gates ran without a frame_track stage upstream; gated rules are disabled",
    );
  }

  let flags_all_masks: Int32Array | null = null;
  let flags_none_masks: Int32Array | null = null;
  const signals = frames !== undefined ? frames.signals : EMPTY_SIGNALS;
  if (state.has_signal_gates && frames !== undefined && signals.length > 0) {
    let masks = state.signal_gate_cache.get(frames.flag_names) ?? null;
    if (masks === null) {
      masks = build_signal_gates(rule_table, frames.flag_names);
      state.signal_gate_cache.set(frames.flag_names, masks);
    }
    flags_all_masks = masks.all;
    flags_none_masks = masks.none;
  }
  if (state.has_signal_gates && signals.length === 0 && debug_enabled()) {
    warn_once(
      "rewrite_types",
      "signals-missing",
      "rules with signal gates ran without ternary / stmt_flags configured in the frame_track stage; gated rules are disabled",
    );
  }

  for (let i = 0; i < count; i++) {
    const type = tokens[i * 3];
    if (trivia[type]) continue;
    const offset = anchor_offset[type];
    if (offset < 0) continue;
    const rcount = anchor_count[type];

    for (let r = 0; r < rcount; r++) {
      const rule = rule_table[offset + r];
      // text constraints run before the gates: a one-char trailing test
      // and the value sets are far cheaper than frame walks, and value
      // anchors on common types (punctuation `:`) reject most tokens.
      if (rule.anchor_last_char >= 0) {
        if (input.charCodeAt(tokens[i * 3 + 2] - 1) !== rule.anchor_last_char) continue;
      }
      if (rule.anchor_value_id !== -1) {
        const s = tokens[i * 3 + 1];
        const e = tokens[i * 3 + 2];
        if (!value_set_matches(value_pool, value_offsets, rule.anchor_value_id, input, s, e)) {
          continue;
        }
      }
      if (rule.anchor_value_suffix_id !== -1) {
        const s = tokens[i * 3 + 1];
        const e = tokens[i * 3 + 2];
        if (
          !value_set_ends_with(value_pool, value_offsets, rule.anchor_value_suffix_id, input, s, e)
        ) {
          continue;
        }
      }
      if (rule.anchor_at_start || rule.anchor_frame_kinds !== null) {
        // frame gates fail closed when no frame_track stage ran.
        if (frames === undefined) continue;
        if (rule.anchor_at_start && frames.at_start[i] !== 1) continue;
        if (rule.anchor_frame_kinds !== null) {
          const wanted = resolved_kinds![offset + r]!;
          let kind: number;
          if (rule.anchor_frame_direct) {
            // direct mode: the token's innermost frame, no parent walk.
            // paren / bracket frames carry their built-in kinds, so a
            // member-position rule requiring a brace kind rejects tokens
            // nested inside parens within the body.
            kind = frames.frames[frames.active_frame[i]].kind;
          } else {
            // nearest enclosing BRACE frame: paren / bracket frames are
            // transparent; ending on TOP matches the built-in "top" kind.
            let fi = frames.active_frame[i];
            let fr = frames.frames[fi];
            while (fi > 0 && fr.bracket !== FRAME_BRACKET_BRACE) {
              fi = fr.parent;
              fr = frames.frames[fi];
            }
            kind = fr.bracket === FRAME_BRACKET_BRACE ? fr.kind : FRAME_KIND_TOP;
          }
          let kind_ok = false;
          for (let k = 0; k < wanted.length; k++) {
            if (wanted[k] === kind) {
              kind_ok = true;
              break;
            }
          }
          if (!kind_ok) continue;
        }
      }
      if (
        rule.anchor_ternary_colon >= 0 ||
        rule.anchor_flags_all !== null ||
        rule.anchor_flags_none !== null
      ) {
        // signal gates fail closed when the upstream frame_track stage
        // did not configure ternary / stmt_flags tracking.
        if (i >= signals.length) continue;
        const sig = signals[i];
        if (rule.anchor_ternary_colon >= 0) {
          if ((sig & SIGNAL_TERNARY_COLON) !== rule.anchor_ternary_colon) continue;
        }
        if (flags_all_masks !== null) {
          const all = flags_all_masks[offset + r];
          if ((sig & all) !== all) continue;
          if ((sig & flags_none_masks![offset + r]) !== 0) continue;
        } else if (rule.anchor_flags_all !== null || rule.anchor_flags_none !== null) {
          continue;
        }
      }
      if (rule.anchor_text_pred_id !== -1) {
        if (rule.anchor_text_pred_id === -2) continue;
        const s = tokens[i * 3 + 1];
        const e = tokens[i * 3 + 2];
        if (!text_pred_matches(rule.anchor_text_pred_id, input, s, e)) continue;
      }
      if (rule.anchor_must_contain >= 0) {
        const s = tokens[i * 3 + 1];
        const e = tokens[i * 3 + 2];
        let contains = false;
        for (let p = s; p < e; p++) {
          if (input.charCodeAt(p) === rule.anchor_must_contain) {
            contains = true;
            break;
          }
        }
        if (!contains) continue;
      }
      if (rule.before_pc >= 0) {
        const behind = match_bytecode_reverse(
          program,
          rule.before_pc,
          tokens,
          i - 1,
          input,
          trivia,
          value_pool,
          value_offsets,
        );
        if (behind === NO_MATCH) continue;
      }
      if (rule.inline_when_type >= 0) {
        // single-type() fast path: replicate OP_TYPE without vm entry.
        let j = i + 1;
        while (j < count && trivia[tokens[j * 3]]) j++;
        if (j >= count || tokens[j * 3] !== rule.inline_when_type) continue;
        if (rule.inline_when_values >= 0) {
          if (
            !value_set_matches(
              value_pool,
              value_offsets,
              rule.inline_when_values,
              input,
              tokens[j * 3 + 1],
              tokens[j * 3 + 2],
            )
          ) {
            continue;
          }
        }
        if (rule.inline_when_pred >= 0) {
          if (
            !text_pred_matches(rule.inline_when_pred, input, tokens[j * 3 + 1], tokens[j * 3 + 2])
          ) {
            continue;
          }
        }
      } else {
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
          params_specs,
          span_specs,
          frames,
        );
        if (end === NO_MATCH) continue;
      }

      // emit claims. anchor-target form flips the anchor's type; capture
      // form walks the match's capture log -- one entry per capture
      // occurrence, so captures inside repeat bodies claim every
      // iteration, and captures from abandoned branches never appear.
      // the rule's precedence override, when set, applies to every target.
      if (rule.anchor_target_id !== -1) {
        const target_id = runtime_target(rule.anchor_target_id, state, remap);
        const p =
          rule.precedence_override >= 0
            ? rule.precedence_override
            : precedence_for(token_types[target_id]);
        sink.emit(i, target_id, p);
      }
      if (rule.capture_slot_targets !== null) {
        const slot_targets = rule.capture_slot_targets;
        for (let li = 0; li < cap_log_len; li += 3) {
          const ct = slot_targets[cap_log[li]];
          if (ct < 0) continue;
          const target_id = runtime_target(ct, state, remap);
          const p =
            rule.precedence_override >= 0
              ? rule.precedence_override
              : precedence_for(token_types[target_id]);
          const e = cap_log[li + 2];
          for (let t = cap_log[li + 1]; t < e; t++) {
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
  // the mapping is fixed for the life of the reclassifier, so its keys and
  // normalized entries are built once instead of per highlight.
  const names = Object.keys(mapping);
  const entries = names.map((name) => normalize_embed_entry(mapping[name]));
  // type_id -> index into `entries`, -1 for types this mapping ignores.
  // dense rather than a Map because the lookup runs once per host token;
  // cached per vocabulary so the indexOf scans are not repeated per call
  // when the host hands us the same array each time.
  // null means "this vocabulary maps nothing" -- the whole pass is a no-op
  // for it, and re-deriving that per call is wasted work.
  const table_cache = new WeakMap<string[], { table: Int32Array | null }>();

  return (input: string, result: TokenizeResult): TokenizeResult => {
    const host_tokens = result.tokens;
    const host_types = result.token_types;
    const host_count = host_tokens.length / 3;

    // keys that don't exist in the host's token_types are silently ignored,
    // so embed rules referencing tokens the host doesn't emit are harmless.
    let cached = table_cache.get(host_types);
    if (cached === undefined) {
      const table = new Int32Array(host_types.length).fill(-1);
      let any = false;
      for (let k = 0; k < names.length; k++) {
        const id = host_types.indexOf(names[k]);
        if (id !== -1) {
          table[id] = k;
          any = true;
        }
      }
      cached = { table: any ? table : null };
      table_cache.set(host_types, cached);
    }
    const by_type_id = cached.table;
    if (by_type_id === null) return result;

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
      const entry_idx = type_id < by_type_id.length ? by_type_id[type_id] : -1;
      if (entry_idx < 0) continue;
      const entry = entries[entry_idx];
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

  // the vocabulary merge is deferred until a group is actually found.
  // every host stream without an embedded region pays this function, and
  // so does the second, fixed-point iteration of every host that HAS one,
  // so cloning the names and indexing them up front was fixed cost on the
  // path that does nothing. `token_types` stays aliased to the host's array
  // (identical content) until the first ensure_id call clones it.
  let token_types = host_types;
  let name_to_id: Map<string, number> | null = null;
  const materialize = (): Map<string, number> => {
    if (name_to_id !== null) return name_to_id;
    token_types = host_types.slice();
    const map = new Map<string, number>();
    for (let i = 0; i < token_types.length; i++) map.set(token_types[i], i);
    name_to_id = map;
    return map;
  };
  const ensure_id = (name: string): number => {
    const map = materialize();
    let id = map.get(name);
    if (id === undefined) {
      id = token_types.length;
      token_types.push(name);
      map.set(name, id);
    }
    return id;
  };

  // cache per-sub-language type remaps so repeated groups of the same
  // language don't re-walk token_types.
  let remap_cache: WeakMap<string[], Uint32Array> | null = null;
  const remap_for = (sub_types: string[]): Uint32Array => {
    if (remap_cache === null) remap_cache = new WeakMap();
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
    // clone before the group is processed so later scan calls see the same
    // array the pre-deferral code handed them.
    materialize();
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

// a pipeline resolves to a fixed sequence of steps: either one batch of
// consecutive claim producers or one mutating pass. which is which depends
// only on the pipeline, so the grouping is derived once rather than on
// every highlight -- but on the FIRST CALL, not at bind. planning eagerly
// in reclassify() doubled `bind` (73ns -> 164ns on typescript), and
// consumers that rebind per block -- per-block fidelity, per-request SSR
// -- pay bind on every highlight. one null check per call is the price of
// keeping that path as cheap as it was.
interface PipelineStep {
  batch: ClaimingReclassifier[] | null;
  fn: Reclassifier | null;
}

function plan_pipeline(pipeline: ReclassifierPipeline): PipelineStep[] {
  const steps: PipelineStep[] = [];
  let batch: ClaimingReclassifier[] = [];
  for (let i = 0; i < pipeline.length; i++) {
    const fn = pipeline[i];
    if (is_claiming(fn)) {
      batch.push(fn);
      continue;
    }
    if (batch.length > 0) {
      steps.push({ batch, fn: null });
      batch = [];
    }
    steps.push({ batch: null, fn });
  }
  if (batch.length > 0) steps.push({ batch, fn: null });
  return steps;
}

export function reclassify(
  pipeline: ReclassifierPipeline,
): (input: string, result: TokenizeResult) => TokenizeResult {
  let steps: PipelineStep[] | null = null;
  return (input, result) => {
    if (steps === null) steps = plan_pipeline(pipeline);
    let current = result;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.batch !== null) {
        current = flush_claim_batch(input, current, step.batch);
        continue;
      }
      const fn = step.fn!;
      const prior_frames = current.frames;
      const prior_token_len = current.tokens.length;
      current = fn(input, current);
      // auto-carry frames across non-claiming reclassifiers that only
      // rewrite type ids (token count unchanged). reclassifiers that splice
      // tokens MUST explicitly drop frames by returning a result with
      // `frames: undefined` -- otherwise their output would carry stale
      // frame indices. the length-equality heuristic catches the common case
      // (mutate-in-place) without burdening every reclassifier with an
      // explicit `frames: result.frames` pass-through.
      if (
        current.frames === undefined &&
        prior_frames !== undefined &&
        current.tokens.length === prior_token_len
      ) {
        current = {
          tokens: current.tokens,
          token_types: current.token_types,
          overlays: current.overlays,
          frames: prior_frames,
        };
      }
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
  const token_types = current.token_types.slice();
  // reuse the module-level sink. all batch producers emit into it
  // sequentially; we apply the merged winners once at the end. producers
  // receive the CURRENT tokens uncloned -- the ClaimFn contract forbids
  // mutating token slots, so the clone is deferred until we know at least
  // one claim needs applying. batches that fire nothing skip the copy.
  shared_sink.reset();
  for (let i = 0; i < batch.length; i++) {
    batch[i].__claim(input, current.tokens, token_types, shared_sink, current.frames);
  }
  if (shared_sink.count === 0) {
    return { tokens: current.tokens, token_types, frames: current.frames };
  }
  const tokens = new Uint32Array(current.tokens);
  merge_and_apply_buffer(tokens, shared_sink);
  // preserve frames from the input -- the batch cannot have changed token
  // count or stream shape (claims only rewrite type ids), so the frame
  // indices computed before the batch remain valid.
  return { tokens, token_types, frames: current.frames };
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
    claim_fn(input, tokens, token_types, sink, result.frames);
    merge_and_apply_buffer(tokens, sink);
    return { tokens, token_types, frames: result.frames };
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
    // annotation extraction is opt-in. when options.annotation is undefined
    // the extractor is null and the LanguageFn closure is identical to
    // today's: a single nullable check, V8 inlines it. when configured, the
    // closure calls the extractor after reclassification and attaches
    // overlays for the renderer to consume.
    const annotation_extractor = options?.annotation
      ? build_annotation_extractor(options.annotation, grammar.token_types)
      : null;
    return (input: string) => {
      const result = run(input, tokenize(input, grammar));
      if (downgrade !== null) apply_downgrade(result.tokens, downgrade);
      if (annotation_extractor !== null) {
        const overlays = annotation_extractor(input, result);
        if (overlays !== undefined) result.overlays = overlays;
      }
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
