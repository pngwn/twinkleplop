# Published benchmarks

The website's benchmark page reads `comparison.json`. This file contains a run
from the machine described below, including the measured commit and runtime.
Commit a new run after regenerating it with the commands below.

The CI benchmark job can run the comparison through `workflow_dispatch` or a
`bench:compare` label on a pull request. It uploads results as an artifact.
Published results use a fixed machine because absolute timings vary across
shared CI hosts. The site deploys from `main` without waiting for a benchmark run.

## Hardware

A bare-metal AMD EPYC 8024P (8 cores, 2.4 GHz with boost disabled), Debian 12,
Node 22, with the CPU governor pinned to `performance`, the RAID resync
throttled, and nothing else running. Since 0.3.0 the box runs with SMT off and
every system and user process pinned to core 0, and the comparison runs alone
on cores 1 to 7:

```bash
systemd-run --scope --slice=bench.slice -p AllowedCPUs=1-7 \
  node lib/bench/compare/bin/compare.mjs --out lib/bench/published/comparison.json
```

Without the separate slice the run shares core 0 with V8's own GC and compiler
threads and every library reads several times slower. The libraries that did
not change between 0.2.2 (16 threads, no pinning) and 0.3.0 measured within
about 1.5% of each other, so the two setups compare. `meta.runner`,
`meta.cpu`, `meta.node` and `meta.commit` in the file say exactly which
machine, node and commit produced it. The run before this one came from an
EPYC 7232P (Zen 2, 3.1 GHz); absolute figures from the two parts are not
comparable, and the ratios differ too, since the newer core helps Prism's
regex engine more than it helps a character scanner.

## Regenerating results

From a clean checkout of the commit you want to publish:

```bash
pnpm install --frozen-lockfile
pnpm build
node lib/bench/compare/bin/compare.mjs --out lib/bench/published/comparison.json
node lib/bench/compare/bin/history.mjs
```

Then commit both files. `history.json` keeps the per chart medians of every
published run, one entry per commit, with the hash of each chart's input. The
benchmarks page compares each entry with the previous one from the same CPU,
over the charts whose input is identical in both. Publish a run for each
release so the page can show the change from version to version.

To add a language without moving every other input, rebuild the corpus with
`node lib/bench/perf/bin/build-corpus.mjs --only <lang,...>`. A full rebuild
picks up every fixture and source edit since the last one, so no chart of the
next run would compare with the previous release.

Before trusting a new machine, measure its noise first:

```bash
node lib/bench/perf/bin/setup-baseline.mjs --ref HEAD
node --expose-gc lib/bench/perf/bin/calibrate.mjs --suite ci --rounds 15
```

The reported noise floor estimates the smallest measurable change. The EPYC
8024P that produced the current run calibrated at 3.3% per workload with a
median A/A deviation of 0.6% and anchor drift of 0.2%. An earlier box of the
same model calibrated at 8.9%, with about half its rows showing a consistent
offset between two builds of identical source, which is the JIT and memory
placement lottery that only an A/B sees. The 7232P before it calibrated at
5.4% and 1.1%. The comparison measures one build per library, so it is
unaffected, and the reference libraries repeated to about 1% between the two
8024P boxes. A shared CI runner is typically 6 to 20% with anchor drift in
the tens of percent.

## Checking results

- `meta.anchor.stable` is true. If it is not, the machine changed state during
  the run and the absolute figures are approximate.
- `spread` per library per cell (max/min over rounds) should be near 1.1.
  Investigate consistently higher spread in one library. It may indicate a
  harness or library issue.

- `meta.excluded` is empty, or every entry in it is expected.
