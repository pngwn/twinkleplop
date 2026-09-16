# Performance harness

Paired A/B measurement against a frozen reference build, plus an output
parity gate. Built for the case where several agents share one machine and
their numbers have to mean the same thing.

Everything here is read-only for experiments. **Do not edit the harness or
the corpus while running experiments against them** — the corpus hash and a
hash of the harness source go into every report precisely so that a report
produced by a modified harness is identifiable. If the harness needs a fix,
say so and change it deliberately, then re-run calibration.

## Setup (once per machine)

```bash
node lib/bench/perf/bin/setup-baseline.mjs
```

Exports the reference commit twice with `git archive` into
`<main checkout>/.perf/` and builds both. It lives beside the main checkout,
not inside any worktree, so every agent measures against the same bytes.

```bash
node --expose-gc lib/bench/perf/bin/calibrate.mjs --rounds 15
```

Measures the harness against itself and writes `calibration.json`. Takes
about two minutes. Re-run it if the machine changes.

## The two commands you will actually use

```bash
node --expose-gc lib/bench/perf/bin/ab.mjs --suite quick --label my-idea
```

```bash
node lib/bench/perf/bin/parity.mjs
```

`ab.mjs` compares your worktree against the reference. `parity.mjs` proves
the two produce identical output. Build first — both arms load `dist`, which
is what consumers import; measuring the TypeScript sources through a
transform would measure the transform.

## Why it is built this way

**Paired and interleaved.** For each workload the two arms are measured
alternately, ABBA, within a few hundred milliseconds of each other, and the
statistic is the median of the per-round *ratios*. Anything that moves the
machine more slowly than one round — thermal throttling, another agent's
build waking up, frequency scaling — moves both arms together and cancels.
This is the only reason numbers survive a shared machine.

**Never compare across processes.** The existing `lib/bench/baselines/`
snapshots record thermal penalties of 11% and machine-speed corrections of
5-7% between runs. A number captured in a previous process is a number from a
different machine. Both arms load into one process, always.

**Machine lock.** `/tmp/twinkleplop-perf.lock` is a machine-wide mutex. Every
measurement takes it and queues if another agent holds it. Two benchmark
processes running at once do not give two noisy results, they give two wrong
ones, and the distortion is not symmetric between arms. Do not pass
`--no-lock` on a shared machine.

**Machine anchor.** A fixed workload defined inside the harness — nothing
under test can change it — measured at the start and end of every run. If it
drifts more than 3% the machine changed state mid-run and the absolute
microsecond columns are not comparable to anything else. The paired ratios
still are.

**Calibrated noise floor.** `calibrate.mjs` runs the full protocol with two
independent builds of the *same commit*. The true answer is 1.00 everywhere.
The spread it comes back with is the smallest effect this harness can see.

As measured on this machine: geomean +0.0% (unbiased), median deviation 0.4%,
p95 2.7%, **noise floor 3.4%**. Notably, the bootstrap CI excluded 1.0 on
**18 of 147 workloads where nothing had changed**. That is why significance
alone is not the gate.

## What counts as a result

A workload has moved only if **all** of these hold:

1. the effect exceeds the calibrated noise floor (3.4%),
2. the 95% CI excludes 1.0,
3. it replicated — run with `--repeat 2` and both passes agree on direction.

For a headline claim, none of the above is as convincing as **a whole group
moving together**. Random noise scatters; a real change to the scanner moves
every `tokenize` row across every language. Read the geomean-by-mode and
geomean-by-language sections first and the individual rows second.

Report the conservative number. `--repeat 2` already does this: the headline
speedup becomes the weaker of the two passes.

### The group floor is not the per-workload floor

3.4% is how far **one** workload can move when nothing changed. A geomean over
many workloads averages that noise away and resolves far smaller effects.
Judging a mode geomean against 3.4% throws away real signal — and a broad,
small, uniform gain is exactly the shape a language-agnostic change produces.

```bash
node lib/bench/perf/bin/group-floor.mjs
```

Resampled from the A/A calibration, where every deviation is noise by
construction:

| group size | p50   | p95   | p99   |
| ---------: | ----- | ----- | ----- |
|         10 | 0.25% | 0.92% | 1.31% |
|         37 | 0.19% | 0.55% | 0.72% |
|         54 | 0.19% | 0.49% | 0.62% |
|        147 | 0.19% | 0.37% | 0.45% |

The A/A run's own mode geomeans came out at 0.11% (`tokenize`), 0.14%
(`pipeline`) and 0.38% (`html`), which is the same story from the other side.

So a `pipeline` geomean of +1.3% over 54 workloads is past the p99 of 0.62%
and is a real effect, even with no single row clearing 3.4%. This does **not**
license reading an individual row below the per-workload floor, and it only
holds for a group you did not choose after seeing the numbers — picking the
six workloads that happened to move and averaging them is not a group.

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

Frozen, hashed, checked in. Regenerate only with `bin/build-corpus.mjs`, and
be aware that doing so invalidates comparisons against earlier reports.

| family     | what it is                                                       |
| ---------- | ---------------------------------------------------------------- |
| `micro`    | one short snippet per language. the docs-site case, where fixed per-call cost dominates and the scanning loop barely runs. |
| `fixtures` | each language's own test fixtures, concatenated. grammar-feature dense: probe paths, escapes, edge cases. the cold paths a "make the common case fast" change tends to break. |
| `real`     | production-shaped source. this repo's own code where the language is one we write here, hand-authored under `corpus/seed/` otherwise. **the headline numbers.** |
| `scale`    | ~200KB per language, built by cycling that language's files. deliberately synthetic. it answers "how does cost grow with length", not "how fast is real code". **Do not quote scale numbers as user-facing wins.** |
| `sized`    | the same language at ~1KB, ~10KB and ~100KB. the other families fix a shape and vary the language; this one fixes the language and varies the size. built by cycling whole units, so the two upper tiers carry the same synthetic caveat as `scale`. **this is what the published comparison charts measure.** |
| `upstream` | sample files vendored from `shikijs/textmate-grammars-themes`, which is where shiki's own benchmark gets its inputs. pinned to a commit and hashed. **the one family we did not choose**, and therefore the only one that cannot have been selected to flatter us. |

