#!/usr/bin/env node
// render the benchmark run as a pull request comment.
//
//   node lib/bench/perf/bin/pr-comment.mjs --ab <report.json> \
//        [--comparison <comparison.json>] [--out comment.md] \
//        [--fail-on none|group|workload]
//
// most PRs change nothing measurable, and a comment that cries wolf on every
// third one trains everyone to ignore it. so this reports only what the
// harness can defend:
//
//   - group geomeans first, individual rows second. noise scatters and
//     cancels in an average; a real scanner change moves every tokenize row
//     the same way.
//   - a threshold per GROUP SIZE, resampled from this run's A/A calibration.
//     judging a 54-workload geomean against the single-workload floor would
//     hide every real broad effect.
//   - the integrity block always, not only on failure. a reader who cannot
//     tell whether the machine was stable cannot use the numbers.
//
// --fail-on defaults to `group` for the same reason: the A/A calibration
// flags roughly one workload in eight when both arms are the SAME commit.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { geomean } from "../ab.mjs";
import { fmt_ns, fmt_pct, verdict } from "../report.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const perf_dir = resolve(here, "..");

const argv = process.argv.slice(2);
const opt = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

const MARKER = "<!-- twinkleplop-benchmarks -->";

const ab_path = opt("ab");
if (!ab_path) {
  console.error("--ab <report.json> is required");
  process.exit(2);
}
const comparison_path = opt("comparison");
const calibration_path = opt("calibration", join(perf_dir, "calibration.json"));
const out_path = opt("out", null);
const fail_on = opt("fail-on", "group");
// reported, never gated: a perf branch that changes output has broken
// something, a feature branch has done its job, and this runs on both.
const parity_status = opt("parity-status", "unknown");
const parity_path = opt("parity", null);
if (!["none", "group", "workload"].includes(fail_on)) {
  console.error(`--fail-on must be none, group or workload (got "${fail_on}")`);
  process.exit(2);
}

const report = JSON.parse(readFileSync(resolve(ab_path), "utf8"));
const { meta, results } = report;
const noise_floor = meta.noise_floor ?? 0.02;

// ---------------------------------------------------------------- group floor

// the null distribution of |geomean - 1| for a group of n, resampled from the
// A/A calibration where every deviation is noise by construction. the
// (1 - alpha) quantile is the line a real group effect has to clear.
//
// alpha is NOT 0.05. a section reports several groups and the gate fires if
// any of them moves, so testing each at 5% puts the real error rate at
// 1 - 0.95^k: 7.3% for the three modes the gate looks at, and 30% for the
// seven rows the comment colours. measured against a pull request that
// changed no library code, that is a red check roughly every fourteenth PR
// and a coloured row every third. holding the FAMILY-WISE rate at 5% needs
// each group tested at 1 - (1 - 0.05)^(1/k) instead, which is about 20%
// wider per threshold.
function group_floor_table(cal) {
  if (!cal?.per_workload) return null;
  const all = Object.values(cal.per_workload);
  if (all.length < 10) return null;

  let seed = 0x5eed;
  const rng = () => {
    seed ^= seed << 13;
    seed >>>= 0;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    return seed / 0x100000000;
  };

  const floor_for = (n, alpha) => {
    const devs = [];
    for (let s = 0; s < 8000; s++) {
      let log_sum = 0;
      for (let i = 0; i < n; i++) log_sum += Math.log(all[(rng() * all.length) | 0]);
      devs.push(Math.abs(Math.exp(log_sum / n) - 1));
    }
    devs.sort((a, b) => a - b);
    return devs[Math.min(devs.length - 1, Math.floor((1 - alpha) * devs.length))];
  };

  const cache = new Map();
  return (n, alpha) => {
    const key = `${Math.min(n, all.length)}:${alpha}`;
    if (!cache.has(key)) cache.set(key, floor_for(Math.min(n, all.length), alpha));
    return cache.get(key);
  };
}

/** Per-group alpha that holds the family-wise error rate at 5% over k groups. */
const alpha_for = (k) => 1 - Math.pow(0.95, 1 / Math.max(1, k));

const calibration = existsSync(calibration_path)
  ? JSON.parse(readFileSync(calibration_path, "utf8"))
  : null;
const group_floor = group_floor_table(calibration);

// a noise floor is a property of a MACHINE, not a repository. applying the
// laptop's 3.4% to a CI runner would turn every quiet PR into a page of green
// "wins", so if the floor we read was measured elsewhere, say so.
const calibration_mismatch = (() => {
  if (!calibration) return "no calibration.json - group thresholds unavailable";
  const problems = [];
  if (calibration.corpus_hash !== meta.corpus_hash) problems.push("different corpus");
  if (calibration.node !== meta.node) problems.push(`different node (${calibration.node})`);
  if (calibration.suite && meta.suite && calibration.suite !== meta.suite) {
    problems.push(`different suite (${calibration.suite})`);
  }
  return problems.length > 0 ? problems.join(", ") : null;
})();

