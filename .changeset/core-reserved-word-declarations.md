---
"@twinkleplop/core": patch
---

Fix the unparseable reserved-word declarations in `dist/types.d.ts`. The bundle contained `export const "function" = "function";` and `export const "null" = "null";`, neither of which is valid TypeScript, so any consumer importing the package failed to compile with `TS1134` — and a parse error in a `.d.ts` cannot be suppressed with `skipLibCheck`. The two reserved-word token exports are now declared as legal identifiers and re-exported under their required names, so `TOKENS.function` and `TOKENS["null"]` keep working.
