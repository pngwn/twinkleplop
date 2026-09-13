# Overlays as a render option

## Summary
Programmatic decorations: a caller can attach classes to byte ranges, lines
or line ranges of one highlight call, and can hide ranges, without writing a
marker into the source. This is the twinkleplop equivalent of shiki's
`decorations` and `transformerCompactLineOptions`, and it is what every
meta-string convention and every "highlight these characters" feature is
built on. The overlay machinery exists; this spec gives it a public shape.

## User-facing behavior
A caller passes an `overlays` list with the render options:

```ts
ts(code, { overlays: [
  { start: 6, end: 11, class: "highlighted-word" },
  { start: { line: 2, character: 0 }, end: { line: 2, character: 7 }, class: "mark" },
  { lines: [1, [3, 4]], class: "highlight" },
  { start: 30, end: 45, hide: true },
]});
```

and receives HTML in which `total` (bytes 6–11) is wrapped in a
`span.tok.highlighted-word`, `console` on line 2 in a `span.tok.mark`, lines
1, 3 and 4 carry the `highlight` class, and bytes 30–45 render as spaces.
The same items can be applied to a `tokenize` result before calling
`to_html`, for pipelines that keep tokens around.

## Behavioral requirements
1. Every item is one of four forms: a range with a class, a single line with
   a class, a set of lines with a class, or a range to hide. Any other shape
   throws a `TypeError`.
2. A range item behaves as a token-mode overlay; a `line`/`lines` item as a
   line-mode overlay; a `hide` item as a hidden range. All three follow the
   overlay semantics in [core](./core.md): class-only, per-line wrapping,
   class union on overlap, whitespace substitution and blank-line dropping
   for hidden ranges.
3. A position is either a byte offset (UTF-16 code unit index into the
   source, the same units as token positions) or `{ line, character }` with
   a 1-based line and a 0-based character within that line. `end` is
   exclusive in both forms.
4. `lines` accepts line numbers and inclusive `[from, to]` pairs, mixed.
5. Items apply in a way that does not depend on their order: the same set of
   items in any order yields the same HTML.
6. Option overlays combine with marker overlays from the same call. Classes
   from both apply; hidden ranges from both apply; the `has-*` classes on
   `<pre>` (see [render_options](./render_options.md)) reflect both.
7. A `class` value must be one or more valid CSS class tokens separated by
   single spaces. Anything else throws a `TypeError`. Values are emitted
   verbatim after that check.
8. A line-mode item on an empty line still adds its class to that line's
   `span.l`.
9. An exported `overlays(source, items, existing?)` builds the overlay set
   for a `tokenize` result, merging with `existing` when given, so pipelines
   that call `to_html` themselves get the same behaviour as the option.

## External interface
```ts
type position = number | { line: number; character: number };
type overlay_item =
  | { start: position; end: position; class: string }
  | { line: number; class: string }
  | { lines: (number | [number, number])[]; class: string }
  | { start: position; end: position; hide: true };

interface RenderOptions { overlays?: overlay_item[] }

// for tokenize → to_html pipelines
function overlays(source: string, items: overlay_item[], existing?: OverlayResult): OverlayResult;
```
Output for the example above (source `const total = …` on line 1,
`console.log(total);` on line 2), abbreviated:

```html
<span class="l highlight"><span class="tok keyword">const</span> <span class="tok highlighted-word"><span class="tok constant">total</span></span> …</span>
<span class="l"><span class="tok mark"><span class="tok identifier">console</span></span><span class="tok punctuation">.</span>…</span>
```

## Edge cases & error behavior
- An offset outside `0..source.length`, a line outside `1..line count`, a
  character outside `0..line length`, or an `end` before its `start` throws
  a `RangeError` that names the offending item and field.
- A range with `start === end` applies nothing and is not an error.
- Two range items with the same bounds and different classes yield one
  wrapper carrying both classes.
- A range item that crosses lines is applied per line, following the
  token-mode rule; it never produces a wrapper spanning a line break.
- A class item whose bytes are entirely inside a hidden range renders
  nothing visible; no error.
- Overlapping hidden ranges behave as their union.
- A `lines` item that names the same line twice applies once.
- `overlays: []` is identical to omitting the option.

## Acceptance criteria
- [ ] Each of the four item forms produces the documented HTML on a three-line snippet.
- [ ] `{ line: 2, character: 0 }` on `a\nbc` resolves to offset 2; `{ line: 2, character: 3 }` throws `RangeError`.
- [ ] Items `[A, B]` and `[B, A]` produce identical HTML for any A, B.
- [ ] `{ lines: [2], class: "highlight" }` on a snippet whose line 2 is empty renders `<span class="l highlight"></span>` for that line.
- [ ] A call with both `[!hl]` markers and an `overlays` item renders both sets of classes and `has-` classes for both.
- [ ] `{ start: 0, end: 11, class: "a" }` with `{ start: 6, end: 17, class: "b" }` renders three wrappers: `a`, `a b`, `b`.
- [ ] `class: "bad class!"` throws `TypeError`; `class: "two words"` is accepted and emits both classes.
- [ ] `overlays(source, items)` followed by `to_html` equals `to_html` with the `overlays` option for the same items.
- [ ] The no-option path is byte-identical and within the perf harness noise floor.

## Dependencies
- Depends on: [core](./core.md), [render_options](./render_options.md) (`has-*`)
- Prerequisite: the renderer must apply line-mode overlays regardless of how many lines are hidden and must accept empty ranges on empty lines. A fix for the current behaviour (`to_html_overlay` bounding line-mode overlays by the hidden-lines table) is in progress as a separate task; requirement 8 and the corresponding criterion assume it has landed.
- Depended on by: [markdown_integration](./markdown_integration.md), [focus_and_shiki_notation](./focus_and_shiki_notation.md) (word highlight across lines is expressed as range items)

## Open questions
- Negative `character` meaning "from the end of the line", as shiki allows:
  not included; add if a port needs it.
- Whether `hide` should accept `{ line }` / `{ lines }` forms for whole-line
  removal. Ranges cover it today; the shorthand is convenience.

## Out of scope
- Element name, attributes or a transform callback per range (shiki's
  `tagName`, `properties`, `transform`). Overlays are classes by design.
- Overlays that change token types or reorder text.
- Parsing any string convention into items: see
  [markdown_integration](./markdown_integration.md).
