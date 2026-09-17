# Language Definition Guide

Grammars are JavaScript modules that define states and rules. Use helpers from `@twinkleplop/core` to create rule objects, or write the objects directly. Share rules using arrays, spread and functions.

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

Token types are strings. `@twinkleplop/core/tokens` exports the standard names used by the default themes:

```js
import * as TOKENS from "@twinkleplop/core/tokens";

TOKENS.identifier; // "identifier"
TOKENS.keyword; // "keyword"
TOKENS.string; // "string"
TOKENS.function; // "function"   (dot access is fine — see note below)
```

Standard names include: `boolean`, `comment`, `function`, `identifier`, `keyword`, `number`, `operator`, `property`, `punctuation`, `regex`, `selector`, `string`, `template`, plus CSS types (`attribute`, `class_name`, `css_var`, `id`, `pseudo`, `unit`).

Custom token types can still be passed as plain strings to any helper:

```js
match("@media", "at_rule"); // "at_rule" is a custom token type
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

A `match(...)` rule can contain both literal patterns and character ranges. This lets one rule match `_`, `$` and letters, for example.

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

`any: true` combined with a sideways transition (`state + exit: true`) does **not** consume the character — it re-processes it in the destination state. Use this to retry the current character in a different state.

---

## Transition helpers

State transitions are partial rule objects. Spread them into a rule and add any other fields it needs.

```js
enter("foo"); // → { state: "foo" }              push; enters foo, parent stays on stack
goto("foo"); // → { state: "foo", exit: true }  sideways; replaces current state
leave(); // → { exit: true }                pop; returns to parent
to("foo"); // → { state: "foo", exit: true }  same as goto
to(null); // → {}                            stay in current state
```

Use `to()` in parameterised rule factories when the destination may be `null` to mean "stay":

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

## State structure

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

### Sharing rules with arrays

To share rules, store them in an array and spread it into each state's `rules`:

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

Use a function when a shared rule needs a different destination state:

```js
const operators = (after) => match(OP_ALL, TOKENS.operator, to(after));

states: {
  main:        { rules: [..., operators("regex_allow"), ...] },
  regex_allow: { rules: [..., operators(null), ...] },
}
```

The compiler does not support `rulesets`, `include` or `extend`. Use arrays and
spread to share rules.

---

## Probe states

Some grammars have tokens whose type depends on what comes next. For example, in CSS, after entering a block, you can't tell whether `a:hover one two three` is a chain of selectors or a property + value until you hit a `{`, `;`, `}`, or EOF.

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

- **Maximal munch**: when one pattern is a prefix of another (`>` vs `>>`, `/` vs `/=`), the longer match wins. The compiler sorts patterns in each first-character bucket by descending length.
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

To write a custom helper, create a function that returns a rule or an array of rules:

```js
// Shortcut for a sideways transition that emits a punctuation token
const punct = (chars, dest) => match(chars, TOKENS.punctuation, goto(dest));

// Multi-rule helper — keyword branching for a language with two contexts
const keywords = (regexDest, divDest) => [
  keyword(REGEX_PRECEDING, to(regexDest)),
  keyword(VALUE_KEYWORDS, to(divDest)),
];
```

Custom helpers can take arguments and return rules built from the standard helpers.
