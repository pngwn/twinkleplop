#!/usr/bin/env node
// paired A/B benchmark CLI.
//
//   node --expose-gc lib/bench/perf/bin/ab.mjs [options]
//
// options:
//   --baseline <root>    reference checkout   (default: .perf/baseline)
//   --candidate <root>   checkout under test  (default: this repo root)
//   --suite <name>       quick | core | full | scale   (default: core)
//   --languages a,b,c    restrict to these languages
//   --families a,b       restrict to these corpus families
//   --modes a,b          restrict to these modes
//   --rounds <n>         paired rounds per workload (default 15)
//   --repeat <n>         independent full passes (default 1; use 2+ for a
//                        claim). a workload only counts as moved if every
//                        pass agrees on the direction, and the reported
//                        effect is the weakest pass.
//   --target-ms <n>      wall time per measurement (default 20)
//   --rewarm-ms <n>      untimed run per arm after each round's gc() (default 20)
//   --noise-floor <pct>  override the calibrated floor, e.g. 1.5
//   --label <text>       recorded in the report
//   --out <path>         write the JSON report here
//   --no-lock            skip the machine lock (only for a solo machine)
//   --verbose            per-workload table (default: summary + outliers)
//
// exit code is 1 if any workload regressed beyond the noise floor.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { compare_all, geomean } from "../ab.mjs";
import { anchor_drift, measure_anchor } from "../anchor.mjs";
import { assert_arms_comparable, load_arm } from "../arm.mjs";
import { CORPUS_HASH } from "../corpus.mjs";
import { acquire_bench_lock } from "../lock.mjs";
import { print_integrity, print_summary, print_table, verdict } from "../report.mjs";
import { baseline_dir, local_root, reference_stamp } from "../paths.mjs";
import { build_workloads } from "../workloads.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const perf_dir = resolve(here, "..");
const repo_root = local_root;

const argv = process.argv.slice(2);
const opt = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);
const list = (name) => {
  const v = opt(name);
  return v
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;
};

const baseline_root = resolve(opt("baseline", baseline_dir));
const candidate_root = resolve(opt("candidate", repo_root));
const suite = opt("suite", "core");
const rounds = Number(opt("rounds", "15"));
const repeat = Math.max(1, Number(opt("repeat", "1")));
const target_ms = Number(opt("target-ms", "20"));
const rewarm_ms = Number(opt("rewarm-ms", "20"));
const label = opt("label", "candidate");
const verbose = has("verbose");

// the harness must be identical between agents for their reports to be
// comparable, so its own content is hashed into every report.
function harness_hash() {
  const files = [
    "ab.mjs",
    "anchor.mjs",
    "arm.mjs",
    "corpus.mjs",
    "lock.mjs",
    "report.mjs",
    "workloads.mjs",
    "bin/ab.mjs",
  ];
  const h = createHash("sha256");
  for (const f of files) h.update(readFileSync(join(perf_dir, f)));
  return h.digest("hex").slice(0, 16);
}

function read_noise_floor() {
  const override = opt("noise-floor");
  if (override !== null) {
    return { value: Number(override) / 100, source: "--noise-floor override" };
  }
  const path = join(perf_dir, "calibration.json");
  if (existsSync(path)) {
    const cal = JSON.parse(readFileSync(path, "utf8"));
    return { value: cal.noise_floor, source: `from calibration.json (${cal.measured_at})` };
  }
  return { value: 0.02, source: "DEFAULT - run bin/calibrate.mjs to measure the real floor" };
}

