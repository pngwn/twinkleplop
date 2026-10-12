---
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
---

A `/` after the closing parenthesis of an `if`, `while`, `for` or `with` head opens a regex, so the pattern in `if (x) /foo/.test(y)` is read as one. A `/` after a call or a parenthesised expression is still division.
