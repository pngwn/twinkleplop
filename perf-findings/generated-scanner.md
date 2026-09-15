# Generated scanners: decomposing the 8.6-13.4x

Branch `perf/generated-scanner`, forked from `perf-exploration` (`571af87`).

**Headline: the 13.4x is not one thing, and the biggest single piece of it is
not code generation. It is that the table interpreter dispatches once per
input character where a hand lexer chomps a run. That one mechanism is worth
more than everything code generation adds on top of it, and — this is the
useful part — it can be recovered inside the interpreter, for all eighteen
grammars, in about forty lines and with no generated code at all.**

Two results, in order of what they are worth:

1. A **run fast path in `tokenize`** that consumes a whole self-looping rule
   in one dispatch. No code generation, no build step, no bundle cost, no CSP
   question, applies to every grammar including the eleven with probe states.
   `parity.mjs` clean, `pnpm test` clean.
2. A **build-time scanner generator** that turns a compiled grammar into
   specialised source. It works, it is output-correct, and it is a further
   **3.34x** on top of the fast path — but it covers **7 of 18 grammars**, none
   of them the ones that dominate the corpus, costs roughly 3x the gzipped
   bundle per grammar and **12.1x** the import time, and — per the
   decomposition — its speed does not come from the mechanisms that need code
   generation at all.

The decomposition below is what separates those two, and it is the part worth
keeping regardless of which is shipped. Its most useful output is a chain of
eliminations pointing at a change nobody on this track proposed: a `tokenize`
with no probe machinery in it.

---

## 1. Method

Everything is measured against the frozen reference at
`/Users/peterallen/Projects/twinkleplop/.perf/baseline`, machine lock held,
never `--no-lock`. Nothing under `lib/bench/perf/` was modified.

The decomposition is an eight-rung ladder. Each rung takes exactly one
mechanism that the shipped scanner interprets at runtime and bakes it into
generated code. One emitter produces all eight, so adjacent rungs differ by
one mechanism and nothing else.

| rung | name | what stops being interpreted |
| ---: | ---- | ---------------------------- |
| 0 | `interpreter` | nothing. reproduces `core.tokenize`, including its bugs |
| 1 | `no_probe` | probe mode, `failed_probes`, boundary set, when the grammar has none |
| 2 | `dense_cache` | `patterns.get(state)` / `non_ascii_chars.get(state)` Map lookups |
| 3 | `state_switch` | the per-transition cache refresh; `char_map_base` / `trans_base3` become literals |
| 4 | `gen_action` | the `(transition, token_type, stack_op)` table read and the `stack_op` branch cascade |
| 5 | `gen_class` | the `char_maps` read, replaced by generated range tests |
| 6 | `gen_pattern` | the bucket loop over `PatternInfo` objects |
| 7 | `chomp` | per-character dispatch for self-looping rules |

Code: `perf-findings/spike/gen.mjs` (emitter), `verify.mjs` (gate),
`ladder.mjs` (measurement).

### The gate that makes the ladder mean anything

Every rung must reproduce `core.tokenize`'s token stream exactly — count, type
ids and spans — on every corpus file. A rung that quietly does less work is
the standard failure mode of this kind of spike, and token count is what
catches it.

There is one honest complication, and it is worth stating before any number:
**the shipped tokenizer is wrong on some of these files**, via the state-stack
overflow the scanner track documented. So a ninth rung, `bug_compat`, is
generated: identical to rung 0 except it reproduces the unchecked push into a
fixed `Uint16Array(256)`, degenerate `undefined` state and all.

```
node perf-findings/spike/verify.mjs bash markdown json go diff diff-basic whitespace
```

`bug_compat` is **clean on every file of every supported grammar**. That is
the proof that the emitter is faithful and that every divergence reported
below is the stack leak and nothing else.

---

## 2. How bad the state-stack bug actually is

The scanner track found this and called it a silent degradation. Measured
against a scanner that does not have it (`perf-findings/spike/stackbug.mjs`),
it is worse than that:

