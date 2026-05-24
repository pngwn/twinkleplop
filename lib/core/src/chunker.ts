// chunker — walk a `(...)` argument-list construct, split into chunks,
// and apply a per-chunk tagging strategy.
//
// canonical use: Go function parameters. supports the shared-type
// `x, y int` form where bare identifiers in earlier chunks get promoted
// retroactively once a later chunk has a type.

import type { ChunkerConfig, Reclassifier, TokenizeResult } from "./types";

interface ResolvedIds {
  identifier: number;
  function_id: number;
  keyword: number;
  punctuation: number;
  result_id: number;
  comment: number;
}

function resolve_ids(token_types: string[], result_type: string): ResolvedIds {
  const ident = token_types.indexOf("identifier");
  const fn = token_types.indexOf("function");
  const kw = token_types.indexOf("keyword");
  const punct = token_types.indexOf("punctuation");
  let res = token_types.indexOf(result_type);
  if (res < 0) {
    res = token_types.length;
    token_types.push(result_type);
  }
  return {
    identifier: ident,
    function_id: fn,
    keyword: kw,
    punctuation: punct,
    result_id: res,
    comment: token_types.indexOf("comment"),
  };
}

function next_non_trivia(tokens: Uint32Array, from: number, comment: number): number {
  const n = tokens.length / 3;
  for (let i = from; i < n; i++) {
    if (tokens[i * 3] !== comment) return i;
  }
  return -1;
}

function token_text(input: string, tokens: Uint32Array, i: number): string {
  return input.slice(tokens[i * 3 + 1], tokens[i * 3 + 2]);
}

// "go_default" type-after-first heuristic. inspects chunk[1] (the token
// immediately after the first identifier-ish token) to decide whether the
// chunk contains a type annotation. returns true when the chunk has a type
// after the first token, false when it's a bare name (carryover candidate).
function type_after_first_go(
  input: string,
  tokens: Uint32Array,
  chunk: number[],
  ids: ResolvedIds,
): boolean {
  if (chunk.length < 2) return false;
  const second = chunk[1];
  if (tokens[second * 3] === ids.punctuation) {
    const text = token_text(input, tokens, second);
    if (text.startsWith(".")) return false;
    if (text.startsWith("[")) {
      // `[]T` composite type: there must be content after the matching `]`
      // (the `T`). otherwise the `[N]` is just an array size annotation
      // belonging to the type of a prior chunk.
      return square_has_trailing_type(input, tokens, chunk, 1, ids);
    }
  }
  return true;
}

function square_has_trailing_type(
  input: string,
  tokens: Uint32Array,
  chunk: number[],
  start_pos: number,
  ids: ResolvedIds,
): boolean {
  let depth = 0;
  let seen_open = false;
  for (let pos = start_pos; pos < chunk.length; pos++) {
    const idx = chunk[pos];
    if (tokens[idx * 3] !== ids.punctuation) continue;
    const text = token_text(input, tokens, idx);
    for (let offset = 0; offset < text.length; offset++) {
      const ch = text[offset];
      if (ch === "[") {
        depth++;
        seen_open = true;
      } else if (ch === "]" && depth > 0) {
        depth--;
        if (seen_open && depth === 0) {
          for (let rest = offset + 1; rest < text.length; rest++) {
            const trailing = text[rest];
            if (trailing !== ")" && trailing !== ",") return true;
          }
          return pos < chunk.length - 1;
        }
      }
    }
  }
  return true;
}

function is_name_like(tokens: Uint32Array, i: number, ids: ResolvedIds): boolean {
  const t = tokens[i * 3];
  return t === ids.identifier || (ids.function_id >= 0 && t === ids.function_id);
}

interface OpenPosition {
  idx: number;
  offset: number;
}

// scan forward looking for the first top-depth `(` outside any nested
// brackets / braces from the given starting token.
function find_open_paren(
  tokens: Uint32Array,
  input: string,
  from: number,
  ids: ResolvedIds,
): OpenPosition | null {
  if (from < 0) return null;
  let bracket = 0;
  let brace = 0;
  const n = tokens.length / 3;
  for (let k = from; k < n; k++) {
    if (tokens[k * 3] === ids.comment) continue;
    if (tokens[k * 3] !== ids.punctuation) continue;
    const text = token_text(input, tokens, k);
    for (let off = 0; off < text.length; off++) {
      const ch = text[off];
      if (ch === "[") bracket++;
      else if (ch === "]") bracket = Math.max(0, bracket - 1);
      else if (ch === "{") brace++;
      else if (ch === "}") brace = Math.max(0, brace - 1);
      else if (ch === "(" && bracket === 0 && brace === 0) {
        return { idx: k, offset: off };
      }
    }
  }
  return null;
}

