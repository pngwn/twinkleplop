#!/usr/bin/env node
// render the benchmark run as a pull request comment.
//
//   node lib/bench/perf/bin/pr-comment.mjs --ab <report.json> \
//        [--comparison <comparison.json>] [--out comment.md] \
//        [--fail-on none|group|workload]
//
// the hard part of a per-PR benchmark comment is not producing numbers, it is
// not lying with them. a CI runner is a shared, virtualised, noisy machine;
// most PRs change nothing measurable; and a comment that cries wolf on every
// third PR trains everyone to ignore it, at which point the real regression
// sails through too. so this reports only what the harness can defend:
//
//   - group geomeans FIRST, individual rows second. random noise scatters and
//     cancels in an average; a real change to the scanner moves every
//     tokenize row in the same direction. a group moving together is the
//     strongest evidence available here, and a single row clearing the floor
//     is the weakest.
//   - a threshold PER GROUP SIZE, resampled from this run's own A/A
//     calibration. judging a 54-workload geomean against the 3.4%
//     single-workload floor would hide every real broad effect; judging it
//     against zero would flag noise. the null distribution gives the honest
//     line for each n.
//   - the integrity block always, not only on failure. corpus hash, anchor
//     drift, output parity, where the floor came from. a reader who cannot
//     tell whether the machine was stable cannot use the numbers.
//
// --fail-on follows from the first of those: it defaults to `group`, because
// the A/A calibration flags roughly one workload in eight as "significant"
// when both arms are the SAME commit, and a per-workload gate would therefore
// go red on PRs that changed nothing.

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
// parity is reported, never gated on here. a performance branch that changes
// output has broken something; a FEATURE branch that changes output has done
// its job. this workflow runs on both, so the honest thing is to say what the
// comparison is actually comparing and let the reader decide.
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

// resample the A/A calibration to get the null distribution of |geomean - 1|
// for a group of n workloads. every deviation in that calibration is noise by
// construction - it is two builds of the same commit - so the p95 of this
// distribution is the line a real group effect has to clear.
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

  const floor_for = (n) => {
    const devs = [];
    for (let s = 0; s < 8000; s++) {
      let log_sum = 0;
      for (let i = 0; i < n; i++) log_sum += Math.log(all[(rng() * all.length) | 0]);
      devs.push(Math.abs(Math.exp(log_sum / n) - 1));
    }
    devs.sort((a, b) => a - b);
    return devs[Math.floor(0.95 * devs.length)];
  };

  const cache = new Map();
  return (n) => {
    const key = Math.min(n, all.length);
    if (!cache.has(key)) cache.set(key, floor_for(key));
    return cache.get(key);
  };
}

const calibration = existsSync(calibration_path)
  ? JSON.parse(readFileSync(calibration_path, "utf8"))
  : null;
const group_floor = group_floor_table(calibration);

// a noise floor is a property of a MACHINE, not of a repository. the
// calibration checked into the repo was measured on a developer's laptop; a
// CI runner is a different, shared, virtualised machine with a floor several
// times higher. silently applying the laptop's 3.4% to a runner would turn
// every quiet PR into a page of green "wins". CI is expected to run
// bin/calibrate.mjs first and overwrite the file; if what we ended up reading
// was measured somewhere else, say so in the comment rather than hiding it.
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
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, rows]) => {
      const g = geomean(rows.map((r) => r.speedup));
      const floor = group_floor ? group_floor(rows.length) : null;
      const moved = floor !== null && Math.abs(g - 1) > floor;
      return {
        key,
        n: rows.length,
        geomean: g,
        floor,
        // a group is only called when it clears the threshold for a group of
        // its own size. no threshold available means no call, not a guess.
        call: floor === null ? "?" : moved ? (g > 1 ? "faster" : "slower") : "flat",
      };
    });
}

const ICON = { faster: "🟢", slower: "🔴", flat: "⚪", "?": "❔", unstable: "🟡", noise: "⚪" };

function table(header, rows) {
  const lines = [`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`];
  for (const r of rows) lines.push(`| ${r.join(" | ")} |`);
  return lines.join("\n");
}

function group_section(title, groups) {
  const rows = group_rows(groups).map((r) => [
    `\`${r.key}\``,
    fmt_pct(r.geomean),
    r.floor === null ? "—" : `±${(r.floor * 100).toFixed(2)}%`,
    String(r.n),
    `${ICON[r.call]} ${r.call}`,
  ]);
  return `**${title}**\n\n${table(["group", "geomean", "p95 noise for n", "n", ""], rows)}`;
}

// ------------------------------------------------------------------- verdict

const regressions = results.filter((r) => verdict(r, noise_floor) === "slower");
const wins = results.filter((r) => verdict(r, noise_floor) === "faster");
const unstable = results.filter((r) => verdict(r, noise_floor) === "unstable");
const overall = geomean(results.map((r) => r.speedup));

const mode_groups = group_rows(group_by(results, (r) => r.mode));
const moved_groups = mode_groups.filter((g) => g.call === "faster" || g.call === "slower");

let headline;
if (regressions.length > 0) {
  headline =
    `🔴 **${regressions.length} workload${regressions.length === 1 ? "" : "s"} regressed** ` +
    `beyond the ${(noise_floor * 100).toFixed(1)}% noise floor.`;
} else if (moved_groups.some((g) => g.call === "slower")) {
  headline =
    `🟠 **No single workload regressed, but a whole mode moved down.** ` +
    `A broad, small, uniform loss is exactly the shape a language-agnostic ` +
    `change produces — read the group table, not the rows.`;
} else if (moved_groups.some((g) => g.call === "faster")) {
  headline = `🟢 **Faster.** ${moved_groups.filter((g) => g.call === "faster").length} mode geomean(s) cleared the noise threshold for their size.`;
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

// the gate. a borrowed noise floor cannot fail a build - the thresholds it
// produces are not this machine's, and failing on them would be theatre.
if (calibration_mismatch) {
  console.error(`not gating: ${calibration_mismatch}`);
  process.exitCode = 0;
} else if (fail_on === "group") {
  const down = mode_groups.filter((g) => g.call === "slower");
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
