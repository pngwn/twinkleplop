# Twinkleplop Architecture Walkthrough

This document traces a source string end to end through the twinkleplop
pipeline and explains each stage in three tiers of detail. The tiers mirror
the library's own fidelity model: pick the depth you need.

1. **Deep walkthrough** — data structures, algorithms, invariants, automaton
   type, adjacency handling, citations.
2. **Mid fidelity** — up to 4 paragraphs per concept. No citations.
3. **Low fidelity** — one paragraph per concept.

An appendix traces the literal input `const x = 1` through all 12 stages.

## Pipeline overview

Twelve stages, each consuming the previous stage's output:

```
source string
  │
  ▼  (1) raw grammar            declarative Grammar object
  │
  ▼  (2) compiler               one-time lowering pass
  │
  ▼  (3) compiled grammar       typed arrays + maps
  │
  ▼  (4) input stream           charCodeAt pointer walk
  │
  ▼  (5) tokeniser              stack-augmented FSM
  │
  ▼  (6) raw token output       TokenizeResult, grammar-only
  │
  ▼  (7) correctness reclassifiers   always-on, shape/type_claim/embed
  │
  ▼  (8) 'correct' tokens       TokenizeResult, invariants upheld
  │
  ▼  (9) fidelity reclassifiers opt-in, tagged by produces
  │
  ▼  (10) high-fidelity tokens  TokenizeResult, maximally enriched
  │
  ▼  (11) html renderer         single-pass string builder
  │
  ▼  (12) output html           span-per-class, line-per-line
```

Three conceptual boundaries matter:

- **Compile time vs runtime.** Stages 1 and 2 run once per grammar; stage 3 is
  the handoff artifact. Stages 4 through 10 run on every tokenise call. Stage
  11 is pure serialisation.
- **Grammar tier vs reclassifier tier.** Stages 4 to 6 are the hot-path
  tokeniser and never perform multi-token lookahead. All cross-token analysis
  happens in stages 7 and 9, which are pure `TokenizeResult -> TokenizeResult`
  transforms.
- **Correctness vs fidelity.** Stage 7 contains passes the language cannot be
  correct without. Stage 9 contains opt-in enrichments the user can toggle
  wholesale or per distinction. This split is the library's key user-facing
  differentiator.

A shared data structure flows from stage 6 onward:

```ts
TokenizeResult = {
  tokens: Uint32Array,      // flat triplets [type_id, start, end]
  token_types: string[],    // type_id -> type name
}
```

Reclassifier transforms keep this shape. Positions always refer to the
original source string. Type ids always index into the current `token_types`
array, which reclassifiers may extend.

---

# Part 1 — Deep walkthrough

## 1. The raw grammar

A twinkleplop grammar is a JavaScript or TypeScript module that exports a
`Grammar` object. Grammar authors typically use DSL helpers from
`@twinkleplop/core` (`match`, `on`, `keyword`, `within`, `range`, `enter`,
`goto`, `leave`, `fallback`) that return plain `GrammarRule` literals; there
is no grammar-specific file format.

**Top-level shape** (`lib/core/src/types.ts:52-57`):

```ts
interface Grammar {
  name?: string;
  groups?: Record<string, GrammarState>;
  rulesets?: Record<string, Ruleset>;
  states: Record<string, GrammarState>;
}

interface GrammarState {
  include?: IncludeEntry | IncludeEntry[];
  rules?: GrammarRule[];
  mode?: "probe" | "tokenise";
  fallback?: string;
  extend?: string | string[];
}
```

The **first key** in `states` is the implicit initial state (state id 0 after
compilation). All other states are reachable by transitions.

**Rule matchers** (`lib/core/src/types.ts:14-32`). Each rule carries exactly
one matcher:

- `match: string | string[] | CharacterClassSymbol` — literal match. Arrays
  enable a single rule to accept multiple alternates; the compiler treats
  each alternate as a bucketed pattern. Character-class symbols (`DIGIT`,
  `LETTER`, `HEX`, `ALNUM`, `WORD`, etc., exported from
  `lib/core/src/constants.ts`) expand at compile time into the underlying
  ASCII ranges.
- `range: [start, end] | [start, end][]` — single-character range(s). Works
  over either string characters or raw char codes; multiple ranges compose
  with OR semantics.
- `match_within: { start, end, escape?, multiline? }` — bounded-construct
  sugar. At compile time this is lowered into an entry rule plus a generated
  state that chomps until `end`, with an optional escape sub-state.
- `any: boolean` — catch-all. Matches any character that no prior rule
  claimed. Typically paired with `token`, `state`, or `exit` to serve as a
  fallback transition out of a state.
- `boundary: boolean` — word-boundary guard. After the match succeeds, the
  next source char must not be an identifier continuation (see
  `is_identifier_char` in `tokenizer.ts:18-26`). Applied automatically by
  the `keyword()` helper to prevent `if` from matching inside `ifdef`.

**Rule actions**:

- `token: string` — emit a token of this type for the matched span.
- `state: string` — target state. Combined with `exit`, this encodes the
  stack operation (see below).
- `exit: true` — pop the stack, or, if `state` is also present, replace the
  current state at the same stack depth (a sideways transition).
- No action at all means "stay in this state without emitting"; used for
  whitespace that must not be tokenised but must be consumed.

The `(state, exit)` combination produces four stack operations:

| `state` set | `exit` set | Meaning                  | Stack op |
| ----------- | ---------- | ------------------------ | -------- |
| yes         | no         | push parent, descend     | push     |
| yes         | yes        | replace at current depth | sideways |
| no          | yes        | pop to parent            | pop      |
| no          | no         | stay                     | none     |

The helper factories encode these directly:

- `enter(s)` returns `{ state: s }`.
- `goto(s)` returns `{ state: s, exit: true }`.
- `leave()` returns `{ exit: true }`.

**Composition** happens through two mechanisms:

- `rulesets` are named `{ params?, include?, rules }` bundles that states
  consume via `include: ["ruleset_name", { set: "ruleset_name", with: {…} }]`.
  Parameterised rulesets (`params: { after_op: "state?" }`) substitute
  `$param` references at instantiation time and support optional params: a
  `null` binding strips the field rather than leaving it dangling.
- `groups` are base `GrammarState` objects that other states inherit from
  via `extend: "group_name"`. Inherited rules are **prepended**, not
  appended, giving inherited rules higher match priority.

Both mechanisms are flattened at compile time and checked for cycles. The
`include` semantics are first-match-wins, not override; authors intentionally
omit rules from shared rulesets when a state wants its own.

**State modes**:

- `tokenise` (default) — rules match, the cursor advances, tokens emit.
- `probe` — controlled forward scan. The tokeniser enters the state without
  emitting, scans ahead, and when the probe resolves into a non-probe state
  rewinds the cursor to the probe entry point and resumes tokenising in the
  resolved state. Used when a construct's role depends on a later
  disambiguator (CSS `a:hover foo` is either a selector chain or a property
  and value until `{` or `;` appears). See stage 5 for runtime details.
- `fallback: "state_name"` — named fallback target when the probe reaches
  EOF.

**Ambiguity handling**:

- _Maximal munch_ is compile-time: pattern buckets are sorted descending by
  length, so the runtime picks the longest viable match first without any
  explicit lookahead.
- _Contextual ambiguity_ uses probe mode.
- _Word boundaries_ use `boundary: true`.

**Adjacency concern.** A rule can only see the current character plus the
state on top of the stack; there is no multi-token lookahead. Cross-token
analysis (promoting `foo` to `function` because the next non-trivia token is
`(`) must live in the reclassifier tier. This is a deliberate boundary: it
keeps the hot path branch-free and concentrates "slow, clever" analysis in
the transform pipeline.

**Worked fragments**. `languages/json/src/grammar.ts` shows the minimum
form; `languages/javascript/src/grammar.ts` (the `KEYWORDS` array at line
31, through regex/division disambiguation) shows the full set of features
in anger.

## 2. The compiler

`compile()` in `lib/core/src/compiler.ts` transforms a declarative `Grammar`
into a `CompiledGrammar` of dense typed arrays. It runs once per grammar and
its output is what the hot-path tokeniser consumes. Roughly 970 lines,
structured as five sequential passes:

### Pass 1: include resolution

`resolve_includes` (`compiler.ts:211-373`) walks the `rulesets` map,
topologically sorts ruleset-to-ruleset include chains, errors on any cycle,
then produces a flat rule list per ruleset. For each state it processes the
`include` field: plain-string entries look up a flattened ruleset;
`{ set, with }` entries call `instantiate_ruleset` (lines 83-132), which
clones the ruleset's rules and substitutes `$param` references against the
`with` bindings. Null bindings strip the target field (e.g. drop `state`
and `exit` together). Resolved rules are prepended to the state's own rules.

