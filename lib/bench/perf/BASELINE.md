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

## Correction, 2026-07-25

An earlier revision of this file reported a `ns/token` column that divided
end-to-end time by the **host grammar's** token count. For a language that
embeds another, the host emits one token for a whole `<script>` block that the
pipeline then replaces with hundreds, so the denominator was far too small.
Measured inflation: **8.92x** on `real/site-codepanel`, 3.44x on
`real/site-inspectorpanel`, and exactly **1.00x on every language that does not
embed**. The claim that the embedded path costs an order of magnitude more per
token was an artefact of this, and is withdrawn — corrected, `site-codepanel`
is 867 ns/token, cheaper than TypeScript.

`bin/profile.mjs` now reports final token counts, an `expand` column showing
the ratio, and `ns/byte`, which is the only lens comparable across all
languages.

The same artefact affects the **`reclassify` column, which is still computed as
`pipeline` minus `scan` where `scan` is host-only**. For embedding languages
the sub-language's own *scanning* therefore lands in `reclassify`. Read the
`reclassify` figure for svelte and html as "everything after the host scan",
not as reclassifier work. The `expand` column tells you where this applies.

Separately: **markdown performs no embedding at all.** Fenced-code dispatch to
an inner language is unimplemented, so markdown is not a consumer of the
embedding machinery despite being the obvious candidate.

## Stage breakdown

Sums over the whole family. `scan` is `core.tokenize`; `reclassify` is
`pipeline` minus `scan` (see the caveat above); `render` is `html` minus
`pipeline`.

| family | total    | scan | reclassify | render | scan throughput | ns/byte |
| ------ | -------- | ---- | ---------- | ------ | --------------- | ------- |
| `real` | 40.69 ms | 45%  | 22%        | 33%    | 26.0 MB/s       | 84.8    |
| `micro`| 669 us   | 30%  | 38%        | 32%    | 43.6 MB/s       | -       |

The `micro` row predates the correction. Its languages are almost all
non-embedding (`expand` 1.00x), so its stage shares stand; only the svelte and
html rows in the per-workload table below are affected.

The two profiles point at different things, and both are real consumer
shapes:

- **Large files** are scan-dominated (45%) with a large rendering tail (33%).
- **Small files** are dominated by the pipeline's fixed per-call cost (38%) —
  TypeScript 57%, TSX 51% — and the scanning loop barely runs.
- **Rendering is roughly a third of end-to-end in both**, which made it the
  most consistent single target in the system and the least examined.

### `real` family, per workload

`expand` is final tokens / host tokens; anything above 1.00x means the row's
`reclassify` share includes sub-language scanning.

