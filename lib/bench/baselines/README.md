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
- `07-frame-track-consolidation.json` — captured after brace-kind
  classification became a declarative frame_track spec and both consumers
  (claim_property_scope, param_list) migrated onto the shared frame table,
  deleting their private scope stacks. frame_track itself costs ~30% more
  per call (markers, angle tracking, classification, at_start re-arm) but
  the consumers more than repay it: claim_property_scope stage cost fell
  ~38% and param_list ~58% on large_js. **JS end-to-end improved 13-17%
  vs snapshot 06** (large_js 8.6k -> 10.0k ops/s, plain_js 9.8k -> 11.1k,
  complex_js 6.5k -> 7.4k); the plain_js regression vs the pre-VM
  baseline is fully erased (now ~+2%). TypeScript improved ~5%. other
  languages within machine variance (~4-5%, per the empty-pipeline rows).
- `08-claim-contract-unification.json` — captured after every type-only
  pass became a claim producer (param_list, chunker, matched_bracket, the
  three fidelity promoters, the js/go custom walkers). pipelines now run
  as large claim batches against a frozen base stream: claims merge by
  precedence instead of first-writer-wins, in-place mutation of the
  caller's tokens / shared token_types is gone, and the TS permutation
  suite verifies order-independence across the whole batch (it caught one
  real hidden coupling: TPP silently no-opped unless a sibling had
  registered "type" first). adjusted for the ~6% slower machine state
  (see empty-pipeline rows), JS / TS / Svelte / Markdown improved or held
  vs 07 on both metrics. the reclassifier-only metric for **Go (-18%)
  and Rust (-10%)** shows the honest cost of claims on promotion-heavy
  tiny budgets: emit + merge + apply replaces direct token writes
  (go 4.6 -> 6.0 us, rust 19.6 -> 23.3 us per call). the user-facing
  `language()` entry point is at parity or better for every language.
- `09-compile-caching.json` — captured after rewrite_types started caching
  its compiled bytecode per vocabulary CONTENT instead of array identity.
  the batch runner clones token_types per flush, so the identity key
  missed on every call and the bytecode, value pools, and anchor tables
  recompiled per highlight. content comparison is a pointer walk (clones
  copy string references). also caches frame_track's per-call transparent
  text table. machine-adjusted gains vs 08: **Svelte +39%** (its embedded
  JS pipeline recompiled rules per script block), **Rust +11%** (back
  above the pre-R2 level), medium_js +16%, TypeScript +5%, large_js +9%.
  the cumulative claims-architecture arc (07 -> 09) is now net positive
  for every language on both metrics except Go's reclassifier-only number
  (-21%, ~1.4 us absolute on a tiny budget; its `language()` path is at
  parity).
- `10-frame-gated-rules.json` — captured after the pattern VM grew
  `repeat` (possessive zero-or-more with separators) and `not`
  (zero-width single-token negation) combinators plus anchor frame gates
  (`at_start`, `frame_kinds` against the shared frame table), and
  claim_property_scope became two declarative rewrite rules -- the last
  imperative claim walker in the JS package. all pipelines within noise
  of snapshot 09 (machine ~3% slower per the empty-pipeline rows); the
  declarative pass costs ~+0.4 us per call on medium_js vs the
  specialized loop (generic anchor dispatch + bytecode), ~2% of the
  pipeline.
- `11-params-construct.json` — captured after the capture log (captures
  record one span per occurrence; backtracking truncates to the frame's
  watermark) and the char-aware `params()` pattern construct replaced
  both the `param_list` primitive and go's `chunker`. JS / TS / TSX / go
  parameter tagging is now rewrite rules; the deleted primitives were
  the last detector-style walkers outside the VM. exact token parity
  verified on every corpus. dispatch gained two fast paths (must-contain
  anchor prefilter for arrow rules, inline single-type() `when`) which
  made the rules-based JS params stage ~15% FASTER than the imperative
  param_list it replaced (39.0 -> 32.8 us on large_js for the
  frame_track+params pair). go pays ~+0.3 us per call vs its specialized
  chunker (one VM walk per `func`, ~-2% on `language()` end-to-end) --
  accepted as the cost of one shared mechanism. other languages within
  noise after machine adjustment (frame_track rows, untouched, read
  +5-7% on this run).

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
