# Cold start: compile, bind, and time to first highlight

Every language package calls `compile(raw_grammar)` at module evaluation time.
Nobody had measured what that costs. This is the measurement, the instrument
built to take it, and what I did and did not manage to do about it.

**The short version.** For a docs site importing seven grammars, this library
adds **16-17 ms** to a cold Node process before a single character is
highlighted. That is more than the steady-state cost of highlighting every code
block on a typical page — break-even is around 170 small blocks. Of that,
`compile()` is 4.8 ms, module parse and evaluate is 5.6 ms, and **5.4 ms is
Node's module resolver**, which disappears entirely for anyone using a bundler.
So a bundled consumer's real number is about 10 ms. `bind` is not a factor at all:
it costs 0.4 to 4.5 microseconds, so the reclassifier track should not treat it
as a constraint.

**The one change I made.** Python's grammar compiled ten times slower than every
other, because a `range([[0x80, 0xffff]])` rule was expanded one codepoint at a
time into a dictionary object. Storing ranges as ranges cuts Python's import from
14.1 ms to 6.14 ms and takes it from 5.4x the control language to 1.01x; the
paired A/B puts `setup/python:compile` at 15.5x faster. Parity is clean, all
1719 tests pass, and every runtime mode is flat — but compiling the *other*
seventeen grammars got 2-5% slower and I could not recover it. Section 9.

**Everything else I tried, I rejected.** Shipping precompiled grammars is
1.6-4.2x *slower* than compiling them. Lazy compilation saves 3.0 ms but
requires a breaking API change across all eighteen packages. Section 8 has the
full list with numbers.

---

## 1. Methodology, and what is wrong with it

**This measurement does not have the integrity guarantees of `lib/bench/perf`.**
Say so out loud before quoting any number below.

The paired A/B harness works by loading two arms into one process, interleaving
them, warming them up, and reporting ratios of medians. Every one of those
properties is unavailable here. Cold start happens once per process, by
definition unwarmed, and includes module parse and evaluation. There is no A/A
form of "import this module for the first time" within a process, so there is no
calibrated noise floor and **the 3.4% figure from `perf/calibration.json` does
not apply to anything in this document**.

What I built instead lives in `lib/bench/coldstart/` (outside `lib/bench/perf/`,
which I did not touch):

- `bin/coldstart.mjs` — driver. One child process per sample.
- `probes/run.mjs` — the child. Runs each step exactly once, never loops, never
  warms up, and emits one JSON line of `performance.now()` deltas.
- `bin/build-artifacts.mjs` — builds bundled comparison chunks with esbuild.
- `bin/build-revive.mjs` — builds and verifies the "ship the compiled tables"
  prototype.
- `bin/serialise-size.mjs` — byte sizes of serialised compiled grammars.

Design choices that matter:

- **Interleaved round robin.** Scenarios rotate every round rather than running
  one scenario to completion. If the machine slows down mid-run, running
  scenario-at-a-time attributes the slowdown to whichever scenarios were
  scheduled late; interleaving spreads it so the median can reject it. This is
  the one property I could borrow from the A/B harness.
- **Medians and IQR, never means.** Cold start samples have a hard floor and an
  unbounded right tail. Every table reports the median; `iqr%` is the
  interquartile range as a percentage of it.
- **Warmup rounds discarded.** The first six rounds pay to fill the OS page
  cache with dist files. A real deployment pays that once per machine, not once
  per request.
- **The machine lock is held for the whole run**, via
  `acquire_bench_lock` from `lib/bench/perf/lock.mjs`. Never `--no-lock`.
- **`NODE_COMPILE_CACHE` explicitly cleared** in the child environment. Node's
  V8 compile cache turns a cold start into a warm one, and it can be enabled
  implicitly. It is a real mitigation for SSR users (section 8) but it must not
  silently contaminate the baseline.
- **Splitting `compile()` out of the import.** `probes/run.mjs` can install a
  `module.registerHooks` shim that replaces `@twinkleplop/core/compile`'s
  `compile` export with a no-op returning `{ token_types: [], name: "stub" }`.
  Every language index is structurally identical — `export const grammar =
  compile(raw_grammar)` followed by `create_language(grammar, reclassifiers)`,
  and nothing reads the grammar at module scope — so the stub is inert and the
  difference between the stubbed and real import is the cold cost of compiling
  that grammar. This is the cleanest split I could get without shipping a
  modified build.

### Limitations, stated plainly

1. **No noise floor.** I cannot tell you the smallest effect this instrument can
   see. I can tell you the IQR, which is 2-8% on most scenarios. Treat anything
   under about 10% as unproven. Where a result matters I re-ran it and say so.
2. **Cross-run comparisons are invalid.** The machine's speed moved by 10%
   between runs taken an hour apart, with nothing changed: bare-node boot was
   17.7 ms in Run A, 19.6 ms in Run C, 17.0 ms in Run E. **Only compare rows
   within a single table.** Every table below is labelled with the run it came
   from for exactly this reason:

   | run | mode | when | bare-node boot |
   | --- | ---- | ---- | -------------: |
   | A | `full` | before the Python fix | 17.7 ms |
   | C | `revive` | before the fix | 19.6 ms |
   | D | `survey` | after the fix | 19.1 ms |
   | E | `bundle` | after the fix | 17.0 ms |
3. **Node, not a browser or an edge runtime.** Everything here is Node v25.1.0
   on an M1 Max. Workerd, Deno and browsers have different module loaders,
   different bootstrap costs and in some cases snapshot the module graph. The
   *shape* of the finding should carry; the numbers should not be quoted for
   those platforms.
