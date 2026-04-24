// bash reclassifiers.
//
// two passes:
//
// 1. extend_variables — the core grammar emits a 2-char `variable` token
//    for `$<letter|_>` expansions (the `$` sigil plus the first
//    identifier char). this pass walks the token stream and merges every
//    identifier-character prefix of the token that IMMEDIATELY follows a
//    variable into that variable token. if the following token has
//    remaining non-identifier characters after the prefix, it is SPLIT:
//    the ident prefix is absorbed into the variable and the non-ident
//    suffix stays with its original type.
//
//    why not do continuation in the grammar: a per-parent var-body
//    sub-state using `fallback(goto(parent))` would leak a copy of the
//    parent onto the state stack. cmd_sub / arith / conditional all call
//    leave() to close themselves, so leaking copies of them on the stack
//    breaks the pairing of opens and closes (`)` / `))` / `]]`).
//
// 2. promote_keywords — the grammar emits plain `identifier` tokens for
//    every word of letters/digits/underscores. this pass rewrites tokens
//    whose source text exactly matches a reserved word, builtin, or
//    boolean literal to the corresponding token type.
//
//    why not use keyword() in the grammar: twinkleplop's `keyword`
//    helper only checks the word-boundary AFTER the match, not before.
//    in an identifier like `main`, the reserved word `in` would match at
//    position 2 (the boundary after `in` is `(`, which passes). moving
//    keyword classification to a post-pass that only inspects whole
//    identifier tokens sidesteps every mid-word false-positive.

import { always, promote_function_calls, tag } from "@twinkleplop/core";
import type { LanguagePipeline, Reclassifier, TokenizeResult } from "@twinkleplop/core";
import { RESERVED_SET, BUILTIN_SET, BOOLEAN_SET } from "./grammar.js";

const is_ident_char = (ch: string): boolean => {
  if (ch === "_") return true;
  if (ch >= "0" && ch <= "9") return true;
  if (ch >= "a" && ch <= "z") return true;
  if (ch >= "A" && ch <= "Z") return true;
  return false;
};

const count_ident_prefix = (src: string, start: number, end: number): number => {
  let i = start;
  while (i < end && is_ident_char(src[i])) i++;
  return i - start;
};

export const extend_variables: Reclassifier = (
  input: string,
  result: TokenizeResult,
): TokenizeResult => {
  const src_tokens = result.tokens;
  const token_types = result.token_types.slice();
  const n = src_tokens.length / 3;
  if (n === 0) return { tokens: src_tokens, token_types };

  const variable_id = token_types.indexOf("variable");
  if (variable_id < 0) return { tokens: src_tokens, token_types };

  const out: number[] = [];
  let i = 0;
  while (i < n) {
    const type = src_tokens[i * 3];
    const start = src_tokens[i * 3 + 1];
    const end = src_tokens[i * 3 + 2];

    if (type !== variable_id || i === n - 1) {
      out.push(type, start, end);
      i++;
      continue;
    }

    const next_type = src_tokens[(i + 1) * 3];
    const next_start = src_tokens[(i + 1) * 3 + 1];
    const next_end = src_tokens[(i + 1) * 3 + 2];

    if (next_start !== end) {
      out.push(type, start, end);
      i++;
      continue;
    }

    const prefix_len = count_ident_prefix(input, next_start, next_end);
    if (prefix_len === 0) {
      out.push(type, start, end);
      i++;
      continue;
    }

    const new_var_end = end + prefix_len;
    out.push(type, start, new_var_end);

    if (prefix_len === next_end - next_start) {
      i += 2;
    } else {
      out.push(next_type, new_var_end, next_end);
      i += 2;
    }
  }

  const new_tokens = new Uint32Array(out);
  return { tokens: new_tokens, token_types };
};

export const promote_keywords: Reclassifier = (
  input: string,
  result: TokenizeResult,
): TokenizeResult => {
  const tokens = new Uint32Array(result.tokens);
  const token_types = result.token_types.slice();
  const n = tokens.length / 3;
  if (n === 0) return { tokens, token_types };

  const identifier_id = token_types.indexOf("identifier");
  if (identifier_id < 0) return { tokens, token_types };

  const ensure = (name: string): number => {
    let id = token_types.indexOf(name);
    if (id < 0) {
      id = token_types.length;
      token_types.push(name);
    }
    return id;
  };
  const keyword_id = ensure("keyword");
  const builtin_id = ensure("builtin");
  const boolean_id = ensure("boolean");

  for (let i = 0; i < n; i++) {
    if (tokens[i * 3] !== identifier_id) continue;
    const start = tokens[i * 3 + 1];
    const end = tokens[i * 3 + 2];
    const text = input.slice(start, end);
    if (RESERVED_SET.has(text)) tokens[i * 3] = keyword_id;
    else if (BUILTIN_SET.has(text)) tokens[i * 3] = builtin_id;
    else if (BOOLEAN_SET.has(text)) tokens[i * 3] = boolean_id;
  }

  return { tokens, token_types };
};

