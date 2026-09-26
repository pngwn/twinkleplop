---
"@twinkleplop/core": patch
---

A nested generic closed with `>>` or `>>>` right before a body brace, as in `class Q implements Iterable<Job<T>> {`, now ends the type there. The class body used to be highlighted as types.
