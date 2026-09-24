# Cross-library comparison

Produces the JSON the website's benchmark page renders: twinkleplop against
Shiki (both engines), Prism, sugar-high and speed-highlight, every language, three input sizes,
plus the sample files Shiki benchmarks itself on. The copy the site ships is
committed at `lib/bench/published/comparison.json`, taken on a named machine;
see the README there for how it is regenerated.

```bash
node lib/bench/compare/bin/compare.mjs
```

Writes `lib/bench/results/comparison.json`. Build first — the twinkleplop arm
loads `dist`, which is what consumers import. Every cell runs in a child
process of its own (`cell.mjs`, always with `--expose-gc`), so the flag is not
needed on the command.

## Input selection

The benchmark records inputs and output counts so readers can assess the comparison.

- The `upstream` family contains sample files from Shiki's own engine benchmarks,
  copied from `shikijs/textmate-grammars-themes` at a recorded commit. File hashes
  are included in the results. The charts show these alongside Twinkleplop's samples.
- Token counts are recorded for each result and shown under each chart. Libraries
  can produce different numbers of tokens for the same source, which affects the
  amount of work measured.
- Each adapter lists its supported languages. Before measurement, the harness
  checks that it produces tokens. Unsupported combinations and results without
  tokens are excluded and recorded in `meta.excluded`.

## Differences between libraries

- **HTML output.** Twinkleplop, Prism and speed-highlight generate CSS classes. Shiki applies a theme
  and generates inline styles, which requires additional string processing.
- **Language support.** sugar-high has a JavaScript tokenizer without a language
  argument, so it is included only in JS-family charts. speed-highlight has no
  TSX or Svelte grammar.
- **Async APIs.** speed-highlight's public functions are async because they load
  grammars on demand. The adapter preloads every grammar and calls its synchronous
  `tokenizeWith`, so the measurement covers highlighting and excludes promise
  scheduling.
- **Setup.** Highlighters are configured once before the timed loop. The comparison
  measures repeated highlighting calls.

## Measurement method

A cell is one combination of language, input and mode. All libraries in a cell
are measured in the same process, alternating within a round. The starting
library rotates each round to reduce the effect of changes in CPU frequency,
temperature and background load.

Each cell uses a separate process to avoid carrying heap and JIT compiler state
between cells. In an earlier run, the same Twinkleplop build measured 4141 ops/s
for `typescript.small` tokenization after more than a hundred cells, compared
with 5387 ops/s in a fresh process. Prism changed in the opposite direction.

`cell.mjs` loads the libraries, checks their output, warms them, measures them and
exits. Before each round it forces a full garbage collection, warms each library
for 20 ms and runs a minor garbage collection. See the measurement method in
`perf/README.md` for details.

Iteration counts are calibrated separately for each library because their speeds
can differ by two orders of magnitude.

Compare results within a cell. For comparisons between commits, use `perf/`.
`meta.anchor` records changes in machine performance during the run, and `spread`
records variation between rounds for each library.

## Options

| flag            | default                                          |
| --------------- | ------------------------------------------------ |
| `--arm`         | this repo root (must be built)                   |
| `--libraries`   | `twinkleplop,shiki-wasm,shiki-js,prism,sugar-high,speed-highlight` |
| `--families`    | `sized,upstream`                                 |
| `--languages`   | all                                              |
| `--modes`       | `tokenize,html`                                  |
| `--rounds`      | 7                                                |
| `--warmup-ms`   | 100                                              |
| `--rewarm-ms`   | 20                                               |
| `--target-ms`   | 20                                               |
| `--out`         | `lib/bench/results/comparison.json`              |

To add a library, implement an adapter in `libraries.mjs` following the rules
at the top of the file.
