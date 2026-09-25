import { HookResult, OverlayResult, RenderOptions, TokenizeResult } from "./types";
import { overlays as build_overlays } from "./overlays";

const ESCAPE_TABLE = new Array(128);
for (let i = 0; i < 128; i++) {
  ESCAPE_TABLE[i] = String.fromCharCode(i);
}
ESCAPE_TABLE[38] = "&amp;";
ESCAPE_TABLE[60] = "&lt;";
ESCAPE_TABLE[62] = "&gt;";
ESCAPE_TABLE[34] = "&quot;";
ESCAPE_TABLE[39] = "&#39;";

// every byte the renderer has to react to is below 63, so `code > 62` rejects
// every letter and every non-ascii code unit in one compare and the table
// load below never needs a bounds check. 1 = line break, 2 = needs escaping.
const SCAN_NEWLINE = 1;
const SCAN_ESCAPE = 2;
const SCAN_TABLE = new Uint8Array(63);
SCAN_TABLE[10] = SCAN_NEWLINE;
SCAN_TABLE[34] = SCAN_ESCAPE;
SCAN_TABLE[38] = SCAN_ESCAPE;
SCAN_TABLE[39] = SCAN_ESCAPE;
SCAN_TABLE[60] = SCAN_ESCAPE;
SCAN_TABLE[62] = SCAN_ESCAPE;

const LINE_OPEN = '<span class="l">';
const LINE_BREAK_OPEN = '</span>\n<span class="l">';
const CLOSE_BREAK_OPEN = '</span></span>\n<span class="l">';

// a span close, line break, line open and an indent of up to 32 spaces or
// 8 tabs, built once so the default line shape writes them in one append.
const MAX_INDENT_SPACES = 32;
const MAX_INDENT_TABS = 8;
const CLOSE_BREAK_SPACES: string[] = [];
const CLOSE_BREAK_TABS: string[] = [];
for (let k = 0; k <= MAX_INDENT_SPACES; k++) {
  CLOSE_BREAK_SPACES.push(CLOSE_BREAK_OPEN + " ".repeat(k));
}
for (let k = 0; k <= MAX_INDENT_TABS; k++) {
  CLOSE_BREAK_TABS.push(CLOSE_BREAK_OPEN + "\t".repeat(k));
}

