// absolute, cross-library measurement.
//
// the perf harness next door measures ONE library against ITSELF at two
// commits, and can therefore report a ratio and throw the absolute numbers
// away. this file has the harder job: several different libraries, absolute
// numbers, published on a website. so the things it borrows from the A/B
// engine are the ones that make numbers survive a shared machine, and the
// things it does differently are forced by the different question.
//
// SAME PROCESS, INTERLEAVED. every library in a cell is measured in the same
// process, alternating within a round. a run takes minutes; CPU frequency,
// thermal state and background load all drift over that. measuring shiki now
// and prism in four minutes' time compares two machines. interleaving makes
// the drift common-mode, which is the only reason a bar chart built from
// these numbers means anything.
//
// ROTATING ORDER. the arm measured first in a round pays for whatever cache
// state the previous round left. rotating the starting position by one each
// round spreads that penalty evenly instead of charging it to whichever
// library happens to be listed first.
//
// PER-ARM ITERATION COUNTS. the A/B engine deliberately uses one shared
// iteration count for both arms, because there it is comparing two builds of
// the same code that differ by a few percent. here the spread between the
// fastest and slowest library is often two orders of magnitude, and a count
// calibrated off the slowest would give the fastest four iterations per
// measurement - one GC pause would land on a quarter of it. so each library
// gets its own count, targeting the same wall time.
//
// WHAT THIS CANNOT DO. the numbers are comparable WITHIN a cell, because
// that is what interleaving buys. comparing a number here against a number
// from a different run, machine or node version is the thing the A/B harness
// exists to stop you doing, and it is no more valid here.

import { bootstrap_ci, median, percentile } from "../perf/ab.mjs";

const NS_PER_MS = 1e6;

// a measurement of one or two iterations is fragile: a single GC pause or
// scheduler interrupt lands on half of it. so measurements are padded up to
// MIN_ITERATIONS even when one call already exceeds the time target.
//
// that floor is unaffordable at the top of the size ladder, though. one
// library highlighting 100KB can take a few hundred milliseconds, and four of
// those per round across five libraries, three tiers and eighteen languages is
// most of an hour of CI. MAX_MEASUREMENT_MS caps how far the floor is allowed
// to push a single measurement: past it, the iteration count drops back
// towards one.
//
// giving that up costs less than it looks. the floor protects SHORT workloads,
// where a 2ms pause is a large fraction of a 20ms measurement. a call that
// already runs for 200ms has averaged over far more work than any single pause
// contributes, and the median across rounds absorbs the rest.
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

  // warm everything before anything is recorded. an unwarmed arm measures
  // V8's optimiser rather than the library, and the penalty is not equal
  // between libraries - the one with the biggest module graph loses most.
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
      // a cell whose fastest and slowest readings differ by a lot was
      // measured on a machine that was doing something else at the time.
      // published alongside the number so a reader can discount it rather
      // than having to trust that the run was quiet.
      spread: Math.max(...ns) / Math.min(...ns),
      iterations: iterations[i],
      rounds,
    };
  });
}
