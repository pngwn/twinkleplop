---
"@twinkleplop/core": patch
"@twinkleplop/twoslash": patch
"@twinkleplop/twoslash-svelte": patch
"@twinkleplop/theme-github": patch
"@twinkleplop/theme-atom-one": patch
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

Fix the published type declarations and consumer entry points.

- `@twinkleplop/core`: `dist/types.d.ts` no longer contains `export const "function"` / `export const "null"`, which were not parseable TypeScript and broke compilation for every consumer (`skipLibCheck` cannot suppress a parse error). The reserved-word token exports are now declared as legal identifiers and re-exported under their required names.
- `@twinkleplop/core`: classes reachable from more than one entry point (`TokenizerIntrospector`, `GrammarMapper`) no longer carry `private` members in the bundled declarations, so the per-subpath copies share one structural identity. Passing `TokenizerIntrospector` from `/introspector` to `tokenize` from `/debug`, or to `GrammarMapper.create_enhanced_introspector`, now type-checks.
- `@twinkleplop/core/compile`: re-exports `Grammar`, `CompiledGrammar`, `GrammarRule` and `GrammarState`, so downstream packages can emit declarations for values built with `compile` and `define_grammar`.
- Language packages: ship `dist/types.d.ts` and expose it through a `types` export condition. Previously a plain `import { language } from "@twinkleplop/<lang>"` failed with `TS7016` under `strict`, and silently became `any` without `noImplicitAny`. Their `main` also pointed at `src/index.js`, which no package shipped; it now points at `dist/index.js`.
- `@twinkleplop/twoslash` / `@twinkleplop/twoslash-svelte`: the default `class_name` is now `"twinkleplop twoslash"` instead of `"highlight twoslash"`. Themes bind token colours to `.twinkleplop`, so default Twoslash output rendered uncoloured. This changes the `<pre>` class in the output; pass `class_name` to restore the old value.
- `@twinkleplop/twoslash`: adds `@twinkleplop/twoslash/style.css`, the layout and visibility rules for the `twoslash-*` spans. Without it every popover rendered inline, putting hover type text in the middle of the code.
- Theme packages: `./tokens` resolves to compiled JavaScript instead of `src/tokens.ts`, which plain Node could not load (`ERR_UNKNOWN_FILE_EXTENSION`).
