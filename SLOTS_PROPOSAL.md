# Slots: feature proposal

> **Status: feature removed 2026-04-14.** Implemented through stages 0–8 of the original plan, then removed after an experimental restructure (`languages/typescript_experiment/`) showed the motivating case (class/interface disambiguation) was solvable without slots via a brace-depth refactor plus distinct token types. No in-tree grammar used slots, and the infrastructure cost ~10% tokenize-only perf on slot-free grammars. Document kept as a record of the design exploration; see git log for implementation + removal history.

## 0. Summary

`slots` are typed, bounded, named variables attached to a state. They initialize when the state is pushed, vanish when it's popped, can be read as rule predicates, and can be written as rule actions. They are the declarative equivalent of tree-sitter's external-scanner state, expressed so the compiler can bake them into the transition machinery and the runtime can touch them in a handful of integer ops per transition.

This is one new concept. It adds three fields to the grammar schema (`slots` on states, `slot_when` and `slot_set` on rules), two `Partial<GrammarRule>` helpers in the DSL, and a small parallel `Uint8Array` at runtime. Grammars that don't use slots pay zero.

The feature is motivated by the failures documented in `LANGUAGE_RESEARCH.md` §2 and analyzed in `LANGUAGE_RESEARCH_FINDINGS.md` §1/§5 — most concretely, the commented-out class-field-vs-interface-member rule at `languages/javascript/src/reclassifiers.ts:104-134`. Read those first for the "why"; this doc is the "how".

---

## 1. Concept

A slot is a variable with:

- a **name** (string, unique within a grammar),
- a **type** (`bool`, `u8`, or an enum of string labels, compiling to `u8`),
- a **default value**,
- a **lifetime** tied to a state frame: created on push, destroyed on pop, restored-on-fail when the frame is popped during a probe fallback.

Rules can **read** slots as predicates (`slot_when`) and **write** slots as actions (`slot_set`). Reads and writes are evaluated as part of the compiled transition step; they do not call out to host code.

Slots are intentionally small and untyped-by-string-scope. **Each slot name is globally unique** — declared on exactly one state in the grammar. Duplicate declarations are a compile error, not shadowing. This is deliberate: shadowing is the main hazard of dynamic scoping, and without it every slot has one canonical home that grammar authors and future readers can point to.

To keep that home visible at every point of use, slot references from outside the owning state must be **qualified** (`"owner_state.slot_name"`). Unqualified references (`"slot_name"`) are only allowed in the rules of the state that declares the slot. See §3.2 for the exact rule.

---

## 2. Grammar spec surface

### 2.1 Slot declarations on states

Add an optional `slots` field to `GrammarState`:

```ts
export type SlotType = "bool" | "u8";

export interface SlotDeclaration {
  type: SlotType;
  default?: boolean | number;
  // optional, only valid when type === "u8": symbolic names for values 0..N-1.
  values?: string[];
}

export interface GrammarState {
  // existing fields...
  slots?: Record<string, SlotDeclaration>;
}
```

A state **declares** slots. Declaring a slot on state X means: when X is pushed, the slot is reinitialized to its default; when X is popped, the slot's value before X was pushed is restored.

Example:

```ts
class_body: {
  slots: {
    kind: { type: "u8", values: ["class", "interface"], default: 0 },
    seen_field: { type: "bool", default: false },
  },
  rules: [ /* ... */ ],
}
```

### 2.2 Slot types and defaults

v1 ships two types:

- **`bool`** — one bit semantically, stored as a byte. `default`, if present, is `true` or `false`.
- **`u8`** — a byte, 0..255. `default`, if present, is a number in range. If `values` is provided, the slot is an enum: reads/writes in rules use the string names, the compiler maps them to integers 0..N-1.

**Defaults are optional.** A slot declared without a `default` must be initialized by the rule that pushes the owning state (see §3.5). This is the recommended style for any slot where no value is "naturally" correct — e.g., `kind` on a shared `member_body` state, which depends entirely on whether the caller is `class_body_open` or `interface_body_open`. Making the default optional forces the grammar author to face the question "what value does this take when nothing's been set?" at compile time rather than hiding it behind a silent zero.

**Enum defaults are by name, not by index.** When `values` is present, `default` — if given — must be one of the strings in `values`. `default: 0` on an enum slot is a compile error. This prevents the silent-meaning-change bug where adding a fourth enum value or reordering the list shifts the integer meaning of existing defaults. Symbolic defaults survive the refactor; numeric defaults don't.

Deferred to v2: `u16`, signed integers, bounded strings (for heredoc terminators). None are needed for the motivating cases.

### 2.3 Slot predicates (read)

Add an optional `slot_when` field to `GrammarRule`:

```ts
export type SlotComparator =
  | boolean
  | number
  | string
  | { eq: boolean | number | string }
  | { ne: boolean | number | string }
  | { gt: number }
  | { lt: number }
  | { gte: number }
  | { lte: number };

export interface GrammarRule {
  // existing fields...
  slot_when?: Record<string, SlotComparator>;
}
```