export function to_html(input: string, token_result: TokenizeResult, options: RenderOptions = {}) {
  // option items merge into a fresh result so the caller's tokenize result
  // is left untouched. items that resolve to nothing fall through so they
  // stay invisible instead of adding a has- class.
  const items = options.overlays;
  if (items !== undefined && items.length !== 0) {
    const merged = build_overlays(input, items, token_result.overlays);
    if (merged.ranges.length !== 0 || merged.skip_ranges.length !== 0) {
      return to_html_overlay(input, token_result, merged, options);
    }
  }
  if (token_result.overlays !== undefined) {
    return to_html_overlay(input, token_result, token_result.overlays, options);
  }
  const { tokens, token_types } = token_result;
  const { class_name = "twinkleplop" } = options;
  const line_numbers = !!options.line_numbers;
  const inline = options.structure === "inline";
  const line_hook = inline ? undefined : options.line;
  const token_hook = options.token;
  // with no line hook and no numbers every line opens the same way, so the
  // break carries the next line open and begin_line has nothing to add.
  const fused_break = !inline && line_hook === undefined && !line_numbers;
  const line_break = inline ? "<br>" : fused_break ? LINE_BREAK_OPEN : "</span>\n";
  const close_break = inline ? "</span><br>" : fused_break ? CLOSE_BREAK_OPEN : "</span></span>\n";
  const ws_mode = whitespace_mode(options.whitespace);
  const indent_size = indent_guide_size(options.indent_guides);
  const ws_active = ws_mode !== 0 || indent_size !== 0;

  let out = inline ? "" : open_pre(class_name, options.attributes);

  // seeded with the start value so the per-line path pays nothing for it.
  const first_line = inline ? 1 : first_line_number(options.line_numbers);
  let line_no = first_line;
  let open_class: string | null = null;
  // kept whole so a line break inside a decorated token reopens the same tag.
  let open_tag: string | null = null;

  if (fused_break) out += LINE_OPEN;
  else begin_line();

  function begin_line() {
    if (inline || fused_break) return;
    if (line_hook === undefined) {
      out += open_line(line_no, line_numbers);
      return;
    }
    const n = line_no - first_line + 1;
    const deco = hook_output(line_hook(n, n), "line");
    if (deco === null) out += open_line(line_no, line_numbers);
    else out += open_line_with_extra(line_no, line_numbers, "l" + deco.cls, deco.attrs);
  }

  function close_span() {
    if (open_class !== null) {
      out += "</span>";
      open_class = null;
    }
  }

  function ensure_span(cls: string | null) {
    if (cls === open_class) return;
    close_span();
    if (cls !== null) {
      out += open_tag !== null ? open_tag : `<span class="tok ${cls}">`;
      open_class = cls;
    }
  }

  // line breaks and escapable bytes are found in the same pass. splitting
  // them costs a second walk over every byte, and escapable bytes are rare
  // enough (about one per 100) that the escaper would spend that walk
  // finding nothing.
  function emit_range(start: number, end: number, cls: string | null) {
    if (start >= end) return;
    // most ranges hold no line break and nothing to escape. finding that
    // first lets them go out as one substring with no chunk bookkeeping.
    let first = start;
    while (first < end) {
      const code = input.charCodeAt(first);
      if (code <= 62 && SCAN_TABLE[code] !== 0) break;
      first++;
    }
    if (first === end) {
      ensure_span(cls);
      out += input.substring(start, end);
      return;
    }
    let chunk_start = start;
    for (let i = first; i < end; i++) {
      const code = input.charCodeAt(i);
      if (code > 62) continue;
      const kind = SCAN_TABLE[code];
      if (kind === 0) continue;
      if (kind === SCAN_ESCAPE) {
        ensure_span(cls);
        if (i > chunk_start) out += input.substring(chunk_start, i);
        out += ESCAPE_TABLE[code];
        chunk_start = i + 1;
        continue;
      }
      if (i > chunk_start) {
        ensure_span(cls);
        out += input.substring(chunk_start, i);
      }
      // a span still open at the break closes in the same append.
      if (open_class !== null) {
        out += close_break;
        open_class = null;
      } else out += line_break;
      line_no++;
      begin_line();
      chunk_start = i + 1;
    }
    if (end > chunk_start) {
      ensure_span(cls);
      out += input.substring(chunk_start, end);
    }
  }

  // text between tokens is the only place source whitespace can be wrapped.
  // runs of spaces and tabs are classified against the line they sit on and
  // everything else falls through to emit_range one chunk at a time.
  function emit_gap(start: number, end: number) {
    close_span();
    let chunk_start = start;
    let i = start;
    while (i < end) {
      const code = input.charCodeAt(i);
      if (code === 32 || code === 9) {
        if (i > chunk_start) emit_range(chunk_start, i, null);
        let r = i + 1;
        while (r < end) {
          const c = input.charCodeAt(r);
          if (c !== 32 && c !== 9) break;
          r++;
        }
        out += whitespace_html(input, i, r, ws_mode, indent_size);
        i = r;
        chunk_start = r;
        continue;
      }
      if (code === 10) {
        if (i > chunk_start) emit_range(chunk_start, i, null);
        out += line_break;
        line_no++;
        begin_line();
        i++;
        chunk_start = i;
        continue;
      }
      i++;
    }
    if (end > chunk_start) emit_range(chunk_start, end, null);
  }

  // input[from..to) follows a line break. when it is all spaces or all tabs
  // and short, the close, break, line open and indent are one append.
  function emit_indent_break(from: number, to: number): boolean {
    const n = to - from;
    if (n === 0) {
      out += CLOSE_BREAK_OPEN;
      return true;
    }
    const c = input.charCodeAt(from);
    if (c === 32) {
      if (n > MAX_INDENT_SPACES) return false;
      for (let i = from + 1; i < to; i++) if (input.charCodeAt(i) !== 32) return false;
      out += CLOSE_BREAK_SPACES[n];
      return true;
    }
    if (c === 9) {
      if (n > MAX_INDENT_TABS) return false;
      for (let i = from + 1; i < to; i++) if (input.charCodeAt(i) !== 9) return false;
      out += CLOSE_BREAK_TABS[n];
      return true;
    }
    return false;
  }

  let last_end = 0;
  for (let i = 0; i < tokens.length; i += 3) {
    const cls = token_types[tokens[i]];
    const start = tokens[i + 1];
    const end = tokens[i + 2];

    if (start > last_end) {
      if (ws_active) emit_gap(last_end, start);
      else if (open_class !== null && start === last_end + 1 && input.charCodeAt(last_end) === 32) {
        // a lone space between tokens is the most common gap. closing the
        // span and writing it is one append.
        out += "</span> ";
        open_class = null;
      } else if (
        fused_break &&
        open_class !== null &&
        input.charCodeAt(last_end) === 10 &&
        emit_indent_break(last_end + 1, start)
      ) {
        open_class = null;
        line_no++;
      } else emit_range(last_end, start, null);
    }
    if (token_hook !== undefined) {
      const deco = hook_output(token_hook(cls, start, end), "token");
      if (deco !== null) {
        close_span();
        open_tag = token_tag(cls, deco);
        emit_range(start, end, cls);
        close_span();
        open_tag = null;
        last_end = end;
        continue;
      }
    }
    emit_range(start, end, cls);
    last_end = end;
  }

  if (last_end < input.length) {
    if (ws_active) emit_gap(last_end, input.length);
    else emit_range(last_end, input.length, null);
  }

  close_span();
  if (!inline) out += "</span></code></pre>";

  return out;
}

