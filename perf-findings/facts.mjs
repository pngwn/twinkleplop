// token stream facts: occupancy, allocation volume, contiguity, retention.
//
// read-only structural probe over the frozen corpus. it does not time
// anything, so it does not take the machine lock and is safe to run while
// another agent is benchmarking. every number in
// perf-findings/token-stream.md section 1 comes from here.
//
//   node perf-findings/facts.mjs [reference|worktree]
//
// defaults to the frozen reference build so the facts describe the
// unmodified library. pass `worktree` to see the same numbers after a change.

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { load_arm } from "../lib/bench/perf/arm.mjs";
import { corpus } from "../lib/bench/perf/corpus.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const worktree_root = resolve(here, "..");
const reference_root = "/Users/peterallen/Projects/twinkleplop/.perf/baseline";

const which = process.argv[2] ?? "reference";
const root = which === "worktree" ? worktree_root : reference_root;
const arm = await load_arm(root, which);

const pct = (x) => (x * 100).toFixed(1) + "%";
const kb = (x) => (x / 1024).toFixed(1);

const rows = [];

for (const entry of corpus({})) {
  const mod = arm.languages[entry.lang];
  if (!mod || !mod.grammar) continue;
  const src = entry.source;
  const len = src.length;
  const t = arm.core.tokenize(src, mod.grammar).tokens;
  const n = t.length / 3;

  // occupancy: the tokenizer sizes its scratch at 3 slots per input char.
  const alloc_slots = len * 3;

  // contiguity. pair 0 is the leading gap between offset 0 and the first
  // token, so every token contributes exactly one pair.
  let contig = 0;
  let gaps = 0;
  let gap_bytes = 0;
  let overlaps = 0;
  let unordered = 0;
  let gap_nonws = 0;
  let max_token_len = 0;
  let prev_end = 0;
  for (let i = 0; i < n; i++) {
    const s = t[i * 3 + 1];
    const e = t[i * 3 + 2];
    if (e < s) unordered++;
    if (e - s > max_token_len) max_token_len = e - s;
    if (s === prev_end) contig++;
    else if (s > prev_end) {
      gaps++;
      gap_bytes += s - prev_end;
      if (/\S/.test(src.slice(prev_end, s))) gap_nonws++;
    } else overlaps++;
    prev_end = e;
  }

  const row = {
    id: entry.id,
    family: entry.family,
    lang: entry.lang,
    bytes: len,
    tokens: n,
    alloc_bytes: alloc_slots * 4,
    used_bytes: t.length * 4,
    pairs: n,
    contig,
    gaps,
    gap_bytes,
    gap_nonws,
    overlaps,
    unordered,
    max_token_len,
    scan_retained: t.buffer.byteLength,
    scan_live: t.byteLength,
  };

  if (typeof mod.tokenize === "function") {
    const p = mod.tokenize()(src).tokens;
    row.pipe_retained = p.buffer.byteLength;
    row.pipe_live = p.byteLength;
  }
  rows.push(row);
}

const sum = (list, k) => list.reduce((a, r) => a + (r[k] ?? 0), 0);

console.log(`arm: ${which} (${root})\n`);

console.log("=== 1.1 occupancy of the scan buffer ===");
console.log("family     files    source   allocated       used   occupancy    min    med    max  chars/tok");
for (const f of ["micro", "fixtures", "real", "scale"]) {
  const rs = rows.filter((r) => r.family === f);
  if (rs.length === 0) continue;
  const occs = rs.map((r) => r.used_bytes / r.alloc_bytes).sort((a, b) => a - b);
  console.log(
    `${f.padEnd(9)} ${String(rs.length).padStart(5)} ${kb(sum(rs, "bytes")).padStart(8)}K ${kb(sum(rs, "alloc_bytes")).padStart(10)}K ${kb(sum(rs, "used_bytes")).padStart(9)}K ${pct(sum(rs, "used_bytes") / sum(rs, "alloc_bytes")).padStart(9)} ${pct(occs[0]).padStart(6)} ${pct(occs[occs.length >> 1]).padStart(6)} ${pct(occs[occs.length - 1]).padStart(6)} ${(sum(rs, "bytes") / sum(rs, "tokens")).toFixed(2).padStart(10)}`,
  );
}
console.log(
  `${"ALL".padEnd(9)} ${String(rows.length).padStart(5)} ${kb(sum(rows, "bytes")).padStart(8)}K ${kb(sum(rows, "alloc_bytes")).padStart(10)}K ${kb(sum(rows, "used_bytes")).padStart(9)}K ${pct(sum(rows, "used_bytes") / sum(rows, "alloc_bytes")).padStart(9)}`,
);

