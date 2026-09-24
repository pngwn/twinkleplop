// compound_compose — stack-driven multi-class type composition.
//
// data-driven primitive that maintains an open-style stack via open/close
// marker token types and emits a composed type per token (e.g. for
// markdown's bold/italic/code nesting). composed types are interned into
// token_types dynamically so the renderer can split on the separator.

import { debug_enabled, warn_once } from "./debug";
import type { CompoundComposeConfig, Reclassifier, TokenizeResult } from "./types";

interface OpenStyleMap {
  // resolved open type_id -> style name (a string label, NOT an id)
  by_open_id: Map<number, string>;
  // resolved close type_id -> style name
  by_close_id: Map<number, string>;
}

function resolve_style_map(token_types: string[], config: CompoundComposeConfig): OpenStyleMap {
  const by_open_id = new Map<number, string>();
  const by_close_id = new Map<number, string>();
  for (const s of config.styles) {
    const oid = token_types.indexOf(s.open_type);
    const cid = token_types.indexOf(s.close_type);
    if (oid >= 0) by_open_id.set(oid, s.style_name);
    if (cid >= 0) by_close_id.set(cid, s.style_name);
  }
  return { by_open_id, by_close_id };
}

export function compound_compose(config: CompoundComposeConfig): Reclassifier {
  return (input: string, result: TokenizeResult): TokenizeResult => {
    const { tokens, token_types } = result;
    const new_token_types = token_types.slice();
    const styles = resolve_style_map(new_token_types, config);

    // empty fast path: no styles resolved (this stream's vocabulary has
    // none of the configured open/close types) -- nothing to do.
    if (styles.by_open_id.size === 0 && styles.by_close_id.size === 0) {
      if (debug_enabled()) {
        warn_once(
          "compound_compose",
          "no-styles",
          "none of the configured open/close marker types are in the token vocabulary; pass disabled",
        );
      }
      return result;
    }

    const type_index = new Map<string, number>();
    for (let i = 0; i < new_token_types.length; i++) {
      type_index.set(new_token_types[i], i);
    }
    const intern = (name: string): number => {
      let id = type_index.get(name);
      if (id === undefined) {
        id = new_token_types.length;
        new_token_types.push(name);
        type_index.set(name, id);
      }
      return id;
    };

    const compose_with = (stack: string[], base: string): string => {
      if (stack.length === 0) return base;
      if (config.dedup_against_base && stack.indexOf(base) !== -1) {
        return stack.join(config.join_separator);
      }
      return stack.join(config.join_separator) + config.join_separator + base;
    };

    const new_tokens = new Uint32Array(tokens.length);
    const stack: string[] = [];
    let last_end = 0;

    // marker lookups by type id. every input token id is below this length,
    // so a dense array answers what the two maps answered, per token.
    const base_count = new_token_types.length;
    const open_by_id: (string | undefined)[] = new Array(base_count).fill(undefined);
    const close_by_id: (string | undefined)[] = new Array(base_count).fill(undefined);
    for (const [id, name] of styles.by_open_id) open_by_id[id] = name;
    for (const [id, name] of styles.by_close_id) close_by_id[id] = name;
    // interning a base name gives back its own id unless the vocabulary
    // repeats a name, where the last copy wins. only then does a token
    // outside every style need the lookup.
    const unique_names = type_index.size === base_count;
    // first newline at or after the position it was searched from. it stays
    // the answer for last_end until last_end passes it, since last_end only
    // grows. it starts behind every position so the first check searches.
    let next_nl = -2;

    for (let i = 0; i < tokens.length; i += 3) {
      const old_type_id = tokens[i];
      const start = tokens[i + 1];
      const end = tokens[i + 2];

      if (config.auto_pop_on_newline && stack.length > 0) {
        if (next_nl !== -1 && next_nl < last_end) next_nl = input.indexOf("\n", last_end);
        if (next_nl !== -1 && next_nl < start) {
          stack.length = 0;
        }
      }

      const open_style = open_by_id[old_type_id];
      const close_style = open_style === undefined ? close_by_id[old_type_id] : undefined;

      if (open_style !== undefined) {
        let new_type: string;
        const existing_idx = stack.lastIndexOf(open_style);
        if (existing_idx !== -1) {
          // grammar leaked a frame -- treat this "open" as a close down
          // to the existing entry.
          new_type = stack.join(config.join_separator);
          stack.length = existing_idx;
        } else {
          stack.push(open_style);
          new_type = stack.join(config.join_separator);
        }
        new_tokens[i] = intern(new_type);
      } else if (close_style !== undefined) {
        const new_type = stack.join(config.join_separator);
        const idx = stack.lastIndexOf(close_style);
        if (idx !== -1) stack.length = idx;
        new_tokens[i] = intern(new_type);
      } else if (stack.length === 0 && unique_names) {
        new_tokens[i] = old_type_id;
      } else {
        new_tokens[i] = intern(compose_with(stack, new_token_types[old_type_id]));
      }

      new_tokens[i + 1] = start;
      new_tokens[i + 2] = end;
      last_end = end;
    }

    return {
      tokens: new_tokens,
      token_types: new_token_types,
      overlays: result.overlays,
      frames: result.frames,
    };
  };
}
