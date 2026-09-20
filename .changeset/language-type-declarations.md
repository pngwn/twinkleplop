---
"@twinkleplop/bash": patch
"@twinkleplop/css": patch
"@twinkleplop/diff-basic": patch
"@twinkleplop/diff": patch
"@twinkleplop/go": patch
"@twinkleplop/html": patch
"@twinkleplop/javascript": patch
"@twinkleplop/json": patch
"@twinkleplop/markdown": patch
"@twinkleplop/python": patch
"@twinkleplop/rust": patch
"@twinkleplop/sql": patch
"@twinkleplop/svelte": patch
"@twinkleplop/toml": patch
"@twinkleplop/tsx": patch
"@twinkleplop/typescript": patch
"@twinkleplop/whitespace": patch
"@twinkleplop/yaml": patch
---

Ship type declarations. Each package now builds a `dist/types.d.ts` and exposes it through a `types` export condition. Previously a plain `import { language } from "@twinkleplop/<lang>"` failed with `TS7016` under `strict`, and silently resolved to `any` without `noImplicitAny`, so a permissive compile was no evidence of type safety. The `main` field also pointed at `src/index.js`, which no package shipped; it now points at `dist/index.js`.
