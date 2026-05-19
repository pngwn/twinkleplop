# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git conventions

### Commits
- Subject under 72 chars, preferable under 5-7 words. imperative mood, no trailing period
- All lower case.
- No punctuation.
- DO NOT add a body
- One logical change per commit; split unrelated work
- No attribution trailers, no emoji, no "Generated with…" footer

### PR titles
- Concise, no ticket numbers in the title, fewer than 10 words

### PR descriptions
- Lead with a one-line summary
- Use "Closes <ISSUE_NUMBER>" or "Fixes <ISSUE_NUMBER>" where appropriate.
- What changed — conceptual only DO NOT list files or code
- DO NOT create a bulleted list of code changes or files touched, the diff does this
- DO NOT add "Test plan" sections or similar, this is implicit and handled by CI checks
- The PR description should be tailored to the PR itself, similar to how a human would approach it. A complex change requires more context and a more detailed conceptual description. A simple change is fine with a single sentence and "closes" tag.

## Code Style

- Use tabs for indentation (enforced by oxfmt)
- Use double quotes for strings in JavaScript

### Naming Conventions

- **`PascalCase`** — types and classes
- **`SCREAMING_SNAKE_CASE`** — constants
- **`snake_case`** — everything else: variables, functions, properties, file names, directory names, modules

This applies universally: top-level and nested, internal and public-facing APIs that users consume. When extending third-party interfaces, match their casing for compatibility. All other code must follow the conventions above.

### Comments

- Comments exist to explain **why**, not what. Only use comments to clarify complex code or explain why something was done differently.
- Do NOT comment to describe control flow or what code does. The code itself should express this. If a comment feels necessary to explain what is happening, refactor the code instead.
- Always write comments in all lowercase.
- Only use regular ascii and common punctuation. No hyphens, em dashes, en dashes, arrows, or unicode symbols.

## Project Overview

Twinkleplop is a high-performance, regex-free syntax highlighter. A language-agnostic runtime engine consumes declarative grammar definitions and emits a flat token stream, implemented as a stack-augmented finite state machine.

## Architecture

### Design principles
- **Performance first**: character scanning over regex; tight loops over abstractions; typed arrays over objects in hot paths.
- **Separation of concerns**: language-agnostic runtime; per-language grammars are external and declarative.
- **Declarative grammars**: authored via the DSL in `lib/core/src/dsl.ts`, mapped and compiled into the runtime's optimized form.
- **User-controlled fidelity**: the reclassifier (`lib/core/src/reclassifier.ts`) lets consumers opt into finer token distinctions on top of the base token stream. The perf cost of opt-in fidelity is the feature's cost, not overhead to minimize.
- **Robustness**: nested contexts, language injection, probe-mode lookahead for grammatical ambiguities.

### Performance principles
The principles below shape new code. The codebase already follows them — don't relitigate, but do uphold them when adding to hot paths.

- Character scanning with `charCodeAt()` beats regex for tokenization. Avoid regex in hot paths.
- Lookup tables (dense `Uint8Array` over ASCII) for character classification.
- Computed integer indices for state transitions; avoid string keys.
- Context chomping: tight inner loops once you're inside a known construct (string, comment, number).
- Pre-allocate typed arrays; avoid string slicing and generators in the tokenizer loop.
- Scan identifiers as a span, then check a `Set` for keywords.

For implementation specifics (transition table layout, token storage shape, integer encodings), read the code — `lib/core/src/tokenizer.ts`, `compiler.ts`, `scan.ts`. `architecture.md` is the longer-form design doc.

## Development commands

```bash
pnpm install                # install
pnpm test                   # vitest run
pnpm test:watch             # vitest watch
pnpm build                  # build lib + languages
pnpm build:lib              # core + themes only
pnpm build:languages        # language packages only
pnpm bench                  # builds first, then vitest bench
pnpm format:write           # oxfmt
pnpm format:check           # oxfmt --check
```

`pnpm bench` requires a build, which the script handles. Running `vitest bench` directly without building will fail.

## Project structure

pnpm workspace, defined in `pnpm-workspace.yaml` as `lib/*` and `languages/*`.

- `lib/core` — runtime, compiler, DSL, reclassifier, introspector. TypeScript.
- `lib/_site` — SvelteKit demo site.
- `lib/bench` — benchmark harness.
- `lib/theme-*`, `lib/twoslash*` — themes and twoslash integrations.
- `languages/*` — one package per language grammar.
- `architecture.md` — design doc and source of truth for the system architecture.
- `.oxfmtrc.json` — formatter config.

## Testing

Two styles, both via vitest:
1. **Snapshot**: code snippet plus expected token stream JSON.
2. **Assertion**: inline `// ^ token-name` comments in the source.

Place tests next to sources (`*.test.ts` / `*.test.js`).

## Debugging grammars

When tokenization misbehaves (infinite loops, unexpected tokens, probe-mode issues, stuck positions), copy `lib/core/debug-grammar-template.js` into the affected package and edit the config block at the top (grammar import, test input, verbosity). Run with `node`. The template auto-detects infinite loops and writes a full trace log.

For deeper introspection (rule-level matching, probe entry/exit, state stack diffs), see `lib/core/INTROSPECTION.md`.