| workload | bytes | shipped tokens | correct tokens | lost | degrades at |
| -------- | ----: | -------------: | -------------: | ---: | ----------: |
| `real/compiled-grammar` | 124022 | 28375 | 28402 | 0.1% | 83.7% in |
| `scale/json` | 249234 | 28765 | 57096 | **49.6%** | 41.9% in |
| `scale/go` | 202311 | 5235 | 49194 | **89.4%** | 8.8% in |
| `scale/diff` | 201298 | 8729 | 15210 | 42.6% | 21.3% in |
| `scale/diff-basic` | 200078 | 15016 | 22265 | 32.6% | 28.0% in |
| `scale/markdown` | 220494 | 8477 | 8583 | 1.2% | 22.7% in |

On `scale/go` the shipped scanner emits **5235 tokens where the answer is
49194**. It is not degrading, it has stopped working 9% of the way into the
file and produced plausible-looking output for the rest.

Two consequences that matter for this track:

- **It confirms the fusion track's hand lexer was right, not approximate.**
  That track reported 28402 tokens against "the real 28375" and called it
  +0.1% in its own favour. 28402 is the correct answer. The hand lexer was
  exactly right and the tokenizer was wrong by 27 tokens.
- **It makes those workloads useless for A/B.** A correct scanner measured
  against one that gave up partway is doing strictly more work. Every ladder
  measurement below therefore uses workloads where the shipped scanner is not
  degraded, and `real/compiled-grammar` is kept only because just its last 16%
  is affected.

---

## 3. The decomposition

```
node --expose-gc perf-findings/spike/ladder.mjs
```

Five workloads, adjacent rungs paired and ABBA-interleaved, 11 rounds, median
of per-round ratios, machine lock held. A ratio above 1.00 means the more
specialised rung is faster.

| step | geomean | json/compiled-grammar | go/server | bash/bash | markdown/architecture | diff/feature |
| ---- | ------: | --------------------: | --------: | --------: | --------------------: | -----------: |
| `core.tokenize` -> rung 0 | **3.722x** | 4.893x | 3.306x | 2.839x | 3.911x | 3.976x |
| 1 `no_probe` | **1.177x** | 1.101x | 1.084x | 1.577x | 1.126x | 1.064x |
| 2 `dense_cache` | **1.045x** | 1.047x | 1.061x | 1.045x | 1.059x | 1.015x (ns) |
| 3 `state_switch` | **0.965x** | 0.946x | 0.980x (ns) | 0.972x | 0.922x | 1.005x (ns) |
| 4 `gen_action` | **1.153x** | 1.130x | 1.175x (ns) | 1.093x | 1.150x | 1.220x |
| 5 `gen_class` | **0.962x** | 0.996x (ns) | 0.916x (ns) | 1.060x (ns) | 0.766x | 1.110x (ns) |
| 6 `gen_pattern` | **0.871x** | 1.232x | 0.718x | 0.735x | 0.732x | 1.054x |
| 7 `chomp` | **1.202x** | 1.014x (ns) | 1.080x | 1.428x | 1.175x | 1.363x |
| **total** | **5.532x** | 8.538x | 3.161x | 5.416x | 3.500x | 10.124x |

`(ns)` marks a bootstrap CI that includes 1.0.

The total on `json/compiled-grammar` is **8.538x**, and in the same process the
fusion track's hand lexer is a further **1.646x** beyond that (`core.tokenize`
4872.9us, rung 7 570.9us, hand lexer 357.9us — an end-to-end ratio of 13.6x,
which reproduces that track's 13.4x almost exactly).

### What this says, and it is not what the hypothesis predicted

**Three of the seven code-generation mechanisms are net negative.**

- **`gen_class` (0.962x) — generating character classification is slower than
  reading the table.** Replacing `char_maps[base + char]` with inlined range
  comparisons loses. In hindsight this is obvious: `char_maps` is a 128-byte
  slice of a permanently L1-resident `Uint16Array`, indexed by a value already
  in a register, and it is one load with no branch. A chain of range tests is
  several compares and several branches, and the branch predictor has to learn
  each one. The hand-lexer intuition — "literal comparisons must beat a table"
  — is simply wrong here.
