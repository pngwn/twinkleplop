---
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
"@twinkleplop/twoslash": patch
---

Builtin type names such as `any`, `string` and `number` are highlighted as types only where TypeScript reads them as types. A class field named `any`, an object key `number` or a variable called `symbol` highlights like any other name.
