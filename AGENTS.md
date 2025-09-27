# Repository Guidelines

## Project Structure & Modules
- Root: pnpm workspace with Vitest and Biome.
- `packages/core`: tokenizer runtime and build artifacts (`dist/`), TypeScript config, `vite` builds.
- `packages/css`, `packages/whitespace`: language grammars (`src/index.js`, `src/grammar.js`) with tests.
- `packages/_site`: SvelteKit demo site consuming workspace packages.
- See `architecture.md` for the tokenizer design and data structures.

## Build, Test, and Development
- Install: `pnpm install`
- Test (root): `pnpm test` or `pnpm -r test` — runs Vitest across packages.
- Benchmarks: `pnpm bench` — runs Vitest bench.
- Core build: `pnpm -C packages/core build`
- Demo site (dev): `pnpm -C packages/_site dev`
- Type check (core): `pnpm -C packages/core typecheck`

## Coding Style & Naming
- Formatter/Linter: Biome (tabs; double quotes). Run:
  - `npx biome format --write .`
  - `npx biome check --write .`
- ESM modules; prefer TypeScript in `core` and plain JS in grammar packages.
- File layout: entry `src/index.js`; grammar `src/grammar.js`; tests `*.test.js` in `src/` or `test/`.

## Testing Guidelines
- Framework: Vitest.
- Place unit tests near sources (e.g., `src/grammar.test.js`) or under `test/`.
- Keep tests minimal and focused on token boundaries; add regression cases for ambiguous/probe scenarios.
- For performance-sensitive changes, include a simple bench or numbers in the PR description.

## Commit & Pull Request Guidelines
- Commits: imperative mood, scoped when helpful, e.g. `feat(core): faster lookup tables`, `fix(css): handle nested rules`.
- PRs must include: clear description, linked issue (if any), test coverage for new behavior, and before/after metrics or screenshots for site changes.
- Ensure Biome passes and tests are green before requesting review.

## Security & Configuration Tips
- Use Node 18+ and recent pnpm. Do not commit secrets.
- The demo site is private (`packages/_site`); avoid publishing artifacts from it.
- Prefer workspace dependencies (`workspace:*`) for local packages.

