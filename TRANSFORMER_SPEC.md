# Twinkleplop Notation System

In-source directives extracted from comments, resolved against source, dispatched to plugins, emitting overlays. Runs **pre-grammar**; markers are replaced with whitespace of equal byte length so source coordinates remain stable.

This spec covers notation only. Reclassifiers and modifying classifiers (e.g. diff prefix stripping, twoslash) are separate.

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

It may be better to process transformations _after_ initial tokenisation, as notation transformers are contained within a language specific comment.

Adding a __SKIP__ token type, that causes the renderer to skip rendering and move onto the next is probably the cleanest way to 'remove' notation comments from the rendered output (and useful for other cases).

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
interface NotationPlugin {
  verbs: string[];                  // verbs claimed
  parse?: 'shared' | 'raw';         // default 'shared'
  handle(input: NotationInput): NotationOutput;
}

interface NotationInput {
  verb: string;
  id?: string;
  args: ParsedArgs | string;        // string when parse: 'raw'
  range: SourceRange;               // resolved
  marker: SourcePosition;           // for diagnostics
}

interface NotationOutput {
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

Notations that span lines are not necessaryily 'line annotations', they are token annotations that span lines. Only the explicit line notations affects lines.

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
- Notation that emits anything other than overlays.
