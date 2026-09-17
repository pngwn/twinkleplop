#!/usr/bin/env node
// materialise the frozen reference checkouts every A/B measures against.
//
// two copies, both exported from the same commit with `git archive` so they
// are plain directories rather than git worktrees (nothing for an agent's
// git commands to trip over, and no way to accidentally commit into them):
//
//   .perf/baseline         the reference arm. every agent compares against
//                          this exact build, so results from different
//                          agents are commensurable.
//   .perf/baseline-mirror  an identical second build, used only by
//                          bin/calibrate.mjs. comparing two independent
//                          builds of the same source is the harness's null
//                          hypothesis: it must come back 1.00, and whatever
//                          spread it shows is the noise floor below which no
//                          result should be believed.
//
// usage:
//   node bin/setup-baseline.mjs [--ref <commit-ish>] [--force]

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { local_root as repo_root, perf_dir, reference_stamp } from "../paths.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes(name);

const ref = flag("--ref", "HEAD");
const force = has("--force");

function sh(cmd, cmd_args, opts = {}) {
  return execFileSync(cmd, cmd_args, { stdio: "inherit", cwd: repo_root, ...opts });
}

function capture(cmd, cmd_args, opts = {}) {
  return execFileSync(cmd, cmd_args, { encoding: "utf8", cwd: repo_root, ...opts }).trim();
}

const sha = capture("git", ["rev-parse", ref]);
const short = sha.slice(0, 12);
const stamp_path = reference_stamp;

if (existsSync(stamp_path) && !force) {
  const stamp = JSON.parse(readFileSync(stamp_path, "utf8"));
  if (
    stamp.sha === sha &&
    existsSync(join(perf_dir, "baseline/lib/core/dist/twinkleplop.production.js"))
  ) {
    console.log(`baseline already built at ${short} (${stamp.built_at})`);
    console.log(`  reference: ${join(perf_dir, "baseline")}`);
    console.log(`  mirror:    ${join(perf_dir, "baseline-mirror")}`);
    console.log(`pass --force to rebuild.`);
    process.exit(0);
  }
}

// clear the CONTENTS, never the directory itself. in CI the perf dir is a
// mounted cache volume, and rmdir on a mount point is EBUSY - which is
// exactly the failure this replaces. the same holds for a symlink or a
// bind-mount someone points TWINKLEPLOP_PERF_DIR at locally. the goal was
// only ever "start from an empty directory", and emptying it achieves that
// without caring what the directory is.
if (existsSync(perf_dir)) {
  for (const entry of readdirSync(perf_dir)) {
    rmSync(join(perf_dir, entry), { recursive: true, force: true });
  }
} else {
  mkdirSync(perf_dir, { recursive: true });
}

for (const name of ["baseline", "baseline-mirror"]) {
  const dir = join(perf_dir, name);
  mkdirSync(dir, { recursive: true });
  console.log(`\n=== ${name} @ ${short} ===`);
  // git archive gives a clean tree with no VCS metadata and no untracked
  // files, so the reference cannot drift with the working directory.
  const tar = execFileSync("git", ["archive", "--format=tar", sha], {
    cwd: repo_root,
    maxBuffer: 512 * 1024 * 1024,
  });
  execFileSync("tar", ["-x", "-C", dir], { input: tar, maxBuffer: 512 * 1024 * 1024 });
  sh("pnpm", ["install", "--frozen-lockfile", "--silent"], { cwd: dir });
  sh("pnpm", ["build"], { cwd: dir });
}

writeFileSync(
  stamp_path,
  `${JSON.stringify(
    {
      sha,
      ref,
      subject: capture("git", ["log", "-1", "--format=%s", sha]),
      built_at: new Date().toISOString(),
      node: process.version,
    },
    null,
    2,
  )}\n`,
);

console.log(`\nreference built at ${short}`);
console.log(`  ${join(perf_dir, "baseline")}`);
console.log(`  ${join(perf_dir, "baseline-mirror")}`);
