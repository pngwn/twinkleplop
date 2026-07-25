#!/usr/bin/env node
// corpus builder. run once to (re)generate the frozen benchmark corpus.
//
// the corpus is checked in so every arm of every A/B measures byte-identical
// input. regenerating it invalidates comparisons against older reports, which
// is why the manifest records a content hash per file and the A/B runner
// refuses to compare reports built from different corpus hashes.
//
// four families, each answering a different question:
//
//   micro/     one short snippet per language, 200-900 bytes. the docs-site
//              case: many tiny highlights where fixed per-call cost
//              (buffer allocation, pipeline setup, closure dispatch)
//              dominates and the scanning loop barely runs.
//
//   fixtures/  concatenation of a language's own test fixtures. grammar
//              feature dense: probe paths, escapes, edge cases. these are
//              the cold paths a "make the common case fast" change is most
//              likely to silently break or slow down.
//
//   real/      production shaped source. sourced from this repo where the
//              language is one we actually write here, hand authored under
//              corpus/seed/ otherwise. these carry the hot path weighting a
//              real consumer sees, and are the headline numbers.
//
//   scale/     ~200KB per language, built by cycling that language's
//              distinct files. deliberately synthetic: it answers "how does
//              cost grow with input length" (allocation, superlinear
//              scans, table pressure), not "how fast is real code". do not
//              quote scale numbers as user-facing wins.

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const perf_dir = resolve(here, "..");
const repo_root = resolve(perf_dir, "../../..");
const corpus_dir = join(perf_dir, "corpus");
const seed_dir = join(corpus_dir, "seed");

// language -> extension used for the generated fixture bundle. the fixture
// inputs themselves are detected by "not a .js file", which holds for every
// language's test directory convention (some use `<name>.output.js` next to
// `<name>.<ext>`, the js family uses `<name>.js` next to `<name>.txt`).
const FIXTURE_EXT = {
  bash: "sh",
  css: "css",
  diff: "diff",
  "diff-basic": "txt",
  go: "go",
  html: "html",
  javascript: "js",
  json: "json",
  markdown: "md",
  python: "py",
  rust: "rs",
  sql: "sql",
  svelte: "svelte",
  toml: "toml",
  tsx: "tsx",
  typescript: "ts",
  whitespace: "txt",
  yaml: "yaml",
};

// real-world sources pulled from this repo. [lang, out_name, [paths...]].
// concatenated in order. paths are repo relative.
const REPO_REAL = [
  [
    "typescript",
    "core-runtime.ts",
    ["lib/core/src/tokenizer.ts", "lib/core/src/scan.ts", "lib/core/src/compiler.ts"],
  ],
  [
    "typescript",
    "core-frames.ts",
    [
      "lib/core/src/frame_track.ts",
      "lib/core/src/fidelity.ts",
      "lib/core/src/matched_bracket.ts",
      "lib/core/src/compound_compose.ts",
    ],
  ],
  ["typescript", "core-types.ts", ["lib/core/src/types.ts"]],
  [
    "javascript",
    "bench-suite.js",
    [
      "lib/bench/src/library/tokenization-suite.bench.js",
      "lib/bench/src/library/micro-optimizations.bench.js",
      "lib/bench/src/library/data-structures-suite.bench.js",
    ],
  ],
  ["markdown", "architecture.md", ["architecture.md"]],
  ["markdown", "grammar-docs.md", ["grammar.md", "TRANSFORMER_SPEC.md"]],
  ["json", "compiled-grammar.json", ["compiled-json-grammar.json"]],
  [
    "css",
    "site.css",
    [
      "lib/_site/src/app.css",
      "lib/_site/src/lib/styles/docs.css",
      "lib/_site/src/lib/styles/explore.css",
    ],
  ],
  ["yaml", "ci.yaml", [".github/workflows/ci-tests.yml", ".github/workflows/release.yml"]],
  ["html", "app.html", ["lib/_site/src/app.html"]],
];