4. **Measuring unbundled dist files overstates the library's share.** Node
   resolves nine separate modules through pnpm symlinks and `exports` maps. A
   bundled consumer resolves none of them at runtime. This turned out to be a
   large effect and section 5 quantifies it. Any figure in section 2 or 3 that
   comes from importing `languages/*/dist/index.js` includes resolution cost
   that a real front end never pays.
5. **Wall-clock includes spawn.** `bare node` costs 41-45 ms of wall time of
   which only ~18 ms is inside the process. The remaining ~24 ms is fork, exec
   and teardown — my instrument's overhead, not anyone's cold start. **The
   in-process columns are the meaningful ones.** Wall is reported only to show
   the instrument is consistent.
6. **Per-language figures do not sum.** Each per-language row was measured in
   its own process, so each pays first-call tier-up of the compiler itself.
   Summing them overstates the multi-language total by about 2.6x, as section 2
   shows. The `docs-bundle` rows are the trustworthy aggregate.
7. **The corpus for time-to-first-highlight is the `micro` family.** Small
   snippets, chosen because that is the docs-site shape. Conclusions about
   startup-vs-highlighting ratios do not transfer to a page highlighting a
   200 KB file.

Reproduce with:

```bash
pnpm build

# runs A and D: per language import, compile, bind, time to first highlight
node lib/bench/coldstart/bin/coldstart.mjs --mode full   --samples 25 --warmup 6

# run E: bundled vs unbundled, lazy compile, and the v8 compile cache
node lib/bench/coldstart/bin/build-artifacts.mjs
node lib/bench/coldstart/bin/coldstart.mjs --mode bundle --samples 30 --warmup 6

# run C: shipping the compiled tables instead of computing them
node lib/bench/coldstart/bin/build-revive.mjs
node lib/bench/coldstart/bin/coldstart.mjs --mode revive --samples 25 --warmup 6

# bytes, and how the encodings compress
node lib/bench/coldstart/bin/serialise-size.mjs
```

Every one of these takes the machine lock and will queue behind other agents.

---

## 2. How much is it?

**Run A**, `--mode full`, 25 samples after 6 discarded, Node v25.1.0, M1 Max.

### The process floor

| scenario            | wall ms | iqr% | in-process ms |
| ------------------- | ------: | ---: | ------------: |
| bare node           |    41.1 |    6 |          17.7 |
| + `@twinkleplop/core` |  43.3 |    4 |          2.05 |

Node itself costs 17.7 ms before user code runs. Nothing in this library can
move that, and it is excluded from every "our share" figure below. Core's
production bundle is 109 KB and parses and evaluates in **2.05 ms**.

### Per language, with core already loaded

`import` is module parse + evaluate + `compile()`. `stub` is the same import
with `compile()` replaced by a no-op. `cold compile` is the difference.
`recompile` is a *second* compile of the same grammar in the same process — the
compiler's code paths are warm by then, so it is a lower bound, and the gap
between it and `cold compile` is first-call tier-up of the compiler itself.

| language   | import | stub | cold compile | recompile | iqr% |
| ---------- | -----: | ---: | -----------: | --------: | ---: |
| bash       |   4.96 | 2.94 |         2.02 |      0.77 |    6 |
| css        |   4.04 | 2.76 |         1.28 |      0.61 |    5 |
| diff       |   3.65 | 2.66 |         0.99 |      0.44 |    2 |
| diff-basic |   3.22 | 2.08 |         1.14 |      0.19 |    5 |
| go         |   4.07 | 2.93 |         1.14 |      0.53 |    4 |
| html       |   8.54 | 5.81 |         2.73 |      0.28 |    8 |
| javascript |   8.33 | 5.78 |         2.56 |      0.73 |    4 |
| json       |   3.38 | 2.48 |         0.90 |      0.21 |    8 |
| markdown   |   3.95 | 2.81 |         1.14 |      0.89 |    6 |
| **python** | **14.1** | 3.24 |    **10.9** |      7.11 |    4 |
| rust       |   4.36 | 3.11 |         1.25 |      0.89 |    7 |
| sql        |   4.30 | 2.92 |         1.38 |      0.90 |    7 |
| svelte     |   9.42 | 6.59 |         2.83 |      0.27 |    6 |
| toml       |   5.13 | 3.00 |         2.14 |      0.93 |    7 |
| tsx        |   11.8 | 7.57 |         4.22 |      0.94 |    4 |
| typescript |   10.0 | 6.79 |         3.22 |      0.69 |    3 |
| whitespace |   1.57 | 0.38 |         1.18 |      0.08 |    8 |
| yaml       |   4.22 | 2.83 |         1.39 |      0.64 |    5 |

Two things fall out immediately.

**Compile is roughly a third of the import, not the whole of it.** The `stub`
column — parse, evaluate, and Node's module resolution — is consistently the
larger half. Any plan that only attacks `compile()` is attacking the smaller
part of the problem.

**These rows do not add up to a multi-language total.** Each was measured alone
in its own process, so each pays the compiler's first-call tier-up. The seven
docs-bundle languages sum to 13.85 ms of `cold compile` here but compile in
5.3 ms when measured together — a 2.6x overstatement. The `recompile` column is
the better guide to what an *additional* grammar costs once the compiler is warm:
0.2 to 0.9 ms, and 7.1 ms for Python.

**Python is a ten-times outlier**, and unlike everywhere else its `recompile`
(7.11 ms) is close to its cold compile, meaning it is real work rather than
tier-up. Diagnosed and fixed in section 6.

### A realistic multi-language bundle

`javascript + typescript + css + html + markdown + bash + json`, all in one
process, which is what a docs site actually does. Fixed before any numbers were
taken so it could not be tuned to flatter a result.