### Pass 2: group normalisation

`normalize_grammar` (`compiler.ts:376-482`) resolves `extend` chains. Groups
can transitively extend other groups; cycles are caught. Inherited rules
are **prepended** to the state's own rules, giving them higher match
priority. Resolved groups are cached.

### Pass 3: `match_within` preprocessing

`preprocess_grammar` (`compiler.ts:500-594`) lowers every `match_within`
rule into an entry rule plus a generated state. For example:

```ts
match_within: { start: '"', end: '"', escape: "\\" }
```

becomes:

```ts
{ match: '"', token: "string", state: "__match_within_main_0" }
// generated state __match_within_main_0:
//   { match: "\\", token: "string", state: "__match_within_main_0_escape" }
//   { match: '"', token: "string", exit: true }
//   { range: [0, 127], token: "string" }
```

This keeps the hot path free of special delimiter machinery — everything is
a state transition.

### Pass 4: state and token indexing

Every surviving state is enumerated in definition order and assigned a
0-based id; the first state gets id 0 and is the root. Every unique token
type name across all rules is collected into `token_types: string[]` in
first-seen order and assigned a 0-based id. The state count is capped at
65534 because 65535 is the sentinel for "no target".

### Pass 5: transition and lookup-table generation

`compiler.ts:599-972` fills the runtime data structures:

- **Per-rule stack op**: derived from `(state, exit)` into `0` (stay), `1`
  (push), or `2` (pop or sideways). Target state id is 65535 for pure pop.
- **Token type id**: `token_types.indexOf(rule.token)` or 65535 if absent.
- **Transition triple**: stored at
  `transitions[((state_id * 256) + rule_idx) * 3..+3]` as
  `[next_state, token_type, stack_op]`. The `* 256` stride caps a state at
  256 rules; this is large enough for all extant grammars.
- **ASCII fast path**: for each matchable ASCII code in each state,
  `char_maps[state_id * 128 + char_code] = rule_idx`. Unset entries store
  the sentinel 65535. For single-char `match` or `range` rules this is the
  whole story; for multi-char patterns only the _first_ char is set here
  and the full pattern goes into the bucket map.
- **Multi-char patterns**: per state, bucketed by first char into
  `patterns: Map<state_id, Array<PatternInfo[] | null>>`. Each
  `PatternInfo = { codes: Uint16Array, length, rule_idx, boundary? }`.
  Inside each bucket, patterns are sorted **descending by length** —
  this is where maximal munch is encoded.
- **Non-ASCII**: `non_ascii_chars: Map<state_id, Record<char_code, rule_idx>>`.
  Object-map lookup rather than array indexing, acceptable because non-ASCII
  is rare and sparsity would waste memory in a dense array.
- **Fallback transitions**: for each state with an `any: true` rule,
  `fallback_transitions[state_id * 3..+3]` stores the state-wide fallback
  triple.
- **Probe state metadata**: `probe_states: Set<state_id>`,
  `probe_mask: Uint8Array` (0/1 per state for branch-free membership in the
  hot loop), `probe_fallbacks: Map<state_id, fallback_state_id>`.
- **Boundary rules**: `boundary_rules: Set<number>` keyed by
  `state_id * 256 + rule_idx`.

**Normalisation invariants**: every state reference is an integer in
`[0, 65534]`. Unknown references silently become 65535 and no-op at runtime
— a known safety gap that grammar authors work around by running unit tests.

## 3. The compiled grammar

The handoff artifact between compile time and runtime is
`CompiledGrammar` (`lib/core/src/types.ts:68-84`):

```ts
interface CompiledGrammar {
  states: Map<string, number>;
  transitions: Uint16Array;
  char_maps: Uint16Array;
  keywords: Map<string, number>;
  token_types: string[];
  patterns: Map<number, (PatternInfo[] | null)[]>;
  fallback_transitions: Uint16Array;
  non_ascii_chars: Map<number, Record<number, number>>;
  probe_states: Set<number>;
  probe_mask?: Uint8Array;
  probe_fallbacks?: Map<number, number>;
  boundary_rules?: Set<number>;
}
```

Each shape is chosen for the access pattern the runtime needs:

- **`Uint16Array` for `transitions` and `char_maps`** — contiguous, directly
  indexable by computed offset, cache-friendly. Sized for the state count
  at compile time; never reallocated.
- **`Map<number, …>` for `patterns` and `non_ascii_chars`** — sparsity per
  state means a dense per-state table would waste memory; the `Map`
  membership test is rare (once per state change, cached afterward).
- **`Uint8Array` for `probe_mask`** — single-byte read per iteration,
  branch-free "am I in a probe state" check.
- **`Set<number>` for `probe_states` and `boundary_rules`** — composite keys
  (`state_id * 256 + rule_idx`) collapse two-dimensional membership into a
  single hash lookup.

The `keywords` field is retained for external tooling (grammar introspector,
debug template) but the runtime does not consult it; keyword dispatch
happens via the regular pattern bucket + `boundary_rules` path.

**Invariant**: state 0 is always the root. `token_types[i]` is the canonical
name for token id `i`; reclassifiers may extend this array but never reorder
it.

## 4. The input stream

The tokeniser ingests a plain JavaScript string and walks it with
`input.charCodeAt(pos)` (`tokenizer.ts:157`). Two consequences:

- Char codes are **UTF-16 code units**, not Unicode code points. A character
  in the Basic Multilingual Plane (U+0000 to U+FFFF) is one code unit and
  classifies correctly. Astral-plane characters (U+10000+, including most
  emoji and extended math alphabets) arrive as a pair of surrogate code
  units; the tokeniser sees the first surrogate, fails to find a match, and
  falls through as an untokenised gap. This is an intentional tradeoff
  against the cost of a `codePointAt` path plus wider lookup tables.
- No substring is ever allocated in the hot path. `charCodeAt` is a direct
  memory read in V8; the tokeniser reads the input string linearly without
  producing intermediate objects.

**Runtime state** around the pointer (`tokenizer.ts:46-75`):

```ts
const len = input.length;
const tokens = new Uint32Array(len * 3); // pre-allocated worst case
let token_count = 0;

const state_stack = new Uint16Array(256); // fixed-depth stack
let stack_ptr = 0;
let current_state = 0;

let pos = 0;
let last_token_type = 65535;
let last_token_end = -1;

let probe_entry: ProbeEntry | null = null;
const failed_probes = new Set<number>();
```

Hot references (`state_buckets`, `char_map_base`, `trans_base3`,
`non_ascii_state`) are cached per-state so the per-character inner loop
does not repeat `patterns.get(current_state)` or recompute
`current_state * 128`.

The ASCII branch (`char < 128`) uses `char_maps` and the bucketed
`patterns`; the non-ASCII branch (`char >= 128`) uses `non_ascii_chars`.
Both converge on the same transition lookup path.

## 5. The tokeniser

The tokeniser is modelled as a **pushdown automaton** — a finite state
machine augmented with a state stack. Architecturally this is also
described as a statechart-style hierarchical state machine: a state can
"enter" child states by pushing, and children inherit the ability to
"exit" to a parent by popping. The runtime is a single `while (pos < len)`
loop (`tokenizer.ts:148-1080`); one iteration does constant work.

### One iteration, ASCII path

1. **Read the char** and check the probe mask:
   `is_in_probe_state = probe_mask[current_state]`.
2. **Classify to a rule index** in priority order:
   - Try multi-char patterns in `state_buckets[char]` (sorted longest
     first). Compare code-by-code; first hit wins.
   - If no pattern matched, read `char_maps[char_map_base + char]`.
   - 65535 still means "no match" — fall through to fallback_transitions
     or, for non-ASCII chars, to `non_ascii_chars`.
3. **Boundary check**. If the matched rule is in `boundary_rules`, peek at
   the char immediately after the match; if it is an identifier continuation
   (`[A-Za-z0-9_$]`), reject the match and try the next rule or fallback.
4. **Failed-probe dedup**. If `failed_probes` contains
   `(pos << 16) | (state << 8) | rule_idx`, skip this rule — it already
   lost a probe at this position.
5. **Fetch the transition triple**:
   `[next_state, token_type, stack_op] = transitions[trans_base3 + rule_idx * 3..+3]`.
