# Twinkleplop Grammar Definition API: Deep Dive Analysis

**Scope:** This document audits the public grammar definition API of twinkleplop — the JSON/JS `Grammar` object consumed by `compile()` in `packages/core/src/compiler.ts` — across six dimensions: **expressiveness**, **correctness**, **safety**, **ergonomics**, **documentation fidelity**, and **LLM-legibility**. Evidence is drawn from static analysis of `compiler.ts` (~580 lines), `tokenizer.ts` (~1100 lines), `types.ts`, `grammar.md`, `architecture.md`, and the four existing grammar packages plus all test files in `packages/core/src/`.

---

## Architecture Primer

Twinkleplop implements a **pushdown automaton**: a `Uint8Array(256)` state stack (`tokenizer.ts:50`) driven by a single `while (pos < len)` loop. Each iteration, the current character is looked up in a compiled character map (`charMaps: Uint8Array`, `tokenizer.ts:187`) to get a rule index, then that rule's action triple `[nextState, tokenType, stackOp]` is fetched from a flat transition array (`transitions: Uint8Array`, `tokenizer.ts:215–218`). State IDs and token type IDs are both stored as single bytes, with `255` used as the "no value" sentinel throughout.

Compilation (`compiler.ts:compile()`) transforms the JSON grammar through three pipeline stages: `normalizeGrammar()` (groups/extend resolution, lines 35–141) → `preprocessGrammar()` (match\_within expansion, lines 159–241) → transition table build (lines 243–579). The output is a `CompiledGrammar` with dense typed arrays: `transitions: Uint8Array(stateCount × 256 × 3)`, `charMaps: Uint8Array(stateCount × 128)`. State and token identifiers are 8-bit integers; the sentinel `255` means "no rule / no transition" at every lookup site.

---

## The Eight Capability Questions

### Q1 — Is the API flexible enough to highlight complex grammars reliably?

**Answer: Mostly yes, with one significant structural gap.**

The API handles real-world complexity: the CSS grammar (`packages/css/src/grammar.js`, ~1068 lines) covers selectors, property values, at-rules, pseudo-classes, CSS variables, and media queries across ~31 states. The JavaScript grammar (~400 lines shown, significantly more beyond) handles operator precedence, regex/division disambiguation, template literals, multiple number literal forms, and function detection via lookahead probe.

However, a **structural ceiling** exists. Context-switching via sideways transitions (`{ state: X, exit: true }`) is how JavaScript handles the regex/division ambiguity — and it requires duplicating all rules into three near-identical states (`main`, `division`, `regex_allow`). Each has ~50 rules. This is verbose, fragile, and breaks the DRY principle at scale. The `groups` + `extend` mechanism was designed to address rule reuse, but since `extend` only prepends inherited rules without any ability to selectively override, it cannot solve this three-way parallel-state problem.

A second gap: there is **no mechanism to embed a foreign language grammar**. JavaScript template literals that contain arbitrary JS expressions are handled in the existing grammar by manually recreating JS states inside `template_literal`, `template_expression`, etc. — a full manual language-within-language reconstruction. There is no `grammar: "javascript"` rule type.

**Key evidence:**
- `packages/javascript/src/grammar.js:146–346`: `main`, `division`, `regex_allow` states with extensive rule duplication
- `compiler.ts:120–121`: `extend` only prepends inherited rules; no override mechanism

---

### Q2 — Is the API capable of handling deep nesting?

**Answer: Yes, with an undocumented hard cap at 255 levels.**

The state stack is `new Uint8Array(256)` (`tokenizer.ts:50`). Each `state: "foo"` push stores the current state at `stateStack[stackPtr++]` (`tokenizer.ts:339`). The maximum depth before silent corruption is 256 stack writes, but since state IDs are bytes and 255 is the sentinel, effective capacity is 255 distinct push operations without ambiguity.

There is **no overflow guard in production builds.** `tokenizer.ts:115–118` contains an overflow guard (`if (stackPtr > 100) { pos = len; continue; }`) but this is inside an `if (INTROSPECTION && introspector)` block — it only executes in debug mode. In production, `stateStack[256]` is an out-of-bounds write to a `Uint8Array` — which V8 silently ignores (typed array OOB writes are no-ops in V8). The tokenizer would then continue with `stackPtr = 257`, and subsequent pops would read garbage from `stateStack[256]` (which returns 0, the first state index).

In practice, CSS and JS reach at most 5–8 levels of nesting, so 255 is comfortably safe for any realistic grammar.

**Key evidence:**
- `tokenizer.ts:50`: `const stateStack = new Uint8Array(256)`
- `tokenizer.ts:115–118`: overflow guard gated on `INTROSPECTION`
- `tokenizer.ts:339`: `stateStack[stackPtr++] = currentState`

---

### Q3 — Is the API capable of handling recursive constructs?

**Answer: Yes. Self-referencing states work cleanly.**

A state can push itself: `{ match: "(", token: "punctuation", state: "parentheses" }` inside the `parentheses` state creates correctly recursive nesting. The CSS `declaration` state uses this to handle nested `{}` blocks (`css/src/grammar.js:236–239`), and the `parentheses` and `function_args` states in CSS similarly push themselves for nested parentheses (`css/src/grammar.js:676–688`, `944–946`).

