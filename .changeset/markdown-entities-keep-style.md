---
"@twinkleplop/markdown": patch
---

An entity or a bare `[text]` inside a heading or an emphasis span keeps the rest of that heading or span styled.

```text
## Tom & Jerry   <- " Jerry" stays heading text
**a &amp b** c   <- " b" stays bold and the second ** closes it
```