function open_line(n: number, line_numbers: boolean) {
  if (line_numbers) return `<span class="l"><span class="ln">${n}</span>`;
  return `<span class="l">`;
}

function first_line_number(line_numbers: RenderOptions["line_numbers"]): number {
  if (typeof line_numbers !== "object" || line_numbers === null) return 1;
  const start = line_numbers.start;
  if (start === undefined) return 1;
  if (typeof start !== "number" || !Number.isInteger(start)) {
    throw new RangeError(`line_numbers.start must be a finite integer, got ${String(start)}`);
  }
  return start;
}

const WS_LEADING = 1;
const WS_TRAILING = 2;
const WS_INNER = 4;

function whitespace_mode(whitespace: RenderOptions["whitespace"]): number {
  switch (whitespace) {
    case undefined:
      return 0;
    case "all":
      return WS_LEADING | WS_TRAILING | WS_INNER;
    case "boundary":
      return WS_LEADING | WS_TRAILING;
    case "leading":
      return WS_LEADING;
    case "trailing":
      return WS_TRAILING;
  }
  throw new TypeError(
    `whitespace must be "all", "boundary", "leading" or "trailing", got ${String(whitespace)}`,
  );
}

function indent_guide_size(indent_guides: RenderOptions["indent_guides"]): number {
  if (indent_guides === undefined || indent_guides === false) return 0;
  if (indent_guides === true) return 2;
  const size = indent_guides.size;
  if (size === undefined) return 2;
  if (typeof size !== "number" || !Number.isInteger(size) || size < 1) {
    throw new RangeError(`indent_guides.size must be a positive integer, got ${String(size)}`);
  }
  return size;
}

const SPACE_SPAN = '<span class="tok space"> </span>';
const TAB_SPAN = '<span class="tok tab">\t</span>';
const INDENT_OPEN = '<span class="indent">';

// input[start..end) is a run of spaces and tabs between tokens. a run that
// begins at a line start is leading and one that reaches the line end is
// trailing; a whitespace only line is both and is wrapped once.
function whitespace_html(
  input: string,
  start: number,
  end: number,
  ws_mode: number,
  indent_size: number,
): string {
  const leading = start === 0 || input.charCodeAt(start - 1) === 10;
  let wrap = (ws_mode & WS_INNER) !== 0;
  if (!wrap) {
    if (leading && (ws_mode & WS_LEADING) !== 0) wrap = true;
    else if ((ws_mode & WS_TRAILING) !== 0) {
      const next = end === input.length ? 10 : input.charCodeAt(end);
      wrap = next === 10 || next === 13;
    }
  }
  if (!leading || indent_size === 0) return whitespace_run(input, start, end, wrap);

  let html = "";
  let level_start = start;
  let pending = 0;
  for (let i = start; i < end; i++) {
    if (input.charCodeAt(i) === 9) {
      if (pending !== 0) {
        html += whitespace_run(input, level_start, i, wrap);
        pending = 0;
      }
      html += INDENT_OPEN + (wrap ? TAB_SPAN : "\t") + "</span>";
      level_start = i + 1;
    } else if (++pending === indent_size) {
      html += INDENT_OPEN + whitespace_run(input, level_start, i + 1, wrap) + "</span>";
      pending = 0;
      level_start = i + 1;
    }
  }
  if (pending !== 0) html += whitespace_run(input, level_start, end, wrap);
  return html;
}

function whitespace_run(input: string, start: number, end: number, wrap: boolean): string {
  if (!wrap) return input.substring(start, end);
  let html = "";
  for (let i = start; i < end; i++) {
    html += input.charCodeAt(i) === 9 ? TAB_SPAN : SPACE_SPAN;
  }
  return html;
}