| component                    | eager (ms) | compile stubbed (ms) |
| ---------------------------- | ---------: | -------------------: |
| node boot (not ours)         |       17.4 |                 17.4 |
| core parse + evaluate        |       2.02 |                 2.12 |
| seven language imports       |       14.4 |                 9.13 |
| **total in-process**         |   **34.8** |                 29.9 |
| total wall incl. spawn       |       57.3 |                 52.5 |

**This library's share of the cold start is 17.4 ms** (34.8 − 17.4 node boot).
It splits roughly:

| part                                  |   ms | share |
| ------------------------------------- | ---: | ----: |
| language module parse + eval + resolve | 9.1 |   52% |
| `compile()` for all seven grammars     | 5.3 |   30% |
| core parse + evaluate                  | 2.0 |   12% |
| unattributed                           | 1.0 |    6% |

The first row is not all real work: section 5 splits it, and about 5.4 ms of it
is Node's module resolver, which vanishes the moment a bundler is involved.

Two figures for "the library's share" appear in this document and they differ by
about 1.6 ms. **15.8 ms** is the sum of what my marks attribute (core parse +
eval, plus the seven language imports). **17.4 ms** is total in-process minus
bare-node boot, which additionally catches loader setup and teardown that no
mark brackets. The end-to-end 17.4 is the number a consumer feels; the 15.8 is
the number I can decompose. Section 3 uses the former, section 5 the latter.

The 5.3 ms compile figure replicated. Run D, taken later on a measurably slower
machine, put the same docs bundle at 16.4 ms of language imports against 11.4 ms
stubbed — **5.2 ms of compile**. Python is not in this bundle, so the fix cannot
explain the difference; the machine drift landed entirely in the parse and
resolve half, and the compile term held steady across two runs an hour apart.

### `bind` is not a factor

`lang.tokenize(options)`, microseconds. `1` is the first call in the process;
`N` is the mean of twenty more.

| language   | high 1 | high N | low 1 | low N | allow 1 | allow N |
| ---------- | -----: | -----: | ----: | ----: | ------: | ------: |
| bash       |  117.1 |    0.7 |  12.8 |   2.2 |    23.4 |     1.8 |
| css        |   92.5 |    0.6 |  11.5 |   1.8 |    22.1 |     1.8 |
| diff       |   86.2 |    0.4 |   5.0 |   1.7 |    10.6 |     1.3 |
| diff-basic |   88.3 |    0.5 |   5.1 |   1.7 |    10.2 |     1.3 |
| go         |  102.1 |    0.8 |  12.4 |   2.3 |    23.2 |    13.9 |
| html       |   94.2 |    0.6 |  11.2 |   2.0 |    11.9 |     2.0 |
| javascript |   90.6 |    0.9 |  13.1 |   3.0 |    23.3 |     3.3 |
| json       |   85.9 |    0.4 |   5.5 |   1.7 |    10.6 |     1.4 |
| markdown   |  125.5 |    0.5 |  14.3 |   2.1 |    23.0 |     1.8 |
| python     |  137.8 |    1.0 |  17.2 |   2.9 |    27.1 |     3.8 |
| rust       |  127.6 |    1.0 |  14.7 |   3.1 |    27.0 |     2.8 |
| sql        |  103.5 |    0.6 |  11.8 |   1.9 |    24.6 |     1.6 |
| svelte     |   84.9 |    0.6 |  11.6 |   2.1 |    12.0 |     1.5 |
| toml       |   98.4 |    0.4 |   6.9 |   1.6 |    10.2 |     1.1 |
| tsx        |  126.0 |    1.2 |  20.4 |   4.5 |    33.5 |     3.3 |
| typescript |  104.3 |    1.2 |  15.6 |   4.1 |    30.5 |     3.8 |
| yaml       |   94.3 |    0.6 |  11.4 |   2.0 |    23.4 |     1.8 |

**This section is written to be quotable on its own, because the reclassifier
track needs it.** See section 7.

---

## 3. Startup cost versus the work it enables

The reference figure is `micro/typescript` from `lib/bench/perf/BASELINE.md`:
779 bytes of TypeScript through the full `html` path, **103.1 microseconds**
steady state.

Against this library's 17.4 ms share of a seven-grammar cold start:

| question | answer |
| -------- | ------ |
| Startup, in units of small TypeScript blocks | **169 blocks** |
| Compiling the TypeScript grammar alone (3.22 ms) | 31 blocks, ~24 KB of TypeScript |
| Importing `@twinkleplop/typescript` (10.0 ms) | 97 blocks |

**A page with 40 small code blocks spends 17.4 ms starting this library and
4.1 ms highlighting.** Startup is 4.2x the work it enables. The crossover is
around 170 blocks, which almost no documentation page reaches.

That is the steady-state framing, and it is the one that matches how the rest of
the repo measures. The cold-to-cold framing is kinder, because the first
highlight is also unwarmed:

| language   | import | bind | first highlight | highlight after 20 |
| ---------- | -----: | ---: | --------------: | -----------------: |
| typescript |   9.99 | 0.09 |            5.42 |               0.45 |
| javascript |   8.17 | 0.09 |            3.97 |               0.41 |
| markdown   |   4.02 | 0.10 |            0.72 |               0.12 |
| css        |   4.10 | 0.09 |            1.31 |               0.13 |
| json       |   3.31 | 0.09 |            0.55 |               0.11 |

The very first TypeScript highlight costs **5.42 ms**, twelve times the same
call twenty iterations later and roughly fifty times its fully warm steady-state
cost. On that basis a 40-block page spends about 17 ms highlighting against
17.4 ms of startup — call it 1:1.

