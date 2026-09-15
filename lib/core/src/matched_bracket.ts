// matched_bracket — retag paired opener / matching closer tokens.
//
// data-driven primitive: walks the token stream looking for an opener that
// matches (type + text, optional sigil gate), then scans forward for the
// matching closer (type + text), then claims new types for both endpoints.
// ignores trivia in the scan. used by Svelte to retag block braces
// `{#if ...}{/if}` as `punctuation` while leaving ordinary interpolation
// braces alone.
//
// runs as a claim producer: endpoint retags are emitted as claims at the
// target type's table precedence instead of mutating the stream, so the
// pass batches with other claim producers and never touches the caller's
// tokens.

import { debug_enabled, warn_once } from "./debug";
import { as_claim_producer, precedence_for } from "./reclassifier";
import type { ClaimFn, ClaimingReclassifier, MatchedBracketConfig } from "./types";

export function matched_bracket(config: MatchedBracketConfig): ClaimingReclassifier {
  const post_open_set: Set<string> | null =
    config.post_open_required !== undefined ? new Set(config.post_open_required.text_in) : null;

  const claim_fn: ClaimFn = (input, tokens, token_types, sink) => {
    const n = tokens.length / 3;
    if (n === 0) return;

    const open_id = token_types.indexOf(config.open_type);
    const close_id = token_types.indexOf(config.close_type);
    if (open_id < 0 || close_id < 0) {
      if (debug_enabled()) {
        const missing = open_id < 0 ? config.open_type : config.close_type;
        warn_once(
          "matched_bracket",
          `endpoint-type:${missing}`,
          `endpoint type "${missing}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }

    const comment_id = token_types.indexOf("comment");
    const post_open_type_id =
      config.post_open_required !== undefined
        ? token_types.indexOf(config.post_open_required.type)
        : -1;
    if (config.post_open_required !== undefined && post_open_type_id < 0) {
      // configured but not present in this stream's vocabulary -- can't fire.
      if (debug_enabled()) {
        warn_once(
          "matched_bracket",
          `post-open-type:${config.post_open_required.type}`,
          `post_open_required type "${config.post_open_required.type}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }

    // retag targets must exist by name (added by an upstream pass if needed
    // or pre-listed in the grammar). silently skip if absent. identity
    // retags (target same as source) emit no claims.
    const retag_open_id =
      config.retag_open_to !== undefined ? token_types.indexOf(config.retag_open_to) : open_id;
    const retag_close_id =
      config.retag_close_to !== undefined ? token_types.indexOf(config.retag_close_to) : close_id;
    if (retag_open_id < 0 || retag_close_id < 0) {
      if (debug_enabled()) {
        const missing = retag_open_id < 0 ? config.retag_open_to : config.retag_close_to;
        warn_once(
          "matched_bracket",
          `retag-type:${missing}`,
          `retag target "${missing}" is not in the token vocabulary; pass disabled`,
        );
      }
      return;
    }
    const open_prec = precedence_for(config.retag_open_to ?? config.open_type);
    const close_prec = precedence_for(config.retag_close_to ?? config.close_type);

    const text = (i: number): string => input.slice(tokens[i * 3 + 1], tokens[i * 3 + 2]);

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
        if (retag_open_id !== open_id) sink.emit(i, retag_open_id, open_prec);
        if (retag_close_id !== close_id) sink.emit(j, retag_close_id, close_prec);
        i = j;
        break;
      }
    }
  };

  return as_claim_producer(claim_fn);
}
