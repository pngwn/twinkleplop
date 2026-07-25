#!/usr/bin/env node
// output parity gate.
//
//   node lib/bench/perf/bin/parity.mjs [--candidate <root>] [--baseline <root>]
//
// runs the whole corpus through both arms and compares what consumers
// actually receive: the token stream (type NAME plus span, not the internal
// type id, which is free to renumber) and the rendered HTML string.
//
// this is the counterpart to the benchmark. experiments are allowed to break
// things while they explore, but a change only becomes a result once this
// reports zero divergences across all eighteen languages, all four corpus
// families, and every entry point. a speedup that changes output is not a
// speedup, it is a different library.
//
// exit code 1 on any divergence.

import { join, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";

import { load_arm } from "../arm.mjs";
import { corpus, CORPUS_HASH, FAMILIES } from "../corpus.mjs";
import { baseline_dir, local_root } from "../paths.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const perf_dir = resolve(here, "..");
const repo_root = local_root;

const argv = process.argv.slice(2);
const opt = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};
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
const max_report = Number(opt("max-report", "3"));
const families = list("families") ?? FAMILIES;
const languages = list("languages");

function to_named(result) {
  const { tokens, token_types } = result;
  const n = tokens.length / 3;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = `${token_types[tokens[i * 3]]}:${tokens[i * 3 + 1]}:${tokens[i * 3 + 2]}`;
  }
  return out;
}

function first_divergence(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return i;
  }
  return a.length === b.length ? -1 : n;
}

function context(src, entry_a, entry_b) {
  const parse = (e) => {
    if (!e) return null;
    const [type, start, end] = e.split(":");
    return { type, start: Number(start), end: Number(end) };
  };
  const pa = parse(entry_a);
  const pb = parse(entry_b);
  const pos = pa?.start ?? pb?.start ?? 0;
  const line = src.slice(0, pos).split("\n").length;
  const from = Math.max(0, src.lastIndexOf("\n", pos - 1) + 1);
  const to = src.indexOf("\n", pos) === -1 ? src.length : src.indexOf("\n", pos);
  return {
    line,
    text: src.slice(from, to).slice(0, 160),
    baseline: pa
      ? `${pa.type} [${pa.start},${pa.end}) ${JSON.stringify(src.slice(pa.start, pa.end).slice(0, 40))}`
      : "<end of stream>",
    candidate: pb
      ? `${pb.type} [${pb.start},${pb.end}) ${JSON.stringify(src.slice(pb.start, pb.end).slice(0, 40))}`
      : "<end of stream>",
  };
}

const [base, cand] = await Promise.all([
  load_arm(baseline_root, "baseline"),
  load_arm(candidate_root, "candidate"),
]);

const divergences = [];
let checks = 0;
let skipped = 0;

for (const entry of corpus({ families, languages })) {
  const base_mod = base.languages[entry.lang];
  const cand_mod = cand.languages[entry.lang];
  if (!base_mod || !cand_mod) {
    skipped++;
    continue;
  }
  const src = entry.source;

  const cases = [
    {
      mode: "tokenize",
      a: () => base.core.tokenize(src, base_mod.grammar),
      b: () => cand.core.tokenize(src, cand_mod.grammar),
      compare: "tokens",
      available: Boolean(base_mod.grammar && cand_mod.grammar),
    },
    {
      mode: "pipeline",
      a: () => base_mod.tokenize()(src),
      b: () => cand_mod.tokenize()(src),
      compare: "tokens",
      available: typeof base_mod.tokenize === "function" && typeof cand_mod.tokenize === "function",
    },
    {
      mode: "fidelity-low",
      a: () => base_mod.tokenize({ fidelity: "low" })(src),
      b: () => cand_mod.tokenize({ fidelity: "low" })(src),
      compare: "tokens",
      available: typeof base_mod.tokenize === "function" && typeof cand_mod.tokenize === "function",
    },
    {
      mode: "html",
      a: () => base_mod.language()(src),
      b: () => cand_mod.language()(src),
      compare: "string",
      available: typeof base_mod.language === "function" && typeof cand_mod.language === "function",
    },
  ];

  for (const c of cases) {
    if (!c.available) continue;
    checks++;
    let a_out;
    let b_out;
    try {
      a_out = c.a();
    } catch (err) {
      divergences.push({
        id: `${entry.id}:${c.mode}`,
        kind: "baseline threw",
        detail: err.message,
      });
      continue;
    }
    try {
      b_out = c.b();
    } catch (err) {
      divergences.push({
        id: `${entry.id}:${c.mode}`,
        kind: "candidate threw",
        detail: err.message,
      });
      continue;
    }

    if (c.compare === "string") {
      if (a_out !== b_out) {
        let i = 0;
        while (i < a_out.length && i < b_out.length && a_out[i] === b_out[i]) i++;
        divergences.push({
          id: `${entry.id}:${c.mode}`,
          kind: "html differs",
          detail: `first difference at char ${i}`,
          baseline: a_out.slice(Math.max(0, i - 60), i + 60),
          candidate: b_out.slice(Math.max(0, i - 60), i + 60),
        });
      }
      continue;
    }

    const a_named = to_named(a_out);
    const b_named = to_named(b_out);
    const idx = first_divergence(a_named, b_named);
    if (idx >= 0) {
      const ctx = context(src, a_named[idx], b_named[idx]);
      divergences.push({
        id: `${entry.id}:${c.mode}`,
        kind: "token stream differs",
        detail: `token ${idx} of ${a_named.length} (baseline) / ${b_named.length} (candidate), line ${ctx.line}`,
        line_text: ctx.text,
        baseline: ctx.baseline,
        candidate: ctx.candidate,
      });
    }
  }
}

console.log(`parity: ${checks} checks across ${families.length} families, corpus ${CORPUS_HASH}`);
if (skipped > 0) console.log(`  ${skipped} corpus entries skipped (language missing on one arm)`);

if (divergences.length === 0) {
  console.log(`\nno divergences. output is identical on every checked path.`);
  process.exit(0);
}

console.log(`\n${divergences.length} divergence(s):\n`);
const by_id = new Map();
for (const d of divergences) {
  const key = d.id.split(":")[0];
  if (!by_id.has(key)) by_id.set(key, []);
  by_id.get(key).push(d);
}

let shown = 0;
for (const d of divergences) {
  if (shown++ >= max_report) break;
  console.log(`  ${d.id}  ${d.kind}`);
  console.log(`    ${d.detail}`);
  if (d.line_text) console.log(`    source:    ${d.line_text}`);
  console.log(`    baseline:  ${d.baseline}`);
  console.log(`    candidate: ${d.candidate}`);
  console.log("");
}
if (divergences.length > max_report) {
  console.log(`  ... and ${divergences.length - max_report} more (see the JSON report)`);
}

console.log("\naffected workloads:");
for (const [key, ds] of [...by_id].sort()) {
  console.log(`  ${key.padEnd(28)} ${ds.map((d) => d.id.split(":")[1]).join(", ")}`);
}

const out_path = join(perf_dir, "reports", "parity-latest.json");
mkdirSync(dirname(out_path), { recursive: true });
writeFileSync(
  out_path,
  `${JSON.stringify({ checks, corpus_hash: CORPUS_HASH, baseline_root, candidate_root, divergences }, null, 2)}\n`,
);
console.log(`\nfull report: ${out_path}`);
process.exit(1);
