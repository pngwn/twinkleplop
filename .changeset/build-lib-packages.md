---
"@twinkleplop/annotation": patch
"@twinkleplop/core": patch
"@twinkleplop/markdown-core": patch
"@twinkleplop/markdown-it": patch
"@twinkleplop/rehype": patch
"@twinkleplop/remark": patch
"@twinkleplop/twoslash": patch
"@twinkleplop/twoslash-svelte": patch
---

Ship built JavaScript and type declarations. These packages previously resolved to their TypeScript sources, so importing them outside a TypeScript aware bundler failed with `ERR_UNKNOWN_FILE_EXTENSION`. `@twinkleplop/twoslash-svelte` pointed at a file that did not exist at all, and `@twinkleplop/core` declared a types path it never built. The `source` condition still resolves to source, so workspace tooling and type checking against sources are unchanged.
