import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Reads the artifact the CI benchmark job uploads, downloaded into
// `lib/bench/results/` before the site build runs.
//
// Deliberately not committed: a checked-in benchmark goes stale silently,
// rendering confident charts long after they stopped being true.

interface RawLibrary {
  id: string;
  ns_per_op: number;
  ops_per_sec: number;
  mb_per_sec: number;
  spread: number;
}

interface RawCell {
  corpus: "sized" | "upstream";
  lang: string;
  tier: "small" | "medium" | "large" | null;
  bytes: number;
  lines: number;
  mode: "tokenize" | "html";
  tokens: Record<string, number> | null;
  libraries: RawLibrary[];
}

interface RawComparison {
  meta: {
    generated_at: string;
    commit: string | null;
    node: string;
    platform: string;
    cpu: string;
    runner: string;
    anchor: { drift: number; stable: boolean };
    libraries: Array<{ id: string; label: string; version: string; note: string }>;
    upstream: { repo: string; commit: string } | null;
    excluded: Array<{ cell: string; library: string; reason: string }>;
  };
  results: RawCell[];
}

export interface Bar {
  id: string;
  label: string;
  ops_per_sec: number;
  ns_per_op: number;
  mb_per_sec: number;
  tokens: number | null;
  /** How many times slower than the fastest bar in this chart. 1 for the fastest. */
  ratio: number;
  /** Max/min across rounds. Well above 1 means the machine was busy. */
  spread: number;
}

export interface Chart {
  key: string;
  corpus: "sized" | "upstream";
  lang: string;
  tier: "small" | "medium" | "large" | null;
  mode: "tokenize" | "html";
  bytes: number;
  lines: number;
  bars: Bar[];
}

const TIER_ORDER = ["small", "medium", "large"];

const MODE_LABEL: Record<string, { label: string; description: string }> = {
  tokenize: {
    label: "Tokenise only",
    description: "Source in, structured token stream out. No HTML, no rendering — just the parse.",
  },
  html: {
    label: "Tokenise + render HTML",
    description: "End-to-end: parse the source and produce styled HTML ready to drop into a page.",
  },
};

const CORPUS_COPY: Record<string, { label: string; description: string }> = {
  sized: {
    label: "Our corpus, three sizes",
    description:
      "Every language at roughly 1KB, 10KB and 100KB. The small tier is the docs-snippet case, where fixed per-call cost still dominates; the large tier is a big vendored file. These are inputs we assembled, so read them alongside the set below.",
  },
  upstream: {
    label: "Shiki's own benchmark inputs",
    description:
      "The sample files from shikijs/textmate-grammars-themes, vendored and pinned. Shiki's own engine benchmark runs on these. We did not choose them, which is the point: a highlighter benchmark published by the people who wrote the highlighter is worth exactly as much as its inputs.",
  },
};

function build(raw: RawComparison) {
  const labels = new Map(raw.meta.libraries.map((l) => [l.id, l.label]));

  const charts: Chart[] = raw.results.map((cell) => {
    const sorted = [...cell.libraries].sort((a, b) => a.ns_per_op - b.ns_per_op);
    const fastest = sorted[0]?.ns_per_op ?? 0;
    return {
      key: `${cell.corpus}:${cell.lang}:${cell.tier ?? "-"}:${cell.mode}`,
      corpus: cell.corpus,
      lang: cell.lang,
      tier: cell.tier,
      mode: cell.mode,
      bytes: cell.bytes,
      lines: cell.lines,
      bars: sorted.map((l) => ({
        id: l.id,
        label: labels.get(l.id) ?? l.id,
        ops_per_sec: l.ops_per_sec,
        ns_per_op: l.ns_per_op,
        mb_per_sec: l.mb_per_sec,
        tokens: cell.tokens?.[l.id] ?? null,
        ratio: fastest > 0 ? l.ns_per_op / fastest : 1,
        spread: l.spread,
      })),
    };
  });

  const languages = [...new Set(charts.map((c) => c.lang))].sort();
  const modes = [...new Set(charts.map((c) => c.mode))].sort();

  return {
    meta: raw.meta,
    languages,
    modes: modes.map((m) => ({ id: m, ...MODE_LABEL[m] })),
    tier_order: TIER_ORDER,
    corpus_copy: CORPUS_COPY,
    charts,
  };
}

