# @twinkleplop/http

## 0.1.6
### Patch Changes

- Updated dependencies [[`975c44f`](https://github.com/pngwn/twinkleplop/commit/975c44ff1ebc830f2963ea7b3c71ffa55e699966), [`3beddcd`](https://github.com/pngwn/twinkleplop/commit/3beddcdf745ee82bed8da5dcab75c7f7446d26ac), [`f0ce6c5`](https://github.com/pngwn/twinkleplop/commit/f0ce6c52995fd94008d20652076c7bf2c2fe8448), [`dbcd96d`](https://github.com/pngwn/twinkleplop/commit/dbcd96d923b692326bdff824eec941ace40be69f), [`82aaf5f`](https://github.com/pngwn/twinkleplop/commit/82aaf5f9f477de4237beed4e2263b07ae5430e7a), [`8394d2b`](https://github.com/pngwn/twinkleplop/commit/8394d2b69e340af554496ff7760fa59792aee7a7), [`504e57a`](https://github.com/pngwn/twinkleplop/commit/504e57a82e09cf0a2b554813b1dcb125aec7d5c5), [`725f37d`](https://github.com/pngwn/twinkleplop/commit/725f37d87db16abcfe32dad4247d1938a858f6b8)]:
  - @twinkleplop/javascript@0.1.6
  - @twinkleplop/html@0.1.6
  - @twinkleplop/core@0.2.3
  - @twinkleplop/bash@0.1.6
  - @twinkleplop/json@0.1.6

## 0.1.5
### Patch Changes

- Updated dependencies [[`1e813c5`](https://github.com/pngwn/twinkleplop/commit/1e813c5785391363b4c846621fdad77b4b489df1), [`a2b669d`](https://github.com/pngwn/twinkleplop/commit/a2b669ddfddfc8cc2be4867a8c6d3fef3b154a84), [`ebb0a14`](https://github.com/pngwn/twinkleplop/commit/ebb0a1476fcb384f61dd0a6283d231c89279fdc6), [`56c345b`](https://github.com/pngwn/twinkleplop/commit/56c345b2146ec0a8e01b5bcb56e2425f726107e0), [`3dc045b`](https://github.com/pngwn/twinkleplop/commit/3dc045b7b6443377cd4e8a52f3a1d859adfb4067), [`f8c77c9`](https://github.com/pngwn/twinkleplop/commit/f8c77c9f7f8bb63900a4b2e10cf602dd1f638166), [`6c55db8`](https://github.com/pngwn/twinkleplop/commit/6c55db84a8eb2ebf0f9436af7c547147db4ff9b5), [`7586aee`](https://github.com/pngwn/twinkleplop/commit/7586aee11fcd77ce1ca8440039420f28448bbb86)]:
  - @twinkleplop/core@0.2.2
  - @twinkleplop/javascript@0.1.5
  - @twinkleplop/bash@0.1.5
  - @twinkleplop/html@0.1.5
  - @twinkleplop/json@0.1.5

## 0.1.4
### Patch Changes



- [#85](https://github.com/pngwn/twinkleplop/pull/85) [`2c5f3ef`](https://github.com/pngwn/twinkleplop/commit/2c5f3ef0f9ffa5f57c8fd0da0e46e71fbcaa7fbd) Thanks [@pngwn](https://github.com/pngwn)! - Packages are now published under the MIT license.



- [#85](https://github.com/pngwn/twinkleplop/pull/85) [`9df0efc`](https://github.com/pngwn/twinkleplop/commit/9df0efc1785b21ea996dd658615bd0c24483c67c) Thanks [@pngwn](https://github.com/pngwn)! - Packages now contain only their built code, without source, tests or sourcemaps, which takes the combined install size from 7.2 MB to 1.1 MB. The language packages no longer expose a `./test` entry point.

- Updated dependencies [[`1618a01`](https://github.com/pngwn/twinkleplop/commit/1618a015421bccbcc3455f13a8374ae6dccde42d), [`2c5f3ef`](https://github.com/pngwn/twinkleplop/commit/2c5f3ef0f9ffa5f57c8fd0da0e46e71fbcaa7fbd), [`9df0efc`](https://github.com/pngwn/twinkleplop/commit/9df0efc1785b21ea996dd658615bd0c24483c67c)]:
  - @twinkleplop/core@0.2.1
  - @twinkleplop/bash@0.1.4
  - @twinkleplop/html@0.1.4
  - @twinkleplop/javascript@0.1.4
  - @twinkleplop/json@0.1.4

## 0.1.3
### Patch Changes



- [#65](https://github.com/pngwn/twinkleplop/pull/65) [`e36051c`](https://github.com/pngwn/twinkleplop/commit/e36051c72d4956e25c79daf627ec08f2c2934edf) Thanks [@pngwn](https://github.com/pngwn)! - Add `@twinkleplop/http` for raw HTTP requests and responses and for `.http` request files from the VS Code REST Client and the JetBrains HTTP Client. JSON and HTML bodies, `{% %}` scripts and `curl` requests are highlighted in their own language, and a `{{variable}}` inside a body leaves the text around it intact:
  
  ```http
  POST https://{{host}}/comments
  Content-Type: application/json
  
  { "created_at": "{{$datetime iso8601}}" }
  ```
  
  Core adds `raw_json` and `raw_markup` placeholder tokens for the embedded bodies, and both themes map them to the default text colour.
- Updated dependencies [[`e36051c`](https://github.com/pngwn/twinkleplop/commit/e36051c72d4956e25c79daf627ec08f2c2934edf), [`185c681`](https://github.com/pngwn/twinkleplop/commit/185c681197726bc90abed3cca566e37078dab105), [`eedef07`](https://github.com/pngwn/twinkleplop/commit/eedef07a232680c44a80812b57dd19b161dbc973), [`a5f4d21`](https://github.com/pngwn/twinkleplop/commit/a5f4d2106a4c3aa0a4921da88964208f36032904), [`a3f4923`](https://github.com/pngwn/twinkleplop/commit/a3f4923c486b140d5d744745690efa4b3a90e073), [`fba34b1`](https://github.com/pngwn/twinkleplop/commit/fba34b14df85f4f61fc54f75c977a1145ee8b18a), [`77e5791`](https://github.com/pngwn/twinkleplop/commit/77e5791ed37ef14477d3b14c2ee2d54ea81f4ee0), [`84b7527`](https://github.com/pngwn/twinkleplop/commit/84b75279520c63ca19d322cfbced72e41e439085), [`6710782`](https://github.com/pngwn/twinkleplop/commit/671078298b33450abfca1006d55666098d5f351c), [`4fec60d`](https://github.com/pngwn/twinkleplop/commit/4fec60d3295dba2175ab34742025ad1206a186b1), [`4fec60d`](https://github.com/pngwn/twinkleplop/commit/4fec60d3295dba2175ab34742025ad1206a186b1), [`d06f61e`](https://github.com/pngwn/twinkleplop/commit/d06f61efed390b05d572bc65bf8c772a15a9f987), [`a3e1a0c`](https://github.com/pngwn/twinkleplop/commit/a3e1a0c90a02ee14caf0dd4fa09d7df9dd591cfa), [`8cc71aa`](https://github.com/pngwn/twinkleplop/commit/8cc71aaea9008e5b7a5e53345e386990b85aed3a)]:
  - @twinkleplop/core@0.2.0
  - @twinkleplop/javascript@0.1.3
  - @twinkleplop/json@0.1.3
  - @twinkleplop/html@0.1.3
  - @twinkleplop/bash@0.1.3
