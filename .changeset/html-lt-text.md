---
"@twinkleplop/html": patch
"@twinkleplop/svelte": patch
"@twinkleplop/javascript": patch
"@twinkleplop/core": patch
---

A `<` that is not followed by a letter is highlighted as text, so `<p>a < b</p>` no longer shows `b` as an attribute. `` html`<${Tag}>` `` tagged templates still highlight the tag.
