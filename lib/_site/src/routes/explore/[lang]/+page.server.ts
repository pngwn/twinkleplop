import fs from "node:fs";
import path from "node:path";
import { redirect } from "@sveltejs/kit";

// every language ships a "demo" snippet under
// lib/_site/src/lib/explore/demos/<lang>.<ext> that exercises most token
// types. it doubles as the landing sample for `/explore/<lang>`.
export const load = async ({ params }) => {
  throw redirect(302, `${params.lang}/demo`);
};

function walk_to_root(file_path: string) {
  let current_path = file_path;
  while (true) {
    if (fs.existsSync(path.join(current_path, "pnpm-lock.yaml"))) {
      return path.resolve(current_path);
    }
    current_path = path.join(current_path, "..");
  }
}

// enumerate every language for the prerenderer. the crawler can only reach
// /explore/svelte from the homepage link; the other languages are switched
// to via client-side goto() and would otherwise be missed.
export const entries = () => {
  const project_root = walk_to_root("");
  const demos_dir = path.join(project_root, "lib", "_site", "src", "lib", "explore", "demos");
  const langs = fs
    .readdirSync(demos_dir)
    .map((file) => file.replace(/\.[^.]+$/, ""));
  return langs.map((lang) => ({ lang }));
};
