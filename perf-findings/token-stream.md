# Token stream representation and allocation

Branch `perf/token-stream`, forked from `perf-exploration` (571af87).
Reference build `455158ace685`, corpus `73b6d51a2c464ba5`, harness
`0dd35cb66096e805`, node v25.1.0, Apple M1 Max. Noise floor 3.4%.

**Summary.** The two premises this track was set up to test both turn out to
be false in the direction that matters. The stream is *not* contiguous, so
`start` cannot be dropped. And the oversized zeroed allocation is *not*
expensive: removing it entirely, allocation and zeroing and page faults, is
worth +0.3% at scale and +2.5% geomean on `core`, both under the floor. What
is left is a real finding about memory footprint rather than speed: the
result pins 12 bytes per input character for as long as it is held, a 7.51x
overhead, and the change I kept takes that to 1.00x at no measured speed
cost. No speed win is claimed.

---

## 1. Measured facts

These are corpus-wide measurements taken from the reference build. They stand
independently of anything I built. Script: `perf-findings/facts.mjs`
(read-only, no timing).

### 1.1 Occupancy of the scan buffer

`tokenize` allocates `new Uint32Array(len * 3)` and fills `token_count * 3`
slots.

| family | files | source | allocated | used | occupancy | min | median | max | chars/token |
| ------ | ----: | -----: | --------: | ---: | --------: | --: | -----: | --: | ----------: |
| `micro` | 18 | 8.5 KB | 101.8 KB | 19.8 KB | 19.5% | 9.9% | 20.8% | 27.4% | 5.13 |
| `fixtures` | 18 | 90.1 KB | 1081.0 KB | 188.1 KB | 17.4% | 6.5% | 19.1% | 28.1% | 5.75 |
| `real` | 20 | 468.3 KB | 5620.0 KB | 866.4 KB | 15.4% | 2.1% | 16.5% | 25.3% | 6.49 |
| `scale` | 18 | 3697.8 KB | 44373.5 KB | 5744.1 KB | 12.9% | 2.6% | 11.8% | 24.2% | 7.73 |
| **all** | 74 | 4264.7 KB | 51176.4 KB | 6818.4 KB | **13.3%** | | | | |

So roughly **86% of every scan buffer is allocated, zeroed and never
written**. Occupancy falls as files get longer, because longer files have
longer tokens.

Worst cases in `real`: `site-codepanel` 2.1% (4710 bytes of Svelte, 97
tokens, 55.2 KB allocated for 1.1 KB of data), `architecture` 3.0%,
`grammar-docs` 3.8%, `feature` 6.0%. Best case `server` 25.3%.

Highest occupancy anywhere in the corpus is **28.1%** (`fixtures/toml`).
That number matters for any right-sizing scheme: an initial capacity of
`len` slots (33% occupancy headroom) would not have grown once on this
corpus. That is a property of this corpus, not a bound — the true worst case
is one token per character, i.e. 100%.

### 1.2 Allocation volume per highlight

12 bytes per input character, unconditionally, on every `tokenize` call.

| workload | bytes | tokens | allocated | used | occupancy |
| -------- | ----: | -----: | --------: | ---: | --------: |
| `real/compiled-grammar` | 124022 | 28375 | 1453.4 KB | 332.5 KB | 22.9% |
| `real/core-runtime` | 65888 | 7789 | 772.1 KB | 91.3 KB | 11.8% |
| `real/core-types` | 54226 | 3638 | 635.5 KB | 42.6 KB | 6.7% |
| `real/architecture` | 25085 | 755 | 294.0 KB | 8.8 KB | 3.0% |
| `real/site-codepanel` | 4710 | 97 | 55.2 KB | 1.1 KB | 2.1% |

At the `scale` tier (~200 KB per file) it is a 2.4 MB allocation per call.

### 1.3 Contiguity: the invariant does not hold

This is the load-bearing negative result of the track.

| family | tokens | adjacent pairs | contiguous | gapped | gap bytes | as % of source |
| ------ | -----: | -------------: | ---------: | -----: | --------: | -------------: |
| `micro` | 1693 | 1693 | 50.9% | 49.1% | 1585 | 18.2% |
| `fixtures` | 16054 | 16054 | 46.2% | 53.8% | 13949 | 15.1% |
| `real` | 73930 | 73930 | 48.0% | **52.0%** | 148170 | **30.9%** |
| `scale` | 490159 | 490159 | 46.3% | 53.7% | 943492 | 24.9% |
| **all** | 581836 | 581836 | **46.5%** | **53.5%** | 1107196 | |

