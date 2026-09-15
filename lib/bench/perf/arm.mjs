// an "arm" is one built checkout of the library.
//
// A/B comparison loads two arms into the SAME node process and interleaves
// their measurements. that is the whole point: thermal state, background
// load, allocator state and V8 tier-up all drift over the seconds a run
// takes, and comparing a number captured now against a number captured in a
// previous process is comparing two different machines. interleaving makes
// the drift common-mode.
//
// loading two arms works because each is a complete checkout with its own
// node_modules: importing <root>/languages/go/dist/index.js resolves its bare
// "@twinkleplop/core" specifier relative to that file, which walks up to that
// root's own workspace link. node caches ESM by resolved URL, so the two
// module graphs never touch.

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const LANGUAGES = [
  "bash",
  "css",
  "diff",
  "diff-basic",
  "go",
  "html",
  "javascript",
  "json",
  "markdown",
  "python",
  "rust",
  "sql",
  "svelte",
  "toml",
  "tsx",
  "typescript",
  "whitespace",
  "yaml",
];

async function import_optional(path) {
  if (!existsSync(path)) return null;
  try {
    return await import(pathToFileURL(path).href);
  } catch (err) {
    return { __load_error: err };
  }
}

/**
 * Load one built checkout.
 *
 * `root` is the repo root of that checkout. It must already be built:
 * dist artifacts are what consumers import, and measuring the TypeScript
 * sources through a transform pipeline would measure the transform.
 */
export async function load_arm(root, label) {
  root = resolve(root);
  const core_path = join(root, "lib/core/dist/twinkleplop.production.js");
  if (!existsSync(core_path)) {
    throw new Error(
      `arm "${label}" at ${root} is not built (missing ${core_path}).\n` +
        `run: cd ${root} && pnpm build`,
    );
  }

  const core = await import(pathToFileURL(core_path).href);
  const compiler = await import(
    pathToFileURL(join(root, "lib/core/dist/twinkleplop.compiler.js")).href
  );
  const annotation = await import_optional(join(root, "lib/annotation/dist/index.js"));

  const languages = {};
  const missing = [];
  for (const name of LANGUAGES) {
    const mod = await import_optional(join(root, "languages", name, "dist/index.js"));
    if (mod === null) {
      missing.push(name);
      continue;
    }
    if (mod.__load_error) {
      missing.push(`${name} (${mod.__load_error.message})`);
      continue;
    }
    languages[name] = mod;
  }

  return {
    label,
    root,
    core,
    compiler,
    annotation: annotation && !annotation.__load_error ? annotation : null,
    languages,
    missing,
  };
}

/**
 * Both arms must expose the same surface for a comparison to mean anything.
 * A candidate that dropped an export would otherwise silently shrink the
 * workload set and look faster.
 */
export function assert_arms_comparable(a, b) {
  const problems = [];
  const a_langs = Object.keys(a.languages).sort().join(",");
  const b_langs = Object.keys(b.languages).sort().join(",");
  if (a_langs !== b_langs) {
    problems.push(`language sets differ:\n  ${a.label}: ${a_langs}\n  ${b.label}: ${b_langs}`);
  }
  for (const name of Object.keys(a.languages)) {
    if (!b.languages[name]) continue;
    const ax = Object.keys(a.languages[name]).sort();
    const bx = Object.keys(b.languages[name]).sort();
    const dropped = ax.filter((k) => !bx.includes(k));
    if (dropped.length > 0) {
      problems.push(
        `${name}: ${b.label} is missing exports present in ${a.label}: ${dropped.join(", ")}`,
      );
    }
  }
  const core_dropped = Object.keys(a.core).filter((k) => !(k in b.core));
  if (core_dropped.length > 0) {
    problems.push(
      `core: ${b.label} is missing exports present in ${a.label}: ${core_dropped.join(", ")}`,
    );
  }
  return problems;
}
