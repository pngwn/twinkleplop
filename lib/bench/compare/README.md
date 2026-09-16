# Cross-library comparison

Produces the JSON behind the website's benchmark charts: twinkleplop against
Shiki (both engines), Prism and sugar-high, every language, three input sizes,
plus the sample files Shiki benchmarks itself on.

```bash
node --expose-gc lib/bench/compare/bin/compare.mjs
```

Writes `lib/bench/results/comparison.json`. Build first — the twinkleplop arm
loads `dist`, which is what consumers import.

## The question this has to survive

A benchmark published by a library's own authors is worth exactly as much as
its inputs. Anyone reading one should assume the files were chosen to flatter
the publisher, because that is usually what happened. So the run is built to
make that assumption checkable rather than to argue against it:

- The `upstream` family is vendored from
  `shikijs/textmate-grammars-themes`, pinned to a commit and hashed. Those
  are the sample files Shiki's own engine benchmark uses. We did not pick
  them, cannot quietly re-pick them, and the charts show them next to ours.
- **Token counts are recorded for every cell and printed under every chart.**
  A library emitting half as many tokens for the same file is doing less work
  per byte, not the same work faster. This is the single most common way a
  highlighter benchmark misleads, and the only fix is to publish the counts.
- Nothing is allowed to fall back. Several of these libraries return escaped
  plaintext for a language they do not know instead of throwing, which
  produces a spectacular, meaningless number. Every adapter declares its
  languages explicitly, every cell is probed once before it is measured, and
  a cell that produces no tokens is excluded and recorded in
  `meta.excluded` rather than published.

## What it does not equalise

Nothing can make these libraries do identical work, and pretending otherwise
would be the dishonest option:

- **HTML output differs in kind.** twinkleplop and Prism emit classes and
  leave colour to a stylesheet. Shiki resolves a theme and writes inline
  styles — strictly more string work, and a real difference in what you get
  rather than a handicap imposed here.
- **sugar-high has no grammar registry.** It is a JavaScript-shaped tokenizer
  with no language argument, so it appears in the JS-family charts and
  nowhere else. That absence is a property of the library.
- **Bind cost is excluded.** Each library is bound once, outside the timed
  loop. twinkleplop is the only one here with a per-configuration setup step,
  and charging it on every iteration would measure something no consumer
  pays.

## How the numbers are taken

Every library in a cell is measured in the same process, alternating within a
round, with the starting position rotated each round. A run takes minutes and
CPU frequency, thermal state and background load all drift over that;
measuring one library now and another in four minutes compares two machines.
Interleaving makes the drift common-mode, which is the only reason a bar chart
built from these numbers means anything.

Iteration counts are calibrated per library, unlike the A/B harness next door,
because the spread between fastest and slowest here is often two orders of
magnitude and a count calibrated off the slowest would give the fastest four
iterations per measurement.

The consequence: **numbers are comparable within a cell and nowhere else.**
Comparing a figure here against one from a different run, machine or node
version is the exact mistake `perf/` exists to prevent, and it is no more
valid here. `meta.anchor` records whether the machine held still; `spread`
per library records whether that cell in particular was measured on a quiet
box.

## Options

| flag            | default                                          |
| --------------- | ------------------------------------------------ |
| `--arm`         | this repo root (must be built)                   |
| `--libraries`   | `twinkleplop,shiki-wasm,shiki-js,prism,sugar-high` |
| `--families`    | `sized,upstream`                                 |
| `--languages`   | all                                              |
| `--modes`       | `tokenize,html`                                  |
| `--rounds`      | 7                                                |
| `--target-ms`   | 20                                               |
| `--out`         | `lib/bench/results/comparison.json`              |

Adding a library means adding an adapter in `libraries.mjs`. Read the rules
at the top of that file first; both of them exist because the suite got them
wrong once.
