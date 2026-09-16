// paired A/B measurement engine.
//
// design, and why each part is there:
//
// PAIRED, INTERLEAVED, ADJACENT. for each workload the two arms are measured
// alternately (ABBA ABBA ...) within a few hundred milliseconds of each
// other, and the statistic is the median of the per-round RATIOS, not the
// ratio of the two medians. anything that moves the machine on a timescale
// slower than one round - thermal throttling, another process waking up,
// frequency scaling - moves both arms together and cancels in the ratio.
// this is the only reason the numbers survive several agents sharing a box.
//
// ABBA WITHIN EVERY ROUND, AND A SAMPLE IS A PAIR OF ROUNDS. a round times
// A, B, B, A (B, A, A, B on the next) and sums per arm, so an order effect -
// one arm's leftover concurrent compiles slowing the other's window on a
// starved runner - lands on both arms inside the same round. what a round
// cannot balance is its first window, which pays for the GC just before it;
// so a sample is one A-first round and one B-first round together, and the
// round count is rounded up to even. the earlier design alternated order
// across rounds only and took each round as a sample, which cancels nothing
// when the count is odd (the default 9, CI's 15): the median sits on the
// majority order's cluster, and the CI runner reported that as a 2% bias.
//
// SAME ITERATION COUNT FOR BOTH ARMS. calibrated from the slower arm. an
// unequal count changes the loop's own shape (allocation pressure per
// measurement, GC timing) between arms.
//
// BOOTSTRAP CI ON THE MEDIAN RATIO. no normality assumption, and it gives an
// interval that either excludes 1.0 or does not. a result whose interval
// straddles 1.0 is not a result.
//
// NOISE FLOOR FROM A/A. the engine can compare an arm against ITSELF, which
// must return 1.00. whatever spread that produces is the smallest effect
// this harness can see; anything smaller is noise being read as signal. run
// bin/calibrate.mjs to measure it, and do not believe a delta below it.
//
// FORCED GC, RE-WARM, MINOR GC. every round starts with a full gc() so no
// round inherits the last one's garbage - and, on a shared runner with few
// cores, so that no NATURAL full GC lands inside a window: tried without it,
// concurrent marking inside a window put a single A/A row 102% off. but a
// forced GC at a quiescent point evicts optimised code that only a per-call
// closure was keeping alive (the feedback vector's reference is weak) and
// invalidates code that embedded a map only dead objects had; both arms would
// then re-tier inside their windows. an A/A cancels that, which is how it
// went unnoticed; an A/B whose two arms differ in closure structure does not,
// and reported the difference as a speedup. so after the gc() both arms run
// untimed for `rewarm_ms`, and a minor GC then empties the nursery the
// re-warm filled so the scavenge it would otherwise force does not land
// inside a window at random. a minor GC does not touch optimised code.

const NS_PER_MS = 1e6;

function median(xs) {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function percentile(xs, p) {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))));
  return s[idx];
}

// deterministic PRNG so a report is reproducible from its inputs.
function make_rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0x100000000;
  };
}

function bootstrap_ci(values, { samples = 2000, alpha = 0.05, seed = 0x5eed } = {}) {
  if (values.length < 3) return [NaN, NaN];
  const rng = make_rng(seed);
  const n = values.length;
  const medians = new Float64Array(samples);
  const buf = new Float64Array(n);
  for (let s = 0; s < samples; s++) {
    for (let i = 0; i < n; i++) buf[i] = values[(rng() * n) | 0];
    buf.sort();
    const mid = n >> 1;
    medians[s] = n % 2 ? buf[mid] : (buf[mid - 1] + buf[mid]) / 2;
  }
  const sorted = Array.from(medians).sort((a, b) => a - b);
  return [
    sorted[Math.floor((alpha / 2) * samples)],
    sorted[Math.min(samples - 1, Math.ceil((1 - alpha / 2) * samples))],
  ];
}

function time_ns(fn, iterations) {
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) fn();
  return Number(process.hrtime.bigint() - t0);
}

// iterations such that one measurement takes about `target_ms`, but never
// fewer than MIN_ITERATIONS.
//
// the floor matters more than it looks. a workload where one call takes 9ms
// gets two iterations at a 20ms target, so a single GC pause or scheduler
// interrupt lands on half the measurement. those were the noisiest rows in
// the first A/A calibration by a wide margin. holding a minimum iteration
// count lets slow workloads simply take longer rather than be measured badly.
const MIN_ITERATIONS = 4;

function calibrate(fn, target_ms) {
  let iterations = 1;
  for (let attempt = 0; attempt < 32; attempt++) {
    const ns = time_ns(fn, iterations);
    if (ns > 2 * NS_PER_MS) {
      const scaled = Math.max(1, Math.round((iterations * target_ms * NS_PER_MS) / ns));
      return {
        iterations: Math.min(Math.max(scaled, MIN_ITERATIONS), 20_000_000),
        per_op_ns: ns / iterations,
      };
    }
    iterations *= 4;
  }
  return { iterations: Math.max(iterations, MIN_ITERATIONS), per_op_ns: 0 };
}

function collect_gc() {
  if (typeof globalThis.gc === "function") {
    globalThis.gc();
  }
}

