import fs from "node:fs";
import path from "node:path";

// project root -> languages/<lang>/test/
function walk_to_root(file_path: string) {
  let current_path = file_path;
  while (true) {
    if (fs.existsSync(path.join(current_path, "pnpm-lock.yaml"))) {
      return path.resolve(current_path);
    }
    current_path = path.join(current_path, "..");
  }
}

const PROJECT_ROOT = walk_to_root("");
const DEMOS_DIR = path.join(PROJECT_ROOT, "lib", "_site", "src", "lib", "explore", "demos");

// prepend the per-language demo snippet (if present) so it ranks first in
// the sample list and is visible as the landing sample at /explore/<lang>.
function get_demo_file(lang: string): [string, string] | null {
  if (!fs.existsSync(DEMOS_DIR)) return null;
  const match = fs.readdirSync(DEMOS_DIR).find((file) => file.replace(/\.[^.]+$/, "") === lang);
  if (!match) return null;
  return ["demo", fs.readFileSync(path.join(DEMOS_DIR, match), "utf-8")];
}

function get_test_files(lang: string) {
  try {
    const test_dir = path.join(PROJECT_ROOT, "languages", lang, "test");
    const test = fs.readdirSync(test_dir);
    const fixture_files = test
      // .js files are snapshot outputs for assertion tests, not inputs.
      .filter((file) => !file.endsWith(".js"))
      .map((file): [string, string] => [
        // strip the trailing extension so url-facing test names stay clean.
        file.replace(/\.[^.]+$/, ""),
        fs.readFileSync(path.join(test_dir, file), "utf-8"),
      ]);
    const demo = get_demo_file(lang);
    return demo ? [demo, ...fixture_files] : fixture_files;
  } catch (_e) {
    const demo = get_demo_file(lang);
    return demo ? [demo] : [];
  }
}

export const load = async ({ params }) => {
  const { lang, test } = params;
  const test_files = get_test_files(lang);
  return {
    css_files: test_files,
    lang,
    test,
  };
};

// enumerate every (lang, test) pair so the static prerender captures all
// combinations. the page navigates between them via goto(), so the
// crawler on its own only reaches /explore/<lang>/demo.
export const entries = () => {
  const demo_langs = fs.existsSync(DEMOS_DIR)
    ? fs.readdirSync(DEMOS_DIR).map((file) => file.replace(/\.[^.]+$/, ""))
    : [];
  const LANGUAGES_DIR = path.join(PROJECT_ROOT, "languages");
  const language_dirs = fs.existsSync(LANGUAGES_DIR)
    ? fs.readdirSync(LANGUAGES_DIR).filter((entry) => {
        try {
          return fs.statSync(path.join(LANGUAGES_DIR, entry)).isDirectory();
        } catch {
          return false;
        }
      })
    : [];
  const all_langs = new Set([...demo_langs, ...language_dirs]);

  const pairs: Array<{ lang: string; test: string }> = [];
  for (const lang of all_langs) {
    const tests = new Set<string>();
    if (demo_langs.includes(lang)) tests.add("demo");
    try {
      const lang_tests = fs
        .readdirSync(path.join(LANGUAGES_DIR, lang, "test"))
        .filter((file) => !file.endsWith(".js"))
        .map((file) => file.replace(/\.[^.]+$/, ""));
      for (const t of lang_tests) tests.add(t);
    } catch {
      // no test dir for this language — only the demo entry applies.
    }
    for (const t of tests) pairs.push({ lang, test: t });
  }
  return pairs;
};
