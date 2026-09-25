---
"@twinkleplop/core": patch
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
---

JavaScript, TypeScript and Svelte highlight faster. Sources and tokens that cannot hold embedded HTML, CSS or JSDoc are no longer scanned for them, repeated embedded regions reuse their type mappings, and TypeScript generics are found without rescanning whole blocks after a comparison. Output is unchanged.
