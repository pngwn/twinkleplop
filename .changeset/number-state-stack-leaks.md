---
"@twinkleplop/json": patch
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
"@twinkleplop/svelte": patch
"@twinkleplop/html": patch
"@twinkleplop/go": patch
"@twinkleplop/rust": patch
"@twinkleplop/sql": patch
---

Long runs of numbers no longer break the highlighting that follows them. In JSON, JavaScript, TypeScript, TSX, Go, Rust and SQL, a file with a few hundred numeric literals went wrong partway through and stayed wrong, and highlighting such files repeatedly slowed down every other language in the same process:

```js
const samples = [0.5, 1.5, 2.5 /* ...300 more */];
if (ready) start(); // `if` was highlighted as a plain identifier
```

In JavaScript, an exponent in a call argument such as `f(1e3, x)` no longer drops the highlighting for the rest of the input.
