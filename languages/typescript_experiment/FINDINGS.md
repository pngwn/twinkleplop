# typescript_experiment — findings

## Summary

The experiment asked: can we move class-field / interface-member disambiguation from the reclassifier pipeline into grammar states, and if so, at what cost?

Short answer: yes, but the perf win is marginal (~3% on complex TS), the grammar gets substantially bigger, and some cases (modifier-preceded class fields) can't be handled without further differentiating tokens per context.

## What was built

A parallel `@twinkleplop/typescript_experiment` package that:

1. **Refactored brace handling.** Rewrote `{` / `}` in `regex_allow`, `division`, `identifier`, `function_body`, `paren_group` to push/pop (enter/leave) instead of goto/stay. The stack now tracks brace depth.

2. **Introduced structural states.**
   - `class_header` + `class_body` + a `class_header_ident_cont` sub-state
   - `interface_header` + `interface_body` + `interface_header_ident_cont`
   - class/interface keywords push their header state
   - header state's `{` transitions to body state
   - body state's `}` pops

3. **Emitted distinct token types** for structural braces: `class_open` / `class_close` / `interface_open` / `interface_close`. This is what lets the reclassifier cheaply distinguish class bodies from object literals without walking tokens.

4. **Trimmed the reclassifier pipeline.**
   - Dropped the class-field-exclusion lookbehind rule (~25 LOC). No longer needed: `class_open` isn't `punctuation`, so the property-promotion rule skips class bodies naturally.
   - Dropped `interface_member_promoter` (the ~80-line stateful walker). Replaced with pattern rules anchored on `interface_open`.
   - Dropped the modifier branch from the object-literal property-promotion rule, since interface-context `readonly` promotion is handled by the new interface-member rules.

5. **Added a `normalise_structural_punct` post-pass** that rewrites `class_open` / `class_close` / `interface_open` / `interface_close` back to `punctuation` for consumers and coalesces the adjacent same-type pairs the rewrite creates.

## Numbers

### Performance (complex_ts, ~1000 lines, vitest bench)

|                            | ops/sec | mean (ms) | vs current TS |
| -------------------------- | ------: | --------: | ------------: |
| `typescript` tokenize-only |  1195.6 |     0.836 |        1.00x  |
| `typescript_experiment` tokenize-only | 1182.7 | 0.846 |       0.99x  (~1% slower) |
| `typescript` full pipeline |   665.3 |     1.503 |        1.00x  |
| `typescript_experiment` full pipeline |  687.3 |  1.455 |       1.03x  (~3% faster) |

The structural-states refactor costs ~1% in tokenization (extra states and push/pop work on braces). It saves ~7% on the reclassifier pipeline work, netting a ~3% full-pipeline win. The saving is smaller than hoped because the reclassifier still has to do `function_variable_rules` (arrow function detection, label exclusion, type-annotation exclusion, object-literal property promotion) and `embed_interleaved` (tagged template scan) regardless — these are the bulk of the reclassifier cost, and they don't overlap with what the structural states replaced.

### Complexity (LOC)

|                        | `typescript` | `typescript_experiment` | delta |
| ---------------------- | -----------: | ----------------------: | ----: |
| `grammar.ts`           |          245 |                     386 |  +141 |
| `reclassifiers.ts`     |           12 |                     203 |  +191 |

The experiment's `reclassifiers.ts` gets bigger because the current `typescript` package re-exports the JS reclassifiers unchanged (`function_variable_rules` + `scan_tagged_template` come from `@twinkleplop/javascript`). The experiment inlines a trimmed version of those rules plus the new `interface_member_rules` plus the `normalise_structural_punct` pass.

If we count the JS reclassifiers the current TS package leans on (`languages/javascript/src/reclassifiers.ts` = 496 LOC of which ~80 is the `interface_member_promoter` walker), the comparison changes:
- current: 245 grammar + ~250 effective reclassifier (everything ts imports) = ~495 LOC
- experiment: 386 grammar + 203 reclassifier = 589 LOC

So net complexity increased ~20% — we traded 80 lines of stateful walker for ~190 lines of grammar plumbing and inlined rules.

