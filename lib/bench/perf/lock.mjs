// machine-wide exclusive lock for benchmark runs.
//
// several agents share one machine. two benchmark processes running at the
// same time do not produce two noisy results, they produce two wrong ones:
// on an 8 performance core M1 the second process changes the first's cache
// residency, its frequency ceiling and its scheduling latency, and the
// distortion is not symmetric between the two arms being compared. so every
// measurement run takes this lock first and queues if someone else holds it.
//
// the lock lives at a fixed absolute path so it is shared across git
// worktrees. acquisition is an atomic mkdir; liveness is a pid probe plus an
// mtime heartbeat, so a killed holder does not wedge the queue forever.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";

const LOCK_DIR = "/tmp/twinkleplop-perf.lock";
const META = join(LOCK_DIR, "holder.json");
const STALE_MS = 120_000;
const HEARTBEAT_MS = 15_000;

function read_holder() {
  try {
    return JSON.parse(readFileSync(META, "utf8"));
  } catch {
    return null;
  }
}

function pid_alive(pid) {
  if (typeof pid !== "number") return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM means the process exists but belongs to someone else.
    return err.code === "EPERM";
  }
}

function is_stale() {
  if (!existsSync(LOCK_DIR)) return false;
  const holder = read_holder();
  if (holder === null) {
    // mkdir won but the meta write never landed. give it a grace window.
    try {
      return Date.now() - statSync(LOCK_DIR).mtimeMs > 30_000;
    } catch {
      return false;
    }
  }
  if (holder.host !== hostname()) {
    // a foreign host cannot be probed; fall back to the heartbeat alone.
    return Date.now() - holder.beat > STALE_MS;
  }
  if (pid_alive(holder.pid)) return false;
  return true;
}

function try_acquire(label) {
  try {
    mkdirSync(LOCK_DIR);
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
    return false;
  }
  writeFileSync(
    META,
    JSON.stringify({
      pid: process.pid,
      host: hostname(),
      label,
      cwd: process.cwd(),
      start: Date.now(),
      beat: Date.now(),
    }),
  );
  return true;
}

function beat() {
  const holder = read_holder();
  if (holder === null || holder.pid !== process.pid) return;
  holder.beat = Date.now();
  try {
    writeFileSync(META, JSON.stringify(holder));
    utimesSync(LOCK_DIR, new Date(), new Date());
  } catch {
    // a stale-breaker may have removed the directory underneath us. the
    // measurement is already contaminated at that point; the run's anchor
    // drift check is what catches it.
  }
}

/**
 * Acquire the machine benchmark lock, waiting until it is free.
 *
 * Returns a release function. Registers exit handlers so an interrupted run
 * does not leave the lock held.
 */
export async function acquire_bench_lock({
  label = "bench",
  timeout_ms = 45 * 60_000,
  on_wait = null,
} = {}) {
  const deadline = Date.now() + timeout_ms;
  let announced = false;

  while (!try_acquire(label)) {
    if (is_stale()) {
      const holder = read_holder();
      process.stderr.write(
        `[lock] breaking stale lock held by pid ${holder?.pid ?? "?"} (${holder?.label ?? "unknown"})\n`,
      );
      try {
        rmSync(LOCK_DIR, { recursive: true, force: true });
      } catch {
        // lost the race to another breaker; loop and retry.
      }
      continue;
    }
    if (!announced) {
      const holder = read_holder();
      const held_for = holder ? Math.round((Date.now() - holder.start) / 1000) : 0;
      const msg = `[lock] waiting: held by pid ${holder?.pid ?? "?"} (${holder?.label ?? "unknown"}) for ${held_for}s`;
      if (on_wait) on_wait(msg);
      else process.stderr.write(`${msg}\n`);
      announced = true;
    }
    if (Date.now() > deadline) {
      throw new Error(
        `[lock] timed out after ${Math.round(timeout_ms / 1000)}s waiting for ${LOCK_DIR}`,
      );
    }
    // jitter so a queue of waiters does not retry in lockstep.
    await new Promise((r) => setTimeout(r, 400 + Math.floor(Math.random() * 600)));
  }

  const timer = setInterval(beat, HEARTBEAT_MS);
  timer.unref?.();

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    clearInterval(timer);
    const holder = read_holder();
    if (holder === null || holder.pid === process.pid) {
      try {
        rmSync(LOCK_DIR, { recursive: true, force: true });
      } catch {
        // already gone
      }
    }
  };

  process.on("exit", release);
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(sig, () => {
      release();
      process.exit(130);
    });
  }
  process.on("uncaughtException", (err) => {
    release();
    throw err;
  });

  return release;
}

/** Report the current holder without taking the lock. */
export function lock_status() {
  if (!existsSync(LOCK_DIR)) return { held: false };
  const holder = read_holder();
  return { held: true, stale: is_stale(), ...holder };
}
