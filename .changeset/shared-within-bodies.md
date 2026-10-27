---
"@twinkleplop/core": patch
---

Identical `within` rules in different states now share one generated body state, so grammars that repeat a string or comment rule across states compile faster. Output is unchanged.
