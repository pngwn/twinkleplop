# Cross-line word highlight

## Summary
The set form `=anchor` highlights every occurrence of an anchor, but only
on the marker's own line, so a marker on a line of its own finds nothing.
Shiki's `[!code word:x:N]` reaches the N lines below. This spec lets the set
form take a line scope using the line forms the marker grammar already has,
plus one new form for "everywhere".

## User-facing behavior
An author writes a marker on its own line and names the lines it covers:

```ts
// [!hl =Hello +2]
const msg = 'Hello World'
console.log('Hello')
const other = 'Hello'
```

Both `Hello` on the two lines below the marker are wrapped in
`span.tok.highlight`; the third is not. `// [!hl =Hello :*]` would wrap all
three. `// [!hl =Hello :2...3]` names absolute lines. A trailing
`// [!hl =Hello]` keeps today's meaning: the marker's own line.

## Behavioral requirements
1. The set form accepts an optional scope after the anchor, separated by a
   space: `+N`, `:N`, `:N..M`, `:N...M`, or `:*`.
2. Without a scope the set form behaves exactly as today: occurrences on
   the marker's own line only.
3. `+N` selects the N lines after the marker's line, not the marker's line,
   matching `+N` everywhere else in the grammar. `:N`, `:N..M` and
   `:N...M` select absolute lines with the grammar's existing
   exclusive/inclusive rules. `:*` selects every line of the snippet.
4. Within the selected lines, occurrences are found with the anchor's usual
   rules: whole-word for bare words, substring for quoted literals,
   occurrences inside comments skipped. Every occurrence on every selected
   line is wrapped; occurrences on unselected lines are not.
5. Overlays are token-mode, one per occurrence, and merge with any other
   overlay on the same bytes as [core](./core.md) describes.
6. Zero occurrences across the selected lines is reported as
   `anchor_not_found`, as for the unscoped form.
7. Plugins receive the scope in their parsed arguments; every built-in style
   plugin treats a scoped set form as token-mode, as it does today.
8. A scoped set form cannot be paired and cannot carry a wildcard anchor;
   both remain `set_with_pairing` / `malformed` respectively.

## External interface
Marker grammar additions (see `lib/annotation/README.md`):

| form                 | meaning                                              |
| -------------------- | ---------------------------------------------------- |
| `=foo`               | every `foo` on the marker's line (unchanged)         |
| `=foo +N`            | every `foo` on the N lines below the marker          |
| `=foo :N`            | every `foo` on line N                                |
| `=foo :N..M`         | every `foo` on lines N+1 … M−1                        |
| `=foo :N...M`        | every `foo` on lines N … M                            |
| `=foo :*`            | every `foo` in the snippet                           |

```ts
type ParsedArgs = … | {
  kind: "set";
  anchor: Anchor;
  scope?: { kind: "lineCount"; count: number } | { kind: "lineRef"; from: number; to?: number; inclusive?: boolean } | { kind: "all" };
};
```

## Edge cases & error behavior
- `+N` reaching past the last line selects the lines that exist; not an
  error.
- `:N` beyond the last line is `malformed` (line does not exist), matching
  the existing `:N` behaviour.
- A selected line that is itself a marker-only comment is hidden as usual;
  the anchor is never matched inside it.
- The same occurrence selected by two markers is wrapped once with both
  classes.
- `=foo *` (bare wildcard) and `=foo +` (missing count) are `malformed`.

## Acceptance criteria
- [x] `// [!hl =Hello +2]` above three lines each containing `Hello` wraps the first two and not the third; the marker line is gone.
- [x] `// [!hl =Hello :*]` wraps all three.
- [x] `// [!hl =Hello :3]` wraps only line 3's occurrence.
- [x] `const a = 'Hello' // [!hl =Hello]` still wraps only that line's occurrence.
- [x] `// [!hl =Nope +2]` reports `anchor_not_found` through `on_error` and renders nothing extra.
- [x] A line containing `Hello` twice inside the scope gets two wrappers.
- [x] Existing set-form tests pass unchanged.

## Dependencies
- Depends on: [core](./core.md)
- Depended on by: [focus_and_shiki_notation](./focus_and_shiki_notation.md) (`word:text:N`)

## Open questions
- Whether an anchor should also be allowed to match inside string tokens
  only, or inside comments when explicitly asked. Not planned.

## Out of scope
- Regular-expression anchors.
- Highlighting across snippets or files.
