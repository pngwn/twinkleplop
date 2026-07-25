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

## Suites

| suite   | workloads | what it is for                                        |
| ------- | --------: | ----------------------------------------------------- |
| `quick` |        30 | iterating. six languages, real files. ~1 min.         |
| `core`  |       147 | the default. all 18 languages, micro + real + fixtures. ~2.5 min. |
| `full`  |       328 | everything, plus fidelity, annotation, compile, bind. |
| `scale` |        52 | how cost grows with input length.                     |

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

All 18 languages appear in all four families.

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