async function main() {
  const release = has("no-lock") ? () => {} : await acquire_bench_lock({ label: `ab:${label}` });

  try {
    const [base, cand] = await Promise.all([
      load_arm(baseline_root, "baseline"),
      load_arm(candidate_root, label),
    ]);

    const problems = assert_arms_comparable(base, cand);
    if (problems.length > 0) {
      console.error("\narms are not comparable:\n");
      for (const p of problems) console.error(`  ${p}`);
      console.error(
        "\na candidate that drops an export is not a faster build of the same library.\n" +
          "restore the surface or explain the removal before benchmarking.\n",
      );
      process.exitCode = 2;
      return;
    }

    const filter = {};
    if (list("languages")) filter.languages = list("languages");
    if (list("families")) filter.families = list("families");
    if (list("modes")) filter.modes = list("modes");

    const base_built = build_workloads(base, suite, filter);
    const cand_built = build_workloads(cand, suite, filter);

    const base_ids = new Map(base_built.workloads.map((w) => [w.id, w]));
    const cand_ids = new Map(cand_built.workloads.map((w) => [w.id, w]));
    const shared = [...base_ids.keys()].filter((id) => cand_ids.has(id));
    const only_base = [...base_ids.keys()].filter((id) => !cand_ids.has(id));

    if (only_base.length > 0) {
      console.error(`\nworkloads present on baseline but not on ${label}:`);
      for (const id of only_base) console.error(`  ${id}`);
      console.error("refusing to report a partial comparison.\n");
      process.exitCode = 2;
      return;
    }
    if (shared.length === 0) {
      console.error("no workloads matched the filters");
      process.exitCode = 2;
      return;
    }

    const { value: noise_floor, source: noise_floor_source } = read_noise_floor();

    console.error(
      `suite=${suite} workloads=${shared.length} rounds=${rounds} target=${target_ms}ms ` +
        `rewarm=${rewarm_ms}ms noise_floor=${(noise_floor * 100).toFixed(1)}%`,
    );

    const anchor_start = measure_anchor();
    const t0 = Date.now();

    // independent passes. the A/A calibration shows the bootstrap CI alone
    // flags roughly one workload in eight as "significant" when nothing
    // changed, because consecutive rounds are not independent - slow machine
    // drift correlates them. a second pass, separated by the whole suite, is
    // not correlated with the first, so requiring agreement between passes
    // collapses that false positive rate.
    const passes = [];
    for (let pass = 0; pass < repeat; pass++) {
      passes.push(
        compare_all(shared, (id) => ({ a: base_ids.get(id).run, b: cand_ids.get(id).run }), {
          rounds,
          target_ms,
          rewarm_ms,
          seed: 0x5eed + pass,
          on_progress: (i, n, id) => {
            if (process.stderr.isTTY) {
              const tag = repeat > 1 ? `pass ${pass + 1}/${repeat} ` : "";
              process.stderr.write(`\r  ${tag}[${String(i).padStart(3)}/${n}] ${id.padEnd(46)}`);
            }
          },
        }),
      );
    }
    if (process.stderr.isTTY) process.stderr.write("\r".padEnd(72) + "\r");

    const results = passes[0].map((first, i) => {
      const per_pass = passes.map((p) => p[i]);
      const speedups = per_pass.map((p) => p.speedup);
      const w = base_ids.get(first.id);
      // conservative effect: the pass that saw the least movement. a change
      // that only shows up in one pass is reported at its weakest reading,
      // which is the honest summary of "we saw it once".
      const conservative = speedups.reduce(
        (acc, s) => (Math.abs(s - 1) < Math.abs(acc - 1) ? s : acc),
        speedups[0],
      );
      const replicated =
        speedups.every((s) => s > 1) || speedups.every((s) => s < 1) || speedups.length === 1;
      return {
        ...first,
        family: w.family,
        lang: w.lang,
        mode: w.mode,
        bytes: w.bytes,
        // the headline number is the conservative one whenever we repeated.
        speedup: repeat > 1 ? conservative : first.speedup,
        raw_speedup: first.speedup,
        pass_speedups: speedups,
        replicated,
        significant: per_pass.every((p) => p.significant),
      };
    });

    const anchor_end = measure_anchor();
    const anchor = anchor_drift(anchor_start, anchor_end);

    const meta = {
      label,
      suite,
      rounds,
      repeat,
      target_ms,
      rewarm_ms,
      corpus_hash: CORPUS_HASH,
      harness_hash: harness_hash(),
      noise_floor,
      noise_floor_source,
      anchor,
      node: process.version,
      exposed_gc: typeof globalThis.gc === "function",
      duration_s: Math.round((Date.now() - t0) / 100) / 10,
      baseline: { label: "baseline", root: baseline_root, ...read_reference_stamp() },
      candidate: { label, root: candidate_root },
      skipped: [...new Set([...base_built.skipped, ...cand_built.skipped])],
    };

    if (verbose) {
      print_table(results, { noise_floor });
    } else {
      const notable = results.filter((r) => verdict(r, noise_floor) !== "noise");
      if (notable.length > 0) {
        console.log("\nmoved beyond the noise floor:");
        print_table(notable, { noise_floor });
      } else {
        console.log("\nno workload moved beyond the noise floor.");
      }
    }

    print_summary(results, { noise_floor });
    print_integrity(meta, { noise_floor });

    const out_path = resolve(
      opt(
        "out",
        join(
          perf_dir,
          "reports",
          `${new Date().toISOString().replace(/[:.]/g, "-")}-${label}.json`,
        ),
      ),
    );
    mkdirSync(dirname(out_path), { recursive: true });
    writeFileSync(out_path, `${JSON.stringify({ meta, results }, null, 2)}\n`);
    console.log(`\nreport: ${out_path}`);

    const regressions = results.filter((r) => verdict(r, noise_floor) === "slower");
    if (regressions.length > 0) process.exitCode = 1;
  } finally {
    release();
  }
}

// REFERENCE.json describes what bin/setup-baseline.mjs built into
// .perf/baseline. it says nothing about a baseline supplied with --baseline,
// and attaching it to one would put the wrong commit sha in the report - and
// from there into a pull request comment claiming a comparison that was not
// run. so it is read only when the baseline really is the one it describes.
function read_reference_stamp() {
  if (baseline_root !== resolve(baseline_dir)) return {};
  const path = reference_stamp;
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}

await main();