// `import.meta.dirname` is NOT usable here: this module is bundled into
// `.svelte-kit/output/server/` before prerendering runs, so every relative hop
// from it lands somewhere that does not exist — silently, because the catch
// below turns it into "no benchmark data yet". That is how this page rendered
// an empty state while the data sat on disk.
//
// Resolve from the working directory instead, accepting both shapes rather
// than betting on where the build was invoked from.
//
// Two sources, in order of preference. The published run is committed: it was
// taken on a named machine with a pinned clock, by the three commands in
// lib/bench/published/README.md, and anyone can re-run them. The CI artifact
// is what the shared runner produced most recently, downloaded at deploy time;
// it is the fallback, not the headline, because its absolute numbers depend on
// which host the job landed on.
type Source = "published" | "ci-artifact";

const CANDIDATES: Array<{ source: Source; parts: string[] }> = [
  // `pnpm --filter=site build` — cwd is lib/_site
  { source: "published", parts: ["..", "bench", "published", "comparison.json"] },
  // `vite build` from the repo root
  { source: "published", parts: ["lib", "bench", "published", "comparison.json"] },
  { source: "ci-artifact", parts: ["..", "bench", "results", "comparison.json"] },
  { source: "ci-artifact", parts: ["lib", "bench", "results", "comparison.json"] },
];

function find_results(): { json_path: string; source: Source } | null {
  const override = process.env.TWINKLEPLOP_BENCH_RESULTS;
  if (override)
    return fs.existsSync(override) ? { json_path: override, source: "ci-artifact" } : null;
  for (const { source, parts } of CANDIDATES) {
    const candidate = path.resolve(process.cwd(), ...parts);
    if (fs.existsSync(candidate)) return { json_path: candidate, source };
  }
  return null;
}

// How far the site's own commit has moved past the commit the run measured.
// A committed run goes stale silently otherwise; this puts the staleness on
// the page next to the numbers. null when git cannot answer (a shallow
// checkout, a tarball, a commit git has never seen).
function commits_behind(measured_commit: string | null): number | null {
  if (!measured_commit) return null;
  try {
    const out = execFileSync("git", ["rev-list", "--count", `${measured_commit}..HEAD`], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const n = Number(out);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export const load = async () => {
  const found = find_results();

  if (found === null) {
    // say so in the build log. a benchmark page that quietly renders an
    // empty state is indistinguishable from one whose data went missing,
    // and the whole point of running this in CI is that someone notices.
    console.warn(
      `[benchmarks] no comparison.json found (looked in ${CANDIDATES.map((c) =>
        path.resolve(process.cwd(), ...c.parts),
      ).join(", ")}). The benchmarks page will render its empty state.`,
    );
    return { benchmarks: null, missing: true as const, source: null, behind: null };
  }

  const { json_path, source } = found;
  try {
    const raw = JSON.parse(fs.readFileSync(json_path, "utf-8")) as RawComparison;
    console.log(`[benchmarks] rendering the ${source} run from ${json_path}`);
    return {
      benchmarks: build(raw),
      missing: false as const,
      source,
      behind: commits_behind(raw.meta.commit),
    };
  } catch (err) {
    // a malformed file is a different problem from a missing one, and
    // swallowing it into the same empty state hides a broken artifact.
    console.error(`[benchmarks] ${json_path} could not be read: ${(err as Error).message}`);
    return { benchmarks: null, missing: true as const, source: null, behind: null };
  }
};
