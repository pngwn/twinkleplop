#!/usr/bin/env node
// cross-library comparison run. produces the JSON the website's charts read.
//
//   node --expose-gc lib/bench/compare/bin/compare.mjs [options]
//
// options:
//   --arm <root>          built twinkleplop checkout (default: this repo)
//   --libraries a,b,c     default: twinkleplop,shiki-wasm,shiki-js,prism,sugar-high
//   --families a,b        corpus families (default: sized,upstream)
//   --languages a,b       restrict to these languages
//   --modes a,b           tokenize,html (default: both)
//   --rounds <n>          interleaved rounds per cell (default 7)
//   --target-ms <n>       wall time per measurement (default 20)
//   --out <path>          default: lib/bench/results/comparison.json
//   --no-lock             skip the machine lock (only for a solo machine)
//
// two corpus families, answering two different objections:
//
//   sized/     our corpus, every language at ~1KB / ~10KB / ~100KB. answers
//              "does the advantage hold as the input grows", which is the
//              question a reader of a highlighter benchmark actually has.
//   upstream/  shiki's own benchmark inputs, vendored and pinned. answers
//              "did you pick the files", which is the question a reader of
//              a VENDOR-PUBLISHED highlighter benchmark should have.

import { execFileSync } from "node:child_process";
import { cpus, totalmem } from "node:os";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { anchor_drift, measure_anchor } from "../../perf/anchor.mjs";
import { load_arm } from "../../perf/arm.mjs";
import { corpus, CORPUS_HASH } from "../../perf/corpus.mjs";
import { acquire_bench_lock } from "../../perf/lock.mjs";
import { local_root } from "../../perf/paths.mjs";
import { DEFAULT_LIBRARIES, load_libraries } from "../libraries.mjs";
import { measure_cell } from "../measure.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const bench_root = resolve(here, "../..");

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
const target_ms = Number(opt("target-ms", "20"));
const out_path = resolve(opt("out", join(bench_root, "results/comparison.json")));

// the sized family encodes its tier in the filename (`go.medium.go`); the
// upstream family has no tiers. keeping the tier out of the language name
// matters because the charts group by language and facet by tier.
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

async function main() {
  const release = has("no-lock") ? () => {} : await acquire_bench_lock({ label: "compare" });

  try {
    const arm = await load_arm(arm_root, "twinkleplop");
    const libraries = await load_libraries(library_ids, { arm });

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
    let done = 0;

    for (const entry of entries) {
      const { tier } = split_stem(entry.family, entry.stem);
      const src = entry.source;

      for (const mode of modes) {
        const arms = [];
        const token_counts = {};

        for (const lib of libraries) {
          if (!lib.supports(entry.lang)) continue;

          // bind once, outside the timed loop, so per-call cost is measured
          // rather than per-configuration setup. twinkleplop is the only one
          // here with a bind step, and charging it for that on every
          // iteration would be measuring something no consumer pays.
          const bound = lib.bind ? lib.bind(entry.lang) : null;
          const run = bound ? () => bound[mode](src) : () => lib[mode](src, entry.lang);

          // a library that silently falls back to escaped plaintext for an
          // unknown language produces a spectacular, meaningless number.
          // probe once and drop the cell if the output is empty rather than
          // publishing it.
          let probe;
          try {
            probe = run();
          } catch (err) {
            excluded.push({
              cell: `${entry.id}:${mode}`,
              library: lib.id,
              reason: `threw: ${err.message}`,
            });
            continue;
          }
          const tokens = mode === "tokenize" ? lib.count_tokens(probe) : null;
          if (mode === "tokenize" && !(tokens > 0)) {
            excluded.push({
              cell: `${entry.id}:${mode}`,
              library: lib.id,
              reason: "produced no tokens - refusing to publish a fallback path as a result",
            });
            continue;
          }
          if (mode === "html" && !(typeof probe === "string" && probe.length > 0)) {
            excluded.push({
              cell: `${entry.id}:${mode}`,
              library: lib.id,
              reason: "produced no HTML",
            });
            continue;
          }

          if (tokens !== null) token_counts[lib.id] = tokens;
          arms.push({ id: lib.id, run });
        }

        done++;
        if (process.stderr.isTTY) {
          process.stderr.write(
            `\r  [${String(done).padStart(3)}/${entries.length * modes.length}] ` +
              `${`${entry.id}:${mode}`.padEnd(40)}`,
          );
        }

        if (arms.length === 0) continue;

        const measured = measure_cell(arms, { rounds, target_ms });
        results.push({
          corpus: entry.family,
          lang: entry.lang,
          tier,
          file: entry.file,
          bytes: entry.bytes,
          lines: entry.lines,
          mode,
          // token counts are the honest caveat on any bar chart here: a
          // library emitting half as many tokens is doing less work per
          // byte, not the same work faster.
          tokens: mode === "tokenize" ? token_counts : null,
          libraries: measured.map((m) => ({
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
        exposed_gc: typeof globalThis.gc === "function",
        duration_s: Math.round((Date.now() - t0) / 100) / 10,
        // the anchor is a fixed workload nothing under test can change,
        // measured at both ends of the run. drift past a few percent means
        // the machine changed state mid-run and these absolute numbers are
        // not comparable to any other run's.
        anchor,
        libraries: libraries.map((l) => ({
          id: l.id,
          label: l.label,
          version: l.version,
          note: l.note,
        })),
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