### Test parity

11 of 14 TS fixture tests pass. 3 fail, all in the same pattern:

- `access_modifiers.txt` — `public readonly radius: number;` (radius stays identifier in current, experiment promotes to property)
- `builtin_types.txt` — same pattern (modifier-preceded class field with builtin type)
- `declare_module.txt` — `type Config = { debug: boolean; port: number; };` (`port` after `;` in a type-alias object literal gets promoted by the interface-member rule that can't tell it's not inside an interface body)

These three failures share one root cause: the experiment's reclassifier rules can't distinguish "semicolon/modifier inside interface body" from "semicolon/modifier inside other contexts" without walking tokens — the very walker we were trying to eliminate. Fixing them requires emitting `readonly` / `;` as distinct token types inside interface/class bodies (more grammar plumbing), or putting back a simplified version of `interface_member_promoter`.

## What worked

- **Brace refactor was tractable.** Changing `{` and `}` to push/pop in the five affected states didn't break any fixture test. Stack now tracks brace depth without needing a separate counter.
- **`class_open` marker naturally distinguishes class bodies.** The property-promotion rule's `before: type("punctuation", ["{"])` stops firing for class bodies without any rule changes — a clean structural signal.
- **Classes and interfaces fixtures pass.** `classes.txt`, `interfaces.txt`, `js_compat.txt`, `type_aliases.txt`, `type_annotations.txt` etc. all produce identical tokens.

## What didn't work cleanly

- **Modifier-preceded class fields.** Both class body and interface body use `readonly` as a modifier. The grammar emits both as `keyword`, so the reclassifier can't distinguish them without walking or without context-specific token types.
- **Subsequent interface members.** After the first member, interface-body members are preceded by `;`, which is `punctuation` — no different from `;` in any other context. Again needs context-specific tokens or a walker.
- **goto-heavy flat grammar.** The initial attempt to push `class_body` without the brace refactor failed fast: goto transitions (identifier_probe → identifier → regex_allow → ...) replace `current_state` so by the time the class's closing `}` fired, `class_body` was no longer the current state. The brace refactor (stage 1.5) was a necessary preliminary.

## Recommendation

**Don't migrate.** The perf win (~3%) doesn't justify the complexity increase (~20% more LOC across grammar + reclassifier) and the loss of test parity on three edge cases. The experiment's clearest value was showing that:

1. The flat grammar's `goto`-everywhere style has a real structural cost — you can't just "push a context state" and expect it to survive to its matching pop.
2. A brace-depth-tracking refactor is tractable and cheap. Even without the class/interface work, this alone enables context-aware rules via slots.
3. The interface-member walker is doing more than it looks like. The cases it handles (mixed modifiers, subsequent members after `;`) don't have cheap grammar-side replacements without per-context token differentiation.

If the goal is to reduce reclassifier weight, the higher-leverage moves are probably:

- **Optimize the reclassifier pattern matcher itself.** The rule-compilation cache added recently helped ~5 pp on small inputs. Pushing further — e.g., compiling rules to a bytecode that inlines the hot loop — could gain more.
- **Reduce the rule COUNT.** Drop less valuable rules (e.g., labels, which are rare in modern code).
- **Profile the tagged-template scan.** `embed_interleaved` with `scan_tagged_template` is significant overhead on any JS/TS input; some cases might short-circuit cheaply.

If the goal is structural states anyway (e.g., for richer IDE-style analysis), the experiment's `class_body` / `interface_body` plumbing is a reasonable starting point — but expect to invest in per-context token types for the modifier/`;` cases, which is additional grammar work.

## Artefacts

- Source: `/Users/peterallen/Projects/twinkleplop/languages/typescript_experiment/`
- Benchmarks: `lib/bench/src/library/comparison-suite.bench.js` has `Twinkleplop experiment - tokenize only` and `Twinkleplop experiment - full pipeline` blocks in the TS tokenise/full sections.
- Identity tests: `languages/typescript_experiment/src/identity.test.ts` — runs all TS fixtures through the experiment's full pipeline and compares against `@twinkleplop/typescript`'s output. 11/14 pass.
