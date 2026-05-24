// matched_bracket — retag paired opener / matching closer tokens.
//
// data-driven primitive: walks the token stream looking for an opener that
// matches (type + text, optional sigil gate), then scans forward for the
// matching closer (type + text), then rewrites both endpoints' types
// in-place. ignores trivia in the scan. used by Svelte to retag block
// braces `{#if ...}{/if}` as `punctuation` while leaving ordinary
// interpolation braces alone.

import type {
  MatchedBracketConfig,
  Reclassifier,
  TokenizeResult,
} from "./types";

export function matched_bracket(config: MatchedBracketConfig): Reclassifier {
  const post_open_set: Set<string> | null =
    config.post_open_required !== undefined ? new Set(config.post_open_required.text_in) : null;

  return (input: string, result: TokenizeResult): TokenizeResult => {
    const { tokens, token_types } = result;
    const n = tokens.length / 3;
    if (n === 0) return result;

    const open_id = token_types.indexOf(config.open_type);
    const close_id = token_types.indexOf(config.close_type);
    if (open_id < 0 || close_id < 0) return result;

    const comment_id = token_types.indexOf("comment");
    const post_open_type_id =
      config.post_open_required !== undefined
        ? token_types.indexOf(config.post_open_required.type)
        : -1;
    if (config.post_open_required !== undefined && post_open_type_id < 0) {
      // configured but not present in this stream's vocabulary -- can't fire.
      return result;
    }

    const retag_open_id =
      config.retag_open_to !== undefined && config.retag_open_to !== config.open_type
        ? (() => {
            const id = token_types.indexOf(config.retag_open_to!);
            return id < 0 ? -1 : id;
          })()
        : open_id;
    const retag_close_id =
      config.retag_close_to !== undefined && config.retag_close_to !== config.close_type
        ? (() => {
            const id = token_types.indexOf(config.retag_close_to!);
            return id < 0 ? -1 : id;
          })()
        : close_id;

    // retag targets must exist by name (added by an upstream pass if needed
    // or pre-listed in the grammar). silently skip if absent.
    if (retag_open_id < 0 || retag_close_id < 0) return result;

    const text = (i: number): string =>
      input.slice(tokens[i * 3 + 1], tokens[i * 3 + 2]);

    const next_non_trivia = (from: number): number => {
      for (let i = from; i < n; i++) {
        if (tokens[i * 3] !== comment_id) return i;
      }
      return -1;
    };

    for (let i = 0; i < n; i++) {
      if (tokens[i * 3] !== open_id) continue;
      if (text(i) !== config.open_text) continue;
      if (post_open_set !== null) {
        const sigil_idx = next_non_trivia(i + 1);
        if (sigil_idx === -1) continue;
        if (tokens[sigil_idx * 3] !== post_open_type_id) continue;
        if (!post_open_set.has(text(sigil_idx))) continue;
      }
      for (let j = i + 1; j < n; j++) {
        if (tokens[j * 3] !== close_id) continue;
        if (text(j) !== config.close_text) continue;
        tokens[i * 3] = retag_open_id;
        tokens[j * 3] = retag_close_id;
        i = j;
        break;
      }
    }

    return result;
  };
}