Semantics: the rule fires only when **all** of the following hold:

1. The existing matcher (`match` / `range` / `match_within` / `any` / `boundary`) matches.
2. For every `(name, comparator)` entry in `slot_when`, the current value of the named slot satisfies the comparator.

Multiple keys in one `slot_when` object are a **conjunction** (logical AND). There is no built-in disjunction in v1 — use multiple rules with different `slot_when` blocks to express OR. The existing rule-evaluation model is **first-match-wins** (rules iterated in declaration order; the first whose matcher matches *and* whose `slot_when` passes fires), so ordered alternation is already expressible without any new syntax.

Two implementation consequences of `slot_when` inheriting first-match-wins semantics:

- Rules with `slot_when` are **not eligible** for the single-rule-per-char `char_maps` fast path used for unconditional rules. A per-state "predicate rules" list is tried in declaration order before falling through to the char_maps lookup. This is the only place the slot extension perturbs the hot path, and it only costs for rules that actually use `slot_when`.
- `gt` / `lt` / `gte` / `lte` are valid only on `u8` slots. Using a comparison operator on a `bool` slot or with a string argument on an enum slot is a compile error. Type-level narrowing to catch this in the type system (vs the compiler) is a later improvement.

**Names** must be qualified as `"owner_state.slot_name"` when the rule lives outside the slot's owning state. Inside the owning state, bare `"slot_name"` is allowed. The compiler validates both forms and errors on a missing or wrong owner prefix.

Shorthand: a bare value (`boolean | number | string`) is sugar for `{ eq: value }`.

### 2.4 Slot actions (write)

Add an optional `slot_set` field to `GrammarRule`:

```ts
export type SlotUpdate =
  | boolean
  | number
  | string
  | { set: boolean | number | string }
  | { inc: number }     // u8 only; wraps on overflow with compile-time warning
  | { dec: number }     // u8 only
  | "toggle";           // bool only

export interface GrammarRule {
  // existing fields...
  slot_set?: Record<string, SlotUpdate>;
}
```

Semantics: when the rule fires (predicates passed, matcher consumed), the updates in `slot_set` are applied to the named slots. Updates are applied **after** token emission and state transition, in a single pass (no ordering between slot updates within one rule).

**Names** follow the same qualification rule as `slot_when`: qualified (`"owner_state.slot_name"`) when the rule lives outside the owning state, bare inside. Cross-frame writes are therefore always visible syntactically — a reader scanning a rule can see at a glance that an ancestor's slot is being poked. This is the primary debuggability win of the whole scheme.

Shorthand: a bare value is sugar for `{ set: value }`.

### 2.5 DSL helpers

Add two `Partial<GrammarRule>` factories in `lib/core/src/dsl.ts`:

```ts
export const when_slots = (
  conditions: Record<string, SlotComparator>,
): Partial<GrammarRule> => ({ slot_when: conditions });

export const set_slots = (
  updates: Record<string, SlotUpdate>,
): Partial<GrammarRule> => ({ slot_set: updates });
```

Usage spreads the same way `enter` / `goto` / `leave` already do:

```ts
match(":", TOKENS.field_colon, {
  ...enter("type_annotation"),
  ...when_slots({ kind: "class" }),
  ...set_slots({ seen_field: true }),
})
```

---

## 3. Semantics

### 3.1 Lifetime

Every slot has exactly one live value at any time. The value lives in a flat `Uint8Array` indexed by global slot ID.

When state X (which declares slots S1, S2, ...) is **pushed**:

1. For each Si declared by X: push `(global_id_of_Si, current_value_of_Si)` onto a save stack.
2. For each Si: set its current value to its declared default, or to `0` if no default was declared. Slots without declared defaults are expected to be immediately overwritten by the pushing rule's `slot_set` (§3.5 enforces this at compile time), so the initial value is a placeholder that's guaranteed to be unused. Choosing `0` rather than a sentinel keeps the push path branchless.

When state X is **popped**:

1. For each Si declared by X (in reverse order): pop from the save stack, restore the value.

This gives classic dynamic-scoping semantics: inner pushes shadow, pops restore.

### 3.2 Visibility and naming

**Each slot name is declared exactly once** in a grammar. Two states cannot both declare a slot named `kind`. If you need two grammatically-distinct kind-tags, name them distinctly (`class_kind`, `tuple_kind`) or — more often — structure the grammar so one slot suffices.

This rules out shadowing, which is the single largest hazard of dynamic scoping. A refactor that wraps state X inside state Y, where Y already declares some slot S, produces a duplicate-declaration compile error rather than silently rebinding descendant reads. There is no "nearest frame wins" rule because there is never more than one frame that could win.

**Qualified vs unqualified names.** A slot has an owning state (the state that declares it). References to the slot from a rule:

- Inside the owning state itself: may be unqualified (`"slot_name"`).
- Anywhere else in the grammar: must be qualified as `"owner_state.slot_name"`.