- **`gen_pattern` (0.871x) — generating multi-char pattern matching is much
  slower.** Same reason, worse: unrolling every pattern in a bucket into an
  `if` chain replaces one bucket lookup that is *usually null* with a run of
  first-character comparisons that are usually all false. The scanner track
  already measured the bucket loop at 0.109 candidates per input character;
  generating it out costs more than it saves. The one workload where it wins
  is JSON (1.232x), which has exactly three patterns in one state.
- **`state_switch` (0.965x) — a per-state `switch` is slightly slower than a
  flat loop**, even though it turns `char_map_base` and `trans_base3` into
  literals. The dispatch it adds costs more than the two shifts it removes.

**The mechanisms that do pay are three, and only one of them needs codegen:**

- **`chomp` (1.202x)** — consuming a self-looping rule's whole run in one
  dispatch. This is the mechanism the fusion track's hand lexer was actually
  winning with, and section 4 shows it does not need code generation at all.
- **`gen_action` (1.153x)** — replacing the three-slot transitions read and the
  `stack_op` branch cascade with straight-line code per rule. This one is
  genuinely code generation and it genuinely pays.
- **`dense_cache` (1.045x)** — `patterns.get(state)` / `non_ascii_chars.get(state)`
  replaced by arrays indexed by state. This is the one idea the scanner track
  left explicitly open, and 1.045x is about where it guessed. It needs no
  codegen either — it is a change to what `compile()` hands the tokenizer.

### The arithmetic, which is the whole finding

Split the seven rungs by whether the mechanism requires code generation:

| | mechanisms | product |
| --- | --- | ---: |
| **needs no codegen** | `no_probe` 1.177 x `dense_cache` 1.045 x `chomp` 1.202 | **1.479x** |
| **needs codegen** | `gen_action` 1.153 x `state_switch` 0.965 x `gen_class` 0.962 x `gen_pattern` 0.871 | **0.932x** |

**The four mechanisms that only code generation can provide multiply out to a
7% net loss.** Every mechanism that actually pays for itself in the ladder is
available without generating a line of code. That is the opposite of what this
track set out to show, and it is the reason the recommendation below is what it
is.

### The row I cannot cleanly attribute, and will not pretend I can

**`core.tokenize` -> rung 0 is 3.722x and it is a composite, not a mechanism.**
Rung 0 is supposed to reproduce the interpreter, and on output it does exactly
that (`bug_compat` is byte-identical everywhere). But it is faster for two
reasons I did not separate:

1. **It is specialised to one grammar.** The tables are closure constants of
   known type rather than fields destructured from a `CompiledGrammar` object,
   and `has_seals` / `has_patterns` / `has_non_ascii` / `has_boundary` are
   compile-time constants, so whole branches are absent rather than predicted.
2. **It omits the probe *implementation* entirely** — `probe_entry`, probe
   resolution, the rewind, `probe_fallbacks`. My emitter never generates that
   code at any rung. For the seven grammars measured here it never executes in
   `core.tokenize` either, so output is unaffected, but its *presence* in a
   ~1000-line function is not free: it is register pressure, inlining budget,
   and the deopt feedback the scanner track found recorded on a function every
   language shares.

Rung 1 (`no_probe`, 1.177x) removes only the probe *gate* — the `probe_mask`
read and the `failed_probes` checks — not the implementation, so it does not
isolate (2) either. **The honest statement is that specialising `tokenize` per
grammar is worth somewhere around 3-4x on top of everything the ladder
measures, and I could not split that between "monomorphic function" and "no
probe code in the body".** It is the largest single number on this track and
the one I am least able to attribute. Anyone continuing should split it before
building on it.

One confound ruled out: within the JSON comparison, `core.tokenize` had only
ever been called with the JSON grammar, so this is not call-site polymorphism
introduced by the harness loading five languages.