// ---------------------------------------------------------------- aggregation

function group_by(rows, key_fn) {
  const out = new Map();
  for (const r of rows) {
    const k = key_fn(r);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(r);
  }
  return out;
}

function group_rows(groups) {
  const entries = [...groups].sort(([a], [b]) => a.localeCompare(b));
  const alpha = alpha_for(entries.length);
  return entries.map(([key, rows]) => {
    const g = geomean(rows.map((r) => r.speedup));
    const floor = group_floor ? group_floor(rows.length, alpha) : null;
    const moved = floor !== null && Math.abs(g - 1) > floor;
    return {
      key,
      n: rows.length,
      geomean: g,
      floor,
      // no threshold available means no call, not a guess.
      call: floor === null ? "?" : moved ? (g > 1 ? "faster" : "slower") : "flat",
    };
  });
}

// the modes are nested: `tokenize` is the scanner, `pipeline` is that scanner
// plus the reclassifiers, `html` is pipeline plus rendering. so a regression
// in the scanner has to appear in every mode that CONTAINS the scanner, and
// one that shows up in `tokenize` while `pipeline` moves the other way is not
// physically a scanner regression - it is noise that happened to land on one
// group. a regression confined to `pipeline` or `html` is legitimate: it can
// live in the reclassifiers or the renderer, which `tokenize` never runs.
const CONTAINED_BY = { tokenize: ["pipeline", "html"], pipeline: ["html"], html: [] };

function corroborated(row, by_key) {
  if (row.call !== "slower") return true;
  return (CONTAINED_BY[row.key] ?? []).every((outer) => {
    const containing = by_key.get(outer);
    // absent from this run means nothing to contradict it.
    return containing === undefined || containing.geomean < 1;
  });
}

const ICON = {
  faster: "🟢",
  slower: "🔴",
  flat: "⚪",
  "?": "❔",
  unstable: "🟡",
  noise: "⚪",
  uncorroborated: "🟡",
};

function table(header, rows) {
  const lines = [`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`];
  for (const r of rows) lines.push(`| ${r.join(" | ")} |`);
  return lines.join("\n");
}

function group_section(title, groups) {
  const computed = group_rows(groups);
  const by_key = new Map(computed.map((r) => [r.key, r]));
  const rows = computed.map((r) => {
    const ok = corroborated(r, by_key);
    return [
      `\`${r.key}\``,
      fmt_pct(r.geomean),
      r.floor === null ? "—" : `±${(r.floor * 100).toFixed(2)}%`,
      String(r.n),
      ok ? `${ICON[r.call]} ${r.call}` : `${ICON.uncorroborated} uncorroborated`,
    ];
  });
  const note = computed.some((r) => !corroborated(r, by_key))
    ? "\n\n_`uncorroborated`: the group moved past its threshold, but a mode that " +
      "contains it did not move the same way. `pipeline` runs the same scanner as " +
      "`tokenize`, so a real scanner regression cannot appear in one and not the other._"
    : "";
  return `**${title}**\n\n${table(["group", "geomean", "noise for n", "n", ""], rows)}${note}`;
}

// ------------------------------------------------------------------- verdict

const regressions = results.filter((r) => verdict(r, noise_floor) === "slower");
const wins = results.filter((r) => verdict(r, noise_floor) === "faster");
const unstable = results.filter((r) => verdict(r, noise_floor) === "unstable");
const overall = geomean(results.map((r) => r.speedup));

const mode_groups = group_rows(group_by(results, (r) => r.mode));
const modes_by_key = new Map(mode_groups.map((g) => [g.key, g]));
// a "slower" call that the containing modes contradict is not carried
// forward into the headline or the gate.
const mode_slower = mode_groups.filter((g) => g.call === "slower" && corroborated(g, modes_by_key));
const mode_faster = mode_groups.filter((g) => g.call === "faster");
const mode_uncorroborated = mode_groups.filter(
  (g) => g.call === "slower" && !corroborated(g, modes_by_key),
);

let headline;
if (regressions.length > 0) {
  headline =
    `🔴 **${regressions.length} workload${regressions.length === 1 ? "" : "s"} regressed** ` +
    `beyond the ${(noise_floor * 100).toFixed(1)}% noise floor.`;
} else if (mode_slower.length > 0) {
  headline =
    `🟠 **No single workload regressed, but a whole mode moved down.** ` +
    `A broad, small, uniform loss is exactly the shape a language-agnostic ` +
    `change produces — read the group table, not the rows.`;
} else if (mode_uncorroborated.length > 0) {
  headline =
    `🟡 **\`${mode_uncorroborated.map((g) => g.key).join("`, `")}\` moved past its ` +
    `threshold, but the modes containing it did not.** A scanner regression cannot ` +
    `show up in \`tokenize\` and not in \`pipeline\`, which runs the same scanner — ` +
    `so this is noise landing on one group, not a regression. Not gated.`;
} else if (mode_faster.length > 0) {
  headline = `🟢 **Faster.** ${mode_faster.length} mode geomean(s) cleared the noise threshold for their size.`;
} else {
  headline = `⚪ **No measurable change.** Nothing cleared the noise floor.`;
}

