# Reclassifiers

Every twinkleplop language grammar is paired with a reclassifier pipeline
that runs after the raw tokenizer. This document inventories every
reclassifier currently in the tree and labels each one so future work has a
reference for why the pass exists.

## Introduction

A reclassifier is a function `(input, result) -> result` that runs once over
the token stream emitted by the grammar and rewrites, merges, splits, or
splices tokens. Each language exports a `reclassifiers` array which the
package composes after tokenization before returning results.

Three shared primitives live in `lib/core/src/reclassifier.ts`:

- `rewrite_types(rules, options)` — pattern-matched token-type rewriting over
  a local window, with optional lookbehind (`before`), captures, and trivia
  skipping.
- `embed_grammars(mapping)` — replace tokens of a named type with the output
  of tokenizing their source slice as a sub-language.
- `embed_interleaved(config)` — splice interpolated content (tagged templates)
  by building a virtual source of content chunks plus hole placeholders,
  tokenizing once with full state continuity, then remapping positions and
  re-inserting the original hole tokens.

Three shared fidelity helpers live in `lib/core/src/fidelity.ts` and are
exported from `@twinkleplop/core`:

- `promote_by_text_set(source_type, target_type, set)` — rewrite identifier-
  family tokens whose source text is in a word set (builtin types, boolean
  literals, etc.).
- `promote_pascal_case(source_type, target_type)` — rewrite tokens that
  start with an ASCII uppercase letter.
- `promote_function_calls(source_type, target_type, variants)` — rewrite
  identifiers followed by `(...)` (and optional macro/generic/turbofish
  variants) to `function`.

All language pipelines are composed from those primitives plus
language-specific stateful walks.

## Three layers

Each language's reclassifier array breaks into three conceptual layers:

1. **Correctness** — always on. Fixes things the grammar can't emit
   correctly (case-insensitive SQL keywords, Rust generics angle brackets,
   TypeScript type-position tracking, Bash variable extension, Python soft
   keyword `type`). Disabling these would produce output a knowledgeable
   reader would call a bug.
2. **Restoration** — always on by default, but user-controllable. Restores
   the identifier-family classifications the grammar used to emit directly
   (function at call sites, class_name via PascalCase or primitive-type
   sets, boolean literals, builtin type sets). The grammars were simplified
   to emit plain `identifier` for these cases; the restoration layer brings
   the stream back to the fidelity baseline themes expect. Disabling
   restoration is the "low fidelity" tier — output stays lexically valid
   but with less granular identifier classification.
3. **Optional fidelity** — user-selectable extras. Adds richer detail on
   top of the baseline: function-variable detection (`const foo = () =>`),
   interface member promotion, class-name-in-context promotion,
   sub-language embedding, markdown style composition, etc. These compose
   as independent units; the commutativity check in
   `lib/bench/src/commutativity/check.js` verifies that every non-trivial
   subset produces the same output regardless of order.

Correctness vs restoration is an implementation detail from the user's
perspective — both are "the baseline". Optional fidelity is the surface
consumers can toggle to pick their highlighting granularity.

One-line test for layer assignment: if we shipped without this pass,
would users file it as a bug (correctness), as "hey where did my `function`
tokens go" (restoration), or as a feature request (optional fidelity)?

## Per-language inventory

### JavaScript — `languages/javascript/src/reclassifiers.ts`

**Restoration** (run first so downstream passes see the baseline fidelity)

- `promote_boolean_literals` — `promote_by_text_set("identifier",
  "boolean", ["true", "false"])`. The grammar no longer matches these at
  lex time; this pass brings the `boolean` token back.
- `promote_call_site_functions` — `promote_function_calls("identifier",
  "function", { plain: true })`. Identifier immediately followed by `(`
  becomes `function`. Replaces the grammar's former `function_name` probe
  state.

**Optional fidelity**

- `function_variable_rules` — `const foo = () => …`, `{ foo: () => … }`, and
  the async variants promote `foo` to `function`. Contains negative rules
  for labels, class fields, and type annotations so those paths stay as
  identifier or become `property` instead. Runs via `rewrite_types` with
  comment-skipping trivia.