---

## 4. The run fast path

The ladder says the single mechanism a hand lexer wins with is chomping: a
string body, a comment body, an identifier run and a digit run are all one
grammar rule matching many consecutive characters, and the interpreter pays a
full dispatch for every one of them.

**That does not need code generation.** By the time the loop has read
`transitions[t_base]`, `[t_base + 1]` and `[t_base + 2]` it already knows
whether the rule can change state. A rule with `transition === 65535` and
`stack_op === 0` that emits a token is a self-loop, and its whole run can be
consumed in place. The run stops at a character that maps to a different rule,
at a character that starts one of the state's multi-char patterns (the bucket
is consulted first, so it would have won), and at non-ASCII.

Forty lines in `lib/core/src/tokenizer.ts`. No new tables, no compile-time
work, no build step, no generated artefacts, and it applies to **all eighteen
grammars including the eleven the generator cannot touch**.

```
node --expose-gc lib/bench/perf/bin/ab.mjs --suite quick --label interp-run-fastpath
```

```
by mode (geomean)
  html        +11.0%  n= 10  worst +1.8% (real/pipeline:html)
  pipeline    +23.3%  n= 10  worst +3.6% (real/core-runtime:pipeline)
  tokenize    +69.0%  n= 10  worst +18.0% (real/architecture:tokenize)

by language (geomean)
  svelte      +78.0%   typescript  +30.3%   markdown    +22.3%
  go          +17.8%   rust        +15.6%   javascript  +14.8%

overall
  geomean            +32.2%  over 30 workloads
  faster             25
  slower             0
  unstable           0

run integrity
  machine anchor drift  -1.6% (231.4us -> 227.7us)
  noise floor           3.4%
```

Every language moved, every mode moved, nothing regressed. That is the
signature the harness README asks for — "a real change to the scanner moves
every `tokenize` row across every language" — rather than a scattered set of
individually significant rows.

The claim-grade run, where `--repeat 2` reports the weaker of two independent
passes and a workload only counts if both agree on direction:

```
node --expose-gc lib/bench/perf/bin/ab.mjs --suite core --repeat 2 --label interp-run-fastpath-core
```

```
by family (geomean)
  fixtures    +39.5%  n= 35  worst -0.2% (fixtures/whitespace:tokenize)
  micro       +26.6%  n= 52  worst -0.1% (micro/javascript:html)
  real        +31.3%  n= 60  worst +3.3% (real/server:html)

by language (geomean)
  toml        +62.4%   svelte      +61.7%   diff        +54.0%   html        +53.3%
  diff-basic  +47.6%   json        +33.2%   bash        +31.8%   yaml        +31.2%
  markdown    +28.6%   typescript  +26.8%   sql         +26.8%   css         +19.8%
  python      +19.5%   javascript  +17.8%   rust        +16.4%   go          +15.1%
  tsx         +14.3%   whitespace   +1.3%

overall
  geomean            +31.5%  over 147 workloads
  faster             129
  slower             0
  unstable           5

run integrity
  machine anchor drift  -2.1% (231.5us -> 226.8us)
  noise floor           3.4%
```

**All eighteen languages improved. Nothing regressed.** The two negative
figures in the table, -0.2% and -0.1%, are single workloads inside the noise
floor; `whitespace` is the only language that barely moves, and its grammar is
a single state with almost nothing to chomp.

The `micro` family at +26.6% is the reassuring number: the fast path adds
about seven predictable comparisons to every `char_maps` match, so the risk was
that short inputs would pay the test without collecting the benefit. They do
not — even a 300-byte snippet has identifier and whitespace runs.

The largest movers are the ones the mechanism predicts: `real/core-types`
(`tokenize` +112%) and the two site panels (+349% and +168%) are dense in long
same-rule runs. The smallest, `real/architecture:tokenize` at +18%, is
markdown, where more of the input is genuinely changing state.

### What generation still adds on top of it

