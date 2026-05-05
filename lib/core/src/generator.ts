import { OverlayResult, RenderOptions, TokenizeResult } from "./types";

const ESCAPE_TABLE = new Array(128);
for (let i = 0; i < 128; i++) {
  ESCAPE_TABLE[i] = String.fromCharCode(i);
}
ESCAPE_TABLE[38] = "&amp;";
ESCAPE_TABLE[60] = "&lt;";
ESCAPE_TABLE[62] = "&gt;";
ESCAPE_TABLE[34] = "&quot;";
ESCAPE_TABLE[39] = "&#39;";

export function to_html(
  input: string,
  token_result: TokenizeResult,
  options: RenderOptions = {},
) {
  // notation overlays opt-in: when present, dispatch to the overlay-aware
  // renderer below. when absent, the function body matches the original
  // exactly so existing benchmarks remain unaffected.
  if (token_result.overlays !== undefined) {
    return to_html_overlay(input, token_result, token_result.overlays, options);
  }
  const { tokens, token_types } = token_result;
  const { class_name = "twinkleplop", line_numbers = false } = options;

  const out: string[] = [];
  out.push(`<pre class="${class_name}"><code>`);

  let line_no = 1;
  let open_class: string | null = null;

  out.push(open_line(line_no, line_numbers));

  function close_span() {
    if (open_class !== null) {
      out.push("</span>");
      open_class = null;
    }
  }

  function ensure_span(cls: string | null) {
    if (cls === open_class) return;
    close_span();
    if (cls !== null) {
      out.push(`<span class="tok ${cls}">`);
      open_class = cls;
    }
  }

  function emit_range(start: number, end: number, cls: string | null) {
    if (start >= end) return;
    let chunk_start = start;
    for (let i = start; i < end; i++) {
      if (input.charCodeAt(i) !== 10) continue; // '\n'
      if (i > chunk_start) {
        ensure_span(cls);
        out.push(escape_substring_optimized(input, chunk_start, i));
      }
      close_span();
      out.push("</span>\n");
      line_no++;
      out.push(open_line(line_no, line_numbers));
      chunk_start = i + 1;
    }
    if (end > chunk_start) {
      ensure_span(cls);
      out.push(escape_substring_optimized(input, chunk_start, end));
    }
  }

  let last_end = 0;
  for (let i = 0; i < tokens.length; i += 3) {
    const cls = token_types[tokens[i]];
    const start = tokens[i + 1];
    const end = tokens[i + 2];

    if (start > last_end) emit_range(last_end, start, null);
    emit_range(start, end, cls);
    last_end = end;
  }

  if (last_end < input.length) emit_range(last_end, input.length, null);

  close_span();
  out.push("</span>");
  out.push("</code></pre>");

  return out.join("");
}

function open_line(n: number, line_numbers: boolean) {
  if (line_numbers) return `<span class="l"><span class="ln">${n}</span>`;
  return `<span class="l">`;
}

function escape_substring_optimized(input: string, start: number, end: number) {
  let needs_escape = false;
  for (let i = start; i < end; i++) {
    const code = input.charCodeAt(i);
    if (code === 38 || code === 60 || code === 62 || code === 34 || code === 39) {
      needs_escape = true;
      break;
    }
  }

  if (!needs_escape) return input.substring(start, end);

  let result = "";
  let chunk_start = start;
  for (let i = start; i < end; i++) {
    const code = input.charCodeAt(i);
    if (code === 38 || code === 60 || code === 62 || code === 34 || code === 39) {
      if (i > chunk_start) result += input.substring(chunk_start, i);
      result += ESCAPE_TABLE[code];
      chunk_start = i + 1;
    }
  }
  if (end > chunk_start) result += input.substring(chunk_start, end);
  return result;
}

// ---------------------------------------------------------------------------
// notation overlay rendering
// ---------------------------------------------------------------------------
//
// mirrors the structure of to_html above, with three additions:
//   - line-mode overlay classes append to <span class="l"> opens.
//   - token-mode overlays append to <span class="tok ..."> classes when
//     their byte range intersects the token chunk.
//   - skip ranges replace marker bytes with single spaces; lines that became
//     all-whitespace post-substitution are elided entirely.
//
// the no-overlay caller path never reaches here (see top-of-function dispatch
// in to_html); benchmarks of unconfigured language calls are unaffected.

