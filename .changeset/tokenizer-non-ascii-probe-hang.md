---
"@twinkleplop/core": patch
---

Tokenizing no longer hangs when a custom grammar starts a probe on a non-ASCII character and the probe reaches the end of the input with no `fallback` state. The character is skipped, the same as an ASCII one.
