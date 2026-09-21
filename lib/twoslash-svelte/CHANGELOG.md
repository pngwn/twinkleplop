# @twinkleplop/twoslash-svelte

## 0.1.2
### Patch Changes



- [#47](https://github.com/pngwn/twinkleplop/pull/47) [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8) Thanks [@pngwn](https://github.com/pngwn)! - Change the default `class_name` from `"highlight twoslash"` to `"twinkleplop twoslash"`. Themes bind token colours to `.twinkleplop .<token>`, so default Twoslash output carried no colour at all while a plain language highlighter rendered correctly. The `twoslash` class is kept because it carries the popover and query styling.
  
  This changes the `<pre>` class in the rendered HTML. If you style `pre.highlight`, pass `class_name: "highlight twoslash"` to restore the previous value.
- Updated dependencies [[`4f1ce83`](https://github.com/pngwn/twinkleplop/commit/4f1ce837b309e8d2e26b8a2967fa8bb9b183eb03), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`ae80327`](https://github.com/pngwn/twinkleplop/commit/ae8032733702e2a838ddabab7f641120a59aed5e), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`adb982b`](https://github.com/pngwn/twinkleplop/commit/adb982bced5f3772f63cb12a9f955cbd8d5ff148), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`a8aa0a3`](https://github.com/pngwn/twinkleplop/commit/a8aa0a35c4f35cb2d925692fcb125df9f790fea4), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8)]:
  - @twinkleplop/core@0.1.2
  - @twinkleplop/svelte@0.1.2
  - @twinkleplop/twoslash@0.1.2

## 0.1.1
### Patch Changes



- [#43](https://github.com/pngwn/twinkleplop/pull/43) [`2b81a07`](https://github.com/pngwn/twinkleplop/commit/2b81a07d969ba6c79e0210bda36735a28781739b) Thanks [@pngwn](https://github.com/pngwn)! - Ship built JavaScript and type declarations. These packages previously resolved to their TypeScript sources, so importing them outside a TypeScript aware bundler failed with `ERR_UNKNOWN_FILE_EXTENSION`. `@twinkleplop/twoslash-svelte` pointed at a file that did not exist at all, and `@twinkleplop/core` declared a types path it never built. The `source` condition still resolves to source, so workspace tooling and type checking against sources are unchanged.



- [#37](https://github.com/pngwn/twinkleplop/pull/37) [`562d1e2`](https://github.com/pngwn/twinkleplop/commit/562d1e2d645073ca4ef5874e2d9e57e240a31cb4) Thanks [@pngwn](https://github.com/pngwn)! - Patch release covering the fixes and internal changes made since 0.1.0.

- Updated dependencies [[`2b81a07`](https://github.com/pngwn/twinkleplop/commit/2b81a07d969ba6c79e0210bda36735a28781739b), [`562d1e2`](https://github.com/pngwn/twinkleplop/commit/562d1e2d645073ca4ef5874e2d9e57e240a31cb4)]:
  - @twinkleplop/core@0.1.1
  - @twinkleplop/twoslash@0.1.1
  - @twinkleplop/svelte@0.1.1
