# The published benchmark run

`comparison.json` here is what the website's benchmark page renders. It is
committed on purpose, against the advice at the top of `compare/README.md`,
because a number nobody can reproduce is worth less than a slightly old one
that anybody can: the run was taken on a named machine, by the commands below,
and the page prints the commit it measured and how far `main` has moved since.

The CI benchmark job can still run the same comparison on demand — a
`workflow_dispatch` of the Benchmarks workflow, or the `bench:compare` label
on a pull request — and uploads it as an artifact. It no longer runs on every
push to `main`: the shared runner's absolute numbers depend on which host the
job landed on, so they are a check on this file, not the headline, and the
site deploys straight from `main` without waiting for a benchmark run.

## The machine

A bare-metal AMD EPYC 7232P (8 cores, 16 threads, 3.1 GHz), Debian 12, Node
22, with the CPU governor pinned to `performance`, boost disabled, and nothing
else running. `meta.runner`, `meta.cpu`, `meta.node` and `meta.commit` in the
file say exactly which machine, node and commit produced it.

## Regenerating it

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

The floor it prints is the smallest effect that machine can see. The EPYC box
above calibrated at 5.4% per workload with a median A/A deviation of 1.1%; a
shared CI runner is typically 6–20% with anchor drift in the tens of percent.

## What to check in a new file

- `meta.anchor.stable` is true. If it is not, the machine changed state during
  the run and the absolute figures are approximate.
- `spread` per library per cell (max/min over rounds) sits near 1.1 for every
  library. One library consistently worse than the others is a harness or
  library defect, not noise — that is how the `ProbeEntry` re-compile in the
  tokenizer was found.
- `meta.excluded` is empty, or every entry in it is expected.
