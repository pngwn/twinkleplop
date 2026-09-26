---
"@twinkleplop/rust": patch
---

Stop merging a lifetime with the type after it, so `&'a str` highlights `a` as a lifetime and `str` as a type