The recursion is bounded by the stack depth (255 levels). Since state names are resolved to IDs at compile time and forward references work (all states in the grammar are processed in one pass before the transition table is built), self-references and mutual recursion both compile cleanly.

The one subtle risk: a grammar with `exit: true` in every rule of a recursive state but no base case will pop faster than it pushes, eventually reaching an empty stack and silently staying in the root state (see C5 below).

**Key evidence:**
- `css/src/grammar.js:236–239`: `declaration` state pushing itself
- `css/src/grammar.js:676–688`: `parentheses` state pushing itself
- `compiler.ts:248–249`: all state names registered in `stateMap` before any rule processing

---

### Q4 — Can the API reuse prior definitions (for recursive/embedding cases)?

**Answer: Partially. Rule reuse works; cross-grammar embedding does not.**

The `groups` + `extend` mechanism composes states at compile time. A group is a named `GrammarState` defined in the top-level `groups` object; states reference it via `extend: "group_name"`. Groups can extend other groups, and circular dependencies are caught at compile time with a descriptive error (`compiler.ts:57–59`). The inherited rules are prepended to the state's own rules (`compiler.ts:121`), giving inherited rules higher priority.

However, this mechanism is **purely static composition** — groups are inlined into states at compile time. There is no runtime delegation, no lazy resolution, and no way to reference another compiled `Grammar` object.

The `Grammar` interface has no `inject` or `embed` field. To embed JavaScript inside a Markdown code fence, a grammar author must manually define all the JS states inside the Markdown grammar. This is what the JavaScript grammar does for template literals: `template_literal`, `template_expression`, `tmpl_main`, `tmpl_division`, `tmpl_regex_allow` etc. are hand-rolled JS-inside-template states, not a reference to the outer JS grammar. For a language like HTML (which must embed CSS in `<style>` and JS in `<script>`), this approach becomes unmanageable.

**Concrete evidence of the limit:**
- The JS grammar uses `template_literal` state which manually reimplements JS expression rules rather than re-entering the JS grammar
- `compiler.ts:120–121`: `rules: [...inheritedRules, ...cloneRules(rules)]` — prepend only, no override

---

### Q5 — Can the API ensure the state machine resolves all states without dangling references?

**Answer: No. State reference validation is completely absent.**

This is the most dangerous silent failure in the API. `compiler.ts:317` contains:

```javascript
nextState = stateMap.get(rule.state) || 255;
```

If `rule.state` (e.g., `"identifier_probe"`) is not present in `stateMap`, `stateMap.get(...)` returns `undefined`, and `undefined || 255` evaluates to `255` — the no-transition sentinel. The rule compiles successfully. At runtime:
- The character is matched (the rule fires)
- The token is emitted if `token` is set
- The state **never changes** — `transition === 255` is treated as "stay in current state"

The author observing incorrect highlighting output would have no way to distinguish this from a logic error in the grammar structure. There is no error, no warning, and no way to detect the silent failure short of running tests on the output.

The same pattern appears for probe fallback states (`compiler.ts:299–303`): if `state.fallback` references a non-existent state, `stateMap.get(state.fallback)` returns `undefined`, `probeFallbacks` gets no entry for the probe state, and the probe silently has no fallback — causing the behavior documented in M4 below.

**Key evidence:**
- `compiler.ts:317`: `nextState = stateMap.get(rule.state) || 255`
- `compiler.ts:299–303`: fallback lookup with no error on miss

---

### Q6 — Can the API move to a new state with AND without incrementing the cursor?

**Answer: Yes — both modes exist, but the documentation describes this incorrectly.**

The cursor advance behavior is:

| Rule type | Cursor behavior |
|-----------|----------------|
| Rule with `token` (any `stackOp`) | Advances to `pos + matchedLength` (`tokenizer.ts:321`) |
| Rule without `token`, `stackOp !== 2` (push or stay) | Advances by `matchedLength || 1` (`tokenizer.ts:329`) |
| Rule without `token`, `stackOp === 2`, sideways (`transition !== 255`), explicit pattern (`matchedLength > 0`) | Advances by `matchedLength` (`tokenizer.ts:332`) |
| Rule without `token`, `stackOp === 2`, no sideways OR `matchedLength === 0` | **Does not advance** (`tokenizer.ts:334`) |

The last row — "exit without token, no sideways target" — is what `{ any: true, exit: true }` exploits in the CSS and JS grammars. This pattern is the standard "end-of-identifier" mechanism: the identifier state uses `{ any: true, exit: true }` to pop back to the parent state without consuming the non-identifier character. The parent state then reprocesses it.

`grammar.md:51` states: *"If `token` is not present then the pointer will not be progressed and no token will be generated."* This is **incorrect** for all non-exit rules. A rule `{ match: "//", state: "comment" }` (no `token`) still advances the cursor by 2.

**Key evidence:**
- `tokenizer.ts:318–334`: complete cursor advance logic
- `grammar.md:51`: incorrect documentation

