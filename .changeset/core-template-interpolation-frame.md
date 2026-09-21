---
"@twinkleplop/core": patch
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
"@twinkleplop/svelte": patch
---

Read a template interpolation's brace as an expression rather than an object literal. The `{` in `${` shares a token with the `$`, so the frame tracker could not place it and fell through to the fallback kind. `` `${function () {}}` `` was tracked as an object literal, and `` `${ foo(a) }` `` tagged `a` as a parameter as if `foo` were a method signature.
