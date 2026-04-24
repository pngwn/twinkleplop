# Grammar fidelity analysis

This document complements [`reclassifiers.md`](./reclassifiers.md). That doc
catalogues the reclassifier pipelines and splits them into _correctness_ and
_fidelity_ buckets. This one asks the inverse question:

> If we ignore correctness work, what fidelity does each grammar have on its
> own? Which identifier distinctions are baked into the state machine, which
> are layered on by reclassifiers, and what does it cost to push the "bake
> into state machine" distinctions out into the reclassifier layer instead?

### Why this matters

Most syntax highlighters give you what you get. Changing fidelity is either
impossible or requires wrangling CSS styles, which is hard to reason about.
twinkleplop's grammar + reclassifier architecture can support **user-controlled
fidelity** as a first-class feature: coarse tiers (high / low) plus a
fine-grained API where consumers opt in to specific identifier upgrades
(function, class_name, property, type, builtin, …) and pay only for what
they turn on.

That only works if the distinctions live in the reclassifier layer where
they can be composed, disabled, or swapped. This note quantifies what it
costs to put them there for the ones that aren't already.

## Method

1. **Audit the native token stream** emitted by each language grammar in
   `languages/*/src/grammar.ts` — with reclassifiers disabled. For each,
   list every identifier-family token type the raw tokenizer can produce
   and whether it costs light or heavy grammar machinery.
2. **Classify each distinction** into three buckets: inherent (must stay in
   the grammar for the stream to be well-formed), relocatable (currently
   grammar-side but could move), already-reclassifier.
3. **Benchmark** three languages (JavaScript, Python, Rust) with two
   pipelines that produce equivalent output:
   - **full**: native grammar + canonical reclassifiers (current production)
   - **stripped**: grammar with specific identifier-family tokens rewritten
     to `identifier`, then a restoration reclassifier runs before the
     canonical reclassifiers to re-derive the original output
4. Compare raw tokenize cost, reclassifier cost, and end-to-end cost.

The stripped variants live in `lib/bench/src/stripped/`. They are bench
artifacts only — no language package is modified. The stripping is done by
deep-cloning the raw grammar object and rewriting `token:` fields that
match a victim set (`lib/bench/src/stripped/strip.js`). This preserves
state structure and rule ordering; only emitted token names change.

Equivalence was verified on real samples before benchmarking:

| Sample          | Tokens | Diffs                                  |
| --------------- | ------ | -------------------------------------- |
| `medium_js`     | 258    | 0                                      |
| `large_js`      | 791    | 1 (stringified `if` inside a template) |
| `complex_js`    | 1036   | 0                                      |
| `python_medium` | 336    | 0                                      |
| `python_large`  | 3420   | 0                                      |
| `rust_medium`   | 387    | 0                                      |
| `rust_large`    | 3860   | 0                                      |

The single `large_js` diff is an acknowledged artefact of reclassifier
pattern matching being state-blind: a dead `if` token the grammar
emitted as `identifier` inside a template body gets promoted to `function`
by the restoration pass because a `(` follows. The production function
probe is state-gated so it skips the same token.

## Native fidelity rating per language

Rating scale:

- **Bare** — grammar emits only `identifier` for names; no
  classification work beyond lexing.
- **Low** — adds `keyword` plus 1-2 sigil-based types (`variable`,
  anchor marker, etc.).
- **Medium** — adds one of `function`, `class_name`, or `builtin` via
  context or case-based dispatch.
- **High** — adds `property`/`type`/method call as well.