The fast path does not close the gap. With generated scanners attached, and
compared against the fast-path interpreter in the same process and the same
build (`perf-findings/spike/codegen_delta.mjs`):

| language | generated vs fast-path interpreter |
| -------- | ---------------------------------: |
| whitespace | 5.866x |
| diff | 4.060x |
| json | 3.837x |
| diff-basic | 3.403x |
| bash | 3.066x |
| markdown | 2.859x |
| go | 2.165x |
| **geomean, 20 workloads** | **3.338x** |
| geomean over the 19 where output is identical | 3.228x |

So generation is still worth **3.3x** on the seven grammars it can handle, on
top of everything the fast path already gives. That is a large number and it is
the strongest argument for this track's hypothesis.

It is also, per section 3's arithmetic, **not coming from the mechanisms that
require code generation** — those multiply to 0.932x. It is the same
unattributed specialisation effect as rung 0, and section 5 shows it is not the
closure constants either. The remaining candidate is the one section 8 puts
first.

---

## 5. Generation strategy: CSP and bundle size

### The three options

| strategy | dispatch | CSP | build pipeline | verdict |
| -------- | -------- | --- | -------------- | ------- |
| `new Function` at import | fastest | **fatal** | unchanged | rejected |
| build-time codegen | same | fine | new step, big artefacts | what was built |
| closure tree | indirect call per state | fine | unchanged | not built; see below |

**`new Function` is not viable and the reason is not negotiable.** A strict
`script-src 'self'` with no `'unsafe-eval'` — the configuration a
security-conscious documentation site or dashboard actually ships — makes
`new Function` throw `EvalError`. A syntax highlighter is a leaf dependency
that gets dropped into exactly those pages. The usual escape hatch, try the
eval and fall back to the interpreter, is worse than it sounds: it means two
scanner implementations that must be kept output-identical forever, only one
of which most CI runs exercise, and a silent 2x performance cliff that appears
only on the strictest customers' sites. The spike uses `new Function` because
it is a measurement instrument; the shipped design must not.

**Build-time codegen is the only strategy that is both fast and CSP-safe.**
`build/generate-scanners.mjs` compiles each grammar, generates the scanner
source, and writes `languages/<lang>/src/scanner.generated.js`. The package
imports it like any other module. Nothing is evaluated at runtime.

**A closure-per-grammar factory was built and measured, and it is a
regression.** This is the interesting one, because it looked like the free
lunch: no eval, no build step, no bundle cost, and it would apply to all
eighteen grammars. `tokenize` was refactored into
`make_scanner(compiled_grammar)` returning a closure, cached per grammar in a
`WeakMap`, so the tables become closure constants instead of fields
destructured out of a `CompiledGrammar` on every call.

```
node --expose-gc lib/bench/perf/bin/ab.mjs --suite quick --label fastpath-plus-closure
  overall geomean +25.9% over 30 workloads, faster 19, slower 0
```

against the fast path alone on the same suite:

```
  overall geomean +32.2% over 30 workloads, faster 25, slower 0
```

**Turning the tables into closure constants costs about 5%.** It was
`parity.mjs` clean and `pnpm test` clean, so this is a pure performance
verdict, and it was reverted.

That result matters for interpreting section 3. Rung 0 — which is exactly a
closure over the tables — is 3.7x faster than `core.tokenize`, and this
experiment shows essentially none of that comes from the closure constants. By
elimination the dominant term is the other difference: **rung 0's function body
does not contain the probe machinery at all**. See section 8 for what to do
with that.

A full closure *tree*, one closure per state, was not built. Given that a
single closure boundary already costs 5%, a design with an indirect call per
state visit is not promising, but I have no measurement for it.

### Bundle size

This is the strategy's real bill, and it is large.

| | ships today | with generated scanners | multiple |
| --- | ---: | ---: | ---: |
| all 18 packages, raw | 151.9 KB | 696.4 KB | **4.6x** |
| all 18 packages, gzipped | 41.4 KB | 63.5 KB | **1.53x** |

Per generated grammar the gzipped cost is roughly **3x**:

