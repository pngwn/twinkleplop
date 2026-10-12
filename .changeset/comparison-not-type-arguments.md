---
"@twinkleplop/core": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
---

A `<` and `>` with `&&`, `||` or another operator that only a value expression can hold between them are read as comparisons, so `if (a < b && c > (d + 1))` no longer reads `a` as a generic call and `b` as a type argument.