console.log("\n=== 1.2 allocation volume, real family ===");
for (const r of rows.filter((x) => x.family === "real").sort((a, b) => b.bytes - a.bytes)) {
  console.log(
    `  ${r.id.padEnd(26)} bytes=${String(r.bytes).padStart(7)} tokens=${String(r.tokens).padStart(6)} alloc=${kb(r.alloc_bytes).padStart(8)}K used=${kb(r.used_bytes).padStart(7)}K occ=${pct(r.used_bytes / r.alloc_bytes).padStart(6)}`,
  );
}

console.log("\n=== 1.3 contiguity ===");
console.log("family     tokens     pairs  contiguous     gapped   gap bytes  % of source");
for (const f of ["micro", "fixtures", "real", "scale"]) {
  const rs = rows.filter((r) => r.family === f);
  if (rs.length === 0) continue;
  const p = sum(rs, "pairs");
  console.log(
    `${f.padEnd(9)} ${String(sum(rs, "tokens")).padStart(7)} ${String(p).padStart(9)} ${pct(sum(rs, "contig") / p).padStart(11)} ${pct(sum(rs, "gaps") / p).padStart(10)} ${String(sum(rs, "gap_bytes")).padStart(11)} ${pct(sum(rs, "gap_bytes") / sum(rs, "bytes")).padStart(12)}`,
  );
}
const P = sum(rows, "pairs");
console.log(
  `${"ALL".padEnd(9)} ${String(sum(rows, "tokens")).padStart(7)} ${String(P).padStart(9)} ${pct(sum(rows, "contig") / P).padStart(11)} ${pct(sum(rows, "gaps") / P).padStart(10)} ${String(sum(rows, "gap_bytes")).padStart(11)}`,
);
console.log(
  `overlaps=${sum(rows, "overlaps")} out_of_order=${sum(rows, "unordered")}  ` +
    `gaps containing non-whitespace: ${sum(rows, "gap_nonws")} of ${sum(rows, "gaps")} (${pct(sum(rows, "gap_nonws") / sum(rows, "gaps"))})`,
);

console.log("\n=== 1.4 max token length ===");
const longest = rows.reduce((a, b) => (b.max_token_len > a.max_token_len ? b : a));
console.log(`  ${longest.max_token_len} chars, in ${longest.id}`);

console.log("\n=== 1.5 retention ===");
const sr = sum(rows, "scan_retained");
const sl = sum(rows, "scan_live");
console.log(`  tokenize results: retained=${kb(sr)}K live=${kb(sl)}K overhead=${(sr / sl).toFixed(2)}x`);
const pipe = rows.filter((r) => r.pipe_live !== undefined);
const pr = sum(pipe, "pipe_retained");
const pl = sum(pipe, "pipe_live");
console.log(`  pipeline results: retained=${kb(pr)}K live=${kb(pl)}K overhead=${(pr / pl).toFixed(2)}x`);
const oversized = pipe.filter((r) => r.pipe_retained > r.pipe_live);
console.log(`  pipeline results still holding an oversized buffer: ${oversized.length} of ${pipe.length}`);
for (const r of oversized.sort((a, b) => b.pipe_retained - a.pipe_retained).slice(0, 8)) {
  console.log(
    `    ${r.id.padEnd(26)} retained=${kb(r.pipe_retained).padStart(8)}K live=${kb(r.pipe_live).padStart(7)}K waste=${pct(1 - r.pipe_live / r.pipe_retained)}`,
  );
}
