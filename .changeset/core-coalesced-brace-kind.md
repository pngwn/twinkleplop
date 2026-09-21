---
"@twinkleplop/core": patch
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
"@twinkleplop/svelte": patch
---

Classify a brace that shares a token with the punctuation before it. Grammars coalesce adjacent punctuation, so `) {` arrives as two tokens and `){` as one — the same code differing only by a space. The frame tracker classified a brace from the *previous token*, which for `switch(k){` is the identifier `k`, so no rule matched and the body fell through to the fallback kind. A `switch` body read as an object literal, and an arrow returning an object (`x => ({ a: 1 })`) read as a block because the `=>` rule matched a brace that the `(` had already separated from it.

`BraceKindSpec.prev_rules` now also apply to the character immediately before a mid-token brace. Same rules, same kinds: `) {` and `){` classify identically.
