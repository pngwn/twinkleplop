---
"@twinkleplop/core": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
---

Highlight the type in an optional annotation (`x?: T`) as `type`, the same as in a required one, rather than `identifier`:

```ts
interface Hooks {
  line?: (n: number, source_line: number) => HookResult | void;
  options?: RewriteOptions;
}
```

This covers optional interface members, class fields and parameters. An optional method's return type, as in `f?(): R`, is still `identifier`.