function sha256(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function read_if(path) {
  const full = join(repo_root, path);
  if (!existsSync(full)) {
    console.warn(`  skip (missing): ${path}`);
    return null;
  }
  return readFileSync(full, "utf8");
}

// concatenating svelte components would produce a file with several <script>
// and <style> blocks, which is not valid svelte and would exercise the
// embedder differently than a real component. joined with a comment banner
// for every other language.
function join_sources(lang, parts) {
  const banner = {
    css: (n) => `/* ---- ${n} ---- */`,
    js: (n) => `// ---- ${n} ----`,
    md: (n) => `\n<!-- ---- ${n} ---- -->\n`,
    hash: (n) => `# ---- ${n} ----`,
  };
  const pick = {
    typescript: banner.js,
    javascript: banner.js,
    tsx: banner.js,
    go: banner.js,
    rust: banner.js,
    css: banner.css,
    markdown: banner.md,
    python: banner.hash,
    bash: banner.hash,
    yaml: banner.hash,
    toml: banner.hash,
    sql: (n) => `-- ---- ${n} ----`,
  }[lang];
  if (!pick) return parts.map((p) => p.text).join("\n");
  return parts.map((p) => `${pick(p.name)}\n${p.text}`).join("\n\n");
}

function build_fixtures() {
  const out = [];
  const langs_dir = join(repo_root, "languages");
  for (const lang of readdirSync(langs_dir).sort()) {
    const test_dir = join(langs_dir, lang, "test");
    if (!existsSync(test_dir) || !statSync(test_dir).isDirectory()) continue;
    const inputs = readdirSync(test_dir)
      .filter((f) => !f.endsWith(".js"))
      .sort();
    if (inputs.length === 0) continue;
    const parts = inputs.map((f) => ({ name: f, text: readFileSync(join(test_dir, f), "utf8") }));
    const ext = FIXTURE_EXT[lang] ?? "txt";
    // json has no comment syntax, so a concatenated bundle would be invalid.
    // wrap the fixtures as an array of strings instead? no - the grammar is
    // what we are measuring, and a bare concatenation still exercises every
    // state. keep raw concatenation and accept that it is not parseable json.
    const text = join_sources(lang, parts);
    out.push({ family: "fixtures", lang, file: `${lang}.${ext}`, text, sources: inputs });
  }
  return out;
}

function build_repo_real() {
  const out = [];
  for (const [lang, name, paths] of REPO_REAL) {
    const parts = [];
    for (const p of paths) {
      const text = read_if(p);
      if (text !== null) parts.push({ name: p, text });
    }
    if (parts.length === 0) continue;
    out.push({ family: "real", lang, file: name, text: join_sources(lang, parts), sources: paths });
  }
  // svelte components stay whole: concatenation would not be a valid component.
  const svelte_src = join(repo_root, "lib/_site/src/lib/components");
  if (existsSync(svelte_src)) {
    const picks = ["TweaksPanel.svelte", "InspectorPanel.svelte", "CodePanel.svelte"];
    for (const p of picks) {
      const full = join(svelte_src, p);
      if (!existsSync(full)) continue;
      out.push({
        family: "real",
        lang: "svelte",
        file: `site-${p.toLowerCase()}`,
        text: readFileSync(full, "utf8"),
        sources: [`lib/_site/src/lib/components/${p}`],
      });
    }
  }
  return out;
}

// hand authored realistic sources for the languages this repo does not write
// in. checked in under corpus/seed/ and copied through verbatim.
function build_seed_real() {
  if (!existsSync(seed_dir)) return [];
  const out = [];
  for (const lang of readdirSync(seed_dir).sort()) {
    const dir = join(seed_dir, lang);
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir).sort()) {
      out.push({
        family: "real",
        lang,
        file: f,
        text: readFileSync(join(dir, f), "utf8"),
        sources: [`corpus/seed/${lang}/${f}`],
      });
    }
  }
  return out;
}

