
<!-- ---- unit 1 ---- -->

---
title: Twinkleplop
tags: [demo, showcase]
---

# Twinkleplop

> A **regex-free** syntax highlighter with _opt-in_ fidelity. ~~Slow~~ **fast**.

## Features &amp; friends

1. Language packs with [docs](https://example.com "home").
2. `inline code` and fenced blocks:

```js
const greet = (name) => `hi, ${name}`;
```

    // indented code block
    const x = 1 + 2;

- [x] ship demo
      second line after a hard break
- [ ] celebrate

Escapes: \* not italic, \# not a heading.

---

Visit <https://example.com> or email <hi@example.com>.

![logo](./logo.png)



<!-- ---- unit 2 ---- -->


<!-- ---- blockquote.md ---- -->

> a simple quote

> quote with **bold** inside

> > nested quote

> # heading in quote



<!-- ---- code_span.md ---- -->

a `code` span.

`code with *asterisks* inside` stays literal.

An `unclosed code and more
text.



<!-- ---- composition.md ---- -->

**bold with *italic nested* bold**

*italic with `code inside` italic*

**bold with `code` bold**

~~strike with **bold** strike~~

*italic [link text](https://example.com) italic*

[link with **bold** and `code` inside](url)

**[bold link](url) followed by bold**

*~~italic strike~~*

**bold *italic ~~and strike~~ back to italic* bold**

`plain code` outside emphasis

*italic containing <https://autolink> inside*

**bold across ![image alt](img.png) bold**

`code` then **bold** then *italic* flat



<!-- ---- emphasis.md ---- -->

**bold text**

*italic text*

***both***

~~strikethrough~~

**outer *inner* outer**

*emph with `code` inside*

__underscore bold__

_underscore italic_

**unclosed bold



<!-- ---- escape_entity.md ---- -->

\*not emphasis\* and \\ literal backslash.

entity: &amp; &copy; &#42; &#x2a;

a hard break\
continues here.



<!-- ---- fenced_code.md ---- -->

```js
const x = 1;
```

```
no language
```

~~~python
print("tilde fence")
~~~



<!-- ---- front_matter.md ---- -->

---
title: Hello
date: 2026-04-14
---

# First heading

A paragraph.



<!-- ---- headings.md ---- -->

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

# Heading with **bold** and *italic*

#notaheading

####### not a heading either

#



<!-- ---- indented_code.md ---- -->

a paragraph first.

    four spaces of code
    line two

back to paragraph.



<!-- ---- links.md ---- -->

[text](https://example.com)

[with title](https://example.com "Example")

[reference][label]

[just brackets]

![image alt](image.png)

See <https://auto.link> for details.



<!-- ---- lists.md ---- -->

- first bullet
- second bullet
* star bullet
+ plus bullet

- [ ] open task
- [x] done task
- [X] capital done



<!-- ---- mixed.md ---- -->

# Project Readme

A short **intro** paragraph with a [link](https://example.com) and `inline code`.

## Install

```bash
pnpm install
```

## Features

- fast
- **bold** feature
- [ ] roadmap item

> Note: read the docs.

---

See <https://example.com> for more.



<!-- ---- thematic_break.md ---- -->

above

---

below

***

more

___

end



<!-- ---- unit 3 ---- -->


<!-- ---- grammar.md ---- -->

# Language Definition Guide

Grammars are plain JavaScript modules built with a small set of helpers from `@twinkleplop/core`. Each helper is a pure factory that returns a rule (or partial rule) object — the compiler doesn't care whether you hand-write those objects or call a helper. The helpers just remove boilerplate and let you compose rules with ordinary JS (spread, `map`, function calls).

```js
import {
  match,
  on,
  keyword,
  within,
  fallback,
  range,
  enter,
  goto,
  leave,
  to,
  LETTER,
  DIGIT,
  ALNUM,
  HEX,
} from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";

export default {
  name: "mylang",
  states: {
    main: {
      rules: [
        within("//", "\n", TOKENS.comment),
        keyword(["if", "else", "while"]),
        match(["_", "$", LETTER], TOKENS.identifier),
        match(DIGIT, TOKENS.number),
        match(["+", "-", "*", "/"], TOKENS.operator),
      ],
    },
  },
};
```

The first state declared in `states` is the initial state for tokenization.

---

## Token names

Token types are just strings. Any string is valid. `@twinkleplop/core/tokens` exports a set of conventional names to avoid typos, to show at a glance which tokens are recognised by default themes, and to play well with minification:

```js
import * as TOKENS from "@twinkleplop/core/tokens";

TOKENS.identifier; // "identifier"
TOKENS.keyword; // "keyword"
TOKENS.string; // "string"
TOKENS.function; // "function"   (dot access is fine — see note below)
```

Standard names include: `boolean`, `comment`, `function`, `identifier`, `keyword`, `number`, `operator`, `property`, `punctuation`, `regex`, `selector`, `string`, `template`, plus CSS-ish extras (`attribute`, `class_name`, `css_var`, `id`, `pseudo`, `unit`).

Custom token types can still be passed as plain strings to any helper:

```js
match("@media", "at_rule"); // "at_rule" is a custom token — just a string
```

> **Note on `TOKENS.function`**: because `function` is a reserved word, the module uses the ES2022 string-literal export form internally (`export { fn as "function" }`). Dot access (`TOKENS.function`) and bracket access (`TOKENS["function"]`) both resolve it.

---

## Rule factories

A rule object has at most one matcher (`match` / `range` / `match_within` / `any`) plus optional actions (`token`, `state`, `exit`, `boundary`). The helpers below build valid rule objects for you.

### `match(patterns, token, transition?)`

Build a rule with a token. `patterns` can be a single string, an array of strings, a `range(...)` tag, or a mix of both. `transition` is a partial rule spread into the result (see transition helpers below).

```js
match("const", TOKENS.keyword);
// → { match: "const", token: "keyword" }

match(["+", "-", "*", "/"], TOKENS.operator);
// → { match: ["+", "-", "*", "/"], token: "operator" }

match(DIGIT, TOKENS.number);
// → { token: "number", range: [["0","9"]] }

match(["_", "$", LETTER], TOKENS.identifier);
// → { match: ["_", "$"], range: [["a","z"],["A","Z"]], token: "identifier" }

match("/", TOKENS.regex, enter("regex_pattern"));
// → { match: "/", token: "regex", state: "regex_pattern" }
```

A single `match(...)` call can emit a rule with **both** `match` and `range` set — the compiler handles that natively and it lets you collapse what would otherwise be two rules (one for literal starts like `_`/`$`, one for letter ranges) into one.

### `on(patterns, transition?)`

Token-less variant of `match` — for rules that change state but don't emit a token. Same pattern rules as `match`.

```js
on(["_", "$", LETTER], goto("identifier_probe"));
// → { match: ["_", "$"], range: [["a","z"],["A","Z"]], state: "identifier_probe", exit: true }

on([" ", "\t", "\n", "\r"]);
// → { match: [" ", "\t", "\n", "\r"] }  (consume whitespace, stay in state)
```

### `range(pairs)`

Build a character-range tag to use inside `match(...)` or `on(...)`:

```js
range([["0", "7"]]); // octal digits
range([
  ["a", "z"],
  ["A", "Z"],
]); // letters
```

Pre-built range tags are re-exported for convenience:

```js
LOWER; // [["a","z"]]
UPPER; // [["A","Z"]]
LETTER; // [["a","z"], ["A","Z"]]
DIGIT; // [["0","9"]]
ALNUM; // [["a","z"], ["A","Z"], ["0","9"]]
HEX; // [["0","9"], ["a","f"], ["A","F"]]
```

### `keyword(words, transition?, token?)`

Whole-word match with a word-boundary check. Defaults `token` to `"keyword"`:

```js
keyword(["if", "else", "while"]);
// → { match: ["if","else","while"], boundary: true, token: "keyword" }

keyword(["true", "false"], {}, TOKENS.boolean);
// → { match: ["true","false"], boundary: true, token: "boolean" }

keyword(["return"], goto("regex_allow"));
// → { match: ["return"], boundary: true, token: "keyword", state: "regex_allow", exit: true }
```

Word-boundary means the character after the match must not be an identifier character (`[a-zA-Z0-9_$]`), so `return` matches but `returning` does not.

### `within(start, end, token, opts?)`

A bounded match — strings, comments, delimited blocks. `opts` can set `escape` (an escape-character prefix) and `multiline` (default `true`; set `false` to stop at newlines).

```js
within("//", "\n", TOKENS.comment);
// single-line comment

within("/*", "*/", TOKENS.comment);
// block comment

within('"', '"', TOKENS.string, { escape: "\\", multiline: true });
// double-quoted string with escapes, may span lines
```

### `fallback(opts?)`

Matches anything the other rules didn't claim. Equivalent to `{ any: true, ...opts }`.

```js
fallback(); // { any: true }  (consume + stay)
fallback({ token: TOKENS.regex }); // emit a token
fallback(leave()); // pop the state
fallback(goto("division")); // sideways transition (doesn't consume the char)
```

`any: true` combined with a sideways transition (`state + exit: true`) does **not** consume the character — it re-processes it in the destination state. This is how you "hand back" a character when you realise you're in the wrong context.

---

## Transition helpers

State transitions are just partial rule objects you spread into a full rule. All helpers return plain objects, so you can mix them freely with your own fields.

```js
enter("foo"); // → { state: "foo" }              push; enters foo, parent stays on stack
goto("foo"); // → { state: "foo", exit: true }  sideways; replaces current state
leave(); // → { exit: true }                pop; returns to parent
to("foo"); // → { state: "foo", exit: true }  same as goto
to(null); // → {}                            stay in current state
```

`to()` is convenient for parameterised rule factories where the destination may be `null` to mean "stay":

```js
const operators = (afterOp) => match(ALL_OPERATORS, TOKENS.operator, to(afterOp));

operators("regex_allow"); // sideways to regex_allow after an operator
operators(null); // stay — e.g. inside regex_allow where an operator keeps us here
```

### Which transition to use

| Helper     | Stack op      | When to use                                                                                                         |
| ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `enter(s)` | push          | Entering a nested context you'll return from (string body, parenthesised expression, regex pattern, …).             |
| `goto(s)`  | replace       | Changing context without nesting — e.g. flipping between `regex_allow` and `division`. The parent state is dropped. |
| `leave()`  | pop           | Exiting a nested context. The character IS consumed; use `fallback(leave())` to exit without consuming.             |
| `to(s?)`   | optional goto | Factory helpers that take a nullable destination — `null` = stay, string = goto.                                    |

---

## State shape

A state is an object with a `rules` array. Rules are tried top-to-bottom in order; the **first matching rule wins**. Multi-char patterns within any rule are compared longest-first inside each first-character bucket, so `/=` always beats `/` regardless of source order.

```js
states: {
  main: {
    rules: [ /* … */ ],
  },
  string: {
    rules: [ /* … */ ],
  },
}
```

Optional fields on a state:

| Field                              | Meaning                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `mode: "probe"`                    | Enter probe mode when this state is reached — see "Probe states" below.   |
| `fallback: "state_name"`           | Target state if probing hits EOF without matching (probe states only).    |
| `extend: "group_name"` or `[…]`    | Inherit rules from one or more groups declared at the top of the grammar. |
| `include: "ruleset_name"` or `[…]` | Prepend rules from a named ruleset (see below).                           |

### Sharing rules with arrays

Because states are plain objects, the easiest way to share rules is a regular JavaScript array you spread into each state's `rules`:

```js
const js_common = [
  within("//", "\n", TOKENS.comment),
  within("/*", "*/", TOKENS.comment),
  within('"', '"', TOKENS.string, { escape: "\\", multiline: true }),
  on([" ", "\t", "\n", "\r"]),
];

states: {
  main: {
    rules: [
      ...js_common,
      match(["(", "{", "["], TOKENS.punctuation, goto("regex_allow")),
      // …
    ],
  },
  division: {
    rules: [
      ...js_common,
      match("/", TOKENS.operator, goto("regex_allow")),
      // …
    ],
  },
}
```

This replaces most uses of the older `rulesets` / `include` machinery — a spread is simpler than a declared ruleset, and you can parameterise it with a plain function when the destination state varies:

```js
const operators = (after) => match(OP_ALL, TOKENS.operator, to(after));

states: {
  main:        { rules: [..., operators("regex_allow"), ...] },
  regex_allow: { rules: [..., operators(null), ...] },
}
```

### `include` and `extend` (still supported)

The compiler still accepts `include` on states and `extend` on groups when you want a declarative reusable block. `include` takes a ruleset name (or array of names) from the top-level `rulesets` field, and those rules are prepended to the state's own rules:

```js
export default {
  name: "javascript",
  rulesets: {
    js_strings: {
      rules: [
        within('"', '"', TOKENS.string, { escape: "\\", multiline: true }),
        within("'", "'", TOKENS.string, { escape: "\\", multiline: true }),
      ],
    },
  },
  states: {
    main: {
      include: "js_strings",
      rules: [
        /* own rules, tried AFTER included rules */
      ],
    },
  },
};
```

For most grammars, plain arrays + spread are simpler than rulesets; reach for `include`/`extend` only if you want a declarative reusable block.

---

## Probe states — resolving contextual ambiguity

Some grammars have tokens whose type depends on what comes next. CSS is the canonical case: after entering a block, you can't tell whether `a:hover one two three` is a chain of selectors or a property + value until you hit a `{`, `;`, `}`, or EOF.

A **probe state** scans ahead without committing. When it transitions to a non-probe state, the tokenizer rewinds its pointer to the position it was at when the probe started — but now with the correct target state. If the probe reaches EOF without matching, it transitions to `fallback`.

```js
identifier_probe: {
  mode: "probe",
  fallback: "identifier",
  rules: [
    on("(", goto("function_name")),
    on(
      [".", " ", ")", ";", "}", "{", "[", ",", ...OPERATORS],
      goto("identifier"),
    ),
  ],
},
```

Inside a probe state, rules are positive-match only — the probe keeps consuming characters until it either matches a rule or hits EOF. When it matches, the pointer rewinds and tokenization resumes in the new state with full context.

---

## Disambiguation rules

- **Maximal munch**: when one pattern is a prefix of another (`>` vs `>>`, `/` vs `/=`), the longer match wins. The compiler handles this automatically — all patterns in a first-char bucket are sorted by descending length, so you don't need to order your `match(...)` calls carefully.
- **Contextual ambiguity**: use probe states (above).
- **Word boundaries**: use `keyword(...)` (or pass `boundary: true` manually) so `return` doesn't match inside `returning`.

---

## Whitespace

Whitespace has no special treatment — add an explicit rule that consumes it without emitting a token if you want to skip it:

```js
on([" ", "\t", "\n", "\r"]);
```

---

## Writing a custom helper

Helpers are pure factories, so building your own is just a JS function that returns a rule or an array of rules:

```js
// Shortcut for a sideways transition that emits a punctuation token
const punct = (chars, dest) => match(chars, TOKENS.punctuation, goto(dest));

// Multi-rule helper — keyword branching for a language with two contexts
const keywords = (regexDest, divDest) => [
  keyword(REGEX_PRECEDING, to(regexDest)),
  keyword(VALUE_KEYWORDS, to(divDest)),
];
```

Custom helpers compose with the built-in ones and can be parameterised however you like — since it's just JavaScript, there are no artificial limits.



<!-- ---- TRANSFORMER_SPEC.md ---- -->

# Twinkleplop Annotation System

In-source directives extracted from comments, resolved against source, dispatched to plugins, emitting overlays. Runs **pre-grammar**; markers are replaced with whitespace of equal byte length so source coordinates remain stable.

This spec covers annotation only. Reclassifiers and modifying classifiers (e.g. diff prefix stripping, twoslash) are separate.

## Syntax

```
[!<verb>[#<id>][ <args>]]
```

- `!` — required sigil.
- `<verb>` — plugin-claimed identifier: `[a-zA-Z][a-zA-Z0-9_-]*`.
- `#<id>` — optional pair label.
- `<args>` — empty, or plugin-parsed text after a single space.
- Markers must not span newlines.
- Escape: `[\!...]` is literal text in output; the leading `\` is consumed during extraction.
- Whitespace inside brackets is allowed and normalised: stripped around structural punctuation, preserved inside quoted strings.

## Pipeline

Undecided. 

It may be better to process transformations _after_ initial tokenisation, as annotation transformers are contained within a language specific comment.

Adding a __SKIP__ token type, that causes the renderer to skip rendering and move onto the next is probably the cleanest way to 'remove' annotation comments from the rendered output (and useful for other cases).

**Trim** at render time: a line that contains only whitespace *after substitution but contained non-whitespace before* is elided. All other whitespace — including substituted whitespace inline — is preserved (so leading indentation under e.g. diff prefixes survives).


## Argument Grammar (shared)

Plugins receive parsed args by default. Forms:

| Form              | Meaning                                                        |
| ----------------- | -------------------------------------------------------------- |
| *(empty)*         | Line containing the marker                                     |
| `+N`              | N lines **after** the marker (excludes the marker's own line)  |
| `:N`              | Absolute line N (1-indexed)                                    |
| `:N..M`           | Absolute line range, **exclusive** (lines N+1..M-1)            |
| `:N...M`          | Absolute line range, **inclusive** (lines N..M)                |
| `<a>..<b>`        | Range from anchor `a` to anchor `b`, both exclusive            |
| `<a>...<b>`       | Range from anchor `a` to `b`, both inclusive                   |
| `<a>...` / `<a>..`| Half-open **start**; requires close                            |
| `...<b>` / `..<b>`| Half-open **end**; requires open                               |
| `=<a>`            | **All** matches of anchor `a`. Cannot be paired.               |

The dot rule is consistent throughout: `..` (two dots) excludes both endpoints, `...` (three dots) includes both. Mnemonic: more dots, more content.

### Anchors

- **Word**: bare text — whole-word match (word boundaries on both sides). Identifier rules are language-agnostic: word chars are `[A-Za-z0-9_]`.
- **Quoted**: `"..."` — substring match, no word-boundary constraint. Escapes: `\"`, `\\`.
- **Wildcard**: `*` — line-relative to the marker that contains the `*` literal. In start position expands to the start of that marker's line; in end position expands to the end of that marker's line (the byte before its trailing `\n`). For half-open pairs the wildcard can be in the closer marker, so `[!em foo...]` ... `[!em ...*]` spans from `foo` down to the end of the closer's line. `*..*` is invalid (no reference).
- **Resolution**: marker-relative. An anchor matches the **first occurrence at or after the marker's source position**.

## Pairing

- Half-open markers are paired with a stack scoped to `(verb, id?)`.
- Marker with start anchor + omitted end → push.
- Marker with end anchor + omitted start → pop top of matching stack.
- `#id` restricts pairing to markers sharing that id; without an id, only unlabelled markers pair.
- Set form (`=<a>`) cannot be paired.

## Errors (extraction-time, with source location)

- Verb claimed by multiple plugins (registration-time).
- Anchor not found.
- Unmatched open or close at end of source.
- Marker spans a newline.
- Set form combined with pairing syntax.
- Malformed: bad brackets, unterminated quote, unrecognised range form.

## Not error

- Unknown verb (no plugin claims it). An unknown verb is just a comment and should be left as is.


## Plugin Interface

```ts
interface AnnotationPlugin {
  verbs: string[];                  // verbs claimed
  parse?: 'shared' | 'raw';         // default 'shared'
  handle(input: AnnotationInput): AnnotationOutput;
}

interface AnnotationInput {
  verb: string;
  id?: string;
  args: ParsedArgs | string;        // string when parse: 'raw'
  range: SourceRange;               // resolved
  marker: SourcePosition;           // for diagnostics
}

interface AnnotationOutput {
  overlays?: OverlayContribution[];
}

type ParsedArgs =
  | { kind: 'bare' }
  | { kind: 'lineCount';  count: number }
  | { kind: 'lineRef';    from: number; to?: number }
  | { kind: 'range';      from: Anchor | null; to: Anchor | null; inclusiveEnd: boolean }
  | { kind: 'set';        anchor: Anchor };

type Anchor =
  | { kind: 'word';     value: string }
  | { kind: 'literal';  value: string }
  | { kind: 'wildcard' };
```

`from`/`to` may be `null` to signal half-open; pairing populates the missing side before dispatch, so plugins receive a fully resolved `SourceRange` in `range` regardless.

## Built-in Verbs (initial set)

| Verb          | Effect                                                              |
| ------------- | ------------------------------------------------------------------- |
| `em`          | Overlay with classification `emphasis`                              |
| `dim`         | Overlay with classification `subdued`                               |
| `hl`          | Overlay with classification `highlight`                             |
| `focus`       | Overlay with `focus`; renderer applies `not-focused` to siblings    |
| `add` / `del`/ `mod` | Overlay with classification `diff-add`, `diff-del`, diff-mod`          |
| `err` / `warn` / `info` | Diagnostic classifications                                |

Line classifications, get added as classnames to the line by the renderer. Sub-line classifications get added to the _line_ as a class name.

Annotations that span lines are not necessarily 'line annotations', they are token annotations that span lines. Only the explicit line annotations affect lines.

All use the shared grammar.

## Examples

```ts
// Bare — this line
const x = 1; // [!em]

// Closed range, single marker
const v = my_func(); // [!em my_func..console.log]
console.log(v);

// Half-open pair, multi-line
const x = my_func({  // [!em my_func...]
  a: 1,
  b: 2,
}).then(handle);     // [!em ...handle]

// Set form: all occurrences
// [!hl =Hello]
const g = 'Hello, World';

// Relative line count
// [!em +3]
one();
two();
three();

// Absolute lines
// [!em :5..7]

// Nested pairs with explicit ids
// [!em#outer foo...]
//   [!em#inner bar...]
//   [!em#inner ...baz]
// [!em#outer ...end]

// Escape — renders literally
// [\!em literal]
```

## Non-goals

- Regex anchors (`/.../`).
- Cross-file / cross-snippet ranges.
- `[!code ...]` Shiki-compat alias.
- Modifying classifiers (diff prefix stripping, twoslash, etc.) — separate spec.
- Annotation that emits anything other than overlays.



<!-- ---- unit 4 ---- -->


<!-- ---- architecture.md ---- -->

# Design Document: A High-Performance, Regex-Free Syntax Highlighter

## 1. Vision & Core Principles

This document outlines the design for a high-performance syntax highlighting library written in JavaScript. The primary goal is to create a tokenizer that is exceptionally fast, capable of highlighting large files in real-time without impacting user interface responsiveness.

**Performance Update:** Comprehensive benchmarking reveals that character scanning consistently outperforms regex in real-world tokenization scenarios. While regex shows advantages in isolated pattern matching, the overhead of string slicing, multiple pattern attempts, and failed matches makes character scanning 8-15x faster for actual parsing tasks.

The architecture is guided by four core principles:

- _Performance First:_ The runtime must be highly optimized. Character scanning with charCodeAt() provides the fastest tokenization, with computed array indices for state transitions (4.6x faster than string keys) and dense lookup tables for O(1) character classification.
- _Separation of Concerns:_ The core runtime engine is completely language-agnostic. All language-specific logic is defined in external, declarative data files. Cross-language concerns (embedding, enrichment) live in a separate post-tokenization layer — the reclassifier — so the hot-path tokenizer never needs to know about multi-language composition.
- _Declarative, User-Friendly Grammars:_ Language definitions should be intuitive for authors to create and maintain. The schema should be a high-level abstraction over the underlying state machine, focusing on describing the language's structure rather than the machine's implementation details.
- _Robustness and Power:_ The system handles complex, real-world language features including nested contexts (JavaScript template literals with brace-depth-tracked interpolations), cross-language embedding (HTML hosting CSS and JavaScript, JavaScript hosting HTML/CSS via tagged templates, arbitrary host grammars hosting sub-languages), interleaved content with preserved interpolation holes (attribute-position interpolations in lit-html-style templates), and grammatical ambiguities via probe-mode contextual disambiguation.

## 2. Core Architecture

The system is composed of two main parts: a generic Runtime Engine and language-specific Grammar Definitions.

### 2.1. Theoretical Model: Stack-Augmented Finite State Machine

The tokenizer is modeled as a Finite State Machine (FSM), the classic computational model for lexical analysis. This allows for linear-time (O(n)) processing of the input string.

See the following links for more info on FSM and compilers:

- [Lexical Analysis - An application of FSM](https://swaminathanj.github.io/fsm/lexer.html)
- [Lexical analysis Finite Automata](https://courses.cs.umbc.edu/331/fall13/01/notes/04/04bLexical.pdf)
- [Finite State Machines in Compiler Design](https://www.tutorialspoint.com/compiler_design/compiler_design_finite_state_machines.htm)

To handle nested and recursive language structures (e.g., JavaScript template literals), the FSM is augmented with a state stack. This elevates the model to a Pushdown Automaton, conceptually inspired by the hierarchical states of Statecharts. This provides a formal and robust mechanism for managing context.

For more info on statecharts, see the following links:

- [Statecharts definition](https://sismic.readthedocs.io/en/latest/format.html)
- [State diagram](https://en.wikipedia.org/wiki/State_diagram)

### 2.2. The Runtime Engine

The runtime is a small, efficient, and language-agnostic JavaScript module responsible for executing the tokenization process.

#### 2.2.1. Processing Loop

The core of the engine is a single `while` loop that iterates through the input string one character at a time. This loop maintains the current `position` and a `stateStack`. In each iteration, it performs a constant-time lookup based on the current character and the active state (the state at the top of the stack) to determine the next action.

#### 2.2.2. Performance Optimizations

**Based on comprehensive benchmarking of real tokenization scenarios:**

- _Character Code Scanning:_ The foundation of performance. Using `charCodeAt()` for direct character access avoids string allocation overhead. In realistic parsing scenarios, character scanning is 8-15x faster than regex due to avoiding string slicing and multiple pattern attempts.

- _Lookup Tables:_ Dense lookup tables (Uint8Array) provide O(1) performance for character classification. ASCII characters (0-127) use direct array indexing. Use computed array indices `(state * MAX_ACTIONS + action)` instead of string concatenation for transition keys - this provides 4.6x better performance.

- _State Machine Implementation:_ Use pre-allocated typed arrays for the state stack. Bit-packed state stacks can be 14% faster for languages with limited nesting depth (up to 10 levels can fit in a single 32-bit integer).

- _Context-Aware Chomping:_ When entering a known state (e.g., string literal, comment block), use specialized character scanning loops to consume the entire construct efficiently. This avoids the overhead of state transitions for predictable patterns.

#### 2.2.3. Output Format & Token Storage

The engine acts as a transducer, producing output as it processes the input ([Link for more info](https://en.wikipedia.org/wiki/Finite-state_machine)). Based on benchmarking, the optimal token storage strategy is:

- **Flat Uint32Array:** Store tokens as `[type, start, end]` triplets in a single typed array
  - 17,534 ops/sec - fastest approach, 1.4x faster than objects
  - Access pattern: `tokens[i*3]` = type, `tokens[i*3+1]` = start, `tokens[i*3+2]` = end
  - Pre-allocate capacity to avoid reallocation during parsing

- **Token Type Encoding:** Use integer IDs (0-255) instead of strings
  - Enables Uint8Array storage for types (1 byte vs 4 bytes)
  - 1.5x faster than Map lookups during rendering
  - Pre-compute class name array indexed by token type for O(1) rendering

The final rendering of this data into styled HTML is a separate, subsequent step.

### 2.3. The Reclassifier Pipeline

The tokenizer produces a raw token stream that is correct for single-language input but does not handle two important classes of problem:

1. **Multi-token lookahead refinement.** Recognizing that an `identifier` token should be reclassified as a `function` token based on multi-token patterns (Prism's "function-variable" case: `const foo = () => { }` → `foo` is a function). The state machine cannot cheaply express this — it would require chained probe states and balanced-paren matching at every `=` in the file.
2. **Cross-language embedding.** Handing off `<script>` content in HTML to the JavaScript tokenizer, or tokenizing the content of a JS tagged template literal (`` html`<div>${expr}</div>` ``) as HTML. A monolithic grammar approach requires either duplicating sub-language rules into the host grammar (~150 lines of JS template-mirror states for one language) or running multiple separate tokenizers with no composition.

Both of these are token-stream transformations: they take a `TokenizeResult` and produce a new `TokenizeResult`. They compose naturally as a **pipeline of pure transforms** that sits between the tokenizer and the renderer:

```
source → tokenize(hostGrammar) → raw tokens
raw tokens → reclassify([transform1, transform2, ...]) → enriched tokens
enriched tokens → toHtml()
```

The reclassifier is **architecturally outside the hot-path tokenizer**. The tokenizer stays focused on one language at a time and knows nothing about embedding or enrichment. Consumers who only want raw tokenization pay zero reclassifier cost. Consumers who want the full enriched experience compose transforms explicitly.

#### 2.3.1. Three Canonical Transforms

Three built-in transforms cover the space of token-stream modifications:

**`rewriteTypes(rules)`** — pattern-match windows of tokens and rewrite token type IDs in place. No new tokens, no position changes. Used for in-language refinement like function-variable detection. Rules are declarative using a small combinator DSL (`seq`, `type`, `anyOf`, `optional`, `capture`, `balancedParens`) with trivia skipping between pattern elements. Rules are indexed by anchor type ID for O(1) dispatch in the hot loop.

**`embedGrammars(mapping)`** — for host tokens of specific types (typically "raw" content spans emitted by the host grammar), invoke a sub-language on the token's source range and splice the result into the stream. Host tokens marking the embed point (e.g. the `<script>` tag) are decided by the HOST GRAMMAR — the reclassifier only executes the embedding. This is the correct separation because the host grammar has live parser state when deciding embed boundaries; the reclassifier only sees tokens after the fact. Used for HTML's `<script>` → JS and `<style>` → CSS.

**`embedInterleaved(config)`** — the generic solution for **discontinuous embedded content** where sub-language tokens are broken up by preserved host-language "holes". A host-specific scanner callback identifies groups in the token stream and describes them as a list of regions (content, hole, synthetic). The transform:

1. Builds a **virtual source** by concatenating content regions, filling hole regions with placeholder characters of matching byte length.
2. Sub-tokenizes the virtual source **in one call**, giving the sub-language full state continuity across holes.
3. Remaps virtual token positions back to real host source offsets via a piecewise-linear position map.
4. Splits any sub-tokens that straddle a content-hole boundary at the boundary and drops hole-internal pieces.
5. Emits regions in source order: content pieces (sub-tokens), holes (original host tokens passed verbatim), synthetic pieces (fresh tokens for host delimiter characters that are part of a larger host token).

The exemplar use case is JS tagged templates with attribute-position interpolations: `` html`<p class="${cls}">hi</p>` ``. The HTML sub-tokenizer sees a well-formed attribute value (with space-filled hole) and parses it correctly; the resulting string token is then split at the hole boundary so the `${cls}` JS tokens sit between two `"` string pieces.

#### 2.3.2. Region Kinds

`embedInterleaved` models a group as a sequence of three region kinds:

- **`content`** — source bytes copied into the virtual source and tokenized by the sub-language. Output: sub-tokens at remapped real positions.
- **`hole`** — source bytes replaced by placeholder in the virtual source (so the sub-tokenizer's state flows past them). Output: the original host tokens for this range, passed through verbatim.
- **`synthetic`** — neither virtual nor passthrough. A NEW token is synthesized at the region's position with a user-specified type name. This handles delimiter characters that are part of a larger host token but need to appear as separate tokens in the output — e.g. the `` ` `` at the start of a JS tagged template's first token, which must emit as a standalone `template` token so it stays styled.

#### 2.3.3. Fixed-Point Iteration for Nested Cases

When a host language can contain itself inside an interpolation hole (e.g. `` html`<style>${css`body { color: red; }`}</style>` ``), a single scan pass finds only the outer group and emits the inner group's tokens verbatim as part of the hole. `embedInterleaved` runs its single-pass transform **iteratively** until it reaches a fixed point — the first pass handles the outermost groups, subsequent passes peel off one level of nesting each. Termination is detected when a pass produces the same reference as its input (no groups found). A safety bound guards against pathological scanners.

#### 2.3.4. Flat Token-Type Merging

When a sub-language contributes token types the host doesn't have (e.g. HTML's `tag-name` appearing inside a JS tagged template), those types are merged into a cloned `tokenTypes` array by name. Shared type names (`identifier`, `keyword`, `string`, `comment`) deduplicate. Host type IDs are preserved so rules compiled against the host's original vocabulary keep working after sub-language types are appended. The output is still a plain `TokenizeResult` — the renderer needs no changes to handle multi-language tokens.

#### 2.3.5. Three-Tier Language Package API

Every language package exports three things at the same name level:

- **`grammar`** — the compiled base grammar. Consumers who want raw tokens and zero pipeline cost import this.
- **`reclassifiers`** — the language's default reclassifier list (e.g. function-variable detection + tagged-template embedding for JavaScript). Consumers who want to prepend or append their own rules import this.
- **`language`** — a one-call convenience function `(input) → TokenizeResult` built via `createLanguage(grammar, reclassifiers)`. Runs tokenize + the full reclassifier pipeline. This is what most consumers use.

`createLanguage` is a core-provided helper so every language package composes its pipeline the same way.

#### 2.3.6. Pure Transforms

Reclassifiers come in two contracts, both pure with respect to the caller's input:

- **Claim producers** (the common case — every type-only pass): expose a `__claim` method that reads a frozen token stream and emits `(token_idx, type_id, precedence)` claims into a sink. They never write token slots; they may append new names to the batch's cloned `token_types`. The pipeline runner batches consecutive claim producers against the same base stream, merges claims by precedence (ties resolve to the earlier pipeline entry), and applies the winners in one flush — cloning `tokens` only when at least one claim fired. Within a batch, ordering does not decide conflicts; precedences do, and this is enforced by permutation tests.
- **Shape and embed transforms** (`(input, TokenizeResult) → TokenizeResult`): passes that change token count or splice sub-language streams. These clone `tokens` and `token_types` before mutating, run sequentially, and break claim batches.

Empty pipelines return the input reference unchanged, so `reclassify([])` is free (~40 ns per call). The convenience `language()` function has no measurable overhead vs a manually composed pipeline.

## 3. Language Definition Schema

Language grammars are defined in a declarative, serializable JSON format. This format is designed to be an intuitive abstraction, hiding the underlying complexity of the state machine from the grammar author.

### 3.1. Top-Level Structure

A language definition is a JSON object with two root properties:

- `"name"`: A string identifying the language (e.g., `"javascript"`).
- `"states"`: An object where each key is a state name (e.g., `"main"`, `"template_literal"`) and the value is an object containing a `rule` property that is an array of rules.

The first state defined in the states object is implicitly the initial state for tokenization.

```JSON
{
  "name": "javascript",
  "states": {
    "main": {
      "rules": [ /* rules for the main state */ ],
    },
    "template_literal":{
      "rules": [ /* rules for the template_literal state */ ]
    }
  }
}
```

### 3.2. Rule Object Structure

Each state is defined by an array of rule objects. The engine evaluates these rules in the order they appear in the array. A rule object can contain the following properties:

#### 3.2.1. Matchers

A rule must contain exactly one matcher property:

- `"match"`: Matches an exact string or an array of strings. Ideal for keywords, operators, and other fixed sequences.
  - `{ "match": "const", "token": "keyword" }`
  - `{ "match": ["+", "-", "*", "/"], "token": "operator" }`
- `"range"`: Matches a single character if it falls within a specified range or set of ranges.
  - `{ "range": ["a", "z"], "token": "identifier" }`
  - `{ "range": [["0", "9"], ["A", "F"]], "token": "hex*digit" }`

#### 3.2.2. Actions

A rule specifies actions to be taken upon a successful match:

- `"token"`: An optional string that defines the token type for the matched text (e.g., `"keyword"`, `"string"`). If `token` is not present then the pointer will not be progressed and no token will be generated.
- `"state"`: Pushes a new state onto the stack. This is used with begin/end rules to apply a different set of rules to the content between the delimiters. It can also be used with a match rule to handle recursive language constructs. A state can be progressed without generating a token and consuming the current character.
- `"exit"`: A context-aware pop operation. The value is the name of the expected parent state. The rule only matches if the state immediately below the current one on the stack is the one specified. This provides a robust way to exit nested contexts. `exit` can also be `true` which simply exits the current state.
  - `{ "match": "}", "token": "punctuation", "exit": "template_literal" }`

#### 3.2.3 Triggering modes to handle ambiguity

A rule can optionally have a `mode` property that determines the behaviour of the tokenizer. This can be `tokenize` and `probe`

By default the mode is `tokenize` and will progress the pointer and generate tokens if a `token` is defined

In some cases it isn't possible to know what you are dealing with until you enter a disambiguating token, lets use CSS as an example. CSS has simple syntax but is highly recursive, lets take the following valid CSS:

```css
div {
  a:hover one two three {
    a: hover one two three;
  }
}
```

After we enter the `div` block it is impossible to know is `a:hover one two three` is a chain of selectors or a property and a value until we see either a `{`, a `;` or some kind of terminator (a closing brace or EOF). Normal states without tokens (transition only states) aren't powerful here because we actually need to continue scanning the input stream. In order to disambiguate these cases, twinkleplop supports `probing` a kind of controlled backtracking . When `mode: probe` states will transition as normal and characters will be matched but upon moving to a state that has a `mode: tokenise` the pointer will reset to the index it had when `mode: probe` was initialised.

An example can illustrate:

After entering the div and working through whitespace we are here:

```css
...
v
a:hover one two three {
    a:hover one two three;
  }
}
```

We cannot determine the token type at this point so we enter probe mode. We then progress until we reach a disambiguating character, in the simple case `{` or `;`.

```css
...
                      v
a:hover one two three {
    a:hover one two three;
  }
}
```

At this point we know if it is a selector or a property. So we transition to the appropriate state (`selector`). Since that state has `mode: tokenize`, we go back to the index we were in when we initialised the probe mode but now with new information about our context.

```css
...
v
a:hover one two three {
    a:hover one two three;
  }
}
```

### 3.3. Handling Ambiguity

- _Maximal Munch Principle:_ For ambiguities where one token is a prefix of another (e.g., `>` vs. `>>`, `#if` vs. `#ifdef`), the engine must adhere to the "longest match" rule. Character lookahead (10,568 ops/sec) outperforms complex trie matching (1,794 ops/sec) by 5.9x. Order rules from longest to shortest and use simple character lookahead.
- _Contextual Ambiguity:_ For ambiguities where a token's role depends on what follows it (e.g., CSS nested selectors), using the `mode` option to probe the state is utilised.

## 4. Implementation & Optimization

### 4.1. The "Compilation" Phase

The declarative JSON grammars are not interpreted directly at runtime. When a language is first loaded, it undergoes a one-time compilation process that transforms the user-friendly definition into a highly optimized in-memory representation for the runtime engine.

This process includes:

- _Integer Mapping:_ All string identifiers for states and tokens are mapped to unique integers for faster comparisons. String-keyed lookups are 4.6x slower than computed indices.
  - Token types mapped to 0-255 range for Uint8Array storage
  - Pre-compute CSS class names array indexed by token type
  - Benchmark: 3,626 ops/sec with bit-packed types vs 2,374 with Map lookups

- _Transition Table Generation:_ Compile state transitions into a flat typed array using computed indices: `transitionTable[(state * MAX_ACTIONS + action) * 3]` storing `[newState, tokenType, stackOp]` triplets. This approach benchmarks at ~3,956 ops/sec vs 858 ops/sec for string-keyed objects.

- _Lookup Table Generation:_ Range rules are compiled into dense Uint8Arrays for ASCII (0-127) providing O(1) lookups. For Unicode, use a hybrid approach: array for ASCII + Map for extended ranges. Benchmarks show 128-entry lookup tables outperform all alternatives.

- _Character Pattern Compilation:_ Convert string patterns into optimized character code sequences for direct comparison. Keywords are stored in a Set for O(1) lookup after identifier scanning.

### 4.2. Whitespace Handling

Whitespace between tokens is handled implicitly by the runtime engine and should be ignored. The lookahead assertion mechanism (`peek`) must also be implemented to automatically skip over whitespace between the matched token and the lookahead assertion point.

## 5. Token Naming Convention

The system will adopt a simple, flat token naming convention, avoiding the complexity of dot-separated hierarchical scopes found in TextMate.9 Standard token names like `keyword`, `string`, `comment`, `number`, `operator`, `punctuation`, `property`, and `selector` are encouraged. This aligns with modern systems like VS Code's semantic highlighting and simplifies the creation of themes.

## 6. Performance Guidelines

Based on comprehensive benchmarking of realistic tokenization scenarios:

### 6.1. Core Performance Strategy

- **Character Scanning is Primary:**
  - 8-15x faster than regex in real parsing scenarios
  - Avoids string slicing overhead (66x performance penalty with regex)
  - No pattern compilation or failed match costs
  - Direct memory access via charCodeAt()
  - Single pass through input

- **Why Initial Benchmarks Were Misleading:**
  - Isolated benchmarks used global regex matching (unrealistic)
  - Real parsing requires position-by-position attempts
  - Each regex test requires string slicing
  - Multiple patterns must be tried (10-15x overhead)
  - Failed matches are common and expensive

- **Use Lookup Tables for:**
  - Character classification (alphanumeric, operators)
  - O(1) performance guaranteed
  - Dense Uint8Array for ASCII (0-127)
  - Computed indices for state transitions

### 6.2. Optimal Data Structures

Based on comprehensive benchmarking:

1. **Token Storage:** Flat Uint32Array with triplets `[type, start, end]`
   - 17,534 ops/sec (fastest), 1.4x faster than objects
   - Pre-allocate with capacity to avoid reallocation
   - Access: `tokens[i*3]` = type, `tokens[i*3+1]` = start, `tokens[i*3+2]` = end

2. **Token Types:** Integer encoding (0-255) with Uint8Array
   - 3,626 ops/sec with bit-packed types
   - 1.5x faster than Map lookups during rendering
   - Pre-compute class name array for O(1) rendering

3. **Structure of Arrays (SoA) Alternative:**
   - Separate arrays: `Uint8Array` for types, `Uint32Array` for positions
   - 16,769 ops/sec - nearly as fast as flat array
   - Better for type-specific operations (filtering, counting)

### 6.3. Optimization Techniques

1. **State Transitions:** Use computed indices `(state * MAX_ACTIONS + action) * 3` in flat typed arrays (4.6x faster)
2. **Stack Operations:** Pre-allocate typed arrays, consider bit-packing for shallow nesting (14% faster)
3. **Keyword Matching:** Scan identifiers with charCodeAt(), then Set lookup for classification
4. **Context Chomping:** When in known state, use tight character loops to consume constructs
5. **Memory Layout:** Keep hot data contiguous for cache locality
6. **Avoid:** String slicing, regex in hot paths, string concatenation, generator patterns (79% slower)

## 7. Testing Strategy

To ensure correctness and facilitate contributions, the library will support testing methodologies adapted from existing, mature highlighters.

- _Snapshot Testing:_ Based on the Prism.js test suite, this involves a test file containing a code snippet and a corresponding JSON file representing the expected token stream. This is ideal for verifying the entire output for a given file. [See Prism testing guide for more info](https://prismjs.com/test-suite.html)
- _Assertion-Based Testing_: Based on the TextMate grammar test model, this allows assertions to be written directly into test files as comments (e.g., `// ^ keyword`). This is excellent for targeted unit tests of specific language features.Adopting these formats allows for the potential reuse of the vast test suites from these projects, providing a strong foundation for correctness. [See tmgrammmer tests for more info](https://github.com/PanAeon/vscode-tmgrammar-test)



<!-- ---- unit 5 ---- -->

---
title: Twinkleplop
tags: [demo, showcase]
---

# Twinkleplop

> A **regex-free** syntax highlighter with _opt-in_ fidelity. ~~Slow~~ **fast**.

## Features &amp; friends

1. Language packs with [docs](https://example.com "home").
2. `inline code` and fenced blocks:

```js
const greet = (name) => `hi, ${name}`;
```

    // indented code block
    const x = 1 + 2;

- [x] ship demo
      second line after a hard break
- [ ] celebrate

Escapes: \* not italic, \# not a heading.

---

Visit <https://example.com> or email <hi@example.com>.

![logo](./logo.png)



<!-- ---- unit 6 ---- -->


<!-- ---- blockquote.md ---- -->

> a simple quote

> quote with **bold** inside

> > nested quote

> # heading in quote



<!-- ---- code_span.md ---- -->

a `code` span.

`code with *asterisks* inside` stays literal.

An `unclosed code and more
text.



<!-- ---- composition.md ---- -->

**bold with *italic nested* bold**

*italic with `code inside` italic*

**bold with `code` bold**

~~strike with **bold** strike~~

*italic [link text](https://example.com) italic*

[link with **bold** and `code` inside](url)

**[bold link](url) followed by bold**

*~~italic strike~~*

**bold *italic ~~and strike~~ back to italic* bold**

`plain code` outside emphasis

*italic containing <https://autolink> inside*

**bold across ![image alt](img.png) bold**

`code` then **bold** then *italic* flat



<!-- ---- emphasis.md ---- -->

**bold text**

*italic text*

***both***

~~strikethrough~~

**outer *inner* outer**

*emph with `code` inside*

__underscore bold__

_underscore italic_

**unclosed bold



<!-- ---- escape_entity.md ---- -->

\*not emphasis\* and \\ literal backslash.

entity: &amp; &copy; &#42; &#x2a;

a hard break\
continues here.



<!-- ---- fenced_code.md ---- -->

```js
const x = 1;
```

```
no language
```

~~~python
print("tilde fence")
~~~



<!-- ---- front_matter.md ---- -->

---
title: Hello
date: 2026-04-14
---

# First heading

A paragraph.



<!-- ---- headings.md ---- -->

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

# Heading with **bold** and *italic*

#notaheading

####### not a heading either

#



<!-- ---- indented_code.md ---- -->

a paragraph first.

    four spaces of code
    line two

back to paragraph.



<!-- ---- links.md ---- -->

[text](https://example.com)

[with title](https://example.com "Example")

[reference][label]

[just brackets]

![image alt](image.png)

See <https://auto.link> for details.



<!-- ---- lists.md ---- -->

- first bullet
- second bullet
* star bullet
+ plus bullet

- [ ] open task
- [x] done task
- [X] capital done



<!-- ---- mixed.md ---- -->

# Project Readme

A short **intro** paragraph with a [link](https://example.com) and `inline code`.

## Install

```bash
pnpm install
```

## Features

- fast
- **bold** feature
- [ ] roadmap item

> Note: read the docs.

---

See <https://example.com> for more.



<!-- ---- thematic_break.md ---- -->

above

---

below

***

more

___

end



<!-- ---- unit 7 ---- -->


<!-- ---- grammar.md ---- -->

# Language Definition Guide

Grammars are plain JavaScript modules built with a small set of helpers from `@twinkleplop/core`. Each helper is a pure factory that returns a rule (or partial rule) object — the compiler doesn't care whether you hand-write those objects or call a helper. The helpers just remove boilerplate and let you compose rules with ordinary JS (spread, `map`, function calls).

```js
import {
  match,
  on,
  keyword,
  within,
  fallback,
  range,
  enter,
  goto,
  leave,
  to,
  LETTER,
  DIGIT,
  ALNUM,
  HEX,
} from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";

export default {
  name: "mylang",
  states: {
    main: {
      rules: [
        within("//", "\n", TOKENS.comment),
        keyword(["if", "else", "while"]),
        match(["_", "$", LETTER], TOKENS.identifier),
        match(DIGIT, TOKENS.number),
        match(["+", "-", "*", "/"], TOKENS.operator),
      ],
    },
  },
};
```

The first state declared in `states` is the initial state for tokenization.

---

## Token names

Token types are just strings. Any string is valid. `@twinkleplop/core/tokens` exports a set of conventional names to avoid typos, to show at a glance which tokens are recognised by default themes, and to play well with minification:

```js
import * as TOKENS from "@twinkleplop/core/tokens";

TOKENS.identifier; // "identifier"
TOKENS.keyword; // "keyword"
TOKENS.string; // "string"
TOKENS.function; // "function"   (dot access is fine — see note below)
```

Standard names include: `boolean`, `comment`, `function`, `identifier`, `keyword`, `number`, `operator`, `property`, `punctuation`, `regex`, `selector`, `string`, `template`, plus CSS-ish extras (`attribute`, `class_name`, `css_var`, `id`, `pseudo`, `unit`).

Custom token types can still be passed as plain strings to any helper:

```js
match("@media", "at_rule"); // "at_rule" is a custom token — just a string
```

> **Note on `TOKENS.function`**: because `function` is a reserved word, the module uses the ES2022 string-literal export form internally (`export { fn as "function" }`). Dot access (`TOKENS.function`) and bracket access (`TOKENS["function"]`) both resolve it.

---

## Rule factories

A rule object has at most one matcher (`match` / `range` / `match_within` / `any`) plus optional actions (`token`, `state`, `exit`, `boundary`). The helpers below build valid rule objects for you.

### `match(patterns, token, transition?)`

Build a rule with a token. `patterns` can be a single string, an array of strings, a `range(...)` tag, or a mix of both. `transition` is a partial rule spread into the result (see transition helpers below).

```js
match("const", TOKENS.keyword);
// → { match: "const", token: "keyword" }

match(["+", "-", "*", "/"], TOKENS.operator);
// → { match: ["+", "-", "*", "/"], token: "operator" }

match(DIGIT, TOKENS.number);
// → { token: "number", range: [["0","9"]] }

match(["_", "$", LETTER], TOKENS.identifier);
// → { match: ["_", "$"], range: [["a","z"],["A","Z"]], token: "identifier" }

match("/", TOKENS.regex, enter("regex_pattern"));
// → { match: "/", token: "regex", state: "regex_pattern" }
```

A single `match(...)` call can emit a rule with **both** `match` and `range` set — the compiler handles that natively and it lets you collapse what would otherwise be two rules (one for literal starts like `_`/`$`, one for letter ranges) into one.

### `on(patterns, transition?)`

Token-less variant of `match` — for rules that change state but don't emit a token. Same pattern rules as `match`.

```js
on(["_", "$", LETTER], goto("identifier_probe"));
// → { match: ["_", "$"], range: [["a","z"],["A","Z"]], state: "identifier_probe", exit: true }

on([" ", "\t", "\n", "\r"]);
// → { match: [" ", "\t", "\n", "\r"] }  (consume whitespace, stay in state)
```

### `range(pairs)`

Build a character-range tag to use inside `match(...)` or `on(...)`:

```js
range([["0", "7"]]); // octal digits
range([
  ["a", "z"],
  ["A", "Z"],
]); // letters
```

Pre-built range tags are re-exported for convenience:

```js
LOWER; // [["a","z"]]
UPPER; // [["A","Z"]]
LETTER; // [["a","z"], ["A","Z"]]
DIGIT; // [["0","9"]]
ALNUM; // [["a","z"], ["A","Z"], ["0","9"]]
HEX; // [["0","9"], ["a","f"], ["A","F"]]
```

### `keyword(words, transition?, token?)`

Whole-word match with a word-boundary check. Defaults `token` to `"keyword"`:

```js
keyword(["if", "else", "while"]);
// → { match: ["if","else","while"], boundary: true, token: "keyword" }

keyword(["true", "false"], {}, TOKENS.boolean);
// → { match: ["true","false"], boundary: true, token: "boolean" }

keyword(["return"], goto("regex_allow"));
// → { match: ["return"], boundary: true, token: "keyword", state: "regex_allow", exit: true }
```

Word-boundary means the character after the match must not be an identifier character (`[a-zA-Z0-9_$]`), so `return` matches but `returning` does not.

### `within(start, end, token, opts?)`

A bounded match — strings, comments, delimited blocks. `opts` can set `escape` (an escape-character prefix) and `multiline` (default `true`; set `false` to stop at newlines).

```js
within("//", "\n", TOKENS.comment);
// single-line comment

within("/*", "*/", TOKENS.comment);
// block comment

within('"', '"', TOKENS.string, { escape: "\\", multiline: true });
// double-quoted string with escapes, may span lines
```

### `fallback(opts?)`

Matches anything the other rules didn't claim. Equivalent to `{ any: true, ...opts }`.

```js
fallback(); // { any: true }  (consume + stay)
fallback({ token: TOKENS.regex }); // emit a token
fallback(leave()); // pop the state
fallback(goto("division")); // sideways transition (doesn't consume the char)
```

`any: true` combined with a sideways transition (`state + exit: true`) does **not** consume the character — it re-processes it in the destination state. This is how you "hand back" a character when you realise you're in the wrong context.

---

## Transition helpers

State transitions are just partial rule objects you spread into a full rule. All helpers return plain objects, so you can mix them freely with your own fields.

```js
enter("foo"); // → { state: "foo" }              push; enters foo, parent stays on stack
goto("foo"); // → { state: "foo", exit: true }  sideways; replaces current state
leave(); // → { exit: true }                pop; returns to parent
to("foo"); // → { state: "foo", exit: true }  same as goto
to(null); // → {}                            stay in current state
```

`to()` is convenient for parameterised rule factories where the destination may be `null` to mean "stay":

```js
const operators = (afterOp) => match(ALL_OPERATORS, TOKENS.operator, to(afterOp));

operators("regex_allow"); // sideways to regex_allow after an operator
operators(null); // stay — e.g. inside regex_allow where an operator keeps us here
```

### Which transition to use

| Helper     | Stack op      | When to use                                                                                                         |
| ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `enter(s)` | push          | Entering a nested context you'll return from (string body, parenthesised expression, regex pattern, …).             |
| `goto(s)`  | replace       | Changing context without nesting — e.g. flipping between `regex_allow` and `division`. The parent state is dropped. |
| `leave()`  | pop           | Exiting a nested context. The character IS consumed; use `fallback(leave())` to exit without consuming.             |
| `to(s?)`   | optional goto | Factory helpers that take a nullable destination — `null` = stay, string = goto.                                    |

---

## State shape

A state is an object with a `rules` array. Rules are tried top-to-bottom in order; the **first matching rule wins**. Multi-char patterns within any rule are compared longest-first inside each first-character bucket, so `/=` always beats `/` regardless of source order.

```js
states: {
  main: {
    rules: [ /* … */ ],
  },
  string: {
    rules: [ /* … */ ],
  },
}
```

Optional fields on a state:

| Field                              | Meaning                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `mode: "probe"`                    | Enter probe mode when this state is reached — see "Probe states" below.   |
| `fallback: "state_name"`           | Target state if probing hits EOF without matching (probe states only).    |
| `extend: "group_name"` or `[…]`    | Inherit rules from one or more groups declared at the top of the grammar. |
| `include: "ruleset_name"` or `[…]` | Prepend rules from a named ruleset (see below).                           |

### Sharing rules with arrays

Because states are plain objects, the easiest way to share rules is a regular JavaScript array you spread into each state's `rules`:

```js
const js_common = [
  within("//", "\n", TOKENS.comment),
  within("/*", "*/", TOKENS.comment),
  within('"', '"', TOKENS.string, { escape: "\\", multiline: true }),
  on([" ", "\t", "\n", "\r"]),
];

states: {
  main: {
    rules: [
      ...js_common,
      match(["(", "{", "["], TOKENS.punctuation, goto("regex_allow")),
      // …
    ],
  },
  division: {
    rules: [
      ...js_common,
      match("/", TOKENS.operator, goto("regex_allow")),
      // …
    ],
  },
}
```

This replaces most uses of the older `rulesets` / `include` machinery — a spread is simpler than a declared ruleset, and you can parameterise it with a plain function when the destination state varies:

```js
const operators = (after) => match(OP_ALL, TOKENS.operator, to(after));

states: {
  main:        { rules: [..., operators("regex_allow"), ...] },
  regex_allow: { rules: [..., operators(null), ...] },
}
```

### `include` and `extend` (still supported)

The compiler still accepts `include` on states and `extend` on groups when you want a declarative reusable block. `include` takes a ruleset name (or array of names) from the top-level `rulesets` field, and those rules are prepended to the state's own rules:

```js
export default {
  name: "javascript",
  rulesets: {
    js_strings: {
      rules: [
        within('"', '"', TOKENS.string, { escape: "\\", multiline: true }),
        within("'", "'", TOKENS.string, { escape: "\\", multiline: true }),
      ],
    },
  },
  states: {
    main: {
      include: "js_strings",
      rules: [
        /* own rules, tried AFTER included rules */
      ],
    },
  },
};
```

For most grammars, plain arrays + spread are simpler than rulesets; reach for `include`/`extend` only if you want a declarative reusable block.

---

## Probe states — resolving contextual ambiguity

Some grammars have tokens whose type depends on what comes next. CSS is the canonical case: after entering a block, you can't tell whether `a:hover one two three` is a chain of selectors or a property + value until you hit a `{`, `;`, `}`, or EOF.

A **probe state** scans ahead without committing. When it transitions to a non-probe state, the tokenizer rewinds its pointer to the position it was at when the probe started — but now with the correct target state. If the probe reaches EOF without matching, it transitions to `fallback`.

```js
identifier_probe: {
  mode: "probe",
  fallback: "identifier",
  rules: [
    on("(", goto("function_name")),
    on(
      [".", " ", ")", ";", "}", "{", "[", ",", ...OPERATORS],
      goto("identifier"),
    ),
  ],
},
```

Inside a probe state, rules are positive-match only — the probe keeps consuming characters until it either matches a rule or hits EOF. When it matches, the pointer rewinds and tokenization resumes in the new state with full context.

---

## Disambiguation rules

- **Maximal munch**: when one pattern is a prefix of another (`>` vs `>>`, `/` vs `/=`), the longer match wins. The compiler handles this automatically — all patterns in a first-char bucket are sorted by descending length, so you don't need to order your `match(...)` calls carefully.
- **Contextual ambiguity**: use probe states (above).
- **Word boundaries**: use `keyword(...)` (or pass `boundary: true` manually) so `return` doesn't match inside `returning`.

---

## Whitespace

Whitespace has no special treatment — add an explicit rule that consumes it without emitting a token if you want to skip it:

```js
on([" ", "\t", "\n", "\r"]);
```

---

## Writing a custom helper

Helpers are pure factories, so building your own is just a JS function that returns a rule or an array of rules:

```js
// Shortcut for a sideways transition that emits a punctuation token
const punct = (chars, dest) => match(chars, TOKENS.punctuation, goto(dest));

// Multi-rule helper — keyword branching for a language with two contexts
const keywords = (regexDest, divDest) => [
  keyword(REGEX_PRECEDING, to(regexDest)),
  keyword(VALUE_KEYWORDS, to(divDest)),
];
```

Custom helpers compose with the built-in ones and can be parameterised however you like — since it's just JavaScript, there are no artificial limits.



<!-- ---- TRANSFORMER_SPEC.md ---- -->

# Twinkleplop Annotation System

In-source directives extracted from comments, resolved against source, dispatched to plugins, emitting overlays. Runs **pre-grammar**; markers are replaced with whitespace of equal byte length so source coordinates remain stable.

This spec covers annotation only. Reclassifiers and modifying classifiers (e.g. diff prefix stripping, twoslash) are separate.

## Syntax

```
[!<verb>[#<id>][ <args>]]
```

- `!` — required sigil.
- `<verb>` — plugin-claimed identifier: `[a-zA-Z][a-zA-Z0-9_-]*`.
- `#<id>` — optional pair label.
- `<args>` — empty, or plugin-parsed text after a single space.
- Markers must not span newlines.
- Escape: `[\!...]` is literal text in output; the leading `\` is consumed during extraction.
- Whitespace inside brackets is allowed and normalised: stripped around structural punctuation, preserved inside quoted strings.

## Pipeline

Undecided. 

It may be better to process transformations _after_ initial tokenisation, as annotation transformers are contained within a language specific comment.

Adding a __SKIP__ token type, that causes the renderer to skip rendering and move onto the next is probably the cleanest way to 'remove' annotation comments from the rendered output (and useful for other cases).

**Trim** at render time: a line that contains only whitespace *after substitution but contained non-whitespace before* is elided. All other whitespace — including substituted whitespace inline — is preserved (so leading indentation under e.g. diff prefixes survives).


## Argument Grammar (shared)

Plugins receive parsed args by default. Forms:

| Form              | Meaning                                                        |
| ----------------- | -------------------------------------------------------------- |
| *(empty)*         | Line containing the marker                                     |
| `+N`              | N lines **after** the marker (excludes the marker's own line)  |
| `:N`              | Absolute line N (1-indexed)                                    |
| `:N..M`           | Absolute line range, **exclusive** (lines N+1..M-1)            |
| `:N...M`          | Absolute line range, **inclusive** (lines N..M)                |
| `<a>..<b>`        | Range from anchor `a` to anchor `b`, both exclusive            |
| `<a>...<b>`       | Range from anchor `a` to `b`, both inclusive                   |
| `<a>...` / `<a>..`| Half-open **start**; requires close                            |
| `...<b>` / `..<b>`| Half-open **end**; requires open                               |
| `=<a>`            | **All** matches of anchor `a`. Cannot be paired.               |

The dot rule is consistent throughout: `..` (two dots) excludes both endpoints, `...` (three dots) includes both. Mnemonic: more dots, more content.

### Anchors

- **Word**: bare text — whole-word match (word boundaries on both sides). Identifier rules are language-agnostic: word chars are `[A-Za-z0-9_]`.
- **Quoted**: `"..."` — substring match, no word-boundary constraint. Escapes: `\"`, `\\`.
- **Wildcard**: `*` — line-relative to the marker that contains the `*` literal. In start position expands to the start of that marker's line; in end position expands to the end of that marker's line (the byte before its trailing `\n`). For half-open pairs the wildcard can be in the closer marker, so `[!em foo...]` ... `[!em ...*]` spans from `foo` down to the end of the closer's line. `*..*` is invalid (no reference).
- **Resolution**: marker-relative. An anchor matches the **first occurrence at or after the marker's source position**.

## Pairing

- Half-open markers are paired with a stack scoped to `(verb, id?)`.
- Marker with start anchor + omitted end → push.
- Marker with end anchor + omitted start → pop top of matching stack.
- `#id` restricts pairing to markers sharing that id; without an id, only unlabelled markers pair.
- Set form (`=<a>`) cannot be paired.

## Errors (extraction-time, with source location)

- Verb claimed by multiple plugins (registration-time).
- Anchor not found.
- Unmatched open or close at end of source.
- Marker spans a newline.
- Set form combined with pairing syntax.
- Malformed: bad brackets, unterminated quote, unrecognised range form.

## Not error

- Unknown verb (no plugin claims it). An unknown verb is just a comment and should be left as is.


## Plugin Interface

```ts
interface AnnotationPlugin {
  verbs: string[];                  // verbs claimed
  parse?: 'shared' | 'raw';         // default 'shared'
  handle(input: AnnotationInput): AnnotationOutput;
}

interface AnnotationInput {
  verb: string;
  id?: string;
  args: ParsedArgs | string;        // string when parse: 'raw'
  range: SourceRange;               // resolved
  marker: SourcePosition;           // for diagnostics
}

interface AnnotationOutput {
  overlays?: OverlayContribution[];
}

type ParsedArgs =
  | { kind: 'bare' }
  | { kind: 'lineCount';  count: number }
  | { kind: 'lineRef';    from: number; to?: number }
  | { kind: 'range';      from: Anchor | null; to: Anchor | null; inclusiveEnd: boolean }
  | { kind: 'set';        anchor: Anchor };

type Anchor =
  | { kind: 'word';     value: string }
  | { kind: 'literal';  value: string }
  | { kind: 'wildcard' };
```

`from`/`to` may be `null` to signal half-open; pairing populates the missing side before dispatch, so plugins receive a fully resolved `SourceRange` in `range` regardless.

## Built-in Verbs (initial set)

| Verb          | Effect                                                              |
| ------------- | ------------------------------------------------------------------- |
| `em`          | Overlay with classification `emphasis`                              |
| `dim`         | Overlay with classification `subdued`                               |
| `hl`          | Overlay with classification `highlight`                             |
| `focus`       | Overlay with `focus`; renderer applies `not-focused` to siblings    |
| `add` / `del`/ `mod` | Overlay with classification `diff-add`, `diff-del`, diff-mod`          |
| `err` / `warn` / `info` | Diagnostic classifications                                |

Line classifications, get added as classnames to the line by the renderer. Sub-line classifications get added to the _line_ as a class name.

Annotations that span lines are not necessarily 'line annotations', they are token annotations that span lines. Only the explicit line annotations affect lines.

All use the shared grammar.

## Examples

```ts
// Bare — this line
const x = 1; // [!em]

// Closed range, single marker
const v = my_func(); // [!em my_func..console.log]
console.log(v);

// Half-open pair, multi-line
const x = my_func({  // [!em my_func...]
  a: 1,
  b: 2,
}).then(handle);     // [!em ...handle]

// Set form: all occurrences
// [!hl =Hello]
const g = 'Hello, World';

// Relative line count
// [!em +3]
one();
two();
three();

// Absolute lines
// [!em :5..7]

// Nested pairs with explicit ids
// [!em#outer foo...]
//   [!em#inner bar...]
//   [!em#inner ...baz]
// [!em#outer ...end]

// Escape — renders literally
// [\!em literal]
```

## Non-goals

- Regex anchors (`/.../`).
- Cross-file / cross-snippet ranges.
- `[!code ...]` Shiki-compat alias.
- Modifying classifiers (diff prefix stripping, twoslash, etc.) — separate spec.
- Annotation that emits anything other than overlays.



<!-- ---- unit 8 ---- -->


<!-- ---- architecture.md ---- -->

# Design Document: A High-Performance, Regex-Free Syntax Highlighter

## 1. Vision & Core Principles

This document outlines the design for a high-performance syntax highlighting library written in JavaScript. The primary goal is to create a tokenizer that is exceptionally fast, capable of highlighting large files in real-time without impacting user interface responsiveness.

**Performance Update:** Comprehensive benchmarking reveals that character scanning consistently outperforms regex in real-world tokenization scenarios. While regex shows advantages in isolated pattern matching, the overhead of string slicing, multiple pattern attempts, and failed matches makes character scanning 8-15x faster for actual parsing tasks.

The architecture is guided by four core principles:

- _Performance First:_ The runtime must be highly optimized. Character scanning with charCodeAt() provides the fastest tokenization, with computed array indices for state transitions (4.6x faster than string keys) and dense lookup tables for O(1) character classification.
- _Separation of Concerns:_ The core runtime engine is completely language-agnostic. All language-specific logic is defined in external, declarative data files. Cross-language concerns (embedding, enrichment) live in a separate post-tokenization layer — the reclassifier — so the hot-path tokenizer never needs to know about multi-language composition.
- _Declarative, User-Friendly Grammars:_ Language definitions should be intuitive for authors to create and maintain. The schema should be a high-level abstraction over the underlying state machine, focusing on describing the language's structure rather than the machine's implementation details.
- _Robustness and Power:_ The system handles complex, real-world language features including nested contexts (JavaScript template literals with brace-depth-tracked interpolations), cross-language embedding (HTML hosting CSS and JavaScript, JavaScript hosting HTML/CSS via tagged templates, arbitrary host grammars hosting sub-languages), interleaved content with preserved interpolation holes (attribute-position interpolations in lit-html-style templates), and grammatical ambiguities via probe-mode contextual disambiguation.

## 2. Core Architecture

The system is composed of two main parts: a generic Runtime Engine and language-specific Grammar Definitions.

### 2.1. Theoretical Model: Stack-Augmented Finite State Machine

The tokenizer is modeled as a Finite State Machine (FSM), the classic computational model for lexical analysis. This allows for linear-time (O(n)) processing of the input string.

See the following links for more info on FSM and compilers:

- [Lexical Analysis - An application of FSM](https://swaminathanj.github.io/fsm/lexer.html)
- [Lexical analysis Finite Automata](https://courses.cs.umbc.edu/331/fall13/01/notes/04/04bLexical.pdf)
- [Finite State Machines in Compiler Design](https://www.tutorialspoint.com/compiler_design/compiler_design_finite_state_machines.htm)

To handle nested and recursive language structures (e.g., JavaScript template literals), the FSM is augmented with a state stack. This elevates the model to a Pushdown Automaton, conceptually inspired by the hierarchical states of Statecharts. This provides a formal and robust mechanism for managing context.

For more info on statecharts, see the following links:

- [Statecharts definition](https://sismic.readthedocs.io/en/latest/format.html)
- [State diagram](https://en.wikipedia.org/wiki/State_diagram)

### 2.2. The Runtime Engine

The runtime is a small, efficient, and language-agnostic JavaScript module responsible for executing the tokenization process.

#### 2.2.1. Processing Loop

The core of the engine is a single `while` loop that iterates through the input string one character at a time. This loop maintains the current `position` and a `stateStack`. In each iteration, it performs a constant-time lookup based on the current character and the active state (the state at the top of the stack) to determine the next action.

#### 2.2.2. Performance Optimizations

**Based on comprehensive benchmarking of real tokenization scenarios:**

- _Character Code Scanning:_ The foundation of performance. Using `charCodeAt()` for direct character access avoids string allocation overhead. In realistic parsing scenarios, character scanning is 8-15x faster than regex due to avoiding string slicing and multiple pattern attempts.

- _Lookup Tables:_ Dense lookup tables (Uint8Array) provide O(1) performance for character classification. ASCII characters (0-127) use direct array indexing. Use computed array indices `(state * MAX_ACTIONS + action)` instead of string concatenation for transition keys - this provides 4.6x better performance.

- _State Machine Implementation:_ Use pre-allocated typed arrays for the state stack. Bit-packed state stacks can be 14% faster for languages with limited nesting depth (up to 10 levels can fit in a single 32-bit integer).

- _Context-Aware Chomping:_ When entering a known state (e.g., string literal, comment block), use specialized character scanning loops to consume the entire construct efficiently. This avoids the overhead of state transitions for predictable patterns.

#### 2.2.3. Output Format & Token Storage

The engine acts as a transducer, producing output as it processes the input ([Link for more info](https://en.wikipedia.org/wiki/Finite-state_machine)). Based on benchmarking, the optimal token storage strategy is:

- **Flat Uint32Array:** Store tokens as `[type, start, end]` triplets in a single typed array
  - 17,534 ops/sec - fastest approach, 1.4x faster than objects
  - Access pattern: `tokens[i*3]` = type, `tokens[i*3+1]` = start, `tokens[i*3+2]` = end
  - Pre-allocate capacity to avoid reallocation during parsing

- **Token Type Encoding:** Use integer IDs (0-255) instead of strings
  - Enables Uint8Array storage for types (1 byte vs 4 bytes)
  - 1.5x faster than Map lookups during rendering
  - Pre-compute class name array indexed by token type for O(1) rendering

The final rendering of this data into styled HTML is a separate, subsequent step.

### 2.3. The Reclassifier Pipeline

The tokenizer produces a raw token stream that is correct for single-language input but does not handle two important classes of problem:

1. **Multi-token lookahead refinement.** Recognizing that an `identifier` token should be reclassified as a `function` token based on multi-token patterns (Prism's "function-variable" case: `const foo = () => { }` → `foo` is a function). The state machine cannot cheaply express this — it would require chained probe states and balanced-paren matching at every `=` in the file.
2. **Cross-language embedding.** Handing off `<script>` content in HTML to the JavaScript tokenizer, or tokenizing the content of a JS tagged template literal (`` html`<div>${expr}</div>` ``) as HTML. A monolithic grammar approach requires either duplicating sub-language rules into the host grammar (~150 lines of JS template-mirror states for one language) or running multiple separate tokenizers with no composition.

Both of these are token-stream transformations: they take a `TokenizeResult` and produce a new `TokenizeResult`. They compose naturally as a **pipeline of pure transforms** that sits between the tokenizer and the renderer:

```
source → tokenize(hostGrammar) → raw tokens
raw tokens → reclassify([transform1, transform2, ...]) → enriched tokens
enriched tokens → toHtml()
```

The reclassifier is **architecturally outside the hot-path tokenizer**. The tokenizer stays focused on one language at a time and knows nothing about embedding or enrichment. Consumers who only want raw tokenization pay zero reclassifier cost. Consumers who want the full enriched experience compose transforms explicitly.

#### 2.3.1. Three Canonical Transforms

Three built-in transforms cover the space of token-stream modifications:

**`rewriteTypes(rules)`** — pattern-match windows of tokens and rewrite token type IDs in place. No new tokens, no position changes. Used for in-language refinement like function-variable detection. Rules are declarative using a small combinator DSL (`seq`, `type`, `anyOf`, `optional`, `capture`, `balancedParens`) with trivia skipping between pattern elements. Rules are indexed by anchor type ID for O(1) dispatch in the hot loop.

**`embedGrammars(mapping)`** — for host tokens of specific types (typically "raw" content spans emitted by the host grammar), invoke a sub-language on the token's source range and splice the result into the stream. Host tokens marking the embed point (e.g. the `<script>` tag) are decided by the HOST GRAMMAR — the reclassifier only executes the embedding. This is the correct separation because the host grammar has live parser state when deciding embed boundaries; the reclassifier only sees tokens after the fact. Used for HTML's `<script>` → JS and `<style>` → CSS.

**`embedInterleaved(config)`** — the generic solution for **discontinuous embedded content** where sub-language tokens are broken up by preserved host-language "holes". A host-specific scanner callback identifies groups in the token stream and describes them as a list of regions (content, hole, synthetic). The transform:

1. Builds a **virtual source** by concatenating content regions, filling hole regions with placeholder characters of matching byte length.
2. Sub-tokenizes the virtual source **in one call**, giving the sub-language full state continuity across holes.
3. Remaps virtual token positions back to real host source offsets via a piecewise-linear position map.
4. Splits any sub-tokens that straddle a content-hole boundary at the boundary and drops hole-internal pieces.
5. Emits regions in source order: content pieces (sub-tokens), holes (original host tokens passed verbatim), synthetic pieces (fresh tokens for host delimiter characters that are part of a larger host token).

The exemplar use case is JS tagged templates with attribute-position interpolations: `` html`<p class="${cls}">hi</p>` ``. The HTML sub-tokenizer sees a well-formed attribute value (with space-filled hole) and parses it correctly; the resulting string token is then split at the hole boundary so the `${cls}` JS tokens sit between two `"` string pieces.

#### 2.3.2. Region Kinds

`embedInterleaved` models a group as a sequence of three region kinds:

- **`content`** — source bytes copied into the virtual source and tokenized by the sub-language. Output: sub-tokens at remapped real positions.
- **`hole`** — source bytes replaced by placeholder in the virtual source (so the sub-tokenizer's state flows past them). Output: the original host tokens for this range, passed through verbatim.
- **`synthetic`** — neither virtual nor passthrough. A NEW token is synthesized at the region's position with a user-specified type name. This handles delimiter characters that are part of a larger host token but need to appear as separate tokens in the output — e.g. the `` ` `` at the start of a JS tagged template's first token, which must emit as a standalone `template` token so it stays styled.

#### 2.3.3. Fixed-Point Iteration for Nested Cases

When a host language can contain itself inside an interpolation hole (e.g. `` html`<style>${css`body { color: red; }`}</style>` ``), a single scan pass finds only the outer group and emits the inner group's tokens verbatim as part of the hole. `embedInterleaved` runs its single-pass transform **iteratively** until it reaches a fixed point — the first pass handles the outermost groups, subsequent passes peel off one level of nesting each. Termination is detected when a pass produces the same reference as its input (no groups found). A safety bound guards against pathological scanners.

#### 2.3.4. Flat Token-Type Merging

When a sub-language contributes token types the host doesn't have (e.g. HTML's `tag-name` appearing inside a JS tagged template), those types are merged into a cloned `tokenTypes` array by name. Shared type names (`identifier`, `keyword`, `string`, `comment`) deduplicate. Host type IDs are preserved so rules compiled against the host's original vocabulary keep working after sub-language types are appended. The output is still a plain `TokenizeResult` — the renderer needs no changes to handle multi-language tokens.

#### 2.3.5. Three-Tier Language Package API

Every language package exports three things at the same name level:

- **`grammar`** — the compiled base grammar. Consumers who want raw tokens and zero pipeline cost import this.
- **`reclassifiers`** — the language's default reclassifier list (e.g. function-variable detection + tagged-template embedding for JavaScript). Consumers who want to prepend or append their own rules import this.
- **`language`** — a one-call convenience function `(input) → TokenizeResult` built via `createLanguage(grammar, reclassifiers)`. Runs tokenize + the full reclassifier pipeline. This is what most consumers use.

`createLanguage` is a core-provided helper so every language package composes its pipeline the same way.

#### 2.3.6. Pure Transforms

Reclassifiers come in two contracts, both pure with respect to the caller's input:

- **Claim producers** (the common case — every type-only pass): expose a `__claim` method that reads a frozen token stream and emits `(token_idx, type_id, precedence)` claims into a sink. They never write token slots; they may append new names to the batch's cloned `token_types`. The pipeline runner batches consecutive claim producers against the same base stream, merges claims by precedence (ties resolve to the earlier pipeline entry), and applies the winners in one flush — cloning `tokens` only when at least one claim fired. Within a batch, ordering does not decide conflicts; precedences do, and this is enforced by permutation tests.
- **Shape and embed transforms** (`(input, TokenizeResult) → TokenizeResult`): passes that change token count or splice sub-language streams. These clone `tokens` and `token_types` before mutating, run sequentially, and break claim batches.

Empty pipelines return the input reference unchanged, so `reclassify([])` is free (~40 ns per call). The convenience `language()` function has no measurable overhead vs a manually composed pipeline.

## 3. Language Definition Schema

Language grammars are defined in a declarative, serializable JSON format. This format is designed to be an intuitive abstraction, hiding the underlying complexity of the state machine from the grammar author.

### 3.1. Top-Level Structure

A language definition is a JSON object with two root properties:

- `"name"`: A string identifying the language (e.g., `"javascript"`).
- `"states"`: An object where each key is a state name (e.g., `"main"`, `"template_literal"`) and the value is an object containing a `rule` property that is an array of rules.

The first state defined in the states object is implicitly the initial state for tokenization.

```JSON
{
  "name": "javascript",
  "states": {
    "main": {
      "rules": [ /* rules for the main state */ ],
    },
    "template_literal":{
      "rules": [ /* rules for the template_literal state */ ]
    }
  }
}
```

### 3.2. Rule Object Structure

Each state is defined by an array of rule objects. The engine evaluates these rules in the order they appear in the array. A rule object can contain the following properties:

#### 3.2.1. Matchers

A rule must contain exactly one matcher property:

- `"match"`: Matches an exact string or an array of strings. Ideal for keywords, operators, and other fixed sequences.
  - `{ "match": "const", "token": "keyword" }`
  - `{ "match": ["+", "-", "*", "/"], "token": "operator" }`
- `"range"`: Matches a single character if it falls within a specified range or set of ranges.
  - `{ "range": ["a", "z"], "token": "identifier" }`
  - `{ "range": [["0", "9"], ["A", "F"]], "token": "hex*digit" }`

#### 3.2.2. Actions

A rule specifies actions to be taken upon a successful match:

- `"token"`: An optional string that defines the token type for the matched text (e.g., `"keyword"`, `"string"`). If `token` is not present then the pointer will not be progressed and no token will be generated.
- `"state"`: Pushes a new state onto the stack. This is used with begin/end rules to apply a different set of rules to the content between the delimiters. It can also be used with a match rule to handle recursive language constructs. A state can be progressed without generating a token and consuming the current character.
- `"exit"`: A context-aware pop operation. The value is the name of the expected parent state. The rule only matches if the state immediately below the current one on the stack is the one specified. This provides a robust way to exit nested contexts. `exit` can also be `true` which simply exits the current state.
  - `{ "match": "}", "token": "punctuation", "exit": "template_literal" }`

#### 3.2.3 Triggering modes to handle ambiguity

A rule can optionally have a `mode` property that determines the behaviour of the tokenizer. This can be `tokenize` and `probe`

By default the mode is `tokenize` and will progress the pointer and generate tokens if a `token` is defined

In some cases it isn't possible to know what you are dealing with until you enter a disambiguating token, lets use CSS as an example. CSS has simple syntax but is highly recursive, lets take the following valid CSS:

```css
div {
  a:hover one two three {
    a: hover one two three;
  }
}
```

After we enter the `div` block it is impossible to know is `a:hover one two three` is a chain of selectors or a property and a value until we see either a `{`, a `;` or some kind of terminator (a closing brace or EOF). Normal states without tokens (transition only states) aren't powerful here because we actually need to continue scanning the input stream. In order to disambiguate these cases, twinkleplop supports `probing` a kind of controlled backtracking . When `mode: probe` states will transition as normal and characters will be matched but upon moving to a state that has a `mode: tokenise` the pointer will reset to the index it had when `mode: probe` was initialised.

An example can illustrate:

After entering the div and working through whitespace we are here:

```css
...
v
a:hover one two three {
    a:hover one two three;
  }
}
```

We cannot determine the token type at this point so we enter probe mode. We then progress until we reach a disambiguating character, in the simple case `{` or `;`.

```css
...
                      v
a:hover one two three {
    a:hover one two three;
  }
}
```

At this point we know if it is a selector or a property. So we transition to the appropriate state (`selector`). Since that state has `mode: tokenize`, we go back to the index we were in when we initialised the probe mode but now with new information about our context.

```css
...
v
a:hover one two three {
    a:hover one two three;
  }
}
```

### 3.3. Handling Ambiguity

- _Maximal Munch Principle:_ For ambiguities where one token is a prefix of another (e.g., `>` vs. `>>`, `#if` vs. `#ifdef`), the engine must adhere to the "longest match" rule. Character lookahead (10,568 ops/sec) outperforms complex trie matching (1,794 ops/sec) by 5.9x. Order rules from longest to shortest and use simple character lookahead.
- _Contextual Ambiguity:_ For ambiguities where a token's role depends on what follows it (e.g., CSS nested selectors), using the `mode` option to probe the state is utilised.

## 4. Implementation & Optimization

### 4.1. The "Compilation" Phase

The declarative JSON grammars are not interpreted directly at runtime. When a language is first loaded, it undergoes a one-time compilation process that transforms the user-friendly definition into a highly optimized in-memory representation for the runtime engine.

This process includes:

- _Integer Mapping:_ All string identifiers for states and tokens are mapped to unique integers for faster comparisons. String-keyed lookups are 4.6x slower than computed indices.
  - Token types mapped to 0-255 range for Uint8Array storage
  - Pre-compute CSS class names array indexed by token type
  - Benchmark: 3,626 ops/sec with bit-packed types vs 2,374 with Map lookups

- _Transition Table Generation:_ Compile state transitions into a flat typed array using computed indices: `transitionTable[(state * MAX_ACTIONS + action) * 3]` storing `[newState, tokenType, stackOp]` triplets. This approach benchmarks at ~3,956 ops/sec vs 858 ops/sec for string-keyed objects.

- _Lookup Table Generation:_ Range rules are compiled into dense Uint8Arrays for ASCII (0-127) providing O(1) lookups. For Unicode, use a hybrid approach: array for ASCII + Map for extended ranges. Benchmarks show 128-entry lookup tables outperform all alternatives.

- _Character Pattern Compilation:_ Convert string patterns into optimized character code sequences for direct comparison. Keywords are stored in a Set for O(1) lookup after identifier scanning.

### 4.2. Whitespace Handling

Whitespace between tokens is handled implicitly by the runtime engine and should be ignored. The lookahead assertion mechanism (`peek`) must also be implemented to automatically skip over whitespace between the matched token and the lookahead assertion point.

## 5. Token Naming Convention

The system will adopt a simple, flat token naming convention, avoiding the complexity of dot-separated hierarchical scopes found in TextMate.9 Standard token names like `keyword`, `string`, `comment`, `number`, `operator`, `punctuation`, `property`, and `selector` are encouraged. This aligns with modern systems like VS Code's semantic highlighting and simplifies the creation of themes.

## 6. Performance Guidelines

Based on comprehensive benchmarking of realistic tokenization scenarios:

### 6.1. Core Performance Strategy

- **Character Scanning is Primary:**
  - 8-15x faster than regex in real parsing scenarios
  - Avoids string slicing overhead (66x performance penalty with regex)
  - No pattern compilation or failed match costs
  - Direct memory access via charCodeAt()
  - Single pass through input

- **Why Initial Benchmarks Were Misleading:**
  - Isolated benchmarks used global regex matching (unrealistic)
  - Real parsing requires position-by-position attempts
  - Each regex test requires string slicing
  - Multiple patterns must be tried (10-15x overhead)
  - Failed matches are common and expensive

- **Use Lookup Tables for:**
  - Character classification (alphanumeric, operators)
  - O(1) performance guaranteed
  - Dense Uint8Array for ASCII (0-127)
  - Computed indices for state transitions

### 6.2. Optimal Data Structures

Based on comprehensive benchmarking:

1. **Token Storage:** Flat Uint32Array with triplets `[type, start, end]`
   - 17,534 ops/sec (fastest), 1.4x faster than objects
   - Pre-allocate with capacity to avoid reallocation
   - Access: `tokens[i*3]` = type, `tokens[i*3+1]` = start, `tokens[i*3+2]` = end

2. **Token Types:** Integer encoding (0-255) with Uint8Array
   - 3,626 ops/sec with bit-packed types
   - 1.5x faster than Map lookups during rendering
   - Pre-compute class name array for O(1) rendering

3. **Structure of Arrays (SoA) Alternative:**
   - Separate arrays: `Uint8Array` for types, `Uint32Array` for positions
   - 16,769 ops/sec - nearly as fast as flat array
   - Better for type-specific operations (filtering, counting)

### 6.3. Optimization Techniques

1. **State Transitions:** Use computed indices `(state * MAX_ACTIONS + action) * 3` in flat typed arrays (4.6x faster)
2. **Stack Operations:** Pre-allocate typed arrays, consider bit-packing for shallow nesting (14% faster)
3. **Keyword Matching:** Scan identifiers with charCodeAt(), then Set lookup for classification
4. **Context Chomping:** When in known state, use tight character loops to consume constructs
5. **Memory Layout:** Keep hot data contiguous for cache locality
6. **Avoid:** String slicing, regex in hot paths, string concatenation, generator patterns (79% slower)

## 7. Testing Strategy

To ensure correctness and facilitate contributions, the library will support testing methodologies adapted from existing, mature highlighters.

- _Snapshot Testing:_ Based on the Prism.js test suite, this involves a test file containing a code snippet and a corresponding JSON file representing the expected token stream. This is ideal for verifying the entire output for a given file. [See Prism testing guide for more info](https://prismjs.com/test-suite.html)
- _Assertion-Based Testing_: Based on the TextMate grammar test model, this allows assertions to be written directly into test files as comments (e.g., `// ^ keyword`). This is excellent for targeted unit tests of specific language features.Adopting these formats allows for the potential reuse of the vast test suites from these projects, providing a strong foundation for correctness. [See tmgrammmer tests for more info](https://github.com/PanAeon/vscode-tmgrammar-test)



<!-- ---- unit 9 ---- -->

---
title: Twinkleplop
tags: [demo, showcase]
---

# Twinkleplop

> A **regex-free** syntax highlighter with _opt-in_ fidelity. ~~Slow~~ **fast**.

## Features &amp; friends

1. Language packs with [docs](https://example.com "home").
2. `inline code` and fenced blocks:

```js
const greet = (name) => `hi, ${name}`;
```

    // indented code block
    const x = 1 + 2;

- [x] ship demo
      second line after a hard break
- [ ] celebrate

Escapes: \* not italic, \# not a heading.

---

Visit <https://example.com> or email <hi@example.com>.

![logo](./logo.png)



<!-- ---- unit 10 ---- -->


<!-- ---- blockquote.md ---- -->

> a simple quote

> quote with **bold** inside

> > nested quote

> # heading in quote



<!-- ---- code_span.md ---- -->

a `code` span.

`code with *asterisks* inside` stays literal.

An `unclosed code and more
text.



<!-- ---- composition.md ---- -->

**bold with *italic nested* bold**

*italic with `code inside` italic*

**bold with `code` bold**

~~strike with **bold** strike~~

*italic [link text](https://example.com) italic*

[link with **bold** and `code` inside](url)

**[bold link](url) followed by bold**

*~~italic strike~~*

**bold *italic ~~and strike~~ back to italic* bold**

`plain code` outside emphasis

*italic containing <https://autolink> inside*

**bold across ![image alt](img.png) bold**

`code` then **bold** then *italic* flat



<!-- ---- emphasis.md ---- -->

**bold text**

*italic text*

***both***

~~strikethrough~~

**outer *inner* outer**

*emph with `code` inside*

__underscore bold__

_underscore italic_

**unclosed bold



<!-- ---- escape_entity.md ---- -->

\*not emphasis\* and \\ literal backslash.

entity: &amp; &copy; &#42; &#x2a;

a hard break\
continues here.



<!-- ---- fenced_code.md ---- -->

```js
const x = 1;
```

```
no language
```

~~~python
print("tilde fence")
~~~



<!-- ---- front_matter.md ---- -->

---
title: Hello
date: 2026-04-14
---

# First heading

A paragraph.



<!-- ---- headings.md ---- -->

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

# Heading with **bold** and *italic*

#notaheading

####### not a heading either

#



<!-- ---- indented_code.md ---- -->

a paragraph first.

    four spaces of code
    line two

back to paragraph.



<!-- ---- links.md ---- -->

[text](https://example.com)

[with title](https://example.com "Example")

[reference][label]

[just brackets]

![image alt](image.png)

See <https://auto.link> for details.



<!-- ---- lists.md ---- -->

- first bullet
- second bullet
* star bullet
+ plus bullet

- [ ] open task
- [x] done task
- [X] capital done



<!-- ---- mixed.md ---- -->

# Project Readme

A short **intro** paragraph with a [link](https://example.com) and `inline code`.

## Install

```bash
pnpm install
```

## Features

- fast
- **bold** feature
- [ ] roadmap item

> Note: read the docs.

---

See <https://example.com> for more.



<!-- ---- thematic_break.md ---- -->

above

---

below

***

more

___

end