Both forms compile to the same global slot ID. Qualification is a *readability and intent* requirement, not a semantic one. The benefit is that any cross-frame write — the spookiest kind of slot access — is visible at the site without having to look up where the slot lives. The compiler enforces the rule and errors on unqualified cross-frame access or on a qualified access where the named owner doesn't actually declare that slot.

**Visibility at runtime.** A rule in state Y may read or write slot S only when Y's owning state is guaranteed to be on the stack whenever Y is active. The compiler verifies this with a reachability analysis over the state graph (§5.3). If the analysis can't prove it, compilation fails with a clear message naming the offending rule and a reachable path where the owner isn't on the stack.

### 3.3 Probe interaction

Probe states (`mode: "probe"`) already snapshot position, stack, and token count on entry and restore them on fallback. Slots extend this with one snapshot and four explicit clauses.

- On **probe entry**: snapshot the current value of every slot (full `Uint8Array` copy — `slot_count` is small, this is cheap). v1 deliberately snapshots all slots rather than running a compile-time touched-slot analysis; see below.
- **Nested probes are not a concern.** The existing tokenizer does not support nested probes — `probe_entry` in `lib/core/src/tokenizer.ts:69-75` is a single optional variable, not a stack, and the "probe target reached while in probe state" path at `tokenizer.ts:269-292` updates the existing entry's resolved fields rather than allocating a new one. A single snapshot buffer is therefore sufficient. If a future change introduces nested probes, the snapshot must be promoted to a stack in lockstep.
- **Reads inside a probe** see live values, including writes made earlier in the same probe. Reads are never rolled back.
- **Writes inside a probe** are applied live to `slot_values` as they happen. They are visible to later reads *within the same probe*.
- On **probe success** (control transfers to the resolved state): writes made during the probe persist. The snapshot is discarded; nothing extra to do.
- On **probe fallback**: restore from the snapshot. The save stack is rewound to its probe-entry length, undoing any push/pop activity inside the probe with the same discipline `stack_ptr` already uses.

**Cross-probe communication is an anti-pattern.** If you find yourself wanting information from one probe's speculation to influence a later probe, declare the slot on a state that **encloses both probes** (so neither probe owns it, and neither snapshot will roll back a write from the other). Using a slot declared inside a probe as a cross-probe signal is wrong by construction — the write vanishes on fallback. The compiler cannot forbid this pattern without proving runtime behaviour, so it's a documented discipline, not an enforcement.

**On the "compile-time analysis determines which slots a probe touches" optimization** (in a previous draft). Honest characterization: the touched-slot set of a probe is the transitive closure over all states reachable from the probe, which is bounded but non-trivial to compute and maintain as the grammar evolves. v1 takes the cheap win and snapshots everything. If benchmarks ever show the snapshot cost mattering, v2 can replace the blanket snapshot with a per-probe touched-set, which is still statically computable.

### 3.4 Ruleset and include interaction

`include` splices rules into a state at compile time. An included rule can read/write slots just like an inline rule — the compiler resolves slot names globally, not per-ruleset.

Parameterized rulesets (`ParamType`) do not yet accept slot names as parameters. Deferred. For now, if you want a ruleset to branch on a slot, hard-code the slot name inside the ruleset — the slot value is still contextual because it depends on who pushed the enclosing state.

### 3.5 Compile-time validation

The compiler must reject:

- A rule that reads or writes a slot name that is not declared anywhere in the grammar.
- A rule in state Y that reads or writes a slot S whose owning state X is **not always** on the stack when Y is reachable. (See §5.3 for how this is computed.)
- **Two slot declarations with the same name anywhere in the grammar** (regardless of whether the declarations agree). Names are globally unique; fix by renaming.
- A cross-frame slot reference in a rule that omits the `"owner_state."` qualifier.
- A qualified reference `"X.slot"` where state `X` does not declare a slot named `slot`, or where `X` does declare it but is not guaranteed to be on the stack when the referring rule is active.
- A slot declaration with `values` whose length exceeds 256.
- A slot declaration where `default` is not representable in the declared type.
- A slot declaration with `values` where `default` is a number rather than one of the strings in `values`. Enum defaults must be by name.
- A `slot_set` on a `bool` slot that uses `{ inc }` / `{ dec }`, or on a `u8` that uses `"toggle"`.
- A `slot_when` comparator `{ gt }` / `{ lt }` / `{ gte }` / `{ lte }` on a `bool` slot, or with a string argument on any slot.
- **A rule that enters a state X, where X declares a slot S without a `default`, and the rule does not include `slot_set` covering S for the same rule.** This is the compile-time form of the "you must initialize the slot" requirement. For slots where there is no naturally-correct default, this check catches caller-side omissions before they cause silent miscoloring.

The compiler must warn on:

- `{ inc }` that could wrap past 255 (for any reachable rule sequence — a conservative approximation).
- A slot declared but never read, or read but never written outside its default.
- A state whose rules all gate on `slot_when: { kind: X }` for different constant values of some slot — a hint that the state should probably be split into two, see §9.5.

---

