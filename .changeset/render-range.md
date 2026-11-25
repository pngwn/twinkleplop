---
"@twinkleplop/core": minor
---

Part of an input can be rendered on its own. The `range` render option draws only the lines between two line starts, with line numbers, hooks and overlays reading as they do for the whole input, and `to_lines` returns line elements with no `<pre>` or `<code>` around them.

```ts
const lines = to_lines(code, result, { range: { from: drawn_to, to: result.stable_end } });
```

The lines of consecutive ranges add up to the lines of the whole input, so a page showing code as it streams in can append each settled line once and redraw only the tail. For a 30,000 character file arriving 16 characters at a time that is 0.5 MB of markup handed to the page instead of 156 MB.