// -------------------------------------------------------------------- output

const out = [];
out.push(MARKER);
out.push("## Benchmarks");
out.push("");
out.push(headline);
out.push("");

const base = meta.baseline ?? {};
out.push(
  `Paired A/B against \`${(base.sha ?? "unknown").slice(0, 12)}\`` +
    (base.subject ? ` — _${base.subject}_` : "") +
    `, suite \`${meta.suite}\`, ${results.length} workloads, ` +
    `${meta.repeat > 1 ? `${meta.repeat} passes` : "1 pass"} of ${meta.rounds} rounds.`,
);
out.push("");
out.push(
  `Overall geomean **${fmt_pct(overall)}** · ` +
    `${wins.length} faster · ${regressions.length} slower · ${unstable.length} unstable`,
);
out.push("");

if (parity_status === "diverged") {
  let detail = "";
  if (parity_path && existsSync(resolve(parity_path))) {
    const parity = JSON.parse(readFileSync(resolve(parity_path), "utf8"));
    const ids = [...new Set(parity.divergences.map((d) => d.id.split(":")[0]))];
    detail =
      ` ${parity.divergences.length} divergence(s) across ${ids.length} workload(s), ` +
      `e.g. \`${ids.slice(0, 3).join("`, `")}\`.`;
  }
  out.push(
    `> ⚠️ **The two arms do not produce the same output.**${detail} ` +
      `That is expected on a branch that deliberately changes behaviour, and a bug on ` +
      `one that claims to be a pure speedup. Either way the delta below is not a like-for-like ` +
      `comparison: some of it is the behaviour change, and no split between the two is available.`,
  );
  out.push("");
}

if (calibration_mismatch) {
  out.push(
    `> ⚠️ **The noise floor did not come from this machine** (${calibration_mismatch}). ` +
      `Every threshold below is borrowed, so treat the calls as indicative only. ` +
      `Run \`bin/calibrate.mjs\` on the runner before the A/B to fix this.`,
  );
  out.push("");
}

out.push(
  group_section(
    "By mode",
    group_by(results, (r) => r.mode),
  ),
);
out.push("");
out.push(
  group_section(
    "By corpus family",
    group_by(results, (r) => r.family),
  ),
);
out.push("");

// the upstream family is the one input set we did not choose. a win that
// appears everywhere except there is a win on our own file habits.
const upstream = results.filter((r) => r.family === "upstream");
if (upstream.length > 0) {
  const g = geomean(upstream.map((r) => r.speedup));
  const ours = results.filter((r) => r.family !== "upstream");
  const g_ours = geomean(ours.map((r) => r.speedup));
  const gap = Math.abs(g - g_ours);
  const floor = group_floor ? group_floor(upstream.length) : null;
  if (floor !== null && gap > 2 * floor) {
    out.push(
      `> ⚠️ **Our corpus and the vendored upstream corpus disagree** ` +
        `(${fmt_pct(g_ours)} vs ${fmt_pct(g)}). The upstream family is shiki's own ` +
        `benchmark inputs, pinned and vendored — files we did not pick. A change that ` +
        `only moves our own files is a change tuned to how we write code, not to the language.`,
    );
    out.push("");
  }
}

const movers = results
  .filter((r) => verdict(r, noise_floor) !== "noise")
  .sort((a, b) => a.speedup - b.speedup);

if (movers.length > 0) {
  out.push("<details>");
  out.push(
    `<summary>${movers.length} individual workload(s) past the ${(noise_floor * 100).toFixed(1)}% per-workload floor</summary>`,
  );
  out.push("");
  out.push(
    table(
      ["workload", "delta", "baseline", "branch", ""],
      movers
        .slice(0, 40)
        .map((r) => [
          `\`${r.id}\``,
          fmt_pct(r.speedup),
          fmt_ns(r.a.median_ns),
          fmt_ns(r.b.median_ns),
          `${ICON[verdict(r, noise_floor)]} ${verdict(r, noise_floor)}`,
        ]),
    ),
  );
  if (movers.length > 40) out.push(`\n…and ${movers.length - 40} more.`);
  out.push("");
  out.push("</details>");
  out.push("");
}

// ------------------------------------------------------- competitor section