**Both framings agree on the conclusion**: for a documentation page, module
startup is the same order of magnitude as all the highlighting on the page, and
below about 40 blocks it dominates. Time to first highlight for a single
TypeScript block in a cold process is **15.5 ms**, of which 10 ms is import and
0.09 ms is bind.

---

## 4. Can the compiled form be shipped instead of computed?

First, a correction to the premise. `compiled-json-grammar.json` and
`compiled-reclassifier-rules.json` in the repo root are **not** evidence that
serialisation was considered. They are corpus input:
`lib/bench/perf/bin/build-corpus.mjs:106` maps `compiled-json-grammar.json` into
the corpus as `real/compiled-grammar.json`, a large realistic JSON file to
highlight. Nothing in any build reads them.

### The bytes

`bin/serialise-size.mjs`, measured before the Python fix in section 6.
`binary` is every typed array packed back to back; `side json` is the Maps and
Sets that are not typed arrays.

| language   | states | dist js | dist gz | binary  | side json | raw gz | raw br | b64 br |
| ---------- | -----: | ------: | ------: | ------: | --------: | -----: | -----: | -----: |
| bash       |     51 |   10505 |    3178 |  104856 |     19812 |   3231 |   2068 |   2270 |
| css        |     44 |    8022 |    1794 |   79156 |      5279 |   2062 |   1610 |   1852 |
| diff       |     27 |    5701 |    1229 |   48573 |      4437 |   1645 |   1349 |   1446 |
| diff-basic |      8 |    1627 |     655 |   14392 |      1097 |    548 |    427 |    483 |
| go         |     34 |    8924 |    2631 |   69904 |      4625 |   1964 |   1536 |   1671 |
| html       |     27 |    3313 |    1039 |   55512 |      5423 |   1165 |    906 |   1084 |
| javascript |     57 |   24048 |    6292 |  117192 |     20805 |   3490 |   2526 |   2878 |
| json       |     12 |    2000 |     751 |   24672 |       786 |    632 |    517 |    606 |
| markdown   |     32 |    7497 |    1800 |   57568 |     12046 |   2038 |   1525 |   1681 |
| python     |     61 |   15409 |    3663 |  125416 | **4083896** | 779214 | 157201 | 158667 |
| rust       |     38 |   13736 |    3796 |   78128 |      9142 |   2535 |   2055 |   2292 |
| sql        |     53 |   11902 |    3830 |   95347 |      5270 |   1976 |   1530 |   1713 |
| svelte     |     41 |    5497 |    1606 |   84296 |      9170 |   1930 |   1546 |   1724 |
| toml       |    110 |    7855 |    1826 |  226160 |     10029 |   3121 |   2234 |   2773 |
| tsx        |     73 |    5533 |    1749 |  150088 |     26857 |   4905 |   3499 |   3851 |
| typescript |     58 |   13620 |    3759 |  119248 |     23970 |   3736 |   2715 |   3050 |
| whitespace |      1 |     470 |     286 |    1799 |       209 |    214 |    176 |    194 |
| yaml       |     58 |    9855 |    2491 |  104342 |      2899 |   1847 |   1417 |   1623 |
| TOTAL      |    785 |  155514 |   42375 | 1556649 |   4245752 | 816253 | 184837 | 189858 |

The surprise is that **the compressed size is not the problem**. Excluding
Python, seventeen serialised compiled grammars brotli to **27.6 KB**, against
**38.7 KB** for the gzipped dist modules that compute them. The transition table
is allocated at 256 rule slots per state and almost every slot holds the 65535
sentinel, which compresses to nothing. Note how differently the two encodings
compress: the packed binary brotlis to about 2% of its raw size, while base64 of
exactly the same bytes lands 9-17% larger after compression, because base64
destroys the byte-aligned runs the compressor was exploiting. If this were ever
revisited, the payload should arrive as bytes, not as a string literal.

The raw size is another matter: 1.5 MB of typed arrays across eighteen
languages, 119 KB for TypeScript alone. Base64 inflates that by a third *before*
compression, and a 160 KB string literal is real parse work for V8 even if it
arrives on the wire as 3 KB.

Python's 4 MB side table is a direct consequence of the per-codepoint map
described in section 6 — serialising Python was not even possible before that
fix. After it, Python's side table is 16,976 bytes and the totals for all
eighteen languages become **1.74 MB raw, 40.6 KB gzip, 30.1 KB brotli**, against
42.4 KB of gzipped dist modules. So on the wire the proposal is a genuine, if
modest, *win*.

### The prototype

`bin/build-revive.mjs` emits, per language, a self-contained ES module carrying
the tables as base64 plus a JSON side table, with a `revive()` that rebuilds the
`CompiledGrammar` at module scope. It verifies the revived grammar field by
field against the compiled one before writing, and all seven docs-bundle
languages verify clean.

**Run C**, `--mode revive`, 25 samples after 6 discarded. `revive` is importing
that module; `compile` is the cold compile it would replace; `import revived` is
`stub` plus `revive`, which is what the package would cost if the proposal
shipped.

| language   | revive | compile | import today | import revived |
| ---------- | -----: | ------: | -----------: | -------------: |
| javascript |   8.93 |    2.64 |         9.80 |           16.1 |
| typescript |   9.06 |    3.53 |         11.5 |           17.1 |
| css        |   6.10 |    1.49 |         4.79 |           9.40 |
| html       |   4.84 |    3.00 |         10.1 |           11.9 |
| markdown   |   5.14 |    1.22 |         4.61 |           8.53 |
| bash       |   8.12 |    2.45 |         5.89 |           11.6 |
| json       |   2.85 |    1.18 |         4.03 |           5.70 |