function to_html_overlay(
  input: string,
  token_result: TokenizeResult,
  overlays: OverlayResult,
  options: RenderOptions,
): string {
  const { tokens, token_types } = token_result;
  const { class_name = "twinkleplop", line_numbers = false } = options;
  const { ranges, classifications, skip_ranges, elided_lines } = overlays;

  // split overlays by mode once, up front. line-mode overlays index by line
  // number; token-mode overlays stay in a sorted [start, end, class_id]
  // sequence walked in lockstep with the token stream.
  const line_class_map = new Map<number, string>();
  const token_overlays: number[] = []; // flat triples [start, end, class_id]
  if (ranges.length > 0) {
    const len_lines = elided_lines.length;
    for (let r = 0; r < ranges.length; r += 4) {
      const ostart = ranges[r];
      const oend = ranges[r + 1];
      const class_id = ranges[r + 2];
      const flags = ranges[r + 3];
      const class_name_str = classifications[class_id];
      if ((flags & 1) === 1) {
        // line-mode: bin onto each line in [start_line, end_line].
        const start_line = line_of_offset(input, ostart);
        const end_line = oend > 0 ? line_of_offset(input, oend - 1) : start_line;
        for (let l = start_line; l <= end_line && l <= len_lines; l++) {
          const prev = line_class_map.get(l);
          line_class_map.set(l, prev === undefined ? class_name_str : prev + " " + class_name_str);
        }
      } else {
        token_overlays.push(ostart, oend, class_id);
      }
    }
  }

  const out: string[] = [];
  out.push(`<pre class="${class_name}"><code>`);

  let line_no = 1;
  // visible_line_no advances only when we actually open a line span — so
  // elided source lines don't take up a number. matches user expectation:
  // "render lines as if stripped comment lines never existed".
  let visible_line_no = 1;
  let line_open = false;
  let open_class: string | null = null;

  function maybe_open_line() {
    if (line_open) return;
    if (line_no <= elided_lines.length && elided_lines[line_no - 1] === 1) return;
    out.push(open_line_with_extra(visible_line_no, line_numbers, line_class_map.get(line_no)));
    visible_line_no++;
    line_open = true;
  }
  maybe_open_line();

  function close_span() {
    if (open_class !== null) {
      out.push("</span>");
      open_class = null;
    }
  }

  function ensure_span(cls: string | null) {
    if (cls === open_class) return;
    close_span();
    if (cls !== null) {
      out.push(`<span class="tok ${cls}">`);
      open_class = cls;
    }
  }

  function close_line_at_newline() {
    close_span();
    if (line_open) {
      out.push("</span>\n");
      line_open = false;
    }
    line_no++;
  }

  // skip-range cursor: advances monotonically with byte position.
  let skip_idx = 0;
  const skip_count = skip_ranges.length / 2;

  function find_active_token_overlays(chunk_start: number, chunk_end: number): string | null {
    if (token_overlays.length === 0) return null;
    let acc: string | null = null;
    for (let r = 0; r < token_overlays.length; r += 3) {
      const s = token_overlays[r];
      const e = token_overlays[r + 1];
      if (e <= chunk_start) continue;
      if (s >= chunk_end) break;
      const name = classifications[token_overlays[r + 2]];
      acc = acc === null ? name : acc + " " + name;
    }
    return acc;
  }

  function emit_chunk(chunk_start: number, chunk_end: number, base_cls: string | null) {
    if (chunk_start >= chunk_end) return;
    const overlay_cls = find_active_token_overlays(chunk_start, chunk_end);
    const cls =
      base_cls === null
        ? overlay_cls
        : overlay_cls === null
          ? base_cls
          : base_cls + " " + overlay_cls;
    ensure_span(cls);
    push_substituted(out, input, chunk_start, chunk_end, skip_ranges, skip_idx_after);
  }

  // helper: returns the first skip-range index whose end > chunk_start.
  function skip_idx_after(_chunk_start: number, _chunk_end: number): number {
    // advance the cursor past any skip ranges that end before chunk_start.
    while (skip_idx < skip_count && skip_ranges[skip_idx * 2 + 1] <= _chunk_start) {
      skip_idx++;
    }
    return skip_idx;
  }

  function emit_range_overlay(start: number, end: number, base_cls: string | null) {
    if (start >= end) return;
    let chunk_start = start;
    for (let i = start; i < end; i++) {
      if (input.charCodeAt(i) !== 10) continue;
      const elided = line_no <= elided_lines.length && elided_lines[line_no - 1] === 1;
      if (!elided && i > chunk_start) {
        emit_chunk(chunk_start, i, base_cls);
      }
      close_line_at_newline();
      maybe_open_line();
      chunk_start = i + 1;
    }
    const elided_tail = line_no <= elided_lines.length && elided_lines[line_no - 1] === 1;
    if (!elided_tail && end > chunk_start) {
      emit_chunk(chunk_start, end, base_cls);
    }
  }

  let last_end = 0;
  for (let i = 0; i < tokens.length; i += 3) {
    const cls = token_types[tokens[i]];
    const start = tokens[i + 1];
    const end = tokens[i + 2];
    if (start > last_end) emit_range_overlay(last_end, start, null);
    emit_range_overlay(start, end, cls);
    last_end = end;
  }
  if (last_end < input.length) emit_range_overlay(last_end, input.length, null);

  close_span();
  if (line_open) out.push("</span>");
  out.push("</code></pre>");
  return out.join("");
}

