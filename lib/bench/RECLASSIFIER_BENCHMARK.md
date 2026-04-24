# Reclassifier pipeline overhead — benchmark findings

## Goal

Measure the cost of each reclassifier pipeline stage in isolation so we can
answer whether the Phase 3/3.5 architecture is performant enough for real use.

The plan's target was: **reclassifier overhead should be < 20% of base tokenize
time for in-language workloads** (function-variable rule only, no embedding).

## Methodology

`packages/bench/src/library/reclassifier-overhead.bench.js` decomposes the
pipeline into progressive stages for mediumJS, largeJS, complexJS, plainJS
(a no-template LinkedList implementation), and taggedTemplatesJS (a lit-html
style component with many interpolated tagged templates):

| Stage                 | What's added                                             |
| --------------------- | -------------------------------------------------------- |
| 0. raw tokenize       | `tokenize(src, grammar)` — baseline                      |
| 1. + empty pipeline   | `reclassify([])(src, rawResult)` — wrapper cost only     |
| 2. + rewriteTypes     | `reclassify([rewriteTypes(functionVariableRules)])(...)` |
| 3. + embedInterleaved | Full JS pipeline including tagged-template embedding     |
| 3b. `language(src)`   | Convenience entry point — should match stage 3           |

Plus end-to-end HTML tokenization for `htmlLanguage(embeddedHTML)`, which
exercises `embedGrammars` sub-tokenizing `<script>` and `<style>` content
through the full JS and CSS pipelines.

Each bench runs 500ms warmup + 1500ms measurement. Numbers below are
representative runs on the dev machine (darwin, Node via pnpm/vitest).

## Findings

### 1. The pipeline wrapper is free

```
mediumJS — empty pipeline              25,099,013 ops/sec  (~40 ns / call)
```

`reclassify([])` has **negligible** overhead. The wrapper itself is not a
concern; every cost below comes from actual transform work.

### 2. `language()` convenience === manually composed pipeline

```
mediumJS — language() entry point      20,457 ops/sec
mediumJS — manually composed pipeline  20,472 ops/sec
```

Within 0.1%. `createLanguage(grammar, reclassifiers)` has no measurable cost
vs writing the composition out by hand.

### 3. Pipeline scaling is proportional to token count, not source length

Pre-tokenized inputs (tokenize cost removed):

```
mediumJS    full pipeline   86,130 ops/sec   (~11.6 µs)
largeJS     full pipeline   28,586 ops/sec   (~35.0 µs)
complexJS   full pipeline   24,227 ops/sec   (~41.3 µs)
plainJS     full pipeline   28,487 ops/sec   (~35.1 µs)  — scan, no match
taggedJS    full pipeline   11,579 ops/sec   (~86.4 µs)  — heavy embed
```

`plainJS` and `largeJS` have nearly identical per-invocation cost despite
different source lengths — the pipeline cost tracks the token count, which
is the right scaling.

### 4. rewriteTypes is the dominant non-embedding cost

End-to-end (tokenize + pipeline), plainJS (no tagged templates at all):

```
Stage                                          ops/sec    Δ vs stage 0
0. raw tokenize                                 12,327        —
1. + empty pipeline                             12,342        +0%
2. + rewriteTypes (function-variable)            9,836       +25%
3. + embedInterleaved scan (no matches)          8,638       +44%
```

- `rewriteTypes` with the function-variable rule adds **~25% overhead** on
  a file with lots of identifiers. The rule fires at every identifier and
  tries to match the `= [async] (...) =>` / `= function` pattern.
- `embedInterleaved`'s scan-and-find-nothing adds **~14%** on top. It walks
  every token and calls `scanTaggedTemplate` once per position; the scanner
  fast-rejects non-identifier tokens immediately.
- Total overhead on a no-template file is **~44%** of base tokenize time.

This is **above** the plan's 20% target. See "Optimization" below for the
40% improvement that brought us from 62% down to 44% and options for going
further.

### 5. Embedding cost is proportional to sub-language work

```
taggedTemplatesJS (lit-html style, many `html`...`/`css`...` calls)
0. raw tokenize                                 14,607        —
2. + rewriteTypes                               13,086       +11%
3. + embedInterleaved (real embedding)           6,493      +125%
```