| Language   | Native fidelity | Grammar machinery                            | Identifier types the grammar emits                                                                               |
| ---------- | --------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Markdown   | Bare            | Minimal                                      | — (structure only)                                                                                               |
| SQL        | Bare            | Light                                        | `identifier`, `variable`                                                                                         |
| YAML       | Bare            | Medium (dash/question probes)                | `identifier`, `variable` (anchor/alias)                                                                          |
| Bash       | Bare            | Light                                        | `identifier`, `variable` (sigil + 1 char)                                                                        |
| HTML       | Low             | Minimal                                      | `tag_name`, `attr_name`                                                                                          |
| JavaScript | Low             | Light                                        | `identifier`, `function`, `keyword`, `boolean`                                                                   |
| TypeScript | Low–Medium      | Light                                        | + `type` (builtins only), `decorator`                                                                            |
| TSX        | Medium          | Light                                        | TS + `tag_name`, `attr_name`                                                                                     |
| Svelte     | Medium          | Light                                        | `tag_name`, `attr_name`, `svelte_block`, `svelte_directive`                                                      |
| CSS        | Medium–High     | Medium (prop/selector probe)                 | `property`, `selector`, `selector_class`, `selector_id`, `selector_pseudo`, `unit`, `css_variable`, `identifier` |
| Rust       | Medium          | Medium (lifetime/char probe + case dispatch) | `identifier`, `class_name` (case+primitives), `builtin` (macro `!`), `lifetime`, `keyword`, `boolean`, `number`  |
| Python     | Medium–High     | Light                                        | `identifier`, `class_name` (PascalCase), `builtin` (type set), `boolean`, `keyword`, `number`, `format`          |

## Classification per distinction

| Distinction                                      | Language(s)                         | Bucket               | Notes                                                                                                                                          |
| ------------------------------------------------ | ----------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Keyword promotion by exact text                  | all with `keyword()`                | inherent             | Word-boundary checks are easier at lex time; keeping them there also avoids re-tokenizing to detect them.                                      |
| `class_name` via PascalCase                      | Python, Rust                        | relocatable          | Trivial post-hoc (check first-char case).                                                                                                      |
| `class_name` via `class`/`new`/`instanceof`      | JavaScript, TypeScript              | already-reclassifier | `class_name_promoter` does this today.                                                                                                         |
| `builtin` type set (`int`, `str`, …)             | Python                              | relocatable          | Set lookup against identifier text.                                                                                                            |
| `class_name` for primitive set (`i32`, `u64`, …) | Rust                                | relocatable          | Same.                                                                                                                                          |
| `boolean` literal text                           | JavaScript, Python, Rust, SQL, YAML | relocatable          | Set lookup.                                                                                                                                    |
| `function` via `(` probe                         | JavaScript                          | relocatable          | Already relocated for Python, Rust, CSS.                                                                                                       |
| `function` via `=` + arrow                       | JavaScript                          | already-reclassifier | `function_variable_rules`.                                                                                                                     |
| `property` after `.` / before `:`                | JavaScript, YAML                    | already-reclassifier | `interface_member_promoter`, `promote_keys`.                                                                                                   |
| `type` in type-position                          | TypeScript                          | already-reclassifier | `type_position_promoter`; inherent to correctness.                                                                                             |
| `<>` as punctuation (generics)                   | Rust                                | already-reclassifier | `reclassify_generics`; depth-tracking walk.                                                                                                    |
| `!` macro marker                                 | Rust                                | inherent             | Collapsing to `identifier` merges `vec!` into one token (tokenizer coalesces same-typed spans); the grammar-time distinctness is load-bearing. |
| `$foo` lexeme scope                              | Bash                                | inherent             | Grammar cannot extend beyond 2 chars without leaking nested states; reclassifier owns the rest.                                                |
| `0xff` / `16#ff` numeric assembly                | Bash                                | inherent             | State machine would require multi-token lookahead; reclassifier merges post-hoc.                                                               |
| SQL keyword/type/boolean text                    | SQL                                 | already-reclassifier | Case-insensitive set lookup; grammar couldn't enumerate case variants cheaply.                                                                 |
| YAML scalar type (bool/null/number)              | YAML                                | already-reclassifier | Spec-driven pattern match on identifier text.                                                                                                  |

## Feasibility ranking

Language ranked from "easiest to strip to bare identifier" to "hardest":

1. **Markdown, HTML** — already bare or nearly so. No work to do.
2. **SQL, YAML, Bash** — already bare for keyword/type/boolean; the remaining
   grammar work is sigil and parameter handling, which is lexing, not
   classification.
3. **Svelte, CSS** — bulk of classification is structural (tag vs attr,
   property vs selector). Feasible but requires moving CSS's
   property/selector probe into a reclassifier with brace lookahead.
4. **JavaScript** — `function` at call site is the one grammar-time
   classification; moves cleanly to reclassifier.
5. **Python** — PascalCase, builtin set, boolean set all move cleanly.
   `type_alias_rules` already catches the soft-keyword case in a post-pass.
6. **Rust** — case dispatch and primitive set move cleanly; `!` macro
   marker is inherent (see coalescing note above); lifetimes depend on a
   two-phase probe that could move but isn't worth the complexity.
