---
"@twinkleplop/core": patch
---

Tokenizing is much faster for every language. Runs of characters that produce no token are skipped in one step, the rules that can take the fast path are worked out once when a grammar is compiled, and each call allocates far less. Compiling a grammar takes a few microseconds longer. Output is unchanged.
