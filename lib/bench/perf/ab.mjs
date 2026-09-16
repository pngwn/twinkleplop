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
// ABBA ORDER ALTERNATION. within a round the arm measured first pays for
// whatever cache state the previous round left behind. alternating the order
// every round means each arm goes first half the time, so a systematic
// first-mover penalty cancels instead of accruing to one side.
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
// MINOR GC, RE-WARM, MINOR GC. no round forces a full GC. a full GC at a
// quiescent point evicts optimised code that only a per-call closure was
// keeping alive (the feedback vector's reference is weak) and invalidates
// code that embedded a map only dead objects had; both arms then re-tier
// inside their windows, racing on the concurrent compiler. an A/A cancels
// that, which is how it went unnoticed; an A/B whose two arms differ in
// closure structure does not, and reported the difference as a speedup. a
// minor GC per round keeps the nursery deterministic without touching code.
// both arms then run untimed for `rewarm_ms`, idle work in most rounds and
// the repair in the one where a natural full GC did land between rounds; a
// second minor GC empties the nursery the re-warm filled, so the scavenge it
// would otherwise force does not land inside one window at random; and only
// then are the two windows timed, back to back, because the paired ratio
// depends on them being adjacent.

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

// a scavenge only; a full gc() here would evict optimised code (see above).
// node's gc() takes the options object since v8 9.x; on an older runtime
// this would silently be a full GC.
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
  const { rounds = 9, target_ms = 20, warmup_ms = 120, rewarm_ms = 20, seed = 0x5eed } = options;

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

  const a_ns = [];
  const b_ns = [];
  const ratios = [];

  for (let r = 0; r < rounds; r++) {
    collect_gc_minor();
    // the arm timed second re-warms second, so it is the more recently run
    // of the two when its window starts.
    let ta;
    let tb;
    if (r % 2 === 0) {
      rewarm(b, cb.per_op_ns, rewarm_ms);
      rewarm(a, ca.per_op_ns, rewarm_ms);
      collect_gc_minor();
      ta = time_ns(a, iterations) / iterations;
      tb = time_ns(b, iterations) / iterations;
    } else {
      rewarm(a, ca.per_op_ns, rewarm_ms);
      rewarm(b, cb.per_op_ns, rewarm_ms);
      collect_gc_minor();
      tb = time_ns(b, iterations) / iterations;
      ta = time_ns(a, iterations) / iterations;
    }
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
