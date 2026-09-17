# Published benchmarks

The website's benchmark page reads `comparison.json`. This file contains a run
from the machine described below, including the measured commit and runtime.
Commit a new run after regenerating it with the commands below.

The CI benchmark job can run the comparison through `workflow_dispatch` or a
`bench:compare` label on a pull request. It uploads results as an artifact.
Published results use a fixed machine because absolute timings vary across
shared CI hosts. The site deploys from `main` without waiting for a benchmark run.

## Hardware

A bare-metal AMD EPYC 7232P (8 cores, 16 threads, 3.1 GHz), Debian 12, Node
22, with the CPU governor pinned to `performance`, boost disabled, and nothing
else running. `meta.runner`, `meta.cpu`, `meta.node` and `meta.commit` in the
file say exactly which machine, node and commit produced it.

## Regenerating results

From a clean checkout of the commit you want to publish:

```bash
pnpm install --frozen-lockfile
pnpm build
node lib/bench/compare/bin/compare.mjs --out lib/bench/published/comparison.json
```

Then commit the file. Before trusting a new machine, measure its noise first:

```bash
node lib/bench/perf/bin/setup-baseline.mjs --ref HEAD
node --expose-gc lib/bench/perf/bin/calibrate.mjs --suite ci --rounds 15
```

The reported noise floor estimates the smallest measurable change. The EPYC machine
above calibrated at 5.4% per workload with a median A/A deviation of 1.1%; a
shared CI runner is typically 6–20% with anchor drift in the tens of percent.

## Checking results

- `meta.anchor.stable` is true. If it is not, the machine changed state during
  the run and the absolute figures are approximate.
- `spread` per library per cell (max/min over rounds) should be near 1.1.
  Investigate consistently higher spread in one library. It may indicate a
  harness or library issue.

- `meta.excluded` is empty, or every entry in it is expected.