---

### Q7 — Can the parser backtrack, exit, and resume from a fixed point in truly ambiguous cases?

**Answer: Probe mode provides one-level forward-scan backtracking. True paired-delimiter backtracking is not possible.**

**What probe mode can do:** Save a checkpoint position, scan forward until a disambiguating token is found, then reset to the checkpoint and continue with the now-resolved state. CSS `probe_identifier` uses this to determine whether an identifier before `{` is a selector or a property (`css/src/grammar.js:371–388`). The reset is exact — both `pos` and `stackPtr` are restored (`tokenizer.ts:446–449`).

**What probe mode cannot do:**

1. **Check for a matching closer.** Markdown emphasis (`*text*` vs `x * y`) requires knowing whether there is a matching `*` ahead that is not separated by whitespace. Probe mode can detect the first disambiguating character it encounters, but cannot express "only succeed if you find `*` before finding whitespace." It would need to distinguish *matched* from *unmatched* occurrences of the closer.

2. **Nested probes with separate fallbacks.** If a probe state transitions to another probe state, the outer probe's entry is never replaced — the `probeEntry` variable is set once on entry and only cleared on exit. `tokenizer.ts:234` triggers probe resolution when `isInProbeState && !isTargetProbeState` — if both states are probe states, this condition is never true. The inner probe effectively runs inside the outer probe with no resolution path for the outer one.

3. **Cascade fallbacks.** A probe state has exactly one fallback (`state.fallback`, a single string). There is no way to express "if the first probe fails, try this interpretation; if that fails, try another."

4. **Negative lookahead.** There is no way to express "match X only if NOT followed by Y."

**Markdown emphasis as a case study:** The closest approximation would be a probe state that exits on `*` (success → emphasis state) or on whitespace (failure → operator state). This would work for `*text*` (finds `*` before whitespace) but fail for `text *in* text` (the scan before the first `*` would see whitespace and fallback to operator). A correct emphasis tokenizer requires PEG-style backtracking or a separate delimiter-pairing pass — neither of which the current probe model supports.

**Key evidence:**
- `tokenizer.ts:70`: `probeEntry: ProbeEntry | null` — single-entry tracking
- `tokenizer.ts:234`: probe resolution condition: `isInProbeState && !isTargetProbeState`
- `tokenizer.ts:443–481`: probe success reset
- `tokenizer.ts:524–554`: probe failure reset + `failedProbes` deduplication

---

### Q8 — How well can an LLM autonomously create grammar definitions?

**Score: 5/10.** The declarative format is genuinely readable, but documentation gaps are severe enough that a capable LLM following `grammar.md` alone would write broken grammars for non-trivial cases.

**What works for LLMs:**
- The `Grammar` / `GrammarState` / `GrammarRule` structure is clear and minimal
- `match`, `range`, `token`, `state`, `exit` cover the common 80% of cases
- Existing grammars (CSS, JS) serve as strong reference examples
- The `groups` + `extend` pattern is intuitive

**What trips up LLMs (documented gaps in `grammar.md`):**

| Feature | Documented? | Note |
|---------|-------------|------|
| `match_within` property names | **Wrong** — docs say `begin`/`end`, code uses `start`/`end` | Will write broken rules |
| `any: true` | Not documented | Missing a critical fallback mechanism |
| `boundary: true` | Not documented | Can't write keyword-safe grammars |
| Sideways transitions (`state + exit`) | Not documented | Will write broken state transitions |
| Cursor advance rules (no token) | Wrong — docs say cursor doesn't advance | Misunderstanding causes infinite loops |
| Character class constants (`DIGIT`, `LETTER`, etc.) | Not documented | Will use verbose `range` arrays instead |
| 255-state limit | Not documented | Will hit it unknowingly on complex grammars |
| `match_within` spawns hidden states | Not documented | Unexpected state count inflation |
| Probe mode `fallback` is mandatory | Not documented | Will create broken probe states |
| Nested probe limitation | Not documented | Will create subtly broken grammars |

An LLM using `grammar.md` as its sole reference would likely:
1. Write `{ match_within: { begin: "'", end: "'" } }` (wrong key — C1)
2. Forget `{ any: true, exit: true }` as the end-of-token pattern (undocumented)
3. Be confused about when the cursor advances for tokenless rules (M3)
4. Not know about `boundary: true` for keywords (undocumented)
5. Not know how to write sideways transitions (undocumented)

---

## Issues Registry

### Critical Issues

---

#### C1 — `match_within` API/docs mismatch (`begin` vs `start`)

**Location:** `grammar.md:44` vs `types.ts:14–18`, `compiler.ts:181`

**Evidence:**

`grammar.md:44` documents:
```json
{ "match_within": { "begin": "'", "end": "'", "escape": "\\" }, "token": "string" }
```

`types.ts:14–18` defines:
```typescript
match_within?: {
  start: string;
  end: string;
  escape?: string;
};
```

`compiler.ts:181`: `match: rule.match_within.start` — uses `start`.