6. **Token emission or skip**. If `!is_in_probe_state && token_type !== 65535`,
   emit the token via the coalescing write below and set `pos = new_end`.
   Otherwise advance `pos` by `matched_length || 1` and do not emit.
7. **Stack op**:
   - `0` (stay): `current_state = next_state` if the next_state is set.
   - `1` (push): `state_stack[stack_ptr++] = current_state; current_state = next_state`.
   - `2` (pop or sideways): if `next_state === 65535`, pop
     (`current_state = state_stack[--stack_ptr]`); else sideways
     (`current_state = next_state`, stack depth unchanged).
8. **Refresh per-state caches** whenever `current_state` changed.

The non-ASCII branch is the same loop with a different classifier step
(object-map lookup into `non_ascii_chars`) and no bucketed-pattern step.

### Token coalescing

On each emission the tokeniser checks `token_type === last_token_type &&
pos === last_token_end`. If both hold, it extends the previous triple in
place (`tokens[(token_count - 1) * 3 + 2] = new_end`) rather than appending.
This is why a 17-character identifier, scanned one char at a time, produces
a single token.

Coalescing is also why a grammar can afford to emit a per-character token
type (e.g. every digit individually) without paying for the token count:
the tokeniser folds adjacent runs for free.

### Probe mode

Probe mode is the mechanism for resolving contextual ambiguities that
require forward scanning. CSS is the canonical case: `a:hover one two` is
either a selector chain (if it ends in `{`) or a property plus value (if
it ends in `;` or `}`) and neither the current character nor any past
character can tell you which.

Entry (`tokenizer.ts:316-359`). When a transition targets a probe state
from a non-probe state, `probe_entry` is captured:

```ts
{ pos, entry_pos, state, stack_ptr, rule_idx, probe_state?, resolved_state?, resolved_pos? }
```

Token emission is suppressed for the duration. Rules inside the probe state
continue to match characters normally; they record their prospective
targets (`resolved_state`, `resolved_pos`) but do not commit.

Resolution (`tokenizer.ts:528-568`). When a rule inside the probe state
transitions to a **non-probe state**, the probe has succeeded:

- The cursor rewinds to `probe_entry.pos` (the position where the probe
  started).
- `current_state` is set to the resolved non-probe target.
- `probe_entry` is cleared.
- Tokenising resumes in the resolved state with token emission re-enabled.

Failure. If the probe reaches EOF, or if it hits a character with no match
in the probe state, one of two things happens:

- If the state's `fallback` is declared, the tokeniser calls
  `enter_probe_fallback` (`tokenizer.ts:579-620`): rewind to entry, enter
  the fallback state, exit probe mode.
- Otherwise: rewind to entry without a state change and mark the triggering
  rule failed at that (pos, state, rule) via `failed_probes`. The next
  iteration will skip the rule that just failed, letting a different rule
  try.

Nested probes are a documented limitation: if a probe rule targets another
probe state, the outer `probe_entry` persists and can go un-resolved.

### Sideways transitions and fallback

A sideways transition is `stack_op === 2` with `next_state !== 65535` —
replace the current state at the same stack depth. `languages/javascript`
uses this to switch between `regex_allow` and `division` without nesting;
JSON's `array` and `object` test grammars use it to model mutually
exclusive peers.

`any: true` rules compile into `fallback_transitions` rather than the
normal transition table: one triple per state, used whenever no rule
matches the current char.

### EOF and whitespace

Whitespace is **never tokenised** unless the grammar explicitly matches
it; otherwise it accumulates as a gap between tokens. EOF is just loop
exit — unterminated states leave tokens as-is (no implicit close). If
EOF hits during a probe, the fallback path above runs.

## 6. The raw token output

The tokeniser returns:

```ts
TokenizeResult = {
  tokens: Uint32Array,      // flat triplets [type_id, start, end]
  token_types: string[],    // type_id -> type name
}
```

Access pattern: `tokens[i*3]` is the type id, `tokens[i*3+1]` the start
offset, `tokens[i*3+2]` the end offset. The array is returned via
`tokens.subarray(0, token_count * 3)`, so unused capacity is trimmed
without copying.

**Invariants**:

- Tokens are in source order, non-overlapping.
- Adjacent same-type runs are already coalesced (see stage 5).
- There is no sentinel "gap" token; untokenised spans between tokens are
  implicit and reconstructed by the renderer.
- Type ids are valid indices into `token_types`. The sentinel 65535 is used
  internally as "no match" or "no target" but never appears in emitted
  tokens.

This is the output a consumer who imports the language package's `grammar`
export (as opposed to its `language` export) gets — zero reclassifier cost,
bare grammar semantics. Cross-token analysis (function-call detection,
PascalCase promotion, tagged-template embedding) cannot exist here.

## 7. The correctness reclassifiers

The reclassifier pipeline is a chain of pure transforms:

```ts
type Reclassifier = (input: string, result: TokenizeResult) => TokenizeResult;
```

The pipeline composer (`reclassify(pipeline)` in
`reclassifier.ts:1892-1937`) runs passes sequentially with two twists:

- **Cloning**. A mutating pass receives its own clones of `tokens` and
  `token_types` (the pipeline handles the clone; individual passes may then
  mutate their local copy in place). An empty pipeline returns the input
  reference unchanged, so `reclassify([])` is effectively free.
- **Claim batching**. Passes produced by `rewrite_types` (and marked with
  `__claim`) are _claim-producing_. Adjacent claim-producers in the pipeline
  are batched: they all run against the same base stream, their claims
  merge by precedence, the winning claims apply once. A mutating
  (non-claim) pass flushes the batch before running. This keeps precedence
  semantics correct while avoiding the cost of cloning between every type
  rewrite.

### Three layers

A `TaggedReclassifier` declares its layer (`types.ts:159`):

```ts
type ReclassifierLayer = "shape" | "type_claim" | "embed";
```

- **`shape`** passes modify the token stream's geometry — they merge
  tokens, split tokens, or extend token spans. Must run **first** because
  all downstream indices depend on a stable stream. Examples:
  `bash/extend_variables` (merge `$` plus trailing identifier into a single
  `variable` span), `bash/merge_numbers` (fold `0x` plus `ff` or `16#ff`
  into one `number`), `rust/extend_lifetime_over_type` (absorb the
  following type into the lifetime token).
- **`type_claim`** passes rewrite token types only, without changing the
  stream shape. They are the majority. They can run in claim mode (batched
  with precedence) or mutating mode. Examples: every fidelity promotion
  helper, TypeScript's `type_position_promoter`, Python's
  `type_alias_rules`, Rust's `reclassify_generics`.
- **`embed`** passes splice sub-language tokens into the host stream.
  They run **last** so that sub-tokenisation sees a fully classified host
  context. Examples: HTML hosting CSS and JavaScript via `embed_grammars`;
  JavaScript tagged templates via `embed_interleaved`.

The ordering is a strict, non-interleaved total order: shape, then
type_claim, then embed.

### The claim model

Claim data (`types.ts:115-119`):

```ts
interface Claim {
  token_idx: number;
  type_id: number;
  precedence: number;
}
```

A claim-producing reclassifier exposes `__claim(input, tokens, token_types)
-> Claim[]`. It may append new names to `token_types` but must not mutate
`tokens`; returned claims reference type ids valid for the (possibly
extended) `token_types` array. The pipeline runs all claim-producers in
the current batch, collects claims, merges them, then writes.

Merge (`merge_claims` in `reclassifier.ts:927-938`):

- Group claims by `token_idx`.
- For each group, keep the single claim with the highest `precedence`.
- Ties broken by insertion order (earlier pass wins).

Precedence is a fixed table reflecting specificity
(`reclassifier.ts:899-922`):

| Type        | Precedence |
| ----------- | ---------- |
| identifier  | 0          |
| punctuation | 5          |
| operator    | 5          |
| variable    | 10         |
| property    | 20         |
| function    | 30         |
| builtin     | 40         |
| type        | 45         |
| class_name  | 50         |
| lifetime    | 55         |
| keyword     | 70         |
| boolean     | 75         |
| null        | 75         |
| number      | 75         |
| comment     | 80         |
| string      | 80         |
| (default)   | 25         |

`class_name` beats `type` beats `function` beats `property` beats
`identifier`. This makes the order in which competing promoters appear
in the pipeline mostly commutative: the result depends on who has the
stronger claim, not who ran first.

### The three canonical transforms

**`rewrite_types(rules, options)`** (`reclassifier.ts:1183-1335`). The
workhorse of the `type_claim` layer. Rules are structured as:

