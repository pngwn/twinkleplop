# Renderer track

`to_html` in `lib/core/src/generator.ts`. Branch `perf/renderer`, forked from
`perf-exploration` (`571af87`), measured against the frozen reference build at
`.perf/baseline` (`455158ace685`).

## Headline

Replacing the `out: string[]` + `join("")` accumulator with direct string
concatenation makes the `html` path **14.7% faster (geomean, 37 workloads)**
with no regression anywhere else. Rendering falls from **33% of end-to-end
cost to 17%** on the `real` corpus — the renderer itself is roughly **2.3x
faster**.

This was the opposite of what I expected, and it is the only one of the four
changes I implemented that produced a measurable effect at all. Everything
else is written up below as a negative result, including the ideas I rejected
before spending measurement budget on them.

## Protocol

Every number is a paired A/B against the frozen baseline, machine lock taken,
`--no-lock` never used. Noise floor 3.4% from `calibration.json`.

Sanity A/A first, with my worktree built from the same sources as the
reference:

```
node --expose-gc lib/bench/perf/bin/ab.mjs --suite quick --label baseline-sanity-AA
```
```
overall geomean -0.0% over 30 workloads, faster 0, slower 0
html +0.6%   pipeline -0.5%   tokenize -0.1%
anchor drift -1.5%
```

Clean. The harness and my build agree.

### A second instrument: render / scan ratio

`html` mode dilutes a renderer change roughly 3x, because `html` also contains
scan and reclassify. To get a less diluted read while iterating I used
`bin/profile.mjs` and tracked **render divided by scan** within a single
process. Nothing I touched can affect `scan`, so scan acts as an in-process
anchor and the ratio is a paired statistic that survives the machine changing
speed between runs. Absolute figures from different profile runs are not
compared anywhere in this document.

```
node --expose-gc lib/bench/perf/bin/profile.mjs --family real --arm .
```

| build                     | render  | scan    | render/scan |
| ------------------------- | ------: | ------: | ----------: |
| reference sources         | 12.59ms | 17.72ms |   **0.710** |
| + merged scan             | 11.97ms | 17.65ms |       0.678 |
| + span prefix memo        | 12.10ms | 17.72ms |       0.683 |
| + string concatenation    |  5.91ms | 19.10ms |   **0.309** |

## What the renderer actually does

Before optimising anything I took a structural census of the renderer's output
over the `real` family — counts, not timings, so no lock and no noise. This
turned out to be the most useful thing I did, because it falsified my first
two hypotheses before I spent measurement budget on them.

| quantity                        |      value |
| ------------------------------- | ---------: |
| input bytes                     |    479,574 |
| tokens                          |     75,295 |
| HTML bytes produced             |  3,689,235 |
| **HTML / input**                | **7.69x**  |
| array fragments pushed          |    312,946 |
| fragments per token             |       4.16 |
| text chunks (`substring` calls) |    113,364 |
| mean text chunk length          |  4.0 chars |
| span opens                      |     74,701 |
| escapable bytes                 |      4,731 |
| newlines                        |     25,050 |

Text chunk length distribution:

| length | count  | share  | what V8 does                          |
| ------ | -----: | -----: | ------------------------------------- |
| 1      | 57,597 | 50.8%  | served from the single-character cache, no allocation |
| 2-4    | 28,026 | 24.7%  | allocates and copies                  |
| 5-12   | 22,874 | 20.2%  | allocates and copies                  |
| 13+    |  4,867 |  4.3%  | returns a sliced string, no copy      |

Three things fall out of this:

1. **One array element per 1.5 input characters.** The fragment array, not the
   character scanning, is the dominant structure.
2. **Escaping is nearly irrelevant.** 9.9 escapable bytes per 1000. Any effort
   spent making the escape path faster is spent on 1% of the bytes.
3. **Half of all text chunks are one character long** and therefore already
   allocation-free. The "113k substring allocations" I assumed existed are
   really about 51k.

The census script is not committed; it is a throwaway that mirrors `to_html`'s
control flow and increments counters instead of appending. It lives in the
session scratchpad. If it is worth keeping it belongs under `lib/bench/perf/`,
which I am not allowed to modify.

## Experiments

### 1. Merge the newline scan and the escape scan into one pass — kept, small

**Mechanism.** `emit_range` walked every byte of every range looking for `\n`,
and then `escape_substring_optimized` walked every byte of every chunk again
looking for the five entity bytes — and walked a third time if it found any,
because it used a `needs_escape` pre-scan before re-scanning to build the
result. So the renderer touched the input roughly twice per byte with two
different loops.

