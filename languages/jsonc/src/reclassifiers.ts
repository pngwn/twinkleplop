import { tag } from "@twinkleplop/core";
import type { LanguagePipeline, Reclassifier, TokenizeResult } from "@twinkleplop/core";

// looking ahead to a colon instead of tracking nesting keeps keys across comments and in bare fragments
export const promote_keys: Reclassifier = (
  input: string,
  result: TokenizeResult,
): TokenizeResult => {
  const tokens = new Uint32Array(result.tokens);
  const token_types = result.token_types.slice();
  const n = tokens.length / 3;

  const string_id = token_types.indexOf("string");
  const punct_id = token_types.indexOf("punctuation");
  if (string_id < 0 || punct_id < 0) return { tokens, token_types, frames: result.frames };
  const escape_id = token_types.indexOf("string_escape");
  const comment_id = token_types.indexOf("comment");

  let property_id = token_types.indexOf("property");
  if (property_id < 0) {
    property_id = token_types.length;
    token_types.push("property");
  }

  for (let j = 0; j < n; j++) {
    // adjacent punctuation coalesces so the colon can lead a longer token
    if (tokens[j * 3] !== punct_id || input[tokens[j * 3 + 1]] !== ":") continue;

    let last = j - 1;
    while (last >= 0 && tokens[last * 3] === comment_id) last--;
    if (last < 0 || tokens[last * 3] !== string_id) continue;

    // segments of one literal touch, and a string only touches escapes since adjacent strings coalesce
    let first = last;
    while (first > 0) {
      const prev = first - 1;
      if (tokens[prev * 3 + 2] !== tokens[first * 3 + 1]) break;
      const prev_type = tokens[prev * 3];
      if (prev_type === escape_id) first = prev;
      else if (prev_type === string_id && tokens[first * 3] === escape_id) first = prev;
      else break;
    }

    for (let i = first; i <= last; i++) {
      if (tokens[i * 3] === string_id) tokens[i * 3] = property_id;
    }
  }
  return { tokens, token_types, frames: result.frames };
};

export const reclassifiers: LanguagePipeline = [tag(promote_keys, ["property"])];