| lang | dist today (gz) | with scanner (gz) | raw generated source |
| ---- | --------------: | ----------------: | -------------------: |
| bash | 3.1 KB | 10.2 KB | 717 KB |
| markdown | 1.8 KB | 6.4 KB | 348 KB |
| go | 2.6 KB | 6.6 KB | 192 KB |
| diff | 1.2 KB | 4.3 KB | 108 KB |
| json | 0.7 KB | 2.2 KB | 30 KB |
| diff-basic | 0.6 KB | 1.9 KB | 24 KB |
| whitespace | 0.3 KB | 0.9 KB | 5 KB |

Gzip is kind to this code because the emitted token-emission block repeats
almost verbatim thousands of times, which is also why the raw figure is so
much worse than the wire figure. The raw number is not cosmetic: 717 KB of
source is 717 KB the engine must parse, and the eleven grammars the generator
cannot handle would still ship their tables, so this is added cost, not
replaced cost.

`perf-findings/spike/size.mjs` and `shipsize.mjs` produce these tables.

### Import cost

The brief asked for this explicitly, and it is the worst number in the section.
`compile(raw_grammar)` runs at module import for every language package, so
whatever generation adds is paid on every cold start.

```
node perf-findings/spike/cost.mjs
```

| lang | `compile` today | generate + `new Function` | parse+eval generated module |
| ---- | --------------: | ------------------------: | --------------------------: |
| bash | 0.27ms | 1.18ms | 3.00ms |
| markdown | 0.11ms | 0.54ms | 1.53ms |
| go | 0.08ms | 0.40ms | 0.93ms |
| diff | 0.07ms | 0.21ms | 0.55ms |
| json | 0.02ms | 0.08ms | 0.22ms |
| diff-basic | 0.02ms | 0.04ms | 0.18ms |
| whitespace | 0.00ms | 0.01ms | 0.10ms |
| **total (7 grammars)** | **0.58ms** | **2.45ms** | **6.52ms** |

**Build-time codegen makes import 12.1x more expensive for those grammars**
(0.58ms of `compile` becomes 0.58ms of `compile` plus 6.52ms of parsing
generated source). Runtime generation is cheaper at 5.2x, but it is the
CSP-blocked option.

The absolute figures are small — 6.5ms across seven grammars — but they scale
with generated source size, and the eleven grammars the generator cannot
handle are also the eleven largest. Extrapolating the observed
bytes-to-parse-time relationship to all eighteen would put this in the tens of
milliseconds of added cold start, on a library whose whole compile step is
currently under 2ms. A separate track is measuring cold start; this is the
number to hand them.

---

## 6. What the generator covers, and what it does not

**It handles 7 of 18 grammars. The blocker is probe states, and it is not a
small gap — it excludes every language that dominates the corpus.**

| generated | on the interpreter (probe states) |
| --------- | --------------------------------- |
| bash, diff, diff-basic, go, json, markdown, whitespace | css, html, javascript, python, rust, sql, svelte, toml, tsx, typescript, yaml |

The generated scanners implement: per-state dispatch, ASCII character classes
from `char_maps`, multi-char pattern buckets with word-boundary checks,
`boundary_rules` on single-character matches, seal flags, non-ASCII per-state
maps, fallback transitions, all three stack operations, token coalescing, and
self-loop run consumption.

They do **not** implement probe mode: `probe_entry`, probe resolution, the
rewind on failure, `probe_fallbacks`, or the `failed_probes` set. This is not a
"todo" — probe mode is a backtracking mechanism whose whole point is that the
scanner rewinds `pos` and re-scans, and expressing that as generated
straight-line code is a materially harder problem than everything else here
combined. `build/generate-scanners.mjs` writes an explicit `null` export for
those grammars rather than emitting a scanner that silently drops probe
resolution, which is the failure mode that would be hardest to detect.

Also not handled: nothing in the generator knows about the introspector, so
`tokenize` keeps the interpreter whenever an introspector is passed.

---

## 7. Correctness

