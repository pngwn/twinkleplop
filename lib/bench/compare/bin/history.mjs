#!/usr/bin/env node
// records a published comparison run in the version history the site charts
//
//   node lib/bench/compare/bin/history.mjs [options]
//
// options:
//   --from <path>   comparison run to record (default: lib/bench/published/comparison.json)
//   --out <path>    history file (default: lib/bench/published/history.json)
//
// keeps per cell medians of every library, one entry per commit, the other
// libraries stay put so their moves show the machine share of a change

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const published = resolve(here, "../../published");

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const from = resolve(opt("from", resolve(published, "comparison.json")));
const out = resolve(opt("out", resolve(published, "history.json")));

const run = JSON.parse(readFileSync(from, "utf8"));
const { meta } = run;

if (!meta.commit) {
  console.error(`${from} records no commit, so it cannot be placed in the history`);
  process.exit(1);
}

const cells = {};
for (const cell of run.results) {
  const size = cell.corpus === "upstream" ? "upstream" : (cell.tier ?? "medium");
  const row = {};
  for (const lib of cell.libraries) row[lib.id] = Math.round(lib.ns_per_op);
  cells[`${cell.lang}:${size}:${cell.mode}`] = row;
}

const entry = {
  version: meta.libraries.find((l) => l.id === "twinkleplop")?.version ?? null,
  commit: meta.commit,
  commit_subject: meta.commit_subject ?? null,
  generated_at: meta.generated_at,
  runner: meta.runner,
  cpu: meta.cpu,
  node: meta.node,
  corpus_hash: meta.corpus_hash,
  anchor_stable: meta.anchor?.stable ?? null,
  libraries: Object.fromEntries(meta.libraries.map((l) => [l.id, l.version])),
  cells,
};

const history = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : { entries: [] };
history.entries = history.entries.filter((e) => e.commit !== entry.commit);
history.entries.push(entry);
history.entries.sort((a, b) => a.generated_at.localeCompare(b.generated_at));

writeFileSync(out, `${JSON.stringify(history, null, 2)}\n`);
console.log(
  `recorded ${entry.version} at ${entry.commit.slice(0, 8)} (${Object.keys(cells).length} cells), ${history.entries.length} entries in ${out}`,
);
