# Render options: line-number start, `<pre>` attributes, `has-*` classes

## Summary
Three per-call options on the renderer that cover what a shiki integration
puts on the block itself: a starting line number, attributes on the `<pre>`
element, and a class on `<pre>` for every decoration the snippet contains.
Today each of these is a string edit on the returned HTML or a second call to
`tokenize`; none needs a new concept.

## User-facing behavior
A caller passes options to a single highlight call:

```ts
ts(code, {
  line_numbers: { start: 10 },
  attributes: { "data-title": "math.ts", tabindex: 0 },
});
```

and receives a block whose first visible line is numbered 10, whose `<pre>`
carries `data-title="math.ts" tabindex="0"`, and, if the snippet has diff
markers, whose `<pre>` class list also contains `has-diff-add has-diff-del`.
Calls that pass none of these options produce exactly today's output.

## Behavioral requirements
1. `line_numbers` accepts `false` (default), `true`, or `{ start?: number }`.
   `true` and `{}` both number from 1. `{ start: n }` numbers the first
   visible line `n`.
2. Line numbers count visible lines. A line dropped because it held only
   markers does not consume a number, so numbering never shows a gap.
3. `attributes` is a map of attribute name to `string | number | boolean`.
   Each entry is emitted on the `<pre>` element after the class attribute,
   in the order given. A string or number becomes `name="value"`; `true`
   becomes a bare `name`; `false` emits nothing.
4. Attribute values are HTML-escaped. A value containing `"`, `<`, `>` or
   `&` cannot break out of the attribute.
5. The keys `class` and `style` are reserved: `class_name` owns the class
   attribute and themes own styling. Passing either throws a `TypeError`
   that names the key.
6. An attribute name that is not a valid HTML attribute name (letters,
   digits, `-`, `_`, `:`, `.`, not starting with a digit) throws a
   `TypeError`.
7. `has_classes` defaults to `true`. When the rendered result carries
   overlays, the `<pre>` class list gains `has-` followed by the first class
   token of each distinct classification present, in order of first
   appearance in the source, after the `class_name` classes. A
   classification is one class for the built-in verbs (`diff-add` gives
   `has-diff-add`); a plugin may emit several space-separated classes, in
   which case only the first is prefixed (`diff add` gives `has-diff`, as
   shiki does). Duplicates collapse. Overlays from markers and from the
   `overlays` render option both count.
8. When there are no overlays, or `has_classes` is `false`, no `has-`
   classes are emitted and the class attribute is byte-identical to today's.
9. The three options are independent and compose with each other and with
   `class_name`.

## External interface
```ts
interface RenderOptions {
  class_name?: string;                                     // existing
  line_numbers?: boolean | { start?: number };             // was boolean
  attributes?: Record<string, string | number | boolean>;  // new
  has_classes?: boolean;                                   // new, default true
}
```
Output example for the call in *User-facing behavior* with `[!add]` on the
second line and `[!del]` on the first:

```html
<pre class="twinkleplop has-diff-del has-diff-add" data-title="math.ts" tabindex="0"><code>
<span class="l diff-del"><span class="ln">10</span>…</span>
<span class="l diff-add"><span class="ln">11</span>…</span>
</code></pre>
```

## Edge cases & error behavior
- `start` that is not a finite integer throws a `RangeError`. Zero and
  negative integers are allowed and number literally.
- An empty `attributes` object emits nothing.
- `attributes: { tabindex: false }` emits no `tabindex` attribute at all
  (twinkleplop never emits one by default, unlike shiki's `tabindex="0"`).
- Classification names that are not valid class tokens cannot reach
  `has-*`: they are rejected where the overlay is created (see
  [overlays_option](./overlays_option.md)), so `has-` names are always valid.
- With `class_name: ""`, the class attribute contains only the `has-`
  classes; with no overlays either, an empty `class=""` is emitted exactly
  as today.

## Acceptance criteria
Implemented in `lib/core/src/generator.ts`; parity against the frozen
baseline is byte-identical on every no-overlay check and the `html` mode
A/B (54 workloads, two passes) moved nothing beyond the noise floor.

- [x] `ts(code, { line_numbers: { start: 10 } })` numbers lines 10, 11, 12 for a three-line snippet.
- [x] A snippet whose first line is a marker-only comment, rendered with `{ start: 10 }`, numbers its visible lines 10 and 11, not 11 and 12.
- [x] `attributes: { "data-title": 'a"b', tabindex: 0, hidden: true, draggable: false }` yields `data-title="a&quot;b" tabindex="0" hidden` and no `draggable`.
- [x] Passing `attributes: { class: "x" }` throws a `TypeError` mentioning `class`.
- [x] A snippet with `[!add]` and `[!del]` markers renders `<pre class="twinkleplop has-diff-add has-diff-del">` (order by first appearance) with no other options.
- [x] The same snippet with `has_classes: false` renders `<pre class="twinkleplop">`.
- [x] A snippet with no markers renders exactly today's HTML for every combination of the old options.
- [x] The perf harness shows no change above its noise floor for the no-option path.

## Dependencies
- Depends on: [core](./core.md)
- Depended on by: [overlays_option](./overlays_option.md) (has-* for programmatic overlays), [markdown_integration](./markdown_integration.md) (title and line-number start come from fence meta)

## Open questions
- Should `attributes` also be accepted as a highlighter-level default in
  `language(options)`, so a site can set `tabindex` once? Deferred; per-call
  is enough for the integrations surveyed.

## Out of scope
- Attributes on lines or tokens: see [inline_and_hooks](./inline_and_hooks.md).
- Emitting `data-language` automatically: the markdown integration knows the
  fence language and passes it through `attributes`.
- A `style` attribute or inline colours of any kind.