**Impact:** Any grammar author following the documentation will write a rule using `begin` instead of `start`. The compiler processes it without error. `rule.match_within.start` evaluates to `undefined`, which becomes `match: undefined` in the generated state entry rule. This generates a state with no entry character — the state is created but never entered. The author gets no string highlighting and no error message.

**Proposed fix:**
1. Update `grammar.md` to use `start` (not `begin`).
2. Add a runtime check in `preprocessGrammar()`:
   ```typescript
   if ((rule.match_within as any).begin !== undefined) {
     throw new Error(
       `Grammar error in state "${stateName}" rule ${ruleIdx}: ` +
       `match_within uses "start" not "begin". ` +
       `Change { begin: "..." } to { start: "..." }.`
     );
   }
   ```

---

#### C2 — `multiline` property on `match_within` silently ignored

**Location:** `packages/javascript/src/grammar.js:125,130` vs `types.ts:14–18`

**Evidence:**

The JavaScript grammar defines strings as:
```javascript
const STRING_DOUBLE = {
  match_within: { start: '"', end: '"', escape: "\\", multiline: true },
  token: "string",
};
```

`types.ts` has no `multiline` field on `match_within`. The `preprocessGrammar()` function in `compiler.ts:181` only reads `rule.match_within.start`, `rule.match_within.end`, and `rule.match_within.escape` — `multiline` is never read.

The generated content state uses `range: [0, 127]` as its fallback rule (`compiler.ts:217–219`). Since `\n` (charCode 10) falls within 0–127, strings span newlines by default regardless of the `multiline` flag.

**Impact:** `multiline: true` has zero runtime effect. Grammar authors who expect `multiline: false` to prevent strings from spanning newlines will be surprised. The flag provides false comfort.

**Proposed fix (two options):**

*Option A (add semantics):* Add `multiline?: boolean` to `types.ts`. In `preprocessGrammar()`, when `multiline === false`, use `range: [32, 127]` (excludes control characters including `\n` at code 10) for the fallback rule. Default is `true` (current behavior).

*Option B (remove the flag):* Delete `multiline: true` from the JS grammar with a comment: "match_within content spans newlines by default." This is a one-line fix that eliminates the false expectation.

---

#### C3 — No state reference validation: typos compile silently to no-ops

**Location:** `compiler.ts:317`, `compiler.ts:299–303`

**Evidence:**

```typescript
// compiler.ts:315–317
if (rule.state && rule.exit) {
  nextState = stateMap.get(rule.state) || 255;
```

If `rule.state` is `"identifier_prbe"` (typo for `"identifier_probe"`), `stateMap.get("identifier_prbe")` returns `undefined`. `undefined || 255` = `255`, which is the no-transition sentinel. The grammar compiles. The token is emitted. The state never changes.

The same pattern at `compiler.ts:319–321` (push transitions) and at `compiler.ts:299–303` (probe fallbacks):
```typescript
if (state.fallback) {
  const fallbackStateId = stateMap.get(state.fallback);
  if (fallbackStateId !== undefined) {
    probeFallbacks.set(stateId, fallbackStateId);
  }
}
```
A typo in `state.fallback` silently creates a probe with no fallback entry.

**Impact:** Grammar debugging becomes extremely difficult. A single-character typo produces subtly wrong highlighting with no error. This is the most dangerous silent failure in the API.

**Proposed fix:** Replace the silent fallback with explicit validation in `compile()`:

```typescript
// After all states are processed, validate all state references
for (const [stateName, state] of Object.entries(processedGrammar.states)) {
  state.rules.forEach((rule, ruleIdx) => {
    if (rule.state && !stateMap.has(rule.state)) {
      throw new Error(
        `Grammar: unknown state reference "${rule.state}" ` +
        `in state "${stateName}" rule ${ruleIdx}`
      );
    }
  });
  if (state.mode === 'probe' && state.fallback && !stateMap.has(state.fallback)) {
    throw new Error(
      `Grammar: unknown fallback state "${state.fallback}" ` +
      `in probe state "${stateName}"`
    );
  }
}
```

---

#### C4 — Hard 255-state limit undocumented; silent corruption above limit

**Location:** `compiler.ts:267–268`, `compiler.ts:271–272`

**Evidence:**

```typescript
// compiler.ts:267–268
const maxRules = 256;
const transitions = new Uint8Array(stateNames.length * maxRules * 3);
transitions.fill(255);
```

State IDs are indices into this array and stored as bytes (values 0–255). The sentinel "no value" is `255`. A grammar with exactly 255 states assigns the last state ID `254` — still safe. A grammar with 256 states assigns ID `255` to the last state, which **collides with the sentinel**. Every transition table lookup that should return state 255 will instead appear as "no transition."

`match_within` rules each generate two hidden states (a content state and, if `escape` is specified, an escape state — `compiler.ts:177–224`). A grammar with 127 `match_within` rules with escapes would hit the limit from that alone, with zero states defined by the author.

**Impact:** Silent, position-dependent misparse. Very hard to debug — the symptom is that certain tokens stop working, but only when the 255th state is involved.

**Proposed fix:**

Immediate guard in `compile()`:
```typescript
if (stateNames.length > 254) {
  throw new Error(
    `Grammar exceeds state limit: ${stateNames.length} states ` +
    `(max 254, including states generated by match_within).`
  );
}
```