- `interface_member_promoter` — stateful walk; tracks brace depths nested
  under `interface Name [extends …] {` and promotes `identifier :` /
  `identifier ?:` to `property` inside those bodies, guarded against
  promoting typed method parameters and computed keys.
- `class_name_promoter` — stateful walk; after `class` / `interface` /
  `new` / `instanceof` it promotes the name (last segment of a dotted
  chain) to `class_name`, skipping over generic `<…>`. Can upgrade a token
  that an earlier pass left as `identifier`, `type`, or `function`.
- `scan_tagged_template` + `embed_interleaved` — recognizes `` html`…` `` /
  `` css`…` `` and splices the body as HTML or CSS with interpolation
  holes preserved as native JS tokens.

### TypeScript — `languages/typescript/src/reclassifiers.ts`

TypeScript re-exports the JavaScript restoration and optional-fidelity
passes and adds one more restoration pass plus one correctness pass.

**Restoration (additional to the JS restoration)**

- `promote_builtin_types` — `promote_by_text_set("identifier", "type",
  BUILTIN_TYPES)` where BUILTIN_TYPES is `["number", "string", "boolean",
  "any", "never", "unknown", "object", "symbol", "bigint"]`. The grammar no
  longer matches these; this pass replaces the former keyword rule.

**Correctness**

- `type_position_promoter` — stateful FSM that tracks entry into and exit
  from type positions:
  - entry via `:` annotations (return type, parameter annotation, class
    or interface field), `as` / `satisfies`, `extends` in interface heads
    and type-parameter constraints (not the class `extends` value),
    `implements`, generic `<…>` after an identifier, and `type Name =` RHS;
  - inside type mode, identifiers become `type` unless immediately followed
    by `:` (function-type parameter name or object-type property key);
  - demotes `function` tokens that the JS pass promoted wrongly in type
    positions (for example the `function` keyword used as a type);
  - handles nested parens/brackets/braces/angles and value-operator exits.

### TSX — `languages/tsx/src/reclassifiers.ts`

Re-exports the TypeScript pipeline unchanged. No JSX-specific passes yet.

### Python — `languages/python/src/reclassifiers.ts`

**Restoration** (order matters: booleans before PascalCase because "True"
and "False" start with uppercase)

- `promote_python_booleans` — `promote_by_text_set("identifier", "boolean",
  ["True", "False"])`.
- `promote_python_builtins` — `promote_by_text_set("identifier", "builtin",
  BUILTIN_TYPES)`. BUILTIN_TYPES is the lowercase set from `grammar.ts`.
- `promote_python_pascal_case` — `promote_pascal_case("identifier",
  "class_name")`. Upper-first identifiers become class names.

**Correctness**

- `type_alias_rules` — when a `builtin` `type` token is followed by a name,
  an optional PEP 695 parameter list `[T, U]`, and `=`, rewrite it to
  `keyword`. Same text can be either a built-in class (`type(x)`) or a soft
  keyword (`type Vec[T] = list[T]`); lookahead disambiguates.

**Optional fidelity**

- `promote_python_function_calls` — identifier followed by `(…)` becomes
  `function`. Excludes `class_name` (constructors stay typed) and `builtin`
  because those token types are restored before this pass runs. Uses
  `balanced_parens` so coalesced punctuation like `();` still matches.

### Rust — `languages/rust/src/reclassifiers.ts`

**Restoration**

- `promote_rust_booleans` — `promote_by_text_set("identifier", "boolean",
  ["true", "false"])`.
- `promote_rust_primitive_types` — `promote_by_text_set("identifier",
  "class_name", PRIMITIVE_TYPES)`. PRIMITIVE_TYPES covers integer widths
  (`i32`, `u64`, …), float widths (`f32`, `f64`), and `bool`, `char`, `str`.
- `promote_rust_pascal_case` — `promote_pascal_case("identifier",
  "class_name")`. Covers user-defined types (`Vec`, `String`, `Option`, …).

**Correctness**

- `reclassify_generics` — stateful walk; detects `<` in type-generic
  position (lookbehind on `class_name`, `::`, `impl`/`for` keywords, or
  `fn`/`impl`/`for` followed by an identifier), scans forward with depth
  tracking through `<`/`>`/`>>`, and rewrites every angle in the span from
  `operator` to `punctuation`. Bails on ambiguous tokens (`>=`, `<<=`, etc).

