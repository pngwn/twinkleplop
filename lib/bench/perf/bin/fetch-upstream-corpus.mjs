#!/usr/bin/env node
// vendor the sample files our competitors benchmark themselves on.
//
//   node lib/bench/perf/bin/fetch-upstream-corpus.mjs [--commit <sha>]
//
// shiki's own engine benchmark reads its inputs from
// `shikijs/textmate-grammars-themes/samples/<lang>.sample` - one short,
// grammar-feature-dense file per language, chosen by the shiki maintainers.
// running our corpus AND theirs answers the obvious objection to any
// self-published benchmark: that the inputs were picked to flatter us. we
// did not pick these.
//
// the files are vendored rather than fetched at run time, pinned to one
// commit and hashed, for the same reason the rest of the corpus is frozen:
// a comparison is only meaningful if both sides saw the same bytes, and an
// upstream that changes under us silently invalidates every earlier number.
// re-pin deliberately by passing --commit, never automatically.
//
// writes corpus/upstream/<our-lang>.<ext> plus corpus/upstream/UPSTREAM.json,
// then run bin/build-corpus.mjs to fold them into the manifest.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const corpus_dir = resolve(here, "../corpus");
const out_dir = join(corpus_dir, "upstream");

const REPO = "shikijs/textmate-grammars-themes";
const LICENSE = "MIT";
// pinned deliberately. bump with --commit and re-run build-corpus.mjs.
const DEFAULT_COMMIT = "45e292ef67d3a55911dfd02a5039dc238a07040c";

const argv = process.argv.slice(2);
const opt = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

const commit = opt("commit", DEFAULT_COMMIT);

// our language name -> [their sample name, extension we store it under].
//
// `diff-basic` and `whitespace` are twinkleplop's own constructs with no
// upstream counterpart, so the upstream family simply does not cover them.
// that is recorded rather than papered over: a family that silently omits a
// language would make a by-language geomean incomparable across families.
const LANGS = {
  bash: ["shellscript", "sh"],
  css: ["css", "css"],
  diff: ["diff", "diff"],
  go: ["go", "go"],
  html: ["html", "html"],
  javascript: ["javascript", "js"],
  json: ["json", "json"],
  markdown: ["markdown", "md"],
  python: ["python", "py"],
  rust: ["rust", "rs"],
  sql: ["sql", "sql"],
  svelte: ["svelte", "svelte"],
  toml: ["toml", "toml"],
  tsx: ["tsx", "tsx"],
  typescript: ["typescript", "ts"],
  yaml: ["yaml", "yaml"],
};

const sha256 = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);

async function fetch_sample(name) {
  const url = `https://raw.githubusercontent.com/${REPO}/${commit}/samples/${name}.sample`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status} ${res.statusText}`);
  return res.text();
}

console.log(`fetching upstream samples from ${REPO}@${commit.slice(0, 12)}`);

const entries = [];
for (const [lang, [upstream_name, ext]] of Object.entries(LANGS)) {
  const text = await fetch_sample(upstream_name);
  entries.push({
    lang,
    upstream: `samples/${upstream_name}.sample`,
    file: `${lang}.${ext}`,
    bytes: Buffer.byteLength(text),
    lines: text.split("\n").length,
    hash: sha256(text),
    text,
  });
  console.log(`  ${lang.padEnd(12)} ${String(Buffer.byteLength(text)).padStart(6)} bytes`);
}

// rewrite the directory wholesale so a language dropped from LANGS does not
// linger as an orphan file that build-corpus would still pick up.
if (existsSync(out_dir)) {
  for (const f of readdirSync(out_dir)) rmSync(join(out_dir, f), { recursive: true });
} else {
  mkdirSync(out_dir, { recursive: true });
}

for (const e of entries) writeFileSync(join(out_dir, e.file), e.text);

writeFileSync(
  join(out_dir, "UPSTREAM.json"),
  `${JSON.stringify(
    {
      repo: `https://github.com/${REPO}`,
      commit,
      license: LICENSE,
      fetched_at: new Date().toISOString(),
      note:
        "vendored verbatim. these are the sample files shiki's own benchmark uses, " +
        "included so our numbers can be checked against inputs we did not choose.",
      uncovered: ["diff-basic", "whitespace"],
      entries: entries.map(({ text, ...rest }) => rest),
    },
    null,
    2,
  )}\n`,
);

const total = entries.reduce((n, e) => n + e.bytes, 0);
console.log(`\n${entries.length} files, ${(total / 1024).toFixed(1)}k -> ${out_dir}`);
console.log("now run: node lib/bench/perf/bin/build-corpus.mjs");