// the docs-site case: one short snippet per language. the explore demos are
// already exactly this shape, so they are the source of truth rather than a
// truncation of something bigger (a truncated Go file is all imports).
function build_micro() {
  const out = [];
  const demo_dir = join(repo_root, "lib/_site/src/lib/explore/demos");
  const demo_lang = {
    "javascript.txt": ["javascript", "js"],
    "typescript.txt": ["typescript", "ts"],
    "tsx.txt": ["tsx", "tsx"],
    "whitespace.txt": ["whitespace", "txt"],
    "diff-basic.txt": ["diff-basic", "txt"],
  };
  if (existsSync(demo_dir)) {
    for (const f of readdirSync(demo_dir).sort()) {
      const ext = f.split(".").pop();
      const [lang, out_ext] = demo_lang[f] ?? [f.slice(0, -(ext.length + 1)), ext];
      out.push({
        family: "micro",
        lang,
        file: `${lang}.${out_ext}`,
        text: readFileSync(join(demo_dir, f), "utf8"),
        sources: [`lib/_site/src/lib/explore/demos/${f}`],
      });
    }
  }
  // the demo set has no json entry.
  out.push({
    family: "micro",
    lang: "json",
    file: "json.json",
    text: `{
  "name": "@acme/edge-router",
  "version": "0.14.3",
  "private": false,
  "exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } },
  "scripts": { "build": "tsc -p tsconfig.build.json", "test": "vitest run" },
  "dependencies": { "hyperid": "^3.2.0", "undici": "^6.19.8" },
  "engines": { "node": ">=20.11" },
  "keywords": ["proxy", "edge", "http"]
}
`,
    sources: ["hand authored"],
  });
  return out;
}

// synthesise the scale tier by cycling a language's distinct files until the
// target size is reached. cycling several distinct files rather than
// repeating one block keeps the inline caches and branch predictors from
// seeing a single trivially predictable pattern, but this tier is still
// synthetic by construction: it exists to expose growth in cost with input
// length, not to stand in for a real 200KB file.
function build_scale(entries, target_bytes = 200_000) {
  const by_lang = new Map();
  for (const e of entries) {
    if (!by_lang.has(e.lang)) by_lang.set(e.lang, []);
    by_lang.get(e.lang).push(e);
  }
  const out = [];
  for (const [lang, list] of by_lang) {
    const pool = list.filter((e) => e.text.length > 150);
    if (pool.length === 0) continue;
    const parts = [];
    let size = 0;
    for (let i = 0; size < target_bytes && i < 2000; i++) {
      const text = pool[i % pool.length].text;
      parts.push(text);
      size += text.length + 2;
    }
    const ext = pool[0].file.split(".").pop();
    out.push({
      family: "scale",
      lang,
      file: `${lang}.${ext}`,
      text: parts.join("\n\n"),
      sources: [`${pool.length} distinct sources cycled to ~${Math.round(target_bytes / 1000)}k`],
    });
  }
  return out;
}

const micro = build_micro();
const fixtures = build_fixtures();
const real = [...build_repo_real(), ...build_seed_real()];
const scale = build_scale([...fixtures, ...real]);
const all = [...micro, ...fixtures, ...real, ...scale];

for (const family of ["micro", "fixtures", "real", "scale"]) {
  const dir = join(corpus_dir, family);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });
}

const manifest = [];
for (const e of all) {
  const dir = join(corpus_dir, e.family);
  writeFileSync(join(dir, e.file), e.text);
  manifest.push({
    family: e.family,
    lang: e.lang,
    file: e.file,
    bytes: Buffer.byteLength(e.text),
    lines: e.text.split("\n").length,
    hash: sha256(e.text),
    sources: e.sources,
  });
}

manifest.sort(
  (a, b) =>
    a.family.localeCompare(b.family) ||
    a.lang.localeCompare(b.lang) ||
    a.file.localeCompare(b.file),
);
const corpus_hash = sha256(manifest.map((m) => `${m.family}/${m.file}:${m.hash}`).join("\n"));
writeFileSync(
  join(corpus_dir, "manifest.json"),
  `${JSON.stringify({ corpus_hash, generated_from: "bin/build-corpus.mjs", entries: manifest }, null, 2)}\n`,
);

const by_family = {};
for (const m of manifest) {
  by_family[m.family] ??= { n: 0, bytes: 0 };
  by_family[m.family].n++;
  by_family[m.family].bytes += m.bytes;
}
console.log(`corpus_hash ${corpus_hash}`);
for (const [f, s] of Object.entries(by_family)) {
  console.log(`  ${f.padEnd(9)} ${String(s.n).padStart(3)} files  ${(s.bytes / 1024).toFixed(0)}k`);
}
console.log(`  ${"total".padEnd(9)} ${String(manifest.length).padStart(3)} files`);
