// test utilities for reclassifier pipelines.
//
// the helpers here exist to validate architectural invariants rather than to
// be used at runtime:
//
//   - permute_claim_producers: given a LanguagePipeline, return every
//     pipeline obtained by permuting the order of claim-producing entries
//     within each contiguous claim segment. the pipeline runner batches
//     consecutive claim producers and merges their claims by precedence;
//     if the architecture is correct, every permutation within a batch
//     must produce semantically identical output.
//
//   - collect_claims_per_pass: run each claim producer independently against
//     a base TokenizeResult, collecting the raw claims each one emits. used
//     to diagnose conflicts — tokens where two passes emit different target
//     type_ids for the same position.
//
//   - tokens_to_named: render a TokenizeResult as an array of
//     { type, value, start, end } entries keyed on type NAME rather than
//     integer id. required for permutation comparisons because merging
//     order affects type_types index assignment (same names, different
//     positions) even when the semantic result is identical.

import type {
  Claim,
  ClaimingReclassifier,
  LanguagePipeline,
  Reclassifier,
  ReclassifierEntry,
  TokenizeResult,
} from "./types";

function is_claim_producing(entry: ReclassifierEntry): boolean {
  const fn: Reclassifier = typeof entry === "function" ? entry : entry.reclassifier;
  return typeof (fn as ClaimingReclassifier).__claim === "function";
}

function* permutations<T>(arr: readonly T[]): Generator<T[]> {
  if (arr.length <= 1) {
    yield arr.slice();
    return;
  }
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) yield [arr[i], ...p];
  }
}

/**
 * return every pipeline obtained by permuting the order of claim-producing
 * entries within each contiguous claim segment of the input pipeline.
 * non-claim entries keep their positions (they break batches, so they're
 * order-sensitive by definition).
 *
 * the first entry in the returned array is always the original pipeline.
 */
export function permute_claim_producers(pipeline: LanguagePipeline): LanguagePipeline[] {
  // partition into segments of (claim | non-claim) contiguous entries.
  interface Segment {
    is_claim: boolean;
    entries: ReclassifierEntry[];
  }
  const segments: Segment[] = [];
  for (const e of pipeline) {
    const is_claim = is_claim_producing(e);
    const last = segments[segments.length - 1];
    if (last && last.is_claim === is_claim) {
      last.entries.push(e);
    } else {
      segments.push({ is_claim, entries: [e] });
    }
  }

  // for each claim segment with 2+ entries, generate all permutations;
  // non-claim segments (or 1-entry claim segments) keep a single "option".
  const segment_options: ReclassifierEntry[][][] = segments.map((s) => {
    if (!s.is_claim || s.entries.length <= 1) return [s.entries];
    const out: ReclassifierEntry[][] = [];
    for (const p of permutations(s.entries)) out.push(p);
    return out;
  });

  // cartesian product across segments. the first combination is the
  // original pipeline because permutations() yields the input order first.
  let results: LanguagePipeline[] = [[]];
  for (const options of segment_options) {
    const next: LanguagePipeline[] = [];
    for (const cur of results) {
      for (const opt of options) {
        next.push([...cur, ...opt]);
      }
    }
    results = next;
  }
  return results;
}

/**
 * render a TokenizeResult as { type, value, start, end } entries keyed by
 * type NAME. required for permutation comparisons: two pipelines can
 * produce the same semantic classification while using different type_id
 * integer positions in token_types (names arrive in different append
 * orders). comparing by name normalizes over that.
 */
export function tokens_to_named(
  result: TokenizeResult,
  input: string,
): { type: string; value: string; start: number; end: number }[] {
  const out: { type: string; value: string; start: number; end: number }[] = [];
  const n = result.tokens.length / 3;
  for (let i = 0; i < n; i++) {
    const start = result.tokens[i * 3 + 1];
    const end = result.tokens[i * 3 + 2];
    out.push({
      type: result.token_types[result.tokens[i * 3]],
      value: input.slice(start, end),
      start,
      end,
    });
  }
  return out;
}

// local merge used to simulate the real pipeline's batch-flush behavior
// in collect_claims_per_pass. matches the core merge_claims semantics:
// higher precedence wins; on tie, earliest claim wins (stable insertion).
function merge_claims_for_diagnostic(claims: Claim[]): Claim[] {
  const winners = new Map<number, Claim>();
  for (let i = 0; i < claims.length; i++) {
    const c = claims[i];
    const existing = winners.get(c.token_idx);
    if (existing === undefined || c.precedence > existing.precedence) {
      winners.set(c.token_idx, c);
    }
  }
  return Array.from(winners.values());
}