// a scavenge only. node's gc() takes the options object since v8 9.x; on an
// older runtime this would silently be a full GC and undo the re-warm.
function collect_gc_minor() {
  if (typeof globalThis.gc === "function") {
    globalThis.gc({ type: "minor" });
  }
}

// skipped when one call already exceeds the budget: that call amortises the
// transient by itself, and a one-second call would otherwise cost a second
// per round for nothing.
function rewarm(fn, per_op_ns, rewarm_ms) {
  if (rewarm_ms <= 0 || per_op_ns >= rewarm_ms * NS_PER_MS) return;
  const deadline = process.hrtime.bigint() + BigInt(Math.round(rewarm_ms * NS_PER_MS));
  do {
    fn();
  } while (process.hrtime.bigint() < deadline);
}

/**
 * Measure one workload on two arms.
 *
 * `a` and `b` are zero-argument functions. `a` is the reference (baseline),
 * `b` is the candidate. A `speedup` above 1 means the candidate is faster.
 */
export function compare_one(a, b, options = {}) {
  const { target_ms = 20, warmup_ms = 120, rewarm_ms = 20, seed = 0x5eed } = options;
  // a sample is a pair of rounds, so an odd count is rounded up.
  const rounds = (options.rounds ?? 9) + ((options.rounds ?? 9) % 2);

  // warm both arms to a steady tier before anything is recorded. an unwarmed
  // arm measures V8's optimiser, not the code.
  for (const fn of [a, b]) {
    const deadline = process.hrtime.bigint() + BigInt(warmup_ms * NS_PER_MS);
    let n = 0;
    do {
      fn();
      n++;
    } while (process.hrtime.bigint() < deadline && n < 5_000_000);
  }

  // one shared iteration count, taken from whichever arm is slower.
  const ca = calibrate(a, target_ms);
  const cb = calibrate(b, target_ms);
  const iterations = Math.max(1, Math.min(ca.iterations, cb.iterations));

  const round_a = [];
  const round_b = [];

  for (let r = 0; r < rounds; r++) {
    collect_gc();
    const a_first = r % 2 === 0;
    // the arm timed first re-warms second, so it is the more recently run of
    // the two when the windows start.
    if (a_first) {
      rewarm(b, cb.per_op_ns, rewarm_ms);
      rewarm(a, ca.per_op_ns, rewarm_ms);
    } else {
      rewarm(a, ca.per_op_ns, rewarm_ms);
      rewarm(b, cb.per_op_ns, rewarm_ms);
    }
    collect_gc_minor();
    // four windows, A B B A (or B A A B), summed per arm.
    let ta;
    let tb;
    if (a_first) {
      ta = time_ns(a, iterations);
      tb = time_ns(b, iterations);
      tb += time_ns(b, iterations);
      ta += time_ns(a, iterations);
    } else {
      tb = time_ns(b, iterations);
      ta = time_ns(a, iterations);
      ta += time_ns(a, iterations);
      tb += time_ns(b, iterations);
    }
    round_a.push(ta / (2 * iterations));
    round_b.push(tb / (2 * iterations));
  }

  // one sample per pair of rounds: the A-first round and the B-first round
  // that followed it, averaged per arm.
  const a_ns = [];
  const b_ns = [];
  const ratios = [];
  for (let r = 0; r < rounds; r += 2) {
    const ta = (round_a[r] + round_a[r + 1]) / 2;
    const tb = (round_b[r] + round_b[r + 1]) / 2;
    a_ns.push(ta);
    b_ns.push(tb);
    ratios.push(ta / tb);
  }

  const speedup = median(ratios);
  const [ci_lo, ci_hi] = bootstrap_ci(ratios, { seed });

  return {
    iterations,
    rounds,
    a: { median_ns: median(a_ns), min_ns: Math.min(...a_ns), samples: a_ns },
    b: { median_ns: median(b_ns), min_ns: Math.min(...b_ns), samples: b_ns },
    speedup,
    // ratio of the best observation from each arm. the minimum is the
    // reading least polluted by interference, so a large disagreement
    // between `speedup` and `best_speedup` means the run was noisy.
    best_speedup: Math.min(...a_ns) / Math.min(...b_ns),
    ci: [ci_lo, ci_hi],
    p10: percentile(ratios, 0.1),
    p90: percentile(ratios, 0.9),
    // an interval that contains 1.0 is consistent with "no difference".
    significant: Number.isFinite(ci_lo) && (ci_lo > 1 || ci_hi < 1),
  };
}

/**
 * Run a whole workload set. `pair(id)` returns `{a, b}` callables.
 *
 * Reports progress through `on_progress` so a long run is not a silent wait.
 */
export function compare_all(ids, pair, options = {}) {
  const { on_progress = null } = options;
  const results = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const { a, b } = pair(id);
    const r = compare_one(a, b, options);
    results.push({ id, ...r });
    on_progress?.(i + 1, ids.length, id, r);
  }
  return results;
}

/** Geometric mean of speedups. The right average for ratios. */
export function geomean(values) {
  const usable = values.filter((v) => Number.isFinite(v) && v > 0);
  if (usable.length === 0) return NaN;
  return Math.exp(usable.reduce((acc, v) => acc + Math.log(v), 0) / usable.length);
}

export { median, percentile, bootstrap_ci };
