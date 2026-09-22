// Consumer check against packed npm artifacts.
//
// Everything else in this repo resolves `@twinkleplop/*` through the `source`
// export condition, straight to TypeScript in `src/`. That is the one thing a
// consumer installing from npm never does: they get `dist/`, reached through
// the `types`/`import` conditions, with the declaration bundle `build/dts.mjs`
// generated. A whole class of defect — an unparseable `.d.ts`, a missing
// `types` condition, an export pointing at a file that is not published — is
// invisible to `pnpm test` and breaks every consumer.
//
// So: pack every publishable package exactly as `pnpm publish` would, install
// the tarballs into a throwaway project with npm, and type-check and run real
// consumer code against them.
//
// Run `pnpm build` first — this packs whatever is in `dist/` right now.

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const fixtures = join(here, "consumer");

// the typescript a consumer compiles with, not the one the repo builds with:
// the point is to catch what someone on a current release would hit.
const TYPESCRIPT = "typescript@5.9.3";

// a failing step has already printed whatever a reader needs (tsc diagnostics,
// an assertion, npm's error). re-throwing on top of that buries it under a node
// stack trace, so fail with one line naming the step instead.
function run(cmd, args, opts = {}) {
  const { step, ...rest } = opts;
  try {
    return execFileSync(cmd, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
      ...rest,
    });
  } catch (error) {
    if (!step) throw error;
    console.error(`\ncheck:packed failed: ${step}`);
    process.exit(1);
  }
}

// -- work out what actually ships ------------------------------------------

function publishable() {
  const found = [];
  for (const group of ["lib", "languages"]) {
    for (const entry of readdirSync(join(repo, group), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = join(repo, group, entry.name);
      let pkg;
      try {
        pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      } catch {
        continue;
      }
      if (pkg.private || !pkg.name) continue;
      found.push({ name: pkg.name, dir, exports: pkg.exports ?? {} });
    }
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

const packages = publishable();
if (packages.length === 0) throw new Error("found no publishable packages to check");

const work = mkdtempSync(join(tmpdir(), "twinkleplop-pack-check-"));
process.on("exit", () => rmSync(work, { recursive: true, force: true }));

const tarballs = join(work, "tarballs");
const consumer = join(work, "consumer");
mkdirSync(tarballs, { recursive: true });
mkdirSync(consumer, { recursive: true });

// -- pack -------------------------------------------------------------------

console.log(`packing ${packages.length} packages`);
for (const pkg of packages) {
  // `pnpm pack` rewrites `workspace:*` to the real version, the way publishing
  // does; `npm pack` leaves it in place and the install then fails.
  run("pnpm", ["pack", "--pack-destination", tarballs], {
    cwd: pkg.dir,
    step: `packing ${pkg.name}`,
  });
}

const packed = readdirSync(tarballs)
  .filter((f) => f.endsWith(".tgz"))
  .map((f) => join(tarballs, f));

if (packed.length !== packages.length) {
  throw new Error(`packed ${packed.length} tarballs for ${packages.length} packages`);
}

// -- install into a clean project -------------------------------------------

writeFileSync(
  join(consumer, "package.json"),
  JSON.stringify(
    { name: "twinkleplop-consumer-check", private: true, type: "module", version: "0.0.0" },
    null,
    2,
  ),
);

console.log("installing tarballs with npm");
run(
  "npm",
  ["install", "--no-audit", "--no-fund", "--install-strategy=nested", ...packed, TYPESCRIPT],
  {
    cwd: consumer,
    stdio: ["ignore", "ignore", "inherit"],
    step: "installing the packed tarballs — an export may point at a file that is not published",
  },
);

// -- contents ---------------------------------------------------------------

// only dist ships
// sourcemaps would embed a second copy of the source
// tsc below resolves only the types condition so other export targets are checked here
const ALWAYS_PACKED = /^(package\.json|readme(\.md)?|licen[cs]e(\.md)?)$/i;

function files_in(dir, prefix = "") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules") return [];
    const path = `${prefix}${entry.name}`;
    return entry.isDirectory() ? files_in(join(dir, entry.name), `${path}/`) : [path];
  });
}

function export_targets(value, condition = "default") {
  if (typeof value === "string") return [[condition, value]];
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, inner]) =>
    export_targets(inner, key.startsWith(".") ? condition : key),
  );
}

const problems = [];
for (const pkg of packages) {
  const dir = join(consumer, "node_modules", pkg.name);
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  for (const file of files_in(dir)) {
    if (ALWAYS_PACKED.test(file)) continue;
    if (!file.startsWith("dist/") || file.endsWith(".map")) {
      problems.push(`${pkg.name} packs ${file}`);
    }
  }
  const named = export_targets(manifest.exports ?? {});
  if (manifest.main) named.push(["main", manifest.main]);
  if (manifest.types) named.push(["types", manifest.types]);
  for (const [condition, target] of named) {
    if (condition === "source") {
      problems.push(`${pkg.name} publishes a \`source\` condition for ${target}`);
    } else if (!existsSync(join(dir, target))) {
      problems.push(`${pkg.name} names ${target} (${condition}), which is not packed`);
    }
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  console.error("\ncheck:packed failed: packed contents (see above)");
  process.exit(1);
}

// -- fixtures ---------------------------------------------------------------

cpSync(fixtures, consumer, { recursive: true });

// every publishable entry point that claims to have types has to actually
// resolve. generated rather than hand-listed so a new package or subpath is
// covered the day it is added.
const lines = [
  "// generated by build/pack-check.mjs — every published entry point with a `types` condition.",
  "",
];
let n = 0;
for (const pkg of packages) {
  for (const [subpath, condition] of Object.entries(pkg.exports)) {
    if (typeof condition !== "object" || condition === null || !condition.types) continue;
    const specifier = subpath === "." ? pkg.name : `${pkg.name}/${subpath.slice(2)}`;
    lines.push(`import * as m${n} from ${JSON.stringify(specifier)};`);
    n++;
  }
}
lines.push(
  "",
  `export const entry_points = [${Array.from({ length: n }, (_, i) => `m${i}`).join(", ")}];`,
);
writeFileSync(join(consumer, "every-entry-point.ts"), lines.join("\n") + "\n");
console.log(`checking ${n} typed entry points across ${packages.length} packages`);

// -- type-check -------------------------------------------------------------

const tsc = join(consumer, "node_modules", ".bin", "tsc");
const ts_fixtures = readdirSync(consumer).filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"));

// NodeNext is what a consumer on modern node resolves with, and it is the mode
// that reads export conditions the way node does. strict, because a missing
// declaration silently degrades to `any` without noImplicitAny and a permissive
// compile would then prove nothing.
console.log("type-checking consumer fixtures");
run(
  tsc,
  [
    "--noEmit",
    "--strict",
    "--skipLibCheck",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    "--target",
    "es2022",
    ...ts_fixtures,
  ],
  {
    cwd: consumer,
    stdio: ["ignore", "inherit", "inherit"],
    step: "type-checking against the published declarations (see the diagnostics above)",
  },
);

// -- run --------------------------------------------------------------------

console.log("running consumer fixtures");
for (const fixture of readdirSync(consumer).filter((f) => f.endsWith(".mjs"))) {
  process.stdout.write(run("node", [fixture], { cwd: consumer, step: `running ${fixture}` }));
}

console.log("\npacked artifacts are consumable");
