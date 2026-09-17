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
//
//   sized/     the same language at ~1KB, ~10KB and ~100KB. the other
//              families each fix a shape and vary the language; this one
//              fixes the language and varies the size, which is the axis a
//              reader of the published comparison charts actually cares
//              about ("is it still fast on a big file?"). built by cycling
//              whole units, so the same synthetic caveat as scale/ applies
//              to the two upper tiers.
//
//   upstream/  sample files vendored from shikijs/textmate-grammars-themes,
//              which is where shiki's own benchmark gets its inputs. we did
//              not choose these files, which is the entire point: it is the
//              one family that cannot have been selected to flatter us.
//              fetched by bin/fetch-upstream-corpus.mjs, pinned to a commit.

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

// an entry whose sources have since been deleted from the repo is FROZEN: its
// last generated output under corpus/real/ is carried forward verbatim, so a
// rebuild neither drops the workload nor changes its bytes.
const FROZEN = "frozen";

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
  ["javascript", "bench-suite.js", FROZEN],
  ["markdown", "architecture.md", FROZEN],
  ["markdown", "grammar-docs.md", FROZEN],
  ["json", "compiled-grammar.json", FROZEN],
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
  ["svelte", "site-inspectorpanel.svelte", FROZEN],
  ["svelte", "site-codepanel.svelte", FROZEN],
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
  const previous = JSON.parse(readFileSync(join(corpus_dir, "manifest.json"), "utf8")).entries;
  const out = [];
  for (const [lang, name, paths] of REPO_REAL) {
    if (paths === FROZEN) {
      const prior = previous.find((m) => m.family === "real" && m.file === name);
      out.push({
        family: "real",
        lang,
        file: name,
        text: readFileSync(join(corpus_dir, "real", name), "utf8"),
        sources: prior.sources,
      });
      continue;
    }
    const parts = [];
    for (const p of paths) {
      const text = read_if(p);
      if (text !== null) parts.push({ name: p, text });
    }
    if (parts.length === 0) continue;
    out.push({ family: "real", lang, file: name, text: join_sources(lang, parts), sources: paths });
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

// the published comparison charts vary size at a fixed language, so the
// corpus needs a tier that does the same. targets are ~1KB / ~10KB / ~100KB:
// 1KB is the docs-snippet case where fixed per-call cost still dominates,
// 10KB is an ordinary source file, 100KB is a large vendored one. those three
// span the range where the per-library curves actually cross.
//
// built by concatenating WHOLE units from the language's own pool rather than
// truncating to an exact byte count. a truncated file ends mid-construct - an
// unterminated string swallows everything after it into one token - which
// would measure a pathology rather than the language. the cost is that sizes
// land near the target rather than on it, so the achieved size is recorded in
// the manifest and the charts label the tier, not the byte count.
//
// the upper two tiers repeat their sources, and repetition is friendlier to
// branch predictors and inline caches than novel code of the same length is.
// cycling several DISTINCT files rather than one block limits that, but does
// not remove it: read these as "how does cost grow with length", the same
// caveat scale/ carries.
const SIZE_TIERS = [
  ["small", 1_000],
  ["medium", 10_000],
  ["large", 100_000],
];

function build_sized(entries) {
  const by_lang = new Map();
  for (const e of entries) {
    if (!by_lang.has(e.lang)) by_lang.set(e.lang, []);
    by_lang.get(e.lang).push(e);
  }

  const out = [];
  for (const [lang, list] of by_lang) {
    // smallest first, so a 1KB target is met by repeating a 300 byte snippet
    // rather than by emitting a single 5KB fixture bundle and calling it
    // "small". sorting also makes the output deterministic.
    const pool = [...list].sort(
      (a, b) => a.text.length - b.text.length || a.file.localeCompare(b.file),
    );
    if (pool.length === 0) continue;
    const ext = pool[pool.length - 1].file.split(".").pop();

    for (const [tier, target] of SIZE_TIERS) {
      // a unit larger than the whole tier can never be cycled into it
      // without blowing the target on its own, and because the pool is
      // sorted ascending it would otherwise land as the SECOND unit and end
      // the loop immediately - a 1KB tier made of one 300 byte snippet
      // because the next file up was 5KB. drop the oversized units first and
      // the tier is built from the ones that actually fit.
      const fits = pool.filter((u) => u.text.length <= target);
      const units = fits.length > 0 ? fits : [pool[0]];

      const parts = [];
      let size = 0;
      for (let i = 0; i < 10_000; i++) {
        const unit = units[i % units.length].text;
        // stop before a unit that would overshoot by more than half its own
        // length: whichever side of the target we land on, we land close.
        if (size > 0 && size + unit.length / 2 > target) break;
        parts.push(unit);
        size += unit.length + 2;
      }
      if (parts.length === 0) parts.push(units[0].text);
      const text = join_sources(
        lang,
        parts.map((t, i) => ({ name: `unit ${i + 1}`, text: t })),
      );
      out.push({
        family: "sized",
        lang,
        file: `${lang}.${tier}.${ext}`,
        text,
        sources: [
          `${tier} tier, target ~${target / 1000}KB, ` +
            `${parts.length} unit(s) cycled from ${pool.length} distinct source(s)`,
        ],
      });
    }
  }
  return out;
}

// vendored competitor samples. read straight off disk: they are fetched and
// pinned by bin/fetch-upstream-corpus.mjs and must pass through this builder
// byte for byte, because the claim attached to them is "these are shiki's own
// benchmark inputs, unmodified".
function build_upstream() {
  const dir = join(corpus_dir, "upstream");
  const stamp = join(dir, "UPSTREAM.json");
  if (!existsSync(stamp)) {
    console.warn("  skip upstream: run bin/fetch-upstream-corpus.mjs first");
    return [];
  }
  const meta = JSON.parse(readFileSync(stamp, "utf8"));
  const out = [];
  for (const e of meta.entries) {
    const full = join(dir, e.file);
    if (!existsSync(full)) {
      console.warn(`  skip upstream (missing): ${e.file}`);
      continue;
    }
    const text = readFileSync(full, "utf8");
    if (sha256(text) !== e.hash) {
      throw new Error(
        `upstream/${e.file} does not match UPSTREAM.json (${sha256(text)} != ${e.hash}).\n` +
          `these files are vendored verbatim; re-run bin/fetch-upstream-corpus.mjs ` +
          `rather than editing them.`,
      );
    }
    out.push({
      family: "upstream",
      lang: e.lang,
      file: e.file,
      text,
      sources: [`${meta.repo}@${meta.commit.slice(0, 12)} ${e.upstream}`],
    });
  }
  return out;
}

const micro = build_micro();
const fixtures = build_fixtures();
const real = [...build_repo_real(), ...build_seed_real()];
const scale = build_scale([...fixtures, ...real]);
const sized = build_sized([...micro, ...fixtures, ...real]);
const upstream = build_upstream();
const all = [...micro, ...fixtures, ...real, ...scale, ...sized, ...upstream];

// upstream/ is not regenerated here - it is vendored input, owned by
// bin/fetch-upstream-corpus.mjs - so it is deliberately absent from the wipe
// list. every other family is rebuilt from scratch so a renamed source
// cannot leave an orphan behind.
for (const family of ["micro", "fixtures", "real", "scale", "sized"]) {
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