7. **TypeScript, TSX** — blocked by `type_position_promoter`. Moving the
   grammar's type-builtin set out is trivial, but type-position tracking
   is already a stateful post-hoc FSM and cannot be made simpler by
   changing where it runs.

## Benchmarks

Vitest bench, warmup 500ms, measurement 1500ms per case. Hz means full
pipeline runs per second on a single core (higher = faster). Numbers are
for one macOS run; repeat trials land within the reported RME (±1-1.5%).

### Raw tokenize (grammar only)

| Sample     | full (hz) | stripped (hz) | stripped Δ |
| ---------- | --------- | ------------- | ---------- |
| js medium  | 28,434    | 28,423        | ±0%        |
| js large   | 8,700     | 8,745         | +0.5%      |
| js complex | 6,883     | 6,852         | -0.5%      |
| py medium  | 24,667    | 24,448        | -0.9%      |
| py large   | 2,533     | 2,547         | +0.5%      |
| rs medium  | 26,922    | 27,009        | +0.3%      |
| rs large   | 2,675     | 2,695         | +0.7%      |

Every delta is within run-to-run noise. The grammar-time identifier
classification work is effectively free.

### End-to-end (grammar + reclassifier pipeline)

| Sample     | full (hz) | stripped (hz) | stripped Δ |
| ---------- | --------- | ------------- | ---------- |
| js medium  | 18,056    | 15,372        | **-14.9%** |
| js large   | 5,530     | 4,999         | **-9.6%**  |
| js complex | 4,295     | 3,882         | **-9.6%**  |
| py medium  | 20,395    | 18,746        | **-8.1%**  |
| py large   | 2,225     | 2,031         | **-8.7%**  |
| rs medium  | 18,921    | 17,826        | **-5.8%**  |
| rs large   | 2,073     | 1,966         | **-5.2%**  |

The stripped pipeline is 5–15% slower end-to-end. The extra cost is the
restoration pass walking the token stream, inspecting identifier text,
and mutating the token array.

## Interpretation

1. **Grammar-time classification is near-free.** Case dispatches, keyword
   word-boundary checks, and short probe states compile to indexed
   lookups on the same hot path as lexing. Collapsing them to a single
   identifier emission measures the same throughput. This means a
   consumer who wants _less_ fidelity — a bare-identifier stream —
   doesn't get a perf win from the grammar; the grammar does the same
   work regardless.

2. **Reclassifier restoration costs a bounded 5–15% end-to-end** on
   realistic samples. Each restoration pass is O(tokens): walks the
   array once, reads input text for each identifier token, does set
   lookups or case checks, mutates token type IDs. The cost scales with
   how many passes you add, not exponentially.

3. **Cost budget for a fidelity API.** In round numbers: one
   single-walk classification pass (case-based class_name, or a keyword
   set lookup, or a "name before paren" function detector) is in the
   ballpark of 3–7% end-to-end. Two or three of them stacked is in the
   ballpark of 10–15%. That's the price ceiling for exposing most
   identifier upgrades as toggleable user options.

4. **Tokens that cannot move.** Some grammar-time distinctions are
   load-bearing for the stream itself, not just for fidelity:
   - Rust `!` macro marker: collapsing to `identifier` makes the
     tokenizer coalesce `vec!` into one token (same type = merged
     span), irreversibly losing the boundary.
   - Bash `$foo` lexeme extension and `0xff` / `16#ff` numeric
     assembly: the grammar can't express them without leaking nested
     states.
   - TypeScript type-position tracking: already a stateful reclassifier,
     cannot be simplified further.
   - Rust generic `<>` rewriting: depth-tracking already lives in a
     reclassifier.
     These are the irreducible core; a fidelity API should treat them as
     always-on.

5. **What the benchmark does not cover.** The stripping rewrites token
   names but does not remove rules. A more aggressive variant that
   actually merges identifier entry states (eliminating the
   case-dispatch rule entirely) could in principle run faster in the
   compiled table, at which point stripped could be _faster_ than full.
   Our raw-tokenize numbers suggest the headroom is small — the
   grammar is already spending most of its time on lexing work (string
   bodies, number continuation, operators), not identifier dispatch —
   but a dedicated low-fidelity grammar variant might be worth
   exploring for the bare-identifier consumer.

