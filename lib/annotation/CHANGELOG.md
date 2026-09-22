# @twinkleplop/annotation

## 0.1.3
### Patch Changes

- Updated dependencies [[`e36051c`](https://github.com/pngwn/twinkleplop/commit/e36051c72d4956e25c79daf627ec08f2c2934edf), [`185c681`](https://github.com/pngwn/twinkleplop/commit/185c681197726bc90abed3cca566e37078dab105), [`fba34b1`](https://github.com/pngwn/twinkleplop/commit/fba34b14df85f4f61fc54f75c977a1145ee8b18a), [`84b7527`](https://github.com/pngwn/twinkleplop/commit/84b75279520c63ca19d322cfbced72e41e439085), [`6710782`](https://github.com/pngwn/twinkleplop/commit/671078298b33450abfca1006d55666098d5f351c), [`4fec60d`](https://github.com/pngwn/twinkleplop/commit/4fec60d3295dba2175ab34742025ad1206a186b1), [`4fec60d`](https://github.com/pngwn/twinkleplop/commit/4fec60d3295dba2175ab34742025ad1206a186b1), [`d06f61e`](https://github.com/pngwn/twinkleplop/commit/d06f61efed390b05d572bc65bf8c772a15a9f987), [`a3e1a0c`](https://github.com/pngwn/twinkleplop/commit/a3e1a0c90a02ee14caf0dd4fa09d7df9dd591cfa), [`8cc71aa`](https://github.com/pngwn/twinkleplop/commit/8cc71aaea9008e5b7a5e53345e386990b85aed3a)]:
  - @twinkleplop/core@0.2.0

## 0.1.2
### Patch Changes

- Updated dependencies [[`4f1ce83`](https://github.com/pngwn/twinkleplop/commit/4f1ce837b309e8d2e26b8a2967fa8bb9b183eb03), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`ae80327`](https://github.com/pngwn/twinkleplop/commit/ae8032733702e2a838ddabab7f641120a59aed5e)]:
  - @twinkleplop/core@0.1.2

## 0.1.1
### Patch Changes



- [#43](https://github.com/pngwn/twinkleplop/pull/43) [`2b81a07`](https://github.com/pngwn/twinkleplop/commit/2b81a07d969ba6c79e0210bda36735a28781739b) Thanks [@pngwn](https://github.com/pngwn)! - Ship built JavaScript and type declarations. These packages previously resolved to their TypeScript sources, so importing them outside a TypeScript aware bundler failed with `ERR_UNKNOWN_FILE_EXTENSION`. `@twinkleplop/twoslash-svelte` pointed at a file that did not exist at all, and `@twinkleplop/core` declared a types path it never built. The `source` condition still resolves to source, so workspace tooling and type checking against sources are unchanged.



- [#37](https://github.com/pngwn/twinkleplop/pull/37) [`562d1e2`](https://github.com/pngwn/twinkleplop/commit/562d1e2d645073ca4ef5874e2d9e57e240a31cb4) Thanks [@pngwn](https://github.com/pngwn)! - Patch release covering the fixes and internal changes made since 0.1.0.

- Updated dependencies [[`2b81a07`](https://github.com/pngwn/twinkleplop/commit/2b81a07d969ba6c79e0210bda36735a28781739b), [`562d1e2`](https://github.com/pngwn/twinkleplop/commit/562d1e2d645073ca4ef5874e2d9e57e240a31cb4)]:
  - @twinkleplop/core@0.1.1