## 4. Runtime representation

Tokenizer state gains two arrays, both sized by the *compiled grammar*:

```ts
// number of distinct slot declarations in the grammar.
const SLOT_COUNT: number;

// current live value of each slot, indexed by global slot id.
const slot_values = new Uint8Array(SLOT_COUNT);

// save stack for on-pop restoration. Each entry is packed:
//   high byte = slot id, low byte = previous value.
// size = max sum-of-declared-slots across all grammar stacks; bounded by
// (max_stack_depth * max_slots_per_state), typically <= 256*4 = 1024.
const slot_saves = new Uint16Array(MAX_SLOT_SAVES);
let slot_saves_len = 0;

// parallel to state_stack: how many slot-save entries each frame contributed,
// so pop knows how many to restore. Bounded by slot_count (<= 65535), so u16 is safe.
const slot_save_counts = new Uint16Array(256); // parallel to state_stack
```

For probe support:

```ts
// snapshotted values, sized SLOT_COUNT.
const slot_probe_snapshot = new Uint8Array(SLOT_COUNT);
// snapshot of slot_saves_len at probe entry.
let slot_probe_saves_len = 0;
```

If the grammar declares no slots, `SLOT_COUNT = 0` and all of the above are zero-length arrays. The runtime has a compile-time-ish gate (via a dead-code-elimination-friendly shape) to skip the slot code entirely when `SLOT_COUNT === 0`.

### 4.1 Step-by-step runtime operations

All names below are suggestions; conform to existing style.

**Push state X** (executed by the existing push machinery plus the new slot step):

```ts
// existing:
state_stack[++stack_ptr] = X;
current_state = X;
// new:
const decls = slot_decls_for_state[X]; // precomputed: (slot_id, default)[]
let n = 0;
for (const [slot_id, default_value] of decls) {
  slot_saves[slot_saves_len++] = (slot_id << 8) | slot_values[slot_id];
  slot_values[slot_id] = default_value;
  n++;
}
slot_save_counts[stack_ptr] = n;
```

**Pop state X**:

```ts
// new:
let n = slot_save_counts[stack_ptr];
while (n-- > 0) {
  const entry = slot_saves[--slot_saves_len];
  slot_values[entry >> 8] = entry & 0xff;
}
// existing:
stack_ptr--;
current_state = state_stack[stack_ptr];
```

**Rule predicate evaluation**: after the existing character/keyword/range match succeeds, if the rule has a slot-predicate block (indicated by a bit in a parallel `Uint8Array` or a sentinel index into a `rule_slot_predicates` table), iterate through its (slot_id, op, value) entries and short-circuit-AND them against `slot_values`. If any fails, the rule does not fire; continue to the next rule.

**Rule action application**: after the rule fires and the existing token/state/exit actions run, apply any slot updates from a parallel `rule_slot_updates` table.

**Probe entry**:

```ts
slot_probe_snapshot.set(slot_values);
slot_probe_saves_len = slot_saves_len;
```

**Probe fallback**:

```ts
slot_values.set(slot_probe_snapshot);
slot_saves_len = slot_probe_saves_len;
```

---

## 5. Compilation strategy

Add two stages to `lib/core/src/compiler.ts` after state/token ID assignment (current stage 4) and before transition array population.

### 5.1 Stage 4.5 — slot ID assignment

Walk every state and collect slot declarations. Produce:

- `slot_id_of_name: Map<string, number>` — slot name → global slot id.
- `slot_type_of_id: Uint8Array(slot_count)` — 0 = bool, 1 = u8.
- `slot_default_of_id: Uint8Array(slot_count)`.
- `slot_values_of_id: Map<number, string[]> | null[]` — for enum slots.
- `slot_decls_for_state: Map<state_id, Array<[slot_id, default]>>` — used by runtime push.

Validate: collisions, type mismatches, values overflow, defaults out of range. Errors terminate compilation with a clear message.

### 5.2 Stage 4.6 — rule slot compilation

For each rule that has `slot_when` or `slot_set`:

- Convert `slot_when` entries to compact (slot_id, op_code, value) triples. Op codes: 0=eq, 1=ne, 2=gt, 3=lt, 4=gte, 5=lte. Values are already 0..255.
- Convert `slot_set` entries to compact (slot_id, op_code, value) triples. Op codes: 0=set, 1=inc, 2=dec, 3=toggle.

Store as:

- `rule_slot_predicate_offsets: Uint32Array` — indexed `(state_id * MAX_RULES + rule_idx)`, points into `rule_slot_predicates_flat: Uint8Array` or is `0xFFFFFFFF` when no predicates.
- `rule_slot_predicates_flat: Uint8Array` — packed triples (slot_id, op, value), length-prefixed per rule.
- Analogous structures for updates.

### 5.3 Stage 4.7 — visibility analysis

For every state Y and every slot S read or written by a rule in Y, verify the following property:

> On every path from a grammar root to Y, the most recent push of the state X that owns S has not been popped before Y is entered.