// merge_numbers — fix hex and base-N numeric literals in arithmetic.
//
// bash arithmetic accepts `0xff`, `0xDEADBEEF`, and `N#digits` (base-N)
// as numeric literals. the grammar can't tokenize these as one token
// inline: hex continuation chars are letters (`a`-`f` / `A`-`F`) which
// overlap with the identifier character class; base-N uses `#` as a
// separator which the grammar emits as punctuation. disambiguating in
// the state machine would require sub-states that leak the parent arith
// frame onto the stack (breaking the `))` close pairing), same as
// variable continuation.
//
// this pass merges the pieces:
//   - number ending in `0x` or `0X`, followed by an immediately adjacent
//     identifier, becomes one number token spanning both.
//   - number, followed by immediately adjacent `#` punctuation, followed
//     by an immediately adjacent number or identifier, becomes one
//     number token. this handles `2#1010`, `16#ff`, `64#Az` etc.
export const merge_numbers: Reclassifier = (
  input: string,
  result: TokenizeResult,
): TokenizeResult => {
  const src_tokens = result.tokens;
  const token_types = result.token_types.slice();
  const n = src_tokens.length / 3;
  if (n === 0) return { tokens: src_tokens, token_types };

  const number_id = token_types.indexOf("number");
  if (number_id < 0) return { tokens: src_tokens, token_types };

  const identifier_id = token_types.indexOf("identifier");
  const punctuation_id = token_types.indexOf("punctuation");

  const out: number[] = [];
  let i = 0;
  while (i < n) {
    const type = src_tokens[i * 3];
    const start = src_tokens[i * 3 + 1];
    const end = src_tokens[i * 3 + 2];

    if (type !== number_id) {
      out.push(type, start, end);
      i++;
      continue;
    }

    // hex extension: number starting with 0x/0X, greedily absorb every
    // adjacent number/identifier token. starts-with (not ends-with)
    // matters because digit continuation after `0x` already coalesces
    // into the number token — e.g. `0x0f` produces number "0x0" and
    // identifier "f", so the number no longer ends in "0x".
    // greediness handles mixed runs like `0xff0f` where tokenization
    // alternates between ident and digit chunks.
    if (identifier_id >= 0) {
      const num_src = input.slice(start, end);
      if (num_src.startsWith("0x") || num_src.startsWith("0X")) {
        let merged_end = end;
        let j = i + 1;
        while (j < n) {
          const nt = src_tokens[j * 3];
          const ns = src_tokens[j * 3 + 1];
          const ne = src_tokens[j * 3 + 2];
          if (ns !== merged_end) break;
          if (nt !== number_id && nt !== identifier_id) break;
          merged_end = ne;
          j++;
        }
        if (merged_end > end) {
          out.push(number_id, start, merged_end);
          i = j;
          continue;
        }
      }
    }

    // base-N extension: number + `#` punct + (number|identifier).
    if (punctuation_id >= 0 && i + 2 < n) {
      const punct_type = src_tokens[(i + 1) * 3];
      const punct_start = src_tokens[(i + 1) * 3 + 1];
      const punct_end = src_tokens[(i + 1) * 3 + 2];
      if (
        punct_type === punctuation_id &&
        punct_start === end &&
        punct_end - punct_start === 1 &&
        input[punct_start] === "#"
      ) {
        const tail_type = src_tokens[(i + 2) * 3];
        const tail_start = src_tokens[(i + 2) * 3 + 1];
        const tail_end = src_tokens[(i + 2) * 3 + 2];
        const tail_ok =
          tail_type === number_id || (identifier_id >= 0 && tail_type === identifier_id);
        if (tail_ok && tail_start === punct_end) {
          out.push(number_id, start, tail_end);
          i += 3;
          continue;
        }
      }
    }

    out.push(type, start, end);
    i++;
  }

  return { tokens: new Uint32Array(out), token_types };
};

// reclassifier ordering:
//   1. extend_variables — merges ident prefix into variable tokens.
//      must run BEFORE promote_keywords so `$for` stays a variable
//      (keyword promotion would rewrite `for` first, then extend would
//      miss it).
//   2. merge_numbers — merges split hex / base-N number literals in
//      arithmetic back into single number tokens.
//   3. promote_keywords — rewrites plain identifier tokens that match
//      reserved words / builtins / booleans to their proper types.
//
// extend_variables and merge_numbers are token-boundary corrections — they
// reshape the stream in ways that downstream consumers and grammars assume,
// so they run at every fidelity. promote_keywords is the identifier-fidelity
// pass and can be dropped via `fidelity: 'low'`.
// function-definition detection: shell syntax `name() { ... }` is the only
// position where `ident(` reliably signals a function in bash. call sites
// (`foo arg1 arg2`) are indistinguishable from external commands without
// scope tracking, so this pass only catches the `(` form. runs AFTER
// promote_keywords so reserved words (e.g. `if`) aren't promoted if they
// ever appear in a parenthesized context.
export const promote_bash_function_calls: Reclassifier = promote_function_calls(
  "identifier",
  "function",
  { plain: true },
);

export const reclassifiers: LanguagePipeline = [
  always(extend_variables, "shape"),
  always(merge_numbers, "shape"),
  tag(promote_keywords, ["keyword", "builtin", "boolean"]),
  tag(promote_bash_function_calls, ["function"]),
];