### The run fast path: clean

This is the change the branch ships, and it has no exceptions to declare.

```
node lib/bench/perf/bin/parity.mjs
  parity: 287 checks across 4 families, corpus 73b6d51a2c464ba5
  no divergences. output is identical on every checked path.

pnpm test
  Test Files  69 passed (69)
  Tests  1719 passed | 1 skipped (1720)
```

Clean across all eighteen grammars, including all eleven with probe states.

### The generated scanners: divergent, and it is the known bug

With the generated scanners attached instead, `parity.mjs` reports 24
divergences over six workloads:

```
affected workloads:
  real/compiled-grammar        tokenize, pipeline, fidelity-low, html
  scale/diff                   tokenize, pipeline, fidelity-low, html
  scale/diff-basic             tokenize, pipeline, fidelity-low, html
  scale/go                     tokenize, pipeline, fidelity-low, html
  scale/json                   tokenize, pipeline, fidelity-low, html
  scale/markdown               tokenize, pipeline, fidelity-low, html
```

**Every one of these is in the state-stack-overflow set the brief listed, and
there is no divergence outside it.** (`scale/rust` and `scale/sql` are on that
list too but their grammars have probe states, so they stay on the interpreter
and cannot diverge here.) `pnpm test` passes 1719/1719 with the generated
scanners attached.

The first divergence reads:

```
  real/compiled-grammar:tokenize  token stream differs
    token 21900 of 28375 (baseline) / 28402 (candidate), line 10958
    baseline:  punctuation [103789,103790) "}"
    candidate: boolean [103778,103782) "true"
```

The baseline has failed to recognise the keyword `true`, because past 256
pushes it is scanning against state 0 with no pattern buckets. The candidate is
correct. This is the generated scanner being right, not wrong — it grows its
state stack instead of writing past the end of a fixed `Uint16Array(256)`.

Two independent confirmations that this is the *whole* difference:

- The `bug_compat` rung — rung 0 plus the unchecked fixed-size push — is
  byte-identical to `core.tokenize` on every corpus file of every supported
  grammar.
- 28402 is also exactly what the fusion track's hand-written JSON lexer
  produced. Three independent implementations agree; the shipped tokenizer is
  the outlier.

---

## 8. Recommendation

### Ship the run fast path. It is not a close call.

**+31.5% end-to-end geomean over 147 workloads on `--suite core --repeat 2`,
129 faster and 0 slower, all eighteen languages improved** (+32.2% and +69.0%
on `tokenize` on the `quick` suite). `parity.mjs` clean on all 287 checks and
`pnpm test` clean on all 1719. It is forty lines in one file, adds no table, no
compile-time work, no build step and no bytes to the bundle, and it applies to
all eighteen grammars rather than the seven a generator can reach.

It also does not conflict with anything: it is strictly a fast path, and the
general path underneath it is untouched.

### Do not build the code generator as this track imagined it.

The hypothesis was that the cost is generic table-driven dispatch and that
compiling grammars into specialised code would recover it. **Half of that is
right and the actionable half is wrong.** The cost really is in the generic
loop — but of the four mechanisms only code generation can remove, three are
net negative and the four together multiply to **0.932x**. Generating character
classification and pattern matching as inline comparisons is slower than the
`Uint8Array` table lookups they replace, because those tables are tiny,
L1-resident, branch-free and already fast. The hand lexer was never winning
because its comparisons were literal; it was winning because it chomped.

This has to be squared with the 3.338x that generated scanners still deliver
over the fast path. Both numbers are real, and together they say the win is
**not** in "the grammar expressed as code" — it is in the specialised function
being small. That is why the recommendation is to chase the cause rather than
build the generator.

The other costs are real and were measured:

- **Coverage: 7 of 18 grammars.** The blocker is probe mode, and the eleven it
  excludes include typescript, javascript, tsx, css, svelte, python and rust —
  every language that dominates the corpus. A generator that handles JSON and
  markdown but not TypeScript is not a scanner strategy.
