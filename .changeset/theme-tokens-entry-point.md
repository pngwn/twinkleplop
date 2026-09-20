---
"@twinkleplop/theme-github": patch
"@twinkleplop/theme-atom-one": patch
---

Resolve `./tokens` to compiled JavaScript. The subpath pointed at `src/tokens.ts`, so the documented `import { light, dark } from "@twinkleplop/theme-<name>/tokens"` threw `ERR_UNKNOWN_FILE_EXTENSION` in plain Node and only worked behind a TypeScript-aware bundler. The palettes are now emitted to `dist/tokens.js` alongside a `dist/tokens.d.ts`, generated from the same `src/tokens.ts` the stylesheets come from. The `source` condition still resolves to the TypeScript source.
