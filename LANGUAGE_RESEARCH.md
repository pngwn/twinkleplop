# Research task: context-sensitive disambiguation in stateful lexers

## Goal

Investigate techniques for resolving locally-ambiguous tokens in a stateful
syntax highlighter — approaches that go meaningfully beyond the shallow
context stack typical of TextMate/Tree-sitter-highlights/Pygments-style
lexers, but stop well short of maintaining a full parser's state machine or
parse stack. I want to understand the design space between these two poles,
and ultimately pick something I can implement in my own highlighter.

## My highlighter (the thing any solution has to fit into)

I have an existing, working syntax highlighter with these properties:

- **Regex-free.** No runtime regex engine. Matching is done by a compiled
  state machine over characters/tokens.
- **Static, compiled grammars.** Grammars are authored in a declarative
  spec and compiled ahead of time into the state machine. There are no
  "magical disambiguation functions," no embedded host-language callbacks,
  no runtime grammar mutation.
- **JS implementation**, but the hot path is the compiled machine, not
  interpreted grammar rules.
- **Arbitrary grammars** via the grammar spec — TS is just one motivating
  case. Whatever solution I adopt has to be expressible in the spec, not
  hard-coded for one language.
- **Stateful lexer** with a context stack, in the same broad family as
  Sublime's `.sublime-syntax` or Pygments' `RegexLexer` — but again,
  regex-free and statically compiled.

This shapes the solution space significantly:

- Solutions that depend on a runtime regex engine, PCRE features,
  backreferences, or arbitrary lookahead via regex are **out**.
