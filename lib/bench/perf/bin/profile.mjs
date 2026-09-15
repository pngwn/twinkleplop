#!/usr/bin/env node
// where the time goes, for a single arm.
//
//   node --expose-gc lib/bench/perf/bin/profile.mjs [--arm <root>] [--family real]
//
// not a comparison: an absolute breakdown of one build, so it is obvious
// which stage is worth attacking before anyone writes code. splits the
// consumer-visible cost into the three stages a change can target:
//
//   scan        core.tokenize            the grammar state machine
//   reclassify  pipeline minus scan      the language's plugin passes
//   render      html minus pipeline      to_html
//
// the subtraction is the honest way round: `pipeline` genuinely contains
// `scan`, and `html` genuinely contains `pipeline`, because that is how the
// entry points nest. a negative share means the difference was inside the
// measurement noise, and is printed as ~0.
//
// TWO CAVEATS for languages that embed other languages (svelte, html):
//
// 1. `scan` is the HOST grammar only. an embedded region is one host token
//    that the pipeline later replaces with a sub-tokenized stream, so the
//    sub-language's own SCANNING lands in the `reclass` column. for those
//    languages `reclass` means "everything after the host scan", not
//    "reclassifier work". the `expand` column shows how much this applies.
// 2. `ns/tok` therefore has to use the FINAL token count, not the host
//    count. dividing end-to-end time by host tokens overstated svelte by
//    8.9x in an earlier version of this tool.
//
// `ns/byte` is the lens that is comparable across all languages.

import { join, resolve } from "node:path";

import { corpus } from "../corpus.mjs";
import { load_arm } from "../arm.mjs";
import { acquire_bench_lock } from "../lock.mjs";
import { baseline_dir } from "../paths.mjs";
import { measure_anchor, anchor_drift } from "../anchor.mjs";
import { fmt_ns } from "../report.mjs";

const argv = process.argv.slice(2);
const opt = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

const arm_root = resolve(opt("arm", baseline_dir));
const family = opt("family", "real");
const target_ms = Number(opt("target-ms", "40"));

function measure(fn) {
  const warm_deadline = process.hrtime.bigint() + BigInt(100 * 1e6);
  let n = 0;
  do {
    fn();
    n++;
  } while (process.hrtime.bigint() < warm_deadline && n < 2_000_000);

  let iterations = 1;
  for (let a = 0; a < 32; a++) {
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) fn();
    const ns = Number(process.hrtime.bigint() - t0);
    if (ns > 2e6) {
      iterations = Math.max(4, Math.round((iterations * target_ms * 1e6) / ns));
      break;
    }
    iterations *= 4;
  }

  let best = Infinity;
  for (let r = 0; r < 7; r++) {
    globalThis.gc?.();
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) fn();
    const ns = Number(process.hrtime.bigint() - t0) / iterations;
    if (ns < best) best = ns;
  }
  return best;
}

const release = await acquire_bench_lock({ label: "profile" });
try {
  const arm = await load_arm(arm_root, "profile");
  const anchor_start = measure_anchor();

  const rows = [];
  for (const entry of corpus({ families: [family] })) {
    const mod = arm.languages[entry.lang];
    if (!mod?.grammar) continue;
    const src = entry.source;

    const scan_ns = measure(() => arm.core.tokenize(src, mod.grammar));
    const result = arm.core.tokenize(src, mod.grammar);
    const host_tokens = result.tokens.length / 3;
    let final_tokens = host_tokens;

    let pipeline_ns = null;
    let html_ns = null;
    if (typeof mod.tokenize === "function") {
      const fn = mod.tokenize();
      pipeline_ns = measure(() => fn(src));
      final_tokens = fn(src).tokens.length / 3;
    }
    if (typeof mod.language === "function") {
      const fn = mod.language();
      html_ns = measure(() => fn(src));
    }

    rows.push({
      id: entry.id,
      lang: entry.lang,
      bytes: entry.bytes,
      tokens: final_tokens,
      host_tokens,
      expand: final_tokens / host_tokens,
      scan_ns,
      reclassify_ns: pipeline_ns === null ? null : pipeline_ns - scan_ns,
      render_ns: html_ns === null || pipeline_ns === null ? null : html_ns - pipeline_ns,
      total_ns: html_ns ?? pipeline_ns ?? scan_ns,
    });
  }

  const anchor = anchor_drift(anchor_start, measure_anchor());

  const pct = (part, total) => {
    if (part === null || !Number.isFinite(part)) return "  -  ";
    const v = (Math.max(0, part) / total) * 100;
    return `${v.toFixed(0)}%`.padStart(5);
  };
  const mbps = (bytes, ns) => `${(bytes / 1e6 / (ns / 1e9)).toFixed(1)}`.padStart(7);

  console.log(`\nstage breakdown - family "${family}", arm ${arm_root}`);
  console.log(
    `${"workload".padEnd(28)}${"bytes".padStart(8)}${"tokens".padStart(8)}${"expand".padStart(8)}${"total".padStart(10)}` +
      `${"scan".padStart(7)}${"reclass".padStart(8)}${"render".padStart(8)}${"MB/s".padStart(8)}${"ns/tok".padStart(8)}${"ns/byte".padStart(9)}`,
  );
  console.log("-".repeat(105));
  for (const r of rows.sort((a, b) => b.total_ns - a.total_ns)) {
    console.log(
      r.id.padEnd(28) +
        String(r.bytes).padStart(8) +
        String(r.tokens).padStart(8) +
        `${r.expand.toFixed(2)}x`.padStart(8) +
        fmt_ns(r.total_ns).padStart(10) +
        pct(r.scan_ns, r.total_ns).padStart(7) +
        pct(r.reclassify_ns, r.total_ns).padStart(8) +
        pct(r.render_ns, r.total_ns).padStart(8) +
        mbps(r.bytes, r.scan_ns).padStart(8) +
        (r.total_ns / r.tokens).toFixed(0).padStart(8) +
        (r.total_ns / r.bytes).toFixed(1).padStart(9),
    );
  }

  const sum = (k) => rows.reduce((n, r) => n + Math.max(0, r[k] ?? 0), 0);
  const total = sum("total_ns");
  console.log("-".repeat(105));
  console.log(
    `${"TOTAL".padEnd(28)}${String(sum("bytes")).padStart(8)}${String(sum("tokens")).padStart(8)}` +
      `${(sum("tokens") / sum("host_tokens")).toFixed(2)}x`.padStart(8) +
      `${fmt_ns(total).padStart(10)}${pct(sum("scan_ns"), total).padStart(7)}` +
      `${pct(sum("reclassify_ns"), total).padStart(8)}${pct(sum("render_ns"), total).padStart(8)}` +
      `${mbps(sum("bytes"), sum("scan_ns")).padStart(8)}` +
      `${(total / sum("tokens")).toFixed(0).padStart(8)}${(total / sum("bytes")).toFixed(1).padStart(9)}`,
  );

  console.log(`\nby stage, summed over the family:`);
  console.log(`  scan        ${fmt_ns(sum("scan_ns")).padStart(9)}  ${pct(sum("scan_ns"), total)}`);
  console.log(
    `  reclassify  ${fmt_ns(sum("reclassify_ns")).padStart(9)}  ${pct(sum("reclassify_ns"), total)}`,
  );
  console.log(
    `  render      ${fmt_ns(sum("render_ns")).padStart(9)}  ${pct(sum("render_ns"), total)}`,
  );
  console.log(
    `\nanchor drift ${(anchor.drift * 100).toFixed(1)}%${anchor.stable ? "" : "  UNSTABLE"}`,
  );
} finally {
  release();
}
