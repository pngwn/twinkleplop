import type { RenderOptions, TokenizeResult, VisibleText } from "./types";
import { build_line_starts } from "./annotation";
import { indent_guide_size, whitespace_mode } from "./generator";
import { resolve_overlays } from "./overlays";

// takes the same options as to_html, option overlays and whitespace change what is visible
export function visible_text(
  input: string,
  result: TokenizeResult,
  options: RenderOptions = {},
): string {
  return walk(input, result, options, false).text;
}

// segments let a host find where a source range landed
export function visible_text_map(
  input: string,
  result: TokenizeResult,
  options: RenderOptions = {},
): VisibleText {
  return walk(input, result, options, true);
}

const NO_SEGMENTS = new Uint32Array(0);

function walk(
  input: string,
  result: TokenizeResult,
  options: RenderOptions,
  with_segments: boolean,
): VisibleText {
  const ws_active =
    whitespace_mode(options.whitespace) !== 0 || indent_guide_size(options.indent_guides) !== 0;
  const overlays = resolve_overlays(input, result, options.overlays);
  if (overlays === undefined) {
    const segments =
      with_segments && input.length !== 0 ? Uint32Array.of(0, input.length, 0) : NO_SEGMENTS;
    return { text: input, segments };
  }

  // mirrors last_emit_byte_in_line and push_substituted in to_html_overlay
  const { skip_ranges, elided_lines } = overlays;
  const line_starts = build_line_starts(input);
  const line_count = line_starts.length;
  const skip_count = skip_ranges.length / 2;

  let text = "";
  const segments: number[] = [];

  function copy(start: number, end: number) {
    if (start >= end) return;
    if (with_segments) {
      const n = segments.length;
      // a run continuing the last one in both source and text extends it
      if (
        n !== 0 &&
        segments[n - 2] === start &&
        segments[n - 1] + (segments[n - 2] - segments[n - 3]) === text.length
      ) {
        segments[n - 2] = end;
      } else {
        segments.push(start, end, text.length);
      }
    }
    text += input.substring(start, end);
  }

  for (let line = 1; line <= line_count; line++) {
    if (line <= elided_lines.length && elided_lines[line - 1] === 1) continue;
    const line_start = line_starts[line - 1];
    const line_end = line < line_count ? line_starts[line] - 1 : input.length;
    const emit_end = emit_end_of_line(input, skip_ranges, line_start, line_end, ws_active);

    let pos = line_start;
    let k = first_skip_ending_after(skip_ranges, skip_count, pos);
    while (k < skip_count && pos < emit_end) {
      const s = skip_ranges[k * 2];
      if (s >= emit_end) break;
      const e = skip_ranges[k * 2 + 1];
      if (s > pos) copy(pos, s);
      const hidden_end = e < emit_end ? e : emit_end;
      const from = s > pos ? s : pos;
      if (hidden_end > from) {
        text += " ".repeat(hidden_end - from);
        pos = hidden_end;
      }
      k++;
    }
    copy(pos, emit_end);
    if (line < line_count) copy(line_end, line_end + 1);
  }

  return { text, segments: with_segments ? Uint32Array.from(segments) : NO_SEGMENTS };
}

// trailing whitespace and hidden bytes are dropped unless whitespace is shown
// and none of the tail was hidden
function emit_end_of_line(
  input: string,
  skip_ranges: Uint32Array,
  line_start: number,
  line_end: number,
  ws_active: boolean,
): number {
  const skip_count = skip_ranges.length / 2;
  let p = line_end - 1;
  let tail_has_skip = false;
  while (p >= line_start) {
    const k = skip_containing(skip_ranges, skip_count, p);
    if (k >= 0) {
      tail_has_skip = true;
      p = skip_ranges[k * 2] - 1;
      continue;
    }
    const c = input.charCodeAt(p);
    if (c !== 32 && c !== 9 && c !== 13) break;
    p--;
  }
  return ws_active && !tail_has_skip ? line_end : p + 1;
}

function skip_containing(skip_ranges: Uint32Array, skip_count: number, pos: number): number {
  if (skip_count === 0) return -1;
  let lo = 0;
  let hi = skip_count - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (skip_ranges[mid * 2] <= pos) lo = mid;
    else hi = mid - 1;
  }
  if (skip_ranges[lo * 2] <= pos && pos < skip_ranges[lo * 2 + 1]) return lo;
  return -1;
}

function first_skip_ending_after(
  skip_ranges: Uint32Array,
  skip_count: number,
  pos: number,
): number {
  let lo = 0;
  let hi = skip_count;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (skip_ranges[mid * 2 + 1] <= pos) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