This is *not* a simple predecessor-intersection on the rule graph. The grammar is a pushdown system — rules push and pop states — and the property talks about the stack contents at the point Y is entered, not merely about which states were visited. A path that pushes X, later pops X, and then enters Y does not satisfy the property even though both states appear on the path.

The correct analysis walks the state transition graph while tracking, symbolically, whether each slot's owning state is currently on the stack. For every enter edge into Y, we need the set of possible "owner-on-stack" predicates to all be true; any path that reaches Y with the owner popped is a violation.

A clean implementation is pushdown-reachability on the state graph:

- Nodes: `(state_id, set_of_owners_currently_on_stack)`. The set is bounded by the slot count, so the node space is bounded.
- Edges: enter pushes an owner; leave pops; the goto-style `state: X, exit: true` pops and pushes.
- For each rule accessing slot S in state Y, check that every reachable `(Y, owners)` node has S's owner in `owners`.

Worst case is `O(states × 2^slots)`, pruned in practice by the sparsity of slot-declaring states. For grammars with tens of slots across hundreds of states this is still fast, but the algorithm is *more involved than a one-liner* and the implementation should be a small dedicated pass with its own tests.

On failure, the compiler should emit the offending rule, slot, and a reachable path that witnesses the violation ("enter class_body → enter member_body → leave member_body → enter Y reads member_body.kind").

### 5.4 Keep the existing transition pipeline unchanged

`transitions`, `char_maps`, `patterns`, `boundary_rules` all stay as they are. Slots are orthogonal metadata.

---

## 6. Required code changes (per file)

All paths relative to the repo root.

### `lib/core/src/types.ts`

- Add `SlotType`, `SlotDeclaration`, `SlotComparator`, `SlotUpdate` types.
- Add `slots?` to `GrammarState`.
- Add `slot_when?` and `slot_set?` to `GrammarRule`.
- Extend `CompiledGrammar` with: `slot_count: number`, `slot_type_of_id: Uint8Array`, `slot_default_of_id: Uint8Array`, `slot_enum_values: (string[] | null)[]`, `slot_decls_for_state: Map<number, number[]>` (flat: alternating slot_id, default), `rule_slot_predicate_offsets: Uint32Array`, `rule_slot_predicates_flat: Uint8Array`, `rule_slot_update_offsets: Uint32Array`, `rule_slot_updates_flat: Uint8Array`, plus a `slot_name_of_id: string[]` for introspection.

### `lib/core/src/compiler.ts`

- Add stages 4.5, 4.6, 4.7 from §5.
- Wire the new compiled artefacts into the returned `CompiledGrammar`.
- Add a validation helper for slot visibility (§5.3).
- Extend the existing parameterized-ruleset machinery to pass through `slot_when` / `slot_set` verbatim (no new param types).

### `lib/core/src/tokenizer.ts`

- Allocate `slot_values`, `slot_saves`, `slot_save_counts`, `slot_probe_snapshot` on tokenize entry, sized from the compiled grammar.
- Extend the push path to run the slot-save loop (§4.1).
- Extend the pop path similarly.
- Extend the rule-match inner loop: after the existing matcher succeeds, check `rule_slot_predicate_offsets[...]`; if nonzero, evaluate predicates and skip on failure.
- After the rule fires, apply updates via `rule_slot_update_offsets[...]`.
- Extend `ProbeEntry` with `slot_saves_len_at_entry`, plus a single snapshot buffer shared across the (single, non-nested) active probe.
- Extend the probe-fallback path with the slot-restore steps.

Gate all slot code behind `if (compiled.slot_count > 0)` so grammars without slots see zero overhead.

### `lib/core/src/dsl.ts`

- Add `when_slots` and `set_slots` factories.
- Add a small `slot_types` object for ergonomic re-export (`BOOL`, `U8`, `enum_slot(values: string[])`).

### `lib/core/src/introspector.ts`

- Extend `IntrospectorEvent` with an optional `slot_snapshot?: Record<string, number | boolean | string>` field, emitted on push/pop/rule-match events.
- In `GrammarMapper`, add methods to resolve slot IDs to names and to decode values back to their symbolic form when the slot has `values`.

### `lib/core/test/slots.test.ts` (new)

Unit tests covering:

- Declaration + default init on push, restore on pop.
- `slot_when` predicates (all comparators).
- `slot_set` actions (set, inc, dec, toggle, enum names).
- Probe snapshot + fallback restore.
- Nested pushes with shadowing.
- Compile errors: undeclared slots, type mismatches, visibility violations.

### `languages/javascript/src/grammar.ts`

- Replace the commented-out class-vs-interface-field reclassifier logic (currently at `reclassifiers.ts:104-134`) with lex-time slot-based classification.
- Split the object-literal / class body / interface body / tuple body confluence into one shared "member_body" state parameterized by a `kind` slot.
- See §8 for the worked example.

### `languages/javascript/src/reclassifiers.ts`

- Remove the commented-out block; lex-time handles it now.
- Keep everything else untouched.