**Reviving costs 1.6x to 4.2x more than compiling, in every language.** The
proposal is not close. Shipping compiled grammars would make every package
18-97% slower to import — `@twinkleplop/typescript` would go from 11.5 ms to
17.1 ms.

This is not an artifact of a lazy prototype. The work is irreducible: a 159 KB
base64 string literal has to be parsed by V8 and decoded, and then the Maps,
Sets and `PatternInfo` objects have to be rebuilt entry by entry — thousands of
small allocations. The compiler, meanwhile, is a tight loop over a compact DSL
that fills pre-allocated typed arrays. **Computing the tables is simply cheaper
than describing them**, and the encoding is not the bottleneck, so no amount of
cleverness with the format recovers it.

The bytes were the plausible objection and they turned out to be fine. The
timing kills it anyway.

---

## 5. Is compile lazy-able? And how much of this is Node's resolver?

**Run E**, `--mode bundle`, 30 samples after 6 discarded, taken after the Python
fix on a machine at the same speed as Run A (bare-node boot 17.0 vs 17.7 ms).
Everything in this section is from this one run, so the rows are comparable to
each other.

| artifact                          | node boot | import | in-process | wall | iqr% |
| --------------------------------- | --------: | -----: | ---------: | ---: | ---: |
| unbundled, 9 modules              |      16.9 |  15.8* |       34.3 | 56.8 |    2 |
| `bundle-dist` (same code, 1 chunk) |     17.2 |   10.4 |       28.4 | 50.7 |    3 |
| `bundle-eager` (esbuild from src) |      17.0 |   11.4 |       29.3 | 52.2 |    4 |
| `bundle-lazy` (esbuild, deferred) |      17.0 |   8.37 |       26.1 | 48.8 |    4 |

\* core parse+eval 2.02 plus all seven language imports 13.8.

Three separate results.

**Bundling saves 5.4 ms — a third of the library's cold start — for free.**
`bundle-dist` is the shipped dist files concatenated, so the executing code is
byte for byte identical to the unbundled case; the entire 15.8 vs 10.4 gap is
Node walking pnpm symlinks and `exports` maps for nine modules. **A consumer
using Vite, webpack or esbuild already gets this and never pays it.** It is the
single largest term in the breakdown and it is not this library's cost at all.
SSR users importing unbundled from `node_modules` are the ones actually paying
it, and they are the audience for the packaging note in section 8.

Rebuilding from source with esbuild (`bundle-eager`, 11.4 ms) is 1 ms *worse*
than concatenating the vite-built dist files (10.4 ms), which is a bundler
difference rather than anything about this library, and is why `bundle-dist`
exists: without it I would have attributed that 1 ms to module resolution.

**Lazy compile saves 3.0 ms of an 11.4 ms bundled import**, 26%. The lazy bundle
is also *smaller* (131.9 KB against 139.9 KB) because it drops the per-language
index glue.

**With the resolution term isolated, the honest decomposition of the library's
15.8 ms is:**

| part | ms | share | who pays it |
| ---- | -: | ----: | ----------- |
| Node module resolution | 5.4 | 34% | unbundled SSR only |
| `compile()`, seven grammars | 4.8 | 30% | everyone |
| module parse + evaluate | 5.6 | 35% | everyone |

So for a bundled consumer the real figure is about **10 ms**, split roughly half
compile and half parse.

### What Node's V8 compile cache is worth

Same run, same bundle, with `NODE_COMPILE_CACHE` pointed at a persistent
directory:

| component | default | compile cache |
| --------- | ------: | ------------: |
| core parse + evaluate | 2.02 | **0.69** |
| seven language imports | 13.8 | 12.7 |
| total in-process | 34.3 | **31.9** |

**It saves 2.4 ms, 7% of the in-process cold start.** Almost all of the saving
is in core (-66%), because the cache attacks parse and only parse. The language
imports barely move, since their cost is compile and resolution rather than
parse. It is a real, free mitigation for a long-running SSR process, and it is
also confirmation that parse is not where the remaining money is.

But laziness only defers. A consumer that eventually highlights all seven
languages pays exactly the same total; it just pays it after first paint instead
of before. The win is real only because a docs *page* typically uses two or
three of the languages its *site* bundles.

And it costs API. An ESM named export cannot be a lazily evaluated getter, so
`export const grammar = compile(raw_grammar)` cannot become lazy while staying a
value. `grammar` would have to become `grammar()`. That is a breaking change to
every language package's public surface, for 3.0 ms on a seven-grammar bundle
and 0 ms for anyone who uses what they import. I built it and measured it; I am
**not proposing it**. See section 8.

---

## 6. The one thing I changed: Python's grammar compiled ten times slower

`languages/python/src/grammar.ts:267`:

```ts
const NON_ASCII = range([[0x80, 0xffff]]);
```

That is the ordinary way to say "any non-ASCII identifier character", and Python
uses it in three rules. The compiler expanded it one codepoint at a time:

```ts
for (let code = start; code <= end; code++) {
  if (code < 128) set_char_mapping(char_maps, state_id, code, rule_idx);
  else state_non_ascii[code] = rule_idx;   // 65408 own properties, per state
}
```

`non_ascii_chars` was `Map<number, Record<number, number>>`, so each use
materialised 65,408 own properties on a dictionary-mode object. Roughly 196,000
property writes at import, which is the 10.9 ms, and the 4 MB side table in
section 4.

The fix stores ranges as ranges. `non_ascii_chars: Map<number, Record<number,
number>>` becomes `non_ascii_ranges: Map<number, Int32Array>` holding flat
`[start, end, rule_idx]` triples; the tokenizer scans the list instead of
indexing a map. The scan is only reached for codepoints >= 128 and the lists
hold one to three entries, so it is a cold path made of a handful of integer
comparisons.