function open_pre(class_attr: string, attributes: RenderOptions["attributes"]): string {
  if (attributes === undefined) return `<pre class="${class_attr}"><code>`;
  return `<pre class="${class_attr}"${render_attributes(attributes)}><code>`;
}

function join_classes(class_name: string, extra: string): string {
  if (extra.length === 0) return class_name;
  if (class_name.length === 0) return extra;
  return class_name + " " + extra;
}

// `class` belongs to class_name and `style` to themes, so accepting either
// here would let one call silently override the other mechanism.
function render_attributes(
  attributes: Record<string, string | number | boolean>,
  owner = "attributes",
): string {
  let out = "";
  for (const name of Object.keys(attributes)) {
    if (name === "class" || name === "style") {
      throw new TypeError(`${owner}.${name} is reserved`);
    }
    if (!is_attribute_name(name)) {
      throw new TypeError(`"${name}" is not a valid attribute name`);
    }
    const value = attributes[name];
    if (value === false) continue;
    if (value === true) {
      out += " " + name;
    } else if (typeof value === "string") {
      out += ` ${name}="${escape_html(value)}"`;
    } else if (typeof value === "number") {
      out += ` ${name}="${value}"`;
    } else {
      throw new TypeError(`${owner}.${name} must be a string, number or boolean`);
    }
  }
  return out;
}

// a leading digit is rejected so integer-like keys, which javascript moves
// ahead of every other key, can never break the emitted attribute order.
function is_attribute_name(name: string): boolean {
  const len = name.length;
  if (len === 0) return false;
  for (let i = 0; i < len; i++) {
    const c = name.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      if (i === 0) return false;
      continue;
    }
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) continue;
    if (c === 45 || c === 95 || c === 58 || c === 46) continue;
    return false;
  }
  return true;
}

interface HookDecoration {
  cls: string;
  attrs: string;
}

// the class is escaped rather than validated so a hook can never break out
// of the attribute.
function hook_output(value: unknown, hook: string): HookDecoration | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") {
    throw new TypeError(`the ${hook} hook must return an object or nothing, got ${typeof value}`);
  }
  const { class: cls, attrs } = value as HookResult;
  let cls_out = "";
  if (cls !== undefined && cls !== null) {
    if (typeof cls !== "string") throw new TypeError(`${hook} hook class must be a string`);
    if (cls.length !== 0) cls_out = " " + escape_html(cls);
  }
  const attrs_out = attrs === undefined ? "" : render_attributes(attrs, `${hook} hook attrs`);
  return { cls: cls_out, attrs: attrs_out };
}

function token_tag(cls: string, deco: HookDecoration): string {
  return `<span class="tok ${cls}${deco.cls}"${deco.attrs}>`;
}