Long-term: upgrade `transitions` and `charMaps` from `Uint8Array` to `Uint16Array`. Change all `255` sentinels to `65535`. This removes the limit (up to 65534 states) at minimal performance cost — `Uint16Array` access patterns are identical.

---

#### C5 — `exit: true` on the root state silently does nothing

**Location:** `tokenizer.ts:393–409`

**Evidence:**

```typescript
// tokenizer.ts:393–409
} else if (stackOp === 2) {
  if (transition !== 255) {
    // Sideways transition — valid
    currentState = transition;
  } else if (stackPtr > 0) {
    // Regular exit: pop
    currentState = stateStack[--stackPtr];
  } else {
    // Can't pop from empty stack - stay in current state
    // This shouldn't normally happen in well-formed grammars
  }
}
```

When `exit: true` fires in the root state, `stackPtr` is 0 (nothing has been pushed). The `else` branch is taken — the tokenizer stays in the current state. The token is still emitted. There is no error, no warning, no indication that the exit was a no-op.

**Impact:** A grammar author who writes `exit: true` in the root state expecting it to terminate a match or transition to a parent context will see incorrect highlighting with no feedback.

**Proposed fix:** Add a compile-time warning for rules with `exit: true` in the grammar's first state and no sideways target:

```typescript
const rootStateName = Object.keys(processedGrammar.states)[0];
const rootState = processedGrammar.states[rootStateName];
rootState.rules.forEach((rule, ruleIdx) => {
  if (rule.exit && !rule.state) {
    console.warn(
      `Grammar warning: rule ${ruleIdx} in root state "${rootStateName}" ` +
      `has exit:true but there is no parent state to return to. ` +
      `This exit will be a no-op.`
    );
  }
});
```

---

### Moderate Issues

---

#### M1 — State duplication burden for contextual disambiguation

**Location:** `packages/javascript/src/grammar.js:146–346`

**Evidence:** The JavaScript grammar maintains three parallel states (`main`, `division`, `regex_allow`) that are nearly identical except in how they handle the `/` character:

- `main`: `/` begins a regex or division (ambiguous, initial state)
- `regex_allow`: `/` definitively begins a regex pattern
- `division`: `/` definitively is a division operator

Each state must independently list all operators, brackets, keywords, string literals, number literals, template literals, identifiers, and whitespace. Adding support for a new operator token type requires editing all three states.

This is not a grammar author error — it is an architectural limitation of the API. The `groups` + `extend` mechanism cannot solve it because it only supports prepending inherited rules, not selectively overriding one specific rule (`{ match: "/", ... }`) within an otherwise-shared rule set.

**Proposed fix — `override` in `extend`:**

Add `override?: GrammarRule[]` to `GrammarState`. In `normalizeGrammar()`, for each rule in `override`, replace the matching inherited rule by `match` equality:

```typescript
// In types.ts
interface GrammarState {
  rules: GrammarRule[];
  mode?: "probe" | "tokenise";
  fallback?: string;
  extend?: string | string[];
  override?: GrammarRule[];  // NEW: replace specific rules from extended group
}
```

Usage:
```javascript
groups: {
  js_common: { rules: [
    // ... all common rules including { match: "/", token: "ambiguous" }
  ]}
},
states: {
  division: {
    extend: "js_common",
    override: [{ match: "/", token: "operator" }]  // replace the "/" rule
  },
  regex_allow: {
    extend: "js_common",
    override: [{ match: "/", token: "regex", state: "regex_pattern" }]
  }
}
```

---

#### M2 — No cross-grammar language injection

**Location:** `types.ts` (absent), `grammar.md` (absent)

**Evidence:** The JavaScript `template_literal` state manually reimplements JS expression tokenization with ~150 lines of hand-rolled states (`tmpl_main`, `tmpl_division`, `tmpl_regex_allow`, `tmpl_template_literal`, etc.). For HTML grammars embedding CSS and JS, this approach requires maintaining three complete language implementations in one grammar file.

**Proposed fix — `grammar` property on `GrammarRule`:**

```typescript
// In types.ts
interface GrammarRule {
  // ... existing fields ...
  grammar?: string;          // ID of a pre-compiled grammar to delegate to
  grammar_end?: string;      // Token that ends the embedded language
}
```

The tokenizer would need a `grammars?: Map<string, CompiledGrammar>` parameter to `tokenize()`. When a rule with `grammar: "javascript"` fires, the tokenizer saves its current state and delegates character processing to the referenced grammar until `grammar_end` is matched.

This is a significant runtime change, but the API surface is minimal — one new optional rule property.

---

#### M3 — `grammar.md` incorrectly documents cursor advance behavior

**Location:** `grammar.md:51` vs `tokenizer.ts:318–334`

**Evidence:**

`grammar.md:51`:
> "If `token` is not present then the pointer will not be progressed and no token will be generated."

