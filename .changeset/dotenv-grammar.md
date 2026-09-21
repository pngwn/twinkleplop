---
"@twinkleplop/dotenv": patch
---

Add `@twinkleplop/dotenv` for `.env` files, following the loaders people use: dotenv for Node (and through it Vite and Next.js), Ruby and Python, godotenv and Docker Compose. Quoted values can span lines, and `$NAME`, `${NAME:-default}` and `$(command)` are highlighted in unquoted and double-quoted values but not in single-quoted ones:

```sh
export DATABASE_URL="postgres://${PGUSER:-app}:$PGPASS@db:5432/app" # primary
PORT=5432
```

Keys are `property`. A value that is entirely a number or a boolean is `number` or `boolean`, so `PORT=5432` is a number and `IP=127.0.0.1` stays a string. As in Node and Ruby, a `#` anywhere in an unquoted value starts a comment.
