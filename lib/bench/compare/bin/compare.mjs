#!/usr/bin/env node
// cross-library comparison run. produces the JSON the website's charts read.
//
//   node lib/bench/compare/bin/compare.mjs [options]
//
// options:
//   --arm <root>          built twinkleplop checkout (default: this repo)
//   --libraries a,b,c     default: twinkleplop,shiki-wasm,shiki-js,prism,sugar-high
//   --families a,b        corpus families (default: sized,upstream)
//   --languages a,b       restrict to these languages
//   --modes a,b           tokenize,html (default: both)
//   --rounds <n>          interleaved rounds per cell (default 7)
//   --warmup-ms <n>       warmup per arm before recording (default 100)
//   --rewarm-ms <n>       untimed run per arm after each round's gc() (default 20)
//   --target-ms <n>       wall time per measurement (default 20)
//   --out <path>          default: lib/bench/results/comparison.json
//   --no-lock             skip the machine lock (only for a solo machine)
//
// two corpus families: `sized` answers "does the advantage hold as the input
// grows", `upstream` answers "did you pick the files" - which is the question
// any vendor-published benchmark has to survive.
//
// FRESH PROCESS PER CELL. each (file, mode) is measured by ../cell.mjs in a
// child process that loads the libraries, probes, warms, measures and exits.
// measured back to back in one process, the same build read 4141 ops/s on
// `typescript.small` tokenize after a hundred-odd cells and 5387 fresh, and
// prism moved the other way: what an earlier cell did to the heap, the inline
// caches and the compiler's view of each function was following into the
// next, and the published number for a cell depended on the run it sat in.
// the arms WITHIN a cell still share one process and are interleaved - that
// is what makes them comparable to each other. costs one library load per
// cell, a few seconds each with shiki's grammars.

import { execFileSync, spawnSync } from "node:child_process";
import { cpus, totalmem } from "node:os";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { anchor_drift, measure_anchor } from "../../perf/anchor.mjs";
import { corpus, CORPUS_HASH } from "../../perf/corpus.mjs";
import { acquire_bench_lock } from "../../perf/lock.mjs";
import { local_root } from "../../perf/paths.mjs";
import { DEFAULT_LIBRARIES } from "../libraries.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const bench_root = resolve(here, "../..");
const cell_script = join(here, "../cell.mjs");

const argv = process.argv.slice(2);
const opt = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);
const list = (name, fallback) => {
  const v = opt(name);
  return v
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : fallback;
};

const arm_root = resolve(opt("arm", local_root));
const library_ids = list("libraries", DEFAULT_LIBRARIES);
const families = list("families", ["sized", "upstream"]);
const languages = list("languages", null);
const modes = list("modes", ["tokenize", "html"]);
const rounds = Number(opt("rounds", "7"));
const warmup_ms = Number(opt("warmup-ms", "100"));
const rewarm_ms = Number(opt("rewarm-ms", "20"));
const target_ms = Number(opt("target-ms", "20"));
const out_path = resolve(opt("out", join(bench_root, "results/comparison.json")));

// the sized family encodes its tier in the filename (`go.medium.go`).
function split_stem(family, stem) {
  if (family !== "sized") return { tier: null };
  const parts = stem.split(".");
  return { tier: parts.length > 1 ? parts[parts.length - 1] : null };
}

