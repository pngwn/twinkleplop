---
name: grammar-author
description: Write a twinkleplop syntax highlighting grammar using a completed research report. Use when implementing or debugging a language grammar (run grammar-researcher first).
---

You are writing a twinkleplop syntax highlighting grammar for a language that has already been researched. Twinkleplop is a regex-free syntax highlighter using character scanning and stack-augmented state machines.

## Precondition: research report

When writing a new grammar, verify `languages/{name}/RESEARCH.md` exists and contains all five sections (primary sources, token inventory, edge cases, nesting/context constructs, manual traces).

If it does not exist, STOP. Tell the user to run the grammar-researcher skill first, passing the language name. Do not attempt the research yourself from this skill — the split exists so research gets its own dedicated pass.

Read `RESEARCH.md` end-to-end before writing any rules. Your state design and rule ordering decisions should cite it. If you discover mid-implementation that the research missed something, update RESEARCH.md as you go — keep it current until the grammar lands.

`RESEARCH.md` is a working document and is gitignored, so existing grammars do not have one. When debugging an existing grammar, work from the grammar, its test fixtures and the primary sources instead, and only ask for a grammar-researcher pass if the fix needs new research.

Follow the phases below in order. Do not skip or combine phases.

---

## Phase 1: State transition map

Using the nesting/context constructs section of RESEARCH.md and the manual traces as input, enumerate the grammar's states and annotate each transition with enter/goto/leave. Format:

```
state_name
  character/pattern -> target_state (enter/goto/leave)
  character/pattern -> target_state (enter/goto/leave)
```

- **enter** pushes the current state and moves into the new one (use for nested contexts you will return from).
- **goto** replaces the current state (use for context switches without nesting).
- **leave** pops back to the parent state (use to exit a nested context entered with enter).

If you are unsure which operation is correct for a given transition, read section 2.1 below before deciding. A wrong enter/goto choice is the single most common source of stack leaks and infinite loops.

Keep this phase tight — one focused pass producing a state-by-state map. You will re-walk each of the RESEARCH.md manual traces against this map once it exists, updating either side when they disagree.

---

## Phase 2: Twinkleplop Grammar API

Read these files for full type signatures and the complete API reference:

- `grammar.md` — the language definition guide (start here)
- `lib/core/src/dsl.ts` — all helper implementations
- `lib/core/src/types.ts` — Grammar, GrammarRule, GrammarState types
- `lib/core/src/tokens.ts` — standard token names

Study these existing grammars for pattern reference:

- `languages/json/src/grammar.ts` — minimal worked example: within, keyword, match, enter/leave, fallback, shared rules (~140 lines)
- `languages/html/src/grammar.ts` — embedded languages (raw tokens + reclassifier), shared rule arrays, known-limitations comment format (~184 lines)
- `languages/css/src/grammar.ts` — probe states for disambiguating selectors vs properties, shared constants (~477 lines)
- `languages/javascript/src/grammar.ts` — regex/division disambiguation via dual states, parameterised rule factories, template literal brace-depth tracking (~771 lines)

What follows is a concise reference of the patterns and idioms you need. It is not exhaustive — read the files above for full details.

### 2.1 Core mental model

A grammar is a set of named states. Each state has an ordered list of rules. Rules either consume characters and emit tokens, change state, or both. Three stack operations:

- **enter(state)** — push current state onto the stack, move to new state. Use for nested contexts you will return from (string body, parenthesised expression, regex pattern).
- **goto(state)** — replace the current state without touching the stack. Use for context switches without nesting (flipping between regex_allow and division in JS) and for moving between the phases of one construct. The stack depth is unchanged, so a frame pushed by an earlier enter() is still there.
- **leave()** — pop back to the parent state. Use to exit a nested context entered with enter().

Stack leak = enter() without a matching leave() on every exit path. A leak is never harmless: the tokenizer's stack has 256 slots, and once a leaking construct repeats past that, pushes are dropped and a later leave() reads garbage, corrupting every token after it. The classic case is a multi-phase construct (a number with decimal and exponent phases) whose phases are entered with enter() and exit with `fallback(goto("main"))`, leaving frames behind on every literal. Enter the construct once, move between phases with goto(), and exit every phase with leave() (see the JSON number states). Stress-test each construct: repeat it well past 256 times, then assert the tokens that follow.

Infinite loop = a cycle of goto() transitions where no character is consumed.