```ts
interface RewriteRule {
  anchor: string | TypePatternSpec; // the token to rewrite
  before?: TokenPatternSpec; // optional backward-looking guard
  when?: TokenPatternSpec; // optional forward-looking guard
  rewrite: string | Record<string, string>;
}
```

Patterns are built with combinators (`type`, `seq`, `any_of`, `optional`,
`capture`, `balanced_parens`). The `when` pattern is compiled once to a
flat `Int32Array` bytecode program (`compile_pattern_bytecode`, lines
459-537) executed by `match_bytecode` (lines 738-872). Opcodes:
`OP_TYPE`, `OP_ALT`, `OP_JUMP`, `OP_COMMIT`, `OP_CAP_BEGIN`, `OP_CAP_END`,
`OP_BALANCED`, `OP_MATCH`.

Trivia skipping is built into the advancing opcodes only (`OP_TYPE`,
`OP_CAP_BEGIN`, `OP_BALANCED`). Control-flow opcodes do not skip, so
backtracking does not drift the cursor.

Rules are indexed by their anchor type id at compile time, giving O(1)
dispatch at each token position. The rewrite target is either the anchor
token (`rewrite: "function"`) or a map from capture name to target type,
in which case every token inside the captured span is retyped.

**`embed_grammars(mapping)`** (`reclassifier.ts:1387-1526`). Whole-token
sub-tokenisation. `EmbedMapping` keys are host token type names; values
are `LanguageFn` or `EmbedEntry` (with optional `trim_start`, `trim_end`,
`wrap_token`). For each host token whose type is in the mapping:

1. Slice the host source to the token range (minus trims).
2. Call the sub-language on the slice.
3. Merge the sub-result's `token_types` into the host's, deduplicating by
   name. The per-sub-language remap is cached with a `WeakMap` on the
   sub's `token_types` array.
4. Splice the sub tokens (with positions globally offset and type ids
   remapped) into the host stream in place of the original token.
5. Optionally emit `wrap_token` tokens covering the trimmed delimiter
   characters so backticks, `<script>` tags, etc. stay styled.

**`embed_interleaved(config)`** (`reclassifier.ts:1577-1857`). The
generic solution for **discontinuous** embedding where sub-language
content is broken by host-language "holes" that must be preserved
verbatim. The exemplar is a JS tagged template:

```js
html`<p class="${cls}">hi</p>`;
```

where the HTML sub-tokeniser must see a well-formed attribute value even
though `${cls}` is a JS interpolation. Config:

```ts
interface EmbedInterleavedConfig {
  scan: GroupScanFn;
  language?: LanguageFn;
  hole_char?: string; // default " "
}
```

The host supplies a `scan` callback that, given a start token index,
returns a `GroupDescriptor` (or `null`) listing the group's regions:

- `content` — source bytes copied into a virtual string.
- `hole` — source bytes replaced in the virtual string by
  placeholder chars of matching byte length, so the sub-language's
  state machine flows across the hole without seeing it.
- `synthetic` — a freshly minted token for a delimiter that is part of
  a larger host token but needs to appear separately in the output
  (e.g. the backtick of a tagged template).

Algorithm:

1. Build a single virtual source by concatenating content regions and
   filling hole regions with `hole_char`. Track a piecewise-linear map
   from virtual offsets back to real host offsets.
2. Call the sub-language on the virtual source **once**, so the
   sub-tokeniser has full state continuity.
3. Remap sub-token positions back to real host offsets.
4. Split any sub-token that straddles a content/hole boundary at the
   boundary, drop hole-internal pieces.
5. Emit regions in source order: content pieces as sub tokens, holes as
   the original host tokens passed through verbatim, synthetics as fresh
   tokens with the user-declared type name.

Nested cases (`` html`<style>${css`…`}</style>` ``) are handled by
**fixed-point iteration**: one pass peels one layer. Termination is
detected when a pass produces the same reference as its input. A safety
bound of 16 iterations guards pathological scanners.

### What "correctness" means

A pass is correctness if disabling it would produce output a reader would
call "wrong" — not merely "less detailed". Examples:

- `bash/extend_variables`: without it, `$foo` tokenises as `$` followed by
  `foo` (identifier), breaking every theme that colors variables.
- `rust/reclassify_generics`: disambiguates `<` and `>` as generics vs
  operators; without it every generic site is miscoloured.
- TypeScript's `type_position_promoter`: promotes identifiers appearing
  in type positions to `type`; without it, type names appear as plain
  identifiers.

These passes are tagged `always(reclassifier, layer)` with `produces: []`.
The empty `produces` array marks them as ungated — they run at every
fidelity setting.

## 8. The 'correct' output tokens

Still a `TokenizeResult` with the same shape as stage 6. What changed:

- Some tokens that the grammar emitted as bare `identifier` now carry
  richer types (`type`, `variable`, etc.) because correctness passes
  upgraded them.
- A few tokens have merged (shape-layer passes) or been split.
- `token_types` may have grown to include new names.

**Invariants upheld**: tokens still in source order, non-overlapping;
positions still indices into the original `input`; type ids still valid
within the current `token_types` array. The renderer can consume this
stream directly — stages 9 and 10 are optional.

The `create_language({ fidelity: "low" })` factory produces exactly this
stream: grammar plus always-on passes, no optional fidelity.

## 9. The fidelity reclassifiers

Stage 9 is where twinkleplop exposes **user-controllable fidelity** as a
first-class feature. Passes in this tier are tagged with
`tag(reclassifier, produces, layer)` where `produces: string[]` names the
token types the pass emits. Example:

```ts
tag(function_variable_rules, ["function"], "type_claim");
tag(class_name_promoter, ["class_name"], "type_claim");
```

### Gating

`select_pipeline(pipeline, fidelity)` (`reclassifier.ts:2014-2057`) filters
the language's tagged pipeline based on the user's fidelity setting:

- `"high"` (default) — every tagged pass runs.
- `"low"` — only passes tagged `always()` (empty `produces`) run. No
  optional fidelity. Grammar-level tokens only.
- `string[]` — an allowlist. A tagged pass runs if its `produces` array
  intersects the allowlist. Unknown names are silently ignored.

This is the "per distinction opt-in" surface that other highlighters do
not offer. A consumer who wants class names but not function-call
promotion passes `["class_name"]` and gets exactly that.

The restoration layer — things like boolean literal promotion and
call-site function promotion — sits in this stage tagged with non-empty
`produces`, so `"low"` strips them too. End-to-end measurements in
`docs/grammar-fidelity-analysis.md` put the full-fidelity cost at 5 to 15
percent of tokenise time. This is framed as the cost of the feature,
not waste.

### The three text-pattern helpers

From `lib/core/src/fidelity.ts`:

- **`promote_by_text_set(src, tgt, text_set)`**. Retype every token of
  type `src` whose source text is in the text set. Used for builtin type
  names (`list`, `dict`, `i32`, `u64`), boolean literals (`true`,
  `false`), language-specific reserved names. Allocates a new type id in
  `token_types` if `tgt` is new.
- **`promote_pascal_case(src, tgt)`**. Retype every token of type `src`
  whose first character is ASCII `A-Z`. Used for PascalCase class names
  in Python, Rust, etc. A single char-code compare per token.
- **`promote_function_calls(src, tgt, variants, options?)`**. Wraps
  `rewrite_types` with a pre-built set of patterns for the requested
  call shapes: `plain` (`foo(`), `macro` (`foo!(`), `generic_fn`
  (`foo<…>(`), `turbofish` (`foo::<…>(`). One rewrite_types pass, one
  `anchor: src`, `rewrite: tgt`, and a `when:` pattern assembled from
  the enabled variants.

### Stateful passes via TokenView and ScopeStack

Complex fidelity passes walk the token stream with helpers from
`lib/core/src/scan.ts`:

- `make_token_view(input, tokens, token_types, trivia)` returns a
  `TokenView` with `kind_of(i)`, `text_of(i)`, `is_trivia(i)`,
  `next_non_trivia(from)`, `prev_non_trivia(from)`. Trivia defaults to
  `["comment"]` and the implementation takes a fast path when only one
  trivia type is configured.
- `make_scope_stack<T>()` returns a `ScopeStack<T>` with `push(bracket,
data)`, `pop()`, `top()`, and live `paren_depth`, `brace_depth`,
  `bracket_depth` counters. The scope entry stores bracket kind plus a
  caller-defined `data` object. The tokeniser coalesces runs of same-kind
  punctuation into one token, so callers walk the token text char by
  char and call push or pop per character to keep depths in sync.

Rust's `reclassify_generics` uses `TokenView` for the seven-way
`is_type_position` test. JavaScript's property-scope claimer uses
`ScopeStack` to track whether each `{` opened a class body, interface,
or object literal.

