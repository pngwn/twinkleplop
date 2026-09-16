// absolute, cross-library measurement.
//
// the A/B harness next door measures one library against itself and can throw
// the absolute numbers away. this has the harder job: several libraries,
// absolute numbers, published on a website. what it borrows and what it does
// differently both follow from that.
//
// SAME PROCESS, INTERLEAVED, ROTATING ORDER. a run takes minutes and the
// machine drifts over that, so measuring shiki now and prism in four minutes
// compares two machines. interleaving makes the drift common-mode. the
// starting position rotates each round so no library eats the first-mover
// cache penalty every time.
//
// PER-ARM ITERATION COUNTS, unlike the A/B engine's single shared count. the
// spread here is often two orders of magnitude, and a count calibrated off
// the slowest library would give the fastest four iterations per measurement.
//
// numbers are comparable WITHIN a cell and nowhere else. that is what
// interleaving buys, and it buys nothing across runs or machines.

import { bootstrap_ci, median, percentile } from "../perf/ab.mjs";

const NS_PER_MS = 1e6;

// short measurements are fragile - one GC pause lands on half of a two
// iteration sample - so they are padded up to MIN_ITERATIONS. that floor is
// unaffordable at 100KB, where one call takes a few hundred ms, so
// MAX_MEASUREMENT_MS caps how far it may push a single measurement. the floor
// protects short workloads; a call already running for 200ms has averaged
// over far more work than any one pause contributes.
const MIN_ITERATIONS = 4;
const MAX_MEASUREMENT_MS = 150;

function time_ns(fn, iterations) {
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) fn();
  return Number(process.hrtime.bigint() - t0);
}

function calibrate(fn, target_ms) {
  let iterations = 1;
  for (let attempt = 0; attempt < 32; attempt++) {
    const ns = time_ns(fn, iterations);
    if (ns > 2 * NS_PER_MS) {
      const per_op_ns = ns / iterations;
      const scaled = Math.max(1, Math.round((target_ms * NS_PER_MS) / per_op_ns));
      const affordable_floor = Math.max(
        1,
        Math.min(MIN_ITERATIONS, Math.floor((MAX_MEASUREMENT_MS * NS_PER_MS) / per_op_ns)),
      );
      return Math.min(Math.max(scaled, affordable_floor), 20_000_000);
    }
    iterations *= 4;
  }
  return Math.max(iterations, MIN_ITERATIONS);
}

function collect_gc() {
  if (typeof globalThis.gc === "function") globalThis.gc();
}

/**
 * Measure several named callables against the same input.
 *
 * `arms` is `[{ id, run }]`. Returns one row per arm with the median
 * nanoseconds per operation and a bootstrap interval around it.
 */
export function measure_cell(arms, { rounds = 9, target_ms = 20, warmup_ms = 100 } = {}) {
  if (arms.length === 0) return [];

  // an unwarmed arm measures V8's optimiser, and not equally: the library
  // with the biggest module graph loses most.
  for (const arm of arms) {
    const deadline = process.hrtime.bigint() + BigInt(warmup_ms * NS_PER_MS);
    let n = 0;
    do {
      arm.run();
      n++;
    } while (process.hrtime.bigint() < deadline && n < 5_000_000);
  }

  const iterations = arms.map((arm) => calibrate(arm.run, target_ms));
  const samples = arms.map(() => []);

  for (let r = 0; r < rounds; r++) {
    collect_gc();
    for (let k = 0; k < arms.length; k++) {
      const i = (k + r) % arms.length;
      samples[i].push(time_ns(arms[i].run, iterations[i]) / iterations[i]);
    }
  }

  return arms.map((arm, i) => {
    const ns = samples[i];
    const mid = median(ns);
    const [ci_lo, ci_hi] = bootstrap_ci(ns);
    return {
      id: arm.id,
      ns_per_op: mid,
      ops_per_sec: 1e9 / mid,
      min_ns: Math.min(...ns),
      p10_ns: percentile(ns, 0.1),
      p90_ns: percentile(ns, 0.9),
      ci_ns: [ci_lo, ci_hi],
      // published so a reader can tell whether this cell in particular was
      // measured on a quiet machine.
      spread: Math.max(...ns) / Math.min(...ns),
      iterations: iterations[i],
      rounds,
    };
  });
}