Full embedding roughly **doubles** the runtime vs raw tokenize — which is
exactly what you'd expect, since the transform is literally running a second
tokenizer (HTML or CSS) over the embedded content. This is the correct cost
profile: the pipeline only pays the sub-tokenization cost when there's
actual sub-language content to tokenize.

### 6. HTML multi-language composition scales linearly

```
embeddedHTML (real doc with <style> + <script>)
0. raw tokenize (HTML grammar only)             23,651        —
1. htmlLanguage() — full incl. sub-languages     8,839     +168%
```

The 2.68x is: HTML grammar tokenize + the JS language pipeline (for
`<script>` body) + CSS tokenize (for `<style>` body). Each sub-language
runs its own full reclassifier pipeline inside its sub-tokenization. The
total is close to "HTML cost + JS cost + CSS cost," which is the minimum
possible for a multi-language document. No structural overhead from the
embedding mechanism itself.

## Optimization: typeId memoization in scanners

The first benchmark run showed `plainJS` at **+62% overhead**. Root cause:
`scanTaggedTemplate` was resolving `tokenTypes.indexOf("identifier")`,
`indexOf("template")`, `indexOf("punctuation")` **on every call** — once per
token position. For a file with thousands of tokens that's tens of thousands
of linear scans over a 20-item array.

Fix (committed in `packages/javascript/src/reclassifiers.js`): cache the
resolved typeIds on first call, keyed on the `tokenTypes` array reference
via `WeakMap`. Different compiled grammars get distinct cache entries, and
the cache is automatically garbage-collected.

Impact on isolated pipeline cost (pre-tokenized, 1:1 comparison):

| Sample                          | Before | After  | Δ        |
| ------------------------------- | ------ | ------ | -------- |
| mediumJS full                   | 62,697 | 86,130 | **+37%** |
| largeJS full                    | 20,523 | 28,586 | **+39%** |
| complexJS full                  | 16,682 | 24,227 | **+45%** |
| plainJS (scan, no match)        | 20,473 | 28,487 | **+39%** |
| taggedTemplatesJS (heavy embed) | 11,539 | 11,579 | +0.3%    |

As expected, the memoization only affected scans — the heavy-embed case
was already dominated by sub-tokenization work, so it saw no improvement.
End-to-end plainJS overhead dropped from **+62% → +44%**.

## Remaining overhead: where it goes

After memoization, the ~44% overhead on plainJS breaks down roughly:

- **~25% rewriteTypes** — the function-variable rule tries to match at
  every identifier. Most attempts fail fast on the first operator check,
  but the rule is expressive enough to cost real cycles per identifier.
- **~14% embedInterleaved scan** — one function call per token position,
  with typeId lookups now memoized. Remaining cost is essentially "walk
  the stream and call a function per token."

Both are inherent to the "declarative pattern over a token stream" model.
Reducing them further would require either:

1. **Rule pre-filtering by second token type.** Currently the anchor
   dispatch in `rewriteTypes` checks the anchor token type, then runs the
   full pattern matcher. A "rule fast-reject" that peeks the NEXT token's
   type (against the pattern's first element) could skip most failed
   attempts before allocating any pattern state.
2. **Anchor-filtered scan in `embedInterleaved`.** Accept an optional
   `anchorType` on the config — the transform's outer loop would skip
   tokens whose type doesn't match before calling `scan`. This would
   eliminate the per-non-identifier function call entirely.

Both are future work; neither blocks landing Phase 3.5 as "complete" by
the architecture validation criterion.

## Conclusion

**The architecture is sound.**

- Empty pipeline is free.
- `language()` convenience has no cost.
- Pipeline cost scales with token count (not source length).
- Embedding cost is proportional to sub-language work, not added overhead.
- Multi-language composition (HTML → JS/CSS) adds no structural cost beyond
  the sum of the sub-language tokenize times.

**The remaining overhead is real but acceptable and well-characterized.**

- Function-variable rule: ~25% on busy identifier files.
- embedInterleaved scan-no-match: ~14% after memoization.
- Total "nothing to do" pipeline cost: ~44% on plainJS.
- Plan target (<20%) is not yet met end-to-end, but the individual stage
  costs are understood and the path to closing the gap is clear.

**Phase 3.5 ships as-is**; further hot-path optimization (rule pre-filter,
anchor-filtered scan) is a focused follow-up when another workload needs it.