Replaced with a single loop and a 63-entry `Uint8Array` classifier. Every byte
the renderer reacts to (`\n " & ' < >`) is below 63, so `code > 62` rejects
every letter and every non-ASCII code unit in one compare, and the table load
that follows never needs a bounds check. Six comparisons per byte across two
loops became one compare plus one table load in one loop.

```
node --expose-gc lib/bench/perf/bin/ab.mjs --suite quick --label e1-merged-scan
```
```
html +1.9%  n=10   pipeline -2.5%   tokenize -0.2%
faster 2 (real/architecture:html +5.5%, real/grammar-docs:html +4.0%), slower 0
anchor drift -0.0%
```

render/scan 0.710 → 0.678, i.e. **render about 4.8% cheaper**.

Below the noise floor at the `html` level on its own, so not claimable as a
standalone result. Kept because it is strictly less work, it is also less
code, and the census explains exactly why it is small: escapable bytes are
0.99% of the corpus, so almost all of the gain is from deleting the
`needs_escape` pre-scan, not from handling escapes better.

**The useful negative here:** halving the per-character work bought ~5%. That
is what told me character scanning is a minority cost in this renderer and
sent me to count fragments instead of tuning loops.

### 2. Precomputed span prefixes — rejected, no effect

**Mechanism.** Hypothesis 1 from the brief. `<span class="tok ${cls}">` is
built once per token — the census confirms 74,701 span opens for 75,295
tokens, so it really is one per token. The set of type names is fixed, so the
tag can be built once per type id into a dense array and looked up instead.

Implemented as a lazily filled `new Array(token_types.length)` indexed by type
id. I kept span identity as the class *string* rather than switching the
comparison to the type id, so that two ids sharing a name would still keep one
span open; a scan of all 18 language packages found no duplicate names today,
but the memo is correctness-neutral either way and does not depend on that
staying true.

```
node --expose-gc lib/bench/perf/bin/ab.mjs --suite quick --label e2-span-prefix-memo
```
```
html +1.4%  n=10   (was +1.9% with experiment 1 alone)
```

render/scan 0.678 → 0.683.

**Rejected.** No effect in either direction, and it is slightly the wrong side
of zero. It also adds one array allocation per `to_html` call, which is
exactly the kind of fixed per-call cost that hurts the `micro` family where
render is 32% of a 669us total.

Worth stating why the intuition was wrong: `` `<span class="tok ${cls}">` ``
does not copy characters. V8 builds it as a two-node ConsString, ~64 bytes of
young-generation allocation that is a bump-pointer store, and the join or
concatenation that follows has to flatten it anyway. Removing an allocation
that was already nearly free buys nothing.

**A caching variant is a trap and I did not pursue it.** Keying the prefix
table off the `token_types` array in a `WeakMap` would look better on the
benchmark than it deserves: `reclassifier.ts` does `result.token_types.slice()`
per call, so every language with a reclassifier stack hands the renderer a
fresh array on every call and the cache would miss in production while hitting
in any benchmark that reuses one array.

### 3. Direct string concatenation instead of fragment array + join — kept, the result

**Mechanism.** Hypothesis 2 from the brief, and the brief was right to say
"find out rather than assuming". The census says the accumulator holds 312,946
fragments to produce 3.69 MB of HTML: one array slot per 1.5 input characters.
`join("")` then has to walk that array twice, once to sum lengths and once to
copy, with per-element overhead on 313k mostly-tiny strings.

I expected concatenation to lose. The reasoning was that `out += x` allocates a
ConsString per append — 313k of them, ~10 MB of garbage — against the array's
single geometrically grown backing store, and that `join` is a well optimised
native path. That reasoning is wrong, and it is wrong in an interesting way: a
ConsString append is a bump-pointer allocation and nothing else, whereas an
array append pays capacity and elements-kind checks, and the array keeps every
one of those 313k fragments *reachable* until the join, so each fragment
survives every scavenge that happens mid-render instead of dying young.

```
node --expose-gc lib/bench/perf/bin/ab.mjs --suite quick --label e4-string-concat
```
```
html +22.5%  n=10   worst +10.0%   pipeline -2.3%   tokenize +0.3%
faster 10 of 10 html workloads, slower 0
```

render/scan 0.678 → **0.309**.

Claim-grade confirmation, both passes of `--repeat 2`, and a second
independent invocation of the same command:

```
node --expose-gc lib/bench/perf/bin/ab.mjs --suite core --repeat 2 --label e4-string-concat-core
node --expose-gc lib/bench/perf/bin/ab.mjs --suite core --repeat 2 --label e4-core-confirm
```
```
by mode      html +14.7%  n=37   pipeline +0.1%   tokenize +0.0%
by family    micro +4.1%   real +5.2%   fixtures +0.2%
overall      geomean +3.6% over 147 workloads, faster 29, slower 0, unstable 6
anchor drift +0.6%
```