**53.5% of adjacent token pairs are separated by a gap.** `start` is not
"almost always the previous token's end" — it is the previous token's end
slightly less than half the time. There are 311,027 gaps covering
1.1 MB, which is 25-31% of the source text on the families that matter.

Gap sizes are small (62.5% are a single byte, 93% are 8 bytes or fewer) but
the count is what kills the idea: to make the stream contiguous you would
have to emit a token for every gap, which roughly doubles the token count.
Two thirds the slots per token times twice as many tokens is a net loss.

There are **zero overlaps and zero out-of-order tokens** anywhere in the
corpus, so the stream is sorted and disjoint. That invariant does hold.

**The gaps are not all whitespace.** 40,226 of the 311,027 gaps (12.9%)
contain at least one non-whitespace character. The tokenizer genuinely
declines to classify some source text and
the renderer's `if (start > last_end) emit_range(last_end, start, null)` path
is emitting real, visible, unclassified content. Anyone rewriting the
renderer should treat gap-filling as a correctness requirement, not a
whitespace optimisation.

### 1.4 Token length distribution

| token length | count | share |
| -----------: | ----: | ----: |
| 1 | 291858 | 50.2% |
| 2 | 64143 | 11.0% |
| 3-4 | 68638 | 11.8% |
| 5-8 | 94576 | 16.3% |
| 9-16 | 39734 | 6.8% |
| 17-64 | 18864 | 3.2% |
| 65-256 | 3273 | 0.6% |
| > 256 | 750 | 0.1% |

Max token length in the corpus is **91,868** (`scale/json`, a `string`
token). This rules out the obvious 2-slot packing, see rejected ideas.

Max token type id observed is 36 after `tokenize` and 52 after the
reclassifier stack (`token_types.length` reaches 53).

### 1.5 Retention

Because `tokenize` returns `tokens.subarray(0, token_count * 3)` and a
`subarray` is a view, the whole `len * 3` backing buffer stays reachable for
as long as the caller holds the result.

Over the whole corpus, holding every raw `tokenize` result:

```
retained = 51176.4 KB   live = 6818.4 KB   overhead = 7.51x
```

After the language pipelines, holding every `pipeline` result:

```
retained = 17383.0 KB   live = 6964.4 KB   overhead = 2.50x
```

The pipeline figure is better only by accident: `merge_adjacent` and
`compound_compose` allocate `new Uint32Array(...)` and rebuild the stream,
which silently drops the oversized buffer. **16 of 71 pipeline results still
hold the whole thing** — `scale/diff` retains 2359.0 KB for 102.3 KB of live
data (95.7% waste), `real/compiled-grammar` 1453.4 KB for 332.5 KB (77.1%),
`real/feature` 60.6 KB for 3.6 KB (94.0%), `real/workspace` 48.5 KB for
8.1 KB (83.3%). So the footprint a consumer pays depends on which
reclassifiers its language happens to run, which is not a property anyone
chose and not one any consumer can see.

This is a footprint problem, not a speed problem, and it is the finding that
survived.

---

## 2. What I tried

### 2.1 Ceiling probe: is the allocation worth anything at all?

Rather than guess whether the growth path or the zeroing dominates, I
measured the **ceiling**: replace the per-call allocation with a module-level
pool that is reused across calls and return a `subarray` of it with no copy.
That removes the allocation, the zeroing and the page faults entirely. It is
deliberately unsound — a second `tokenize` call clobbers the first result —
and exists only to bound how much any allocation strategy could ever be
worth.

```
node --expose-gc lib/bench/perf/bin/ab.mjs --suite scale --label pool-ceiling-scale
node --expose-gc lib/bench/perf/bin/ab.mjs --suite core  --label pool-ceiling-core
node --expose-gc lib/bench/perf/bin/ab.mjs --suite quick --label pool-ceiling-probe
```

| suite | geomean | tokenize | pipeline | html | moved | anchor drift |
| ----- | ------: | -------: | -------: | ---: | ----: | -----------: |
| `scale` (52) | **+0.3%** | +0.5% | +0.3% | +0.3% | 0 faster, 0 slower | -0.1% |
| `core` (147) | **+2.5%** | +2.8% | +2.7% | +1.6% | 30 faster, 0 slower | -0.0% |
| `quick` (30) | +1.7% | +0.6% | +4.1% | +0.4% | 4 faster, 0 slower | +2.0% |

Read this carefully:

- **At the `scale` tier, where the allocation is 2.4 MB per call, removing it
  entirely buys +0.3% and moves nothing.** That is the decisive number for
  this track. The oversized buffer is not a scaling cost. The likely
  mechanism — this part is inference, the +0.3% is the measurement — is that
  allocations of this size come from `mmap`'d zero pages rather than a
  `memset`, and the tokenizer only touches the 13% it fills, so the untouched
  pages never fault in. Either way, V8 is handing back zeroed pages cheaply,
  as the brief suspected it might.

- **On `core` the effect is real but small.** 30 workloads faster and 0
  slower across 147, every language positive, is a sign-consistency pattern
  noise does not produce. But +2.5% geomean is under the 3.4% floor, and it
  is the *ceiling* for an unshippable variant. The gains concentrate on the
  smallest inputs (`micro/whitespace` +9.9%, `real/app` +7.9%,
  `fixtures/diff-basic` +6.8%), which is consistent with the cost being the
  small-allocation `calloc` memset plus per-call allocator and GC bookkeeping
  — a fixed-ish per-call cost, not a per-byte one.

- **The `quick` run's `pipeline` +4.1% and svelte +10.1% are artefacts of the
  probe, not results.** Svelte's reclassifiers call the JavaScript and CSS
  pipelines on embedded regions, which re-enters `tokenize` while the outer
  result is still live. With a shared pool and no copy, that corrupts the
  outer stream and the passes then do less work. This is also the reason
  hypothesis 5 cannot be shipped without a copy-out: **`tokenize` results
  outlive subsequent `tokenize` calls in the Svelte path.**

These three runs are single-pass, not `--repeat 2`, so by the protocol they
are not claim-grade. They are not being used to claim a win — they are being
used to reject one, and the rejection is the conservative direction: the
ceiling would have to be *larger* than measured for the hypotheses to
survive, and replication only ever shrinks a headline. The `quick` run also
carries +2.0% anchor drift, so treat its absolute columns as indicative;
`core` and `scale` drifted -0.0% and -0.1%.

Conclusion: hypotheses 1 (right-size the allocation) and 5 (reuse across
calls) are both refuted as speed work. Their combined ceiling is below the
noise floor.

### 2.2 The change I kept: copy out instead of returning a view

Motivated by the retention fact in §1.5, not by speed. The bar it has to
clear is therefore "does not cost anything measurable", not "is faster".

**First attempt, unconditional.** One line at the end of `tokenize`:

```ts
tokens: tokens.slice(0, token_count * 3),   // was tokens.subarray(...)
```

The scan buffer becomes garbage the moment `tokenize` returns and the result
is exactly sized. Cost is one `malloc` plus one `memcpy` of the live bytes,
which is 13% of what the current code already `calloc`s.

```
node --expose-gc lib/bench/perf/bin/ab.mjs --suite quick --label slice-retention
node --expose-gc lib/bench/perf/bin/ab.mjs --suite core --repeat 2 --label slice-retention-core
```

| suite | geomean | moved | anchor drift |
| ----- | ------: | ----: | -----------: |
| `quick` (30) | -0.4% | 0 faster, 0 slower | -0.2% |
| `core --repeat 2` (147) | -0.7% | 0 faster, **1 slower** | -0.6% |

The regression is `micro/whitespace:tokenize` at **-5.0%**, above the floor
and replicated across both passes. That is a 47-byte input where the whole
call is 1.1us, so an extra allocation is a measurable fraction of it. Every
other one of the 147 workloads stayed inside the floor.

**Second attempt, gated on absolute waste.** The copy only earns anything
when the view would pin an amount of memory worth reclaiming, and on a
47-byte input it pins 420 bytes. So gate it:

```ts
const used = token_count * 3;
tokens: len * 3 - used > MIN_RECLAIMED_SLOTS
  ? tokens.slice(0, used)
  : tokens.subarray(0, used),
```

with `MIN_RECLAIMED_SLOTS = 1024`, one 4 KB page of `Uint32` slots. Below a
page there is nothing to hand back to the allocator anyway. The threshold is
an absolute-waste rule, not a ratio, so it does not depend on the occupancy
figures in §1.1 holding for anyone else's input.

```
node --expose-gc lib/bench/perf/bin/ab.mjs --suite core  --repeat 2 --label slice-gated-core
node --expose-gc lib/bench/perf/bin/ab.mjs --suite scale --repeat 2 --label slice-gated-scale
```

| suite | geomean | moved | anchor drift |
| ----- | ------: | ----: | -----------: |
| `core --repeat 2` (147) | **-0.3%** | **0 faster, 0 slower, 0 unstable** | -0.6% |
| `scale --repeat 2` (52) | **-0.2%** | **0 faster, 0 slower, 0 unstable** | +0.5% |