**Optional fidelity**

- `function_call_rules` — identifier followed by any of `(…)`, `<…>(…)`,
  `!(…)`, or `::<…>(…)` becomes `function`. Macros, generic calls, and
  turbofish are all covered.
- `extend_lifetime_over_type` — splices a `lifetime` token forward to
  absorb an immediately-following `identifier` or `class_name`, so
  `&'a str` yields one `lifetime` token spanning `a str` plus a separate
  `punctuation` `'` and `operator` `&`. Refuses to absorb a following
  identifier that is itself followed by `(` — that's a function call
  target and belongs to `function_call_rules`. This refusal makes
  `extend_lifetime_over_type` and `function_call_rules` commute.

Pipeline order: restoration first so subsequent passes see the baseline
fidelity (PascalCase names as `class_name`, primitive types as
`class_name`); then `reclassify_generics` uses the class_name lookbehind
to detect type-position `<`; then the optional fidelity passes. The last
two optional passes commute with each other.

### CSS — `languages/css/src/reclassifiers.ts`

**Fidelity**

- `function_call_rules` — identifier followed by `(` becomes `function`.
  All value-position words (color names, keywords, function heads) are
  emitted as identifier by the grammar; this just picks out the calls.

### HTML — `languages/html/src/reclassifiers.ts`

**Fidelity**

- `embed_grammars` mapping `raw_script → JS`, `raw_style → CSS`. The
  sub-language's own reclassifiers run before splicing so JS function
  variables and CSS function calls appear inside the spliced output with
  correct token types and global position coordinates.

The HTML↔JS workspace forms a cycle because JavaScript embeds HTML for
`` html`…` `` tagged templates. Both packages defer the cross-language
lookup to call time (closures over `language`) so the ESM module graph
resolves cleanly.

### Svelte — `languages/svelte/src/reclassifiers.ts`

**Optional fidelity**

- `rewrite_block_braces` — single stateful walk that pairs
  `expression "{"` tokens whose next non-trivia neighbour is a block or
  at-directive sigil (`#`, `:`, `/`, `@`) with their matching
  `expression "}"` and rewrites both to `punctuation` in one pass. This
  replaces an earlier split into two `rewrite_types` passes (open and
  close) whose ordering was load-bearing; the single-walk version is
  order-independent with respect to `embed_grammars`.
- `embed_grammars` mapping `raw_script → JS`, `raw_style → CSS`,
  `raw_svelte_expression → JS`. The JS language applies its full pipeline
  inside every expression head and interpolation.

### Markdown — `languages/markdown/src/reclassifiers.ts`

**Fidelity**

- `compound_styles` — stateful walk with a style stack. The grammar emits
  distinct open / close marker tokens for bold, italic, strike, code,
  link_text, and autolink. The reclassifier pushes on `*_open`, pops on
  `*_close`, and rewrites every emitted token's type to a space-separated
  class list (e.g. `"bold italic"`). The renderer already splits class
  strings on whitespace so multi-class output costs nothing at render time.
  Handles grammar-level stack leaks by flushing across newline gaps and
  deduplicating repeated opens.

### SQL — `languages/sql/src/reclassifiers.ts`

**Correctness**

- `keyword_reclassifier` — stateful walk; every unquoted `identifier` token
  is looked up case-insensitively against three sets (`BOOLEAN_WORDS`,
  `TYPE_WORDS`, `KEYWORD_WORDS`) and promoted to `boolean` / `type` /
  `keyword` if found. Quoted identifiers are skipped. The word sets are a
  permissive union across PostgreSQL, MySQL, SQLite, and T-SQL because
  doing case-insensitive keyword recognition inside the state machine would
  require enumerating every case variant.

### Bash — `languages/bash/src/reclassifiers.ts`

**Correctness**

- `extend_variables` — the grammar emits `$x` as a 2-char `variable` token
  followed by the rest of the identifier as a separate token. This pass
  merges the identifier prefix of the following token into the variable,
  splitting it if there are trailing non-identifier characters. A proper
  grammar-level continuation would leak parent-state copies through
  `fallback(goto(parent))` and break the pairing of `cmd_sub` / `arith` /
  conditional `leave()` calls.
