---
"@twinkleplop/core": patch
---

A non-ASCII character that changes a grammar's state, such as a `λ` prompt symbol, is tokenized correctly along with the text after it, including when it is the last character of the input.