All 18 languages appear in `micro`, `fixtures`, `real`, `scale` and `sized`.
`upstream` covers 16: `diff-basic` and `whitespace` are twinkleplop constructs
with no upstream counterpart, which `corpus/upstream/UPSTREAM.json` records
explicitly rather than leaving as a silent gap.

Re-pin the upstream corpus deliberately, never on a schedule:

```bash
node lib/bench/perf/bin/fetch-upstream-corpus.mjs --commit <sha>
node lib/bench/perf/bin/build-corpus.mjs
```

Both invalidate comparisons against earlier reports, which is why the corpus
hash is recorded in every one.

## Modes

Every consumer-visible path, because a change that speeds one up by slowing
another is not a win and you cannot see that from a single column.

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

Experiments may break output while exploring. A **result** requires this to
come back clean. A speedup that changes output is not a speedup, it is a
different library.

## Where the time goes

```bash
node --expose-gc lib/bench/perf/bin/profile.mjs --family real
```

Absolute breakdown of one arm into scan / reclassify / render. Reference
figures for the frozen baseline are in `BASELINE.md`.

## Failure modes this harness does not protect you from

- **A narrow fast path.** Special-casing one language, or one input shape,
  and reporting the corpus average. The by-language and by-family sections
  exist to make that visible — check that a win is broad before believing it.
- **Moving work rather than removing it.** Out of `pipeline` and into `bind`,
  or out of runtime and into module import. The `compile` and `bind` modes in
  the `full` suite are there for this; a win in `pipeline` with a matching
  loss in `bind` is a wash for anyone who rebinds per block.
- **Winning on the corpus.** The corpus is fixed and visible, so it can be
  overfitted. If a change's benefit depends on properties of these specific
  files, say so.

## In CI

`.github/workflows/benchmarks.yml` runs this harness on every pull request,
against the branch's **merge base** rather than the tip of `main` — comparing
against the tip would charge the branch for everything that landed since it
forked.

Three things about that workflow are not obvious and are load-bearing:

**It calibrates on the runner, every time.** `calibration.json` in this
directory was measured on a laptop. A CI runner is a different, shared,
virtualised machine whose floor is several times higher, and applying the
laptop's 3.4% there would turn every quiet pull request into a page of green
"wins". The workflow runs `bin/calibrate.mjs --suite ci --rounds 15` before the A/B
and overwrites the file on the runner. The round count is passed explicitly
and must stay equal to the A/B's: the harness defaults differ (9 versus 15),
and a floor measured at fewer rounds describes a noisier measurement than the
one it is gating. `bin/pr-comment.mjs` checks the
provenance of whatever floor it ends up reading and says so in the comment if
it did not come from the same machine, corpus and node — and refuses to gate
on a borrowed one.

**Thresholds are corrected for how many groups are tested.** The gate looks
at three mode geomeans and fires if any moves, so testing each at p95 puts the
real error rate at 1 - 0.95^3 = 7.3%, and the seven rows the comment colours
put it at 30%. Both were observed: a pull request that changed no library code
reported `tokenize -2.2%` as a regression. Each group is therefore tested at
1 - (1 - 0.05)^(1/k), which holds the family-wise rate at 5% and costs about
20% on each threshold.

**A regression must appear in the modes that contain it.** `tokenize` is the
scanner, `pipeline` is that scanner plus the reclassifiers, `html` is pipeline
plus rendering. A scanner regression has to show up in all three; one that
appears in `tokenize` while `pipeline` moves the other way is not physically a
scanner regression, and is reported as `uncorroborated` rather than gated. The
containment is one-directional - a regression confined to `pipeline` or `html`
is legitimate, because it can live in code `tokenize` never runs.

**It gates on groups, not workloads.** The A/A calibration flags roughly one
workload in eight as "significant" when both arms are the same commit. A
per-workload gate on a shared runner would go red on pull requests that
changed nothing, and a check that cries wolf is a check nobody reads. The
gate is a mode geomean clearing the p95 of the null distribution for a group
of that size.

**Parity is reported, not gated.** A speedup that changes output is not a
speedup — but this workflow also runs on feature branches whose entire
purpose is to change output. Failing those would put a red benchmark check on
every feature. The comment says plainly when the two arms are not the same
library, and leaves the judgement to the reader.

The frozen reference build lives at `$TWINKLEPLOP_PERF_DIR`, outside the
workspace, because the checkout action wipes the workspace. It is deliberately
**not** cached between runs: measured on `namespace-profile-basic`, exporting
and building both reference arms costs 16 seconds, which is cheaper than the
mount point was worth. (`rmdir` on a mounted cache volume is `EBUSY`, which is
how that was discovered.) The pnpm store cache is what makes the installs
fast.

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

The distribution is the interesting part: p50 2.90%, p95 14.84%, worst 48%.
That is not a uniformly slow machine, it is a mostly-clean one with a heavy
tail — a minority of rounds badly disturbed, most likely by co-tenants on the
shared physical host. The lever for that shape is round count, because the
statistic is a median of per-round ratios and a median's resistance to
contaminated samples scales with how many it has. Raising `--target-ms`
attacks per-sample variance instead, which is the wrong end of this problem.