Actual behavior from `tokenizer.ts:318–334`:
- **Token emitted:** `pos = pos + matchedLength` (line 321) — cursor always advances
- **No token, `stackOp !== 2`:** `pos += matchedLength || 1` (line 329) — cursor advances
- **No token, `stackOp === 2`, sideways + explicit match:** `pos += matchedLength` (line 332) — cursor advances
- **No token, `stackOp === 2`, no sideways OR `matchedLength === 0`:** cursor does **not** advance (line 334)

The docs claim applies only to the last case — a rule with `exit: true` and no `state` target (a pure pop).

**Impact:** A grammar author who relies on the documented behavior for state transitions without tokens (`{ match: "//", state: "comment" }`) will be surprised that the cursor still advances past the matched text. This is actually the desired behavior in 99% of cases, but the misleading documentation could lead to authors inserting `token` properties where none are needed, or creating wrong rules to force non-advancement.

**Proposed fix:** Rewrite `grammar.md:51`:

> "A rule always consumes its matched characters, whether or not it emits a token. The one exception is a rule with `exit: true` and no `state` (a pure pop-to-parent): this does **not** advance the cursor, allowing the parent state to reprocess the current character. This is the mechanism used by `{ any: true, exit: true }` to detect the end of an identifier without consuming the first non-identifier character."

---

#### M4 — Probe state without `fallback` is not a compile-time error

**Location:** `compiler.ts:298–303`, `tokenizer.ts:524–554`

**Evidence:**

`compiler.ts:298–303`:
```typescript
if (state.fallback) {
  const fallbackStateId = stateMap.get(state.fallback);
  if (fallbackStateId !== undefined) {
    probeFallbacks.set(stateId, fallbackStateId);
  }
}
```
If `state.fallback` is absent or misspelled, no entry is added to `probeFallbacks`.

At runtime (`tokenizer.ts:524–554`), when the probe reaches EOF with no resolution:
```typescript
} else {
  // No fallback - probe failed, mark and reset
  const key = (probeEntry.pos << 16) | (probeEntry.state << 8) | probeEntry.ruleIdx;
  failedProbes.add(key);
  // Reset to entry point
  pos = probeEntry.pos;
  currentState = probeEntry.state;
  stackPtr = probeEntry.stackPtr;
  probeEntry = null;
  continue;
}
```

The probe is marked as failed. On the next iteration, `pos === probeEntry.pos` again (same position). The rule that entered the probe fires again — but now `failedProbes` contains its key, so it is skipped (`tokenizer.ts:162–174`). The character at `probeEntry.pos` is then processed by the next applicable rule in the parent state, or advanced past silently.

**Impact:** A probe with no fallback silently swallows the character that triggered the probe, producing incorrect highlighting without error.

**Proposed fix:** In `compile()`, after detecting `state.mode === 'probe'`, require `state.fallback`:

```typescript
if (state.mode === 'probe' && !state.fallback) {
  throw new Error(
    `Grammar: probe state "${stateName}" must have a "fallback" property. ` +
    `Probe states that reach EOF without resolving will fail silently otherwise.`
  );
}
```

---

### Minor Issues

---

#### m1 — Nested probes silently break: probe-to-probe transitions have undefined behavior

**Location:** `tokenizer.ts:234`, `tokenizer.ts:443`

**Evidence:**

Probe resolution triggers at `tokenizer.ts:234`:
```typescript
if (isInProbeState && probeEntry && !isTargetProbeState) {
  probeEntry.resolvedState = targetState;
}
```

`isTargetProbeState` checks if the transition target is itself a probe state. If it is, this `if` block is skipped — the probe is not resolved. Meanwhile, the tokenizer has entered the target probe state (another probe). The outer `probeEntry` is never cleared or replaced. The inner probe runs and, if it exits to a non-probe state, it triggers the outer probe's resolution logic on line 443 — but using the inner probe's exit state, not the outer probe's intended target. Stack restoration uses the outer `probeEntry.stackPtr`, which may be wrong for the inner probe's context.

**Proposed fix:**

Either:
- **Block at compile time:** Detect in `compile()` that a probe state's rules transition to another probe state, and throw.
- **Stack probeEntry:** Change `probeEntry` to a stack of `ProbeEntry` objects, allowing nested probes. This is a significant runtime change.

Blocking at compile time is simpler and safer:
```typescript
if (state.mode === 'probe') {
  state.rules.forEach((rule, ruleIdx) => {
    if (rule.state && processedGrammar.states[rule.state]?.mode === 'probe') {
      throw new Error(
        `Grammar: probe state "${stateName}" rule ${ruleIdx} ` +
        `transitions to another probe state "${rule.state}". ` +
        `Nested probes are not supported.`
      );
    }
  });
}
```

---

#### m2 — Character class constants undocumented in `grammar.md`

**Location:** `packages/core/src/constants.ts` (exported), `grammar.md` (absent)

**Evidence:** `constants.ts` exports: `ASCII`, `DIGIT`, `LETTER`, `LOWER`, `UPPER`, `ALNUM`, `SPACE`, `WORD`, `HEX`, `PRINT`, `PUNCT`, `CONTROL`. These are `symbol` values usable in the `match` property of a rule (`types.ts:8`: `match?: string | string[] | CharacterClassSymbol`). The compiler handles them at `compiler.ts:346–438` with correct character range expansion. None of these are mentioned in `grammar.md`.

