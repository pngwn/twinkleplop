// Finding 1 of the release verification: `@twinkleplop/core/dist/types.d.ts`
// contained `export const "function" = "function";` and `export const "null"`,
// neither of which parses. A parse error in a .d.ts cannot be suppressed with
// `skipLibCheck`, so merely importing core failed to compile.
import { to_html, tokenize, compile } from "@twinkleplop/core";
import * as TOKENS from "@twinkleplop/core/tokens";

export const used = [to_html, tokenize, compile];

// the two reserved-word token exports are the ones that were unparseable.
export const fn: "function" = TOKENS.function;
export const nil: "null" = TOKENS["null"];
export const kw: "keyword" = TOKENS.keyword;
