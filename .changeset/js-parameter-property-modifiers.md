---
"@twinkleplop/core": patch
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
"@twinkleplop/svelte": patch
---

Highlight the name in a TypeScript parameter property as `parameter`, the same as any other parameter, rather than `identifier`:

```ts
class Animal {
  constructor(
    public name: string,
    private readonly id: number,
  ) {}
}
```
