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