- `merge_numbers` — coalesces arithmetic numeric literals across tokens:
  a `number` ending in `0x` greedily absorbs adjacent `number` /
  `identifier` tokens (hex) and a `number` followed by `#` plus another
  `number` / `identifier` collapses into a single number token (base-N).
  Neither `0xff` nor `16#ff` can be handled in the state machine without
  state-stack leaks.
- `promote_keywords` — whole-token identifier lookup against `RESERVED_SET`,
  `BUILTIN_SET`, and `BOOLEAN_SET` from the grammar, rewriting to
  `keyword` / `builtin` / `boolean`. This runs as a post-pass because
  `keyword()` in the grammar only checks the boundary *after* a match, so
  the reserved word `in` would mid-match inside an identifier like `main`.

Order matters: `extend_variables` runs before `promote_keywords` so that
`$for` stays a single variable and does not lose its identifier tail to
keyword promotion.

### YAML — `languages/yaml/src/reclassifiers.ts`

**Correctness**

- `classify_scalars` — every unquoted `identifier` token is checked against
  `BOOLEAN_VALUES`, `NULL_VALUES`, and a YAML 1.2 core-schema numeric
  validator (decimal, `0x` hex, `0o` octal, float, `.inf`, `.nan`) and
  rewritten to `boolean` / `null` / `number` on match. Quoted scalars are
  untouched.

**Fidelity**

- `promote_keys` — identifier whose next non-trivia token is a single-char
  `:` punctuation becomes `property`. Key / value distinction is purely
  stylistic at the token level.

## Cross-cutting notes

### Ordering

- **Bash**: `extend_variables` → `merge_numbers` → `promote_keywords`. The
  variable extension must run first; keyword promotion last.
- **Rust**: restoration (boolean + primitive types + pascal_case) →
  `reclassify_generics` → optional fidelity. Restoration first so
  `reclassify_generics` sees `class_name` lookbehinds. The two optional
  fidelity passes (`function_call_rules` and `extend_lifetime_over_type`)
  commute with each other since `extend_lifetime` refuses to absorb a
  following identifier that's a call target.
- **JavaScript**: restoration (boolean + call-site function) → optional
  fidelity. The four optional fidelity passes commute — verified by the
  commutativity check on all subsets.
- **TypeScript**: restoration (JS restoration + builtin types) →
  `function_variable_rules` → `type_position_promoter` →
  `interface_member_promoter` → `class_name_promoter` →
  `embed_interleaved`. Restoration runs before `type_position_promoter`
  so that pass sees `function` tokens that it may need to demote in type
  positions.
- **Svelte**: `rewrite_block_braces` and `embed_grammars` commute — the
  single-pass brace rewriter pairs braces by their own token type without
  depending on expression content.

### Inheritance

- TypeScript inherits JavaScript's four passes and adds one.
- TSX re-exports TypeScript verbatim.
- HTML and Svelte embed JS and CSS via `embed_grammars`. Sub-language
  reclassifiers run before their output is spliced into the host stream,
  so the spliced tokens arrive already post-processed.
- No other languages inherit from another.

### Languages without language-specific reclassifiers

None currently ship a grammar without a reclassifier array. TSX ships only
a pass-through array. Any new language can start with an empty array and
add passes incrementally.

## Guidance for future work

- **Adding a correctness pass**: include a failing reclassifier test that
  demonstrates the semantic bug, then add the pass. The bar is "this output
  was wrong before and is right now".
- **Adding a fidelity pass**: optional by definition. Document what richer
  detail it adds and ensure themes degrade gracefully when the token type
  is absent.
- **Choosing a mechanism**: prefer `rewrite_types` when the decision fits
  in a local window (anchor plus short lookahead and optional lookbehind).
  Reach for a stateful walk only when the decision depends on scope
  information that cannot be captured with a bounded window — the existing
  examples are `type_position_promoter`, `interface_member_promoter`,
  `class_name_promoter`, `reclassify_generics`, SQL / Bash / YAML keyword
  classification, and Markdown `compound_styles`.
- **Embedding a sub-language**: use `embed_grammars` for whole-token
  replacement and `embed_interleaved` for templates with interpolation
  holes. Both primitives handle position remapping and token-type merging.