The `micro/whitespace` regression is gone (+1.3% on that language group) and
nothing else moved, in either suite. `scale` matters here because it is the
tier where the copy is largest — `scale/json` copies 337 KB per call — and it
is flat at -0.2%. -0.3% and -0.2% geomean against a 3.4% floor is "no
measurable cost", which is the bar this change had to clear.

**Footprint after the change**, same script as §1.5, `worktree` arm:

| | before | after |
| --- | ---: | ---: |
| `tokenize` results retained / live | 51176.4 KB / 6818.4 KB = **7.51x** | 6843.3 KB / 6818.4 KB = **1.00x** |
| `pipeline` results retained / live | 17383.0 KB / 6964.4 KB = **2.50x** | 6976.6 KB / 6964.4 KB = **1.00x** |
| results holding an oversized buffer | 16 of 71 | 4 of 71 |

The four that still hold a view are `micro/json`, `micro/toml`, `micro/diff`
and `micro/diff-basic`, wasting 2-5 KB each. That is the gate working as
designed.

---

## 3. Correctness

```
node lib/bench/perf/bin/parity.mjs     287 checks, no divergences
pnpm test                              69 files, 1719 passed, 1 skipped
```

Both run against the final gated build. Parity was also clean on the
unconditional variant.

The change is behaviour-preserving by construction: nothing outside
`tokenize` ever held a reference to the scratch buffer, so reclassifier
passes that mutate type ids through `tokens[i * 3] = new_type` were already
mutating memory owned solely by that result. Copying it out narrows what they
can reach rather than changing what they observe. The gated branch returns a
`subarray` in exactly the cases the old code always returned one, so the
small-input path is bit-identical to the reference.

The ceiling probe in §2.1 is *not* correct and was never intended to be; it
was reverted before any of the numbers in §2.2 were taken.

---

## 4. Interaction with the other tracks

**Scanner rewrite.** The change I kept touches exactly one statement, the
`return` at the end of `tokenize`, plus one file-scope constant. It does not
touch the scanning loop or the three emit sites, so it should rebase over a
scanner rewrite cleanly — and if it conflicts, the conflict is trivial. The
substantive interaction is the *finding*, not the diff: if the scanner
rewrite changes the output buffer strategy — a growth-based buffer, a
right-sized buffer, an arena — then `slice` becomes redundant cost and should
be reverted to `subarray` at that point. Whoever lands second should check
occupancy again (§1.1) rather than assume. The scanner track should also know
that a capacity check at the emit sites is *not* worth adding for speed: the
ceiling measurement in §2.1 already prices every allocation-side saving at
+0.3% (scale) to +2.5% (core).

**Renderer rewrite.** §1.3 is the important one. 53.5% of adjacent token
pairs are gapped and 12.9% of gaps contain non-whitespace text, so the
renderer's gap-filling path carries visible content and cannot be dropped or
special-cased as whitespace handling. A renderer that assumes contiguity, or
that fast-paths gaps as "must be indentation", will be wrong on 40k gaps in
this corpus. The stream is sorted and disjoint (zero overlaps, zero
out-of-order), so a single forward cursor is safe. Whether `tokens` is a view
or a copy is invisible to the renderer.

**Reclassifier rewrite.** Passes mutate type ids in place via
`tokens[i * 3] = new_type`. With `slice` they mutate a private copy, which is
behaviourally identical today because nothing else holds the backing buffer —
but it removes an aliasing hazard a future pass could otherwise trip over. If
the reclassifier track moves to a pooled or arena-backed stream, the copy-out
in `tokenize` is the natural place to put the ownership boundary. Note also
that `merge_adjacent` and `compound_compose` currently reallocate the whole
stream on every pipeline call; after this change that reallocation is the
only remaining full-stream copy, and it is right-sized, so it is a cheaper
target than it looks.

**Any layout change (2-slot, split arrays).** All three tracks read
`(type, start, end)` triplets out of a single `Uint32Array`. Changing that
shape is a simultaneous edit to the tokenizer, all reclassifier passes, the
renderer, the annotation extractor and the public `TokenizeResult` type.
§5 explains why I do not think that is worth doing, and the evidence is in
§2.1: the ceiling for touching the stream's allocation at all is under the
floor.

---

## 5. Ideas rejected, and why

**Drop `start` from the representation (hypothesis 2).** Refuted by
measurement, §1.3. 53.5% of adjacent pairs are non-contiguous. Making the
stream contiguous requires emitting a token per gap, which roughly doubles
the token count; 2 slots per token over 2x the tokens is worse than 3 slots
over 1x. Not built.

