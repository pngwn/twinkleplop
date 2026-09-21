# @twinkleplop/theme-atom-one

## 0.1.2
### Patch Changes



- [#47](https://github.com/pngwn/twinkleplop/pull/47) [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8) Thanks [@pngwn](https://github.com/pngwn)! - Resolve `./tokens` to compiled JavaScript. The subpath pointed at `src/tokens.ts`, so the documented `import { light, dark } from "@twinkleplop/theme-<name>/tokens"` threw `ERR_UNKNOWN_FILE_EXTENSION` in plain Node and only worked behind a TypeScript-aware bundler. The palettes are now emitted to `dist/tokens.js` alongside a `dist/tokens.d.ts`, generated from the same `src/tokens.ts` the stylesheets come from. The `source` condition still resolves to the TypeScript source.

- Updated dependencies [[`4f1ce83`](https://github.com/pngwn/twinkleplop/commit/4f1ce837b309e8d2e26b8a2967fa8bb9b183eb03), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`4bbdfbb`](https://github.com/pngwn/twinkleplop/commit/4bbdfbbd4a13d2fc4099d0b37563fda1b31cc5f4), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`75ac009`](https://github.com/pngwn/twinkleplop/commit/75ac0094b8a5039b35d5c204070b48fec0c7daa8), [`ae80327`](https://github.com/pngwn/twinkleplop/commit/ae8032733702e2a838ddabab7f641120a59aed5e)]:
  - @twinkleplop/core@0.1.2

## 0.1.1
### Patch Changes



- [#37](https://github.com/pngwn/twinkleplop/pull/37) [`562d1e2`](https://github.com/pngwn/twinkleplop/commit/562d1e2d645073ca4ef5874e2d9e57e240a31cb4) Thanks [@pngwn](https://github.com/pngwn)! - Patch release covering the fixes and internal changes made since 0.1.0.

- Updated dependencies [[`2b81a07`](https://github.com/pngwn/twinkleplop/commit/2b81a07d969ba6c79e0210bda36735a28781739b), [`562d1e2`](https://github.com/pngwn/twinkleplop/commit/562d1e2d645073ca4ef5874e2d9e57e240a31cb4)]:
  - @twinkleplop/core@0.1.1
