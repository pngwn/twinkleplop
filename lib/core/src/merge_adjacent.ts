// merge_adjacent — splice two adjacent tokens into one.
//
// data-driven primitive replacing hand-rolled output-length-shortening
// reclassifiers. on a match, anchor + immediately-following token become a
// single token spanning [anchor.start, next.end]. an optional refuse-if
// guard inspects a fixed-offset token to veto the merge (used by Rust's
// lifetime fusion to keep `'a Fn(...)` from collapsing).

import { debug_enabled, warn_once } from "./debug";
import type { MergeAdjacentConfig, Reclassifier, TokenizeResult } from "./types";

export function merge_adjacent(config: MergeAdjacentConfig): Reclassifier {
  // precompute the refuse-if first-char set as a small array of code points
  // -- avoids per-iteration string indexing.
  const refuse_chars: number[] = [];
  if (config.refuse_if !== undefined) {
    for (let i = 0; i < config.refuse_if.first_char_in.length; i++) {
      refuse_chars.push(config.refuse_if.first_char_in.charCodeAt(i));
    }
  }

  return (input: string, result: TokenizeResult): TokenizeResult => {
    const { tokens: old_tokens, token_types } = result;
    const new_types = token_types.slice();
    const anchor_id = new_types.indexOf(config.anchor_type);
    if (anchor_id < 0) {
      if (debug_enabled()) {
        warn_once(
          "merge_adjacent",
          `anchor-type:${config.anchor_type}`,
          `anchor type "${config.anchor_type}" is not in the token vocabulary; pass disabled`,
        );
      }
      return { tokens: new Uint32Array(old_tokens), token_types: new_types };
    }

    const consume_ids: number[] = [];
    for (const t of config.consume_next_types) {
      const id = new_types.indexOf(t);
      if (id >= 0) consume_ids.push(id);
    }
    if (consume_ids.length === 0) {
      return { tokens: new Uint32Array(old_tokens), token_types: new_types };
    }

    let refuse_type_id = -1;
    let refuse_offset = 0;
    if (config.refuse_if !== undefined) {
      refuse_type_id = new_types.indexOf(config.refuse_if.type_must_be);
      refuse_offset = config.refuse_if.offset;
    }

    const result_type = config.result_type ?? config.anchor_type;
    let result_id = new_types.indexOf(result_type);
    if (result_id < 0) {
      result_id = new_types.length;
      new_types.push(result_type);
    }

    const count = old_tokens.length / 3;
    // merging only ever shortens the stream, so the input length is an upper
    // bound and the output can be written in place without a growing array
    const out = new Uint32Array(old_tokens.length);
    let w = 0;
    for (let i = 0; i < count; i++) {
      const base = i * 3;
      const tid = old_tokens[base];
      const start = old_tokens[base + 1];
      const end = old_tokens[base + 2];

      // matches anchor + a consumable next token?
      if (tid === anchor_id && i + 1 < count) {
        const next_id = old_tokens[(i + 1) * 3];
        let next_in_set = false;
        for (let k = 0; k < consume_ids.length; k++) {
          if (consume_ids[k] === next_id) {
            next_in_set = true;
            break;
          }
        }
        if (next_in_set) {
          let refused = false;
          if (refuse_type_id >= 0 && refuse_chars.length > 0) {
            const off = i + refuse_offset;
            if (off < count && old_tokens[off * 3] === refuse_type_id) {
              const first = input.charCodeAt(old_tokens[off * 3 + 1]);
              for (let k = 0; k < refuse_chars.length; k++) {
                if (first === refuse_chars[k]) {
                  refused = true;
                  break;
                }
              }
            }
          }
          if (!refused) {
            const merged_end = old_tokens[(i + 1) * 3 + 2];
            out[w++] = result_id;
            out[w++] = start;
            out[w++] = merged_end;
            i++;
            continue;
          }
        }
      }

      out[w++] = tid;
      out[w++] = start;
      out[w++] = end;
    }

    // a view rather than a copy: each merge leaves only three unused slots
    return { tokens: out.subarray(0, w), token_types: new_types };
  };
}
