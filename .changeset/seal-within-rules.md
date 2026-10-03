---
"@twinkleplop/core": patch
---

`seal: true` on a `within` rule now takes effect, so a delimited span that starts right after another span of the same token type stays a separate token.