### Embedded-language upgrades

`embed_grammars` and `embed_interleaved` are themselves tagged passes in
the `embed` layer. A consumer who passes `fidelity: "low"` gets no
sub-tokenisation; `<script>` blocks stay as raw content tokens and
`html`` `<p>` `` tagged templates stay as plain template strings. This is
deliberately tied to the fidelity surface: sub-tokenisation is high-value
but expensive, and some consumers genuinely do not want it (e.g., when
rendering minified output where embedded JS would add visual noise).

## 10. The high-fidelity output tokens

The final token stream with every opt-in pass applied. Still a
`TokenizeResult` — the renderer has no idea stages 7 to 10 happened.

Changes relative to stage 8:

- Function variables, interface members, property names, class names, and
  other context-dependent distinctions are now typed.
- Sub-language tokens are inline in the host stream with merged type ids.
- Tagged templates carry their sub-language tokens interleaved with the
  preserved interpolation holes.

This is what `create_language()` (no options) or
`create_language({ fidelity: "high" })` yields. Most consumers use this
tier via the language package's `language` export.

## 11. The HTML renderer

`to_html(input, token_result, options)` in `lib/core/src/generator.ts`
(167 lines). Pure string builder: one forward walk of tokens plus the
original input, pushing HTML chunks into an `out: string[]` and joining
at the end.

**Output shell**:

```html
<pre class="twinkleplop"><code>
  <span class="l">… line contents …</span>
  <span class="l">… line contents …</span>
</code></pre>
```

with the class name configurable via `options.class_name` and optional
line numbers (`<span class="ln">N</span>` prepended to each `l` if
`options.line_numbers`).

**Algorithm** (`generator.ts:66-77`):

```ts
let last_end = 0;
for (let i = 0; i < tokens.length; i += 3) {
  const cls = token_types[tokens[i]];
  const start = tokens[i + 1];
  const end = tokens[i + 2];
  if (start > last_end) emit_range(last_end, start, null);
  emit_range(start, end, cls);
  last_end = end;
}
if (last_end < input.length) emit_range(last_end, input.length, null);
```

Two observations:

- **Gaps are raw text, not spans**. When `start > last_end`, the renderer
  emits the gap with class `null` — no wrapping `<span>`. Whitespace and
  any character the grammar did not tokenise survives as literal text.
  This is what makes copy-paste work: browsers treat the content as text,
  not markup.
- **Span coalescing on the output side**. `ensure_span(cls)` (lines
  36-43) only opens a new `<span class="tok X">` if the class actually
  changed. Two adjacent tokens of the same type share one span element.
  Combined with the tokeniser's coalescing (stage 5), this means a run
  of identifier tokens produces one span, not N.

**Newlines** (`generator.ts:45-64`). A newline inside a token or gap is
not treated like any other character:

1. Emit the chunk up to the newline inside the currently-open span, if
   any.
2. Close the span.
3. Push `</span>\n` (closing the current `<span class="l">` line
   wrapper).
4. Open the next `<span class="l">` — with an optional
   `<span class="ln">N</span>` if line numbers are on.
5. Re-open the token span on the new line so the token continues
   styled.

The result is one `<span class="l">` per source line, no matter how
many tokens a line contains or whether a token straddles a line.

**Escaping**. A dense 128-entry `ESCAPE_TABLE` maps `& < > " '` to their
entities; everything else is identity. `escape_substring_optimized`
scans the range first and, if no escape chars are present, returns the
substring unchanged. Most source code has no HTML-escapable characters,
so this is the common path.

**Class names**. The `<span>` class is literally
`tok <token_type_name>`, so the theme CSS selector is
`.twinkleplop .keyword { color: var(--twp-keyword); }`. Adding a type
never requires touching the renderer — themes just need to ship another
CSS rule. Themes live in separate packages (e.g. `lib/theme-github`) and
typically compile a palette object to CSS custom properties via a small
build script.

## 12. The output HTML

The final artifact is a single string of this shape:

```html
<pre class="twinkleplop"><code>
<span class="l"><span class="tok keyword">const</span> <span class="tok identifier">x</span> <span class="tok operator">=</span> <span class="tok number">1</span></span>
</code></pre>
```

(Actual output is one line with no indentation; the above is wrapped for
legibility.)

**Properties**:

- **One `<span class="l">` per source line**. Enables line numbering,
  per-line hover, and range-based styling without any JavaScript.
- **One `<span class="tok TYPE">` per contiguous-same-type run** — not
  per token. Two adjacent tokens of the same type share a span.
- **Gaps are raw text** — whitespace outside spans survives verbatim,
  which is critical for copy-paste and for CSS `white-space: pre`
  behaviour.
- **Type-name-to-CSS class mapping is direct**: a theme simply selects
  `.twinkleplop .keyword`. No indirection, no Map lookup at render time.
- **HTML-escaped for `& < > " '`**; everything else emitted verbatim.

The consumer embeds this string into their page, applies a theme
stylesheet, and is done. There is no runtime component — everything is
pre-rendered.

---

# Part 2 — Mid fidelity (≤ 4 paragraphs per concept)

## 1. The raw grammar

A twinkleplop grammar is a JavaScript module that exports a plain `Grammar`
object. The object has two required halves: a top-level `name` and a
`states` map whose first entry is the root state. Each state owns an array
of rules and, optionally, a `mode` flag ("tokenise" or "probe"), a named
`fallback` target for probes reaching EOF, and `extend`/`include` fields
for composition.

Each rule carries exactly one matcher — `match` (literal or literal array),
`range` (character range), `match_within` (delimited construct sugar), or
`any` (catch-all) — plus any combination of three actions: `token` to emit,
`state` to change state, `exit` to pop. The `boundary` flag adds a
word-boundary guard for keywords. Character-class symbols like `DIGIT` and
`LETTER` stand in for common ranges and expand at compile time.

Composition uses two orthogonal mechanisms. `rulesets` are named rule
bundles a state can `include`, with optional parameters: an include of
`{ set: "operators", with: { after_op: "main" } }` substitutes `$after_op`
references in the ruleset's rules. `groups` are base `GrammarState` objects
that other states inherit from via `extend`. In both cases inherited rules
are prepended (higher priority), and both mechanisms are checked for cycles
at compile time.

Ambiguity is handled in two ways. Maximal munch is resolved at compile time
by sorting pattern buckets descending by length, so the runtime's first
match is always the longest. Contextual ambiguity — where a construct's
role depends on a later character — uses probe mode: the tokeniser enters
a probe state without emitting, scans ahead, and when the probe resolves
into a non-probe state rewinds the cursor and resumes in the resolved
state. Anything that needs multi-token lookahead belongs in the
reclassifier tier, not the grammar.

## 2. The compiler

Compilation is a one-time lowering pass that runs when a grammar module
loads. It turns the declarative `Grammar` into dense typed arrays and
maps optimised for the hot-path tokeniser. The whole thing lives in
`compiler.ts` and runs as five sequential passes, each normalising the
grammar further before the next one fires.

Pass 1 resolves `include` references by topologically sorting ruleset
dependencies, erroring on cycles, and flattening each ruleset into a list
of rules. Parameterised rulesets are instantiated per-state against the
provided `with` bindings. Pass 2 resolves `extend` chains for state
inheritance. Pass 3 expands `match_within` rules into entry rules plus
generated states that chomp until the end delimiter, keeping the tokeniser
free of special delimiter logic.

Pass 4 assigns integer ids: state ids in definition order (root = 0, cap
at 65534 because 65535 is the sentinel) and token type ids in first-seen
order. Pass 5 fills the runtime lookup structures: `char_maps` for
single-char ASCII matches, bucketed `patterns` for multi-char matches
(sorted descending by length — this is where maximal munch lives),
`non_ascii_chars` for Unicode fallback, `transitions` for
`[next_state, token_type, stack_op]` triples, `fallback_transitions` for
`any: true` rules, plus `probe_states`, `probe_mask`, `probe_fallbacks`,
and `boundary_rules`.

The indexing schemes are computed offsets, not property lookups:
`transitions[((state * 256) + rule) * 3]` and
`char_maps[state * 128 + char]`. The stride constants (256 rules per
state, 128 ASCII chars) are comfortably larger than any real grammar uses.
The compiler's only known safety gap is silently turning unknown state
references into the no-op sentinel 65535 rather than erroring.

## 3. The compiled grammar