// walk the paren contents starting just past the opener, split into chunks
// at top-level commas, and apply the chunking strategy. returns the token
// index past the closing `)`.
function walk_and_chunk(
  tokens: Uint32Array,
  input: string,
  open: OpenPosition,
  ids: ResolvedIds,
  config: ChunkerConfig,
): number {
  const n = tokens.length / 3;
  let paren_depth = 1;
  let bracket_depth = 0;
  let brace_depth = 0;
  const chunks: number[][] = [];
  let current: number[] = [];
  let k = open.idx;
  let offset = open.offset + 1;
  const sep = config.separator_char.charCodeAt(0);

  while (k < n && paren_depth > 0) {
    if (tokens[k * 3] === ids.comment) {
      k++;
      offset = 0;
      continue;
    }
    if (tokens[k * 3] !== ids.punctuation) {
      current.push(k);
      k++;
      offset = 0;
      continue;
    }
    const text = token_text(input, tokens, k);
    let include = false;
    for (; offset < text.length; offset++) {
      const code = text.charCodeAt(offset);
      if (code === sep && paren_depth === 1 && bracket_depth === 0 && brace_depth === 0) {
        if (include) current.push(k);
        chunks.push(current);
        current = [];
        include = false;
        continue;
      }
      const ch = text[offset];
      if (ch === "(") {
        paren_depth++;
        include = true;
      } else if (ch === ")") {
        paren_depth--;
        if (paren_depth === 0) break;
        include = true;
      } else if (ch === "[") {
        bracket_depth++;
        include = true;
      } else if (ch === "]") {
        bracket_depth = Math.max(0, bracket_depth - 1);
        include = true;
      } else if (ch === "{") {
        brace_depth++;
        include = true;
      } else if (ch === "}") {
        brace_depth = Math.max(0, brace_depth - 1);
        include = true;
      } else {
        include = true;
      }
    }
    if (include) current.push(k);
    k++;
    offset = 0;
  }
  if (current.length > 0) chunks.push(current);

  apply_chunk_strategy(tokens, input, chunks, ids, config);
  return k;
}

function apply_chunk_strategy(
  tokens: Uint32Array,
  input: string,
  chunks: number[][],
  ids: ResolvedIds,
  config: ChunkerConfig,
): void {
  let pending: number[] = [];
  for (const chunk of chunks) {
    if (chunk.length === 0) continue;
    const first = chunk[0];
    if (!is_name_like(tokens, first, ids)) {
      pending = [];
      continue;
    }
    if (!config.carry_pending_names) {
      tokens[first * 3] = ids.result_id;
      continue;
    }
    const has_type = type_after_first_go(input, tokens, chunk, ids);
    if (has_type) {
      for (const idx of pending) tokens[idx * 3] = ids.result_id;
      tokens[first * 3] = ids.result_id;
      pending = [];
      continue;
    }
    if (chunk.length === 1) {
      pending.push(first);
    } else {
      pending = [];
    }
  }
}

function find_param_open_after_name(
  tokens: Uint32Array,
  input: string,
  name_idx: number,
  ids: ResolvedIds,
): OpenPosition | null {
  const after = next_non_trivia(tokens, name_idx + 1, ids.comment);
  if (after < 0 || tokens[after * 3] !== ids.punctuation) return null;
  return find_open_paren(tokens, input, after, ids);
}

export function chunker(config: ChunkerConfig): Reclassifier {
  return (input: string, result: TokenizeResult): TokenizeResult => {
    const { tokens, token_types } = result;
    const ids = resolve_ids(token_types, config.result_type);
    if (ids.identifier < 0 || ids.keyword < 0 || ids.punctuation < 0) {
      return result;
    }

    const n = tokens.length / 3;
    for (let i = 0; i < n; i++) {
      if (tokens[i * 3] === ids.comment) continue;
      if (tokens[i * 3] !== ids.keyword) continue;
      if (token_text(input, tokens, i) !== config.entry_keyword) continue;

      let j = next_non_trivia(tokens, i + 1, ids.comment);
      if (j < 0) continue;

      if (is_name_like(tokens, j, ids)) {
        // `func name(...)` — direct shape.
        const open = find_param_open_after_name(tokens, input, j, ids);
        if (open !== null) {
          j = walk_and_chunk(tokens, input, open, ids, config);
          i = j - 1;
        }
        continue;
      }

      if (!config.allow_method_receiver) continue;

      // `func (R) name(...)` — method receiver shape. the first `(` is the
      // receiver, walk past it, then look for a name + a second `(`.
      const first_open = find_open_paren(tokens, input, j, ids);
      if (first_open === null) continue;
      j = walk_and_chunk(tokens, input, first_open, ids, config);

      j = next_non_trivia(tokens, j, ids.comment);
      if (j >= 0 && is_name_like(tokens, j, ids)) {
        const param_open = find_param_open_after_name(tokens, input, j, ids);
        if (param_open !== null) {
          j = walk_and_chunk(tokens, input, param_open, ids, config);
        }
      }
      if (j > i) i = j - 1;
    }

    return result;
  };
}