if (comparison_path && existsSync(resolve(comparison_path))) {
  const cmp = JSON.parse(readFileSync(resolve(comparison_path), "utf8"));
  const by_lib = new Map();

  for (const cell of cmp.results) {
    const us = cell.libraries.find((l) => l.id === "twinkleplop");
    if (!us) continue;
    for (const lib of cell.libraries) {
      if (lib.id === "twinkleplop") continue;
      const key = `${lib.id}|${cell.mode}`;
      if (!by_lib.has(key)) by_lib.set(key, []);
      by_lib.get(key).push(lib.ns_per_op / us.ns_per_op);
    }
  }

  if (by_lib.size > 0) {
    const labels = Object.fromEntries(cmp.meta.libraries.map((l) => [l.id, l.label]));
    const modes = [...new Set(cmp.results.map((r) => r.mode))].sort();
    const libs = [...new Set([...by_lib.keys()].map((k) => k.split("|")[0]))];

    const rows = libs.map((id) => [
      labels[id] ?? id,
      ...modes.map((m) => {
        const xs = by_lib.get(`${id}|${m}`);
        if (!xs || xs.length === 0) return "—";
        return `${geomean(xs).toFixed(1)}× slower (n=${xs.length})`;
      }),
    ]);

    out.push("<details>");
    out.push("<summary>Against other highlighters, this commit</summary>");
    out.push("");
    out.push(
      `Geometric mean of each library's time divided by twinkleplop's, over every ` +
        `cell where both ran. Measured in one process, interleaved, so machine drift ` +
        `is common-mode.`,
    );
    out.push("");
    out.push(table(["library", ...modes], rows));
    out.push("");
    out.push(
      `Token counts per cell are in the artifact. Some of these emit a coarser ` +
        `stream than twinkleplop does, which is less work per byte rather than the ` +
        `same work done faster — the raw counts are the only honest way to see that.`,
    );
    if (cmp.meta.excluded?.length > 0) {
      out.push("");
      out.push(
        `${cmp.meta.excluded.length} library-cell(s) excluded (unsupported language or empty output).`,
      );
    }
    out.push("");
    out.push("</details>");
    out.push("");
  }
}

// ------------------------------------------------------------------ integrity

out.push("<details>");
out.push("<summary>Integrity</summary>");
out.push("");
out.push(
  table(
    ["", ""],
    [
      [
        "per-workload noise floor",
        `${(noise_floor * 100).toFixed(1)}% — ${meta.noise_floor_source}`,
      ],
      [
        "group thresholds",
        calibration_mismatch
          ? `⚠️ **${calibration_mismatch}** — thresholds below are not from this machine`
          : "resampled from this run's A/A calibration",
      ],
      [
        "anchor drift",
        `${(meta.anchor.drift * 100).toFixed(1)}% ${meta.anchor.stable ? "(stable)" : "**(unstable — absolute times not comparable across runs; paired ratios still are)**"}`,
      ],
      [
        "output parity",
        {
          clean: "identical on every checked path",
          diverged: "⚠️ **arms differ** — see the note above",
          skipped: "not run",
        }[parity_status] ?? "not reported",
      ],
      ["corpus", `\`${meta.corpus_hash}\``],
      ["harness", `\`${meta.harness_hash}\``],
      ["node", meta.node],
      ["`--expose-gc`", meta.exposed_gc ? "yes" : "**no — GC lands inside measurements**"],
      ["duration", `${meta.duration_s}s`],
    ],
  ),
);
out.push("");
out.push(
  "A workload counts as moved only if the effect exceeds the noise floor, the 95% CI " +
    "excludes 1.0, and the passes agree on direction. A group counts as moved only if its " +
    "geomean clears the p95 of the null distribution for a group of that size. Neither is " +
    "as convincing as a whole mode moving together.",
);
out.push("");
out.push("</details>");

const markdown = `${out.join("\n")}\n`;

if (out_path) {
  mkdirSync(dirname(resolve(out_path)), { recursive: true });
  writeFileSync(resolve(out_path), markdown);
  console.error(`comment: ${resolve(out_path)}`);
} else {
  process.stdout.write(markdown);
}

// a borrowed floor cannot fail a build; its thresholds are not this
// machine's.
if (calibration_mismatch) {
  console.error(`not gating: ${calibration_mismatch}`);
  process.exitCode = 0;
} else if (fail_on === "group") {
  const down = mode_slower;
  if (down.length > 0) {
    console.error(
      `regression: ${down.map((g) => `${g.key} ${fmt_pct(g.geomean)} (n=${g.n}, threshold ±${(g.floor * 100).toFixed(2)}%)`).join(", ")}`,
    );
    process.exitCode = 1;
  }
} else if (fail_on === "workload" && regressions.length > 0) {
  console.error(`regression: ${regressions.length} workload(s) past the per-workload floor`);
  process.exitCode = 1;
}