### Nothing changes in `lib/core/src/reclassifier.ts`

Slots are a lex-time mechanism. The reclassifier remains a post-pass over the token stream. If we later want the reclassifier to observe lex-time slot traces, that's a separate proposal.

---

## 7. Performance

### 7.1 Runtime cost per operation

| Operation | With slots | Without slots |
|---|---|---|
| State push | +1 array read and 1 write per declared slot (usually 0-2) | 0 |
| State pop | +1 array read and 1 write per declared slot | 0 |
| Rule predicate eval (no slot conditions) | 0 | 0 |
| Rule predicate eval (with slot conditions) | +1-3 byte reads + compares | n/a |
| Rule action (no slot updates) | 0 | 0 |
| Rule action (with slot updates) | +1-3 byte writes | n/a |
| Probe entry | +Uint8Array copy (O(slot_count), typically ≤ 16 bytes) | +nothing |
| Probe fallback | +Uint8Array copy | +nothing |

For a grammar with 10 slots and average stack depth 8, a typical 1 MB tokenization:

- `slot_values` is 10 bytes, permanently cache-resident.
- Push/pop overhead: ≤ 2 array ops per frame change, say 100k frame changes → 200k integer ops. Negligible.
- Predicate evaluation: the rule-level "has slot predicate" check is a single branch on `rule_slot_predicate_offsets[...] !== 0`. For rules without predicates, one predictable branch. For rules with, a handful of byte compares.

Estimated overhead for a slot-heavy JS grammar: **well under 2%**. For a slot-free grammar: **0%**.

### 7.2 Memory

- Grammar-side (compiled): `slot_count * (1 + 1) + sum(rule_slot_*_flat)` bytes. For 10 slots and 50 slot-using rules with 2 triples each: 20 + 300 bytes = negligible.
- Runtime: `slot_count + max_stack_depth * max_slots_per_state * 2 + slot_count` = on the order of hundreds of bytes.

### 7.3 Incremental re-tokenization

Slots restore bit-for-bit on pop and can be byte-compared for equality. This gives you the same tree-sitter-style "reuse if byte-equal at boundary" discipline you already have with the stack, extended to slot state. If you ever build incremental re-lex, the persistence story is already correct.

---

## 8. Worked examples

### 8.1 Class body vs interface body

**Today.** The class-field-vs-interface-member rule is commented out at `languages/javascript/src/reclassifiers.ts:104-134` because the reclassifier can't tell "am I in a class body or an interface body" from the token stream alone — both contain `identifier : Type` sequences.

**With slots.** Declare `kind` on a shared `member_body` state with *no default* — there is no naturally-correct value; whichever parent pushes `member_body` is responsible for setting it. The compiler enforces this (§3.5): any rule that enters `member_body` must include `slot_set` for `member_body.kind`, else compilation fails. All references to `kind` from outside `member_body` use the qualified form `"member_body.kind"`.

```ts
// in grammar.ts
const member_body: GrammarState = {
  slots: {
    // no default: every pusher of member_body must set kind in the same rule.
    kind: { type: "u8", values: ["class", "interface"] },
  },
  rules: [
    // member name
    match(IDENT_START, TOKENS.identifier, enter("member_name")),
    match("}", TOKENS.punctuation, leave()),
    // ... other rules: whitespace, semicolons, etc.
  ],
};

const member_name: GrammarState = {
  rules: [
    // qualified "member_body.kind" because this rule is outside the owner.
    match(":", TOKENS.class_field_colon, {
      ...enter("type_annotation"),
      ...when_slots({ "member_body.kind": "class" }),
    }),
    match(":", TOKENS.interface_member_colon, {
      ...enter("type_annotation"),
      ...when_slots({ "member_body.kind": "interface" }),
    }),
    // fallthrough: method, property initializer, etc.
  ],
};
```

Both rules match `:`; predicates are evaluated in order, so the second only fires when the first's `slot_when` fails. Since the two rules emit different tokens, we need two — but only two, not two entire duplicated states.

The class body and interface body each push `member_body` and set `kind` in the same rule. Push happens before `slot_set` (§4.1), so by the time the write runs, `member_body` is on the stack and its `kind` slot exists:

```ts
class_body_open: {
  rules: [
    match("{", TOKENS.punctuation, {
      ...enter("member_body"),
      ...set_slots({ "member_body.kind": "class" }),
    }),
  ],
},
interface_body_open: {
  rules: [
    match("{", TOKENS.punctuation, {
      ...enter("member_body"),
      ...set_slots({ "member_body.kind": "interface" }),
    }),
  ],
},
```

Every cross-frame access is qualified. A reader scanning `class_body_open` can see at a glance that `member_body` is being poked, not some implicit nearest frame. The compiler checks that `member_body` is the actual owner of `kind`, that it is on the stack at the point of access (it is, by virtue of `enter("member_body")` happening first in the same rule), and — crucially — that the pusher *sets* `kind`, since `kind` has no default. If `interface_body_open` forgets the `slot_set`, compilation fails with a clear error rather than silently tagging interface members with whatever byte happened to be in the slot.

