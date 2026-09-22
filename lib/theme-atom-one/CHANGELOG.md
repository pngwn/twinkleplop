# @twinkleplop/theme-atom-one

## 0.2.0
### Minor Changes



- [#76](https://github.com/pngwn/twinkleplop/pull/76) [`7159a63`](https://github.com/pngwn/twinkleplop/commit/7159a6395ae0c95c55df81a8388e08fa091d3d17) Thanks [@pngwn](https://github.com/pngwn)! - Add the font styles One Light and One Dark Pro use, such as italic comments and markdown emphasis, exported as `light_styles` and `dark_styles` from `./tokens`.


### Patch Changes



- [#65](https://github.com/pngwn/twinkleplop/pull/65) [`e36051c`](https://github.com/pngwn/twinkleplop/commit/e36051c72d4956e25c79daf627ec08f2c2934edf) Thanks [@pngwn](https://github.com/pngwn)! - Add `@twinkleplop/http` for raw HTTP requests and responses and for `.http` request files from the VS Code REST Client and the JetBrains HTTP Client. JSON and HTML bodies, `{% %}` scripts and `curl` requests are highlighted in their own language, and a `{{variable}}` inside a body leaves the text around it intact:
  
  ```http
  POST https://{{host}}/comments
  Content-Type: application/json
  
  { "created_at": "{{$datetime iso8601}}" }
  ```
  
  Core adds `raw_json` and `raw_markup` placeholder tokens for the embedded bodies, and both themes map them to the default text colour.


- [#62](https://github.com/pngwn/twinkleplop/pull/62) [`84b7527`](https://github.com/pngwn/twinkleplop/commit/84b75279520c63ca19d322cfbced72e41e439085) Thanks [@pngwn](https://github.com/pngwn)! - Add `@twinkleplop/shellsession` for terminal transcripts. Prompts become `prompt_prefix` and `prompt` tokens, commands are highlighted as bash, and every other line is `output`. Both themes colour the new tokens.
  
  A command continued on `> ` lines is highlighted as one command, so a quoted string or a trailing `\` carries over:
  
  ```console
  $ echo 'first line
  > second line'
  ```
- Updated dependencies [[`e36051c`](https://github.com/pngwn/twinkleplop/commit/e36051c72d4956e25c79daf627ec08f2c2934edf), [`185c681`](https://github.com/pngwn/twinkleplop/commit/185c681197726bc90abed3cca566e37078dab105), [`fba34b1`](https://github.com/pngwn/twinkleplop/commit/fba34b14df85f4f61fc54f75c977a1145ee8b18a), [`84b7527`](https://github.com/pngwn/twinkleplop/commit/84b75279520c63ca19d322cfbced72e41e439085), [`6710782`](https://github.com/pngwn/twinkleplop/commit/671078298b33450abfca1006d55666098d5f351c), [`4fec60d`](https://github.com/pngwn/twinkleplop/commit/4fec60d3295dba2175ab34742025ad1206a186b1), [`4fec60d`](https://github.com/pngwn/twinkleplop/commit/4fec60d3295dba2175ab34742025ad1206a186b1), [`d06f61e`](https://github.com/pngwn/twinkleplop/commit/d06f61efed390b05d572bc65bf8c772a15a9f987), [`a3e1a0c`](https://github.com/pngwn/twinkleplop/commit/a3e1a0c90a02ee14caf0dd4fa09d7df9dd591cfa), [`8cc71aa`](https://github.com/pngwn/twinkleplop/commit/8cc71aaea9008e5b7a5e53345e386990b85aed3a)]:
  - @twinkleplop/core@0.2.0

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
