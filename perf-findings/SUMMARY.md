# Performance exploration: summary

Eight parallel investigations against a frozen reference build of `455158a`,
each in its own worktree, all measured through the paired A/B harness in
`lib/bench/perf/`. Every number here is a median-of-paired-ratios against that
reference, machine lock held, `--repeat 2`.

Read `lib/bench/perf/README.md` for the protocol and `BASELINE.md` for the
starting figures.

## What landed

Five changes, all in `lib/core`, none touching a language package. Parity
clean on 329 checks; `pnpm test` 1719 passing.

| change | mechanism | file |
| --- | --- | --- |
| run fast path | a rule that cannot change state is a self-loop, so consume its whole run in one dispatch instead of one per character | `tokenizer.ts` |
| renderer concatenation | build the output string directly instead of pushing 313k fragments into an array to `join("")`, and find newlines and escapable bytes in one pass | `generator.ts` |
| non-ascii ranges | store `range([[0x80, 0xffff]])` as a range instead of expanding 196k codepoints into a dictionary at compile time | `compiler.ts` |
| pipeline hoists | resolve frame/signal gates once on the tracker's name arrays; defer the vocabulary clone until a group is found; plan the claim batch on first call | `reclassifier.ts` |
| stream copy-out | return a right-sized copy rather than a view onto the 3-slots-per-character scratch buffer, gated on a page of reclaimable waste | `tokenizer.ts` |

## Headline

**+38.6% geomean across 147 workloads. 139 faster, 0 slower, 1 unstable.** The
worst single row in the entire set is +0.8%. Every language, every corpus
family and every entry point improved.

| mode | geomean | worst row |
| --- | ---: | ---: |
| `tokenize` | +44.1% | +0.8% |
| `html` | +44.7% | +18.1% |
| `pipeline` | +29.3% | +4.9% |

Measured with `--suite core --repeat 2` against the frozen reference, anchor
drift -0.1%. By language the spread runs from +18% (tsx) to +70% (svelte);
whitespace, whose grammar is three rules and which therefore has almost no
self-loop runs to chomp, is +3.6% — the one place the headline mechanism has
nothing to work with, which is itself a sanity check on the mechanism.

For reference, the same suite before the reclassifier and stream changes were
added read +38.8% with 135 faster. Those two contribute breadth (four more
workloads moved, three fewer unstable) rather than headline percentage; the
stream copy-out costs `tokenize` a fraction of a percent by design, in
exchange for cutting retention from 7.51x live bytes to 1.00x.

The absolute stage profile over the whole `real` family, before and after
(`bin/profile.mjs --family real`, same machine, anchor stable on both):

| stage | before | after | share before | share after |
| --- | ---: | ---: | ---: | ---: |
| scan | 18.45 ms | 11.66 ms | 45% | 48% |
| reclassify | 8.94 ms | 7.76 ms | 22% | 32% |
| render | 13.31 ms | 5.07 ms | 33% | 21% |
| **total** | **40.69 ms** | **24.50 ms** | | |

Scan throughput 26.0 to 41.2 MB/s; 84.8 to 51.0 ns per input byte. Rendering
is 2.6x faster in absolute terms and has gone from the second-largest stage to
the smallest. Scanning is now a *larger* share of a much smaller total, which
is where the remaining open leads point.

Plus, off the steady-state path: **Python's grammar compiles 11.4x faster**
(8.90ms to 0.79ms) and its serialised form drops from 4.08 MB to 17 KB. The
other 17 grammars compile 2-5% slower, which is real and measured, not noise;
the trade is +30 us across a 7-grammar bundle against -7.8 ms for Python.

## What did not work, and why that matters more

Six directions were closed on evidence. Three of them were hypotheses written
into the briefs, i.e. things the exploration was set up expecting to find.

- **Fusing the three stages.** Materialising the intermediate stream and
  re-walking it is **0.50% of end-to-end**; the ceiling on fusion is 1.03x.
  Measured with a 2x2 that separated fusion from "hand lexer vs generic FSM",
  because a naive fused-vs-`language()` spike conflates the two. Windowing is
  independently impossible: `type_span`, `params` and `class_name_promoter`
  reach 4573 / 1943 / 2254 tokens of lookahead on the real corpus.
- **Generating specialised scanner code.** The four mechanisms that *only*
  codegen can remove multiply to **0.932x** — net negative. Inline character
  comparisons are slower than the `Uint8Array` lookups they replace; those
  tables are tiny, L1-resident and branch-free. A working build-time generator
  exists on `perf/generated-scanner`, deliberately unwired: a further 3.34x
  but only 7 of 18 grammars (probe states block the rest), 12.1x import cost,
  ~3x gzipped bundle.
