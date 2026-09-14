# @twinkleplop/annotation

In-source directives that decorate highlighted code without changing what
the language tokenizer thinks the code is. Authors write markers inside
ordinary source comments; twinkleplop strips the markers from the rendered
output and adds CSS classes to the spans the markers point at.

```js
const total = items.reduce((a, b) => a + b, 0); // [!em]
```

The `// [!em]` comment is removed from the output and the line gets the
`emphasis` class. Themes decide what that looks like.

## Markers

A marker is `[!verb args]`, optionally `[!verb#id args]` for paired forms.
Verbs come from plugins; the built-ins below cover styling, diffs, and
diagnostics.

### Argument forms

| form              | meaning                                             | mode  |
| ----------------- | --------------------------------------------------- | ----- |
| _(empty)_         | the line containing the marker                      | line  |
| `+N`              | the N lines below the marker                        | line  |
| `:N`              | absolute line N                                     | line  |
| `:N..M` / `:N...M`| line range, exclusive / inclusive                   | line  |
| `***`             | every byte on the marker's own line                 | token |
| `foo..bar`        | from anchor `foo` to anchor `bar`                   | token |
| `foo...bar`       | inclusive variant                                   | token |
| `foo..` / `..bar` | half-open; pairs with a closing marker of same verb | token |
| `=foo`            | every occurrence of `foo`                           | token |

Anchors are bare words (`foo`), quoted literals (`"a.b"`), or `*` wildcards.
Anchors point at code, not at marker comments — the resolver skips matches
that fall inside any comment token.

Half-open pairs use `#id` to disambiguate when the same verb is open in
multiple places: `[!em#a foo..]` ... `[!em#a ..bar]`.

### Anchors are line-bound

Anchor lookup is bounded to the marker's own line. A closed range like
`[!em foo..bar]` only matches `foo` and `bar` on the marker line — it
won't reach back to a previous line or forward into the next. The same
applies to `=anchor` set form (only matches on the marker's line) and to
the `*` wildcard (always line-relative to the marker hosting it).

The single exception is half-open pairs: `[!em foo...]` and `[!em ...bar]`
each look up their own anchor on their own marker's line, and the framework
stitches the resolved pair into one range that spans from the opener to
the closer.

In practice this means inline trailing-comment markers
(`const x = foo(); // [!em =foo]`) work as expected, while standalone
comment lines above code (`// [!em foo..bar]\nfoo + bar`) report
`anchor_not_found` — use `+N` / `:N..M` line refs or a half-open pair if
you want to reach across lines.

### Comment elision

If a comment contains only markers and punctuation (`// [!em :3..7]`), the
whole comment line is dropped from the output. If the comment also has
prose (`// [!em] note`), only the marker bytes are stripped.

## Built-in plugins

| plugin   | verb   | classification | typical use                          |
| -------- | ------ | -------------- | ------------------------------------ |
| `em`     | `em`   | `emphasis`     | draw attention                       |
| `hl`     | `hl`   | `highlight`    | persistent highlight                 |
| `dim`    | `dim`  | `subdued`      | fade siblings                        |
| `add`    | `add`  | `diff-add`     | diff: added                          |
| `del`    | `del`  | `diff-del`     | diff: removed                        |
| `mod`    | `mod`  | `diff-mod`     | diff: modified                       |
| `err`    | `err`  | `error`        | diagnostic squiggle: error           |
| `warn`   | `warn` | `warning`      | diagnostic squiggle: warning         |
| `info`   | `info` | `info`         | diagnostic squiggle: info            |

All built-ins auto-select line-mode vs token-mode from the marker's args
kind: bare / `+N` / `:N` / `:N..M` render line-mode; anchor ranges and
`=anchor` render token-mode.

### Block-level `has-*` classes

The `<pre>` element also gains one `has-<classification>` class for every
classification the snippet contains, in order of first appearance, so a
theme can style the block as a whole (a diff gutter, say). A snippet with
`[!add]` and `[!del]` markers renders as
`<pre class="twinkleplop has-diff-add has-diff-del">`.

Only the first class of a classification is prefixed. A plugin that emits
`diff add` and another that emits `diff del` both contribute `has-diff`,
which is what shiki does for the same markup. Pass `has_classes: false` in
the render options to turn the classes off.

### Programmatic overlays

The same decorations can be attached per call without writing a marker into
the source, through the `overlays` render option. Each item is a range with
a class, a single line with a class, a set of lines with a class, or a range
to hide:

```ts
ts(code, {
  overlays: [
    { start: 6, end: 11, class: "highlighted-word" },
    { start: { line: 2, character: 0 }, end: { line: 2, character: 7 }, class: "mark" },
    { lines: [1, [3, 4]], class: "highlight" },
    { start: 30, end: 45, hide: true },
  ],
});
```

Positions are byte offsets in the same units as token positions, or
`{ line, character }` with a 1-based line and a 0-based character; `end` is
exclusive. `lines` takes line numbers and inclusive `[from, to]` pairs.
Range items render token-mode, line items line-mode, and hidden ranges
follow the comment elision rules above. Option overlays merge with marker
overlays from the same call, and the result does not depend on item order.

Pipelines that keep tokens around call the `overlays()` builder from
`@twinkleplop/core` instead and attach its result before `to_html`:

```ts
const result = tokenize_ts(code);
result.overlays = overlays(code, items, result.overlays);
const html = to_html(code, result);
```

## Usage

Pass plugins through the language factory's `annotation` option:

```ts
import { language } from "@twinkleplop/typescript";
import { em, hl, add, del } from "@twinkleplop/annotation";

const highlight = language({
  annotation: { plugins: [em, hl, add, del] },
});

const html = highlight(source);
```

When `annotation` is omitted the language fn is identical to today's — no
extractor is built, no per-call check runs.

## How it works

The extractor runs after tokenization. It walks comment tokens, parses
markers, resolves anchor / line ranges to byte offsets, and dispatches to
plugins. Each plugin returns overlay contributions: `{ start, end,
classification, line_mode }`. The framework collects them into a flat
typed-array on `TokenizeResult.overlays`; the renderer applies the classes
during string building.

Overlays are independent of token types: they don't perturb the token
stream and don't interfere with reclassifiers or fidelity tiers.

## Authoring a plugin

```ts
import type { AnnotationPlugin } from "@twinkleplop/core";

export const note: AnnotationPlugin = {
  verbs: ["note"],
  handle: ({ args, range }) => ({
    overlays: [
      {
        start: range.start,
        end: range.end,
        classification: "note",
        line_mode: args.kind === "bare",
      },
    ],
  }),
};
```

Plugins are pure: they consume an `AnnotationInput` (verb, id, parsed args,
resolved range, marker position) and return overlay contributions. The
framework owns marker scanning, argument parsing, anchor resolution, and
pair matching — plugins only decide the classification and the mode.