### 2.2 Rule ordering and precedence

Rules within a state are tried top-to-bottom; **first matching rule wins**. However, within a single rule's match array, the compiler sorts patterns by descending length per first-character bucket. So `/>` always beats `/` even in one match() call.

If two patterns are in SEPARATE rules, the first rule's position in the array wins. Put specific patterns (delimiters, closing tags) before broad patterns (fallback, identifier continuations).

**keyword() vs match()**: keyword() adds word-boundary checking — the character after the match must not be `[a-zA-Z0-9_$]`. Always use keyword() for language reserved words. match("return", ...) will match inside "returning"; keyword(["return"]) will not.

### 2.3 The fallback pattern

To capture a span of arbitrary content until a delimiter, put the delimiter rule first and a fallback with your token type second. The tokenizer coalesces adjacent same-type tokens into one, so the entire span becomes a single token.

```js
// HTML script content: everything until </script>
script_content: {
  rules: [
    match("</script>", TAG_NAME, leave()),  // delimiter fires first
    fallback({ token: RAW_SCRIPT }),         // everything else is raw
  ],
}
```

Critical distinction: a fallback that emits no token does NOT consume the character. `fallback(goto("state"))` re-processes it in the destination state, and `fallback(leave())` re-processes it in the parent. This is how you hand back a character when you realize you are in the wrong context. A fallback that emits a token, such as `fallback({ token, ...goto("state") })`, always consumes.

### 2.4 Shared rules

Use plain JS arrays spread into multiple states:

```js
const COMMENT = within("/*", "*/", TOKENS.comment);
const STRING = within('"', '"', TOKENS.string, { escape: "\\" });
const WS = on([" ", "\t", "\n", "\r"]);

state_a: { rules: [COMMENT, STRING, WS, /* state-specific rules */] },
state_b: { rules: [COMMENT, STRING, WS, /* different rules */] },
```

For rules that differ only in transition target, use parameterised factories:

```js
const operators = (after) => match(OP_ALL, TOKENS.operator, to(after));
// to(null) = stay in current state; to("regex_allow") = goto
```

See `languages/javascript/src/grammar.ts` for the canonical example.

### 2.5 Token types

Import standard names: `import * as TOKENS from "@twinkleplop/core/tokens"`. Standard names: boolean, comment, function, identifier, keyword, number, operator, property, punctuation, regex, selector, string, template. CSS extras: attribute, class_name, css_var, id, pseudo, unit.

Custom token types are any string: `match("@media", "at_rule")`. Custom names become CSS class names in rendered output and are used in reclassifier embed mappings (e.g., `raw_script` maps to JavaScript sub-tokenization).

### 2.6 Character classes

```js
range([
  ["a", "z"],
  ["A", "Z"],
]); // letter range
```

Pre-built: LETTER, DIGIT, ALNUM, HEX, LOWER, UPPER. Mix exact strings and ranges in one match():

```js
match(["_", "$", LETTER], TOKENS.identifier);
// one rule with both match and range fields
```

### 2.7 Strings and bounded matches

```js
within("//", "\n", TOKENS.comment); // single-line comment
within("/*", "*/", TOKENS.comment); // block comment
within('"', '"', TOKENS.string, { escape: "\\" }); // string with escapes
within("'", "'", TOKENS.string, { escape: "\\", multiline: false }); // single-line string
```

### 2.8 Reclassifiers (post-pass token enrichment)

The core grammar should produce correct, complete tokenization on its own. Reclassifiers are an optional post-pass that enriches tokens in ways that would cause state explosion if handled in the state machine. The grammar emits broad token types (e.g., `identifier`); the reclassifier narrows them (e.g., `identifier` -> `function`) by pattern-matching over the token stream.

Reclassifiers are pure functions `(input, TokenizeResult) -> TokenizeResult` composed into a pipeline. They never mutate the input. Consumers who import `grammar` get base tokens; consumers who import `language` get the enriched version.

**When to use a reclassifier instead of a grammar rule:**

- The distinction requires looking at tokens AFTER the current one (the grammar only looks forward character by character, but a reclassifier sees the whole token stream)
- Encoding the distinction in the state machine would require duplicating many states (e.g., tracking "are we in a declaration context?" across every sub-state)
- The base token type is correct enough for highlighting — the enrichment is a refinement, not a correction

