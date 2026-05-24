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
- `02-after-phase1-and-frame-track.json` — captured after the four Phase 1
  commits and the initial frame_track v0 (structural-only).
- `03-after-frame-track-v1.json` — captured after frame_track gained at_start
  tracking and the classify_brace hook. Still no consumers — pure overhead
  baseline for the tracker.
- `04-after-claim-property-scope-migration.json` — captured after
  claim_property_scope was rewritten to read frame_track's output instead of
  maintaining its own scope stack. First real consumer of the shared frame
  data. JS pipeline is now (1) js_frame_track → (2..) the rest.
- `05-after-param-list-primitive.json` — captured after promote_js_parameters
  was re-modelled as the `param_list` primitive in lib/core. The 470-LOC
  inline reclassifier became a ~50-line config + a shared primitive
  consumed by JS / TS / TSX. Per-stage cost essentially unchanged after
  the bucketed detector dispatch optimisation.
- `06-all-primitives.json` — captured after the remaining four primitives
  landed (merge_adjacent for Rust lifetimes, matched_bracket for Svelte
  block braces, chunker for Go params, compound_compose for Markdown
  styles, state_machine for TS `as` casts). All language reclassifiers
  that were inline procedural code are now data-driven configs over
  shared lib/core primitives. **Go pipeline improved ~20%** with the
  chunker primitive; other languages within noise.

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

**pre-VM baseline (snapshot 01):**

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

**post-migration (snapshot 04) — js_frame_track inserted as stage 1:**

| Stage                            |    ops/sec | mean    |
| -------------------------------- | ---------: | ------- |
| 0. empty pipeline                | 24,154,879 | 0.04 µs |
| 1. + js_frame_track              |     79,650 | 12.6 µs |
| 2. + promote_js_constants        |     56,848 | 17.6 µs |
| 3. + function_variable_rules     |     32,536 | 30.7 µs |
| 4. + promote_js_const_bindings   |     24,643 | 40.6 µs |
| 5. + claim_property_scope        |     17,207 | 58.1 µs |
| 6. + class_name_promoter         |     15,494 | 64.5 µs |
| 7. + promote_js_parameters       |      9,482 | 105 µs  |
| 8. + promote_js_namespaces       |      9,045 | 110 µs  |
| 9. + embed_interleaved (full)    |      8,403 | 119 µs  |

End-to-end pipeline cost: 112 µs → 119 µs (+6%) on large_js. On medium_js
the same comparison is 36 µs → 35 µs (-3%, slight improvement). Single
consumer of frame_track shows roughly break-even — the architectural
sharing pays off when promote_js_parameters also migrates.

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
