#!/usr/bin/env node
// measure the harness's own noise floor.
//
//   node --expose-gc lib/bench/perf/bin/calibrate.mjs
//
// runs the full A/B protocol with two INDEPENDENT builds of the SAME commit
// (.perf/baseline vs .perf/baseline-mirror). the true answer is 1.00 on every
// workload. whatever spread comes back is what this machine, this harness and
// this node build produce when nothing changed, and it is the threshold below
// which a later result means nothing.
//
// this is not optional ceremony. a 3% "win" reported by a harness whose A/A
// spread is 4% is a coin flip that landed heads. running calibration on the
// same machine, under the same lock, in the same conditions as the real runs
// is what makes the later verdicts falsifiable.
//
// writes calibration.json, which bin/ab.mjs reads for its default threshold.

import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { compare_all, geomean, percentile } from "../ab.mjs";
import { anchor_drift, measure_anchor } from "../anchor.mjs";
import { load_arm } from "../arm.mjs";
import { CORPUS_HASH } from "../corpus.mjs";
import { acquire_bench_lock } from "../lock.mjs";
import { fmt_pct, print_table } from "../report.mjs";
import { baseline_dir, mirror_dir } from "../paths.mjs";
import { build_workloads } from "../workloads.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const perf_dir = resolve(here, "..");

const argv = process.argv.slice(2);
const opt = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

const a_root = resolve(opt("a", baseline_dir));
const b_root = resolve(opt("b", mirror_dir));
const suite = opt("suite", "core");
// a sample is a pair of rounds, so the engine rounds an odd count up; do the
// same here so the count reported matches the count run.
const rounds = Number(opt("rounds", "9")) + (Number(opt("rounds", "9")) % 2);
const target_ms = Number(opt("target-ms", "20"));
const rewarm_ms = Number(opt("rewarm-ms", "20"));

if (a_root === b_root) {
  console.error(
    "calibration needs two SEPARATE checkouts of the same commit.\n" +
      "loading one path twice returns the same module objects from node's cache,\n" +
      "which measures the timing loop but not the two-module-graph effect that a\n" +
      "real A/B has. run bin/setup-baseline.mjs to create both.",
  );
  process.exit(2);
}

const release = await acquire_bench_lock({ label: "calibrate" });

try {
  const [a, b] = await Promise.all([load_arm(a_root, "baseline"), load_arm(b_root, "mirror")]);

  const a_built = build_workloads(a, suite);
  const b_built = build_workloads(b, suite);
  const a_ids = new Map(a_built.workloads.map((w) => [w.id, w]));
  const b_ids = new Map(b_built.workloads.map((w) => [w.id, w]));
  const shared = [...a_ids.keys()].filter((id) => b_ids.has(id));

  console.error(`A/A calibration: ${shared.length} workloads, ${rounds} rounds each`);

  const anchor_start = measure_anchor();
  const raw_results = compare_all(
    shared,
    (id) => ({ a: a_ids.get(id).run, b: b_ids.get(id).run }),
    {
      rounds,
      target_ms,
      rewarm_ms,
      on_progress: (i, n, id) => {
        if (process.stderr.isTTY)
          process.stderr.write(`\r  [${String(i).padStart(3)}/${n}] ${id.padEnd(46)}`);
      },
    },
  );
  if (process.stderr.isTTY) process.stderr.write("\r".padEnd(60) + "\r");
  const results = raw_results.map((r) => {
    const w = a_ids.get(r.id);
    return { ...r, family: w.family, lang: w.lang, mode: w.mode, bytes: w.bytes };
  });
  const anchor = anchor_drift(anchor_start, measure_anchor());

  const deviations = results.map((r) => Math.abs(r.speedup - 1));
  const p50 = percentile(deviations, 0.5);
  const p95 = percentile(deviations, 0.95);
  const worst = Math.max(...deviations);
  const false_positives = results.filter((r) => r.significant);

  // the floor is the 95th percentile of the A/A deviation, with a small
  // margin and a 1% lower bound. below that, this harness cannot tell a real
  // change from itself.
  const noise_floor = Math.max(0.01, Math.round(p95 * 1.25 * 1000) / 1000);

  console.log("\nA/A deviation from 1.00 (identical source, independent builds)");
  console.log(`  median            ${fmt_pct(1 + p50)}`);
  console.log(`  p95               ${fmt_pct(1 + p95)}`);
  console.log(`  worst             ${fmt_pct(1 + worst)}`);
  console.log(
    `  geomean speedup   ${fmt_pct(geomean(results.map((r) => r.speedup)))}   (should be ~0.0%)`,
  );
  console.log(
    `  CI excluded 1.0   ${false_positives.length}/${results.length}  ` +
      `(each one is a false positive this harness would have reported)`,
  );
  console.log(
    `  anchor drift      ${fmt_pct(1 + anchor.drift)}${anchor.stable ? "" : "  UNSTABLE"}`,
  );

  const noisiest = [...results]
    .sort((x, y) => Math.abs(y.speedup - 1) - Math.abs(x.speedup - 1))
    .slice(0, 12);
  console.log("\nnoisiest workloads (treat results on these with extra suspicion)");
  print_table(noisiest, { noise_floor });

  console.log(`\nnoise floor => ${(noise_floor * 100).toFixed(1)}%`);
  console.log("a later A/B delta smaller than this is not evidence of anything.");

  const out = {
    measured_at: new Date().toISOString(),
    noise_floor,
    suite,
    rounds,
    target_ms,
    rewarm_ms,
    corpus_hash: CORPUS_HASH,
    node: process.version,
    exposed_gc: typeof globalThis.gc === "function",
    anchor,
    stats: { p50, p95, worst, false_positives: false_positives.length, n: results.length },
    per_workload: Object.fromEntries(results.map((r) => [r.id, r.speedup])),
  };
  const out_path = join(perf_dir, "calibration.json");
  writeFileSync(out_path, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`\nwrote ${out_path}`);
} finally {
  release();
}