**Run D**, `--mode survey`, 25 samples after 6 discarded, taken after the fix.
The machine was slower during Run D than Run A (bare-node boot 19.1 vs 17.7 ms),
so the honest way to read this is **against a control language measured in the
same run**. `bash` is the control: it is untouched by the change and sits in the
same size class.

| measurement            | Run A (before) | Run D (after) |
| ---------------------- | -------------: | ------------: |
| python cold compile    |        10.9 ms |       2.32 ms |
| bash cold compile (control) |    2.02 ms |       2.29 ms |
| **python / bash**      |      **5.4x** |     **1.01x** |
| python recompile       |        7.11 ms |       0.95 ms |
| bash recompile (control) |      0.77 ms |       0.89 ms |
| **python / bash**      |      **9.2x** |     **1.07x** |
| python full import     |        14.1 ms |       6.14 ms |
| bash full import (control) |    4.96 ms |       5.72 ms |
| **python / bash**      |     **2.84x** |     **1.07x** |

**Python was 5.4x the control on compile and is now 1.01x.** It has stopped
being an outlier on every column. Its full import fell from 14.1 ms to 6.14 ms.

Its serialised side table fell from **4,083,896 bytes to 16,976** — a 240x
reduction — which is what removes the blocker described in section 4.

Correctness: `pnpm test` passes 1719 tests including
`languages/python/test/unicode.*`, which covers `π`, `λ`, `蛇`, `café` and
`ř_1` as identifiers, and `parity.mjs` reports no divergences across 287 checks.
`corpus/fixtures/python.py` contains non-ASCII on six lines, so parity exercises
the changed tokenizer path rather than merely compiling past it.

Steady state: every runtime mode is flat (section 9). The scan-side change is a
short integer-range scan replacing a property load, reached only for codepoints
>= 128, and it costs nothing measurable. The change is **not** free, though:
compiling a grammar with no non-ASCII rules got 2-5% slower, which is roughly
+30 us across a seven-grammar bundle against -7.8 ms for Python. Section 9 has
the numbers and what I tried to recover it.

**Is this "a change that only helps one language"?** Today, yes — Python is the
only grammar using a non-ASCII range, so it is the only one whose numbers move.
I am flagging that honestly rather than dressing it up. The reason I still think
it belongs: the mechanism is entirely language-agnostic, the old cost was linear
in how wide a range an author writes with no upper bound short of the whole BMP,
and "accept any Unicode identifier
character" is the obvious thing to write in any grammar for a language with
Unicode identifiers. The next grammar to need it would hit the same wall. It
also removes the only thing that made serialising a compiled grammar impossible.

---

## 7. For the reclassifier track: what `bind` actually costs

Standalone section, because the other track's question — should work move out of
run time and into bind time — depends on it.

**Bind is 0.4 to 4.5 microseconds.** From the table in section 2:

| shape | what it does | steady-state cost |
| ----- | ------------ | ----------------: |
| `{fidelity: "high"}` | maps the pipeline array, builds no downgrade table | **0.4 - 1.2 us** |
| `{fidelity: "low"}` | plus a dense `Int32Array` downgrade table | **1.6 - 4.5 us** |
| `{fidelity: [...]}` | plus a `Set` and an intersection per pass | **1.1 - 4.4 us** |

The heaviest languages are the heaviest binds, as expected: `tsx` 4.5 us and
`typescript` 4.1 us at low fidelity, against `json` 1.7 us.

The `allow N` column throws occasional 13-17 us outliers, but on a *different*
language each run — `go` in one, `css` and `go` in another, both around 1.8 us in
the run where they were not outliers. At this scale a single GC pause lands
inside the mark, so I read those as noise rather than as anything about those
languages. It is also the clearest illustration of why this instrument has no
noise floor: I cannot prove that, only note that it does not replicate.

**Ignore the `1` columns.** The first bind in a process reads 85-138 us, which is
*larger* for `high` than for `low` even though `high` does strictly less work.
That inversion is the giveaway: `high` runs first in my probe and absorbs V8's
first-call tier-up of `select_pipeline` and `reclassify`. It is tier-up, not
bind.

What this means for moving work into bind:

- **There is a lot of headroom.** Against `micro/typescript`'s 103 us
  steady-state end-to-end, bind is 1-4% of one small highlight. Work moved into
  bind is nearly free for a consumer that binds once.
- **Per-block rebinding does not change that.** This is the case the brief
  worried about, and the data says not to. A consumer rebinding per block pays
  the `N` column, 4.1 us for TypeScript at low fidelity, against ~103 us for the
  block itself — under 4%. Even a 10x increase in bind cost would still be under
  a third of one small block, and would be invisible on any block larger than a
  few hundred bytes.
- **The thing to watch is not time, it is allocation.** `build_downgrade`
  allocates an `Int32Array` per bind. Per-block rebinding across hundreds of
  blocks makes that a GC question rather than a CPU one, and my instrument does
  not measure GC pressure.
- **Caveat.** These are microsecond-scale measurements taken by an instrument
  with no calibrated noise floor. Treat them as order-of-magnitude — "bind is
  microseconds, not milliseconds" — rather than as precise values, and confirm
  anything load-bearing with the `bind` mode of the `full` suite in the paired
  A/B harness.

One concrete candidate I noticed while checking that my `compile` stub was inert,
offered without having measured it: `embed_grammars`
(`lib/core/src/reclassifier.ts:3537`) resolves its mapping keys to host type ids
with `host_types.indexOf(name)` on **every call**, inside the returned
reclassifier rather than in the factory. The host's `token_types` is fixed at
bind time, so that resolution could be hoisted. Svelte spends 61% of a 714-byte
highlight in reclassification per `BASELINE.md`, and this is on that path. Given
that bind is single-digit microseconds, hoisting it is close to free on the bind
side.

