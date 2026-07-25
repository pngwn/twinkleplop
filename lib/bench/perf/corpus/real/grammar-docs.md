
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