The handoff artifact is a `CompiledGrammar` struct of typed arrays and
maps. There are no strings in the hot path — every identifier has been
collapsed to an integer. The struct is immutable at runtime; a grammar
compiles once, tokenises many times.

Each field's shape matches its access pattern. `Uint16Array` for
transitions and char_maps because they are densely indexed by computed
offset. `Map<number, …>` for patterns and non_ascii_chars because those
are sparse per state and a dense table would waste memory. `Uint8Array`
for probe_mask so the "am I in a probe state" check is a single byte read
per iteration. `Set<number>` for boundary_rules with a composite key
(`state * 256 + rule`) so membership is one hash lookup.

State 0 is always the root. `token_types[i]` maps a type id to its
canonical name; reclassifiers may append to this array but never reorder
it. The `keywords` field is kept for tooling — grammar introspectors and
the debug template use it — but the runtime does not consult it.

## 4. The input stream

The tokeniser reads the source as a plain JavaScript string via
`input.charCodeAt(pos)`. Char codes are UTF-16 code units, not Unicode
code points. BMP characters (U+0000 to U+FFFF) classify correctly; astral
characters show up as surrogate pairs, fail to match, and fall through as
gaps — a deliberate simplicity tradeoff.

Runtime state around the pointer is fixed-size and pre-allocated. The
tokens output is `Uint32Array(len * 3)` sized for the worst case (one
token per char); the state stack is `Uint16Array(256)`; the pointer is
one `pos` integer; probe bookkeeping is one optional `ProbeEntry` plus a
`Set<number>` for failed-probe dedup.

No substring is ever allocated in the hot path. `charCodeAt` is a direct
memory read. Per-state hot references — `state_buckets`, `char_map_base`,
`trans_base3`, `non_ascii_state` — are cached on every state change so
the inner loop does not repeat `Map.get` or `state * 128`.

ASCII (`char < 128`) is the fast path: bucketed pattern match, then
`char_maps` lookup. Non-ASCII is the slow path: object-map lookup into
`non_ascii_chars`. Both converge on the same transition table and the
same emission logic.

## 5. The tokeniser

The tokeniser is a pushdown automaton: a finite state machine plus a
state stack. The same structure is sometimes described as a
statechart-style hierarchical machine, because pushing a child state
inherits the ability to pop back to a parent. The runtime is a single
`while (pos < len)` loop that does constant work per character.

Each iteration: classify the current char to a rule index (first the
sorted multi-char pattern buckets, then `char_maps`, then non-ASCII map,
then fallback_transitions); apply a boundary check if the rule needs one;
skip the rule if it has failed a probe at this position; fetch the
transition triple `[next_state, token_type, stack_op]`; emit a token if
this is not probe mode and the rule has a type; apply the stack op
(push, pop, sideways, or stay); refresh the per-state hot caches if the
state changed.

Adjacent tokens are handled in two places. Token coalescing merges the
current emission with the previous one when they share a type and the
current start equals the previous end — so a long identifier scanned one
char at a time produces one token. Sideways transitions let a state
replace itself at the same stack depth, used for sibling states like JS
`regex_allow` and `division`. Whitespace is never tokenised unless the
grammar explicitly matches it; gaps emerge naturally.

Probe mode implements controlled forward scanning for contextual
ambiguity. Entering a probe state snapshots `(pos, state, stack_ptr)`
and suppresses emission. When a rule inside the probe transitions into
a non-probe state, the probe has succeeded: the cursor rewinds to the
snapshot, the target state takes over, emission resumes. On EOF or
unmatched char, the probe uses the state's named fallback if declared,
otherwise rewinds and marks the rule failed in `failed_probes` so the
next attempt at the same position tries a different rule. Nested probes
are not supported.

## 6. The raw token output

The tokeniser returns a `TokenizeResult` with two fields. `tokens` is a
`Uint32Array` of flat triplets: type id, start offset, end offset.
`token_types` is a string array mapping type ids to canonical names.
Access is index arithmetic: `tokens[i*3]`, `tokens[i*3+1]`, `tokens[i*3+2]`.

Tokens are in source order and non-overlapping. Adjacent same-type runs
are already coalesced so the array is as short as it can be. There is no
sentinel "gap" token; the renderer reconstructs gaps from the positions.
Type ids are valid `token_types` indices; the 65535 sentinel that marks
misses inside the tokeniser never leaks out.

This is the stream a consumer who imports the language package's
`grammar` export gets directly — no reclassifier cost, no
cross-token analysis. Function-call detection, PascalCase class
promotion, and tagged-template embedding cannot exist here. The tokeniser
sees one char and one state at a time; everything else is downstream.

## 7. The correctness reclassifiers

The reclassifier pipeline is a sequence of pure
`(input, TokenizeResult) -> TokenizeResult` transforms composed via
`reclassify(pipeline)`. Each mutating pass receives cloned arrays;
claim-producing passes can be batched so they run against a shared base
and merge their rewrites by precedence. An empty pipeline returns the
input unchanged, so consumers who want raw tokens pay nothing.

The pipeline is partitioned into three layers with a strict order.
`shape` passes run first and may merge, split, or extend tokens (bash's
`extend_variables`, bash's `merge_numbers`, rust's
`extend_lifetime_over_type`). `type_claim` passes are the majority —
they rewrite token types without changing the stream geometry. `embed`
passes run last and splice sub-language tokens into the host stream,
using either whole-token replacement (`embed_grammars`) or discontinuous
interleaving (`embed_interleaved`).

Claim-based composition handles the common case where several passes
want to rewrite overlapping sets of identifiers. Each pass emits
`Claim[] = { token_idx, type_id, precedence }`; the pipeline merges
claims per token index using a fixed precedence table (class_name > type

> function > property > identifier, with keyword/boolean/number at 75
> and comment/string at 80) and ties break by insertion order. This keeps
> the result stable regardless of pass ordering within a batch.

The correctness tier is tagged `always()` — empty `produces` — which
signals to the fidelity gate that these passes run at every fidelity
level. Examples: rust's `reclassify_generics` (disambiguates `<` and `>`
as generics vs comparison), typescript's `type_position_promoter`
(identifiers in type positions become `type`), python's
`type_alias_rules` (identifiers after `type X =`). Disabling any of
these would produce output a reader would call buggy.

## 8. The 'correct' output tokens

Still the same `TokenizeResult` shape. Tokens are still in source order
and non-overlapping; positions still index into the original input;
type ids still index into the current `token_types`. The renderer could
take this stream and produce valid HTML without running stages 9 and 10.

What changed relative to the raw stream: shape passes may have merged or
extended tokens (bash's `$foo` is now one `variable` span instead of `$`
followed by `foo`); type_claim passes have retyped some tokens (rust
generics, typescript type positions, python type aliases); `token_types`
may have grown to include new names.

This is the stream `create_language({ fidelity: "low" })` yields. It is
the "low-detail but still correct" setting — a consumer gets grammar
semantics plus the non-negotiable correctness layer but no restoration
and no optional enrichments.

## 9. The fidelity reclassifiers

Fidelity reclassifiers are opt-in, tagged with
`tag(reclassifier, produces, layer)` where `produces: string[]` names
the types the pass emits. The `select_pipeline` function filters the
pipeline based on a fidelity setting: `"high"` runs everything, `"low"`
runs only the always-on correctness tier, and a `string[]` allowlist
runs any pass whose `produces` intersects the allowlist. This is the
per-distinction opt-in surface that other highlighters do not expose.

The library ships three text-pattern helpers in `fidelity.ts`.
`promote_by_text_set(src, tgt, set)` retypes tokens of `src` whose
source text is in a known set (builtins, primitives, boolean literals).
`promote_pascal_case(src, tgt)` retypes tokens of `src` whose first
character is ASCII uppercase (class names). `promote_function_calls(src,
tgt, variants)` builds a `rewrite_types` rule for call-site patterns:
plain `foo(`, macro `foo!(`, generic `foo<…>(`, turbofish `foo::<…>(`.

More complex passes walk the token stream using `TokenView` and
`ScopeStack` from `scan.ts`. `TokenView` exposes
`next_non_trivia(from)` and `prev_non_trivia(from)` for trivia-aware
adjacency checks. `ScopeStack<T>` tracks bracket-kind-aware scopes with
live `paren_depth`, `brace_depth`, `bracket_depth` counters and a
caller-defined `data` payload per scope — enabling passes like
JavaScript's class-body scope tracker that need context-aware state.