**Token type rewriting with `rewrite_types`:**

Pattern-match local windows of the token stream and rewrite the anchor token's type. The matcher skips trivia tokens (comments) between pattern elements.

```js
import { rewrite_types, type, seq, any_of, balanced_parens } from "@twinkleplop/core";

// detect function variables: `const foo = () => ...` -> foo becomes `function`
const rules = [
  {
    anchor: "identifier", // token type to look for
    when: seq(
      // pattern that must follow the anchor
      type("operator", "="), // match operator token with value "="
      balanced_parens("(", ")"), // match balanced parens (any depth)
      type("operator", "=>"), // match fat arrow
    ),
    rewrite: "function", // new type for the anchor token
  },
];

export const reclassifiers = [rewrite_types(rules, { trivia: ["comment"] })];
```

Pattern combinators:

- `type(type_name, value?)` — match a single token by type, optionally constrained by source text value
- `seq(...patterns)` — sequential match (skips trivia between elements)
- `any_of(...branches)` — first-match-wins branching
- `optional(pattern)` — 0 or 1 match
- `balanced_parens(open, close)` — match balanced delimiter pairs at any depth
- `capture(name, pattern)` — tag spans for per-capture rewriting

See `languages/javascript/src/reclassifiers.ts` for the canonical example: function-variable detection that rewrites `identifier` -> `function` for patterns like `const foo = () => ...`, `const foo = function() {}`, and `{ foo: () => ... }`.

**Embedded languages with `embed_grammars`:**

For grammars that embed other languages (like HTML embedding JS/CSS):

1. The grammar emits a raw token using the delimiter-first + fallback pattern (section 2.3)
2. A reclassifier maps the raw token to a sub-language via `embed_grammars`
3. The sub-language tokenizes the raw content and the result is spliced back in

```js
import { embed_grammars } from "@twinkleplop/core";
import { language as js_language } from "@twinkleplop/javascript";

export const reclassifiers = [
  embed_grammars({
    raw_script: (src) => js_language(src),
  }),
];
```

See `languages/html/src/reclassifiers.ts` for the pattern. Skip this for grammars that do not embed other languages.

**Reclassifier ordering matters.** Reclassifiers run in array order. Put `rewrite_types` before `embed_grammars` so type rewriting sees the raw host-language tokens before embedding splices in sub-language tokens.

### 2.9 Known-limitations comment

Every grammar MUST start with a block comment documenting:

- **Scope**: what the grammar covers
- **Known limitations**: what it intentionally omits or handles incorrectly, and why
- **Edge cases**: behaviors that differ from the language spec

This is not a postmortem — it is a plan. Write it before the grammar, update it as you discover limitations during implementation. See `languages/html/src/grammar.ts` lines 1-22 for the format.

### 2.10 Anti-patterns

- **enter() where goto() is correct**: leaks stack frames. Use goto when the source state should not stay on the stack (context switches, not nesting). Use enter only when you need leave() to return to the current state.
- **Missing leave() path**: every enter() must reach a leave() on every exit path. goto() does not pop, so leaving an entered state with `goto("main")` strands the frame. Trace your state graph to verify.
- **Broad match before specific**: fallback must come AFTER delimiter rules. The first matching rule wins.
- **match() for reserved words**: use keyword() to get boundary checking. match("if", ...) matches inside "iffy".
- **No-consume goto loops**: two states that goto each other without consuming a character = infinite loop. Every cycle must advance the position.
- **Assuming keyword works without both boundaries**: keyword checks the character AFTER the match. It does not check before. If your identifier state starts with a letter match, the boundary-before is handled by how you enter the state.

### 2.11 Chained probes for multi-phase disambiguation

Sometimes a single probe state cannot disambiguate a token because the answer depends on WHICH character is at the first position vs later positions. The key insight: **transitioning between two probe states does NOT trigger a rewind**. Only the final transition to a non-probe state rewinds. This lets you chain probes to implement multi-phase lookahead.

#### The problem: Rust lifetime `'a` vs char literal `'a'`

After consuming `'`, the tokenizer must decide whether the upcoming text is a lifetime (`'identifier`) or a char literal (`'body'`). The `'` itself needs a different token type depending on the answer: `lifetime` for lifetimes, `string` for char literals. So the probe must rewind to the `'` so the target state can re-consume it with the correct token.