- Solutions that require embedding host-language predicates ("call this
  JS function to decide") are **out** — they break the compiled,
  declarative model.
- Solutions that require a full parse tree (tree-sitter-style) are **out**
  as the core mechanism, though I'm open to hearing how their *ideas*
  could be adapted into a compiled state-machine model.
- Solutions that require unbounded lookahead or unbounded lookbehind are
  **out**. Bounded is fine.
- Solutions that require a separate symbol table built during a prior
  pass are interesting but expensive — I'd want to understand the cost
  carefully.

What I'm willing to spend:

- **API/grammar complexity**: as little as possible. Prefer solutions
  that add zero new grammar concepts; failing that, the smallest,
  most orthogonal extension that composes with what's there.
- **Runtime performance**: small, predictable overhead is acceptable;
  anything that turns the hot path into interpretation is not.
- **Implementation complexity in the compiler/runtime**: I'll spend a
  lot here if it buys real disambiguation power. This is the budget
  I'm most willing to blow.
- **State count**: bounded explosion is OK if it's bounded by the
  *grammar*, not by the *input*. State counts that grow with nesting
  depth or document size are not OK.

## The concrete problem

Consider TypeScript. The token sequence `identifier : Type` (or `identifier :`
followed by something) appears in at least these constructs, all of which
should ideally highlight differently:

- Object literal property:        `{ foo: bar }`
- Labelled statement:             `foo: while (...) { ... }`
- Class field with annotation:    `class C { foo: string = "x" }`
- Interface/type member:          `interface I { foo: string }`
- Typed function parameter:       `function f(foo: string) { ... }`
- Typed destructuring:            `const { foo }: T = ...`
- Type predicate / return type:   `function f(): foo is Bar`
- Conditional/ternary tail:       `cond ? a : b`

A shallow context stack (e.g. "inside class body", "inside object literal")
gets you partway. The failures I keep hitting are *systematic*, not isolated:

- Nested labelled statements where outer and inner highlight differently
- The second typed field in a class is classified differently than the first
- Class fields that don't immediately follow the class declaration drift
- Interface members vs type literal members diverge
- Arrow function param lists vs parenthesized expressions vs tuple types

The pattern is that any heuristic correct for the first occurrence breaks
on the Nth occurrence, or breaks once another construct intervenes. This
suggests the shallow-stack model is missing some structural information
that isn't quite "the full parse state" but is more than "what kind of
brace are we inside."

TS is the motivating example, but the underlying problem is general: a
language has token sequences whose meaning depends on structural context
that a shallow stack flattens away. Any technique I adopt should generalize.

## What I want you to research

Find and explain approaches in the literature and in real production
highlighters/lexers that sit in this middle ground. For each approach,
I want to understand:

1. **What state it tracks** beyond a context stack — and crucially, what
   it deliberately *doesn't* track.
2. **How it avoids state explosion.** Naively encoding "second field of a
   class with a prior annotated field" as a distinct state is a dead end.
   What's the trick that keeps the state space bounded?
3. **What class of ambiguities it handles**, and what it gives up on.
4. **Concrete failure modes** — where does the approach itself start to
   leak, and how do its users work around that?
5. **Cost model** — memory per token, lookahead/lookbehind requirements,
   incremental re-lex behavior on edits.
6. **Compatibility with my constraints** — specifically: can it be
   expressed declaratively and compiled statically, without runtime
   regex or host-language callbacks? If not directly, can the *idea*
   be adapted to a compiled state-machine model, and how?

## Specific avenues worth investigating

Don't limit yourself to these, but make sure you cover them:

- **Sublime Text's `.sublime-syntax`**, especially `branch_point`, `branch`,
  `fail`, `with_prototype`, and the `set`/`push`/`pop` discipline. Sublime
  is the closest existing system to what I have — declarative, compiled,
  stack-based, no runtime callbacks. I want a deep look at how far branch
  points actually scale, what their cost model is, and what they fail at
  in practice for TS-like languages. If Sublime's TypeScript syntax has
  known failure cases in this exact area, I want to see them.
- **TextMate grammars and vscode-textmate** — mostly as a baseline of
  what *doesn't* work, and to understand which Sublime extensions exist
  specifically because TextMate couldn't handle this.
- **Pygments' RegexLexer** with state stack, `bygroups`, `using`,
  `combined`, and `LexerContext` — the practical ceiling of "stack of
  states + small extensions," even though it relies on regex.
- **Tree-sitter's external scanners** — not the parser itself, but the
  contract between the scanner and the parser. The interesting question
  is whether the *kind of state* an external scanner maintains (it's a
  bounded C struct, serializable, no unbounded lookahead) is a model I
  could adapt.
- **Lexer hacks** — the C `typedef` lexer hack and its TS analogue. What
  is the *minimum* sidecar state needed, and can that sidecar be
  expressed declaratively rather than as imperative code?
- **Two-pass / semantic highlighting** (LSP semantic tokens). Probably
  not directly applicable since I want a single-pass streaming
  highlighter, but worth knowing where the boundary is drawn and why.
- **Island parsing / fuzzy parsing / robust parsing** literature
  (Moonen, van Deursen, Koppler, etc.) — parsing only the constructs
  you care about and skipping the rest. Could a "tiny island grammar"
  ride alongside the lexer state machine?
- **Bounded-lookahead disambiguation** — LL(k)/LR(k) at the *token*
  level, or follow-set-based disambiguation. Anything that says
  "decide this token's class based on the next N tokens, where N is
  small and known at grammar-compile time."
- **Earley/GLR-at-the-token-level** approaches — probably too heavy,
  but include them so I know why they're too heavy.
- **Roslyn, rust-analyzer, IntelliJ PSI, Volar.js** — production parsers
  built for IDE use. Mostly out of scope as implementations, but I want
  to know what they do at the lex/parse boundary that's *qualitatively
  different* from a stack-based lexer, in case any of those qualitative
  ideas can be ported.
- **Academic work** on context-sensitive lexing, scannerless parsing
  with disambiguation filters (SDF/Rascal), and any work explicitly on
  "compiled state machines with bounded extra state."

## Format I want back

For each approach you find:

- One-paragraph summary of the technique.
- The state model it uses — be precise. What's the *shape* of its state?
  How big is it per active lex context? What grows with input vs. with
  grammar?
- How it would handle the TS `identifier :` ambiguity above, walked
  through with at least two of the example constructs.
- Trade-offs and known failure modes.
- **Compatibility verdict** for my highlighter: directly portable,
  adaptable with effort, or fundamentally incompatible — and why.
- Source links (papers, source code, docs, specific files/lines where
  possible).

Then, a synthesis section:

- A taxonomy of the approaches along axes like: amount of lookahead,
  amount of lookbehind, structural state granularity, incremental
  friendliness, implementation complexity, *expressibility in a
  declarative compiled grammar*.
- Your assessment of which approach(es) are most promising **specifically
  for a regex-free, statically compiled, declarative state-machine
  highlighter**. Rule things in and out against my constraints
  explicitly.
- Concrete proposals for what a minimal grammar-spec extension might
  look like to support the winning approach. Sketch the new spec
  concepts (names, semantics, examples) and what the compiler would
  do with them. Aim for the smallest, most orthogonal extension that
  delivers the disambiguation power — ideally one new concept, not
  five. If you propose more than one concept, justify each.
- For each proposal: what compiles to what, what the runtime cost
  looks like, and what it would fail at.
- Any hybrid designs — e.g. "shallow stack + small bounded sidecar +
  k-token lookahead under condition X" — with the same level of
  detail.

## Constraints on the answer

- I am not asking for a full parser. If your conclusion is "just use
  tree-sitter / just write a parser," argue for it explicitly against
  the alternatives rather than defaulting to it. "Use tree-sitter" is
  not a valid answer to "how do I extend my own compiled
  state-machine highlighter."
- Be skeptical of techniques that work on the first example and
  quietly fail on the Nth. The whole reason I'm asking is that those
  are the ones I keep hitting.
- Be skeptical of techniques that *technically* work but would require
  rewriting my grammar spec around them. The bar for new grammar
  concepts is high; the bar for runtime mechanisms is lower.
- Concrete code or pseudocode beats hand-waving. If a technique exists
  in a real codebase, point me at the file and lines. Sublime's syntax
  definitions and Pygments lexers are both readable; cite specifics.
- Cite real sources. If you can't find a source for a claim, mark it
  as your own inference.
- If two approaches are near-equivalent in power, prefer the one that
  adds less to the grammar spec, even at the cost of more
  implementation work in the compiler/runtime.