/**
 * walk the pipeline the way the real runner does — mutating passes apply
 * in place, claim passes batch together, claims merge and apply at each
 * batch boundary. unlike the real runner, this captures EACH claim-
 * producing pass's raw (pre-merge) claims as a separate entry so conflict
 * detection can surface tokens where passes disagree.
 *
 * returns one entry per claim-producing pass plus the final extended
 * token_types array (passes may append names; downstream conflict
 * reporting needs them for display).
 *
 * primary use: conflict diagnostics. a "conflict" at token idx I exists
 * when two passes within the same batch emit claims with different target
 * type NAMES at I — at runtime, precedence picks a winner, but the fact
 * that multiple passes disagree about I indicates overlapping coverage.
 */
export function collect_claims_per_pass(
  input: string,
  result: TokenizeResult,
  pipeline: LanguagePipeline,
): {
  claims_per_pass: { pass_index: number; claims: Claim[] }[];
  token_types: string[];
} {
  const out: { pass_index: number; claims: Claim[] }[] = [];
  let tokens = new Uint32Array(result.tokens);
  let token_types = result.token_types.slice();

  // the batch accumulates claim fns and their source pass indices until a
  // non-claim entry forces a flush (apply merged claims, advance state).
  const batch: ClaimingReclassifier["__claim"][] = [];
  const batch_pass_indices: number[] = [];

  const flush_batch = (): void => {
    if (batch.length === 0) return;
    const emitted_from_batch: Claim[][] = [];
    for (let i = 0; i < batch.length; i++) {
      // record each producer's claims into its own list via a recording
      // sink, so the diagnostic can report per-pass breakdowns.
      const recorded: Claim[] = [];
      const sink = {
        emit: (token_idx: number, type_id: number, precedence: number) => {
          recorded.push({ token_idx, type_id, precedence });
        },
      };
      batch[i](input, tokens, token_types, sink);
      emitted_from_batch.push(recorded.slice());
      out.push({ pass_index: batch_pass_indices[i], claims: recorded.slice() });
    }
    // apply merged claims so subsequent mutating passes see the real
    // post-batch stream (matches runner behavior).
    const all: Claim[] = [];
    for (const list of emitted_from_batch) for (const c of list) all.push(c);
    const merged = merge_claims_for_diagnostic(all);
    for (const c of merged) tokens[c.token_idx * 3] = c.type_id;
    batch.length = 0;
    batch_pass_indices.length = 0;
  };

  let pass_index = 0;
  for (const entry of pipeline) {
    const fn: Reclassifier = typeof entry === "function" ? entry : entry.reclassifier;
    const claim_fn = (fn as ClaimingReclassifier).__claim;
    if (typeof claim_fn === "function") {
      batch.push(claim_fn);
      batch_pass_indices.push(pass_index);
      pass_index++;
      continue;
    }
    // mutating pass — flush any pending claim batch first.
    flush_batch();
    const next = fn(input, { tokens, token_types });
    tokens = new Uint32Array(next.tokens);
    token_types = next.token_types;
    pass_index++;
  }
  flush_batch();
  return { claims_per_pass: out, token_types };
}

export interface ClaimConflict {
  token_idx: number;
  value: string;
  /** list of (pass_index, type_name) pairs claiming this token. */
  contenders: { pass_index: number; type_name: string }[];
}

/**
 * given the output of collect_claims_per_pass, find token positions where
 * two or more passes emit claims targeting DIFFERENT type names. returns
 * a per-token report. types are rendered using the final extended
 * token_types array returned by collect_claims_per_pass so appended
 * names (function, property, class_name, ...) display correctly.
 */
export function find_claim_conflicts(
  input: string,
  result: TokenizeResult,
  collected: ReturnType<typeof collect_claims_per_pass>,
): ClaimConflict[] {
  const { claims_per_pass, token_types } = collected;
  const by_idx = new Map<number, { pass_index: number; type_id: number }[]>();
  for (const { pass_index, claims } of claims_per_pass) {
    for (const c of claims) {
      let list = by_idx.get(c.token_idx);
      if (!list) {
        list = [];
        by_idx.set(c.token_idx, list);
      }
      list.push({ pass_index, type_id: c.type_id });
    }
  }
  const conflicts: ClaimConflict[] = [];
  for (const [idx, list] of by_idx) {
    const distinct_ids = new Set(list.map((e) => e.type_id));
    if (distinct_ids.size <= 1) continue;
    const start = result.tokens[idx * 3 + 1];
    const end = result.tokens[idx * 3 + 2];
    conflicts.push({
      token_idx: idx,
      value: input.slice(start, end),
      contenders: list.map((e) => ({
        pass_index: e.pass_index,
        type_name: token_types[e.type_id] ?? `#${e.type_id}`,
      })),
    });
  }
  conflicts.sort((a, b) => a.token_idx - b.token_idx);
  return conflicts;
}