`member_body` is **one state**, not two. Adding a third context (type literal, tuple, mapped type) is one line of `set_slots({ "member_body.kind": "…" })` in the new parent's open rule plus one rule in `member_name` for the new token — not a duplicate state tree.

### 8.2 First-field vs subsequent-field in a class

Motivating case: you want the first field after a class opening to highlight differently (e.g., a visual accent for readability).

```ts
class_body: {
  slots: {
    seen_field: { type: "bool", default: false },
  },
  rules: [
    // first field: bool still false → emit "first_field" and flip the slot
    match(IDENT_START, TOKENS.first_field, {
      ...enter("member_name"),
      ...when_slots({ seen_field: false }),
      ...set_slots({ seen_field: true }),
    }),
    // subsequent fields: bool is true → this rule fires
    match(IDENT_START, TOKENS.subsequent_field, {
      ...enter("member_name"),
    }),
    // ... other rules
  ],
},
```

One detail worth naming because it's easy to get wrong: `seen_field` lives on `class_body`, not on `member_name`. When a field is parsed, `enter("member_name")` pushes `member_name`; when that state pops at the end of the field, `class_body` is still on the stack and `seen_field` retains its `true` value. If the slot were declared on `member_name` instead, popping would restore it to the pre-push value and every field would look like the first. Slots live with the state that *owns* them, not with the state that last wrote them.

No state explosion; the "first vs subsequent" distinction is a single bool.

### 8.3 Label nesting depth

For the task's explicit motivating case of "nested labelled statements where outer and inner highlight differently":

```ts
function_body: {
  slots: {
    label_depth: { type: "u8", default: 0 },
  },
  rules: [
    // match IDENT followed (via probe) by ':' followed by loop keyword
    // → label. Bump depth.
    match_label_rule({
      // when fires, bump depth
      ...set_slots({ label_depth: { inc: 1 } }),
      token: TOKENS.label,
      // if you want different token types per depth, gate on the current value:
    }),
    // ...
  ],
},
```

The same slot is readable from the `labelled_statement_body` state to produce different emphasis per nesting. If you don't care about different styling per depth, don't read the slot — it's free.

---

## 9. What slots don't do

Included explicitly so the scope is clear.

- **They don't replace the reclassifier.** Slots are lex-time. Post-pass pattern matching over token windows is still the right tool for cases where the disambiguating tokens come after the ambiguous one and don't affect tokenization flow (e.g., `foo` in `const foo = () => x` is a function, determined by looking ahead at `=>`).
- **They don't replace probes.** Probes are forward-looking bounded speculation on the character stream. Slots are lateral memory about where you are.
- **They don't carry symbol tables.** Slot values are numbers (0..255 for `u8`). You cannot track "names of typedefs" or any input-dependent set. This is a feature, not a bug — every modern IDE parser that handles TypeScript-scale ambiguity explicitly avoids symbol tables in the scanner.
- **They don't persist across state-machine resets.** There is no "global" escape hatch in v1. If you need one later, add `scope: "grammar"` as an opt-in on specific slot declarations.
- **They don't survive a full `tokenize()` exit.** Each call starts with defaults.
- **They can't be read from the reclassifier.** The reclassifier sees the token stream and nothing else. If you need slots there, emit the slot snapshot as an invisible meta-token (future extension, not in v1).

---

## 9.5. Guidance: when to reach for a slot vs a new state

Slots are a narrow escape hatch. The primary structural encoding of a grammar is still the state graph; slots exist for the specific cases where the state graph asks one question too many.

**Reach for a slot when the descendant doesn't care about the identity of the enclosing context, only about a tag or counter.** The class-vs-interface example qualifies: `member_body`'s rules are identical in shape, and only the emitted token names differ. The descendant state genuinely doesn't want to know "which kind of body am I inside" except as a one-bit discriminator for classification. This asymmetry — producer sets the tag, consumer reads it — is what slots are for.

**Reach for separate states when the rule sets genuinely differ.** If class bodies allow methods but interface bodies don't, the class body's rules are structurally different from the interface body's rules, and you want two states with different rule lists — not one shared state where half the rules are gated on `slot_when: { kind: "class" }`. The moment you find yourself writing more than one or two rules all gated on the same slot value, the state should probably be split.

**Anti-pattern: slots as a mixin system.** The tempting but wrong move is to use slots to fake inheritance across structurally-different contexts. "I'll declare ten flag slots on a base state and have children check them to decide which rules to fire." This reinvents the state graph badly: grammar behaviour becomes scattered across slot predicates instead of expressed in a readable state list, and the reachability analysis fights you because every rule is technically live from every state.

The rule of thumb, restated:

- Slots encode *which of these identical-shaped contexts am I in*.
- States encode *what rules apply here*.

If the answer is genuinely "both," you want a small number of states with at most a small number of slot-gated rules. The compiler's warning on §3.5 ("a state whose rules all gate on different constant values of some slot") is meant to catch this class of mistake before it spreads.

