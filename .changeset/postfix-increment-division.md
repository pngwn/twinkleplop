---
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
---

A `/` after a postfix `++` or `--` is read as division, so `a++ / 2 / b` no longer opens a regex.