- **Bundle: ~3x gzipped per generated grammar**, 1.53x across all eighteen
  packages, 4.6x raw. Raw matters because it is parse work at import.
- **`new Function` is off the table** for a library that ships to the web
  under CSP, so the only viable form is a build step producing large committed
  artefacts.

### What I would do next, in order

1. **Build a probe-free `tokenize` and measure it.** This is the highest-value
   follow-up on the track, and the evidence points at it by elimination rather
   than by guesswork:

   - generated scanners beat the fast-path interpreter by **3.338x**;
   - the four mechanisms that need code generation multiply to **0.932x**, so
     that is not where the 3.3x is;
   - making the tables closure constants — the other obvious explanation —
     was built and **costs 5%**, so that is not where it is either;
   - what is left is that the generated function body simply does not contain
     the probe machinery, in a function that is otherwise ~1100 lines and that
     every grammar shares.

   The experiment is a second copy of the scanning loop with every probe path
   deleted, selected once per grammar by `probe_mask` being empty. No code
   generation, no eval, no build step, one extra copy of the loop in the
   bundle, and it applies to the same seven grammars a generator could reach —
   but at a fraction of the cost, and without the 12.1x import penalty. If it
   captures even half the 3.3x it is a better deal than the generator on every
   axis.

   I did not build it: it is a large mechanical edit to `tokenizer.ts` and I
   would rather hand over a measured chain of eliminations than a rushed
   implementation.
2. **Land `dense_cache`.** Replacing `patterns.get(state)` and
   `non_ascii_chars.get(state)` with arrays indexed by state measured 1.045x in
   the ladder. That is below the library noise floor on its own, so it needs
   `--suite core --repeat 2` to claim, but it is a small change to what
   `compile()` returns and it is the one idea the scanner track left open.
3. **Fix the state stack.** It is a live correctness bug that drops 89% of the
   tokens on `scale/go`, and it is now blocking measurement as well: any
   comparison on an affected workload is against a scanner that stopped
   working partway through the file.
4. **If anyone still wants generation**, the shape the data supports is narrow:
   generate the *action* code (1.153x) and keep the character-classification
   and pattern tables exactly as they are. That is a much smaller generator,
   with a much smaller artefact, and it would need probe support before it
   could touch a language anyone actually highlights.

### What is throwaway here

Everything under `perf-findings/spike/` is a measurement instrument. `gen.mjs`
uses `new Function`, which the shipped design must not, and its generic rungs
deliberately omit probe resolution, so they are only valid for the seven
grammars without probe states. `build/generate-scanners.mjs` and the committed
`scanner.generated.js` files are a working demonstration of the build-time
strategy, kept so the numbers can be reproduced — not a proposal to merge.

The change I am proposing is the forty lines in `lib/core/src/tokenizer.ts`.

### State of the branch

- `lib/core/src/tokenizer.ts` carries the run fast path. This is live and it is
  what `parity.mjs` and `pnpm test` were last run against.
- `tokenize` also carries a one-property-read hook that delegates to
  `compiled_grammar.scan` when a generated scanner is attached, and
  `CompiledGrammar` has the matching optional field. That is how the generator
  was measured in situ.
- The generated `scanner.generated.js` files and `build/generate-scanners.mjs`
  are committed but **not attached** — no language package imports them. That
  matches the recommendation: the generator is reproducible, not shipped. To
  measure it again, re-add the two lines the script prints guidance for, or see
  the commit history for the wiring.

### Reproducing

```bash
node perf-findings/spike/verify.mjs bash markdown json go diff diff-basic whitespace
node --expose-gc perf-findings/spike/ladder.mjs
node perf-findings/spike/stackbug.mjs
node perf-findings/spike/size.mjs
node perf-findings/spike/cost.mjs
node build/generate-scanners.mjs
node --expose-gc perf-findings/spike/codegen_delta.mjs   # needs the scanners attached
```

Every measurement script takes the machine-wide bench lock. Nothing under
`lib/bench/perf/` was modified.