---

## 8. Everything I rejected, and why

**Ship compiled grammars as base64 instead of computing them.** Built a
verified prototype and measured it. Reviving the tables costs 1.6-4.2x *more*
than compiling them from the DSL, in all seven languages tested — importing
`@twinkleplop/typescript` would go from 11.5 ms to 17.1 ms. The bundle-size
objection turned out not to be the problem: brotli'd compiled tables are 30 KB
across all eighteen languages against 42 KB of gzipped dist modules, because the
transition table is mostly the 65535 sentinel. It is the runtime cost that
kills it — parsing a 159 KB string literal and rebuilding thousands of Map
entries and `PatternInfo` objects is more work than running the compiler.
Comprehensively rejected; the prototype is kept in
`lib/bench/coldstart/bin/build-revive.mjs` so nobody has to try it twice.

**Make `compile()` lazy in the language packages.** Measured: saves 3.0 ms of an
11.4 ms bundled import, and the lazy bundle is 8 KB smaller. Rejected because it
requires changing `grammar` from a value export to a function across all
eighteen packages — ESM cannot express a lazily evaluated named export without a
`Proxy`, and a `Proxy` on the compiled grammar would add an indirection to every
property read in the tokenizer's hot loop, which is exactly the wrong trade. It
also only defers work rather than removing it: a consumer that uses every
language it imports saves nothing. 3.0 ms is not worth a breaking change to
every package's public surface. If the API were being designed fresh, `grammar`
should have been a function.

**Lazy-compile behind a `Proxy` so the API stays identical.** Rejected without
measuring. The compiled grammar's fields are read on every character in
`tokenizer.ts`; a `Proxy` trap on that path would be a steady-state regression
far larger than the 3.0 ms of startup it buys. This is the "moving work rather
than removing it" failure the harness README warns about, in its worst form.

**Shrink the transition table.** `transitions` is allocated at
`state_count * 256 * 3` `Uint16`s and grammars use a small fraction of the 256
rule slots — 1.5 MB of mostly-sentinel across eighteen languages. Compacting it
would cut allocation and zeroing at compile time. Rejected **for this track**:
the table is indexed as `state * 256 * 3 + rule * 3` throughout the tokenizer's
hot loop, so compaction means an indirection or a per-state stride on the
hottest path in the system. That is a scanner-track change with a steady-state
risk profile, and the cold-start prize is a fraction of the 5.3 ms compile total.
Flagging it for the scanner track rather than doing it here.

**Enable Node's V8 compile cache from inside the library.** Measured (section
5): `NODE_COMPILE_CACHE` saves 2.4 ms, 7% of the in-process cold start, almost
all of it in core's parse. Rejected as a library change because calling
`module.enableCompileCache()` from a highlighter would be surprising behaviour
that writes to the user's filesystem without being asked, and it does nothing
for browsers or most edge runtimes. **Worth a line in the SSR documentation**,
which is a docs change rather than a code one. My harness explicitly clears
`NODE_COMPILE_CACHE` in every other scenario so it cannot contaminate a
measurement.

**Bundle the language packages into one `@twinkleplop/all` entry point.**
Rejected as a *library* change: the 5.4 ms is Node's resolver, and any consumer
with a bundler already gets it. Shipping a pre-bundled entry would help exactly
the unbundled-SSR case while making every bundled consumer's tree-shaking worse.
Worth documenting for SSR users, not worth restructuring packages for.

**Optimise `preprocess_grammar` / the `match_within` expansion.** Looked at it
because it allocates a fresh grammar object graph before compilation proper.
Rejected: the remaining per-grammar warm compile cost is 0.2-0.9 ms, and the
`docs-bundle` measurement shows seven grammars compiling in 5.3 ms in total.
Summing the seven `recompile` figures gives 4.2 ms, so only about 1.1 ms of that
5.3 is one-off tier-up and the other 4.2 ms is grammar-proportional work spread
across seven grammars. Halving the grammar-proportional half of a 5.3 ms term
inside a 17.4 ms cold start is not worth destabilising the compiler for.

**Trimming the `micro` corpus or picking a friendlier docs bundle.** The bundle
in section 2 was fixed before any measurement. I mention it because it would
have been the easy way to make section 3's ratio look better.

---

## 9. Correctness

### Parity and tests: clean

```
node lib/bench/perf/bin/parity.mjs
  parity: 287 checks across 4 families, corpus 73b6d51a2c464ba5
  no divergences. output is identical on every checked path.

pnpm test
  Test Files  69 passed (69)
  Tests  1719 passed | 1 skipped (1720)
```

Both were re-run after the final revision of the change, not only after the
first draft of it.

### Steady state: flat, with one honest exception

```
node --expose-gc lib/bench/perf/bin/ab.mjs --suite full --label cold-start --repeat 2
```

328 workloads, two independent passes, against the frozen reference at
`455158ace685`.

| mode | geomean | n |
| ---- | ------: | -: |
| `tokenize` | **-0.0%** | 74 |
| `pipeline` | **-0.1%** | 71 |
| `html` | **-0.2%** | 71 |
| `fidelity` | **-0.1%** | 71 |
| `annotation` | -0.3% | 6 |
| `bind` | -1.7% | 17 |
| `compile` | +14.2% | 18 |

**Every runtime path is flat.** The four modes a consumer actually spends time
in move by 0.2% or less, and no individual `tokenize`, `pipeline`, `html` or
`fidelity` workload cleared the 3.4% per-workload floor in either direction.