The disambiguation rule: if the first char after `'` is a letter/_, scan identifier chars. If the next non-identifier char is `'`, it is a char literal. If it is anything else (space, operator, etc.), it is a lifetime. If the first char after `'` is NOT a letter/_ (backslash, space, digit), it is always a char literal.

#### Why a single probe fails

A single probe entered from the `'` position scans characters one at a time. Non-identifier characters trigger a rule match. But the probe cannot tell whether the matched character is the FIRST character (meaning it is a char literal body like `' '`) or a LATER character after identifier scanning (meaning it is the end of a lifetime like `'a `). A space at position 1 means char literal. A space at position 3 means lifetime.

#### Approaches that do not work

**Intermediate dispatch state + probe**: use a non-probe state to check the first character, then enter a probe for the letter/\_ case. Problem: the probe rewinds to `probe_entry.pos`, which is the position of the character that triggered probe entry (the letter in the dispatch state), NOT the `'`. The `'` was consumed by `on()` in main before the dispatch state, so the probe cannot rewind past it. The `'` ends up un-tokenized.

**Single probe with all disambiguation rules**: put letter/\_, `\`, `'`, space, digits, operators, etc. all in one probe. Problem: `' '` (space char literal) triggers the "non-identifier = lifetime" rule on the first character, misclassifying it.

#### The solution: chained probes

Use two probe states. Transitioning from one probe to another keeps scanning without rewinding. Only the final exit to a non-probe state triggers the rewind (back to the `'`).

```js
// main state: consume `'` and enter the first probe.
// probe_entry.pos = position of `'` (this is where the final rewind lands).
on("'", enter("quote_probe")),

// phase 1: check the FIRST character after `'`
quote_probe: {
  mode: "probe",
  fallback: "char_literal",
  rules: [
    // letter/_ → ambiguous, continue scanning in phase 2.
    // enter() another probe state: NO rewind, keeps scanning.
    on(["_", LETTER], enter("quote_probe_ident")),
    // backslash, closing quote, space, digit, etc. → char literal
    on("\\", enter("char_literal")),
    on("'", enter("char_literal")),
    on([" ", "\t", "\n", "\r", DIGIT, /* ...operators, punctuation... */],
       enter("char_literal")),
  ],
},

// phase 2: scan past identifier chars, check what follows
quote_probe_ident: {
  mode: "probe",
  fallback: "lifetime_token",  // EOF after ident → lifetime
  rules: [
    // identifier chars (letters, digits, _) are NOT listed here,
    // so the probe skips past them automatically.

    // closing `'` after ident → char literal
    on("'", enter("char_literal")),
    // non-ident, non-`'` → lifetime
    on([" ", "\t", "\n", "\r", /* ...operators, punctuation... */],
       enter("lifetime_token")),
  ],
},

// target states: entered after rewind to the `'` position.
// enter() in the probe exit rules pushes probe_entry.state (= main)
// onto the stack, so these states can leave() back to main.

char_literal: {
  rules: [
    match("'", TOKENS.string, goto("char_literal_body")),
    fallback(leave()),
  ],
},

lifetime_token: {
  rules: [
    match("'", LIFETIME, goto("lifetime_body")),
    fallback(leave()),
  ],
},
```

#### Stack mechanics on probe exit

When the probe was entered via `on("'", enter("quote_probe"))` from main, the tokenizer records `probe_entry.state = main` and `probe_entry.stack_ptr = 0`. When the probe exits via `enter()` (stack_op = 1), the tokenizer pushes `probe_entry.state` (main) onto the stack. So `char_literal` and `lifetime_token` have `[main]` on the stack, and their sub-states can `leave()` back to main.

If `goto()` were used instead of `enter()` in the probe exit rules, nothing would be pushed (stack_op = 2). The stack would be empty after the rewind, and `leave()` would underflow. Always use `enter()` in probe exit rules when the target state needs a parent to return to.

#### Trace: `'a'` (char literal)

1. main, pos=0: `'` matches `on("'", enter("quote_probe"))`. probe_entry.pos=0.
2. quote_probe, pos=1: `a` matches letter → `enter("quote_probe_ident")`. still in probe mode, no rewind.
3. quote_probe_ident, pos=2: `'` matches → `enter("char_literal")`. non-probe target, REWIND to pos=0.
4. char_literal, pos=0: `'` → `match("'", string, goto("char_literal_body"))`. emits string[0-1].
5. char_literal_body, pos=1: `a` → fallback string, goto char_literal_close. emits string[1-2].
6. char_literal_close, pos=2: `'` → `match("'", string, leave())`. emits string[2-3]. coalesced: string[0-3] = `'a'`.

