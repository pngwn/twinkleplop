# Performance harness

Compare a candidate build against a fixed reference build and check that their
output matches. The harness supports measurements from multiple worktrees on
the same machine.

Keep the harness and corpus unchanged while running experiments. Reports record
hashes of both. If either needs to change, make the change separately and rerun
calibration.

## Setup (once per machine)

```bash
node lib/bench/perf/bin/setup-baseline.mjs
```

Exports the reference commit twice with `git archive` into
`<main checkout>/.perf/` and builds both. All worktrees use these shared reference builds.

```bash
node --expose-gc lib/bench/perf/bin/calibrate.mjs --rounds 15
```

Measures the harness against itself and writes `calibration.json`. Takes
about two minutes. Re-run it if the machine changes.

## Running a comparison

```bash
node --expose-gc lib/bench/perf/bin/ab.mjs --suite quick --label my-idea
```

```bash
node lib/bench/perf/bin/parity.mjs
```

`ab.mjs` compares your worktree against the reference. `parity.mjs` checks that
the two produce identical output. Build first — both arms load `dist`, which
is what consumers import; measuring the TypeScript sources through a
transform would measure the transform.

## Measurement method

**Paired measurements.** Each workload alternates between the reference and
candidate builds in ABBA order. Results use the median of per-round ratios.
Measuring both builds close together reduces the effect of temperature,
background load and CPU frequency changes.

**One process.** Both builds run in the same process. Separate runs on the same
machine have shown thermal penalties of 11% and machine-speed corrections of
5–7%, so results from separate processes are not used for comparison.

**Garbage collection and warmup.** Each round starts with a full garbage
collection, followed by 20 ms of untimed warmup for both builds (`--rewarm-ms`)
and a minor collection. The full collection clears allocations from the previous
round. Warmup lets V8 re-optimise any code affected by collection. The minor
collection clears allocations from warmup before timing begins.

A round measures A, B, B, A and sums the time for each build. Each sample combines
an A-first and a B-first round, so both builds are measured in both positions.
Odd round counts are rounded up. Each build also warms up before iteration-count
calibration to avoid calibrating against cold code.

Earlier versions exposed several measurement problems: a full collection during
a timed window produced a 102% A/A deviation, missing warmup produced temporary
speedups that continuous runs could not reproduce, and an odd number of
alternating samples produced a 2% order bias.

**Machine lock.** `/tmp/twinkleplop-perf.lock` allows one measurement process at a
time. Other processes wait for the lock. Concurrent benchmarks can affect the
two builds differently. Keep the lock enabled on shared machines.

**Reference workload.** The harness measures a fixed workload at the start and
end of each run. Drift above 3% indicates a change in machine performance.
Treat absolute timings from these runs as approximate.

**Noise floor.** `calibrate.mjs` compares two independent builds of the same
commit. Their expected ratio is 1.00. Variation in this A/A run estimates the
smallest measurable change.

One calibration measured a +0.0% geometric mean, 0.4% median deviation, 2.7% p95
and a 3.4% noise floor. The bootstrap confidence interval excluded 1.0 on 18 of
147 unchanged workloads, so statistical significance alone is insufficient.

## What counts as a result

A workload has moved only if **all** of these hold:

1. the effect exceeds the calibrated noise floor (3.4%),
2. the 95% CI excludes 1.0,
3. it replicated — run with `--repeat 2` and both passes agree on direction.

Read the geometric means by mode and language before interpreting individual
rows. A change that affects a shared component should usually appear across
several relevant workloads.

With `--repeat 2`, the reported speedup uses the smaller result from the two runs.

### Group thresholds

The per-workload noise floor applies to individual results. Geometric means
across groups can detect smaller changes. Calculate their thresholds from the
A/A calibration:

```bash
node lib/bench/perf/bin/group-floor.mjs
```

Example thresholds from resampling an A/A calibration:

| group size | p50   | p95   | p99   |
| ---------: | ----- | ----- | ----- |
|         10 | 0.25% | 0.92% | 1.31% |
|         37 | 0.19% | 0.55% | 0.72% |
|         54 | 0.19% | 0.49% | 0.62% |
|        147 | 0.19% | 0.37% | 0.45% |

The same A/A run measured mode geometric means of 0.11% for `tokenize`, 0.14% for
`pipeline` and 0.38% for `html`.

For example, a 1.3% change across a predefined group of 54 workloads exceeds that
group's p99 threshold of 0.62%, even when individual results fall below 3.4%.
Choose groups before looking at the results. Selecting only workloads that
improved would bias the comparison.

## Suites

| suite   | workloads | what it is for                                        |
| ------- | --------: | ----------------------------------------------------- |
| `quick` |        30 | iterating. six languages, real files. ~1 min.         |
| `core`  |       147 | the default. all 18 languages, micro + real + fixtures. ~2.5 min. |
| `ci`    |       195 | what CI runs per pull request: `core` plus `upstream`. |
| `full`  |       599 | everything, plus fidelity, annotation, compile, bind. |
| `scale` |        52 | how cost grows with input length.                     |
| `sized` |       156 | the published charts' own inputs, three sizes per language. |

Use `quick` while exploring. Use `core --repeat 2` for anything you intend to
claim. `full` before proposing a merge.

## Corpus

The corpus is committed with recorded hashes. Regenerate it with
`bin/build-corpus.mjs`. Regeneration invalidates comparisons with earlier reports.