**Impact:** Grammar authors use verbose `range: [["a","z"],["A","Z"],["0","9"]]` arrays when `ALNUM` would suffice. LLMs will never discover these symbols from `grammar.md` alone.

**Proposed fix:** Add a "Character Class Constants" section to `grammar.md` listing each constant, its character set, and an example.

---

#### m3 — Stack overflow guard absent from production builds

**Location:** `tokenizer.ts:115–118`

**Evidence:**

```typescript
// INTROSPECTION_START
if (INTROSPECTION && introspector) {
  // ...
  if (stackPtr > 100) {
    pos = len; continue;
  }
}
// INTROSPECTION_END
```

The guard is inside the `INTROSPECTION` block — dead in production. A grammar with a rule that pushes a state from within itself without a matching exit could push indefinitely until `stateStack[256]` is written, which V8 silently ignores. The tokenizer then continues with `stackPtr = 257, 258, ...` and would read `0` from any `stateStack[n > 255]`, which maps to the first state (index 0) — corrupting parent-state restores silently.

**Proposed fix:** Add a production guard before the push:
```typescript
if (stackOp === 1) {
  if (stackPtr >= 254) {
    // Stack overflow — abort tokenization of this input
    break;
  }
  stateStack[stackPtr++] = currentState;
  // ...
}
```

---

#### m4 — `extend` always prepends inherited rules; no way to append or override

**Location:** `compiler.ts:121`

**Evidence:**
```typescript
rules: [...inheritedRules, ...cloneRules(rules)]
```
Inherited rules have unconditional priority. If a group defines `{ range: ["a","z"], token: "identifier" }` and a state extending it wants to add a keyword check for `"set"` before the range matches, it cannot — the range rule in the inherited group will fire first.

**Proposed fix:** Add `extend_after?: string | string[]` to `GrammarState` for appending inherited rules at the end (lower priority):
```typescript
// Rules defined on the state take priority; then inherited rules
rules: [...cloneRules(rules), ...inheritedRules]
```

---

#### m5 — Initial state relies on `Object.keys()` insertion order

**Location:** `grammar.md:11`, `compiler.ts:247`

**Evidence:**

`grammar.md:11`:
> "The first state defined in the states object is implicitly the initial state."

`compiler.ts:247–249`:
```typescript
const stateNames = Object.keys(processedGrammar.states);
const stateMap = new Map<string, number>();
stateNames.forEach((name, idx) => stateMap.set(name, idx));
```

State index 0 (the initial state) is the first key returned by `Object.keys()`. In V8 and modern engines, string keys that are not array indices preserve insertion order. This works reliably in Node.js and all major browsers. However, it is a V8 implementation detail, not an ECMAScript guarantee for all platforms. A future runtime or transpiler that reorders keys alphabetically would silently change which state is the initial state.

**Proposed fix:** Add an explicit `initial?: string` field to the `Grammar` interface for specifying the entry state by name. Fall back to `Object.keys()[0]` if absent, but document the reliance on insertion order.

---

## Proposed API Additions

### A1 — `validateGrammar(grammar: Grammar): ValidationResult`

A new export from `packages/core/src/compiler.ts` that runs all compile-time checks without full compilation. Returns a `ValidationResult` with `errors` (array) and `warnings` (array). `compile()` calls this internally and throws on any error.

```typescript
// In types.ts
export interface ValidationError {
  type: 'UNKNOWN_STATE_REF' | 'PROBE_MISSING_FALLBACK' | 'NESTED_PROBE'
      | 'MATCH_WITHIN_USES_BEGIN' | 'STATE_LIMIT_EXCEEDED' | 'UNKNOWN_FALLBACK_REF';
  stateName: string;
  ruleIndex?: number;
  ref?: string;
  message: string;
}

export interface ValidationWarning {
  type: 'EXIT_IN_ROOT_STATE' | 'STATE_COUNT_NEAR_LIMIT' | 'MULTILINE_IGNORED';
  stateName: string;
  ruleIndex?: number;
  message: string;
}

export interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  isValid: boolean;
}
```

This validation pass would catch C1, C3, C4 (approaching limit), C5, M4, m1 at compile time.

### A2 — `multiline` support in `match_within`

Add `multiline?: boolean` to `match_within` type (`types.ts:14`). When `false`, the generated content state's fallback range excludes `\n` (charCode 10). Default: `true` (current behavior, backward compatible).

### A3 — `override` in `extend` (M1 mitigation)

Add `override?: GrammarRule[]` to `GrammarState`. In `normalizeGrammar()`, after prepending inherited rules, apply overrides by matching the `match` or `range` property:

```typescript
// In normalizeGrammar():
if (state.override) {
  for (const overrideRule of state.override) {
    const idx = resolvedRules.findIndex(r =>
      JSON.stringify(r.match) === JSON.stringify(overrideRule.match) ||
      JSON.stringify(r.range) === JSON.stringify(overrideRule.range)
    );
    if (idx !== -1) {
      resolvedRules[idx] = overrideRule;
    } else {
      resolvedRules.push(overrideRule);
    }
  }
}
```

