# @twinkleplop/core

## 0.2.1
### Patch Changes



- [#85](https://github.com/pngwn/twinkleplop/pull/85) [`1618a01`](https://github.com/pngwn/twinkleplop/commit/1618a015421bccbcc3455f13a8374ae6dccde42d) Thanks [@pngwn](https://github.com/pngwn)! - `@twinkleplop/core/types` is now a types-only entry point. Import its runtime constants from `@twinkleplop/core`.



- [#85](https://github.com/pngwn/twinkleplop/pull/85) [`2c5f3ef`](https://github.com/pngwn/twinkleplop/commit/2c5f3ef0f9ffa5f57c8fd0da0e46e71fbcaa7fbd) Thanks [@pngwn](https://github.com/pngwn)! - Packages are now published under the MIT license.



- [#85](https://github.com/pngwn/twinkleplop/pull/85) [`9df0efc`](https://github.com/pngwn/twinkleplop/commit/9df0efc1785b21ea996dd658615bd0c24483c67c) Thanks [@pngwn](https://github.com/pngwn)! - Packages now contain only their built code, without source, tests or sourcemaps, which takes the combined install size from 7.2 MB to 1.1 MB. The language packages no longer expose a `./test` entry point.

## 0.2.0
### Minor Changes



- [#67](https://github.com/pngwn/twinkleplop/pull/67) [`6710782`](https://github.com/pngwn/twinkleplop/commit/671078298b33450abfca1006d55666098d5f351c) Thanks [@pngwn](https://github.com/pngwn)! - Add the `theme_styles` and `font_style` types, which theme packages use to mark tokens as italic, bold, underlined or struck through in each variant.


### Patch Changes



- [#65](https://github.com/pngwn/twinkleplop/pull/65) [`e36051c`](https://github.com/pngwn/twinkleplop/commit/e36051c72d4956e25c79daf627ec08f2c2934edf) Thanks [@pngwn](https://github.com/pngwn)! - Add `@twinkleplop/http` for raw HTTP requests and responses and for `.http` request files from the VS Code REST Client and the JetBrains HTTP Client. JSON and HTML bodies, `{% %}` scripts and `curl` requests are highlighted in their own language, and a `{{variable}}` inside a body leaves the text around it intact:
  
  ```http
  POST https://{{host}}/comments
  Content-Type: application/json
  
  { "created_at": "{{$datetime iso8601}}" }
  ```
  
  Core adds `raw_json` and `raw_markup` placeholder tokens for the embedded bodies, and both themes map them to the default text colour.


- [#70](https://github.com/pngwn/twinkleplop/pull/70) [`185c681`](https://github.com/pngwn/twinkleplop/commit/185c681197726bc90abed3cca566e37078dab105) Thanks [@pngwn](https://github.com/pngwn)! - Fix missing stack information in the debug introspector's events. Push, pop, per-character and probe-entry events now report `stack_depth`, and each per-character `full_state_path` includes the states on the stack as well as the current one. Probe-entry events report the `rule_index` that started the probe, the completion event reports `final_stack_depth`, and each state session records its nesting `depth`.



- [#54](https://github.com/pngwn/twinkleplop/pull/54) [`fba34b1`](https://github.com/pngwn/twinkleplop/commit/fba34b14df85f4f61fc54f75c977a1145ee8b18a) Thanks [@pngwn](https://github.com/pngwn)! - Highlight the name in a TypeScript parameter property as `parameter`, the same as any other parameter, rather than `identifier`:
  
  ```ts
  class Animal {
    constructor(
      public name: string,
      private readonly id: number,
    ) {}
  }
  ```


- [#62](https://github.com/pngwn/twinkleplop/pull/62) [`84b7527`](https://github.com/pngwn/twinkleplop/commit/84b75279520c63ca19d322cfbced72e41e439085) Thanks [@pngwn](https://github.com/pngwn)! - Add `@twinkleplop/shellsession` for terminal transcripts. Prompts become `prompt_prefix` and `prompt` tokens, commands are highlighted as bash, and every other line is `output`. Both themes colour the new tokens.
  
  A command continued on `> ` lines is highlighted as one command, so a quoted string or a trailing `\` carries over:
  
  ```console
  $ echo 'first line
  > second line'
  ```


- [#66](https://github.com/pngwn/twinkleplop/pull/66) [`4fec60d`](https://github.com/pngwn/twinkleplop/commit/4fec60d3295dba2175ab34742025ad1206a186b1) Thanks [@pngwn](https://github.com/pngwn)! - A non-ASCII character is kept when a grammar hands it to another state, such as the first character of a line in a Markdown code block, a Svelte `{expression}` or a Bash regex after `=~`:
  
  ````md
  ```text
  λ calculus
  ```
  ````
  
  The line above is highlighted as code in full rather than losing its first character.
  
  In a custom grammar, `fallback(goto(...))` and `fallback(leave())` without a token leave a non-ASCII character for the next state, and a `fallback` rule enters and resolves a probe state on a non-ASCII character, the same as on ASCII.


- [#66](https://github.com/pngwn/twinkleplop/pull/66) [`4fec60d`](https://github.com/pngwn/twinkleplop/commit/4fec60d3295dba2175ab34742025ad1206a186b1) Thanks [@pngwn](https://github.com/pngwn)! - Tokenizing no longer hangs when a custom grammar starts a probe on a non-ASCII character and the probe reaches the end of the input with no `fallback` state. The character is skipped, the same as an ASCII one.



- [#62](https://github.com/pngwn/twinkleplop/pull/62) [`d06f61e`](https://github.com/pngwn/twinkleplop/commit/d06f61efed390b05d572bc65bf8c772a15a9f987) Thanks [@pngwn](https://github.com/pngwn)! - A non-ASCII character that changes a grammar's state, such as a `λ` prompt symbol, is tokenized correctly along with the text after it, including when it is the last character of the input.



- [#58](https://github.com/pngwn/twinkleplop/pull/58) [`a3e1a0c`](https://github.com/pngwn/twinkleplop/commit/a3e1a0c90a02ee14caf0dd4fa09d7df9dd591cfa) Thanks [@pngwn](https://github.com/pngwn)! - Highlight the type in an optional annotation (`x?: T`) as `type`, the same as in a required one, rather than `identifier`:
  
  ```ts
  interface Hooks {
    line?: (n: number, source_line: number) => HookResult | void;
    options?: RewriteOptions;
  }
  ```
  
  This covers optional interface members, class fields and parameters. An optional method's return type, as in `f?(): R`, is still `identifier`.


- [#56](https://github.com/pngwn/twinkleplop/pull/56) [`8cc71aa`](https://github.com/pngwn/twinkleplop/commit/8cc71aaea9008e5b7a5e53345e386990b85aed3a) Thanks [@pngwn](https://github.com/pngwn)! - Highlight the labels in a labelled tuple as `property` rather than `type`, the same as keys in an object type:
  
  ```ts
  type Range = [start: number, end: number];
  ```
  
  Optional and rest labels such as `[a?: T]` and `[...rest: T[]]` are covered too. With `fidelity: ["type"]`, labels stay `identifier`, as object type keys already do.

## 0.1.2
### Patch Changes



- [#53](https://github.com/pngwn/twinkleplop/pull/53) [`4f1ce83`](https://github.com/pngwn/twinkleplop/commit/4f1ce837b309e8d2e26b8a2967fa8bb9b183eb03) Thanks [@pngwn](https://github.com/pngwn)! - Classify two brace positions the prev-token rules read wrongly. A function body behind a return-type annotation (`function f(state: number): void { ... }`) fell through to `object`, because the token before the brace is the tail of the type rather than the `)` the block rule looks for; a `case` arm with a block body (`case "bytes": { ... }`) matched the annotation rule on its `:` and became `type_literal`. Both now classify as `block`, which is what the claim passes gate on — a statement inside such a body is no longer a candidate member.
  
  `BraceKindRule` gains two optional conditions to express this: `scan_back`, a bounded backward walk that lets a rule key on the shape of a whole annotation instead of the one token before the brace, and `in_kinds`, an enclosing-frame gate that keeps the `case` rule off a reserved word used as an object key (`{ default: { a: 1 } }` looks identical until you know the enclosing frame is an object literal). The return-type rules accept both spellings of a builtin type name, since the TSX grammar tags `string` / `number` as `type` where the TypeScript grammar leaves them identifiers. Brace-kind prev rules are now bucketed by the previous token's type, so a longer rule list costs nothing for braces the rules do not apply to.
  
  Also fixes parameter names going untagged in the second arm of a ternary (`c ? (i: number) => a : (i: number) => b`) inside a function body. `params()` with `skip_in_type_position` treated any `(` after a `:` as a function type unless the enclosing frame was an object literal, which happened to be what a mis-classified function body looked like; it now consults the tracker's ternary-colon signal, discounting the `?` of an optional member (`onHover?: (index: number) => void`), which the mode-blind qmark counting cannot tell from a ternary on its own.


- [#53](https://github.com/pngwn/twinkleplop/pull/53) [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4) Thanks [@pngwn](https://github.com/pngwn)! - Close generic parameter lists that end on a coalesced `>`. The tokenizer emits a run of `>` as one right-shift operator, so `make<T extends Record<string, unknown>>(base: T)` closes both angle groups on a single `>>` token. Three of the walkers that count angle depth only understood a lone `>`, never found the close, and gave up on the whole declaration: the name stayed `identifier` rather than `function`, the type parameter `T` stayed `identifier` rather than `type`, and `base` was never tagged as a parameter.
  
  - `type_span`'s generic-argument verification and its span walk pop as many levels as the run has `>` characters. The walk previously never came back down, so once verification was fixed the span would have run on past the close and claimed every later identifier as a type.
  - `promote_ts_generic_calls` does the same.
  - Class, interface and object method parameter lists now step over type parameters, the way function declarations already did, so `interface I { make<T>(base: T): T }` tags `base` as a parameter.
  
  `>=` and `>>=` still close nothing, and a shift expression such as `a < b >> c` is still rejected by the generic-argument check.
  
  The same walk decides which identifiers inside a `{ ... }` name a member rather than refer to one, and it recognised only two of the four shapes. It now also skips:
  
  - a method signature's name, so `type T = { make<U>(base: U): U }` keeps the `function` the grammar gave it instead of being claimed as a type. A plain type reference (`{ a: Foo<U> }`) is still recorded, because only an angle group that closes straight onto a parameter list marks a method.
  - an optional key written as a separate `?` and `:`, which is what the JavaScript family emits. `{ brackets: { paren?: { open: string } } }` claimed `paren` as a type; it is a property. The same fix names an optional parameter in a function type (`(options?: Options) => void`).


- [#53](https://github.com/pngwn/twinkleplop/pull/53) [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4) Thanks [@pngwn](https://github.com/pngwn)! - Classify a brace that shares a token with the punctuation before it. Grammars coalesce adjacent punctuation, so `) {` arrives as two tokens and `){` as one — the same code differing only by a space. The frame tracker classified a brace from the *previous token*, which for `switch(k){` is the identifier `k`, so no rule matched and the body fell through to the fallback kind. A `switch` body read as an object literal, and an arrow returning an object (`x => ({ a: 1 })`) read as a block because the `=>` rule matched a brace that the `(` had already separated from it.
  
  `BraceKindSpec.prev_rules` now also apply to the character immediately before a mid-token brace. Same rules, same kinds: `) {` and `){` classify identically.


- [#47](https://github.com/pngwn/twinkleplop/pull/47) [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8) Thanks [@pngwn](https://github.com/pngwn)! - Re-export `Grammar`, `CompiledGrammar`, `GrammarRule` and `GrammarState` from `@twinkleplop/core/compile`. `compile` and `define_grammar` return these types, but they were only reachable through `@twinkleplop/core/types`, so a package that built a grammar with them could not emit its own declarations: TypeScript reported `TS4023`/`TS4082` for a type it could not name through the subpath the value came from.



- [#53](https://github.com/pngwn/twinkleplop/pull/53) [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4) Thanks [@pngwn](https://github.com/pngwn)! - Stop two kinds of frame-tracker state from outliving the statement that set them. Both fed the same failure: a brace classified as something it is not, and every pass that reads frame kinds following it.
  
  **The angle counter.** `<` opens a type-argument list, but in the C family it is also less-than, so `for (let i = 0; i < n; i++)` armed a level that never closed. The counter is only read when a `{` opens, where a non-zero depth means "inside a generic" — so one unbalanced comparison reclassified every brace in the rest of the document. In a long file a class body, an interface body and a `switch` body all ended up as `type_literal`, and the passes that read frame kinds followed it: class fields were claimed as properties, and TypeScript type positions and parameter lists went unrecognised.
  
  `BraceKindSpec.angles` takes a new `reset_chars`, and a closing brace resynchronises the counter unconditionally. A type-argument list never crosses either at its own nesting level, so a real generic constraint (`class C<T extends { id: V }> {}`) classifies as before. The JavaScript family sets `reset_chars: ";"`.
  
  **The pending body marker.** `class` and `interface` are legal property names, so `const o = { class: 1 }` armed a marker that no brace of its own ever consumed — and the next unrelated `{` claimed it. `const o = { class: 1 }; const p = { a: 1 }` classified `p`'s literal as a class body, so `a` was not a property key.
  
  `BraceKindSpec` takes a new `marker_reset_chars`: a pending marker is discarded when one of those characters appears at the brace depth the marker was armed at. A class head never contains one at its own depth, while a generic constraint's `{ a: string; b: X }` sits a level deeper and is untouched. The JavaScript family sets `";,:"`.
  
  This corrects brace kinds in files past the first unbalanced comparison, so highlighting there changes — mostly identifiers that now resolve to `type` or `parameter`, and class fields that are no longer marked as properties.


- [#47](https://github.com/pngwn/twinkleplop/pull/47) [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8) Thanks [@pngwn](https://github.com/pngwn)! - Fix the debug and introspector declarations rejecting the documented calls. The declaration bundle emits each entry point as a self-contained block, so a class reachable from several subpaths was inlined once per block; because TypeScript compares classes with `private` members nominally, those copies were mutually unassignable. Passing `TokenizerIntrospector` from `/introspector` to `tokenize` from `/debug`, or to `GrammarMapper.create_enhanced_introspector` from `/grammar-mapper`, reported `TS2345` even though both sides are the same class at runtime. The bundled declarations no longer carry `private` members, so the copies share one structural identity.



- [#47](https://github.com/pngwn/twinkleplop/pull/47) [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8) Thanks [@pngwn](https://github.com/pngwn)! - Fix the unparseable reserved-word declarations in `dist/types.d.ts`. The bundle contained `export const "function" = "function";` and `export const "null" = "null";`, neither of which is valid TypeScript, so any consumer importing the package failed to compile with `TS1134` — and a parse error in a `.d.ts` cannot be suppressed with `skipLibCheck`. The two reserved-word token exports are now declared as legal identifiers and re-exported under their required names, so `TOKENS.function` and `TOKENS["null"]` keep working.



- [#53](https://github.com/pngwn/twinkleplop/pull/53) [`ae80327`](https://github.com/pngwn/twinkleplop/commit/ae8032733702e2a838ddabab7f641120a59aed5e) Thanks [@pngwn](https://github.com/pngwn)! - Read a template interpolation's brace as an expression rather than an object literal. The `{` in `${` shares a token with the `$`, so the frame tracker could not place it and fell through to the fallback kind. `` `${function () {}}` `` was tracked as an object literal, and `` `${ foo(a) }` `` tagged `a` as a parameter as if `foo` were a method signature.

## 0.1.1
### Patch Changes



- [#43](https://github.com/pngwn/twinkleplop/pull/43) [`2b81a07`](https://github.com/pngwn/twinkleplop/commit/2b81a07d969ba6c79e0210bda36735a28781739b) Thanks [@pngwn](https://github.com/pngwn)! - Ship built JavaScript and type declarations. These packages previously resolved to their TypeScript sources, so importing them outside a TypeScript aware bundler failed with `ERR_UNKNOWN_FILE_EXTENSION`. `@twinkleplop/twoslash-svelte` pointed at a file that did not exist at all, and `@twinkleplop/core` declared a types path it never built. The `source` condition still resolves to source, so workspace tooling and type checking against sources are unchanged.



- [#37](https://github.com/pngwn/twinkleplop/pull/37) [`562d1e2`](https://github.com/pngwn/twinkleplop/commit/562d1e2d645073ca4ef5874e2d9e57e240a31cb4) Thanks [@pngwn](https://github.com/pngwn)! - Patch release covering the fixes and internal changes made since 0.1.0.
