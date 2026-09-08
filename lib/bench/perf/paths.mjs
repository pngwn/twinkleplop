// shared path resolution.
//
// agents work in separate git worktrees. the frozen reference build must NOT
// live inside any one of them: every agent has to measure against the same
// bytes for their reports to be comparable to each other, and a per-worktree
// copy would also mean rebuilding it once per agent. so it is anchored to the
// main checkout, found through the shared git common dir.

import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** Root of the checkout this harness copy lives in (worktree or main). */
export const local_root = resolve(here, "../../..");

/**
 * Root of the MAIN checkout, shared by every worktree.
 *
 * `--git-common-dir` points at the one real .git directory even from inside
 * a linked worktree, so its parent is the main checkout.
 */
export const main_root = (() => {
  try {
    const common = execFileSync(
      "git",
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      {
        cwd: local_root,
        encoding: "utf8",
      },
    ).trim();
    return dirname(common);
  } catch {
    return local_root;
  }
})();

/** Where the frozen reference builds live. Shared across worktrees. */
export const perf_dir = process.env.TWINKLEPLOP_PERF_DIR
  ? resolve(process.env.TWINKLEPLOP_PERF_DIR)
  : join(main_root, ".perf");

export const baseline_dir = join(perf_dir, "baseline");
export const mirror_dir = join(perf_dir, "baseline-mirror");
export const reference_stamp = join(perf_dir, "REFERENCE.json");
