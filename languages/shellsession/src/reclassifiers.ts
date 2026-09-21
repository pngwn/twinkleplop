// commands are tokenized as bash with embed_interleaved, a command continued on
// secondary prompt lines is one bash program with those prompts as holes

import { always, embed_interleaved } from "@twinkleplop/core";
import type { GroupDescriptor, LanguageFn, LanguagePipeline, Region } from "@twinkleplop/core";
import { tokenize as bash_tokenize } from "@twinkleplop/bash";
import { ZSH_PS2_WORDS } from "./grammar.js";

let bash_fn: LanguageFn | undefined;
const bash_default: LanguageFn = (src) => (bash_fn ??= bash_tokenize())(src);

const ZSH_WORDS = new Set(ZSH_PS2_WORDS);

interface TypeIds {
  raw_shell: number;
  prompt: number;
  prompt_prefix: number;
}

// memoized because the scanner runs at every host token
const type_id_cache = new WeakMap<string[], TypeIds>();

function get_type_ids(token_types: string[]): TypeIds {
  let ids = type_id_cache.get(token_types);
  if (ids === undefined) {
    ids = {
      raw_shell: token_types.indexOf("raw_shell"),
      prompt: token_types.indexOf("prompt"),
      prompt_prefix: token_types.indexOf("prompt_prefix"),
    };
    type_id_cache.set(token_types, ids);
  }
  return ids;
}

function line_end(input: string, pos: number): number {
  const nl = input.indexOf("\n", pos);
  return nl === -1 ? input.length : nl;
}

function is_zsh_ps2_prefix(text: string): boolean {
  const words = text.split(" ");
  for (const word of words) if (!ZSH_WORDS.has(word)) return false;
  return true;
}

/** groups the command starting at token i with every continuation line after it */
export function scan_commands(
  tokens: Uint32Array,
  input: string,
  i: number,
  token_types: string[],
): GroupDescriptor | null {
  const ids = get_type_ids(token_types);
  if (ids.raw_shell < 0 || tokens[i * 3] !== ids.raw_shell) return null;
  const count = tokens.length / 3;
  const regions: Region[] = [];

  let k = i;
  let eol = line_end(input, tokens[k * 3 + 1]);
  regions.push({
    kind: "content",
    source_start: tokens[k * 3 + 1],
    source_end: Math.min(eol + 1, input.length),
  });
  // a carriage return splits one line into several raw_shell tokens
  while (k < count && tokens[k * 3] === ids.raw_shell && tokens[k * 3 + 1] < eol) k++;

  while (eol < input.length && k < count) {
    const next_line = eol + 1;
    if (tokens[k * 3 + 1] !== next_line) break;
    // each zsh word is a sealed match, so a multi word prefix spans several tokens
    let prompt_idx = k;
    while (prompt_idx < count && tokens[prompt_idx * 3] === ids.prompt_prefix) prompt_idx++;
    if (prompt_idx > k) {
      const prefix = input.slice(tokens[k * 3 + 1], tokens[(prompt_idx - 1) * 3 + 2]);
      if (!is_zsh_ps2_prefix(prefix)) break;
    }
    if (prompt_idx >= count) break;
    if (
      tokens[prompt_idx * 3] !== ids.prompt ||
      input.slice(tokens[prompt_idx * 3 + 1], tokens[prompt_idx * 3 + 2]) !== ">"
    ) {
      break;
    }
    const hole_end_tok = prompt_idx + 1;
    const next_eol = line_end(input, next_line);
    const has_command =
      hole_end_tok < count &&
      tokens[hole_end_tok * 3] === ids.raw_shell &&
      tokens[hole_end_tok * 3 + 1] < next_eol;
    const content_start = has_command ? tokens[hole_end_tok * 3 + 1] : next_eol;
    regions.push({
      kind: "hole",
      source_start: next_line,
      source_end: content_start,
      token_start: k,
      token_end: hole_end_tok,
    });
    // an empty continuation line still gives bash its line break
    if (content_start < input.length) {
      regions.push({
        kind: "content",
        source_start: content_start,
        source_end: Math.min(next_eol + 1, input.length),
      });
    }
    k = hole_end_tok;
    while (k < count && tokens[k * 3] === ids.raw_shell && tokens[k * 3 + 1] < next_eol) k++;
    eol = next_eol;
  }

  return { token_start: i, token_end: k, regions };
}

export const reclassifiers: LanguagePipeline = [
  always(embed_interleaved({ scan: scan_commands, language: bash_default }), "embed"),
];
