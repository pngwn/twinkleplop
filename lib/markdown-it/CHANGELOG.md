# @twinkleplop/markdown-it

## 0.1.6
### Patch Changes

- Updated dependencies []:
  - @twinkleplop/markdown-core@0.1.6

## 0.1.5
### Patch Changes

- Updated dependencies []:
  - @twinkleplop/markdown-core@0.1.5

## 0.1.4
### Patch Changes



- [#85](https://github.com/pngwn/twinkleplop/pull/85) [`2c5f3ef`](https://github.com/pngwn/twinkleplop/commit/2c5f3ef0f9ffa5f57c8fd0da0e46e71fbcaa7fbd) Thanks [@pngwn](https://github.com/pngwn)! - Packages are now published under the MIT license.



- [#85](https://github.com/pngwn/twinkleplop/pull/85) [`9df0efc`](https://github.com/pngwn/twinkleplop/commit/9df0efc1785b21ea996dd658615bd0c24483c67c) Thanks [@pngwn](https://github.com/pngwn)! - Packages now contain only their built code, without source, tests or sourcemaps, which takes the combined install size from 7.2 MB to 1.1 MB. The language packages no longer expose a `./test` entry point.

- Updated dependencies [[`2c5f3ef`](https://github.com/pngwn/twinkleplop/commit/2c5f3ef0f9ffa5f57c8fd0da0e46e71fbcaa7fbd), [`9df0efc`](https://github.com/pngwn/twinkleplop/commit/9df0efc1785b21ea996dd658615bd0c24483c67c)]:
  - @twinkleplop/markdown-core@0.1.4

## 0.1.3
### Patch Changes

- Updated dependencies []:
  - @twinkleplop/markdown-core@0.1.3

## 0.1.2
### Patch Changes

- Updated dependencies []:
  - @twinkleplop/markdown-core@0.1.2

## 0.1.1
### Patch Changes



- [#43](https://github.com/pngwn/twinkleplop/pull/43) [`2b81a07`](https://github.com/pngwn/twinkleplop/commit/2b81a07d969ba6c79e0210bda36735a28781739b) Thanks [@pngwn](https://github.com/pngwn)! - Ship built JavaScript and type declarations. These packages previously resolved to their TypeScript sources, so importing them outside a TypeScript aware bundler failed with `ERR_UNKNOWN_FILE_EXTENSION`. `@twinkleplop/twoslash-svelte` pointed at a file that did not exist at all, and `@twinkleplop/core` declared a types path it never built. The `source` condition still resolves to source, so workspace tooling and type checking against sources are unchanged.



- [#37](https://github.com/pngwn/twinkleplop/pull/37) [`562d1e2`](https://github.com/pngwn/twinkleplop/commit/562d1e2d645073ca4ef5874e2d9e57e240a31cb4) Thanks [@pngwn](https://github.com/pngwn)! - Patch release covering the fixes and internal changes made since 0.1.0.

- Updated dependencies [[`2b81a07`](https://github.com/pngwn/twinkleplop/commit/2b81a07d969ba6c79e0210bda36735a28781739b), [`562d1e2`](https://github.com/pngwn/twinkleplop/commit/562d1e2d645073ca4ef5874e2d9e57e240a31cb4)]:
  - @twinkleplop/markdown-core@0.1.1
