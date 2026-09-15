# Inline structure and per-line / per-token hooks

## Summary
Two renderer capabilities that today force a consumer to rewrite the
renderer: producing inline markup (no block, `<br>` line breaks) for code
inside prose, and attaching a class or attribute to a specific line or
token. Shiki covers these with `structure: 'inline'` and the `line` and
`span` transformer hooks. Both are opt-in per call and cost nothing when
absent.

## User-facing behavior
Inline:

```ts
ts("const x = 1;\nlet y = 2;", { structure: "inline" });
// <span class="tok keyword">const</span> <span class="tok constant">x</span> … <span class="tok punctuation">;</span><br><span class="tok keyword">let</span> …
```

Hooks:

```ts
ts(code, {
  line: (n) => ({ attrs: { "data-line": String(n) } }),
  token: (type, start, end) => type === "function" ? { attrs: { "data-range": `${start}-${end}` } } : undefined,
});
// <span class="l" data-line="1"><span class="tok keyword">const</span> … <span class="tok function" data-range="14-17">add</span>…
```

## Behavioral requirements

### Inline structure
1. `structure` defaults to `"classic"`, today's output. `"inline"` emits no
   `<pre>`, `<code>` or line elements: tokens are `span.tok <type>`, text
   between tokens is bare escaped text, and each newline in the source
   becomes `<br>`.
2. Token-mode overlays and hidden ranges apply in inline mode exactly as in
   classic mode. Line-mode overlays, `line_numbers`, `class_name`,
   `attributes` and `has_classes` have nothing to attach to in inline mode
   and are ignored without error.
3. A hidden line (marker-only comment) produces no `<br>` in inline mode,
   so the visible line count matches classic mode.

### Hooks
4. `line(n, source_line)` is called once per visible line in classic mode,
   with `n` the 1-based visible index (what `.ln` counts before any `start`
   offset) and `source_line` the 1-based line in the input. It may return
   `{ class?, attrs? }`; the class is appended to the line's class list
   after overlay classes, the attributes are emitted on the line element.
   It is not called in inline mode.
5. `token(type, start, end)` is called once per source token, in order,
   with the token's type name and its byte range. It may return
   `{ class?, attrs? }`. A token for which the hook returns a value is
   rendered as its own span carrying the extra class after the type and
   the attributes after the class attribute; it is never merged with a
   neighbouring token of the same type. A token for which the hook returns
   nothing renders exactly as today, including merging.
6. When a token is inside an overlay wrapper, hook output goes on the token
   span, not the wrapper.
7. Hook attributes follow the same rules as `attributes` in
   [render_options](./render_options.md): values escaped, `true` bare,
   `false` omitted, `class` and `style` reserved and rejected with a
   `TypeError`, invalid names rejected.
8. Hooks are only consulted when present. With neither hook passed, the
   output is byte-identical to today and within the perf harness noise
   floor. With hooks present, cost grows with the number of calls and is
   documented as the caller's choice.

## External interface
```ts
interface RenderOptions {
  structure?: "classic" | "inline";
  line?: (n: number, source_line: number) => { class?: string; attrs?: Record<string, string | number | boolean> } | void;
  token?: (type: string, start: number, end: number) => { class?: string; attrs?: Record<string, string | number | boolean> } | void;
}
```

## Edge cases & error behavior
- Inline mode on a single line emits no `<br>` at all; on a source ending
  in a newline, the trailing newline emits a trailing `<br>`, matching
  shiki.
- A `line` hook returning `{ class: "" }` adds nothing.
- A `token` hook that throws propagates the error; nothing is written.
- Hook return values that are not objects (`false`, a string) throw a
  `TypeError`.
- Two adjacent tokens of the same type where the hook decorates only the
  second render as two spans: the first as part of its run, the second
  alone.

## Acceptance criteria
Implemented in `lib/core/src/generator.ts` on both renderer paths; the
no-hook, classic-structure path is byte-identical against the frozen
baseline on every parity check and the `html` mode A/B (37 workloads, two
passes) moved nothing beyond the noise floor.

- [x] `structure: "inline"` on a two-line snippet yields the documented string with exactly one `<br>` and no `<pre>`, `<code>` or `l` classes.
- [x] Inline mode with a `[!hl foo..bar]` marker still wraps the range; with `[!hl]` the line class is dropped silently.
- [x] The `line` hook is called with `(1, 1)`, `(2, 3)` for a snippet whose second source line is a marker-only comment.
- [x] The `token` hook decorating every `function` token emits `data-range` on those spans and leaves all other spans byte-identical to a call without hooks.
- [x] Two adjacent `punctuation` tokens, hook decorating the second only, render as two spans.
- [x] `token: () => ({ attrs: { class: "x" } })` throws `TypeError`.
- [x] No-hook, classic-structure calls are byte-identical and within the perf noise floor.

## Dependencies
- Depends on: [core](./core.md), [render_options](./render_options.md) (attribute rules)
- Depended on by: [markdown_integration](./markdown_integration.md) (inline code), [whitespace_rendering](./whitespace_rendering.md) (both structures)

## Open questions
- Whether the `line` hook should also receive the line's source byte range.
  Cheap to add; nobody asked yet.
- Whether inline mode should offer a wrapper class option
  (`<span class="twinkleplop-inline">…</span>`) so CSS can scope it. The
  markdown integration adds its own wrapper; a raw caller can too.

## Out of scope
- A tree or visitor API; hooks return data, they do not receive nodes.
- Hooks on `<pre>` or `<code>`: `class_name` and `attributes` cover them.
- Changing token text or boundaries from a hook.