## 10. Backwards compatibility

**Source-level**: no change. Every existing grammar compiles and tokenizes identically; the new fields are all optional. `CompiledGrammar` gains fields, which is additive.

**Wire/cache**: if you cache compiled grammars to disk, bump the cache version; the new fields aren't in any existing cache.

**Tooling**: the existing introspector, grammar mapper, and debug template continue to work. Slot events are additive. The debug template at `packages/core/debug-grammar-template.js` gains one line to log slot snapshots on state transitions.

**Performance**: zero measurable change for grammars that don't use slots (verified by the `if (slot_count > 0)` gates and by the benchmark harness — see §12).

---

## 11. v1 scope vs later

### In v1

- `bool` and `u8` types, the latter with optional enum `values`.
- `slot_when` with `eq` / `ne` / `gt` / `lt` / `gte` / `lte`, plus bare-value sugar.
- `slot_set` with `set` / `inc` / `dec` / `toggle`, plus bare-value sugar.
- DSL helpers `when_slots` / `set_slots`.
- Probe snapshot & restore.
- Compile-time visibility validation.
- Introspector integration.
- JavaScript grammar migration for the class/interface case as a smoke test.

### Deferred

- `u16` and signed types.
- Bounded captured strings (for heredoc-style terminator matching).
- Global-scope slots (`scope: "grammar"`).
- Parameterized ruleset support for slot names (`ParamType: "slot"`).
- Reclassifier access to slot traces.
- Multi-slot atomic updates (currently each slot updates independently; could add a transactional form if a grammar ever needs one, but no motivating case yet).

### Explicitly not doing

- Symbol-table-shaped slots (sets of strings).
- Runtime slot declaration / mutation from host code.
- Slots that can hold pointers, functions, or any reference type.

---

## 12. Testing plan

1. **Unit tests** in `lib/core/test/slots.test.ts`: cover each spec rule explicitly, one test per semantic assertion.
2. **Integration tests**: run the existing JS test suite unchanged — it must pass with zero regressions after the slot-based class/interface migration.
3. **New JS tests** for the cases slots are supposed to fix: class field followed by another class field both highlight as class field (not one as class field, one as interface member); the same with interfaces; mixed class/interface in the same file.
4. **Benchmark regression**: run `pnpm bench` before and after. Acceptance criterion: <2% regression on grammars that use slots, <0.5% on grammars that don't.
5. **Probe interaction test**: construct a contrived grammar where a probe writes a slot and fails — verify the write is reverted.
6. **Compile-error tests**: every validation rule in §3.5 has a corresponding negative test.
7. **Introspector test**: slot state is visible in events.

---

## 13. Open design questions

Resolved decisions first, then the remaining opens.

**Resolved (locked in from review):**

- **Ordering of actions within a rule.** Slot updates run last, using values captured at rule-match time. `slot_set` values are literals, not expressions. No ordering ambiguity.
- **Shadowing / dynamic scoping.** Each slot name is declared exactly once in a grammar. Duplicate declarations are a compile error. Rules outside the owning state must use the qualified `"owner.slot"` form (§3.2).
- **Visibility violations.** Compile error in v1, not warn. Keep strict; relax later only if painful.
- **Probe interaction.** Full snapshot on entry; writes persist on success, revert on fallback; cross-probe communication via slots declared outside both probes, not inside either (§3.3). Touched-slot analysis deferred to v2.
- **Compound predicates.** AND is implicit via multi-key `slot_when` objects. OR via multiple rules. Explicit `any: [...]` deferred.
- **Field names.** `slot_when` / `slot_set` on rules; `when_slots` / `set_slots` DSL helpers.

**Still open:**

1. **Introspection granularity.** Emit a full slot snapshot on every event, or only on push/pop/rule-with-slot-action? Start with "every push/pop and every rule that has `slot_set`"; cheapest and covers debug needs. Revisit if introspector users want more.
2. **Enum values: strings or exported symbols?** Strings are simpler; symbols are typo-safer. For v1: strings, with a TypeScript utility type `SlotEnum<Values extends readonly string[]>` for autocomplete. Re-evaluate once real grammars are authored.

**Resolved in this round:**

- **Qualified-name syntax is dotted string** `"owner.slot"`. Template-literal types (e.g., a mapped type keyed on state name that constrains slot names per state) give per-state autocomplete in TypeScript without the verbosity of a structured form. The call-site cost of the structured form at every access was the wrong trade.

---

## 14. Acceptance criteria

Before merging:

- [ ] All existing tests pass without modification.
- [ ] New tests (§12) all pass.
- [ ] Benchmarks within budget (§12.4).
- [ ] The JS grammar's commented-out class/interface rule is either removed (subsumed by slots) or has a reason documented for staying out of scope.
- [ ] Compile errors for every validation case produce a clear message naming the offending state, rule index, and slot.
- [ ] Introspector shows slot state, symbolic values included for enums.
- [ ] No new public API surface beyond the additions listed in §2 and the two DSL factories.