// emit input[start..end), substituting any byte covered by a skip range
// with a single space (preserving column alignment). skip ranges are sorted
// and the cursor (skip_lookup) advances monotonically, so cost is amortised
// O(chunk + new_skip_ranges).
function push_substituted(
  out: string[],
  input: string,
  start: number,
  end: number,
  skip_ranges: Uint32Array,
  skip_lookup: (chunk_start: number, chunk_end: number) => number,
): void {
  const skip_count = skip_ranges.length / 2;
  let idx = skip_lookup(start, end);
  // fast path: no overlapping skip ranges in this chunk.
  if (idx >= skip_count || skip_ranges[idx * 2] >= end) {
    out.push(escape_substring_optimized(input, start, end));
    return;
  }
  let chunk_start = start;
  while (idx < skip_count) {
    const sstart = skip_ranges[idx * 2];
    const send = skip_ranges[idx * 2 + 1];
    if (sstart >= end) break;
    if (sstart > chunk_start) {
      out.push(escape_substring_optimized(input, chunk_start, sstart));
    }
    const sub_end = Math.min(send, end);
    // emit a run of single spaces of equal byte length.
    const space_count = sub_end - Math.max(chunk_start, sstart);
    if (space_count > 0) out.push(SPACE_RUN(space_count));
    chunk_start = sub_end;
    if (send > end) break;
    idx++;
  }
  if (chunk_start < end) {
    out.push(escape_substring_optimized(input, chunk_start, end));
  }
}

const SPACES_CACHE: string[] = [];
function SPACE_RUN(n: number): string {
  if (n < 64) {
    const cached = SPACES_CACHE[n];
    if (cached !== undefined) return cached;
    const s = " ".repeat(n);
    SPACES_CACHE[n] = s;
    return s;
  }
  return " ".repeat(n);
}

// linear-scan helper used during the line-mode overlay split (called once
// per line-mode overlay endpoint, so the cost is bounded by overlay count
// not input size).
function line_of_offset(input: string, byte_offset: number): number {
  let line = 1;
  const limit = Math.min(byte_offset, input.length);
  for (let i = 0; i < limit; i++) {
    if (input.charCodeAt(i) === 10) line++;
  }
  return line;
}

function open_line_with_extra(n: number, line_numbers: boolean, extra: string | undefined): string {
  const cls = extra ? `l ${extra}` : "l";
  if (line_numbers) return `<span class="${cls}"><span class="ln">${n}</span>`;
  return `<span class="${cls}">`;
}

export function escape_html(text: string) {
  const len = text.length;

  let needs_escape = false;
  for (let i = 0; i < len; i++) {
    const code = text.charCodeAt(i);
    if (code === 38 || code === 60 || code === 62 || code === 34 || code === 39) {
      needs_escape = true;
      break;
    }
  }

  if (!needs_escape) return text;

  let result = "";
  let chunk_start = 0;
  for (let i = 0; i < len; i++) {
    const code = text.charCodeAt(i);
    if (code === 38 || code === 60 || code === 62 || code === 34 || code === 39) {
      if (i > chunk_start) result += text.substring(chunk_start, i);
      result += ESCAPE_TABLE[code];
      chunk_start = i + 1;
    }
  }
  if (len > chunk_start) result += text.substring(chunk_start, len);
  return result;
}
