import type { OverlayResult, RenderOptions, TokenizeResult } from "./types";

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

export interface Ranged {
  input: string;
  result: TokenizeResult;
  overlays: OverlayResult | undefined;
  options: RenderOptions;
  // nothing to draw, not even an empty line
  empty: boolean;
}

function is_line_start(input: string, offset: number): boolean {
  return offset === 0 || input.charCodeAt(offset - 1) === 10;
}

function shift_pairs(pairs: Uint32Array, stride: number, from: number, end: number): Uint32Array {
  const out: number[] = [];
  for (let i = 0; i < pairs.length; i += stride) {
    const start = Math.max(pairs[i], from);
    const stop = Math.min(pairs[i + 1], end);
    if (start >= stop) continue;
    out.push(start - from, stop - from);
    for (let k = 2; k < stride; k++) out.push(pairs[i + k]);
  }
  return Uint32Array.from(out);
}

// keeps line numbers, hooks and overlays reading as they do for the whole input
export function render_range(
  input: string,
  result: TokenizeResult,
  overlays: OverlayResult | undefined,
  options: RenderOptions,
): Ranged {
  const range = options.range!;
  const from = range.from ?? 0;
  // a missing to runs through the last line, a given one stops before the line it names
  const given = range.to !== undefined && range.to <= input.length;
  const to = given ? range.to! : input.length;
  for (const [name, value] of [
    ["from", from],
    ["to", to],
  ] as const) {
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError(`range.${name} must be an offset into the input, got ${String(value)}`);
    }
  }
  if (from > input.length) {
    throw new RangeError(`range.from ${from} is past the end of the input (${input.length})`);
  }
  if (!is_line_start(input, from)) {
    throw new RangeError(`range.from ${from} is not the start of a line`);
  }
  const stops_at_line = given && is_line_start(input, to);
  if (!stops_at_line && to < input.length) {
    throw new RangeError(`range.to ${to} is not the start of a line`);
  }
  const rest: RenderOptions = { ...options, range: undefined, overlays: undefined };
  if (stops_at_line && from >= to) {
    return { input: "", result, overlays: undefined, options: rest, empty: true };
  }
  const end = stops_at_line ? to - 1 : to;

  const source = result.tokens;
  let first = 0;
  let hi = source.length / 3;
  while (first < hi) {
    const mid = (first + hi) >>> 1;
    if (source[mid * 3 + 2] <= from) first = mid + 1;
    else hi = mid;
  }
  let last = first;
  while (last * 3 < source.length && source[last * 3 + 1] < end) last++;
  const tokens = source.slice(first * 3, last * 3);
  for (let t = 0; t < tokens.length; t += 3) {
    tokens[t + 1] = Math.max(tokens[t + 1], from) - from;
    tokens[t + 2] = Math.min(tokens[t + 2], end) - from;
  }

  let line_base = 0;
  for (let at = input.indexOf("\n"); at !== -1 && at < from; at = input.indexOf("\n", at + 1)) {
    line_base++;
  }
  let hidden_before = 0;
  let ranged: OverlayResult | undefined;
  if (overlays !== undefined) {
    const elided = overlays.elided_lines;
    for (let line = 0; line < line_base && line < elided.length; line++) {
      hidden_before += elided[line];
    }
    ranged = {
      ranges: shift_pairs(overlays.ranges, 4, from, end),
      classifications: overlays.classifications,
      skip_ranges: shift_pairs(overlays.skip_ranges, 2, from, end),
      elided_lines: elided.subarray(Math.min(line_base, elided.length)),
    };
    if (
      ranged.ranges.length === 0 &&
      ranged.skip_ranges.length === 0 &&
      !ranged.elided_lines.includes(1)
    ) {
      ranged = undefined;
    }
  }

  const visible_base = line_base - hidden_before;
  if (visible_base !== 0 && options.line_numbers) {
    const start = typeof options.line_numbers === "object" ? options.line_numbers.start : undefined;
    rest.line_numbers = { start: (start ?? 1) + visible_base };
  }
  const { line, token } = options;
  if (line !== undefined && line_base !== 0) {
    rest.line = (n, source_line) => line(n + visible_base, source_line + line_base);
  }
  if (token !== undefined && from !== 0) {
    rest.token = (type, start, stop) => token(type, start + from, stop + from);
  }
  return {
    input: input.slice(from, end),
    result: { tokens, token_types: result.token_types },
    overlays: ranged,
    options: rest,
    empty: false,
  };
}
