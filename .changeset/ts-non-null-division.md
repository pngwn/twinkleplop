---
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
---

A `/` after a non-null assertion is read as division, so `x! / y` and `f()! / 2` no longer open a regex that swallows the rest of the line.
