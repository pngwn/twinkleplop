# @twinkleplop/dotenv

## 0.1.3
### Patch Changes



- [#75](https://github.com/pngwn/twinkleplop/pull/75) [`89a5fca`](https://github.com/pngwn/twinkleplop/commit/89a5fca4b0a1f30c1c3ae75d20e70056c83b5999) Thanks [@pngwn](https://github.com/pngwn)! - Add `@twinkleplop/dotenv` for `.env` files, following the loaders people use: dotenv for Node (and through it Vite and Next.js), Ruby and Python, godotenv and Docker Compose. Quoted values can span lines, and `$NAME`, `${NAME:-default}` and `$(command)` are highlighted in unquoted and double-quoted values but not in single-quoted ones:
  
  ```sh
  export DATABASE_URL="postgres://${PGUSER:-app}:$PGPASS@db:5432/app" # primary
  PORT=5432
  ```
  
  Keys are `property`. A value that is entirely a number or a boolean is `number` or `boolean`, so `PORT=5432` is a number and `IP=127.0.0.1` stays a string. As in Node and Ruby, a `#` anywhere in an unquoted value starts a comment.
- Updated dependencies [[`e36051c`](https://github.com/pngwn/twinkleplop/commit/e36051c72d4956e25c79daf627ec08f2c2934edf), [`185c681`](https://github.com/pngwn/twinkleplop/commit/185c681197726bc90abed3cca566e37078dab105), [`fba34b1`](https://github.com/pngwn/twinkleplop/commit/fba34b14df85f4f61fc54f75c977a1145ee8b18a), [`84b7527`](https://github.com/pngwn/twinkleplop/commit/84b75279520c63ca19d322cfbced72e41e439085), [`6710782`](https://github.com/pngwn/twinkleplop/commit/671078298b33450abfca1006d55666098d5f351c), [`4fec60d`](https://github.com/pngwn/twinkleplop/commit/4fec60d3295dba2175ab34742025ad1206a186b1), [`4fec60d`](https://github.com/pngwn/twinkleplop/commit/4fec60d3295dba2175ab34742025ad1206a186b1), [`d06f61e`](https://github.com/pngwn/twinkleplop/commit/d06f61efed390b05d572bc65bf8c772a15a9f987), [`a3e1a0c`](https://github.com/pngwn/twinkleplop/commit/a3e1a0c90a02ee14caf0dd4fa09d7df9dd591cfa), [`8cc71aa`](https://github.com/pngwn/twinkleplop/commit/8cc71aaea9008e5b7a5e53345e386990b85aed3a)]:
  - @twinkleplop/core@0.2.0