| family     | what it is                                                       |
| ---------- | ---------------------------------------------------------------- |
| `micro`    | one short snippet per language. the docs-site case, where fixed per-call cost dominates and the scanning loop barely runs. |
| `fixtures` | each language's own test fixtures, concatenated. grammar-feature dense: probe paths, escapes, edge cases. covers less common grammar rules. |
| `real`     | production-shaped source. this repo's own code where the language is one we write here, hand-authored under `corpus/seed/` otherwise. Use these for performance summaries. |
| `scale`    | ~200KB per language, built by cycling that language's files. synthetic inputs for measuring how cost grows with length. Use real inputs for user-facing performance claims. |
| `sized`    | the same language at ~1KB, ~10KB and ~100KB. the other families fix a shape and vary the language; this one fixes the language and varies the size. built by cycling whole units, so the two upper tiers carry the same synthetic caveat as `scale`. **this is what the published comparison charts measure.** |
| `upstream` | sample files vendored from `shikijs/textmate-grammars-themes`, which is where shiki's own benchmark gets its inputs. pinned to a commit and hashed. provides an independent set of inputs. |

All 18 languages appear in `micro`, `fixtures`, `real`, `scale` and `sized`.
`upstream` covers 16: `diff-basic` and `whitespace` are twinkleplop constructs
with no upstream counterpart, which `corpus/upstream/UPSTREAM.json` records
explicitly.

Re-pin the upstream corpus deliberately, never on a schedule:

```bash
node lib/bench/perf/bin/fetch-upstream-corpus.mjs --commit <sha>
node lib/bench/perf/bin/build-corpus.mjs
```

Both invalidate comparisons against earlier reports, which is why the corpus
hash is recorded in every one.

## Modes

The modes measure each stage separately, including import and setup costs.

| mode         | entry point                            |
| ------------ | -------------------------------------- |
| `tokenize`   | `core.tokenize(src, grammar)` — the grammar state machine alone |
| `pipeline`   | `lang.tokenize()(src)` — plus the language's reclassifier stack. **This is the plugin path.** |
| `html`       | `lang.language()(src)` — the full string-in string-out path |
| `fidelity`   | `lang.tokenize({fidelity: "low"})(src)` — the opt-out tier |
| `annotation` | the overlay extractor |
| `compile`    | `compile(raw_grammar)` — paid once per process at import |
| `bind`       | `lang.tokenize(opts)` — per-configuration setup |

## Parity

```bash
node lib/bench/perf/bin/parity.mjs
```

287 checks: every corpus file through `tokenize`, `pipeline`, `fidelity-low`
and `html` on both arms, comparing token type *names* and spans (internal
type ids are free to renumber) and the rendered HTML byte for byte.

Check output parity before reporting a performance improvement. If the output
changes intentionally, describe that difference when interpreting the timings.

## Profiling

```bash
node --expose-gc lib/bench/perf/bin/profile.mjs --family real
```

Absolute breakdown of one arm into scan / reclassify / render.

## Interpreting changes

- **Limited improvements.** Check results by language and input family. An
  improvement for one language may have little effect on the others.
- **Setup costs.** Check `compile` and `bind` as well as runtime modes. Moving work
  into setup affects applications that create highlighters frequently.
- **Input dependence.** State when an improvement depends on properties of the
  benchmark inputs that may not apply to other code.

## In CI

`.github/workflows/benchmarks.yml` runs this harness on every pull request,
against the branch's merge base. This isolates the changes on the branch.

The workflow uses these checks:

**Calibration.** Each run calibrates on the CI runner with
`bin/calibrate.mjs --suite ci --rounds 15`. Calibration and A/B measurements must
use the same round count. `bin/pr-comment.mjs` checks that the calibration came
from the same machine, corpus and Node version before using it for a gate.

**Multiple comparisons.** Group thresholds account for the number of groups
tested, with a target family-wise false-positive rate of 5%.

**Related modes.** The gate checks whether a regression appears in the modes that
include the affected work. `pipeline` includes tokenization, and `html` includes
the pipeline. An isolated `tokenize` regression that is not supported by the
other modes is reported as `uncorroborated`. Regressions limited to `pipeline`
or `html` can come from work specific to those stages.

**Group results.** The gate uses mode geometric means and calibrated group
thresholds. Individual workload results are too noisy for reliable CI gating.

**Output parity.** Parity is reported but does not fail the benchmark job, because
feature changes can intentionally change output. The comment identifies output
differences so reviewers can account for them.

The reference builds are stored at `$TWINKLEPLOP_PERF_DIR`, outside the workspace,
so checkout cleanup does not remove them. They are rebuilt for each run. On
`namespace-profile-basic`, exporting and building both references took 16 seconds.
The pnpm store is cached to reduce installation time.

Measured on that runner, a pull request's whole job is about six minutes:

| step | time |
| ---- | ---: |
| checkout, toolchains, install, build candidate | 16s |
| build both reference arms | 16s |
| calibrate (A/A, 195 workloads) | 132s at 9 rounds |
| A/B (195 workloads, 15 rounds) | 178s |
| parity (550 checks) | 6s |

And the floor it measures there is **18.6%**, against 3.4% on an idle M1 Max.
That number is per-workload and nothing gates on it; the group thresholds
derived from the same distribution come out at 1.91% for a mode geomean and
1.16% over the whole suite. A run against a commit that changed no library
code reported +0.1% overall, every mode flat.

The measured deviation distribution was p50 2.90%, p95 14.84% and a maximum of
48%. Most rounds had low variation, with a smaller number affected by substantial
interference. Additional rounds help the median resist these outliers.
