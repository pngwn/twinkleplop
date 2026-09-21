---
"@twinkleplop/core": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
---

Highlight the labels in a labelled tuple as `property` rather than `type`, the same as keys in an object type:

```ts
type Range = [start: number, end: number];
```

Optional and rest labels such as `[a?: T]` and `[...rest: T[]]` are covered too. With `fidelity: ["type"]`, labels stay `identifier`, as object type keys already do.
