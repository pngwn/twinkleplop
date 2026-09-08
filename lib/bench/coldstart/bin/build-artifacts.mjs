// build the comparison artifacts the cold start experiments need.
//
// the per-language dist files are what node resolves through pnpm symlinks
// and package exports maps, one module graph node at a time. a browser or
// edge consumer never does that: their bundler flattens the whole graph at
// build time and ships one chunk. measuring only the unbundled form would
// therefore attribute node's module resolution to this library.
//
// so this produces, into .artifacts/:
//   docs-dist.js     the shipped dist files concatenated, code unchanged
//   docs-bundle.js   the same graph rebuilt from source, eager compile
//   docs-lazy.js     the same, with compile() deferred to first use
//
// all three use identical bundler settings, so docs-dist against the unbundled
// import isolates node's module resolution, docs-bundle against docs-dist
// isolates the bundler, and docs-lazy against docs-bundle isolates laziness.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DOCS_BUNDLE } from "../scenarios.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const coldstart_root = resolve(here, "..");
const root = resolve(here, "../../../..");
const out_dir = join(coldstart_root, ".artifacts");

function find_esbuild() {
  const store = join(root, "node_modules/.pnpm");
  const candidates = readdirSync(store)
    .filter((d) => d.startsWith("esbuild@"))
    .sort()
    .reverse();
  for (const c of candidates) {
    const bin = join(store, c, "node_modules/esbuild/bin/esbuild");
    try {
      execFileSync(bin, ["--version"], { stdio: "ignore" });
      return bin;
    } catch {
      // wrong platform build or missing binary; try the next one.
    }
  }
  throw new Error("no working esbuild in the pnpm store");
}

const esbuild = find_esbuild();
mkdirSync(out_dir, { recursive: true });

// both entries are built from the language sources, not from the per-language
// dist files. building the lazy one from dist would be a lie: dist/index.js
// runs compile() at module scope, so importing it defeats the laziness being
// measured. same inputs and same bundler settings for both means the only
// difference is when compile() runs.
const lang_src = (l) => JSON.stringify(join(root, "languages", l, "src/index.ts"));
const grammar_src = (l) => JSON.stringify(join(root, "languages", l, "src/grammar.ts"));
// json ships a grammar with no reclassifier stack, so the import has to be
// conditional rather than assumed.
const has_reclass = (l) => existsSync(join(root, "languages", l, "src/reclassifiers.ts"));
const reclass_src = (l) => JSON.stringify(join(root, "languages", l, "src/reclassifiers.ts"));

const eager_entry = join(out_dir, "entry-eager.ts");
writeFileSync(
  eager_entry,
  `${DOCS_BUNDLE.map((l, i) => `import * as m${i} from ${lang_src(l)};`).join("\n")}
export const languages = { ${DOCS_BUNDLE.map((l, i) => `${JSON.stringify(l)}: m${i}`).join(", ")} };
`,
);

// the lazy entry pulls in each language's raw grammar and reclassifiers but
// defers compile() until the language is first asked for. note the api cost:
// `grammar` stops being a value export and becomes a call, because an esm
// named export cannot be a lazily evaluated getter.
const lazy_entry = join(out_dir, "entry-lazy.ts");
writeFileSync(
  lazy_entry,
  `import { create_language } from "@twinkleplop/core";
import { compile } from "@twinkleplop/core/compile";
${DOCS_BUNDLE.map((l, i) => `import g${i} from ${grammar_src(l)};`).join("\n")}
${DOCS_BUNDLE.filter(has_reclass)
  .map((l) => `import { reclassifiers as r_${l} } from ${reclass_src(l)};`)
  .join("\n")}

const raw = { ${DOCS_BUNDLE.map((l, i) => `${JSON.stringify(l)}: [g${i}, ${has_reclass(l) ? `r_${l}` : "[]"}]`).join(", ")} };
const cache = new Map();
export function get(lang) {
  let hit = cache.get(lang);
  if (hit === undefined) {
    const [g, r] = raw[lang];
    hit = create_language(compile(g), r ?? []);
    cache.set(lang, hit);
  }
  return hit;
}
export const languages = raw;
`,
);

// a third artifact: the same eager graph, but concatenated from the shipped
// dist files rather than rebuilt from source. comparing this against the
// unbundled import isolates node's module resolution, because the code inside
// is byte for byte what the unbundled case runs. comparing it against
// docs-bundle isolates the bundler instead.
const dist_entry = join(out_dir, "entry-dist.js");
writeFileSync(
  dist_entry,
  `${DOCS_BUNDLE.map((l, i) => `import * as m${i} from ${JSON.stringify(join(root, "languages", l, "dist/index.js"))};`).join("\n")}
export const languages = { ${DOCS_BUNDLE.map((l, i) => `${JSON.stringify(l)}: m${i}`).join(", ")} };
`,
);

for (const [entry, name] of [
  [eager_entry, "docs-bundle"],
  [lazy_entry, "docs-lazy"],
  [dist_entry, "docs-dist"],
]) {
  execFileSync(esbuild, [
    entry,
    "--bundle",
    "--format=esm",
    "--platform=node",
    "--minify",
    `--outfile=${join(out_dir, `${name}.js`)}`,
  ]);
}

process.stdout.write(`artifacts in ${out_dir}\n`);
for (const f of readdirSync(out_dir)) process.stdout.write(`  ${f}\n`);
