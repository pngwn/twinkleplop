---
"@twinkleplop/core": patch
---

Rust and Python highlight faster. Identifier promotions that each walked the whole file now share one walk, and Rust lifetimes are merged without rebuilding the token stream. Output is unchanged.
