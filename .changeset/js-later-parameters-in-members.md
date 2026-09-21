---
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
"@twinkleplop/svelte": patch
---

Stop reading a function's later parameters as property keys when the function sits inside an object literal, interface body or type literal. Every parameter after the first came out `property`:

```ts
type U = { f: (a: string, b: number) => void };
interface I {
  f(a: string, b: number): void;
}
const o = { f: (a: string, b: number) => a };
```

`a` was `parameter` and `b` was `property`. Call and construct signatures, object-literal methods and `function` expressions in an object had the same problem. So did a function-typed parameter such as `cb` in `{ f(a: string, cb: () => void) {} }`, which the method-shorthand rule read as a `function`.

The frame table marks a token as a member start after a `,` in any frame, including a parameter list's parens. The member-key rules checked the frame kind by walking out through parens and brackets to the nearest brace, so a parameter after a comma looked like the start of a member of the enclosing object. The rules now check the token's own frame. For a real key, whose own frame is the brace, the result is the same as before. The direct check also skips the walk.

Each later parameter now reads the same as the first one in its list. Across the perf corpus the change moves 57 tokens, all in TypeScript: 48 become `parameter`, and 9 inside an interface member's function type become `identifier`, like the first name in their list.
