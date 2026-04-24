# Research findings: context-sensitive disambiguation for twinkleplop

## 0. Orientation

This document is the response to `LANGUAGE_RESEARCH.md`. I surveyed the approaches called out there (and a few adjacent ones) against the specific constraints of the existing twinkleplop highlighter, and then narrowed to a concrete proposal.

The headline conclusion, up front, so the reasoning can be evaluated against it:

> The systematic failures the task describes ("the Nth occurrence breaks", "class fields that don't immediately follow the class declaration drift", "interface members vs type literal members diverge") are almost entirely **context-tracking failures**, not **lookahead failures**. The existing probe mechanism already gives you bounded forward speculation. The existing reclassifier already gives you bounded post-pass window matching. The missing piece is **bounded declarative state attached to stack frames** — the same category of state tree-sitter's external scanners carry (bounded counters, flags, last-token memory, small stacks) but expressed declaratively and compiled into the transition table.
>
> The recommended extension is **one new concept**: `slots`. Each state may declare named, typed, bounded slots; rules read them as predicates and write them as actions; they live on the stack frame they are declared on. Everything else — branch points, bounded k-token lookahead, Schrödinger tokens, island grammars — either already exists in your system under another name, or is redundant with what slots + the existing reclassifier can express.

What follows is the argument for that conclusion.

---

## 1. What twinkleplop already has (and why it matters)

Before surveying approaches, it's worth writing down precisely what exists, because the "middle ground" the task asks for is a different place depending on where you're standing. (All citations are to the current working tree.)

**Stack-augmented character-scan FSM** (`lib/core/src/tokenizer.ts:28-87`). The tokenizer carries `state_stack: Uint16Array`, `stack_ptr`, `current_state`, `pos`, a `Uint32Array` of `[type,start,end]` token triplets, and last-token coalescing state. No user sidecar slot.

**Three stack ops** in rule actions (`lib/core/src/types.ts:22-24`): `state: X` pushes, `state: X, exit: true` sets (sideways), `exit: true` pops.

**Character class / pattern matchers** (`lib/core/src/types.ts:7-25`): `match` (string / string[]), `range`, `match_within` (paired delimiters, compiles to auto-generated states at `compiler.ts:499-594`), `any` (fallback), `boundary` (word-boundary check).

**Probe states** (`lib/core/src/types.ts:40`, `tokenizer.ts:69-75`) — the most important existing primitive for this discussion. A state with `mode: "probe"` tentatively matches rules _without emitting tokens_; if a transition out of the probe succeeds, position resets to entry and the trigger rule replays in the resolved target state; if no rule matches, the probe falls back to a declared fallback state. Failed probes are memoized (`tokenizer.ts:72-75,161-174`) to prevent re-attempt loops. In JS, this is what distinguishes `identifier(` (→ function) from bare `identifier` (→ identifier) at `languages/javascript/src/grammar.ts:371-381`.

**Rulesets with parameters** (`lib/core/src/types.ts:48`, `compiler.ts:83-327`). Compile-time specialization, not runtime polymorphism. This is the DRY-mechanism analogue of Sublime's variables plus partial include.

**A declarative reclassifier pass** (`lib/core/src/reclassifier.ts`). A pure function `(input, TokenizeResult) -> TokenizeResult`, composed into pipelines. The combinator DSL supports `type(type, value?)`, `seq(...)`, `any_of(...)`, `optional(...)`, `capture(name, inner)`, `balanced_parens(open, close)` with a `max_tokens` cap. Rules are `{ anchor, anchor_value?, before?, when, rewrite }`: the anchor fires on a matching token type; `before` is bounded lookbehind; `when` is bounded lookahead; `rewrite` retags either the anchor or named captures. Trivia (comments) is skipped between pattern elements. In JS, this already handles `const foo = () => …` → `foo: function`, `{ foo: bar }` → `foo: property`, tagged template language embedding, and more (`languages/javascript/src/reclassifiers.ts`).

**A commented-out, explicitly-labelled "too hard for this mechanism" rule** (`languages/javascript/src/reclassifiers.ts:104-134`) — the class-field-vs-interface-member distinction. The author tried to express "am I in a class body or an interface body?" via lookbehind and failed. This is the concrete evidence that what's missing is _contextual state_, not lookahead.

**Documented known limitations** (`languages/typescript/src/grammar.ts:13-25`): "type annotations after `:` are not tracked as a separate context", "generic type parameters `<T>` not distinguished from comparison", "contextual keywords always highlighted as keywords", "generic function calls highlight foo as identifier, not function, because the probe does not scan past `<…>` to see `(`".

This matters because it narrows the search: you already have bounded forward lookahead (probes), bounded backward/forward windowing (reclassifier), and shareable rule bodies (rulesets). The rest of this document evaluates what primitives, if any, you're still missing.

---

## 2. Approaches surveyed

Each entry uses the format the task requested: summary → state model → TS `identifier :` walkthrough → trade-offs → compatibility verdict → sources.

### 2.1 Sublime `branch_point` / `branch` / `fail`

**Summary.** Sublime's stack-based syntax engine allows any match to register a _branch point_: a named checkpoint (position, stack, emitted-tokens length). The rule selects among N alternative contexts to push; if any of them later emits a `fail` action naming the branch, the engine truncates tokens to the checkpoint, restores stack and position, and tries the next alternative. This is the only production system in the task's avenues that sits exactly in the same architectural family as twinkleplop — declarative YAML, compiled, stack-based, no host callbacks, no runtime mutation — and has a dedicated mechanism for genuine multi-alternative disambiguation.

**State model.** Each branch point is a frame on a parallel branch-points stack (`syntect/parser.rs:116-139`): name, `next_alternative: usize`, `alternatives: Vec<ContextReference>`, full stack snapshot, per-frame prototype / escape state, `ops_snapshot_len` (where to truncate the token stream), `match_start` (where to rewind), `line_number` (for the 128-line cap). Per-match state grows with grammar depth; per-input state grows only with the number of _currently open_ branches, which is typically 0-2.

**TS `identifier :` walkthrough.**

- _Arrow function vs paren group_: at `(`, Sublime's JS grammar does `branch_point: arrow-function; branch: [branch-possible-arrow-function, arrow-function-declaration]` (`Packages/JavaScript/JavaScript.sublime-syntax:1224`). Tries "paren group expression" first; a `(?==>)` match after the matching `)` emits `fail: arrow-function`, rewinds, and tries `arrow-function-declaration` next. TS nests a second branch_point `ts-detect-arrow` inside that to handle return-type annotations after the parameter list, so a single `)` can rewind through two levels.
- _Class field vs method_: `class-element` uses `branch_point: class-field; branch: [class-field, method-declaration]` (`JavaScript.sublime-syntax:1770`); the class-field branch fails if it sees `(` (or in TS, `<`) and the engine tries the method-declaration branch. TS inserts `ts-type-annotation` into the class-field sub-context, so `foo: string = "x"` tokenizes the annotation distinctly.
- _Object literal property vs shorthand method_: `object-literal-element` uses `branch_point: object-literal-property; branch: [object-literal-property, method-declaration]` (`JavaScript.sublime-syntax:1962`).
- _Labelled statement_ is handled without branching — `label` is matched only in statement position, a state the grammar author preserves by discipline (`JavaScript.sublime-syntax:1940`). This is the one case where Sublime "just uses the stack" and it works because labels only appear positionally.
- _Ternary_ is also not branched — once `?` is consumed, a sub-context is pushed that expects `:`, and only that context treats `:` as ternary (`JavaScript.sublime-syntax:1639`).