// only the first token of a classification is prefixed, as shiki does for
// `diff add`, so several classifications can collapse into one has- class.
// the order comes from the offsets rather than array position because a
// hand-built result need not be sorted the way the extractor's is.
function has_class_list(ranges: Uint32Array, classifications: string[]): string {
  const count = classifications.length;
  if (count === 0 || ranges.length === 0) return "";
  const first_start = new Array<number>(count).fill(-1);
  const first_index = new Array<number>(count).fill(0);
  for (let r = 0; r < ranges.length; r += 4) {
    const id = ranges[r + 2];
    if (id >= count) continue;
    const start = ranges[r];
    if (first_start[id] === -1 || start < first_start[id]) {
      first_start[id] = start;
      first_index[id] = r;
    }
  }
  const ids: number[] = [];
  for (let id = 0; id < count; id++) if (first_start[id] !== -1) ids.push(id);
  ids.sort((a, b) => first_start[a] - first_start[b] || first_index[a] - first_index[b]);
  const seen = new Set<string>();
  let out = "";
  for (let i = 0; i < ids.length; i++) {
    const cls = classifications[ids[i]];
    const space = cls.indexOf(" ");
    const head = space === -1 ? cls : cls.substring(0, space);
    if (head.length === 0 || seen.has(head)) continue;
    seen.add(head);
    out += out.length === 0 ? "has-" + head : " has-" + head;
  }
  return out;
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
// annotation overlay rendering
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
  const { class_name = "twinkleplop" } = options;
  const line_numbers = !!options.line_numbers;
  const inline = options.structure === "inline";
  const line_hook = inline ? undefined : options.line;
  const token_hook = options.token;
  const line_break = inline ? "<br>" : "</span>\n";
  const ws_mode = whitespace_mode(options.whitespace);
  const indent_size = indent_guide_size(options.indent_guides);
  const ws_active = ws_mode !== 0 || indent_size !== 0;
  const { ranges, classifications, skip_ranges, elided_lines } = overlays;

  // split overlays by mode once, up front. line-mode overlays bin onto the
  // <span class="l"> open. token-mode overlays become per-line WRAPPER
  // segments: a wrapper opens at the first non-whitespace byte of the
  // overlay's intersection with the line and closes after the last
  // non-whitespace byte, so indentation/trailing whitespace stays outside
  // the highlight while inter-token whitespace stays inside (one
  // contiguous visual run instead of N separate token spans).
  // ids rather than a joined string so a class arriving twice (a marker and
  // an option, say) is applied once.
  const line_class_map = new Map<number, number[]>();
  // raw token-mode overlays bucketed by line: { start, end, class_id } per
  // line. trimmed to non-WS during wrapper computation below.
  const token_overlays_by_line = new Map<
    number,
    { start: number; end: number; class_id: number }[]
  >();
  if (ranges.length > 0) {
    for (let r = 0; r < ranges.length; r += 4) {
      const ostart = ranges[r];
      const oend = ranges[r + 1];
      const class_id = ranges[r + 2];
      const flags = ranges[r + 3];
      // both line numbers come from the input itself, so they are already
      // bounded by its line count. `elided_lines` is NOT a bound here: a
      // hand-built OverlayResult may pass an empty array, and reads of it
      // are guarded at the point of use instead.
      //
      // an empty range (start === end) applies to the line its start sits
      // on. the annotation extractor never produces one (its line-mode
      // ranges run to the start of the next line, so an empty source line
      // still yields a one-byte range) but a programmatic consumer
      // describing an empty line naturally does, and `oend - 1` would land
      // that on the previous line.
      const start_line = line_of_offset(input, ostart);
      const end_line = oend > ostart ? line_of_offset(input, oend - 1) : start_line;
      if ((flags & 1) === 1) {
        for (let l = start_line; l <= end_line; l++) {
          const ids = line_class_map.get(l);
          if (ids === undefined) line_class_map.set(l, [class_id]);
          else if (!ids.includes(class_id)) ids.push(class_id);
        }
      } else {
        // bucket the token-mode overlay onto every line it touches.
        for (let l = start_line; l <= end_line; l++) {
          let arr = token_overlays_by_line.get(l);
          if (arr === undefined) {
            arr = [];
            token_overlays_by_line.set(l, arr);
          }
          arr.push({ start: ostart, end: oend, class_id });
        }
      }
    }
  }

  // build the line-start index lazily — only needed when a token-mode
  // overlay actually fires or when a line has skip ranges to trim past.
  let line_starts: Int32Array | null = null;
  function get_line_starts(): Int32Array {
    if (line_starts !== null) return line_starts;
    let count = 1;
    for (let i = 0; i < input.length; i++) if (input.charCodeAt(i) === 10) count++;
    line_starts = new Int32Array(count);
    let li = 1;
    for (let i = 0; i < input.length; i++) {
      if (input.charCodeAt(i) === 10) line_starts[li++] = i + 1;
    }
    return line_starts;
  }

  // skip-range cursor: advances monotonically with byte position.
  let skip_idx = 0;
  const skip_count = skip_ranges.length / 2;

  // returns the index of the skip range containing `pos`, or -1. binary
  // search over the sorted [start, end) pairs.
  function find_skip_containing(pos: number): number {
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

  // per-line: byte position past the last byte that should be emitted —
  // i.e., one past the last source byte that is non-whitespace AND not
  // inside a skip range. trailing whitespace and skip-range bytes (the
  // substituted-to-space remains of an elided comment) are dropped from
  // the output entirely. cached because each line is touched many times
  // (once per token plus inter-token gaps).
  //
  // when whitespace is being rendered the caller asked to see it, so a
  // trailing run of source whitespace is kept. a tail that holds a hidden
  // range is still dropped whole: the whitespace around a marker went with
  // the marker, as it does without the option.
  const line_emit_end_cache = new Map<number, number>();
  function last_emit_byte_in_line(line: number): number {
    const cached = line_emit_end_cache.get(line);
    if (cached !== undefined) return cached;
    const ls = get_line_starts();
    const line_start = ls[line - 1];
    const line_end = line < ls.length ? ls[line] - 1 : input.length;
    let p = line_end - 1;
    let tail_has_skip = false;
    while (p >= line_start) {
      const sk = find_skip_containing(p);
      if (sk >= 0) {
        // jump to the byte immediately before the skip range.
        tail_has_skip = true;
        p = skip_ranges[sk * 2] - 1;
        continue;
      }
      const c = input.charCodeAt(p);
      if (c !== 32 && c !== 9 && c !== 13) break;
      p--;
    }
    const emit_end = ws_active && !tail_has_skip ? line_end : p + 1;
    line_emit_end_cache.set(line, emit_end);
    return emit_end;
  }

  // per-line wrappers, computed lazily as we cross line boundaries. each
  // entry is sorted by start, non-overlapping, and trimmed to non-WS bytes.
  type LineWrapper = { start: number; end: number; cls: string };
  const wrappers_cache = new Map<number, LineWrapper[]>();
  function wrappers_for_line(line: number): LineWrapper[] {
    const cached = wrappers_cache.get(line);
    if (cached !== undefined) return cached;
    const overlays_for_line = token_overlays_by_line.get(line);
    if (overlays_for_line === undefined || overlays_for_line.length === 0) {
      wrappers_cache.set(line, EMPTY_WRAPPERS);
      return EMPTY_WRAPPERS;
    }
    const ls = get_line_starts();
    const line_start = ls[line - 1];
    const line_end = line < ls.length ? ls[line] - 1 : input.length;
    const result = compute_line_wrappers(
      overlays_for_line,
      classifications,
      input,
      line_start,
      line_end,
      skip_ranges,
    );
    wrappers_cache.set(line, result);
    return result;
  }

  const out: string[] = [];
  if (!inline) {
    const has_classes =
      options.has_classes === false ? "" : has_class_list(ranges, classifications);
    out.push(open_pre(join_classes(class_name, has_classes), options.attributes));
  }

  let line_no = 1;
  const first_line = inline ? 1 : first_line_number(options.line_numbers);
  let visible_line_no = first_line;
  let line_open = false;
  let open_class: string | null = null;
  let open_tag: string | null = null;

  // wrapper state for the current line. reset on every newline; the
  // wrapper class string lives on `<span class="tok ${cls}">` so existing
  // CSS that targets `.tok.emphasis`, `.tok.diff-add`, etc. still matches
  // without changes.
  let line_wrappers: LineWrapper[] = EMPTY_WRAPPERS;
  let wrapper_idx = 0;
  let wrapper_open: LineWrapper | null = null;

  function reset_line_wrappers() {
    line_wrappers = wrappers_for_line(line_no);
    wrapper_idx = 0;
    wrapper_open = null;
  }

  function maybe_open_line() {
    if (line_open) return;
    if (line_no <= elided_lines.length && elided_lines[line_no - 1] === 1) return;
    if (!inline) {
      let cls = "l";
      const extra = line_class_map.get(line_no);
      if (extra !== undefined) {
        for (let i = 0; i < extra.length; i++) cls += " " + classifications[extra[i]];
      }
      let attrs = "";
      if (line_hook !== undefined) {
        const deco = hook_output(line_hook(visible_line_no - first_line + 1, line_no), "line");
        if (deco !== null) {
          cls += deco.cls;
          attrs = deco.attrs;
        }
      }
      out.push(open_line_with_extra(visible_line_no, line_numbers, cls, attrs));
    }
    visible_line_no++;
    line_open = true;
    reset_line_wrappers();
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
      out.push(open_tag !== null ? open_tag : `<span class="tok ${cls}">`);
      open_class = cls;
    }
  }

  function close_wrapper() {
    close_span();
    if (wrapper_open !== null) {
      out.push("</span>");
      wrapper_open = null;
    }
  }

  function close_line_at_newline() {
    close_wrapper();
    if (line_open) {
      out.push(line_break);
      line_open = false;
    }
    line_no++;
  }

  // emit a single segment that doesn't cross a wrapper boundary. handles
  // the "rendered content is whitespace only" case (elided comment bytes,
  // bare indentation) by skipping the token span — same rule as the
  // no-overlay path, just inside or outside a wrapper.
  function emit_segment(seg_start: number, seg_end: number, base_cls: string | null) {
    if (seg_start >= seg_end) return;
    if (base_cls === null && ws_active) {
      close_span();
      push_substituted_gap(seg_start, seg_end);
      return;
    }
    if (chunk_renders_whitespace(seg_start, seg_end)) {
      close_span();
      push_substituted(out, input, seg_start, seg_end, skip_ranges, skip_idx_after);
      return;
    }
    ensure_span(base_cls);
    push_substituted(out, input, seg_start, seg_end, skip_ranges, skip_idx_after);
  }

  // walk a per-token chunk through the line's wrapper events. opens a
  // wrapper when the cursor reaches its start, closes it at its end, and
  // emits each between-event slice via emit_segment.
  function emit_chunk(chunk_start: number, chunk_end: number, base_cls: string | null) {
    if (chunk_start >= chunk_end) return;
    let cursor = chunk_start;
    while (cursor < chunk_end) {
      // close the active wrapper if its end falls at-or-before the cursor.
      if (wrapper_open !== null && cursor >= wrapper_open.end) {
        close_wrapper();
      }
      // open the next wrapper if we've reached its start. wrappers are
      // non-overlapping and sorted, so at most one can open here.
      if (wrapper_open === null && wrapper_idx < line_wrappers.length) {
        const next_w = line_wrappers[wrapper_idx];
        if (cursor >= next_w.start) {
          close_span();
          out.push(`<span class="tok ${next_w.cls}">`);
          wrapper_open = next_w;
          wrapper_idx++;
        }
      }
      // determine how far we can emit before the next wrapper transition.
      let stop = chunk_end;
      if (wrapper_open !== null && wrapper_open.end < stop) stop = wrapper_open.end;
      else if (wrapper_open === null && wrapper_idx < line_wrappers.length) {
        const next_w = line_wrappers[wrapper_idx];
        if (next_w.start < stop) stop = next_w.start;
      }
      emit_segment(cursor, stop, base_cls);
      cursor = stop;
    }
  }

  function chunk_renders_whitespace(from: number, to: number): boolean {
    let skip_cursor = 0;
    while (skip_cursor < skip_count && skip_ranges[skip_cursor * 2 + 1] <= from) {
      skip_cursor++;
    }
    let pos = from;
    while (pos < to) {
      if (skip_cursor < skip_count) {
        const sstart = skip_ranges[skip_cursor * 2];
        const send = skip_ranges[skip_cursor * 2 + 1];
        if (sstart < to && send > pos) {
          pos = send > to ? to : send;
          skip_cursor++;
          continue;
        }
      }
      const c = input.charCodeAt(pos);
      if (c !== 32 && c !== 9 && c !== 13) return false;
      pos++;
    }
    return true;
  }

  // hidden bytes still render as plain spaces; only the stretches between
  // them are source whitespace and go through the wrapper.
  function push_substituted_gap(start: number, end: number) {
    let idx = skip_idx_after(start, end);
    let chunk_start = start;
    while (idx < skip_count) {
      const sstart = skip_ranges[idx * 2];
      const send = skip_ranges[idx * 2 + 1];
      if (sstart >= end) break;
      if (sstart > chunk_start) emit_gap_text(chunk_start, sstart);
      const sub_end = send < end ? send : end;
      const space_count = sub_end - (chunk_start > sstart ? chunk_start : sstart);
      if (space_count > 0) out.push(SPACE_RUN(space_count));
      chunk_start = sub_end;
      if (send > end) break;
      idx++;
    }
    if (chunk_start < end) emit_gap_text(chunk_start, end);
  }

  // segments never hold a newline, so only whitespace runs and escapable
  // text are told apart here.
  function emit_gap_text(start: number, end: number) {
    let chunk_start = start;
    let i = start;
    while (i < end) {
      const code = input.charCodeAt(i);
      if (code !== 32 && code !== 9) {
        i++;
        continue;
      }
      if (i > chunk_start) out.push(escape_substring_optimized(input, chunk_start, i));
      let r = i + 1;
      while (r < end) {
        const c = input.charCodeAt(r);
        if (c !== 32 && c !== 9) break;
        r++;
      }
      out.push(whitespace_html(input, i, r, ws_mode, indent_size));
      i = r;
      chunk_start = r;
    }
    if (end > chunk_start) out.push(escape_substring_optimized(input, chunk_start, end));
  }

  function skip_idx_after(_chunk_start: number, _chunk_end: number): number {
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
        // clamp to the last renderable byte of this line so the trailing
        // substituted-whitespace from an elided marker comment is dropped
        // from the output entirely instead of rendering as run-on spaces.
        const max_end = last_emit_byte_in_line(line_no);
        const clamped = i < max_end ? i : max_end;
        if (clamped > chunk_start) emit_chunk(chunk_start, clamped, base_cls);
      }
      close_line_at_newline();
      maybe_open_line();
      chunk_start = i + 1;
    }
    const elided_tail = line_no <= elided_lines.length && elided_lines[line_no - 1] === 1;
    if (!elided_tail && end > chunk_start) {
      const max_end = last_emit_byte_in_line(line_no);
      const clamped = end < max_end ? end : max_end;
      if (clamped > chunk_start) emit_chunk(chunk_start, clamped, base_cls);
    }
  }

  let last_end = 0;
  for (let i = 0; i < tokens.length; i += 3) {
    const cls = token_types[tokens[i]];
    const start = tokens[i + 1];
    const end = tokens[i + 2];
    if (start > last_end) emit_range_overlay(last_end, start, null);
    if (token_hook !== undefined) {
      const deco = hook_output(token_hook(cls, start, end), "token");
      if (deco !== null) {
        close_span();
        open_tag = token_tag(cls, deco);
        emit_range_overlay(start, end, cls);
        close_span();
        open_tag = null;
        last_end = end;
        continue;
      }
    }
    emit_range_overlay(start, end, cls);
    last_end = end;
  }
  if (last_end < input.length) emit_range_overlay(last_end, input.length, null);

  close_wrapper();
  if (!inline) {
    if (line_open) out.push("</span>");
    out.push("</code></pre>");
  }
  return out.join("");
}