Every language with an `html` path is positive, `micro` and `real` both move,
and the worst `html` row is `micro/sql` at +5.1% — above the noise floor. This
is whole-group movement, not scatter: 29 workloads faster and zero slower.

`pipeline` and `tokenize` are flat to within noise, as they must be — neither
executes a line of the renderer.

Parity: clean, 287 checks. Tests: 1719 passed, 1 skipped.

Committed as `render html by concatenation instead of fragment join`.

## Ideas rejected without a full experiment, and why

### Line positions supplied by the tokenizer instead of rescanned

Hypothesis 3 from the brief. The tokenizer already walks every character, so
it could record newline offsets and hand the renderer a line index for free.

Rejected on two counts. First, the census kills the motivation: after
experiment 1 the renderer makes a single pass over each byte, and that entire
pass is worth about 5% of render — a line index could remove at most part of
that. Second, it is the "moving work rather than removing it" failure mode
named in the brief. The store is only free if the tokenizer's inner loop has a
spare slot for it, and the cost would land in `tokenize`, the one mode that
must not regress for a renderer change. Paying in `tokenize` to save less than
5% of `render` is a bad trade even if the store were free, and it couples two
stages that are currently independent.

### Escaping fast paths

Hypothesis 4. The common case — a span with nothing to escape — is already
free, and the census says why the whole question is moot: 4,731 escapable
bytes in 479,574, one per 101 bytes. Experiment 1 already removed the only
real inefficiency here, which was the separate `needs_escape` pre-scan pass.
There is nothing further worth taking.

### Preallocating the fragment array with an index cursor

Planned as the next experiment after the census, to remove `push()` call
overhead and the ~30 geometric growth reallocations. Abandoned once
concatenation removed the array entirely; it optimises a data structure that
no longer exists on the hot path.

### Caching space runs for indentation gaps

93.6% of the 37,711 inter-token gaps are pure spaces, and 15,899 of those are
a single space. A cached table of space-run strings would make those
allocation-free. Not pursued: after the census showed half of all text chunks
are already length 1 (free), the addressable set shrinks to roughly 19,400
allocations out of 51,000, and experiment 2 had already demonstrated that
removing short-lived young-generation allocations from this function does not
show up in the measurement. It is also a special case that pays off in
proportion to how indented the corpus is, which is the shape of an
overfitted win.

### Building into a typed array and converting once

`TextDecoder` over a `Uint8Array`, or chunked `String.fromCharCode.apply`, to
write 3.69 MB of mostly-ASCII output with typed-array stores instead of string
appends. Rejected: correct handling of non-ASCII source requires either a UTF-8
encode of every chunk or a whole-input scan to pick a path, which forks the
implementation into a fast path and a slow path and lands exactly on the
"narrow fast path" rejection criterion. The measured 2.3x from concatenation
also moves the remaining budget close enough to the irreducible cost — writing
3.69 MB out and reading 479 KB in — that the ceiling on any further
restructuring is much lower than it was.

### Unifying `to_html` and `to_html_overlay`

Hypothesis 5, and I think the brief is right that it is a maintainability win
worth having — but not as part of this change, and the reason is now
measurable. The overlay renderer's extra behaviour (per-line wrapper
segments, skip-range substitution, elided lines) is not expressible as a few
predicates; folding it in means adding branches to the loop that has just been
shown to be the single most valuable loop in the system, in exchange for
deleting duplicated code on a path that is opt-in and rare. That trade should
be made deliberately with its own measurement, not smuggled in behind a perf
change.

**However**, `to_html_overlay` still uses the identical `out: string[]` plus
`join("")` shape that experiment 3 just showed to be 2.3x slower than
concatenation, and `push_substituted` pushes into that same array. The same
change almost certainly applies. I have not made it, because **no suite in the
harness measures the overlay renderer at all** — the `annotation` mode
measures `mod.tokenize({annotation})(src)`, which is the extractor, and
`parity.mjs` reaches `to_html` rather than `to_html_overlay` because the `html`
path is built without annotation options. Correctness is covered by
`generator.test.ts`; performance is not covered by anything. I would rather
report that gap than ship an unmeasurable perf change into it.

Worth noting alongside this: `lib/twoslash/src/render.ts` already builds its
output with `out +=`. The concatenation shape was already in the codebase; it
just was not in the renderer that runs for every consumer.

### 4. Flattening the closures — implemented, not measured, reverted

