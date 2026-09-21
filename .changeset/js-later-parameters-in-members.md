---
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
"@twinkleplop/svelte": patch
---

Highlight every parameter of a function inside an object literal, interface or type literal the same way as the first, rather than as `property`:

```ts
type U = { f: (a: string, b: number) => void };
interface I {
  f(a: string, b: number): void;
}
const o = { f: (a: string, b: number) => a };
```

This covers methods, call and construct signatures, and function expressions in an object, including a function-typed parameter such as `cb: () => void`.
