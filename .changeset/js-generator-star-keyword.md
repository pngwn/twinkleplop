---
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
"@twinkleplop/svelte": patch
---

Highlight a generator's `*` as a `keyword` rather than an `operator`, matching Shiki. This applies at every fidelity setting.

```js
function* ids() {
  yield* other();
}

class Tree {
  *[Symbol.iterator]() {}
  static async *walk() {}
}
```