- **Optimising the scanner loop body.** Counted on the real corpus:
  multi-char pattern candidates 0.109/char, inner-loop compares 0.140/char,
  `failed_probes` lookups 0.000/char. The work those hypotheses targeted is
  not being done. The win came from chomping, not from the loop body.
- **Dropping `start` from the token stream.** Only **46.5%** of adjacent token
  pairs are contiguous, and **12.9% of the gaps contain non-whitespace**, so
  the renderer's gap-fill is a correctness requirement rather than a
  whitespace optimisation.
- **Right-sizing or pooling the scan buffer for speed.** Occupancy is 13.3%
  corpus-wide and retention was 7.51x live bytes, but removing the allocation,
  zeroing and page faults *entirely* measures +0.3% on `scale`. It is a
  footprint problem, which is why the change that landed claims no speed win.
- **Shipping precompiled grammars.** Prototyped and measured: reviving costs
  **1.6-4.2x more** than compiling. The bundle-size objection was wrong
  (brotli'd tables 30 KB vs 42 KB of dist); the runtime cost is what kills it.
  Prototype kept so nobody tries twice.

## Two corrections to the starting analysis

- **`BASELINE.md`'s `ns/token` was wrong for embedding languages.** It divided
  end-to-end time by the *host* token count, and the host emits one token for
  a whole `<script>` block. Inflation is 8.92x on `real/site-codepanel`, 1.00x
  on every non-embedding language. Corrected, svelte is *cheaper* per token
  than TypeScript. The claim that the embedded path costs an order of
  magnitude more per token is withdrawn.
- **The per-workload noise floor is the wrong test for a group average.** 3.4%
  is how far one workload moves when nothing changed; a 54-workload geomean's
  null is **0.62% at p99**. Judging a mode geomean against 3.4% discards real
  signal, and a broad uniform gain is precisely the shape a language-agnostic
  change produces. `bin/group-floor.mjs` derives this from the A/A data.

## A correctness bug found in passing

`state_stack` in `tokenizer.ts` is `new Uint16Array(256)` with unchecked
pushes. A grammar that enters a state with a push and leaves it *sideways*
leaks a slot per occurrence — a sideways exit deliberately does not pop. Past
256 the write is dropped, the pop reads out of bounds, and `current_state`
becomes `undefined`; it does not crash because `undefined << 7` is 0, so the
scanner silently continues against state 0 with no patterns and no seals.

Live today on JSON, Go, Rust, SQL, Markdown and diff. On `scale/go` the
shipped tokenizer emits **5235 tokens where the correct answer is 49194**,
abandoning the file 8.8% in.

Not fixed here: the fix changes tokenizer output, which would invalidate the
frozen baseline mid-exploration. Raising the constant is *not* the fix — 64K
entries is 128 KB per `tokenize` call, which would hurt exactly the
small-input path that is already fixed-cost dominated. The design question is
whether a sideways exit after a push should pop (engine) or those grammars
should use a real pop (grammar); separately, silently corrupting on overflow
is worth closing either way.

## Open leads, in rough order of value

1. **A probe-free `tokenize` variant.** The generated-scanner track eliminated
   both easy explanations for the codegen prototype's remaining 3.3x (the
   codegen mechanisms are net negative; a closure-per-grammar factory is a 5%
   regression), leaving one: the generated body does not contain the probe
   machinery. Separately, probe re-scanning costs **1.22 loop iterations per
   input byte** on `real` and 1.53 on CSS, against ~1.00 for grammars with no
   probe states.
2. **Per-region pipeline cost.** `real/site-codepanel` runs 75 pipeline
   stages, 10 flushes, 8 frame_track walks and 25 rule-table walks to emit 46
   claims over 865 tokens, because the whole machine re-runs per embedded
   region.
3. **The overlay renderer.** `to_html_overlay` still has the array-and-join
   shape that proved 2.3x slower in the main renderer. Parity now covers it
   (329 checks); it still has no bench mode, which needs a `workloads.mjs`
   change and therefore a harness-hash bump.
4. **`embed_grammars` re-resolves its mapping keys via `indexOf` on every
   call** rather than at bind time. Bind is 0.4-4.5 us, so there is room.
5. **`merge_and_apply_buffer`** does a full `fill(-1)` plus full sweep per
   batch flush regardless of claim count (~15.6k ops for a few hundred
   claims). Unmeasured.

## Per-track reports

`scanner.md`, `fusion.md`, `renderer.md`, `token-stream.md`, `reclassifier.md`,
`cold-start.md`, `embedding.md`, `generated-scanner.md` — each records its
measurements, its rejected ideas with reasons, and its own caveats.
