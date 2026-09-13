# Whitespace and indent-guide rendering

## Summary
Whitespace between tokens is emitted as bare text, so a theme cannot show
dots for spaces, arrows for tabs, or vertical indent guides. Two render
options wrap that whitespace in spans, matching shiki's
`transformerRenderWhitespace` and `transformerRenderIndentGuides`. The token
vocabulary already names `space` and `tab`; this spec makes them appear.

## User-facing behavior
```ts
ts(code, { whitespace: "trailing", indent_guides: true });
```

renders leading indentation as one `span.indent` per level and any spaces
or tabs after the last token of a line as `span.tok.space` /
`span.tok.tab`, so CSS such as `.tok.space::before { content: "·" }` and
`.indent { box-shadow: inset 1px 0 var(--guide) }` works. With
`whitespace: "all"`, every space and tab outside a token is wrapped.

## Behavioral requirements
1. `whitespace` accepts `"all"`, `"boundary"`, `"leading"` or `"trailing"`;
   absent means no wrapping. Only whitespace outside tokens is affected;
   whitespace inside a token (a string literal, a comment) is part of that
   token and is untouched.
2. `"leading"` wraps whitespace before the first token of a line,
   `"trailing"` after the last, `"boundary"` both, `"all"` every run of
   whitespace outside tokens.
3. Each space becomes `<span class="tok space"> </span>` and each tab
   `<span class="tok tab">\t</span>`, one span per character, so column
   width is unchanged and CSS can mark each one.
4. `indent_guides` accepts `true` or `{ size: number }`. Leading
   indentation is split into levels: a tab is one level, `size` consecutive
   spaces are one level (default 2). Each level renders as
   `<span class="indent">` around its characters; a remainder shorter than
   a level stays as it was.
5. When both options apply to the same characters, the indent span is the
   outer element and the space/tab spans are inside it.
6. Both options work in classic and inline structure.
7. Whitespace produced by hiding a range (marker bytes replaced with spaces)
   is not source whitespace and is never wrapped.
8. Carriage returns and other whitespace characters are not wrapped.

## External interface
```ts
interface RenderOptions {
  whitespace?: "all" | "boundary" | "leading" | "trailing";
  indent_guides?: boolean | { size?: number };
}
```
Output for `\tif (x) {\n\t\treturn  1;  \n` with `whitespace: "trailing", indent_guides: true`:

```html
<span class="l"><span class="indent">	</span><span class="tok keyword">if</span> …</span>
<span class="l"><span class="indent">	</span><span class="indent">	</span><span class="tok keyword">return</span>  <span class="tok number">1</span><span class="tok punctuation">;</span><span class="tok space"> </span><span class="tok space"> </span></span>
```

## Edge cases & error behavior
- An empty line renders nothing extra under any setting.
- A line consisting only of whitespace: under `"leading"` and `"trailing"`
  it is wrapped once, not twice; under `indent_guides` it is treated as
  indentation.
- Mixed tabs and spaces in indentation count levels in order of appearance:
  a tab then two spaces is two levels at `size: 2`.
- `size` that is not a positive integer throws a `RangeError`.
- A line-mode overlay class stays on the line element; wrapping does not
  change which bytes an overlay covers.

## Acceptance criteria
- [ ] `whitespace: "all"` on `return  1;` wraps both spaces as `tok space` spans; the string `'a b'` keeps its space inside the string token.
- [ ] `whitespace: "trailing"` wraps only the two trailing spaces of `return  1;  `.
- [ ] `indent_guides: true` on a line indented with two tabs emits two `span.indent`; with four spaces and `{ size: 2 }`, two; with three spaces, one plus a bare space.
- [ ] With both options, the indent span contains the tab span.
- [ ] Inline structure output wraps whitespace the same way.
- [ ] A hidden marker's substituted spaces are not wrapped.
- [ ] Calls without either option are byte-identical and within the perf harness noise floor.

## Dependencies
- Depends on: [core](./core.md), [inline_and_hooks](./inline_and_hooks.md) (must hold in both structures)
- Depended on by: none

## Open questions
- Shiki also splits whitespace inside tokens (a space inside a string gets
  its own span). Not planned; it changes token boundaries. Revisit if a
  theme needs it.
- Auto-detecting indent size from the first indented line instead of a
  fixed default.

## Out of scope
- Rendering line endings or non-breaking spaces visibly.
- Any CSS.