The `embed` layer passes are themselves tagged fidelity passes.
`embed_grammars` does whole-token sub-tokenisation (HTML's `<script>` to
JS, `<style>` to CSS); `embed_interleaved` handles discontinuous
embedding by building a single virtual source with hole chars, calling
the sub-language once, remapping positions, splitting at hole boundaries,
and iterating to a fixed point for nested templates. Disabling these is
a legitimate user choice — some consumers genuinely want
`<script>` blocks as raw string content.

## 10. The high-fidelity output tokens

Still a `TokenizeResult`. Compared to stage 8: context-dependent
distinctions (function variables, interface members, PascalCase class
names, property names) are now typed; sub-language tokens are inline in
the host stream with merged type ids; tagged-template interpolations
carry preserved holes interleaved with sub-tokens.

This is what `create_language()` with no options (or `fidelity: "high"`)
produces. Most consumers import the language package's `language` export
and get exactly this stream. The renderer does not care whether it came
from stage 6, 8, or 10 — the data shape is identical across all three.

Measurements in `docs/grammar-fidelity-analysis.md` place the cost of
the full fidelity layer at 5 to 15 percent of end-to-end tokenise time.
This is the cost of the feature, not waste: it is what buys the ability
to toggle distinctions.

## 11. The HTML renderer

`to_html(input, token_result, options)` is a pure string builder that
walks tokens and the input forward once. The output shell is a
`<pre><code>` containing one `<span class="l">` per source line. Token
spans are class `tok <type_name>`; gaps between tokens are emitted as
raw text with no span wrapper.

Two kinds of coalescing keep the output compact. The tokeniser already
merged adjacent same-type runs in stage 5. The renderer's
`ensure_span(cls)` only opens a new `<span>` when the class actually
changes, so even if two tokens share a type they share a span element.
The combination turns long identifier runs into one span of raw text.

Newlines are the only special case. A `\n` inside a token or gap closes
the current token span, closes the current line wrapper, pushes a new
`<span class="l">` (with optional line-number element), and re-opens the
token span on the new line. The result is one line wrapper per source
line no matter how tokens fall across boundaries.

Escaping uses a 128-entry table covering `& < > " '`. The escape routine
scans the range first and returns the substring unchanged if no escape
is needed — the common path for most source code. Class names are
embedded directly as `tok <type_name>`, so theme CSS selectors are
literal (`.twinkleplop .keyword`) with no Map lookup at render time.
Themes live in separate packages that ship CSS custom properties plus
selector rules.

## 12. The output HTML

A string of shape
`<pre class="twinkleplop"><code><span class="l">…</span>…</code></pre>`.
One line wrapper per source line. One token span per contiguous
same-type run. Gaps are raw text, not spans. HTML-escaped for
`& < > " '`, everything else verbatim.

The mapping from type name to CSS selector is direct: `.twinkleplop
.keyword { color: var(--twp-keyword); }`. Themes are external packages
that ship a palette of CSS custom properties plus selector rules; the
renderer knows nothing about themes. Light and dark variants are toggled
by a class on an ancestor element.

The output is fully static — no JavaScript, no runtime theme logic.
Consumers embed the string into their page, include a theme
stylesheet, and are done.

---

# Part 3 — Low fidelity (one paragraph per concept)

## 1. The raw grammar

A declarative `Grammar` object with a `name` and a `states` map. Each
state has rules (each with one matcher and any of `token`, `state`,
`exit`, `boundary`), an optional `mode` of `"probe"` or `"tokenise"`, a
named EOF `fallback`, and `extend` or `include` for composition.
Ambiguity is handled by compile-time maximal munch plus runtime probe
mode; cross-token analysis is out of scope and belongs in the
reclassifier tier.

## 2. The compiler

`compile()` is a one-time five-pass lowering that resolves includes and
parameterised rulesets, collapses `extend` chains, expands `match_within`
into generated states, assigns integer ids to states and token types,
and fills the runtime data structures. Pattern buckets are sorted
descending by length — this is where maximal munch is encoded. Unknown
state references silently become the sentinel 65535.

## 3. The compiled grammar

`CompiledGrammar` is an immutable struct of typed arrays and maps —
`Uint16Array` transitions and char_maps for dense indexed lookup,
`Map<number, …>` for sparse pattern buckets and non-ASCII, `Uint8Array`
probe_mask for branch-free state checks, `Set<number>` for boundary
rules and probe states with composite keys. State 0 is always the root.
No strings in the hot path.

## 4. The input stream

A plain JavaScript string read via `charCodeAt`. UTF-16 code units
means BMP is fine but astral chars become untokenised gaps — a
deliberate tradeoff. Runtime state is fixed-size and pre-allocated:
`Uint32Array(len*3)` tokens, `Uint16Array(256)` state stack, one `pos`
integer, plus probe bookkeeping. Per-state hot references are cached on
every state change.

## 5. The tokeniser

A stack-augmented finite state machine (pushdown automaton) that runs a
single `while (pos < len)` loop doing constant work per character.
Classification is ordered (pattern buckets, char_maps, non-ASCII,
fallback transitions); the transition triple `[next_state, token_type,
stack_op]` drives emission and the stack. Adjacent same-type tokens are
coalesced at emission time. Probe mode handles contextual ambiguity by
scanning ahead, resolving into a non-probe state, and rewinding the
cursor.

## 6. The raw token output

A `TokenizeResult` with `tokens: Uint32Array` of flat `[type, start,
end]` triplets and `token_types: string[]`. Tokens are in source order,
non-overlapping, and already coalesced. Gaps are implicit. This is the
zero-reclassifier-cost output; cross-token analysis (function calls,
embedding, PascalCase promotion) cannot exist here.

## 7. The correctness reclassifiers

Pure `(input, TokenizeResult) -> TokenizeResult` transforms composed
via `reclassify(pipeline)`. Three strictly-ordered layers: `shape`
(merge/split/extend), `type_claim` (rewrite types only), `embed`
(splice sub-language tokens). Type rewrites can compose via claims with
a fixed precedence table that breaks ties by insertion order. Tagged
`always()` — runs at every fidelity level because disabling them would
produce wrong output.

## 8. The 'correct' output tokens

Same `TokenizeResult` shape as raw, but with correctness passes
applied: some shape changes, some type upgrades, possibly an extended
`token_types`. Positions still index into the original input; ordering
and non-overlap still hold. The stream `create_language({ fidelity:
"low" })` produces — the "low detail but still correct" tier.

## 9. The fidelity reclassifiers

Opt-in transforms tagged with `produces: string[]` and gated by
`select_pipeline`: `"high"` runs everything, `"low"` runs only
correctness, a `string[]` allowlist runs passes whose `produces`
intersects it. Three text-pattern helpers (`promote_by_text_set`,
`promote_pascal_case`, `promote_function_calls`) cover most upgrades;
stateful passes use `TokenView` and `ScopeStack` from `scan.ts` for
trivia-aware adjacency and bracket-scope tracking. `embed_grammars` and
`embed_interleaved` live here too.

## 10. The high-fidelity output tokens

The `TokenizeResult` yielded by `create_language()` with defaults:
function variables, class names, interface members, property names, and
context-dependent distinctions are all typed; sub-language tokens are
inline; tagged templates carry preserved interpolation holes. The
renderer cannot tell which pipeline stage produced this stream — the
shape is identical to stage 6.

## 11. The HTML renderer

`to_html` is a single forward-walk string builder. It emits one `<pre
class="twinkleplop"><code>` shell, one `<span class="l">` per source
line, and one `<span class="tok TYPE">` per contiguous same-type run.
Gaps are raw text with no span wrapper; `\n` inside a token or gap
closes and reopens the line wrapper. Escaping covers `& < > " '` via a
128-entry table with a fast no-escape-needed path.

## 12. The output HTML

A single static string with predictable structure: `<pre><code>` holding
`<span class="l">` line wrappers holding `<span class="tok TYPE">`
token spans interleaved with raw-text gaps. Type names map directly to
CSS selectors (`.twinkleplop .keyword`), so themes plug in by shipping
CSS custom properties and selector rules. No JavaScript, no runtime
theme logic.

---

# Appendix — `const x = 1` traced end to end

This is the literal 11-character input `const x = 1` walked through every
stage with an approximation of a minimal JavaScript-like grammar. The
real JavaScript grammar does more (regex/division disambiguation, numeric
variants, etc.) but the essentials are the same.

## Source string

```
const x = 1
0123456789A
```

`A` is position 10. `len = 11`. Char codes:

| pos  | char  | code               |
| ---- | ----- | ------------------ |
| 0..4 | const | 99 111 110 115 116 |
| 5    | ␣     | 32                 |
| 6    | x     | 120                |
| 7    | ␣     | 32                 |
| 8    | =     | 61                 |
| 9    | ␣     | 32                 |
| 10   | 1     | 49                 |