#### Trace: `'a ` (lifetime)

1. main, pos=0: `'` → enter quote_probe. probe_entry.pos=0.
2. quote_probe, pos=1: `a` → enter quote_probe_ident. still probing.
3. quote_probe_ident, pos=2: ` ` matches non-ident → `enter("lifetime_token")`. REWIND to pos=0.
4. lifetime_token, pos=0: `'` → `match("'", lifetime, goto("lifetime_body"))`. emits lifetime[0-1].
5. lifetime_body, pos=1: `a` → match lifetime. ` ` → fallback leave(). coalesced: lifetime[0-2] = `'a`.

#### Trace: `' '` (space char literal)

1. main, pos=0: `'` → enter quote_probe. probe_entry.pos=0.
2. quote_probe, pos=1: ` ` matches space → `enter("char_literal")`. REWIND to pos=0.
3. char_literal, pos=0: `'` → string, goto char_literal_body. emits string[0-1].
4. char_literal_body, pos=1: ` ` → fallback string, goto char_literal_close. emits string[1-2].
5. char_literal_close, pos=2: `'` → string, leave(). coalesced: string[0-3] = `' '`.

The first probe correctly identifies the space as "not a letter" and routes to char_literal without entering the second probe. This is the key advantage of the two-phase approach.

See `languages/rust/src/grammar.ts` for the full working implementation.

---

## Phase 3: Implementation

### 3.1 Package scaffolding

Create the language package directory: `languages/{name}/`

```
languages/{name}/
  package.json
  src/
    grammar.ts           — the grammar definition
    index.ts             — compile + export
    reclassifiers.ts     — (optional) token enrichment rules
    grammar.test.ts      — vitest tests
  test/
    *.{ext}              — test fixture files (source code in target language)
    *.output.js          — generated snapshots
    index.js             — snapshot re-exports
  generate-snapshots.js  — snapshot generation script
```

Follow the exact patterns from `languages/json/` for: package.json, src/index.ts, src/grammar.test.ts, generate-snapshots.js. These are boilerplate — copy and adapt. If your grammar needs reclassifiers (section 2.8), follow `languages/javascript/src/reclassifiers.ts` and `languages/html/src/reclassifiers.ts` for the patterns, and update `src/index.ts` to import and export them (see `languages/html/src/index.ts`).

### 3.2 Grammar file structure

Write `src/grammar.ts` in this order:

1. Known-limitations comment block (section 2.9)
2. Imports from `@twinkleplop/core` and `@twinkleplop/core/tokens`
3. Import `define_grammar` from `@twinkleplop/core/compile`
4. Custom token name constants (if any)
5. Shared rule fragments as `const` arrays
6. Parameterised rule factories (if needed)
7. `export default define_grammar({ name, states })`
8. The first state in the `states` object is the entry point for tokenization

### 3.3 Test fixtures

Create test files in `test/` covering every token category from your Phase 1 inventory. At minimum:

- Strings (every quote style, escape sequences, edge cases)
- Numbers (every numeric form the language supports)
- Comments (every comment style)
- Keywords and operators
- Nesting and complex structures

Generate snapshots: `npx tsx generate-snapshots.js`

### 3.4 Verification

Run in order:

1. `verify(raw_grammar)` returns `[]` — catches undefined state references and orphan states (this is the first test in grammar.test.ts)
2. `pnpm --filter @twinkleplop/{name} test` — runs all snapshot tests
3. If token output looks wrong: copy `lib/core/debug-grammar-template.js` into your package, configure it with your grammar and a failing input, and run it for character-level tracing

### 3.5 Iterate

Compare your snapshot output against your Phase 1 manual traces. If they diverge:

1. Identify which state transition is wrong
2. Check your enter/goto/leave choice (section 2.1)
3. Check your rule ordering (section 2.2)
4. Check for anti-patterns (section 2.10)
5. Use the debug template for character-level diagnosis

Refer back to your Phase 1 edge case inventory. For each edge case, write a test fixture that exercises it. If the grammar handles it incorrectly and the fix is not worth the complexity, document it in the known-limitations comment.
