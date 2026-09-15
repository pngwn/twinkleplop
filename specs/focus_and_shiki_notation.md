# Ship `focus`, raw marker arguments, and a `[!code …]` compatibility plugin

## Summary
Three pieces that together let a snippet written for shiki highlight in
twinkleplop without edits: the `focus` verb joins the built-in plugins; the
annotation extractor honours a plugin's request for raw, unparsed arguments
(already declared in the plugin type, never implemented); and a
`shiki_notation` plugin built on that claims the `code` verb and maps every
`@shikijs/transformers` notation onto overlays.

## User-facing behavior
An author keeps their existing markdown:

```ts
const a = 1 // [!code highlight]
// [!code focus:2]
const b = 2
const c = 3 // [!code --]
const d = 4 // [!code ++]
```

A site configures one plugin:

```ts
import { shiki_notation } from "@twinkleplop/annotation/shiki";
const ts = language({ annotation: { plugins: [shiki_notation()] } });
```

and gets the same lines highlighted, focused and diffed that shiki would
produce, with markers removed, using twinkleplop's class names by default
(`highlight`, `focus`, `diff-add`, `diff-del`) so one theme covers both
marker syntaxes. `shiki_notation({ classes: "shiki" })` emits shiki's
names instead (`highlighted`, `focused`, `diff add`, `diff remove`) so
existing shiki CSS keeps working. A plugin author who wants a custom
argument syntax declares `parse: "raw"` and receives the text after the verb
untouched.

## Behavioral requirements

### `focus`
1. `@twinkleplop/annotation` exports `focus`. It claims the verb `focus` and
   emits the classification `focus`, line-mode for bare, `+N` and `:N` forms
   and token-mode for anchor forms, exactly like `hl` emits `highlight`.
2. A snippet containing a focus marker renders `has-focus` on `<pre>` (via
   [render_options](./render_options.md)), so `.has-focus .l:not(.focus)`
   is the whole CSS a theme needs to dim the rest.

### Raw arguments
3. A plugin with `parse: "raw"` receives `args` as the exact text between
   the verb (and optional `#id`) and the closing bracket, with the single
   separating space removed and trailing whitespace trimmed. An empty
   string means the marker had no arguments.
4. The framework still finds the marker, hides its bytes, drops marker-only
   comment lines, handles `[\!` escapes and reports `marker_spans_newline`
   and `malformed` (unbalanced brackets, unterminated quotes) exactly as for
   shared parsing. It does not resolve anchors, line refs or pairs for the
   plugin.
5. A raw plugin can ask the framework to resolve any fragment written in the
   shared grammar, relative to its own marker, and gets back the same range
   a shared-parse plugin would have received for that fragment.
6. A raw plugin can report issues; they reach the configured `on_error` sink
   with the marker's position, or throw when no sink is configured, exactly
   like framework-detected issues.
7. `#id` on a raw marker is passed through as `id`; pairing is not applied.

### `shiki_notation`
8. The plugin claims the single verb `code`. Every notation of
   `@shikijs/transformers` 4.4.3 is recognised: `highlight`, `highlight:N`,
   `focus`, `focus:N`, `++`, `--`, `error`, `warning`, `info`, `word:text`,
   `word:text:N`. Several notations may appear in one comment
   (`// [!code highlight] [!code focus]`); each applies.
9. Line selection follows shiki's v3 matching. A marker on a line of its own
   applies to the `N` lines below it (`N` defaults to 1). A trailing marker
   applies to its own line and the `N-1` lines below it.
10. `word:text` highlights every occurrence of `text` on the selected lines
    with token-mode overlays; occurrences inside comments are skipped.
    `\:` and `\]` in `text` are unescaped as shiki does.
11. Default class mapping (`classes: "twinkleplop"`): `highlight` →
    `highlight`, `focus` → `focus`, `++` → `diff-add`, `--` → `diff-del`,
    `error`/`warning`/`info` → `error`/`warning`/`info`, `word` →
    `highlight`. All line notations are line-mode; `word` is token-mode.
12. `classes: "shiki"` mapping: `highlighted`, `focused`, `diff add`,
    `diff remove`, `highlighted error`, `highlighted warning`,
    `highlighted info`, `highlighted-word`. The `has-` classes then read
    `has-highlighted`, `has-focused`, `has-diff`, matching shiki's
    `classActivePre` defaults.