function git(args, fallback = null) {
  try {
    return execFileSync("git", args, { cwd: local_root, encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

function upstream_stamp() {
  const path = join(bench_root, "perf/corpus/upstream/UPSTREAM.json");
  if (!existsSync(path)) return null;
  const { repo, commit, license, fetched_at } = JSON.parse(readFileSync(path, "utf8"));
  return { repo, commit, license, fetched_at };
}

// one cell in a child process (see the header). a child that fails is a hard
// error, like a library that fails to load: a chart quietly missing a cell is
// worse than no chart.
function run_cell(spec) {
  const r = spawnSync(process.execPath, ["--expose-gc", cell_script, JSON.stringify(spec)], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) {
    throw new Error(
      `cell ${spec.family}/${spec.file}:${spec.mode} failed (exit ${r.status}):\n${r.stderr}`,
    );
  }
  return JSON.parse(r.stdout.trim().split("\n").pop());
}

async function main() {
  const release = has("no-lock") ? () => {} : await acquire_bench_lock({ label: "compare" });

  try {
    const entries = corpus({ families, languages });
    if (entries.length === 0) {
      console.error("no corpus entries matched the filters");
      process.exitCode = 2;
      return;
    }

    console.error(
      `libraries=${library_ids.join(",")} cells=${entries.length * modes.length} ` +
        `rounds=${rounds} target=${target_ms}ms`,
    );

    const anchor_start = measure_anchor();
    const t0 = Date.now();
    const results = [];
    const excluded = [];
    let library_meta = null;
    let done = 0;

    for (const entry of entries) {
      const { tier } = split_stem(entry.family, entry.stem);

      for (const mode of modes) {
        done++;
        if (process.stderr.isTTY) {
          process.stderr.write(
            `\r  [${String(done).padStart(3)}/${entries.length * modes.length}] ` +
              `${`${entry.id}:${mode}`.padEnd(40)}`,
          );
        }

        const cell = run_cell({
          arm_root,
          library_ids,
          family: entry.family,
          lang: entry.lang,
          file: entry.file,
          mode,
          rounds,
          target_ms,
          warmup_ms,
          rewarm_ms,
        });
        library_meta ??= cell.library_meta;
        excluded.push(...cell.excluded);
        if (cell.libraries.length === 0) continue;

        results.push({
          corpus: entry.family,
          lang: entry.lang,
          tier,
          file: entry.file,
          bytes: entry.bytes,
          lines: entry.lines,
          mode,
          // the caveat on every bar: a library emitting half as many tokens
          // is doing less work per byte, not the same work faster.
          tokens: cell.tokens,
          libraries: cell.libraries.map((m) => ({
            ...m,
            mb_per_sec: entry.bytes / 1e6 / (m.ns_per_op / 1e9),
          })),
        });
      }
    }
    if (process.stderr.isTTY) process.stderr.write("\r".padEnd(72) + "\r");

    const anchor = anchor_drift(anchor_start, measure_anchor());

    const payload = {
      meta: {
        generated_at: new Date().toISOString(),
        commit: git(["rev-parse", "HEAD"]),
        commit_subject: git(["log", "-1", "--format=%s"]),
        branch: git(["rev-parse", "--abbrev-ref", "HEAD"]),
        node: process.version,
        platform: `${process.platform} ${process.arch}`,
        cpu: cpus()[0]?.model ?? "unknown",
        cpu_count: cpus().length,
        memory_gb: Math.round(totalmem() / 1024 ** 3),
        runner: process.env.RUNNER_LABEL ?? process.env.RUNNER_NAME ?? "local",
        corpus_hash: CORPUS_HASH,
        upstream: upstream_stamp(),
        rounds,
        target_ms,
        warmup_ms,
        rewarm_ms,
        // every cell runs in its own child, always with --expose-gc.
        isolation: "process per cell",
        exposed_gc: true,
        duration_s: Math.round((Date.now() - t0) / 100) / 10,
        // fixed workload measured at both ends. drift means the machine
        // changed state mid-run and these absolute numbers do not travel.
        anchor,
        libraries: library_meta ?? [],
        excluded,
      },
      results,
    };

    mkdirSync(dirname(out_path), { recursive: true });
    writeFileSync(out_path, `${JSON.stringify(payload, null, 2)}\n`);

    console.log(`\n${results.length} cells measured in ${payload.meta.duration_s}s`);
    console.log(`anchor drift ${(anchor.drift * 100).toFixed(1)}%`);
    if (excluded.length > 0) console.log(`${excluded.length} library-cells excluded`);
    console.log(`report: ${out_path}`);
  } finally {
    release();
  }
}

await main();