### A4 — Upgrade to `Uint16Array` for 65535-state capacity (C4 long-term)

Replace `Uint8Array` with `Uint16Array` for `transitions`, `charMaps`, `fallbackTransitions`, and `probeMask`. Change all `255` sentinels to `65535`. Change `probeFallbacks` value type from `number` (byte) to `number` (uint16). The performance impact is negligible — `Uint16Array` has the same indexed access pattern, and modern engines handle both equally efficiently.

---

## LLM-Legibility Assessment

**Score: 5/10.** Suitable for simple grammars; unreliable for complex ones.

### Specific recommendations to improve to 8+/10:

1. **Fix the `match_within` documentation** (C1). This is the highest-impact single change — it turns a guaranteed failure into correct behavior.

2. **Add a "Complete Rule Reference" table** to `grammar.md`:

   | Property | Type | Required | Description | If omitted |
   |----------|------|----------|-------------|------------|
   | `match` | string \| string[] \| Symbol | One of `match`/`range`/`any` | Exact string(s) to match | — |
   | `range` | [string,string] \| [string,string][] | One of... | Character range(s) | — |
   | `any` | boolean | One of... | Matches any character | — |
   | `match_within` | object | One of... | Scans between start/end delimiters | — |
   | `token` | string | No | Token type to emit | No token emitted |
   | `state` | string | No | Push named state (or sideways if with `exit`) | No state change |
   | `exit` | boolean | No | Pop to parent state (set `state` for sideways) | No pop |
   | `boundary` | boolean | No | Require word boundary after match | No boundary check |

3. **Document cursor advance rules** explicitly (M3). A single sentence per case is enough.

4. **Document `{ any: true, exit: true }`** as the "end of token" pattern with a worked example.

5. **Document sideways transitions** (`state + exit`) with a worked example showing how they differ from a push followed by an immediate pop.

6. **Add a "Character Class Constants" section** (m2).

7. **Add a "Common Patterns" cookbook** with copy-pasteable templates for: string literals, single-line comments, keywords with boundary checking, nested delimiters, probe-based disambiguation.

---

## Test Case Reference

The companion test file `packages/core/src/grammar-api-edge-cases.test.ts` contains 10 diagnostic tests. Each test documents **current behavior** — they pass against the current implementation. Comments within each test show the **desired post-fix behavior**.

| Test | Issue | What it documents |
|------|-------|-------------------|
| Dangling state reference | C3 | Silent no-op when `state:` name is wrong |
| exit on root state | C5 | No-op when `stackPtr === 0` |
| State count limit | C4 | Behavior approaching and at 254-state limit |
| `match_within` begin vs start | C1 | `begin` key is silently ignored |
| `any: true` without token | M3 | Cursor still advances (contradicts docs) |
| Probe without fallback | M4 | Probe fails silently at EOF |
| Nested probe | m1 | Probe-to-probe transition behavior |
| Sideways transition cursor | Q6 | `any: true` sideways doesn't advance |
| `match_within` multiline | C2 | `multiline: true` has no effect |
| Markdown emphasis limitation | Q7 | Probe cannot pair delimiters |

---

## Summary Table

| ID | Severity | File | Compile-Detectable? | Impact | Fix |
|----|----------|------|---------------------|--------|-----|
| C1 | Critical | `grammar.md:44`, `compiler.ts:181` | Yes (with validation) | Broken string rules | Fix docs; add compile check for `begin` key |
| C2 | Critical | `javascript/src/grammar.js:125` | Yes (warn) | Confusing API surface | Add `multiline` semantics or remove the flag |
| C3 | Critical | `compiler.ts:317` | Yes | Silent wrong highlighting | Validate all state refs in `compile()` |
| C4 | Critical | `compiler.ts:267` | Yes (at 254+) | Silent tokenizer corruption | Guard at 254; upgrade to Uint16Array |
| C5 | Critical | `tokenizer.ts:407–409` | Yes (warn) | Silent no-op | Warn on `exit` in root state |
| M1 | Moderate | `javascript/src/grammar.js:146–346` | No | Grammar duplication debt | Add `override` to `extend` |
| M2 | Moderate | `types.ts` (absent) | No | Can't embed grammars | Add `grammar` rule type |
| M3 | Moderate | `grammar.md:51` | No | Incorrect mental model | Fix docs |
| M4 | Moderate | `compiler.ts:298` | Yes | Silent wrong highlighting | Require `fallback` on probe states |
| m1 | Minor | `tokenizer.ts:234` | Yes (with validation) | Undefined probe behavior | Block nested probes at compile time |
| m2 | Minor | `grammar.md` (absent) | No | Missing API surface for LLMs | Document constants |
| m3 | Minor | `tokenizer.ts:115` | No | Silent stack corruption | Add production guard |
| m4 | Minor | `compiler.ts:121` | No | Can't lower-priority extend | Add `extend_after` |
| m5 | Minor | `compiler.ts:247` | No | Fragile initial-state selection | Add `initial?: string` to `Grammar` |
