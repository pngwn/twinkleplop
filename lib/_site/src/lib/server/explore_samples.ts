// sample sources for the explore lab. every language ships a `demo` snippet
// under lib/_site/src/lib/explore/demos/<lang>.<ext> that exercises most token
// types, and a language with fixture tests adds each fixture input under
// languages/<lang>/test/ as a further sample.

import fs from "node:fs";
import path from "node:path";

function find_root(from: string): string {
  let current = path.resolve(from);
  while (!fs.existsSync(path.join(current, "pnpm-lock.yaml"))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error(`no pnpm-lock.yaml above ${from}`);
    current = parent;
  }
  return current;
}

const ROOT = find_root(process.cwd());
const DEMOS_DIR = path.join(ROOT, "lib", "_site", "src", "lib", "explore", "demos");
const LANGUAGES_DIR = path.join(ROOT, "languages");

// url-facing sample names drop the trailing extension.
const strip_ext = (file: string) => file.replace(/\.[^.]+$/, "");

function list_dir(dir: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function demo_file(lang: string): string | undefined {
  return list_dir(DEMOS_DIR).find((entry) => entry.isFile() && strip_ext(entry.name) === lang)
    ?.name;
}

// .js files are snapshot outputs for assertion tests, not inputs.
function fixture_files(lang: string): string[] {
  return list_dir(path.join(LANGUAGES_DIR, lang, "test"))
    .filter((entry) => entry.isFile() && !entry.name.endsWith(".js"))
    .map((entry) => entry.name);
}

/** every sample for `lang` as `[name, source]`, the demo first. */
export function read_samples(lang: string): [string, string][] {
  // `lang` is a url param, so only a known language may name a directory:
  // `..%2F..` would otherwise walk out of languages/.
  if (!Object.hasOwn(list_samples(), lang)) return [];
  const samples: [string, string][] = [];
  const demo = demo_file(lang);
  if (demo) samples.push(["demo", fs.readFileSync(path.join(DEMOS_DIR, demo), "utf-8")]);
  for (const file of fixture_files(lang)) {
    const source = fs.readFileSync(path.join(LANGUAGES_DIR, lang, "test", file), "utf-8");
    samples.push([strip_ext(file), source]);
  }
  return samples;
}

/** sample names for every language that has a demo or fixtures, the demo first. */
export function list_samples(): Record<string, string[]> {
  const langs = new Set([
    ...list_dir(DEMOS_DIR)
      .filter((entry) => entry.isFile())
      .map((entry) => strip_ext(entry.name)),
    ...list_dir(LANGUAGES_DIR)
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  ]);
  const samples: Record<string, string[]> = {};
  for (const lang of langs) {
    const names = new Set<string>();
    if (demo_file(lang)) names.add("demo");
    for (const file of fixture_files(lang)) names.add(strip_ext(file));
    if (names.size > 0) samples[lang] = [...names];
  }
  return samples;
}