**Mechanism.** The brief notes that `to_html` "allocates several closures per
call that capture mutable locals". With the accumulator now a string rather
than an array, `out` is written ~313k times through a closure boundary, so
every append is a context slot load and store rather than a register. I
rewrote `to_html` as a single closure-free function: `close_span`,
`ensure_span` and `emit_range` inlined, the two `emit_range` call sites
replaced by one range pump that yields the gap before each token and then the
token, and `out` / `open_class` / `line_no` as plain locals.

It builds, and `parity.mjs` came back clean across all 287 checks — so the
rewrite is correct.

**I did not measure it, and I reverted it.** Two reasons, and I want to be
straight about both.

The honest one: this is a micro-optimisation. The brief says to name that and
stop, and it is right. The cost model here is a context-slot indirection per
append; there is no work being removed, only relocated into registers. It also
makes the code worse to read — `cls` is fixed for a range, but the span
transition still has to appear at all three emitting sites, so a five-line
block gets written out three times to delete three closures.

The practical one: the machine had six agents on it and my queued run sat
behind a `--suite full --repeat 2` for over twenty minutes without getting the
lock. Spending that much shared-machine time to put a probably-sub-noise-floor
number on a change I had already decided against on readability grounds was
not a good trade. I cancelled the queued run to give the queue back.

So the branch contains only changes that were measured. If someone wants the
number later, the diff is straightforward to reconstruct from this
description, and the interesting question it would answer generalises beyond
this function: whether closure boxing costs anything measurable in this
codebase's hot loops.

### Reducing the number of appends by fusing tag and text

With concatenation in place the remaining structure is roughly three appends
per token (open tag, text, close tag) plus one per inter-token gap. Fusing the
open tag and the text into a single expression does not reduce the number of
concatenations V8 performs, only the number written in the source. Not
pursued.

### Producing a DOM structure, or emitting into a caller-supplied buffer

Hypothesis 6. Not attempted, and I do not think it is the right next move.
Both change the public contract of `to_html`, which returns a string that
every language package's `language()` returns directly. The measured
distribution also argues against it: rendering is now 17% of end-to-end, and a
DOM-building variant would be a different API serving a different consumer
(the CSS Custom Highlight API path already has `tokenize()` for that), not a
faster version of this one.

## Where the renderer stands now

On the `real` family the stage split moves from 46/22/33 (scan / reclassify /
render) to roughly 54/32/17 once the absolute numbers are renormalised. In
plain terms: **rendering is no longer a third of the cost, and the renderer is
no longer the most attractive target in the system.** Scan and the
reclassifier pipeline are now where the remaining end-to-end time is.

What is left inside the renderer, for the `real` family:

- ~313k string appends
- ~51k short-substring allocations (the other 62k text chunks are free — half
  are single characters, the rest are long enough to be sliced)
- one pass over 479 KB of input
- one flatten producing 3.69 MB of output

The last two are irreducible: the renderer must read the input once and write
the output once. That puts a hard floor under any further work here, and the
remaining headroom above that floor is a good deal smaller than the 2.3x that
has just been taken.

## What I would do next

1. **Apply the same concatenation change to `to_html_overlay`** — but fix the
   measurement gap first. Nothing in the harness exercises the overlay
   renderer, so today the change would be unverifiable as a performance claim.
   The cheap fix is an `html` workload variant built with annotation options,
   plus overlay coverage in `parity.mjs`. That is a change to
   `lib/bench/perf/`, which this track is not allowed to make, so it needs to
   be a deliberate harness change with a re-run of calibration.
2. **Stop optimising the renderer.** It is now the smallest of the three
   stages, and the two ideas with any remaining size (typed-array output,
   DOM-structure output) both fail the language-agnostic or public-contract
   test above.
3. **Re-point the effort at `reclassify`.** It went from 22% to 32% of
   end-to-end purely because the denominator shrank, and on `micro` inputs it
   was already the dominant stage (TypeScript 57%, Svelte 61%). It is now the
   largest addressable share outside the scanner.

I want to be explicit about the one thing this track did *not* find: none of
the five structural hypotheses in the brief that concerned the *shape* of the
rendering work — precomputed prefixes, line-index handoff, escape fast paths,
renderer unification, DOM output — produced anything. The entire result came
from the accumulator data structure, which was hypothesis 2, and which the
brief correctly flagged as the one to measure rather than assume.

## Verification summary

| gate                                        | result |
| ------------------------------------------- | ------ |
| `node lib/bench/perf/bin/parity.mjs`         | clean, 287 checks, zero divergences |
| `pnpm test`                                  | 69 files, 1719 passed, 1 skipped |
| `--suite core --repeat 2`, run twice         | html +14.7% geomean, 0 slower |
| harness / corpus modified                    | no (`lib/bench/perf/` untouched) |
| A/A sanity before starting                   | -0.0% geomean, 0 moved |

