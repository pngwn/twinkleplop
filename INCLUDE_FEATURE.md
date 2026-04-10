# Spec: Rule-Set Composition via `include`

## 1. Motivation

States that share most rules but differ in a few must currently duplicate everything. JavaScript's `main`/`division`/`regex_allow` trio is the canonical case, identical except in how `/` is handled. The pattern recurs for template interpolation, JSX, type-vs-value position, and embedded-language boundaries. This spec introduces **named rule sets** as a flat composition primitive, referenced by states via **`include`**. Inheritance is not introduced.

## 2. Terminology

The word "state" is overloaded in grammar systems. This spec uses it precisely:

- **Tokeniser state** — an entry in the top-level `states` map. It is a target of `push`/`pop`/`goto`, has lifecycle semantics, and is what the tokeniser can be *in* at runtime.
- **Rule set** — an entry in the top-level `ruleSets` map. A named, ordered list of rules. It is not a tokeniser state and cannot be pushed, popped, or gotoed.
- **Rule** — a single matcher with associated actions. A rule may itself carry a `push`/`pop`/`goto` that *references* a tokeniser state by name. This is a reference, not containment: rules do not nest tokeniser states inside themselves.

When §4.2 below says "including a state is an error," it means: the name in an `include` array must resolve to a rule set, not to a tokeniser state. It does *not* mean rules inside an included set cannot reference tokeniser states via `push`/`pop`/`goto` — they freely can, and this is the normal way rule sets drive transitions.

## 3. API

### 3.1 Grammar shape

```typescript
interface Grammar {
  ruleSets?: Record<string, RuleSet>;
  states: Record<string, TokeniserState>;
  // ... existing fields
}

interface RuleSet {
  include?: string | string[];
  rules: GrammarRule[];  // required, may be empty
}

interface TokeniserState {
  include?: string | string[];
  rules?: GrammarRule[];  // optional if include is present
  mode?: "probe" | "tokenise";
  fallback?: string;
  // ... existing fields
}
```

A tokeniser state must have at least one of `include` or `rules` non-empty; having neither (or both empty) is a compile error.

A rule set's `rules` field is required but may be an empty array (useful for pure aggregation: a rule set whose only job is to bundle other rule sets under one name).

### 3.2 Example

```javascript
{
  ruleSets: {
    js_common: {
      rules: [],
      include: ["js_whitespace", "js_keywords", "js_operators", "js_literals", "js_identifiers"],
    },
    // ... leaf sets defined elsewhere
  },
  states: {
    main:         { include: "js_common", rules: [{ match: "/", token: "ambiguous" }] },
    division:     { include: "js_common", rules: [{ match: "/", token: "operator" }] },
    regex_allow:  { include: "js_common", rules: [{ match: "/", token: "regex", push: "regex_pattern" }] },
    template_expr:{ include: "js_common", rules: [{ match: "}", pop: true }] },
  },
}
```

## 4. Semantics

### 4.1 Effective rule list

For a tokeniser state, the effective rule list — the flat sequence the tokeniser actually matches against — is constructed as:

1. For each name in `include` (in array order), the fully-flattened rule list of that rule set.
2. Followed by the state's own `rules`, in declared order.

Concatenation is in exactly this order. No interleaving, no reordering.

### 4.2 Match priority

The tokeniser uses **first-match-wins** over the effective rule list. Because included rules precede local rules in the concatenation, included rules take priority on ties.

**This is intentional and load-bearing.** For the `/` override pattern to work correctly, the shared `js_common` rule set must not contain any rule that matches `/`. The rule for `/` lives only in each state's local `rules`, and each state supplies a different one. This is a convention, not a mechanism: **any rule whose behaviour varies between states must live in state-local `rules`, never in a shared rule set.** If this convention is violated, the shared rule wins and the local rule is dead code.

The compiler detects dead local rules (§6.5) and reports them.

### 4.3 What `include` accepts

- **Rule-set names only.** The name must resolve to an entry in `ruleSets`. Referencing a tokeniser state by name in `include` is a compile error.
- **Unknown names** are a compile error.
- **Duplicate names within a single `include` array** are a compile error, not silently deduplicated.
- **Self-reference**, direct or transitive, is a compile error (§6.2).

