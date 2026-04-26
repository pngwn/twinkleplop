# twinkleplop

A high-performance, regex-free syntax highlighter.

A language-agnostic runtime engine consumes declarative grammar definitions and emits a flat token stream, implemented as a stack-augmented finite state machine.

## Packages

- `lib/core` — runtime, compiler, DSL, reclassifier, introspector
- `lib/theme-*` — themes (GitHub, Atom One)
- `lib/twoslash*` — twoslash integrations
- `lib/bench` — benchmark harness
- `lib/_site` — SvelteKit demo site
- `languages/*` — one package per grammar (bash, css, diff, go, html, javascript, json, markdown, python, rust, sql, svelte, toml, tsx, typescript, yaml, ...)

## Development

```bash
pnpm install
pnpm test            # vitest run
pnpm test:watch      # vitest watch
pnpm build           # build lib + languages
pnpm build:lib       # core + themes only
pnpm build:languages # language packages only
pnpm bench           # builds first, then vitest bench
pnpm format:write    # oxfmt
pnpm format:check    # oxfmt --check
```

## Documentation

- `architecture.md` — design doc and source of truth for system architecture
- `grammar.md` — grammar authoring reference
- `lib/core/INTROSPECTION.md` — debugging and rule-level introspection
- `lib/core/debug-grammar-template.js` — template for diagnosing grammar issues
