# @twinkleplop/javascript

## 0.1.5
### Patch Changes



- [#110](https://github.com/pngwn/twinkleplop/pull/110) [`a2b669d`](https://github.com/pngwn/twinkleplop/commit/a2b669ddfddfc8cc2be4867a8c6d3fef3b154a84) Thanks [@pngwn](https://github.com/pngwn)! - JavaScript, TypeScript and Svelte highlight faster. Sources and tokens that cannot hold embedded HTML, CSS or JSDoc are no longer scanned for them, repeated embedded regions reuse their type mappings, and TypeScript generics are found without rescanning whole blocks after a comparison. Output is unchanged.



- [#110](https://github.com/pngwn/twinkleplop/pull/110) [`7586aee`](https://github.com/pngwn/twinkleplop/commit/7586aee11fcd77ce1ca8440039420f28448bbb86) Thanks [@anzal1](https://github.com/anzal1)! - Highlighting is about 3% faster for JavaScript and TypeScript. `rewrite_types` now picks a token's candidate rules by its last character up front, and the tagged-template and JSDoc scanners no longer allocate a string or look up a WeakMap at every token. Output is unchanged.

- Updated dependencies [[`1e813c5`](https://github.com/pngwn/twinkleplop/commit/1e813c5785391363b4c846621fdad77b4b489df1), [`a2b669d`](https://github.com/pngwn/twinkleplop/commit/a2b669ddfddfc8cc2be4867a8c6d3fef3b154a84), [`ebb0a14`](https://github.com/pngwn/twinkleplop/commit/ebb0a1476fcb384f61dd0a6283d231c89279fdc6), [`56c345b`](https://github.com/pngwn/twinkleplop/commit/56c345b2146ec0a8e01b5bcb56e2425f726107e0), [`3dc045b`](https://github.com/pngwn/twinkleplop/commit/3dc045b7b6443377cd4e8a52f3a1d859adfb4067), [`f8c77c9`](https://github.com/pngwn/twinkleplop/commit/f8c77c9f7f8bb63900a4b2e10cf602dd1f638166), [`6c55db8`](https://github.com/pngwn/twinkleplop/commit/6c55db84a8eb2ebf0f9436af7c547147db4ff9b5), [`7586aee`](https://github.com/pngwn/twinkleplop/commit/7586aee11fcd77ce1ca8440039420f28448bbb86)]:
  - @twinkleplop/core@0.2.2
  - @twinkleplop/css@0.1.5
  - @twinkleplop/html@0.1.5

## 0.1.4
### Patch Changes



- [#85](https://github.com/pngwn/twinkleplop/pull/85) [`2c5f3ef`](https://github.com/pngwn/twinkleplop/commit/2c5f3ef0f9ffa5f57c8fd0da0e46e71fbcaa7fbd) Thanks [@pngwn](https://github.com/pngwn)! - Packages are now published under the MIT license.



- [#85](https://github.com/pngwn/twinkleplop/pull/85) [`9df0efc`](https://github.com/pngwn/twinkleplop/commit/9df0efc1785b21ea996dd658615bd0c24483c67c) Thanks [@pngwn](https://github.com/pngwn)! - Packages now contain only their built code, without source, tests or sourcemaps, which takes the combined install size from 7.2 MB to 1.1 MB. The language packages no longer expose a `./test` entry point.

- Updated dependencies [[`1618a01`](https://github.com/pngwn/twinkleplop/commit/1618a015421bccbcc3455f13a8374ae6dccde42d), [`2c5f3ef`](https://github.com/pngwn/twinkleplop/commit/2c5f3ef0f9ffa5f57c8fd0da0e46e71fbcaa7fbd), [`9df0efc`](https://github.com/pngwn/twinkleplop/commit/9df0efc1785b21ea996dd658615bd0c24483c67c)]:
  - @twinkleplop/core@0.2.1
  - @twinkleplop/css@0.1.4
  - @twinkleplop/html@0.1.4

## 0.1.3
### Patch Changes



- [#79](https://github.com/pngwn/twinkleplop/pull/79) [`eedef07`](https://github.com/pngwn/twinkleplop/commit/eedef07a232680c44a80812b57dd19b161dbc973) Thanks [@pngwn](https://github.com/pngwn)! - Highlight a generator's `*` as a `keyword` rather than an `operator`, matching Shiki. This applies at every fidelity setting.
  
  ```js
  function* ids() {
    yield* other();
  }
  
  class Tree {
    *[Symbol.iterator]() {}
    static async *walk() {}
  }
  ```


- [#57](https://github.com/pngwn/twinkleplop/pull/57) [`a5f4d21`](https://github.com/pngwn/twinkleplop/commit/a5f4d2106a4c3aa0a4921da88964208f36032904) Thanks [@pngwn](https://github.com/pngwn)! - Highlight every parameter of a function inside an object literal, interface or type literal the same way as the first, rather than as `property`:
  
  ```ts
  type U = { f: (a: string, b: number) => void };
  interface I {
    f(a: string, b: number): void;
  }
  const o = { f: (a: string, b: number) => a };
  ```
  
  This covers methods, call and construct signatures, and function expressions in an object, including a function-typed parameter such as `cb: () => void`.


- [#79](https://github.com/pngwn/twinkleplop/pull/79) [`a3f4923`](https://github.com/pngwn/twinkleplop/commit/a3f4923c486b140d5d744745690efa4b3a90e073) Thanks [@pngwn](https://github.com/pngwn)! - Highlight the `*` of a whole-module import or re-export as a `constant` rather than an `operator`, matching Shiki. It follows `constant` fidelity.
  
  ```js
  import * as utils from "./utils.js";
  import def, * as ns from "./ns.js";
  export * from "./shared.js";
  ```
  
  The binding after a default import, as in `import def, * as ns`, and after TypeScript's `import type * as ns` is now a `namespace` too.


- [#54](https://github.com/pngwn/twinkleplop/pull/54) [`fba34b1`](https://github.com/pngwn/twinkleplop/commit/fba34b14df85f4f61fc54f75c977a1145ee8b18a) Thanks [@pngwn](https://github.com/pngwn)! - Highlight the name in a TypeScript parameter property as `parameter`, the same as any other parameter, rather than `identifier`:
  
  ```ts
  class Animal {
    constructor(
      public name: string,
      private readonly id: number,
    ) {}
  }
  ```


- [#61](https://github.com/pngwn/twinkleplop/pull/61) [`77e5791`](https://github.com/pngwn/twinkleplop/commit/77e5791ed37ef14477d3b14c2ee2d54ea81f4ee0) Thanks [@pngwn](https://github.com/pngwn)! - Long runs of numbers no longer break the highlighting that follows them. In JSON, JavaScript, TypeScript, TSX, Go, Rust and SQL, a file with a few hundred numeric literals went wrong partway through and stayed wrong, and highlighting such files repeatedly slowed down every other language in the same process:
  
  ```js
  const samples = [0.5, 1.5, 2.5 /* ...300 more */];
  if (ready) start(); // `if` was highlighted as a plain identifier
  ```
  
  In JavaScript, an exponent in a call argument such as `f(1e3, x)` no longer drops the highlighting for the rest of the input.
- Updated dependencies [[`e36051c`](https://github.com/pngwn/twinkleplop/commit/e36051c72d4956e25c79daf627ec08f2c2934edf), [`185c681`](https://github.com/pngwn/twinkleplop/commit/185c681197726bc90abed3cca566e37078dab105), [`fba34b1`](https://github.com/pngwn/twinkleplop/commit/fba34b14df85f4f61fc54f75c977a1145ee8b18a), [`77e5791`](https://github.com/pngwn/twinkleplop/commit/77e5791ed37ef14477d3b14c2ee2d54ea81f4ee0), [`84b7527`](https://github.com/pngwn/twinkleplop/commit/84b75279520c63ca19d322cfbced72e41e439085), [`6710782`](https://github.com/pngwn/twinkleplop/commit/671078298b33450abfca1006d55666098d5f351c), [`4fec60d`](https://github.com/pngwn/twinkleplop/commit/4fec60d3295dba2175ab34742025ad1206a186b1), [`4fec60d`](https://github.com/pngwn/twinkleplop/commit/4fec60d3295dba2175ab34742025ad1206a186b1), [`d06f61e`](https://github.com/pngwn/twinkleplop/commit/d06f61efed390b05d572bc65bf8c772a15a9f987), [`a3e1a0c`](https://github.com/pngwn/twinkleplop/commit/a3e1a0c90a02ee14caf0dd4fa09d7df9dd591cfa), [`8cc71aa`](https://github.com/pngwn/twinkleplop/commit/8cc71aaea9008e5b7a5e53345e386990b85aed3a)]:
  - @twinkleplop/core@0.2.0
  - @twinkleplop/html@0.1.3
  - @twinkleplop/css@0.1.3

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


- [#53](https://github.com/pngwn/twinkleplop/pull/53) [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4) Thanks [@pngwn](https://github.com/pngwn)! - Stop two kinds of frame-tracker state from outliving the statement that set them. Both fed the same failure: a brace classified as something it is not, and every pass that reads frame kinds following it.
  
  **The angle counter.** `<` opens a type-argument list, but in the C family it is also less-than, so `for (let i = 0; i < n; i++)` armed a level that never closed. The counter is only read when a `{` opens, where a non-zero depth means "inside a generic" — so one unbalanced comparison reclassified every brace in the rest of the document. In a long file a class body, an interface body and a `switch` body all ended up as `type_literal`, and the passes that read frame kinds followed it: class fields were claimed as properties, and TypeScript type positions and parameter lists went unrecognised.
  
  `BraceKindSpec.angles` takes a new `reset_chars`, and a closing brace resynchronises the counter unconditionally. A type-argument list never crosses either at its own nesting level, so a real generic constraint (`class C<T extends { id: V }> {}`) classifies as before. The JavaScript family sets `reset_chars: ";"`.
  
  **The pending body marker.** `class` and `interface` are legal property names, so `const o = { class: 1 }` armed a marker that no brace of its own ever consumed — and the next unrelated `{` claimed it. `const o = { class: 1 }; const p = { a: 1 }` classified `p`'s literal as a class body, so `a` was not a property key.
  
  `BraceKindSpec` takes a new `marker_reset_chars`: a pending marker is discarded when one of those characters appears at the brace depth the marker was armed at. A class head never contains one at its own depth, while a generic constraint's `{ a: string; b: X }` sits a level deeper and is untouched. The JavaScript family sets `";,:"`.
  
  This corrects brace kinds in files past the first unbalanced comparison, so highlighting there changes — mostly identifiers that now resolve to `type` or `parameter`, and class fields that are no longer marked as properties.


- [#53](https://github.com/pngwn/twinkleplop/pull/53) [`ae80327`](https://github.com/pngwn/twinkleplop/commit/ae8032733702e2a838ddabab7f641120a59aed5e) Thanks [@pngwn](https://github.com/pngwn)! - Read a template interpolation's brace as an expression rather than an object literal. The `{` in `${` shares a token with the `$`, so the frame tracker could not place it and fell through to the fallback kind. `` `${function () {}}` `` was tracked as an object literal, and `` `${ foo(a) }` `` tagged `a` as a parameter as if `foo` were a method signature.



- [#53](https://github.com/pngwn/twinkleplop/pull/53) [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4) Thanks [@pngwn](https://github.com/pngwn)! - Highlight keywords inside call arguments. The two states covering a call's parentheses carried no keyword rules at all, so nothing between them was recognised:
  
  ```js
  console.log(typeof x)     // typeof read as an identifier
  fn(await p)               // await read as an identifier
  fn(new Date())            // new read as an identifier, Date as a function
  fn(function () {})        // function read as an identifier
  fn(null, true)            // null read as an identifier
  ```
  
  It was inconsistent rather than uniformly wrong, which is why it went unnoticed: `fn(a instanceof B)` was correct, because the leading identifier had already leaked the machine out into `division`, where the keyword rules live. Only a keyword that opened an argument was missed.
  
  Both states now take a keyword list. They end differently, which decides where those keywords may go: a call's own parentheses leave sideways on `)`, so their keywords route to `regex_allow` / `division` as everywhere else — making `fn(this / 2)` a division and `fn(typeof /re/)` a regex. Nested parentheses are pushed and pop on `)`, so theirs stay put; routing them out would strand the frame on the stack. Both also gained a member-access entry, so `fn((x.default))` still reads `default` as a name.
  
  The list is supplied per language, so TypeScript's own words work too: `fn(x as Foo)`, `fn(y satisfies Shape)`, and the parameter property in `constructor(public name: string)`, which was previously an identifier.


- [#53](https://github.com/pngwn/twinkleplop/pull/53) [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4) Thanks [@pngwn](https://github.com/pngwn)! - Highlight JSDoc comments. A `/** … */` comment is now handed to a jsdoc grammar the same way a tagged template is handed to HTML or CSS, so its structure comes back as tokens instead of one undifferentiated `comment`:
  
  - `@param`, `@returns`, `@type`, … — `keyword`
  - the `{…}` after a tag — `type` for the names, `punctuation` for the delimiters
  - the name after `@param {T} name` — `parameter`
  - the name after `@typedef {T} Name`, `@callback`, `@template` — `type`
  
  Everything else stays `comment`, including prose, an `@` inside a sentence, and a brace that is not part of a type expression (`@example const x = {}`). Line comments and plain `/* … */` block comments are untouched.
  
  The pass is an embed, so like CSS inside a `<style>` tag it runs at every fidelity setting.


- [#53](https://github.com/pngwn/twinkleplop/pull/53) [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4) Thanks [@pngwn](https://github.com/pngwn)! - Classify reserved words used as names. Every reserved word is a legal property name, but the grammar tagged them `keyword` wherever they appeared, so `const x = { default: "boo" }` highlighted `default` as a keyword rather than a property key.
  
  This is a correctness fix rather than identifier enrichment, so it holds at every fidelity setting. It lands in two places:
  
  - **Member access is settled in the grammar.** After a `.` or `?.` only a name can follow, so a new `member_access` state routes straight to the identifier probe without consulting the keyword rules. `obj.default` was only ever a keyword because a dot left the state machine in `division`, where the keyword rules live. `?.` moves out of the shared operator set into that state's entry rules, so exactly one rule owns the pattern.
  - **Member names are settled by a pass that runs before the claim batch.** It needs the frame table to tell an object literal from a block, so it cannot go in the grammar. It is a plain (non-claiming) reclassifier, which makes it a barrier: the claim batch sees its output, so `claim_property_scope`'s ordinary identifier rules do the promoting and need no reserved-word variants. Being a barrier also leaves the order-independence permutation count unchanged.
  
  Each word lands where the equivalent plain name lands:
  
  - `{ default: 1 }`, `interface I { new: number }`, `const { default: d } = mod` — `property`
  - `obj.default`, `obj?.new`, `foo().class` — `identifier`
  - `map.delete(k)`, `class C { default() {} }`, `interface I { delete(): void }` — `function`
  
  Positions where the word really is a keyword are unchanged: `switch (a) { default: }`, `export default`, labelled statements, and the `new (): T` construct signature in an interface.
  
  Method shorthand covers object literals and type literals as well as class and interface bodies. That relies on every brace the frame tracker cannot place being a genuine object literal, which is what the annotation-shape rules in the same release make true.
  
  Under `fidelity: "low"` a key reads as `identifier` rather than `property` — the coarse classification a plain name gets — but never as a keyword. The promotion to `property` is gated with the rest of the property claims.


- [#47](https://github.com/pngwn/twinkleplop/pull/47) [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8) Thanks [@pngwn](https://github.com/pngwn)! - Ship type declarations. Each package now builds a `dist/types.d.ts` and exposes it through a `types` export condition. Previously a plain `import { language } from "@twinkleplop/<lang>"` failed with `TS7016` under `strict`, and silently resolved to `any` without `noImplicitAny`, so a permissive compile was no evidence of type safety. The `main` field also pointed at `src/index.js`, which no package shipped; it now points at `dist/index.js`.

- Updated dependencies [[`4f1ce83`](https://github.com/pngwn/twinkleplop/commit/4f1ce837b309e8d2e26b8a2967fa8bb9b183eb03), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`ae80327`](https://github.com/pngwn/twinkleplop/commit/ae8032733702e2a838ddabab7f641120a59aed5e), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8)]:
  - @twinkleplop/core@0.1.2
  - @twinkleplop/css@0.1.2
  - @twinkleplop/html@0.1.2

## 0.1.1
### Patch Changes



- [#37](https://github.com/pngwn/twinkleplop/pull/37) [`562d1e2`](https://github.com/pngwn/twinkleplop/commit/562d1e2d645073ca4ef5874e2d9e57e240a31cb4) Thanks [@pngwn](https://github.com/pngwn)! - Patch release covering the fixes and internal changes made since 0.1.0.

- Updated dependencies [[`2b81a07`](https://github.com/pngwn/twinkleplop/commit/2b81a07d969ba6c79e0210bda36735a28781739b), [`562d1e2`](https://github.com/pngwn/twinkleplop/commit/562d1e2d645073ca4ef5874e2d9e57e240a31cb4)]:
  - @twinkleplop/core@0.1.1
  - @twinkleplop/css@0.1.1
  - @twinkleplop/html@0.1.1