**Trade-offs and known failure modes.** Branch points are genuinely powerful — they can encode any deterministic-PEG-style "if grammar A matches, parse as X, else Y" decision, bounded only by the 128-line backtrack cap — but their failure modes are well-documented:

- Branch names are **globally unique**; `fail` takes one name. When two unrelated contexts want the same speculative body, the grammar author copies the body. Sublime issue [#3494](https://github.com/sublimehq/sublime_text/issues/3494) is a live feature request to allow `fail: [a, b]`; the JS grammar already has copy-pasted contexts from this.
- Double-fail loops. `foo: (cb:` hangs the engine in [sublimehq/Packages#3598](https://github.com/sublimehq/Packages/issues/3598) because two branches can both fail, and the engine loops. The fix was grammar-author discipline (extract named contexts so each `fail` has one target), not an engine change.
- Cross-line failures replay every line since the branch started. Two nested branch points → up to 4× re-tokenization on pathological inputs. The docs admonish "list alternatives in decreasing likelihood" because there's no memoization.
- Silent expiry at 128 lines. If a branch straddles the cap, the failure becomes a no-op and the first alternative's tokens stay. Long template literals and long comments produce this class of bug.
- `fail` to an unpushed branch point is a silent no-op (again causing mis-tokenization that's hard to debug).

**Compatibility verdict: directly portable.** Your system already has probe states that are a _weaker_ form of the same idea — one alternative speculatively, falling back to a single default. Promoting that to "N named alternatives, each can emit a typed fail action" is a modest runtime extension, because your tokens are in a `Uint32Array` that supports O(1) truncation by count, and your stack is already snapshottable. The key simplifications over Sublime's version:

- Your matchers are deterministic character-scan predicates with no regex backtracking; a snapshot is "(pos, stack_ptr, token_count)" and restoration is three integer writes.
- You can lift the globally-unique-name constraint; branches can be frame-scoped (`branch_point` declared on a state only visible within that state's subtree).
- The 128-line cap can be replaced by a grammar-compile-time bound (e.g. "no branch may buffer more than K tokens"), which is stronger.

So Sublime's mechanism _is_ portable, and cheaper than in Sublime. But note: the probe mechanism you already have subsumes most of Sublime's branch uses — arrow/paren, identifier-vs-function-call, even class-element-vs-method — because with only two alternatives the probe + fallback is a branch-2. The cases where you'd actually want named N-way branches are narrower than Sublime's use suggests.

**Sources.** https://www.sublimetext.com/docs/syntax.html (docs); https://github.com/sublimehq/Packages/blob/master/JavaScript/JavaScript.sublime-syntax and `TypeScript.sublime-syntax` (concrete grammars); https://github.com/trishume/syntect/blob/master/src/parsing/parser.rs (`BranchPoint` at 116-139, 128-line cap at 305 and 886, `perform_op` at 1232); bug reports at sublimehq/Packages #193, #2044, #2144, #3155, #3598; sublime_text #3494, #5853, #1062, #2699, #6555.

### 2.2 TextMate grammars / vscode-textmate

**Summary.** The parent of both Sublime's format and vscode-textmate's runtime. A scope stack with begin/end nested patterns; no backtracking; no cross-line matching. Included here as a baseline to measure what Sublime's additions are for.

**State model.** The stack is the parse state: each frame carries a begin-pattern, end-pattern, meta scope, content scope, and nested pattern list. vscode-textmate compiles each state's patterns into a single `RegExpSourceList` / Oniguruma scanner that does a multi-regex scan in one pass (microsoft/vscode-textmate, `src/rule.ts`). Injections are matched separately and win only if they start earlier or carry priority.

**TS `identifier :` walkthrough.** The official TypeScript-TmLanguage grammar matches identifier-colon patterns like `([_$[:alpha:]][_$[:alnum:]]*)(:)` inside begin/end frames named `meta.object-literal`, `meta.binding-pattern`, and so on. Because matches are single-line, the grammar has to decide "is this an object literal or a destructuring parameter list?" at the `(` or `{`, with only the current line visible. Microsoft #614: "`const func = ({` ... `prop1, prop2 })`" across lines is scoped as object literal rather than binding pattern. Microsoft #903: multi-line generic argument lists inside object literal values fail. Microsoft #642: class fields in `export declare class` get `variable.other.readwrite.alias.ts` rather than property scopes. All three are labelled `wontfix` with maintainer quote "limitation of tmLanguage syntax scopes where in we cant lookup beyond new line". #701: definite-assignment `!` before `:` gets `keyword.operator.logical` because the grammar can't resolve `!:` locally.

**Trade-offs.** TextMate's contribution was to show how far you can get with pure scope-stack nesting; its failure cases are precisely the ones that motivated Sublime's `branch_point` and tree-sitter's external scanners.

**Compatibility verdict: incompatible as a model, valuable as a reference baseline.** TextMate is strictly weaker than what twinkleplop already has. Its failure cases (above) are already partially solved by probes and the reclassifier. There's nothing to port.

**Sources.** https://macromates.com/manual/en/language_grammars; https://github.com/microsoft/vscode-textmate; https://github.com/microsoft/TypeScript-TmLanguage; issues #614, #642, #701, #903.

### 2.3 Pygments `RegexLexer`

**Summary.** Python's de facto library lexer: regex rules per state, first match wins, stack directives `#push`/`#pop`/`#pop:N`. Extensions: `bygroups`, `using(OtherLexer)`, `combined`, `ExtendedRegexLexer`.

**State model.** `LexerContext` has exactly four fields: `text`, `pos`, `end`, `stack`. No user sidecar slot. `ExtendedRegexLexer` callbacks receive `(lexer, match, ctx)` and can mutate `ctx.pos` and `ctx.stack`, but there is no canonical place to stash cross-callback state — sidecar tricks require subclass instance attributes, and `using()` explicitly breaks on `ExtendedRegexLexer`.

**TS `identifier :` walkthrough.** Pygments doesn't try. `JavascriptLexer` emits `Name.Other` for every identifier regardless of context; the colon is just `Operator`. `{foo: 1}`, `foo: while(…)`, and `a ? b : c` are indistinguishable in the output. `TypeScriptLexer` adds one regex — `([\w?.$]+)(\s*)(:)(\s*)([\w?.$]+)` → bygroups(Name.Other, Whitespace, Operator, Whitespace, Keyword.Type) — which aggressively misfires on object literals (the RHS of `{foo: bar}` becomes `Keyword.Type`). It's a heuristic, not disambiguation.

**Trade-offs.** The RegexLexer architecture caps out at whatever can be expressed as "first-match-wins within the current state's regex list." Pygments lexers that need context beyond the stack either (a) push more state names (Python f-strings push `expr-inside-fstring-inner` per inner `{`), (b) encode context lexically with transient state flags (JS's `slashstartsregex`), or (c) accept the misclassification.

**Compatibility verdict: weaker than your existing system, but instructive.** The Python f-string example is worth noting: it's the purest demonstration of encoding sidecar state _into the stack itself_, pushing a distinct state per nesting level. This scales until it doesn't: it blows up state count when the "dimension" you're tracking is orthogonal to the state hierarchy (e.g., "am I in a class body" × "what kind of expression am I parsing"). This is precisely the axis of explosion you want to avoid.

**Sources.** https://pygments.org/docs/lexerdevelopment/; https://github.com/pygments/pygments/blob/master/pygments/lexer.py (RegexLexer, bygroups, using, combined, LexerContext); https://github.com/pygments/pygments/blob/master/pygments/lexers/javascript.py (JavascriptLexer, TypeScriptLexer); https://github.com/pygments/pygments/blob/master/pygments/lexers/python.py (f-string handling).

### 2.4 Tree-sitter external scanners

**Summary.** When a tree-sitter grammar needs tokens that can't be expressed as regular languages, the grammar author writes a C module implementing five functions — `create`, `destroy`, `serialize`, `deserialize`, `scan` — and a `void *payload` of arbitrary state. The scanner sees one code point at a time via `lexer->lookahead` / `lexer->advance` / `lexer->mark_end`, and is asked to produce at most one token per call. This is the "bounded sidecar state" idea in its most mature production form.

**State model.** The payload is opaque bytes; the contract is that `serialize` writes at most `TREE_SITTER_SERIALIZATION_BUFFER_SIZE = 1024` bytes (`lib/src/parser.h:14`), and `deserialize` rebuilds state from those bytes. This 1024-byte bound is enforced every edit. State is typically a small C struct. Real-world shapes:

- **Rust** (`tree-sitter-rust/src/scanner.c:20-22`): `typedef struct { uint8_t opening_hash_count; } Scanner;` — one byte, to match `r##"…"##`.
- **C++** (`tree-sitter-cpp/src/scanner.c:13-16`): `struct { uint8_t delimiter_length; wchar_t delimiter[MAX_DELIMITER_LENGTH]; };` — bounded captured delimiter for `R"delim(...)delim"`.
- **Python** (`tree-sitter-python/src/scanner.c:24-32,85-89`): stack of `uint16_t` indent levels, stack of `char` delimiter flags (bit-packed enum), one bool `inside_interpolated_string`.
- **Ruby** (`tree-sitter-ruby/src/scanner.c:49-68`): stack of `Literal` records (token type, open/close delimiter, nesting depth, interpolation flag), stack of `Heredoc` records (terminator word, indentation-allowed flag, interpolation flag, started flag), plus `has_leading_whitespace: bool`.
- **Bash** (`tree-sitter-bash/src/scanner.c:43-65`): `uint8_t last_glob_paren_depth`, three booleans, stack of heredocs.

Across every scanner I read, the _kinds_ of state reduce to five primitives: (1) bounded counters, (2) bit-flag sets, (3) last-token memory bits, (4) stacks of small records, (5) bounded captured strings. No scanner uses anything resembling a symbol table.

**Incremental parsing and the reuse discipline.** Tree-sitter reuses subtrees across edits only when the serialized scanner state at the boundary matches by bytewise comparison (`lib/src/parser.c:549-555,783-787`). This enforces a strong discipline on scanner state: it must be _total_ (not reference external data), _small_ (fits in 1024 bytes), and _value-comparable_ (`memcmp`-friendly). This is exactly the discipline a declarative spec can enforce statically.

**TS `identifier :` walkthrough.** Tree-sitter doesn't use external scanners for this at all — the TypeScript grammar handles it in the LR(1) parser with precedence declarations and dynamic-precedence conflicts. The scanner has nothing to add. But _as a model for declarative sidecar state_, the shape is exactly right.

**Trade-offs.** External scanners are imperative C: powerful, fast, incrementally correct, but not declarative or statically verifiable. Grammars that use them are harder to reason about and harder to port. They require the grammar author to write, debug, and maintain C code with a non-trivial contract.

**Compatibility verdict: adaptable with effort — this is the _state shape_ to steal.** The imperative-C part is not portable, but the _taxonomy of state_ is the most useful finding of the survey for your purposes. Any declarative sidecar extension should cover exactly these five primitives. If your extension can express bounded counters, bit-flag sets, last-token memory, small stacks, and bounded captured strings — declaratively, compiled — you have tree-sitter's external-scanner power without the C.

**Sources.** https://tree-sitter.github.io/tree-sitter/creating-parsers#external-scanners; https://github.com/tree-sitter/tree-sitter/blob/master/lib/src/parser.c (lines 443-502, 549-555, 783-787, 1374-1381); https://github.com/tree-sitter/tree-sitter-python/blob/master/src/scanner.c; https://github.com/tree-sitter/tree-sitter-ruby/blob/master/src/scanner.c; https://github.com/tree-sitter/tree-sitter-rust/blob/master/src/scanner.c; https://github.com/tree-sitter/tree-sitter-cpp/blob/master/src/scanner.c; https://github.com/tree-sitter/tree-sitter-bash/blob/master/src/scanner.c.

### 2.5 Lexer hacks (C typedef, and notably TS's non-use)

**Summary.** The canonical C lexer hack feeds the semantic symbol table of typedef names back into the lexer so `A` tokenizes as a type name or an identifier depending on prior `typedef` declarations. This is the _antithesis_ of what you want: unbounded, stateful, tied to semantic analysis.

**State model.** An unbounded symbol table of names, typically scoped. No bound on size; invalidation on any edit to a typedef declaration.

**TS `identifier :` walkthrough.** Not applicable — the C hack is about disambiguating `A *b` as "A pointer-to-b declaration" vs "A multiplied by b."

**Crucial evidence from TypeScript's own compiler.** `microsoft/TypeScript/src/compiler/scanner.ts` is effectively context-free within a `LanguageVariant` mode. TypeScript does _not_ use a lexer hack. Instead, its parser can ask the scanner to **rescan** a previously-emitted token: `reScanGreaterToken` (line 2438) handles `>>` that should become two `>`s in a generic context, `reScanSlashToken` (line 2467) handles the regex-vs-division ambiguity, `reScanTemplateToken` / `reScanJsxToken` / `reScanLessThanToken` similarly. The scanner is set to a `LanguageVariant` (Standard / JSX) by the parser; each emitted token carries a bitfield of flags (`tokenFlags`, line 1050: `PrecedingLineBreak`, `Unterminated`, `Scientific`, `UnicodeEscape`, etc.) that travels with the token rather than in a scanner-wide slot.

**Clang takes the same position**: per Wikipedia's "Lexer hack" article, Clang's lexer emits `IDENT` for every name and the parser/semantic analysis decides. Rust-analyzer and Roslyn do the same. The production-IDE consensus is **not to do the lexer hack**. For your highlighter, this is conclusive: symbol-table-level state should not be in scope.

**Trade-offs.** Unbounded state, incremental invalidation headaches, coupling of lex with semantics. Every modern parser avoids it.

**Compatibility verdict: fundamentally incompatible and _rightly so_.** Don't build this.

**Sources.** https://en.wikipedia.org/wiki/Lexer_hack; https://github.com/microsoft/TypeScript/blob/main/src/compiler/scanner.ts (lines 1025, 1050, 2438-2459, 2467-2495, 3658-3766, 4007-4009); https://github.com/microsoft/TypeScript/blob/main/src/compiler/parser.ts (lines 2224-2289, `speculationHelper`).

### 2.6 Parser-driven rescanning (TypeScript, Roslyn, rust-analyzer)

**Summary.** All three IDE-grade parsers solve context-sensitive lexing the same way: emit ambiguous or under-specified tokens; let the _parser_ ask the scanner to re-read or re-classify specific tokens once it has enough context. The parser is the oracle; the lexer is a cheap, mostly-stateless fan-out.

**State model.**

- **TypeScript**: `languageVariant: enum { Standard, JSX }` (set by parser), per-token `tokenFlags: bitfield`, speculative parsing with full scanner-state rollback (`speculationHelper`).
- **Roslyn**: `NameOptions` — a parse-context bitfield carried down the recursive descent. The generic-vs-comparison disambiguator `ScanTypeArgumentList` at `src/Compilers/CSharp/Portable/Parser/LanguageParser.cs:6228-6360` is pure k-token lookahead over the token stream: "if the token after `>` is one of `(,);:?,.`, this is definitely a type argument list." No symbol table.
- **rust-analyzer**: `lexed_str.rs` lexer is stateless beyond position. `shortcuts.rs:36-59` at ingestion time retags `IDENT` into contextual keywords (`async`, `dyn`, `union`, …) via a static table keyed on `(text, edition)`. Also tags `FLOAT_NUMBER` as "joint" when appropriate — a one-bit producer-to-consumer signal embedded in the token stream itself.

**TS `identifier :` walkthrough.** TypeScript's scanner emits `foo` as `Identifier` and `:` as `ColonToken` in all cases. The parser decides, based on what it's parsing (object literal vs type annotation vs labeled statement vs ternary), what the combination means. There is no lexical disambiguation; the parser simply doesn't emit different _syntax tree nodes_ for the same tokens in different contexts.

**Trade-offs.** This design requires a full parser. If your artifact is a parse tree, you can do this elegantly; if your artifact is a token stream, you need to emit enough per-token metadata for downstream consumers to disambiguate.

**Compatibility verdict: adaptable in spirit.** The rust-analyzer pattern — "one-bit flag traveling with each token, applied at ingestion by a stateless table lookup" — is directly portable and quite powerful. Your reclassifier already implements the same idea, just with richer patterns. The TypeScript `reScan*` pattern isn't directly applicable because your tokenizer doesn't have a parser client asking it to re-read; but the architectural moral — emit under-specified tokens at lex time, commit at a later pass with more context — is the basis of your existing reclassifier.

**Sources.** Roslyn: https://github.com/dotnet/roslyn/blob/main/src/Compilers/CSharp/Portable/Parser/LanguageParser.cs (6228-6362); rust-analyzer: https://github.com/rust-lang/rust-analyzer/blob/master/crates/parser/src/lexed_str.rs, https://github.com/rust-lang/rust-analyzer/blob/master/crates/parser/src/shortcuts.rs; TypeScript: as in §2.5. IntelliJ: https://plugins.jetbrains.com/docs/intellij/implementing-lexer.html — "An essential requirement for a syntax highlighting lexer is that its state must be represented by a single integer number returned from Lexer.getState()."

### 2.7 SDF disambiguation filters (van den Brand, Visser, Klint)

**Summary.** In Syntax Definition Formalism (SDF/SDF2/SDF3), grammars are inherently ambiguous and ambiguity is resolved by _orthogonal filters_ on the parse forest produced by scannerless GLR. The filter primitives are `reject`, `prefer`, `avoid`, associativity, priority, and follow restrictions.

**State model.** Filters are either compiled into the parse table (associativity, priority, follow restrictions) or evaluated over the post-parse forest (reject, prefer, avoid). State is the GLR graph-structured stack plus the parse forest. At a per-node level the state is small; at a per-input level the forest can be large.

**TS `identifier :` walkthrough.** SDF would have productions like `Id ":" Expr -> ObjectProp {prefer}`, `Id ":" Stmt -> Label {avoid}`, `Id ":" Type -> TypedParam {…}`, each producing a parse-forest node at each ambiguous site; the filter annotations collapse the forest to one winner per site.

**Trade-offs.** Requires scannerless GLR. The filter annotations are clean and declarative, but the machinery underneath is heavy. In SDF3, filters are a tenth of the grammar by line count and the rest is the GLR infrastructure. Memory is bounded by forest size, which is bounded by grammar ambiguity, which is bounded but can be large.

**Compatibility verdict: directly incompatible as a mechanism, partially portable as ideas.**

- **Follow restrictions are directly portable.** `Id -/- [a-zA-Z0-9]` is exactly what your `boundary: true` flag already expresses.
- **`reject` for keyword reservation is directly portable** and already how your system works: match identifier, then `Set` lookup.
- **`prefer` / `avoid` at the token level is the Schrödinger's-token idea** (§2.10) — emit ambiguous, collapse with more context. Your reclassifier already does this in effect.
- **Priority and associativity are parser-level**, not lexer-level; don't apply.

So SDF's filter _taxonomy_ is useful for validating that you already cover the lexer-relevant filters, but porting SDF itself would require a full scannerless GLR engine, which violates the core-mechanism constraint.

**Sources.** van den Brand, Scheerder, Vinju, Visser, "Disambiguation Filters for Scannerless Generalized LR Parsers," CC 2002, LNCS 2304:143-158 — https://homepages.cwi.nl/~jurgenv/papers/CC-2002.pdf; Visser PhD thesis 1997 — https://eelcovisser.org/publications/1997/Visser97.pdf; Economopoulos, Klint, Vinju, "Faster Scannerless GLR Parsing," CC 2009.

### 2.8 Island grammars / fuzzy parsing (Moonen, van Deursen, Koppler)

**Summary.** Instead of parsing everything, partition the grammar into "islands" (the constructs you care about, parsed precisely) and "water" (everything else, matched by a catch-all `{avoid}` production). Moonen's island grammars were built for robust COBOL/Java/Ada extraction; Koppler's anchor-driven fuzzy parsing is a more practical variant.

**State model.** In SDF/SGLR realizations, the state is the GLR stack plus the forest. In anchor-driven fuzzy parsing (Koppler), the state is a set of active anchor patterns plus a skip-until-sync recovery mode. Islands and anchors are small and declarative.

**TS `identifier :` walkthrough.** An island grammar for TS `identifier : Type` would declare islands for the constructs that matter: object-literal-property, class-field, interface-member, typed-param, ternary-tail, labelled-statement. Water would be "anything else, consume a character." In principle, the disambiguation falls out of which island's begin-anchor matches first at each site.

**Trade-offs.** Island grammars depend on reliable anchors. For TS, the anchors are not reliable — `{` can start an object literal, a block, a destructuring pattern, a type literal, a class body, an import-names list. The very ambiguity the task describes is exactly the anchor-unreliability problem. So island grammars don't _solve_ the problem; they relocate it.

**Compatibility verdict: adaptable as the architectural frame of the reclassifier.** Your reclassifier _is_ an island-grammar pass over the token stream: `anchor` selects the construct of interest, water (non-matching tokens) passes through unchanged. The extension worth taking from the island literature is the idea of **declaring anchors at multiple anchor tokens** (e.g., "if the anchor is `identifier` AND the one-token-ahead is `:`, run this subsidiary check"), which your `anchor + when` already supports.

**Sources.** Moonen, "Generating Robust Parsers using Island Grammars," WCRE 2001 — https://ieeexplore.ieee.org/document/957806; van Deursen, Kuipers, "Building Documentation Generators," ICSM 1999; Koppler, "A Systematic Approach to Fuzzy Parsing," SP&E 27(6):637-649, 1997.

### 2.9 Bounded-lookahead at token level: LL(k), PEG

**Summary.** Classical LL(k) / LALR(k) apply k-token lookahead to parse decisions. PEG (Ford 2004) unifies lexical and syntactic grammars with ordered choice `/`, syntactic predicates `&e` and `!e` (zero-width lookahead), and greedy non-backtracking repetition. Both formalisms can be deployed at the token level rather than the character level.

**State model.** LL(k) compiles a decision table keyed on the next k tokens; state is the lookahead buffer. PEG with bounded `&/!` expressions is the same. Packrat parsing (Ford 2002) adds memoization — O(n) space per rule — which is inappropriate for streaming.

**TS `identifier :` walkthrough.** A bounded-lookahead rule for the reclassifier: "if the identifier is preceded by `{` or `,` (at depth 1) _and_ the next tokens after `:` form a value expression, retag as property; else if the next tokens after `:` form a type expression, leave as identifier." The `before` and `when` slots in your rewrite rules already express this.

**Trade-offs.** The depth of lookahead bounds the cost. For k=1 or 2, almost free. For variable-width constructs (e.g., "the entire type expression"), you need bounded-paren-matching (which your `balanced_parens` combinator already provides). PEG's ordered choice is equivalent to "try alternative A, then B, then C" — exactly what a branch point does, but without speculative tokenization.

**Compatibility verdict: directly portable and partly already implemented.** Your reclassifier's `seq / any_of / optional` combinators are PEG-shaped. The only missing piece is a bounded "scan forward until token X" combinator for cases where the interesting structure is of variable width (e.g., the RHS of a class field's type annotation). This is a small and self-contained reclassifier extension.

**Sources.** Ford, "Parsing Expression Grammars," POPL 2004 — https://bford.info/pub/lang/peg.pdf; Ford, "Packrat Parsing," ICFP 2002; Aho/Sethi/Ullman and Grune/Jacobs for LL(k)/LALR(k).

### 2.10 Schrödinger's tokens (Aycock / Horspool 2001)

**Summary.** A token carries a _set_ of possible types; the parser collapses the set when syntactic context rules out alternatives. Formally named in Aycock & Horspool, "Schrödinger's Token," SP&E 31(8):803-814, 2001. This is the most directly relevant academic formulation of "emit ambiguous, commit later."

**State model.** Each token is `(bitset_of_possible_types, start, end)`. The downstream parser or second-pass reclassifier observes subsequent tokens and intersects the bitset with what is possible in context. The "resolution" is a pure function of a bounded window.

**TS `identifier :` walkthrough.** Emit `foo` with bitset `{identifier, property, label, function, class_field}`. The reclassifier observes the next 1-2 tokens and collapses the set. `{ foo:` → collapses to `{property}`; `foo:` at statement position → collapses to `{label}`; `foo: string =` in a class body → collapses to `{class_field}` (if the "in class body" context is visible).

**Trade-offs.** The bitset representation requires a bound on possible types (your 0-255 range is more than enough). Collapse rules can in principle require arbitrarily large windows; discipline constrains them to small k.

**Compatibility verdict: this is an accurate description of what your reclassifier already does, with minor formalization.** Tokens emitted by the first pass could be thought of as "lowest-common-denominator types" (e.g., `identifier` as the default when the set is ambiguous); the reclassifier collapses the set by rewriting. This mental model is worth adopting because it clarifies the design: the first pass should deliberately emit _coarse_ types for known-ambiguous sites and rely on the reclassifier to refine. Your current grammar does the opposite in a few places (commits to `property` eagerly), which produces the "first occurrence right, Nth occurrence wrong" failure pattern.

**Sources.** Aycock, Horspool, "Schrödinger's Token," SP&E 2001 — https://webhome.cs.uvic.ca/~nigelh/Publications/Schrodinger.pdf.

### 2.11 Earley / GLR at the token level

**Summary.** General context-free parsing algorithms that can handle any CFG, including ambiguous ones. Worst-case O(n³) for ambiguous grammars, O(n²) for unambiguous, O(n) for bounded-ambiguity.

**State model.** Earley carries a chart of items; GLR carries a graph-structured stack plus a forest.

**TS `identifier :` walkthrough.** An Earley parser at the token level would produce the complete parse forest for any `identifier :` site and all downstream possibilities. Filters on the forest would select the intended parse.

**Trade-offs.** The cubic worst case is prohibitive for a streaming highlighter that reparses on every keystroke. Even the O(n) bounded-ambiguity case requires forest maintenance that trades space for time-guaranteed-linear. The overhead of full chart/forest bookkeeping is well beyond what a syntax highlighter needs.

**Compatibility verdict: fundamentally incompatible for the core mechanism. Useful only as a reference for why bounded, non-general techniques are right.**

**Sources.** Earley 1970; Tomita 1986; Scott/Johnstone 2007 "BRNGLR".

### 2.12 LSP semantic tokens / two-pass highlighting

**Summary.** LSP 3.17 specifies a _semantic tokens_ protocol where a language server returns token classifications after static analysis, overlaid on top of the editor's syntactic highlighting. The editor renders both, with semantic tokens taking priority.

**State model.** Tokens ship as `(line_delta, char_delta, length, type, modifier_bitset)` quintuples. The state on the server side is the full compiler's type-checker / symbol table; the protocol itself is stateless.

**TS `identifier :` walkthrough.** Not directly — semantic tokens operate at a higher level, distinguishing `Foo` as "type" vs "value" using the full type checker. Orthogonal to lexical disambiguation.

**Trade-offs.** Requires a semantic-analysis backend; your highlighter explicitly doesn't want this. But the _architecture_ — cheap syntactic first pass, selective semantic overlay — is validated at scale.

**Compatibility verdict: direct validation of the two-pass architecture you already have.** Your reclassifier is a narrower, faster, pre-semantic version of the same idea. No direct port; just confirmation that two-pass is a legitimate shape.

**Sources.** https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/.

---

## 3. Taxonomy

| Approach                     | Lookahead / backtrack         | Structural state granularity  | Per-token cost                | Per-input state growth | Expressible declaratively?   | Compiles statically? | Fit for twinkleplop                                       |
| ---------------------------- | ----------------------------- | ----------------------------- | ----------------------------- | ---------------------- | ---------------------------- | -------------------- | --------------------------------------------------------- |
| Sublime `branch_point`       | Bounded backtrack (128 lines) | Stack + named branches        | O(1) nominal, O(L) on failure | Open branches (≤ few)  | Yes                          | Yes                  | Direct port; subsumes probes                              |
| TextMate                     | None                          | Scope stack                   | O(regex)                      | Scope stack depth      | Yes                          | Yes                  | Already exceeded                                          |
| Pygments RegexLexer          | None                          | State stack + regex order     | O(regex)                      | Stack depth            | Yes                          | Yes                  | Already exceeded                                          |
| Tree-sitter external scanner | None (one char at a time)     | Bounded serializable state    | O(1)                          | ≤1024 bytes total      | No (imperative C)            | No                   | State _shape_ is portable; code is not                    |
| C lexer hack                 | N/A                           | Symbol table                  | O(log n) lookup               | Unbounded              | No                           | No                   | Rejected (as by all modern systems)                       |
| Parser rescan (TS/Roslyn/ra) | Parser-driven                 | Parse state + per-token flags | O(1) per rescan               | Parse stack            | Partly (per-token flags are) | Yes (table lookup)   | Per-token flags + ingestion retagging → directly portable |
| SDF filters                  | Forest-level                  | GLR forest                    | O(k) to O(n²)+                | Forest                 | Yes                          | Partly               | Filter taxonomy useful; machinery incompatible            |
| Island grammars              | Anchor-driven                 | Anchor state                  | O(anchors)                    | Small                  | Yes                          | Yes                  | Already implicit in reclassifier                          |
| Bounded LL(k) / PEG          | k tokens, bounded             | Decision table                | O(k)                          | k-token buffer         | Yes                          | Yes                  | Already in reclassifier `when`                            |
| Schrödinger's tokens         | Bounded                       | Bitset per token              | O(1)                          | Per-token bits         | Yes                          | Yes                  | Direct mental model for your pipeline                     |
| Earley / GLR                 | General                       | Chart / forest                | O(n) to O(n³)                 | Chart / forest         | Yes                          | Yes                  | Rejected on cost                                          |
| LSP semantic tokens          | Semantic                      | Whole-program                 | O(1) protocol                 | Whole program          | No (server-side code)        | No                   | Not applicable; validates two-pass arch                   |

A different axis worth spelling out: **where does the disambiguation decision live?**

- **At the matching site** (Sublime branch, twinkleplop probe): pushdown-style, uses bounded forward tokenization as oracle.
- **On the stack frame** (tree-sitter scanner state, classic stack-augmented automaton): "where am I?" is a property of the current frame's declared slots/flags/counters.
- **On the token itself** (TS tokenFlags, Schrödinger bitset, rust-analyzer's joint bit): per-token metadata travels downstream.
- **In a second pass** (twinkleplop reclassifier, LSP semantic tokens): a separate machine observes the token stream with access to neighbours in a bounded window.

Your system currently has sites 1, 3 (implicitly — token types _are_ metadata), and 4. Site 2 — frame-local structural state — is the missing one. That's the gap.

---

## 4. Assessment against your constraints

Against the explicit constraints in the task:

- **No runtime regex, PCRE, backreferences, arbitrary regex lookahead.** Rules out SDF machinery and Sublime's regex engine specifics. Does _not_ rule out Sublime's `branch_point` mechanism per se — that's orthogonal to the regex engine.
- **No host-language callbacks.** Rules out ANTLR semantic predicates, Pygments `ExtendedRegexLexer` callback hacks, and tree-sitter scanner C code. Strong hint: any new mechanism must be fully declarative with a fixed interpretive semantics.
- **No full parse tree.** Rules out Earley, GLR, SGLR, IDE-parser approaches as primary mechanisms.
- **Bounded lookahead/lookbehind only.** Rules out unbounded PEG, packrat. Your reclassifier's `max_tokens` bound is the right shape.
- **State count bounded by grammar, not input.** Rules out stack-encoded sidecar state (Python f-string trick) for orthogonal dimensions. _Requires_ frame-scoped state to be declarative and typed, not "push a new state per nesting level."

And against the preference ordering:

- Smallest grammar-spec extension wins.
- Large implementation budget in the compiler/runtime is acceptable.
- Runtime overhead must be small and predictable.

Narrowing the candidate set:

1. **Frame-scoped declarative slots** (synthesized from tree-sitter's state taxonomy): small spec addition (one concept: slot declarations + read/write in rules), large compiler work, small runtime cost.
2. **Named branch points** (Sublime-style): small spec addition but largely redundant with the existing probe mechanism for 2-way decisions; worth considering only for N-way (N>2).
3. **Per-token metadata / Schrödinger bitset**: zero spec addition if you treat your `type` field as already-a-bitset-that-happens-to-have-one-bit-set; restricted generalization to emit coarser types and rely on reclassifier refinement.
4. **Reclassifier combinator extensions**: small extensions to the existing DSL (state-awareness, bounded forward-scan-until, cross-window tracking).

Nothing in the survey suggests you should add more than 1-3 of these. Most of the benefit comes from (1) and some of (4); (2) is a refinement; (3) is a mental-model shift, not a code change.

---

## 5. Concrete proposals

### 5.1 Proposal 1 — **`slots`**: frame-scoped bounded declarative sidecar

One new concept added to the grammar spec. This is the primary recommendation.

#### 5.1.1 Grammar surface

Add an optional `slots` declaration to states:

```ts
class_body: {
  slots: {
    // each slot has a type and default
    field_count: { type: "u8", default: 0 },
    is_interface: { type: "bool", default: false },
  },
  rules: [
    // …
  ],
}
```

Rules gain:

- A **read predicate**: `when: { slot: "field_count", op: "==", value: 0 }` (sugar: `when_slot_eq`, `when_slot_gt`, etc.), which participates with `match` as a conjunction — the rule fires only when both the character matches and the slot predicate holds.
- A **write action**: `slot_set: { field_count: "+1" }` or `slot_set: { field_count: 0, is_interface: true }`, applied when the rule fires. Writes are composed with `token` / `state` / `exit` in a single rule — these are already composable in the existing schema.

Example (class body with field counting, disambiguating "first field" from "subsequent fields" if you ever need to):

```ts
class_body: {
  slots: { field_count: { type: "u8", default: 0 } },
  rules: [
    match(IDENTIFIER_START, TOKENS.identifier, enter("class_member_name")),
    match("}", TOKENS.punctuation, leave()),
    // …
  ],
},
class_member_name: {
  rules: [
    match(":", TOKENS.punctuation,
          enter("type_annotation"),
          slot_set({ field_count: "+1" })),
    match("(", TOKENS.punctuation,
          enter("method_params")),
  ],
},
```

Rules in any descendant state can read `slots.field_count` as part of their predicate. When `class_body` is popped, its slots vanish.

Optional later: a `scope: "global" | "root" | "frame"` modifier on the slot, defaulting to `frame`. Global slots would model things like "the current parser script mode" (strict vs sloppy). Don't ship this in v1; wait until a grammar needs it.

#### 5.1.2 Semantics

**Slot lifetime.** Slots live from the state push that declares them until the frame is popped. If the same state is re-pushed later, its slots reinitialize to defaults. Slots declared on state `X` are **visible to any rule executing while `X` is anywhere on the stack**. Lexically, that means inner states see outer slots; pushing the same state twice shadows (inner wins on same name).

**Types.** Supported slot types: `bool`, `u4`, `u8`, `u16`, fixed-length byte string (`string(n)`). Tree-sitter's five-primitive taxonomy maps onto these: counters (u4/u8/u16), flag sets (bool or bit-packed into a u8), last-token memory (u8 storing the last emitted token type), small records stored as a u16 per field. Bounded strings (`string(n)`) only if/when a concrete grammar needs heredoc terminators; defer to v2.

**Semantics of write actions.** Idempotent within a rule firing. `+1` / `-1` sugar. Writes are applied _after_ the rule's state transition and _after_ token emission for the rule. Writes to a slot declared on an ancestor frame are OK (they mutate the ancestor's slot); writes to a slot that isn't on the current stack are an error (detected at compile time in straightforward cases; at runtime with a clear message otherwise).

**Probe interaction.** Slot writes inside a probe state are **reverted on probe fallback**. This is achieved by snapshotting the relevant slots at probe entry and restoring on fallback (same infrastructure as position/stack snapshot). Compile-time analysis can determine which slots are touched by each probe state, so the snapshot is narrowly scoped.

**Introspection.** Slots appear in the existing `TokenizerIntrospector` as a `Map<string, number>` per stack frame, with no runtime cost outside introspection (same conditional-compile treatment the rest of introspection gets).

#### 5.1.3 Compilation strategy

- **Slot layout.** For each state that declares slots, the compiler assigns a fixed byte offset for each slot into a per-frame payload. The state-stack `Uint16Array` becomes paired with a slot-payload `Uint8Array` whose slices are addressed by the frame pointer.
- **Slot lookup from a rule's predicate.** Each state that has rules reading a particular slot gets, at compile time, a function pointer / inline lookup that walks the stack from top looking for the nearest frame declaring that slot, then reads at the compiled offset. Walks are bounded by stack depth; stack depth is bounded by your existing `Uint16Array(256)` cap. For slots declared on the current state, the walk is O(1).
- **Predicate lowering.** Rules with `when: {slot, op, value}` are lowered to `(match_predicate AND slot_predicate) -> action`. In the transition table, a single state-rule entry can carry up to N slot predicates; the runtime evaluates them in a tight `if` chain. For rules with only character predicates (the vast majority), no slot check is generated.
- **Write lowering.** `slot_set` actions become a small integer sequence: `(slot_id, op, value)` triples executed at rule-fire time, indexed by rule into a `Uint16Array` parallel to `transitions`.

**Runtime cost.**

- No-slot grammars: zero overhead. The slot-payload array is allocated lazily; rules with no slot predicates execute as today.
- With-slot grammars: a handful of array reads per transition for predicate evaluation, plus a few writes per rule firing. Cache-friendly because the slot payload sits next to the stack.
- Memory: 8-32 bytes per active frame, amortized. With stack depth ≤ 32 in realistic grammars, that's ≤ 1 KB of slot state.

**State explosion analysis.** The compiled transition table does **not** grow. The state space conceptually is `(state_id, slot_values)`, but slot predicates are evaluated at runtime against raw slot values, not enumerated into the table. Grammar authors get structural branching (the slot combinations they care about) without the compiler having to enumerate them.

#### 5.1.4 TS `identifier :` walkthrough with slots

**Object literal property vs labelled statement vs class field vs typed parameter**, systematically:

```ts
// a slot on the class body and interface body distinguishes the two
class_body: {
  slots: { kind: { type: "u4", default: 1 } }, // 1 = class
  rules: [ /* … */ ],
},
interface_body: {
  slots: { kind: { type: "u4", default: 2 } }, // 2 = interface
  rules: [ /* … same rules included */ ],
},

// a single shared 'typed_member' state reads the slot to decide the token
typed_member_colon: {
  rules: [
    rule_when(":", slot_eq("kind", 1), TOKENS.punctuation,
              enter("class_field_annotation")),
    rule_when(":", slot_eq("kind", 2), TOKENS.punctuation,
              enter("interface_member_annotation")),
  ],
},
```

The "class field vs interface member" distinction — the one commented out in the current reclassifier — becomes a single slot read. No state explosion: the `typed_member_colon` state is one state, not one-per-context.

**Labelled statement nesting** (if you actually want different highlighting at nested depths):

```ts
block_body: {
  slots: { label_depth: { type: "u8", default: 0 } },
  rules: [
    // identifier followed by ':' followed by statement-keyword → label
    // when fires, we increment label_depth
  ],
},
```

**Ternary colon vs property colon vs typed-param colon** becomes: the object-literal body declares `kind = object_literal`, the ternary-in-progress state declares `kind = ternary`, the function-param-list state declares `kind = typed_param`. A shared `colon_at_ambiguous_site` state reads `kind` and emits the right token.

**Tuple labels `[foo: string, bar: number]`** — the TS tuple-member-label case. Push a `tuple_body` frame with `kind = tuple`; the shared colon state picks up the right classification.

The structural pattern: every ambiguous site is _already_ inside a known structural context. The context is already on the stack (you push `class_body` when you enter `{` after `class C`). Slots are the typed, declarative way to _read_ that context from a descendant rule without encoding it in the state name.

#### 5.1.5 What it fails at

- **Symbol-table-dependent disambiguation.** Slots are bounded; they can't hold a set of user-defined names. If you wanted "is `Foo` a type or a value?" you'd need the parser hack, which every modern system declines to do. Out of scope.
- **Unbounded nesting counts.** If a grammar needs to count beyond u16, it'd have to widen. Easy to extend, unlikely to be needed.
- **Cross-statement context.** Slots reset on frame pop. If two _siblings_ (e.g., two top-level class declarations in the same file) need to share state, you'd need a `scope: "root"` slot. Defer to v2.
- **Retroactive disambiguation.** If you can only tell what `foo:` means by reading _forward_, slots don't help directly; you still need probes or the reclassifier. Slots handle the "contextual enclosure" axis; probes handle the "forward oracle" axis; the reclassifier handles the "observation-over-window" axis. The three are orthogonal.

#### 5.1.6 Why not more than this?

Everything else in the survey either (a) is already present under another name, (b) adds more spec surface for less power, or (c) violates a constraint. Specifically:

- Named branch points add a whole new declaration type and fail action; their benefit over probes is narrow (N>2 alternatives, which are rare). Defer.
- Per-token Schrödinger bitsets would widen the token representation without changing expressiveness (you can always represent "ambiguous" as a coarse type + reclassifier pattern).
- Island-grammar anchors are the existing reclassifier anchors; no new concept needed.
- Bounded LL(k)/PEG is already expressed by the reclassifier's `seq/any_of/optional/when/before` combinators.

### 5.2 Proposal 2 — Small reclassifier extensions (complementary, not strictly required)

These are small, independent additions to the existing reclassifier DSL. They don't require slots but compose with them if you ship both.

#### 5.2.1 `in_state(name)` predicate

Each token in the emitted stream already has a start/end. At tokenizer exit, it would be nearly free to emit _state trace metadata_ — a parallel array recording, for each token, the top-of-stack state ID at emission time. A new reclassifier combinator `in_state("class_body")` would test this. This gives the reclassifier access to the same information slots do, without requiring slot declarations, for grammars that already separate contexts into distinct states.

Cost: one extra `Uint16` per token (tokens go from triplet to quadruplet, 33% memory). Gain: reclassifier rules become context-aware without needing slots.

If you ship slots, this is largely redundant — you can achieve the same with a slot read. Pick one.

#### 5.2.2 `scan_until(stop_pattern, max_tokens)` combinator

Complements `balanced_parens`. Scans forward until it matches `stop_pattern` or hits `max_tokens`; yields the inner span as an opaque token run that callers can then pattern-match. This solves "match a type annotation of variable shape" cases in the reclassifier.

#### 5.2.3 Multi-anchor rules

Today, each reclassifier rule has one anchor. Multi-anchor would allow `anchor: ["identifier", "keyword"]` with per-anchor `when`/`before` variants, avoiding duplicate rule bodies. Purely ergonomic; doesn't change expressiveness.

These are all straightforward DSL additions. I'd ship 5.2.1 only if slots are delayed; otherwise skip.

### 5.3 Proposal 3 — Optional: named branch points (defer)

A Sublime-style `branch_point` / `branch` / `fail` triple, as a refinement over the existing probe mechanism. Worth considering **only** if:

- You hit a concrete ambiguity that needs 3+ alternatives with distinct bodies (probes handle 2).
- You need failure to rewind through multiple layers of pushed state (probes don't, by design).

In every TS case I walked through, probes + slots cover it. Defer until a specific grammar forces it.

---

## 6. Hybrid design

The full picture, with your existing machinery and Proposal 1 layered in:

```
Input chars
    │
    ▼
┌──────────────────────────────────────────┐
│ Compiled state machine (existing)        │
│  • state stack + current state           │
│  • probe states (forward speculation)    │
│  • match/range/match_within rules        │
│  • NEW: slot payloads per frame          │
│  • NEW: slot predicates in rules         │
│  • NEW: slot writes in rule actions      │
└──────────────────────────────────────────┘
    │
    ▼
Token stream (Uint32Array [type,start,end])
    │
    ▼
┌──────────────────────────────────────────┐
│ Reclassifier pipeline (existing)         │
│  • rewrite_types(rules)                  │
│  • embed_grammars(mapping)               │
│  • embed_interleaved(config)             │
│  • anchor + before + when + rewrite      │
│  • optional: scan_until combinator       │
└──────────────────────────────────────────┘
    │
    ▼
Refined token stream
```

The hybrid answers each disambiguation axis with the cheapest mechanism:

| Axis of ambiguity                                     | Mechanism                       | Example                      |
| ----------------------------------------------------- | ------------------------------- | ---------------------------- |
| "What's the enclosing structural context?"            | Slot on enclosing frame         | Class body vs interface body |
| "What comes next (within bounded window)?"            | Probe state                     | `identifier(` → function     |
| "What surrounds this token (local window, post-lex)?" | Reclassifier rule               | `{foo:` → property           |
| "Did I just emit X?"                                  | u8 last-token slot on the frame | Go semicolon insertion       |

Each axis has one mechanism. The axes compose without conflict.

---

## 7. What each proposal fails at, concretely

**Proposal 1 (slots) fails at:**

- Type-checker-level distinctions (`Foo` as type vs value). Correct answer: don't try.
- Disambiguation that requires a parser's "current production" state. Correct answer: accept the coarser type + reclassifier fix-up.
- Cross-file context (e.g., imported type names). Correct answer: same.

**Proposal 2 (reclassifier extensions) fails at:**

- Control-flow disambiguation (where a future tokenization depends on the decision). Reclassifier runs after tokenization; it can't go back and re-tokenize a different region. Correct answer: use slots or probes at lex time.

**Proposal 3 (named branches) fails at:**

- Anything probes already handle. Correct answer: use probes. Named branches are for the genuinely-N-way case.

---

## 8. Closing recommendation

Ship **Proposal 1 (slots)** first, with the minimum viable slot vocabulary: `bool`, `u8`, and `+1`/`-1`/`set` writes. Defer `string(n)`, `scope: global`, and per-token state trace (Proposal 2.1) until you have three grammars wanting them.

This is one new concept added to the grammar spec. It compiles statically into your existing transition table with a parallel slot-payload array. Runtime overhead is a few ALU ops per transition, only in states that use slots. Grammar authors get the expressive power of tree-sitter external scanners — the five-primitive state taxonomy (counters, flags, last-token, stacks, bounded strings) — without C code, without host callbacks, without breaking the compiled-declarative discipline.

The evidence that this is the right pick:

1. **Every production system that handles the TS `identifier :` ambiguity well** — Sublime (branch points on frame-scoped context), TypeScript (parser carrying context), Roslyn (NameOptions bitfield), tree-sitter (external scanner state) — does so by carrying _bounded typed state_ alongside the stack. None uses a symbol table. None uses unbounded lookahead. They all use the same-shaped tool.
2. **The concrete rules you've already had to give up on** (`languages/javascript/src/reclassifiers.ts:104-134` class-field-vs-interface-member) fail because the reclassifier doesn't know the enclosing context. Slots give exactly that knowledge.
3. **The constraint "state count bounded by grammar, not input"** is satisfied: slots store values indexed by frame, not enumerated into the state table. Grammar size stays O(grammar); runtime slot storage is O(stack depth) × O(bytes per frame).
4. **Composition with existing machinery** is clean: probes already handle forward-speculation, reclassifier handles post-lex window matching, slots add frame-local structural memory. Three orthogonal axes, one mechanism each.
5. **Smallest plausible spec addition**: one concept (`slots`), two primitive predicate/action forms. Everything else in the survey either already exists under another name in your spec, or would add more surface for less power.

If you want a sanity check on this before implementing: pick the three or four "known limitations" comments in `languages/typescript/src/grammar.ts:13-25` and write out, on paper, how you'd express them with slots. If you can write each one in ≤ 10 lines of grammar without creating new states beyond the structurally-distinct enclosures (class-body, interface-body, type-annotation, tuple-body), the proposal holds up.