## Implications for the fidelity API

This research supports building user-controlled fidelity as a feature.
The observed numbers set the envelope:

- **"High" (default) tier** runs the full pipeline as today. No change.
- **"Low" tier** disables all fidelity reclassifiers — keeps only the
  correctness passes from [`reclassifiers.md`](./reclassifiers.md)
  (Python `type_alias_rules`, TypeScript `type_position_promoter`,
  Rust `reclassify_generics`, Bash `extend_variables` / `merge_numbers`
  / `promote_keywords`, SQL `keyword_reclassifier`, YAML
  `classify_scalars`). Tokenize throughput stays roughly at the
  current `raw tokenize` numbers since the removed passes are the ones
  measured here (5–15% range).
- **Fine-grained opt-in** works well for: `function` promotion,
  `class_name` promotion (PascalCase / class-head / new / instanceof),
  `property` promotion, `builtin`/primitive type sets, boolean
  literals, YAML key promotion, markdown style composition. These are
  the reclassifier passes labelled "fidelity" in
  [`reclassifiers.md`](./reclassifiers.md) — composing subsets is a
  direct fit for the existing architecture.
- **Always-on (not toggleable)** the correctness passes enumerated
  above, plus the inherent distinctions from point 4.

### Rough shape of a consumer API

Not a design, just what the benchmark implies is feasible:

```js
// coarse
language(src, { fidelity: "low" }); // correctness passes only
language(src, { fidelity: "high" }); // current default

// fine
language(src, {
  fidelity: {
    function_calls: true,
    class_names: true,
    properties: false,
    builtins: true,
  },
});
```

Each flag corresponds to one or a small group of reclassifier passes
from the existing pipeline. A flag set to false simply omits that pass
from the pipeline — no grammar change needed.

### What does not need to change

- The grammars themselves. Grammar-time identifier classification is
  near-free and the compiled state machine is already lean on this
  axis. Stripping grammars to "bare identifier" does not pay a perf
  dividend and sacrifices distinctions (like Rust `!`) that are
  structurally necessary.
- The existing reclassifier pipeline. The passes are already
  independent units composed into an array; turning fidelity passes on
  and off is a matter of selecting array entries, not rewriting them.

## Commutativity of fidelity passes

If we expose fidelity reclassifiers as opt-in flags, each combination of
enabled passes must produce the same output regardless of order, or the
API surface leaks ordering rules onto the consumer. We tested this
empirically: for every language with more than one fidelity pass, for
every non-trivial subset of those passes, run all permutations of the
subset against the corrected stream (grammar + correctness passes only)
and compare outputs.

Results on realistic + adversarial samples (script at
`lib/bench/src/commutativity/check.js`):

| Language   | Fidelity passes                                                                            | Commutative?                                        |
| ---------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| JavaScript | function_variable_rules, interface_member_promoter, class_name_promoter, embed_interleaved | ✓ yes (65 subset×permutation combinations verified) |
| Python     | function_rules                                                                             | trivial (1 pass)                                    |
| Rust       | function_call_rules, extend_lifetime_over_type                                             | ✗ **no**                                            |
| Svelte     | block_brace_open, block_brace_close, embed_grammars                                        | ✗ **no**                                            |

Two real order-dependencies exist:

**Rust — `function_call_rules` vs `extend_lifetime_over_type`.** Triggered
by `&'static str_fn()`. If `extend_lifetime` runs first it absorbs
`str_fn` into the lifetime span (lifetime + identifier → one lifetime
token), and `function_call_rules` then has no identifier to promote.
Running `function_call_rules` first turns `str_fn` into `function`, and
`extend_lifetime` refuses to merge functions. The production ordering
is the correct-looking one; reversing it mis-classifies the token.

Fix: teach `extend_lifetime` to refuse absorption when the next
identifier is immediately followed by `(`. That makes the two passes
commute (both orderings produce the function-call-wins result) and
matches the comment in `languages/rust/src/reclassifiers.ts` that says
the lifetime extension "runs last so it doesn't hide an identifier the
function-call rule might want" — this is that invariant, enforced in
the pass itself rather than by pipeline order.