| workload                 | bytes  | tokens | expand | total   | scan | reclass | render | MB/s | ns/byte |
| ------------------------ | -----: | -----: | -----: | ------: | ---: | ------: | -----: | ---: | ------: |
| real/compiled-grammar    | 124022 |  28375 | 1.00x  | 8.57ms  | 59%  |    0%   |  41%   | 24.7 |  69.1   |
| real/core-runtime        |  65894 |   7789 | 1.00x  | 7.48ms  | 40%  |   35%   |  25%   | 22.0 | 113.6   |
| real/core-frames         |  55122 |   7920 | 1.00x  | 6.82ms  | 38%  |   36%   |  25%   | 21.2 | 123.7   |
| real/core-types          |  54300 |   3638 | 1.00x  | 4.33ms  | 52%  |   22%   |  25%   | 24.0 |  79.7   |
| real/site                |  40864 |   7471 | 1.00x  | 2.82ms  | 35%  |    3%   |  61%   | 40.9 |  69.0   |
| real/bench-suite         |  26389 |   5140 | 1.00x  | 2.19ms  | 32%  |   35%   |  33%   | 37.5 |  82.8   |
| real/dashboard           |   8056 |   1947 | 1.00x  | 1.49ms  | 29%  |   39%   |  32%   | 18.6 | 184.7   |
| real/architecture        |  25141 |    755 | 1.00x  | 1.07ms  | 70%  |    6%   |  24%   | 33.7 |  42.4   |
| real/grammar-docs        |  20842 |    797 | 1.00x  | 997us   | 63%  |    6%   |  31%   | 33.1 |  47.8   |
| real/pipeline            |   8806 |   1949 | 1.00x  | 863us   | 42%  |   29%   |  30%   | 24.5 |  98.0   |
| real/site-codepanel      |   4712 |    865 | **8.92x** | 750us | 24% |   50%   |  26%   | 26.3 | 159.2   |
| real/analysis            |   7975 |   1635 | 1.00x  | 748us   | 47%  |   25%   |  28%   | 22.6 |  93.8   |
| real/server              |   8990 |   2271 | 1.00x  | 561us   | 37%  |   15%   |  48%   | 43.0 |  62.4   |
| real/site-inspectorpanel |   3947 |    853 | **3.44x** | 511us | 29% |   50%   |  21%   | 26.3 | 129.4   |
| real/warehouse           |   6876 |   1133 | 1.00x  | 498us   | 53%  |   15%   |  32%   | 25.9 |  72.4   |
| real/deploy              |   5567 |   1351 | 1.00x  | 403us   | 36%  |   22%   |  42%   | 38.5 |  72.3   |
| real/workspace           |   4142 |    693 | 1.00x  | 267us   | 67%  |    0%   |  33%   | 23.0 |  64.5   |
| real/ci                  |   2424 |    316 | 1.00x  | 155us   | 63%  |    8%   |  29%   | 24.8 |  63.9   |
| real/feature             |   5170 |    310 | 1.00x  | 147us   | 59%  |    0%   |  40%   | 59.3 |  28.5   |
| real/app                 |    656 |     87 | 1.00x  |  25us   | 54%  |    2%   |  44%   | 48.8 |  38.0   |

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

## Observations, and what the investigation did to them

These were recorded as starting points. Several did not survive contact with
the harness, which is recorded here so nobody re-derives a retracted claim.

- **Scan throughput is 22-27 MB/s on the large TypeScript files**, reaching
  50-60 MB/s only on the simplest grammars. **Confirmed, and the headroom is
  larger than it looks**: a hand-written lexer producing the same output
  volume runs 8.6x faster on TypeScript and 13.4x on JSON. The cost is not in
  any single part of the loop body — counted on the real corpus, multi-char
  pattern candidates are 0.109/char and `failed_probes` lookups 0.000/char —
  it is in generic table-driven dispatch as a whole.
- **`tokenize` allocates `new Uint32Array(len * 3)` per call** and returns a
  `subarray` view, retaining the whole buffer. **Confirmed but not a speed
  problem**: occupancy is 13.3% corpus-wide and retention was 7.51x live
  bytes, yet removing the allocation, zeroing and page faults *entirely*
  measured +0.3% on `scale`. It is a footprint issue, not a throughput one.
- **Rendering is a third of the cost everywhere** and was the least examined
  stage. **Confirmed and acted on**: replacing the fragment array with string
  concatenation and merging the newline/escape scans is +14.9% on the `html`
  path across all 18 languages, taking rendering from 33% to ~17%.
- **Per-call pipeline overhead dominates small inputs.** Holds for the
  non-embedding languages (TypeScript 57% of a 779-byte highlight). The
  Svelte figure quoted here previously conflated sub-language scanning with
  reclassification — see the correction above.
- ~~`ns/token` spans 102 to 7146, the embedded path being an order of
  magnitude more expensive per token~~ — **withdrawn**, denominator artefact.
  Corrected, svelte is 867 ns/token against TypeScript's 961, and 1.4x
  TypeScript per *byte* for structurally about twice the passes.

### Refuted outright

- **Token spans are contiguous, so `start` is redundant.** False. Only 46.5%
  of adjacent pairs are contiguous, and 12.9% of the gaps contain
  non-whitespace, so the renderer's gap-fill is a correctness requirement.
  Any design assuming contiguity is wrong on ~40k gaps.
- **Fusing the three stages would pay.** The structural overhead of
  materialising and re-walking the intermediate stream is 0.50% of
  end-to-end; the ceiling on fusion is 1.03x. Windowing is also impossible:
  `type_span`, `params` and `class_name_promoter` reach 4573 / 1943 / 2254
  tokens of lookahead on the real corpus.
- **Markdown fenced code blocks are a hot embedding path.** Markdown does no
  embedding at all.