## Stage 1 — Raw grammar fragment

The relevant rules on the `main` state, using the DSL:

```ts
{
  name: "javascript",
  states: {
    main: {
      rules: [
        keyword(["const", "let", "var", …], "keyword"),
        match(["=", "=="], "operator"),
        { range: [["0", "9"]], token: "number" },
        { range: [["a", "z"], ["A", "Z"], ["_", "_"], ["$", "$"]], token: "identifier" },
        // whitespace not matched -> falls through as gaps
      ],
    },
  },
}
```

`keyword(…)` sugar adds `boundary: true` so `const` does not match inside
`constant`.

## Stage 2 — Compiler output (abbreviated)

After the five compile passes:

- `states.get("main") === 0` (root).
- `token_types = ["keyword", "operator", "number", "identifier"]`.
- Pattern bucket for state 0, first char `'c'` (code 99): one
  `PatternInfo` for `"const"` with `boundary: true` and rule_idx 0.
  Other keywords populate their own first-char buckets.
- `char_maps[0 * 128 + '='] = 1` — rule_idx 1 (operator) for single-char
  `=`. Pattern bucket at `'='` also has an entry for `"=="`
  (length 2, sorted first).
- `char_maps[0 * 128 + '0'..'9']` — rule_idx 2 (number) for every digit.
- `char_maps[0 * 128 + 'a'..'z' and 'A'..'Z' and '_' and '$']` — rule_idx
  3 (identifier).
- `char_maps[0 * 128 + ' '] === 65535` — whitespace has no rule.
- Transition triple for state 0 rule 0 (keyword `const`):
  `transitions[(0*256 + 0)*3..] = [0, 0, 0]` — stay in state 0, emit type
  id 0 (keyword), no stack op.
- Boundary rules set contains `0 * 256 + 0 = 0` (the `const` rule).
- No probe states, no fallback transitions for `main`.

## Stage 3 — Compiled grammar

A `CompiledGrammar` holding those arrays plus the metadata described in
stage 3 of Part 1. Concrete sizes for this tiny example: `transitions`
is `Uint16Array(1 * 256 * 3) = 768`, `char_maps` is
`Uint16Array(1 * 128) = 128`, `patterns` is a Map with one state entry
whose bucket array has a few populated slots.

## Stage 4 — Input stream

`pos = 0`. `len = 11`. `state_stack` empty, `current_state = 0`,
`state_buckets = patterns.get(0)`, `char_map_base = 0`, `trans_base3 = 0`.

## Stage 5 — Tokeniser trace

Per-iteration behaviour:

- **pos 0, char `c` (99)**. Bucket lookup: try `"const"` (length 5). The
  next four chars match `o`, `n`, `s`, `t`. Boundary check: char at pos
  5 is `' '` (32), not an identifier continuation — ok. Rule 0
  matched. Transition: `[0, 0, 0]` — stay, emit token type 0, no stack
  op. Emit: `last_token_type` is 65535 so no coalesce; write
  `tokens[0..3] = [0, 0, 5]`. Advance: `pos = 5`.

- **pos 5, char `' '` (32)**. `state_buckets[32]` is null. `char_maps[32]`
  is 65535. No fallback transitions. No match: advance `pos` by 1 to 6.
  (In the real loop this falls into the no-match branch; the character
  is consumed as a gap.)

- **pos 6, char `x` (120)**. `state_buckets[120]` is null (no
  multi-char pattern starts with `x` in this grammar). `char_maps[120]`
  is rule_idx 3 (identifier). Transition: `[0, 3, 0]` — stay, emit type
  id 3 (identifier), no stack op. Emit: `tokens[3..6] = [3, 6, 7]`.
  Advance: `pos = 7`.

- **pos 7, char `' '` (32)**. No match. `pos = 8`.

- **pos 8, char `=` (61)**. Bucket: try `"=="` first (length 2). Char at
  pos 9 is `' '`, not `=`. Bucket miss. `char_maps[61]` is rule_idx 1
  (operator). Transition: `[0, 1, 0]` — stay, emit type id 1 (operator).
  Emit: `tokens[6..9] = [1, 8, 9]`. Advance: `pos = 9`.

- **pos 9, char `' '` (32)**. No match. `pos = 10`.

- **pos 10, char `1` (49)**. `char_maps[49]` is rule_idx 2 (number).
  Transition: `[0, 2, 0]`. Emit: `tokens[9..12] = [2, 10, 11]`.
  Advance: `pos = 11`.

- **pos === len**. Loop exits.

Token coalescing did not fire (no two adjacent emissions shared a type
and boundary), but the mechanism was live at each emission.

## Stage 6 — Raw token output

```
TokenizeResult = {
  tokens: Uint32Array [
    0,  0,  5,   // type 0 (keyword), "const"
    3,  6,  7,   // type 3 (identifier), "x"
    1,  8,  9,   // type 1 (operator), "="
    2, 10, 11,   // type 2 (number), "1"
  ],
  token_types: ["keyword", "operator", "number", "identifier"],
}
```

Four tokens. Three gaps (positions 5, 7, 9) are implicit.

## Stage 7 — Correctness reclassifiers

For this input, none of JavaScript's correctness passes fire. `const` is
already `keyword`. There is no `$` prefix to extend, no generics to
disambiguate, no `<script>` boundary. The pipeline returns the stream
unchanged (the reference may be cloned along the way but the contents
are identical).

## Stage 8 — 'Correct' output tokens

Identical to stage 6 for this input. This is what `create_language({
fidelity: "low" })` would yield.

## Stage 9 — Fidelity reclassifiers

Candidate passes and their verdicts:

- `promote_boolean_literals`: no boolean literal token in the stream.
  No-op.
- `promote_call_site_functions`: for the `identifier` at index 1 (`x`),
  look at the next non-trivia token — it is `=` (operator), not `(`. No
  function promotion.
- `function_variable_rules` (the `const foo = () => …` pattern): anchor
  is `identifier` (`x` matches), `before` wants `keyword` with text
  `const` (matches), `when` wants `=` then `balanced_parens("(", ")")`
  then `=>` — but in our input the `=` is followed directly by `1`, not
  `(`. No match.
- `promote_pascal_case` for class names: `x` starts with lowercase, no
  match.

Result: stream unchanged.

To make a fidelity pass actually fire, consider the alternative input
`const foo = () => 1`. There `function_variable_rules` would match
anchor=`foo`, before=`const`, when=`= () =>`, and rewrite `foo` to
`function`. The stream would gain a new `token_types` entry if
`"function"` was not already present, and `tokens[3]` would change from
the identifier type id to the function type id.

## Stage 10 — High-fidelity output tokens

For `const x = 1`: identical to stage 8.

For `const foo = () => 1` (hypothetical): tokens[3] retyped to
`function`, `token_types` possibly extended with `"function"` if not
already there.

## Stage 11 — HTML renderer

Walk the stage-10 tokens plus the input:

- `last_end = 0`. Token 0: `(keyword, 0, 5)`. No gap. Open line wrapper,
  open `<span class="tok keyword">`, push `"const"`, `last_end = 5`.
- Token 1: `(identifier, 6, 7)`. `start (6) > last_end (5)`, so emit
  gap `input.slice(5, 6) = " "` as raw text (close current span first).
  Open `<span class="tok identifier">`, push `"x"`. `last_end = 7`.
- Token 2: `(operator, 8, 9)`. Gap `" "` as raw text. Close identifier
  span, open operator span, push `"="`. `last_end = 9`.
- Token 3: `(number, 10, 11)`. Gap `" "` as raw text. Close operator
  span, open number span, push `"1"`. `last_end = 11`.
- Loop done. No trailing gap (`last_end === input.length`). Close number
  span. Close line wrapper. Close `</code></pre>`.

No newlines in the input, so the line-splitting path never fired. No
escape characters, so `escape_substring_optimized` took the fast path on
every chunk.

## Stage 12 — Output HTML

```html
<pre
  class="twinkleplop"
><code><span class="l"><span class="tok keyword">const</span> <span class="tok identifier">x</span> <span class="tok operator">=</span> <span class="tok number">1</span></span></code></pre>
```

Four token spans, three single-space gaps as raw text, one line wrapper.
With a theme stylesheet attached, this renders as

- `const` in the theme's keyword colour,
- a single space,
- `x` in the identifier colour,
- a single space,
- `=` in the operator colour,
- a single space,
- `1` in the number colour.

No JavaScript. No runtime work. Done.