**Pack `(length << 16) | type` into one slot, giving a 2-slot token.**
Refuted by measurement, §1.4. The longest token in the corpus is 91,868
characters, well past the 65,535 a 16-bit length field allows, and a single
long string or comment in any consumer's file would silently corrupt the
stream. Not built.

**Pack `(length << 8) | type` instead, with a 24-bit length.** The length
field then holds, but 8 bits for the type id does not. Static grammars reach
type id 36 and the reclassifier stack reaches 52, which looks safe, but
`compound_compose` interns *new* type names at runtime as it composes nested
markdown styles — the vocabulary is unbounded by construction, not merely
large. A representation whose correctness depends on a document not nesting
too many styles is not one I would ship. It also turns every reclassifier's
`tokens[i * 3] = new_type` into a read-modify-write. Not built.

**Split arrays: `Uint16Array` of types beside a `Uint32Array` of offsets
(hypothesis 3).** This is sound, unlike the packings above. It takes 12 bytes
per token to 10, or 9 with a `Uint8Array` of types, so 17-25% less traffic —
in exchange for two allocations, two bounds-check domains, and a
simultaneous edit to every consumer of the stream. I did not build it, and I
want to be explicit that this is an inference rather than a measurement: the
ceiling probe shows that allocating, zeroing and freeing 12 bytes per input
character — *more* bytes than the live stream contains — is worth +0.3% at
scale. The live stream is 332 KB at its largest in `real`, which sits inside
the M1 Max L2. A 17-25% reduction in traffic that is already L2-resident is
not plausibly worth a cross-cutting rewrite of the tokenizer, four thousand
lines of reclassifier, the renderer and the public type. If someone wants to
overturn this, the cheap experiment is to *inflate* the stride to 4 and
measure the loss; if inflating by 33% costs nothing, shrinking by 33% gains
nothing.

**Module-level buffer pool / reuse across calls (hypothesis 5).** Two
independent reasons. First, measured: the ceiling is +0.3% at scale and +2.5%
on `core`, both under the floor, and a shippable version has to give some of
that back as a copy-out. Second, soundness: Svelte's reclassifiers re-enter
`tokenize` for embedded JavaScript and CSS while the outer result is still
live, so a pool without copy-out corrupts the outer stream — which is exactly
what produced the bogus svelte +10.1% in the `quick` probe run. And on the
"benchmark-shaped win" objection, the honest answer is that it does not even
clear the bar in the benchmark's own favourable loop, so there is nothing to
defend. Rejected.

**Right-size the initial allocation with a doubling growth path
(hypothesis 1).** An initial capacity of `len` slots would not have grown
once on this corpus (max occupancy 28.1% < 33%), cutting the `calloc` memset
threefold and retention threefold. But it requires a capacity check at each
of the three emit sites in the hottest loop in the system, its entire
available upside is bounded by the +2.5% `core` ceiling of which it captures
a fraction, and it collides directly with the scanner track's working area.
Paying hot-loop complexity and a merge conflict for a sub-floor delta is a
bad trade. Rejected on the evidence in §2.1 rather than built and measured
separately.

**Gating the copy-out on the occupancy *ratio*.** The obvious form of the
gate is "copy when used/allocated is below some fraction". Rejected:
occupancy is 13-15% essentially everywhere (§1.1), so a ratio test is true on
every input including the 47-byte ones the gate exists to protect, and the
branch would be dead weight. The gate I shipped tests *absolute* wasted
bytes, which is the quantity that actually decides whether reclaiming is
worth an allocation, and it is the quantity that does not depend on this
corpus.

**Emitting whitespace as explicit tokens to obtain contiguity.** Would add
roughly 311k tokens across the corpus, a ~53% increase, to save one slot in
three. Rejected on arithmetic.

---

## 6. Honest summary of what this track produced

- Two of the brief's hypotheses (1, 5) are refuted with a measured ceiling
  rather than an argument, at three suite sizes including the scale tier.
- One (2) is refuted by a corpus-wide structural measurement: the contiguity
  invariant the idea depends on does not hold, and is not close to holding.
- One (3) is argued down rather than measured, and I have said so and named
  the experiment that would overturn it.
- One (4) is confirmed and fixed: retention was 7.51x live on raw `tokenize`
  results and 2.50x after the pipelines, and which of those a consumer paid
  was an accident of which reclassifiers its language happens to run. It is
  now 1.00x, for a measured cost of -0.3% geomean over 147 workloads with no
  workload moving beyond the floor.

No speed win is claimed, and none is available in this track: the ceiling for
every allocation-side idea is under the noise floor, and the representation
change the brief proposed is blocked by a structural fact about the stream.
The facts in §1 are the deliverable.
