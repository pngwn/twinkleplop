# Baseline reference figures

Frozen reference: `455158ace685` ("Merge pull request #15 from
pngwn/reclassifier-vm"), Apple M1 Max (8P + 2E), node v25.1.0, corpus
`73b6d51a2c464ba5`.

Absolute figures are only comparable to other numbers taken in the same
process. They are recorded here to answer "which stage is worth attacking",
not to be diffed against a later run. Use `bin/ab.mjs` for that.

## Harness calibration (A/A, two independent builds of the same commit)

| statistic                | value |
| ------------------------ | ----- |
| geomean speedup          | +0.0% (unbiased) |
| median deviation         | 0.4%  |
| p95 deviation            | 2.7%  |
| worst deviation          | 7.2%  |
| CI excluded 1.0          | 18 / 147 |
| **noise floor**          | **3.4%** |

## Stage breakdown

Sums over the whole family. `scan` is `core.tokenize`; `reclassify` is
`pipeline` minus `scan`; `render` is `html` minus `pipeline`.

| family | total    | scan | reclassify | render | scan throughput |
| ------ | -------- | ---- | ---------- | ------ | --------------- |
| `real` | 38.12 ms | 46%  | 21%        | 33%    | 27.5 MB/s       |
| `micro`| 669 us   | 30%  | 38%        | 32%    | 43.6 MB/s       |

The two profiles point at different things, and both are real consumer
shapes:

- **Large files** are scan-dominated (46%) with a large rendering tail (33%).
- **Small files** are dominated by the reclassifier pipeline's fixed per-call
  cost (38%) — TypeScript 57%, Svelte 61% — and the scanning loop barely
  runs.
- **Rendering is roughly a third of end-to-end in both**, which is the most
  consistent single target in the system and has had the least attention.

### `real` family, per workload

| workload                 | bytes  | tokens | total   | scan | reclass | render | scan MB/s | ns/token |
| ------------------------ | -----: | -----: | ------: | ---: | ------: | -----: | --------: | -------: |
| real/compiled-grammar    | 124022 |  28375 | 8.11ms  | 58%  |    0%   |  41%   |  26.2     |   286    |
| real/core-runtime        |  65894 |   7789 | 6.97ms  | 40%  |   35%   |  24%   |  23.4     |   895    |
| real/core-frames         |  55122 |   7920 | 6.33ms  | 39%  |   35%   |  26%   |  22.2     |   799    |
| real/core-types          |  54300 |   3638 | 4.15ms  | 52%  |   21%   |  27%   |  25.4     |  1140    |
| real/site                |  40864 |   7471 | 2.59ms  | 37%  |    3%   |  61%   |  43.2     |   346    |
| real/bench-suite         |  26389 |   5140 | 2.04ms  | 33%  |   31%   |  37%   |  39.4     |   398    |
| real/dashboard           |   8056 |   1947 | 1.37ms  | 30%  |   38%   |  32%   |  19.6     |   706    |
| real/architecture        |  25141 |    755 | 993us   | 71%  |    6%   |  24%   |  35.9     |  1316    |
| real/grammar-docs        |  20842 |    797 | 933us   | 64%  |    6%   |  31%   |  35.0     |  1171    |
| real/pipeline            |   8806 |   1957 | 817us   | 42%  |   27%   |  31%   |  25.8     |   418    |
| real/analysis            |   7975 |   1635 | 701us   | 48%  |   22%   |  30%   |  23.6     |   429    |
| real/site-codepanel      |   4712 |     97 | 693us   | 24%  |   50%   |  26%   |  28.1     |  7146    |
| real/server              |   8990 |   2271 | 544us   | 37%  |   13%   |  50%   |  44.5     |   239    |
| real/site-inspectorpanel |   3947 |    248 | 476us   | 30%  |   49%   |  22%   |  27.8     |  1920    |
| real/warehouse           |   6876 |   1133 | 464us   | 55%  |   14%   |  31%   |  27.1     |   410    |
| real/deploy              |   5567 |   1351 | 368us   | 38%  |   19%   |  43%   |  40.2     |   272    |
| real/workspace           |   4142 |    693 | 254us   | 67%  |    0%   |  33%   |  24.4     |   366    |
| real/ci                  |   2424 |    316 | 145us   | 65%  |    7%   |  29%   |  26.0     |   457    |
| real/feature             |   5170 |    310 | 138us   | 60%  |    1%   |  39%   |  62.2     |   446    |
| real/app                 |    656 |     87 |  24us   | 55%  |    1%   |  44%   |  50.5     |   271    |

### `micro` family, per workload

| workload         | bytes | tokens | total   | scan | reclass | render | scan MB/s |
| ---------------- | ----: | -----: | ------: | ---: | ------: | -----: | --------: |
| micro/typescript |  779  |   189  | 103.1us | 21%  |   57%   |  22%   |   35.4    |
| micro/svelte     |  714  |    99  |  88.3us | 16%  |   61%   |  23%   |   51.0    |
| micro/javascript |  793  |   165  |  81.5us | 24%  |   47%   |  29%   |   39.8    |
| micro/tsx        |  552  |   134  |  67.1us | 24%  |   51%   |  25%   |   34.9    |
| micro/html       |  670  |    72  |  54.3us | 23%  |   48%   |  28%   |   53.0    |
| micro/rust       |  609  |   167  |  47.8us | 30%  |   33%   |  37%   |   42.6    |
| micro/python     |  652  |   135  |  39.4us | 36%  |   24%   |  40%   |   45.9    |
| micro/sql        |  477  |   109  |  28.8us | 41%  |   17%   |  43%   |   40.7    |
| micro/go         |  519  |   128  |  28.7us | 37%  |   15%   |  49%   |   49.3    |
| micro/markdown   |  564  |    58  |  21.2us | 49%  |   19%   |  33%   |   54.7    |
| micro/css        |  391  |    97  |  21.0us | 47%  |    8%   |  46%   |   39.8    |
| micro/bash       |  331  |    80  |  20.6us | 42%  |   19%   |  38%   |   37.8    |
| micro/yaml       |  371  |    61  |  19.5us | 50%  |   10%   |  40%   |   37.9    |
| micro/toml       |  339  |    70  |  16.1us | 51%  |    0%   |  49%   |   41.1    |
| micro/json       |  381  |    67  |  15.3us | 46%  |    1%   |  53%   |   53.7    |
| micro/diff       |  314  |    31  |   9.6us | 57%  |    3%   |  39%   |   57.1    |
| micro/diff-basic |  187  |    19  |   6.0us | 55%  |    2%   |  44%   |   56.4    |
| micro/whitespace |   47  |    12  |   1.2us | 100% |     -   |    -   |   38.5    |

## Observations that fall out of these numbers

Recorded as starting points, not conclusions. Each needs to be confirmed
against the harness before it is treated as true.

- **Scan throughput is 22-27 MB/s on the large TypeScript files** and only
  reaches 50-60 MB/s on the simplest grammars. For a character-scanning
  tokenizer with no regex, that leaves a lot of headroom.
- **`tokenize` allocates `new Uint32Array(len * 3)` per call** and returns a
  `subarray` view of it, so the whole 12-bytes-per-input-character buffer
  stays reachable for as long as the result does. On `real/compiled-grammar`
  that is a 1.5 MB allocation, zeroed, per highlight, of which 28375 * 3
  slots are used.
- **Rendering is a third of the cost everywhere** and is the least examined
  stage in the existing benchmarks.
- **Per-call pipeline overhead dominates small inputs.** Svelte spends 61% of
  a 714-byte highlight in reclassification.
- **`ns/token` spans 102 to 7146**, and the outliers are the Svelte
  components — the embedded-grammar path is roughly an order of magnitude
  more expensive per token than the flat grammars.