Note the distinction with §2: rules *within* an included set may reference tokeniser states via `push`/`pop`/`goto`. Only the `include` field itself is restricted to rule-set names.

### 4.4 State transitions from included rules

Rules carrying `push`/`pop`/`goto` behave identically whether they were written inline in a state or contributed via `include`. The compiler validates that all referenced tokeniser states exist, after composition.

A rule set does not know or care which tokeniser states will consume it; it may reference any tokeniser state by name, and it is the grammar author's responsibility to ensure that every state which includes the set also has access to the referenced targets. (All tokeniser states share one global namespace, so this is trivially satisfied.)

## 5. Rule sets including rule sets

Rule sets may include other rule sets via the same `include` field, enabling layered composition:

```javascript
ruleSets: {
  js_core:       { include: ["js_whitespace", "js_keywords", "js_identifiers"], rules: [] },
  js_expression: { include: ["js_core", "js_operators", "js_literals"], rules: [] },
}
```

Flattening is eager and complete (§6.2). By the time the state machine is built, every tokeniser state holds a single flat rule list with no residual `include` information.

Cycles are a compile error.

## 6. Compiler processing

### 6.1 Pass order

1. Parse grammar source.
2. Validate top-level shape.
3. **Flatten rule sets** (§6.2).
4. **Resolve state `include` fields** (§6.3).
5. Validate resolved tokeniser states: rule shapes, `push`/`pop`/`goto` targets, fallback targets.
6. Build state machine.

### 6.2 Rule-set flattening

1. Build a directed graph of rule-set-to-rule-set references from every rule set's `include` field.
2. Detect cycles via DFS; report any cycle as a compile error listing the participating rule sets in traversal order.
3. Topologically sort.
4. In topological order, compute each rule set's flat rule list as `[...flattened rules of each included set in include-order..., ...own rules]`. Because dependencies are already flattened when visited, this is a single concatenation per set.
5. Cache each flat list keyed by rule-set name.

### 6.3 State resolution

For each tokeniser state:

1. If `include` is absent or empty, the effective rule list is `state.rules ?? []`.
2. Otherwise, for each name in `include` (in order): look up the cached flat list; concatenate. Unknown name, duplicate name within this array, or name resolving to a tokeniser state → compile error. Then append `state.rules ?? []`.
3. If the resulting effective rule list is empty, compile error.
4. Replace the state's rule list with the effective list; the `include` field is discarded. Downstream passes see only normalised tokeniser states with a flat `rules` field.

### 6.4 Sharing (optional optimisation)

Because rule sets are referenced by name, the compiler may recognise states that share identical included prefixes and share compiled sub-tables internally. This is invisible to grammar authors and not required for correctness.

### 6.5 Diagnostics

- `unknown rule set "js_keyword" in include of state "main" (did you mean "js_keywords"?)`
- `"main" refers to a tokeniser state; include accepts rule-set names only`
- `rule sets form a cycle: a → b → c → a`
- `duplicate include "js_operators" in state "division"`
- `state "empty" has no rules and no non-empty includes`
- `rule in state "division" is shadowed by an earlier rule from included set "js_common"` (dead-rule warning, strict mode)

## 7. Interaction with other features

- **Embedded languages (future).** Host-injected terminators are spliced into the guest's designated interruptible rule sets before flattening, so every tokeniser state that transitively includes those sets inherits the terminator automatically.
- **`fallback`, `mode`.** Unchanged. Both are properties of the tokeniser state, unaffected by composition. Fallback applies to the resolved effective rule list.

## 8. Non-goals

- Rule exclusion, filtering, renaming, or token remapping on include. Add later if justified.
- Runtime composition. `include` is resolved entirely at compile time.
- State-to-state inheritance. No `extend` between tokeniser states; composition goes through rule sets only.
- Position control of included rules within local rules. If needed, split local rules into two rule sets.

## 9. Open questions

1. Flat `ruleSets` namespace vs. nested/prefixed for multi-language composition. **Tentative:** flat for v1; revisit with embedded-language support.
2. Warn on rule sets defined but never transitively included from any tokeniser state. **Tentative:** yes, strict-mode warning.
3. Should the dead-rule detector in §6.5 be strict-mode only or always on? **Tentative:** always on as a warning; strict mode promotes to error.
