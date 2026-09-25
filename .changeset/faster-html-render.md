---
"@twinkleplop/core": patch
---

Rendering highlighted code to HTML is faster. Span tags are built once per token type and reused, and line breaks and indentation are written in a single step. Output is unchanged.
