# Reclassifier VM migration — benchmark baselines

Snapshots captured before and during the reclassifier-VM migration so each
change can be A/B'd against a stable reference point.

Each file is the raw vitest JSON output from a single bench run. Compare with
`jq` or replay against a new run using `vitest bench --compare`.

## Files

- `00-pre-vm-overhead.json` — full `reclassifier-overhead.bench.js` run on
  `main` before any VM work started. Pipeline-as-a-whole numbers.
- `01-pre-vm-baseline.json` — full `vm-baseline.bench.js` run. Per-stage
  isolation in JS (incremental composition) plus per-language full-pipeline
  numbers for TS / Rust / Markdown / Go / Svelte (every language with a
  reclassifier the VM migration will touch).

## How to capture a new snapshot

```bash
cd lib/bench
pnpm bench:internal src/library/vm-baseline.bench.js
cp benchmark-results.json baselines/<NN>-<short-name>.json
```

Always scope to a single bench file; running the full bench suite from the
repo root is too slow.

## Reference numbers — pre-VM baseline

These are the headline numbers from `01-pre-vm-baseline.json` for at-a-glance
regression checks. Times are mean per iteration in microseconds.

### JS stage isolation (pre-tokenized) — large_js

The delta between two consecutive rows is that stage's contribution.

| Stage                            |    ops/sec | mean    |
| -------------------------------- | ---------: | ------- |
| 0. empty pipeline                | 24,291,681 | 0.04 µs |
| 1. + promote_js_constants        |    710,601 | 1.4 µs  |
| 2. + function_variable_rules     |     73,085 | 13.7 µs |
| 3. + promote_js_const_bindings   |     41,522 | 24.1 µs |
| 4. + claim_property_scope        |     19,851 | 50.4 µs |
| 5. + class_name_promoter         |     17,676 | 56.6 µs |
| 6. + promote_js_parameters       |     10,461 | 95.6 µs |
| 7. + promote_js_namespaces       |      9,744 | 102 µs  |
| 8. + embed_interleaved (full)    |      8,885 | 112 µs  |

Phase 2 migrates stages 4 and 6 to read from a shared frame tracker.
Combined they account for ~75 µs/iter on large_js — the biggest single
target in the pipeline.

### Per-language full pipeline (pre-tokenized)

| Language   | raw tokenize | reclassifier-only | full       |
| ---------- | -----------: | ----------------: | ---------: |
| TypeScript |      19,193  |           12,601  |     7,495  |
| Rust       |      49,999  |           54,658  |    24,627  |
| Markdown   |      62,171  |          225,196  |    48,992  |
| Go         |      56,572  |          193,118  |    42,034  |
| Svelte     |      64,545  |           13,825  |    11,262  |

`reclassifier-only` is the pre-tokenized pipeline; higher is better.
`full` is `language()(src)` — full tokenize + reclassify + closure cost.

Notes on what to expect during the migration:

- **TypeScript**: heaviest reclassifier (`type_position_promoter` —
  6-mode state machine). Will migrate to the `state_machine` primitive.
  Expect this to be the most sensitive bench.
- **Rust**: lifetime merge primitive. Output token count changes.
- **Markdown**: compound style composition. Dynamic type interning.
- **Go**: parameter chunker primitive.
- **Svelte**: paired-brace retag primitive.

A regression in any of these numbers > ~5% during migration is a signal to
stop and investigate before moving on to the next change.