const EMPTY_WRAPPERS: { start: number; end: number; cls: string }[] = [];

// Build the per-line wrapper list from the overlays touching this line.
// Algorithm: sweep over (open, close) events in source order, maintain an
// `active` multiset of class_ids, emit one wrapper segment per change in
// the active set. Each segment is trimmed to its first/last non-whitespace
// byte, where a hidden byte counts as whitespace because that is what it
// renders as; whitespace-only segments are dropped. The result is a sorted,
// non-overlapping list — multiple overlapping overlays produce class-merged
// segments rather than overlapping spans.
function compute_line_wrappers(
  overlays_for_line: { start: number; end: number; class_id: number }[],
  classifications: string[],
  input: string,
  line_start: number,
  line_end: number,
  skip_ranges: Uint32Array,
): { start: number; end: number; cls: string }[] {
  type Event = { pos: number; delta: number; class_id: number };
  const events: Event[] = [];
  for (const o of overlays_for_line) {
    const s = o.start < line_start ? line_start : o.start;
    const e = o.end > line_end ? line_end : o.end;
    if (s >= e) continue;
    events.push({ pos: s, delta: +1, class_id: o.class_id });
    events.push({ pos: e, delta: -1, class_id: o.class_id });
  }
  if (events.length === 0) return [];
  // sort by pos. at ties, process closes before opens so a close-then-open
  // at the same byte produces two adjacent segments rather than one merged
  // segment with both classes briefly active.
  events.sort((a, b) => a.pos - b.pos || a.delta - b.delta);

  const result: { start: number; end: number; cls: string }[] = [];
  const active = new Map<number, number>();
  let cursor = events[0].pos;

  for (let i = 0; i < events.length; i++) {
    const evt = events[i];
    if (evt.pos > cursor && active.size > 0) {
      // emit segment [cursor, evt.pos) under current active set.
      let s = cursor;
      let e = evt.pos;
      while (s < e && renders_blank(input, s, skip_ranges)) s++;
      while (e > s && renders_blank(input, e - 1, skip_ranges)) e--;
      if (s < e) {
        const parts: string[] = [];
        for (const id of active.keys()) parts.push(classifications[id]);
        result.push({ start: s, end: e, cls: parts.join(" ") });
      }
    }
    if (evt.delta === +1) {
      active.set(evt.class_id, (active.get(evt.class_id) ?? 0) + 1);
    } else {
      const n = (active.get(evt.class_id) ?? 0) - 1;
      if (n <= 0) active.delete(evt.class_id);
      else active.set(evt.class_id, n);
    }
    cursor = evt.pos;
  }
  return result;
}

function renders_blank(input: string, pos: number, skip_ranges: Uint32Array): boolean {
  const c = input.charCodeAt(pos);
  if (c === 32 || c === 9 || c === 13) return true;
  for (let i = 0; i < skip_ranges.length; i += 2) {
    if (skip_ranges[i] > pos) return false;
    if (pos < skip_ranges[i + 1]) return true;
  }
  return false;
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

function open_line_with_extra(n: number, line_numbers: boolean, cls: string, attrs: string) {
  if (line_numbers) return `<span class="${cls}"${attrs}><span class="ln">${n}</span>`;
  return `<span class="${cls}"${attrs}>`;
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
