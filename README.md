# twinkleplop

A high-performance, regex-free syntax highlighter. A language-agnostic runtime engine consumes declarative grammars and emits a flat token stream, implemented as a stack-augmented finite state machine.

## Why

Character scanning with `charCodeAt()` and dense lookup tables outperforms regex by 8–15x in real tokenization workloads. Twinkleplop is built around that observation: a tight, allocation-light hot path with all language logic pushed out to declarative grammars.

## Packages

- `lib/core` — runtime, compiler, DSL, reclassifier, introspector
- `lib/theme-github`, `lib/theme-atom-one` — themes
- `lib/twoslash`, `lib/twoslash-svelte` — twoslash integrations
- `lib/_site` — SvelteKit demo
- `lib/bench` — benchmark harness
- `languages/*` — one package per grammar (javascript, typescript, tsx, rust, go, python, html, css, svelte, markdown, json, yaml, toml, sql, bash, diff, …)

## Install

```bash
pnpm install
```

## Scripts

```bash
pnpm test            # run tests
pnpm test:watch      # watch mode
pnpm build           # build lib + languages
pnpm build:lib       # core + themes only
pnpm build:languages # grammar packages only
pnpm bench           # build, then run benchmarks
pnpm format:write    # oxfmt
pnpm format:check    # oxfmt --check
```

## Architecture

The tokenizer is a finite state machine augmented with a state stack to handle nested and recursive constructs (template literals, embedded languages, brace-depth tracking). A separate post-tokenization layer — the reclassifier — handles cross-language concerns and opt-in fidelity, keeping the hot path language-agnostic.

See `architecture.md` for the long-form design doc, and `lib/core/INTROSPECTION.md` for grammar debugging.

## Authoring grammars

Grammars are written with the DSL in `lib/core/src/dsl.ts`, then mapped and compiled into the runtime's optimized form. Tests live next to sources as either snapshot-style token streams or inline `// ^ token-name` assertions.

When a grammar misbehaves, copy `lib/core/debug-grammar-template.js` into the language package, edit the config block, and run it with `node` — it auto-detects infinite loops and writes a full trace.
