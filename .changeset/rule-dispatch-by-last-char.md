---
"@twinkleplop/core": patch
"@twinkleplop/javascript": patch
---

Highlighting is about 5% faster for JavaScript and TypeScript. `rewrite_types` now picks a token's candidate rules by its last character up front, and the tagged-template and JSDoc scanners no longer allocate a string or look up a WeakMap at every token. Output is unchanged.
