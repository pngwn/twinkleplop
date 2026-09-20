---
"@twinkleplop/core": patch
---

Re-export `Grammar`, `CompiledGrammar`, `GrammarRule` and `GrammarState` from `@twinkleplop/core/compile`. `compile` and `define_grammar` return these types, but they were only reachable through `@twinkleplop/core/types`, so a package that built a grammar with them could not emit its own declarations: TypeScript reported `TS4023`/`TS4082` for a type it could not name through the subpath the value came from.