**Svelte — `block_brace_open` vs `block_brace_close`.** The close rule's
`before:` lookbehind pattern is `seq(type("punctuation", "{"), type("punctuation", BLOCK_OR_AT_SIGILS))`,
i.e. it requires the opening `{` to already be `punctuation`. The open
pass rewrites `expression "{"` to `punctuation`, so the close pass only
fires if open ran first.

Fix: change the close pattern to accept either `expression "{"` or
`punctuation "{"` as the opening brace, then the two rules become
self-contained. Alternatively, merge them into a single pass that walks
the stream once and rewrites both braces together — semantically they
are one operation split in two for implementation reasons.

`embed_grammars` commutes with the others in every subset that doesn't
contain both block_brace rules, confirming the issue is isolated to the
open/close pair.

### Implications for the API

- JavaScript (the richest fidelity layer) is already fully
  commutative — a flag-based API works out of the box there.
- Rust and Svelte need the two small fixes above before we can ship
  fidelity flags without ordering caveats. Both fixes are localized
  edits (one comparison check in Rust, one rule pattern in Svelte) and
  are improvements even without the fidelity API — they remove hidden
  ordering invariants that are currently enforced only by documentation
  and the fixed array position of each pass.
- Python and single-pass languages (CSS, HTML, Markdown) are trivially
  commutative.
- After the two fixes, the full fidelity layer is commutative, which
  means the API can be "select any subset of flags" without dependency
  declarations or topological sorting.

## Postscript — refactor completed

After this analysis, the grammar cleanup was carried out for JavaScript,
TypeScript, Python, and Rust. Summary of changes:

- **Grammar tokens removed** (fidelity stripped from the state machine):
  - JavaScript: `function` (call-site probe), `boolean`.
  - TypeScript: `type` (BUILTIN_TYPES keyword set). Inherits JS removals.
  - Python: `class_name` (PascalCase dispatch), `builtin` (BUILTIN_TYPES),
    `boolean`.
  - Rust: `class_name` (UPPER dispatch + PRIMITIVE_TYPES), `boolean`.
- **Grammar tokens kept** (structural — cannot move):
  - Rust `builtin` (macro `!` marker — coalescing).
  - Rust `lifetime` (two-phase probe is lexical).
  - Rust number-suffix `class_name` (only reachable in number states).
  - TypeScript `decorator` (single-char sigil).
  - All keyword and language-structural tokens.
- **Shared helpers added** to `@twinkleplop/core` (`lib/core/src/fidelity.ts`):
  - `promote_by_text_set(source, target, set)`
  - `promote_pascal_case(source, target)`
  - `promote_function_calls(source, target, variants, options)`
- **Commutativity fixes applied**:
  - Rust `extend_lifetime_over_type` refuses to absorb a following
    identifier that is itself followed by `(`.
  - Svelte block-brace rewrite collapsed from two `rewrite_types` passes
    into one stateful walk that pairs braces in a single pass.
- **Pipelines restructured** into three conceptual layers (correctness /
  restoration / optional fidelity). See
  [`reclassifiers.md`](./reclassifiers.md) for the per-language
  inventory.
- **Verification**: all 704 existing tests still pass; the commutativity
  test confirms all optional fidelity subsets commute on top of
  correctness + restoration across JavaScript, Python, Rust, and Svelte
  samples (including adversarial inputs).

The benchmark in this doc measured an expected 5–15% end-to-end cost for
the restoration layer at the time of the research. Post-refactor that
cost is paid unconditionally when restoration runs; disabling restoration
gives the "low fidelity" tier that the fidelity-API feature can expose.

## Artefacts

- `lib/core/src/fidelity.ts` — shared restoration helpers
  (`promote_by_text_set`, `promote_pascal_case`,
  `promote_function_calls`) used by each language's restoration layer.
- `lib/bench/src/commutativity/check.js` — commutativity test. Runs all
  (subset × permutation) combinations of each language's OPTIONAL
  fidelity passes over a "correctness + restoration" base and reports
  any non-commuting groupings. Run with:
  ```
  cd lib/bench && node src/commutativity/check.js
  ```
- `lib/bench/src/commutativity/samples.js` — Python and Rust sample
  sources used by the commutativity test (JS samples reused from
  `lib/bench/src/library/javascript-samples.js`).

The original strip-vs-full benchmark infrastructure
(`lib/bench/src/stripped/`) has been removed now that the strip has been
incorporated into the production grammars — the two sides of that
comparison are no longer distinct.
