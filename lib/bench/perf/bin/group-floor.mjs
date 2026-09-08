#!/usr/bin/env node
// the noise floor for a GROUP geomean, which is a very different number from
// the per-workload floor.
//
//   node lib/bench/perf/bin/group-floor.mjs [--n 54]
//
// the 3.4% floor in calibration.json answers "how far can ONE workload move
// when nothing changed". a mode or language geomean averages many workloads,
// so its noise cancels and it can resolve much smaller effects. using the
// per-workload floor to judge a group average throws away real signal - and
// a broad, small, uniform gain is exactly the shape a language-agnostic
// change produces.
//
// this resamples the A/A calibration (identical builds, so every deviation is
// noise by construction) to get the null distribution of |geomean - 1| for a
// group of n workloads. no new measurement, no lock needed.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cal = JSON.parse(readFileSync(join(here, "..", "calibration.json"), "utf8"));

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : fallback;
};
const samples = opt("samples", 20_000);

const per = cal.per_workload;
const all = Object.values(per);
const geomean = (a) => Math.exp(a.reduce((x, v) => x + Math.log(v), 0) / a.length);

// deterministic so the reported thresholds do not wobble between runs.
let seed = 0x5eed;
const rng = () => {
  seed ^= seed << 13;
  seed >>>= 0;
  seed ^= seed >> 17;
  seed ^= seed << 5;
  seed >>>= 0;
  return seed / 0x100000000;
};

function null_thresholds(n) {
  const boot = new Float64Array(samples);
  const buf = new Array(n);
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < n; j++) buf[j] = all[(rng() * all.length) | 0];
    boot[i] = Math.abs(geomean(buf) - 1);
  }
  const sorted = Array.from(boot).sort((a, b) => a - b);
  return {
    p50: sorted[Math.floor(samples * 0.5)],
    p95: sorted[Math.floor(samples * 0.95)],
    p99: sorted[Math.floor(samples * 0.99)],
  };
}

const by_mode = {};
for (const [id, s] of Object.entries(per)) {
  const mode = id.split(":")[1];
  (by_mode[mode] ??= []).push(s);
}

const pct = (v) => `${(v * 100).toFixed(2)}%`;

console.log(`A/A calibration: ${all.length} workloads, measured ${cal.measured_at}`);
console.log(`per-workload floor: ${pct(cal.noise_floor)}\n`);

console.log("observed A/A geomean by mode (truth is 0.00%):");
for (const [m, a] of Object.entries(by_mode).sort()) {
  console.log(`  ${m.padEnd(10)} ${pct(geomean(a) - 1).padStart(8)}  n=${a.length}`);
}

console.log("\nnull distribution of |group geomean - 1|, resampled from A/A:");
console.log(
  `  ${"n".padStart(5)}  ${"p50".padStart(8)}  ${"p95".padStart(8)}  ${"p99".padStart(8)}`,
);
const sizes = [
  ...new Set([10, 20, 37, 54, 100, 147, ...argv.filter((a) => /^\d+$/.test(a)).map(Number)]),
];
for (const n of sizes.sort((a, b) => a - b)) {
  const t = null_thresholds(n);
  console.log(
    `  ${String(n).padStart(5)}  ${pct(t.p50).padStart(8)}  ${pct(t.p95).padStart(8)}  ${pct(t.p99).padStart(8)}`,
  );
}

console.log(
  `\nread this as: a group geomean past the p99 column for its n is a real\n` +
    `effect even when no single row in it clears the ${pct(cal.noise_floor)} per-workload floor.\n` +
    `it does NOT license reading an individual row below that floor.`,
);
