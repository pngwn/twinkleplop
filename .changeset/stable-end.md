---
"@twinkleplop/core": minor
---

Open input reports how much of it is settled. The result of a tokenize call with `open: true` has `stable_end`, the start of the first line that can still change, and the `held_tail` render option draws the text after it without tokens or leaves it out.

```ts
const html = highlight(code_so_far, { open: true, held_tail: "plain" });
```

Text before `stable_end` is never hidden later and the grammar's tokens before it are final, so a half-typed keyword or an unclosed string on the last line no longer flickers. Passes that wait for a closer, such as an embedded template body, can still recolour earlier tokens when it arrives.