13. A `[!code xyz]` with an unrecognised notation is left in the output as
    ordinary comment text, as shiki leaves it, and is not reported.
14. Marker removal matches shiki: a comment that held only `[!code …]`
    markers disappears with its line; a comment with other text keeps the
    text.

## External interface
```ts
// @twinkleplop/annotation
export const focus: AnnotationPlugin;

// @twinkleplop/annotation/shiki
export function shiki_notation(options?: { classes?: "twinkleplop" | "shiki" }): AnnotationPlugin;

// @twinkleplop/core — additions to the plugin contract
interface AnnotationPlugin { parse?: "shared" | "raw" }        // "raw" now honoured
interface AnnotationInput {
  args: ParsedArgs | string;                                   // string when parse: "raw"
  resolve(fragment: string): SourceRange;                      // shared grammar, relative to this marker
}
interface AnnotationOutput { overlays?: OverlayContribution[]; issues?: AnnotationIssue[] }
```
Output for the snippet in *User-facing behavior*, default classes:

```html
<pre class="twinkleplop has-highlight has-focus has-diff-del has-diff-add"><code>
<span class="l highlight">…a = 1</span>
<span class="l focus">…b = 2</span>
<span class="l focus diff-del">…c = 3</span>
<span class="l diff-add">…d = 4</span>
</code></pre>
```

## Edge cases & error behavior
- `highlight:0` or a non-numeric count is malformed: reported as
  `malformed` with the marker position; the marker is still removed.
- `focus:N` where `N` runs past the last line applies to the lines that
  exist; no error.
- `word:text:N` with no occurrence in the selected lines applies nothing and
  is not an error (shiki is silent too).
- A raw plugin returning an overlay outside the source throws a
  `RangeError` naming the verb, since that is a plugin bug, not an
  authoring error.
- `[\!code highlight]` renders literally as `[!code highlight]` with no
  overlay and no configuration, unlike shiki which needs
  `transformerRemoveNotationEscape`.
- Two plugins claiming `code` is a registration-time `verb_collision`, as
  for any verb.

## Acceptance criteria
- [ ] `[!focus]`, `[!focus +2]` and `[!focus foo..bar]` produce line-mode and token-mode `focus` overlays and `has-focus` on `<pre>`.
- [ ] A plugin with `parse: "raw"` receives `"highlight:2"` for `[!code highlight:2]` and `""` for `[!code]`.
- [ ] `resolve("+2")` from a raw plugin returns the two lines below the marker; `resolve("foo..bar")` returns the anchor range on the marker's line.
- [ ] Each of shiki's transformer test fixtures for diff, highlight, focus, error-level and word highlight, run through `shiki_notation({ classes: "shiki" })`, yields the same set of line classes per line and the same highlighted words as shiki 4.4.3.
- [ ] The default mapping yields `highlight`/`focus`/`diff-add`/`diff-del`/`error`/`warning`/`info`.
- [ ] `// [!code highlight] [!code focus]` on one line gives that line both classes.
- [ ] A standalone `// [!code highlight:2]` line disappears and the two lines below are highlighted; a trailing `[!code highlight:2]` highlights its own line and the next.
- [ ] `// [!code nope]` is rendered as comment text unchanged.
- [ ] Existing annotation tests pass unchanged; the no-annotation path is byte-identical and within the perf harness noise floor.

## Dependencies
- Depends on: [core](./core.md), [render_options](./render_options.md) (`has-*`), [cross_line_word_highlight](./cross_line_word_highlight.md) (`word:text:N` reuses the scoped set form)
- Depended on by: [markdown_integration](./markdown_integration.md) (recommends the compat plugin for ported content)

## Open questions
- Whether `shiki_notation` should also accept shiki's v1 matching
  (`matchAlgorithm: "v1"`, where a standalone marker counts its own line).
  Not planned; v3 has been shiki's default since 3.0.
- Whether `focus` should ship a `not-focused` sibling class instead of
  relying on `.has-focus .l:not(.focus)`. The CSS form is what shiki users
  already write.

## Out of scope
- Shiki's meta-string transformers (`{1,3}`, `/word/`): see
  [markdown_integration](./markdown_integration.md).
- Running shiki transformer objects. There is no tree for them to run on.
- Colouring, styling or any CSS: themes own the classes above.
