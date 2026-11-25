import type { OverlayResult, TokenizeResult } from "./types";

export interface Held {
  input: string;
  result: TokenizeResult;
}

function first_token_from(tokens: Uint32Array, offset: number): number {
  let lo = 0;
  let hi = tokens.length / 3;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (tokens[mid * 3 + 1] < offset) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function clip_pairs(pairs: Uint32Array, stride: number, end: number): Uint32Array {
  let keep = 0;
  while (keep < pairs.length && pairs[keep] < end) keep += stride;
  const out = pairs.slice(0, keep);
  for (let i = 0; i < out.length; i += stride) if (out[i + 1] > end) out[i + 1] = end;
  return out;
}

function clip_overlays(overlays: OverlayResult, end: number): OverlayResult {
  return {
    ranges: clip_pairs(overlays.ranges, 4, end),
    classifications: overlays.classifications,
    skip_ranges: clip_pairs(overlays.skip_ranges, 2, end),
    elided_lines: overlays.elided_lines,
  };
}

export function hold_tail(input: string, result: TokenizeResult, mode: "plain" | "hide"): Held {
  const stable_end = result.stable_end;
  if (stable_end === undefined || stable_end >= input.length) return { input, result };
  const count = first_token_from(result.tokens, stable_end);
  if (mode === "plain") {
    return { input, result: { ...result, tokens: result.tokens.subarray(0, count * 3) } };
  }
  // stable_end sits after a line break which would leave an empty last line
  const end = stable_end === 0 ? 0 : stable_end - 1;
  const tokens = result.tokens.slice(0, count * 3);
  let used = tokens.length;
  while (used > 0 && tokens[used - 2] >= end) used -= 3;
  if (used > 0 && tokens[used - 1] > end) tokens[used - 1] = end;
  const held: TokenizeResult = { ...result, tokens: tokens.subarray(0, used) };
  if (result.overlays !== undefined) held.overlays = clip_overlays(result.overlays, end);
  return { input: input.slice(0, end), result: held };
}
