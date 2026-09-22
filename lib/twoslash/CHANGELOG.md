# @twinkleplop/twoslash

## 0.1.3
### Patch Changes



- [#77](https://github.com/pngwn/twinkleplop/pull/77) [`7d5cc5f`](https://github.com/pngwn/twinkleplop/commit/7d5cc5f598ecee5e2c51d26af572eb2d48567654) Thanks [@pngwn](https://github.com/pngwn)! - Hover and query types keep TypeScript's line breaks and indentation when a site shows the popover contents outside the code block, such as in a tooltip mounted elsewhere on the page.

- Updated dependencies [[`e36051c`](https://github.com/pngwn/twinkleplop/commit/e36051c72d4956e25c79daf627ec08f2c2934edf), [`185c681`](https://github.com/pngwn/twinkleplop/commit/185c681197726bc90abed3cca566e37078dab105), [`eedef07`](https://github.com/pngwn/twinkleplop/commit/eedef07a232680c44a80812b57dd19b161dbc973), [`a5f4d21`](https://github.com/pngwn/twinkleplop/commit/a5f4d2106a4c3aa0a4921da88964208f36032904), [`a3f4923`](https://github.com/pngwn/twinkleplop/commit/a3f4923c486b140d5d744745690efa4b3a90e073), [`fba34b1`](https://github.com/pngwn/twinkleplop/commit/fba34b14df85f4f61fc54f75c977a1145ee8b18a), [`77e5791`](https://github.com/pngwn/twinkleplop/commit/77e5791ed37ef14477d3b14c2ee2d54ea81f4ee0), [`84b7527`](https://github.com/pngwn/twinkleplop/commit/84b75279520c63ca19d322cfbced72e41e439085), [`6710782`](https://github.com/pngwn/twinkleplop/commit/671078298b33450abfca1006d55666098d5f351c), [`4fec60d`](https://github.com/pngwn/twinkleplop/commit/4fec60d3295dba2175ab34742025ad1206a186b1), [`4fec60d`](https://github.com/pngwn/twinkleplop/commit/4fec60d3295dba2175ab34742025ad1206a186b1), [`d06f61e`](https://github.com/pngwn/twinkleplop/commit/d06f61efed390b05d572bc65bf8c772a15a9f987), [`a3e1a0c`](https://github.com/pngwn/twinkleplop/commit/a3e1a0c90a02ee14caf0dd4fa09d7df9dd591cfa), [`8cc71aa`](https://github.com/pngwn/twinkleplop/commit/8cc71aaea9008e5b7a5e53345e386990b85aed3a)]:
  - @twinkleplop/core@0.2.0
  - @twinkleplop/typescript@0.1.3

## 0.1.2
### Patch Changes



- [#51](https://github.com/pngwn/twinkleplop/pull/51) [`adb982b`](https://github.com/pngwn/twinkleplop/commit/adb982bced5f3772f63cb12a9f955cbd8d5ff148) Thanks [@pngwn](https://github.com/pngwn)! - Render `^|` completion lists. Twoslash reports a completion as a zero-length node, but `render` treated it as a range wrapper like hovers and errors; a wrapper only opens a span once its range covers a character, so the list — and the `.twoslash-completion` / `.twoslash-completions` styles in `style.css` — never made it into the output. Completions are now point annotations: an empty host emitted at the caret, inside any wrapper it falls within but outside the token span, with the list anchored to it. `@twinkleplop/twoslash-svelte` picks this up through the shared renderer.



- [#47](https://github.com/pngwn/twinkleplop/pull/47) [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8) Thanks [@pngwn](https://github.com/pngwn)! - Change the default `class_name` from `"highlight twoslash"` to `"twinkleplop twoslash"`. Themes bind token colours to `.twinkleplop .<token>`, so default Twoslash output carried no colour at all while a plain language highlighter rendered correctly. The `twoslash` class is kept because it carries the popover and query styling.
  
  This changes the `<pre>` class in the rendered HTML. If you style `pre.highlight`, pass `class_name: "highlight twoslash"` to restore the previous value.


- [#52](https://github.com/pngwn/twinkleplop/pull/52) [`a8aa0a3`](https://github.com/pngwn/twinkleplop/commit/a8aa0a35c4f35cb2d925692fcb125df9f790fea4) Thanks [@pngwn](https://github.com/pngwn)! - Mark hover popovers `aria-hidden="true"`. A popover sits inline between the tokens it describes and holds a type signature, docs and tags, so anything that reads the markup as text rather than rendering it spliced that payload into the code: `const greeting = "hello world"` came back as `const greetingconst greeting: "hello world" = "hello world"`. Only CSS kept the popovers out of the way, and a screen reader, a search indexer or an HTML-to-markdown fetcher has none. The rendered text of a snippet is now the snippet.



- [#47](https://github.com/pngwn/twinkleplop/pull/47) [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8) Thanks [@pngwn](https://github.com/pngwn)! - Add `@twinkleplop/twoslash/style.css`, the layout and visibility rules for the `twoslash-*` spans. A theme only colours tokens, so importing one left every popover rendering inline and hover type text appeared in the middle of the code. The stylesheet is colour-free — it uses `currentColor` and two overridable custom properties — so it composes with any theme.

- Updated dependencies [[`4f1ce83`](https://github.com/pngwn/twinkleplop/commit/4f1ce837b309e8d2e26b8a2967fa8bb9b183eb03), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`ae80327`](https://github.com/pngwn/twinkleplop/commit/ae8032733702e2a838ddabab7f641120a59aed5e), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8)]:
  - @twinkleplop/core@0.1.2
  - @twinkleplop/typescript@0.1.2

## 0.1.1
### Patch Changes



- [#43](https://github.com/pngwn/twinkleplop/pull/43) [`2b81a07`](https://github.com/pngwn/twinkleplop/commit/2b81a07d969ba6c79e0210bda36735a28781739b) Thanks [@pngwn](https://github.com/pngwn)! - Ship built JavaScript and type declarations. These packages previously resolved to their TypeScript sources, so importing them outside a TypeScript aware bundler failed with `ERR_UNKNOWN_FILE_EXTENSION`. `@twinkleplop/twoslash-svelte` pointed at a file that did not exist at all, and `@twinkleplop/core` declared a types path it never built. The `source` condition still resolves to source, so workspace tooling and type checking against sources are unchanged.



- [#37](https://github.com/pngwn/twinkleplop/pull/37) [`562d1e2`](https://github.com/pngwn/twinkleplop/commit/562d1e2d645073ca4ef5874e2d9e57e240a31cb4) Thanks [@pngwn](https://github.com/pngwn)! - Patch release covering the fixes and internal changes made since 0.1.0.

- Updated dependencies [[`2b81a07`](https://github.com/pngwn/twinkleplop/commit/2b81a07d969ba6c79e0210bda36735a28781739b), [`562d1e2`](https://github.com/pngwn/twinkleplop/commit/562d1e2d645073ca4ef5874e2d9e57e240a31cb4)]:
  - @twinkleplop/core@0.1.1
  - @twinkleplop/typescript@0.1.1
