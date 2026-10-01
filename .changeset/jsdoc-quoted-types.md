---
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
---

Quoted strings inside a JSDoc type expression are read as strings, so `{import('@sveltejs/kit').Adapter}` no longer reads `@sveltejs` as an inline tag or the `/` as comment text.
