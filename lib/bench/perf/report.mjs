// report formatting shared by the A/B and calibration CLIs.

import { geomean } from "./ab.mjs";

const RESET = "\u001b[0m";
const DIM = "\u001b[2m";
const RED = "\u001b[31m";
const GREEN = "\u001b[32m";
const YELLOW = "\u001b[33m";
const BOLD = "\u001b[1m";

const colour_enabled = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (colour_enabled ? `${code}${s}${RESET}` : s);

export function fmt_ns(ns) {
  if (!Number.isFinite(ns)) return "-";
  if (ns < 1_000) return `${ns.toFixed(0)}ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toFixed(1)}us`;
  return `${(ns / 1_000_000).toFixed(2)}ms`;
}

export function fmt_pct(ratio) {
  if (!Number.isFinite(ratio)) return "-";
  const pct = (ratio - 1) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/**
 * A verdict per result. `noise_floor` is the half-width of the A/A spread
 * from bin/calibrate.mjs; a delta smaller than that is not distinguishable
 * from the harness measuring itself.
 */
export function verdict(r, noise_floor = 0.02) {
  const delta = Math.abs(r.speedup - 1);
  if (!r.significant) return "noise";
  if (delta < noise_floor) return "noise";
  // passes that disagreed on the direction saw noise, whatever the CI says.
  if (r.replicated === false) return "unstable";
  // the paired median and the best-of ratio disagreeing by more than the
  // effect itself means the run was disturbed; do not call it either way.
  if (Math.abs(r.speedup - r.best_speedup) > delta) return "unstable";
  return r.speedup > 1 ? "faster" : "slower";
}

function colour_verdict(v, text) {
  switch (v) {
    case "faster":
      return c(GREEN, text);
    case "slower":
      return c(RED, text);
    case "unstable":
      return c(YELLOW, text);
    default:
      return c(DIM, text);
  }
}

export function print_table(results, { noise_floor = 0.02, only = null } = {}) {
  const rows = only ? results.filter(only) : results;
  if (rows.length === 0) return;

  const w_id = Math.max(20, ...rows.map((r) => r.id.length));
  const head = [
    "workload".padEnd(w_id),
    "base".padStart(9),
    "cand".padStart(9),
    "delta".padStart(8),
    "95% ci".padStart(16),
    "verdict",
  ].join("  ");
  console.log(c(BOLD, head));
  console.log(c(DIM, "-".repeat(head.length)));

  for (const r of rows) {
    const v = verdict(r, noise_floor);
    const ci = `${fmt_pct(r.ci[0])}..${fmt_pct(r.ci[1])}`;
    console.log(
      [
        r.id.padEnd(w_id),
        fmt_ns(r.a.median_ns).padStart(9),
        fmt_ns(r.b.median_ns).padStart(9),
        colour_verdict(v, fmt_pct(r.speedup).padStart(8)),
        c(DIM, ci.padStart(16)),
        colour_verdict(v, v),
      ].join("  "),
    );
  }
}

function group_by(results, key_fn) {
  const groups = new Map();
  for (const r of results) {
    const k = key_fn(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  return groups;
}

export function print_summary(results, { noise_floor = 0.02 } = {}) {
  const section = (title, groups) => {
    console.log(`\n${c(BOLD, title)}`);
    const width = Math.max(...[...groups.keys()].map((k) => k.length), 8);
    for (const [key, rows] of [...groups].sort()) {
      const g = geomean(rows.map((r) => r.speedup));
      const worst = rows.reduce((acc, r) => (r.speedup < acc.speedup ? r : acc), rows[0]);
      const v = g > 1 + noise_floor ? "faster" : g < 1 - noise_floor ? "slower" : "noise";
      console.log(
        `  ${key.padEnd(width)}  ${colour_verdict(v, fmt_pct(g).padStart(8))}  ` +
          c(
            DIM,
            `n=${String(rows.length).padStart(3)}  worst ${fmt_pct(worst.speedup)} (${worst.id})`,
          ),
      );
    }
  };

  section(
    "by mode (geomean)",
    group_by(results, (r) => r.mode),
  );
  section(
    "by family (geomean)",
    group_by(results, (r) => r.family),
  );
  section(
    "by language (geomean)",
    group_by(results, (r) => r.lang),
  );

  const overall = geomean(results.map((r) => r.speedup));
  const regressions = results.filter((r) => verdict(r, noise_floor) === "slower");
  const wins = results.filter((r) => verdict(r, noise_floor) === "faster");
  const unstable = results.filter((r) => verdict(r, noise_floor) === "unstable");

  console.log(`\n${c(BOLD, "overall")}`);
  console.log(`  geomean            ${fmt_pct(overall)}  over ${results.length} workloads`);
  console.log(`  faster             ${wins.length}`);
  console.log(`  slower             ${regressions.length}`);
  console.log(`  unstable           ${unstable.length}`);

  if (regressions.length > 0) {
    console.log(`\n${c(RED, "regressions")}`);
    for (const r of [...regressions].sort((x, y) => x.speedup - y.speedup).slice(0, 15)) {
      console.log(`  ${r.id.padEnd(34)} ${fmt_pct(r.speedup).padStart(8)}`);
    }
  }
}

export function print_integrity(meta, { noise_floor = 0.02 } = {}) {
  console.log(`\n${c(BOLD, "run integrity")}`);
  const anchor = meta.anchor;
  const drift_txt = `${fmt_pct(1 + anchor.drift)} (${fmt_ns(anchor.start_ns)} -> ${fmt_ns(anchor.end_ns)})`;
  console.log(`  machine anchor drift  ${anchor.stable ? c(GREEN, drift_txt) : c(RED, drift_txt)}`);
  if (!anchor.stable) {
    console.log(
      c(
        YELLOW,
        `  the machine changed speed during this run. paired ratios are still usable;\n` +
          `  the absolute base/cand columns are not comparable to other runs.`,
      ),
    );
  }
  console.log(
    `  noise floor           ${(noise_floor * 100).toFixed(1)}%  ${c(DIM, meta.noise_floor_source ?? "")}`,
  );
  console.log(`  corpus                ${meta.corpus_hash}`);
  console.log(`  harness               ${meta.harness_hash}`);
  console.log(`  baseline              ${meta.baseline.label} ${c(DIM, meta.baseline.root)}`);
  console.log(`  candidate             ${meta.candidate.label} ${c(DIM, meta.candidate.root)}`);
  console.log(
    `  node                  ${meta.node}  gc=${meta.exposed_gc ? "exposed" : "not exposed"}`,
  );
  if (!meta.exposed_gc) {
    console.log(
      c(YELLOW, `  run with --expose-gc for lower variance on allocation heavy workloads`),
    );
  }
}