Judging those geomeans against 3.4% would be too lenient, so I am using the
**group floor** instead. `lib/bench/perf/README.md` on `perf-exploration` gained
a `group-floor.mjs` calibration after my branch point: resampled from the A/A
run, a geomean over ~54 workloads has a p99 of 0.62% and over 147 workloads
0.45%. My runtime groups are n=71 to n=74, so their floor is around 0.5%.
`tokenize` at -0.0%, `pipeline` at -0.1%, `fidelity` at -0.1% and `html` at
-0.2% all sit inside that — at or below the p50 of pure noise. **Flat by the
strict test, not just the lenient one.**

That is the result that matters: the tokenizer's non-ASCII lookup replaced a
property load with a two-comparison loop on a path only reached for codepoints
>= 128, and it costs nothing measurable.

`compile` +14.2% is Python, obviously: `setup/python:compile` went from
**8.34 ms to 532 us, a 15.5x speedup**, with a CI of +1418% to +1533%.

**But `compile` is 2-5% slower on grammars that have no non-ASCII rules, and I
could not make that go away.** Excluding Python, the compile-mode geomean is
**-2.03% across the other 17 languages, with 13 of 17 negative**. Against the
group floor above — p99 around 0.7% for a group of that size — that is not
close to noise; it is roughly three times the p99. The group was also not
chosen after seeing the numbers: it is "every language except the one the change
targets", which is the honest partition. A confirmation run narrowed to the
setup workloads with `--rounds 25 --repeat 2` put four individual rows over even
the lenient per-workload floor:

| workload | base | candidate | delta |
| -------- | ---: | --------: | ----: |
| `setup/toml:compile` | 251.0us | 262.1us | -5.7% |
| `setup/svelte:compile` | 93.5us | 99.5us | -5.2% |
| `setup/html:compile` | 52.3us | 55.0us | -5.2% |
| `setup/sql:compile` | 127.5us | 131.5us | -5.1% |
| `setup/typescript:compile` | 273.6us | 279.9us | -2.0% |

I tried one fix: hoisting the `add_non_ascii` helper out of `compile()` so
grammars with no non-ASCII rules do not allocate a closure per call. It did not
recover the regression — the numbers above are *after* that change. The
remaining candidates are the second `Map` the conversion step allocates and
plain code-layout effects on V8's inlining of a now slightly larger `compile()`.
I stopped chasing it rather than churn the compiler on a hunch.

**The trade, stated in absolutes rather than percentages:** +6.3 us on a
TypeScript compile, roughly +30 us across a whole seven-grammar docs bundle,
against **-7.8 ms** on Python. That is a 250:1 return, and it is confined to
the startup path — no runtime mode moved. I think it is clearly worth taking,
but it is a real cost and it should be visible to whoever decides.

Also worth recording: `bind` came back -1.7% in the full run and **+0.1%** in
the narrowed confirmation run. `setup/html:bind` was flagged as a -4.0%
regression in the first run at **34ns against 35ns** — a one-nanosecond
difference. It did not replicate. This is the concrete example behind section
7's caveat that bind figures are order-of-magnitude only.

### Branch point

This branch is based on `571af87` ("add paired ab perf harness with frozen
baseline"). `perf-exploration` has advanced since, with harness improvements and
a change to `lib/core/src/generator.ts` from another track. **I deliberately did
not merge it.** The A/B above attributes its numbers to my change alone; pulling
in another agent's `lib/core` change would make the candidate arm measure both
of us and the attribution would be worthless. The frozen reference is
`455158ace685` either way, so a merge and a re-run should reproduce these
numbers for the parts that are mine. There should be no textual conflict:
upstream touched `generator.ts`, I touched `compiler.ts`, `tokenizer.ts` and
`types.ts`.

### Run integrity

The full-suite run reported machine anchor drift of -4.0% (235.7us to 226.3us)
and the narrowed run -2.1%. Another agent's work changed the machine's speed
mid-run, so the absolute `base`/`candidate` microsecond columns above should not
be compared against any other run. The paired ratios, which are what every claim
here rests on, are unaffected — that is the whole point of the interleaving.

---

## 10. What I would tell someone deciding what to do next

1. **Cold start is not nothing.** 17.4 ms of library startup against 4.1 ms of
   highlighting on a 40-block page is a real ratio, and it is invisible to every
   benchmark in the repo. If SSR or edge is a target, this deserves a permanent
   measurement, which is what `lib/bench/coldstart/` now is.
2. **The largest single term is not ours.** 5.4 ms of it is Node's module
   resolver, and bundled consumers already avoid it. The SSR-from-`node_modules`
   case is the only one paying it, and the fix for them is documentation
   (bundle your server, or set `NODE_COMPILE_CACHE`), not library surgery.
3. **`compile()` is 4.8 ms of it and mostly tier-up.** Once the compiler is
   warm, a marginal grammar costs 0.2-0.9 ms. Eliminating compilation entirely
   would save about 4.8 ms on a seven-grammar bundle, and both routes I measured
   to get there — shipping the tables, deferring the work — cost more than they
   saved or cost a breaking API change.
4. **`bind` is free.** Microseconds. Do not design around it, and do not let it
   block the reclassifier track.
5. **The Python fix was the only real bug in the area**, and it was worth more
   than every architectural idea in this document combined — an 8 ms import
   saved, against 30 us of compile-path regression spread over the other
   seventeen grammars.
6. **If someone picks this up again**, the two open threads are the 2-5% compile
   regression I could not explain (section 9) and the mostly-sentinel transition
   table (section 8), and the second is really a scanner-track question.
