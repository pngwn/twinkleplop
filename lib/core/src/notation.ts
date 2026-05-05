// notation transformer extraction.
//
// post-tokenize pass that walks comment tokens, parses `[!verb[#id][ args]]`
// markers, dispatches to registered plugins, and collects overlay
// contributions into an OverlayResult that the renderer applies.
//
// the extractor is built once at language-factory time. it captures the
// resolved comment_id, verb -> plugin map, and any parser preflight. when
// `LanguageOptions.notation` is undefined the extractor is never built; the
// LanguageFn closure is identical to today's. see create_language for the
// integration point.
//
// phase 1 supports: bare, +N, :N, :N..M argument forms. anchor ranges, set
// form (=anchor), and pair resolution land in phase 2.

import type {
  Anchor,
  NotationConfig,
  NotationInput,
  NotationIssue,
  NotationIssueKind,
  NotationPlugin,
  OverlayContribution,
  OverlayResult,
  ParsedArgs,
  SourcePosition,
  SourceRange,
  TokenizeResult,
} from "./types";

// ---------------------------------------------------------------------------
// public entry: build_notation_extractor
// ---------------------------------------------------------------------------
//
// called once per language factory invocation. validates the plugin set,
// resolves the comment_id against the grammar's token_types, and returns a
// closure that runs extraction against (input, tokenize_result).

export type NotationExtractor = (
  input: string,
  result: TokenizeResult,
) => OverlayResult | undefined;

export function build_notation_extractor(
  config: NotationConfig,
  token_types: string[],
): NotationExtractor {
  const verb_to_plugin = build_verb_map(config.plugins);
  const comment_id = token_types.indexOf("comment");
  // when the host grammar has no comment token, notation is inert: every
  // call returns undefined immediately. this is the only no-op the extractor
  // ever takes when notation IS configured; we still hit the closure but the
  // body short-circuits on the first comment-token lookup.
  return (input, result) => {
    if (comment_id < 0) return undefined;
    return run_extraction(input, result, verb_to_plugin, comment_id, config.on_error);
  };
}

function build_verb_map(plugins: NotationPlugin[]): Map<string, NotationPlugin> {
  const map = new Map<string, NotationPlugin>();
  for (const plugin of plugins) {
    for (const verb of plugin.verbs) {
      if (map.has(verb)) {
        throw new Error(`notation: verb "${verb}" claimed by multiple plugins`);
      }
      map.set(verb, plugin);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// extraction core
// ---------------------------------------------------------------------------

interface CollectedOverlay {
  start: number;
  end: number;
  class_id: number;
  // bit 0 = line-mode.
  flags: number;
}

interface SkipRange {
  start: number;
  end: number;
  // 1-indexed line containing the marker. lets the elide step decide
  // whether the line went whitespace-only post-substitution.
  line: number;
}

function run_extraction(
  input: string,
  result: TokenizeResult,
  verb_to_plugin: Map<string, NotationPlugin>,
  comment_id: number,
  on_error: ((issue: NotationIssue) => void) | undefined,
): OverlayResult | undefined {
  const tokens = result.tokens;
  const n = tokens.length / 3;

  const overlays: CollectedOverlay[] = [];
  const skip_ranges: SkipRange[] = [];
  const class_to_id = new Map<string, number>();
  const classifications: string[] = [];
  let line_index: Int32Array | null = null;

  const class_id_for = (name: string): number => {
    let id = class_to_id.get(name);
    if (id === undefined) {
      id = classifications.length;
      classifications.push(name);
      class_to_id.set(name, id);
    }
    return id;
  };

  const ensure_line_index = (): Int32Array => {
    if (line_index === null) line_index = build_line_starts(input);
    return line_index;
  };

  const report = (kind: NotationIssueKind, message: string, position: SourcePosition) => {
    const issue: NotationIssue = { kind, message, position };
    if (on_error) {
      on_error(issue);
      return;
    }
    // default policy: warn, don't throw. an in-progress edit (e.g. `[!hl
    // :10..]` mid-keystroke) shouldn't take down the whole render and leave
    // the editor staring at stale state. consumers that want strict
    // validation can pass an on_error that throws.
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn(`twinkleplop notation [${kind}] at line ${position.line}: ${message}`);
    }
  };

  for (let i = 0; i < n; i++) {
    if (tokens[i * 3] !== comment_id) continue;
    const start = tokens[i * 3 + 1];
    const end = tokens[i * 3 + 2];

    // accumulate marker skip ranges for this specific comment; we may
    // promote them to a whole-comment skip range if the comment contains
    // only markers + non-alphanumeric punctuation.
    const comment_skips: SkipRange[] = [];
    let pos = start;
    while (pos < end) {
      const found = find_marker_start(input, pos, end);
      if (found < 0) break;
      // escaped form `\[!...]` — consume the backslash, leave the rest as
      // literal comment text. spec: the leading `\` is consumed during
      // extraction, but we don't mutate input; the renderer decides what to
      // emit. for phase 1 we treat escapes as a no-op skip past the `[`.
      if (found > start && input.charCodeAt(found - 1) === 92 /* \ */) {
        pos = found + 2;
        continue;
      }

      const lines = ensure_line_index();
      const parsed = parse_marker(input, found, end, lines);
      if (parsed === null) {
        // not a valid marker shape (`[!` without closing `]` on the same line,
        // empty verb, etc). skip past the `[!` and keep scanning.
        pos = found + 2;
        continue;
      }

      const plugin = verb_to_plugin.get(parsed.verb);
      if (plugin === undefined) {
        // unknown verb is not an error; the marker stays as-is in the
        // rendered comment.
        pos = parsed.marker.end;
        continue;
      }

      if (parsed.spans_newline) {
        report("marker_spans_newline", `marker spans a newline`, parsed.marker);
        pos = parsed.marker.end;
        continue;
      }

      if (parsed.error !== null) {
        report(parsed.error.kind, parsed.error.message, parsed.marker);
        pos = parsed.marker.end;
        continue;
      }

      // resolve the marker's source range. phase 1: every supported arg form
      // maps to a line range, so this is a line-index lookup.
      const range = resolve_phase1_range(parsed.args, parsed.marker, lines, input.length);
      if (range === null) {
        report("malformed", `unable to resolve marker range`, parsed.marker);
        pos = parsed.marker.end;
        continue;
      }

      const input_to_plugin: NotationInput = {
        verb: parsed.verb,
        id: parsed.id,
        args: parsed.args,
        range,
        marker: parsed.marker,
      };

      let output;
      try {
        output = plugin.handle(input_to_plugin);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        report("malformed", `plugin "${parsed.verb}" threw: ${message}`, parsed.marker);
        pos = parsed.marker.end;
        continue;
      }

      if (output && output.overlays) {
        for (const overlay of output.overlays) {
          push_overlay(overlays, class_id_for, overlay);
        }
      }

      comment_skips.push({
        start: parsed.marker.start,
        end: parsed.marker.end,
        line: parsed.marker.line,
      });

      pos = parsed.marker.end;
    }

    // a comment whose non-marker bytes are entirely punctuation/whitespace
    // is structurally a "marker-only" comment. extend the skip range to
    // cover the whole comment so the elide-line rule can fire on standalone
    // marker comments like `// [!em :5..7]` whose `// ` prefix would
    // otherwise leave non-whitespace on the line. when the comment has any
    // alphanumeric outside the markers (e.g. `// [!em] note`), we only skip
    // the marker bytes and the surrounding text renders as-is.
    if (comment_skips.length > 0) {
      if (is_marker_only_comment(input, start, end, comment_skips)) {
        // never extend the skip range to cover line terminators — the
        // renderer relies on \n bytes as line boundaries, and substituting
        // them would break line tracking. trim trailing \n / \r.
        let trimmed_end = end;
        while (trimmed_end > start) {
          const c = input.charCodeAt(trimmed_end - 1);
          if (c !== 10 && c !== 13) break;
          trimmed_end--;
        }
        skip_ranges.push({
          start,
          end: trimmed_end,
          line: line_of(ensure_line_index(), start),
        });
      } else {
        for (const s of comment_skips) skip_ranges.push(s);
      }
    }
  }

  if (overlays.length === 0 && skip_ranges.length === 0) return undefined;

  return finalize(overlays, classifications, skip_ranges, input, ensure_line_index);
}

function push_overlay(
  out: CollectedOverlay[],
  class_id_for: (name: string) => number,
  overlay: OverlayContribution,
): void {
  if (overlay.start >= overlay.end) return;
  out.push({
    start: overlay.start,
    end: overlay.end,
    class_id: class_id_for(overlay.classification),
    flags: overlay.line_mode ? 1 : 0,
  });
}

// ---------------------------------------------------------------------------
// marker scanning + parsing
// ---------------------------------------------------------------------------

interface ParsedMarker {
  verb: string;
  id?: string;
  args: ParsedArgs;
  marker: SourcePosition;
  spans_newline: boolean;
  error: { kind: NotationIssueKind; message: string } | null;
}

// scan for `[!` from `from` up to `end_exclusive`. returns the byte offset of
// the `[` or -1.
function find_marker_start(input: string, from: number, end_exclusive: number): number {
  for (let i = from; i + 1 < end_exclusive; i++) {
    if (input.charCodeAt(i) === 91 /* [ */ && input.charCodeAt(i + 1) === 33 /* ! */) {
      return i;
    }
  }
  return -1;
}

// parse a marker starting at `[!`. returns null if the form isn't a marker
// at all (so the caller skips past `[!` and keeps scanning); returns a
// ParsedMarker with `error` set when the syntax is recognisable as a marker
// but malformed/unsupported.
function parse_marker(
  input: string,
  open_pos: number,
  comment_end: number,
  line_starts: Int32Array,
): ParsedMarker | null {
  const len = input.length;
  let pos = open_pos + 2; // past `[!`
  const verb_start = pos;
  // verb: [a-zA-Z][a-zA-Z0-9_-]*
  if (pos >= len || !is_alpha(input.charCodeAt(pos))) return null;
  pos++;
  while (pos < len && is_verb_cont(input.charCodeAt(pos))) pos++;
  const verb = input.slice(verb_start, pos);

  // optional `#id`
  let id: string | undefined;
  if (pos < len && input.charCodeAt(pos) === 35 /* # */) {
    pos++;
    const id_start = pos;
    if (pos >= len || !is_alpha(input.charCodeAt(pos))) {
      return make_marker_error(input, open_pos, pos, line_starts, verb, undefined, {
        kind: "malformed",
        message: "expected identifier after `#`",
      });
    }
    pos++;
    while (pos < len && is_verb_cont(input.charCodeAt(pos))) pos++;
    id = input.slice(id_start, pos);
  }

  // optional space then args, then `]`. `]` must appear before the next
  // newline and before the comment ends.
  let args_text = "";
  if (pos < len && input.charCodeAt(pos) === 32 /* space */) {
    pos++;
    const args_start = pos;
    while (
      pos < len &&
      pos < comment_end &&
      input.charCodeAt(pos) !== 93 /* ] */ &&
      input.charCodeAt(pos) !== 10 /* \n */
    ) {
      pos++;
    }
    args_text = input.slice(args_start, pos);
  }

  // either we're at `]`, at `\n`, or at end-of-comment.
  if (pos >= len || pos >= comment_end || input.charCodeAt(pos) !== 93 /* ] */) {
    // not a closed marker on this line. spec: markers must not span newlines.
    if (pos < len && input.charCodeAt(pos) === 10) {
      return make_marker_error(input, open_pos, pos, line_starts, verb, id, {
        kind: "marker_spans_newline",
        message: "marker not closed before newline",
      });
    }
    return null;
  }
  pos++; // past `]`

  const marker: SourcePosition = {
    start: open_pos,
    end: pos,
    line: line_of(line_starts, open_pos),
  };

  const args = parse_args(args_text.trim());
  if (args === null) {
    return {
      verb,
      id,
      args: { kind: "bare" },
      marker,
      spans_newline: false,
      error: {
        kind: "unsupported",
        message: `unsupported argument form: "${args_text}". phase 1 supports bare, +N, :N, :N..M (exclusive), :N...M (inclusive)`,
      },
    };
  }

  return { verb, id, args, marker, spans_newline: false, error: null };
}

function make_marker_error(
  input: string,
  open_pos: number,
  end: number,
  line_starts: Int32Array,
  verb: string,
  id: string | undefined,
  error: { kind: NotationIssueKind; message: string },
): ParsedMarker {
  return {
    verb,
    id,
    args: { kind: "bare" },
    marker: { start: open_pos, end, line: line_of(line_starts, open_pos) },
    spans_newline: error.kind === "marker_spans_newline",
    error,
  };
}

// phase 1 grammar for args:
//   ""       -> bare
//   "+N"     -> lineCount (N >= 1)
//   ":N"     -> lineRef (single line)
//   ":N..M"  -> lineRef, exclusive: lines (N, M) — endpoints excluded
//   ":N...M" -> lineRef, inclusive: lines [N, M] — endpoints included
// the dot rule mirrors the anchor-range syntax (`<a>..<b>` exclusive,
// `<a>...<b>` inclusive). returns null on any other form.
function parse_args(text: string): ParsedArgs | null {
  if (text.length === 0) return { kind: "bare" };

  const first = text.charCodeAt(0);
  if (first === 43 /* + */) {
    const n = parse_int(text, 1);
    if (n === null || n < 1) return null;
    return { kind: "lineCount", count: n };
  }
  if (first === 58 /* : */) {
    const rest = text.slice(1);
    // check for `...` (inclusive) before `..` so the longer separator wins.
    // indexOf("..") would otherwise greedy-match the first two dots of `...`
    // and leave a stray `.` glued to the M operand.
    const tripledot = rest.indexOf("...");
    if (tripledot >= 0) {
      const from = parse_int(rest, 0, tripledot);
      const to = parse_int(rest.slice(tripledot + 3), 0);
      if (from === null || to === null || from < 1 || to < from) return null;
      return { kind: "lineRef", from, to, inclusive: true };
    }
    const dotdot = rest.indexOf("..");
    if (dotdot < 0) {
      const n = parse_int(rest, 0);
      if (n === null || n < 1) return null;
      return { kind: "lineRef", from: n };
    }
    const from = parse_int(rest, 0, dotdot);
    const to = parse_int(rest.slice(dotdot + 2), 0);
    if (from === null || to === null || from < 1 || to < from) return null;
    return { kind: "lineRef", from, to, inclusive: false };
  }
  return null;
}

function parse_int(text: string, from: number, to?: number): number | null {
  const limit = to ?? text.length;
  if (from >= limit) return null;
  let v = 0;
  for (let i = from; i < limit; i++) {
    const c = text.charCodeAt(i);
    if (c < 48 || c > 57) return null;
    v = v * 10 + (c - 48);
  }
  return v;
}

function is_alpha(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function is_verb_cont(code: number): boolean {
  return is_alpha(code) || (code >= 48 && code <= 57) || code === 95 || code === 45;
}

// ---------------------------------------------------------------------------
// line index + range resolution
// ---------------------------------------------------------------------------

// build a sorted Int32Array where line_starts[k] is the byte offset of the
// first char of line k+1. line_starts[0] is always 0; for an n-line input
// the array has length n.
function build_line_starts(input: string): Int32Array {
  let count = 1;
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) === 10) count++;
  }
  const out = new Int32Array(count);
  let line = 1;
  out[0] = 0;
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) === 10) {
      out[line++] = i + 1;
    }
  }
  return out;
}

function line_of(line_starts: Int32Array, byte_offset: number): number {
  // binary search for the largest k where line_starts[k] <= byte_offset.
  let lo = 0;
  let hi = line_starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (line_starts[mid] <= byte_offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

function line_end(line_starts: Int32Array, line_1: number, input_len: number): number {
  if (line_1 >= line_starts.length) return input_len;
  // line_starts[line_1] is the start of (line_1 + 1), which is one past the
  // newline ending line_1. we want the byte offset of the newline itself, but
  // for overlay range purposes "end of line" = start of next line is fine
  // because the renderer applies line-mode overlays to whole line spans.
  return line_starts[line_1];
}

function resolve_phase1_range(
  args: ParsedArgs,
  marker: SourcePosition,
  line_starts: Int32Array,
  input_len: number,
): SourceRange | null {
  const total_lines = line_starts.length;
  let start_line: number;
  let end_line: number;
  switch (args.kind) {
    case "bare":
      start_line = marker.line;
      end_line = marker.line;
      break;
    case "lineCount":
      // +N highlights the N lines BELOW the marker, not including the
      // marker's own line. typical use puts the marker on its own comment
      // line above the code it describes — that comment line is elided
      // (marker-only) so including it would shift the visible count by one.
      start_line = marker.line + 1;
      end_line = Math.min(total_lines, marker.line + args.count);
      if (start_line > total_lines) {
        return { start: 0, end: 0, start_line: marker.line, end_line: marker.line };
      }
      break;
    case "lineRef":
      if (args.from > total_lines) return null;
      if (args.to === undefined) {
        start_line = args.from;
        end_line = args.from;
      } else if (args.inclusive) {
        start_line = args.from;
        end_line = Math.min(total_lines, args.to);
      } else {
        // exclusive: skip both endpoints. degenerate ranges (from..from+1,
        // from..from) collapse to an empty span — the marker text still gets
        // substituted but no line gets highlighted.
        start_line = args.from + 1;
        end_line = Math.min(total_lines, args.to - 1);
        if (end_line < start_line) {
          return { start: 0, end: 0, start_line: marker.line, end_line: marker.line };
        }
      }
      break;
    case "range":
    case "set":
      // phase 2 / 3.
      return null;
  }
  return {
    start: line_starts[start_line - 1],
    end: line_end(line_starts, end_line, input_len),
    start_line,
    end_line,
  };
}

// ---------------------------------------------------------------------------
// finalisation
// ---------------------------------------------------------------------------

function finalize(
  overlays: CollectedOverlay[],
  classifications: string[],
  skip_ranges: SkipRange[],
  input: string,
  ensure_line_index: () => Int32Array,
): OverlayResult {
  // sort overlays by start (stable). Array.prototype.sort isn't stable in all
  // engines for very small inputs, but V8/SpiderMonkey/JSC are stable since
  // ES2019. fine.
  overlays.sort((a, b) => a.start - b.start || a.end - b.end);
  const ranges = new Uint32Array(overlays.length * 4);
  for (let i = 0; i < overlays.length; i++) {
    const o = overlays[i];
    ranges[i * 4] = o.start;
    ranges[i * 4 + 1] = o.end;
    ranges[i * 4 + 2] = o.class_id;
    ranges[i * 4 + 3] = o.flags;
  }

  skip_ranges.sort((a, b) => a.start - b.start);
  const skip = new Uint32Array(skip_ranges.length * 2);
  for (let i = 0; i < skip_ranges.length; i++) {
    skip[i * 2] = skip_ranges[i].start;
    skip[i * 2 + 1] = skip_ranges[i].end;
  }

  const elided_lines = compute_elided_lines(input, skip_ranges, ensure_line_index());

  return {
    ranges,
    classifications,
    skip_ranges: skip,
    elided_lines,
  };
}

// a line is elided if (a) it had any non-whitespace before substitution and
// (b) it has no non-whitespace outside of skip ranges. encoded one-bit-per-
// byte for cheap renderer lookup: elided_lines[line_1 - 1] === 1.
function compute_elided_lines(
  input: string,
  skip_ranges: SkipRange[],
  line_starts: Int32Array,
): Uint8Array {
  const n = line_starts.length;
  const elided = new Uint8Array(n);
  // index of skip ranges per line for cheap iteration. since markers don't
  // span newlines, each skip range is fully contained in a single line.
  // group them by line number.
  const per_line = new Map<number, SkipRange[]>();
  for (const r of skip_ranges) {
    let arr = per_line.get(r.line);
    if (arr === undefined) {
      arr = [];
      per_line.set(r.line, arr);
    }
    arr.push(r);
  }

  for (const [line, ranges] of per_line) {
    const line_start = line_starts[line - 1];
    const line_end_pos = line < n ? line_starts[line] - 1 : input.length;
    let had_non_ws = false;
    let has_non_ws_outside_skip = false;
    let pos = line_start;
    // sort ranges by start to walk in order.
    ranges.sort((a, b) => a.start - b.start);
    for (let k = 0; k < ranges.length; k++) {
      const r = ranges[k];
      if (scan_non_ws(input, pos, r.start)) {
        had_non_ws = true;
        has_non_ws_outside_skip = true;
      }
      // anything inside the skip range counts as "had non-ws before
      // substitution" but not after.
      if (scan_non_ws(input, r.start, r.end)) {
        had_non_ws = true;
      }
      pos = r.end;
    }
    if (scan_non_ws(input, pos, line_end_pos)) {
      had_non_ws = true;
      has_non_ws_outside_skip = true;
    }
    if (had_non_ws && !has_non_ws_outside_skip) {
      elided[line - 1] = 1;
    }
  }

  return elided;
}

function scan_non_ws(input: string, from: number, to: number): boolean {
  for (let i = from; i < to; i++) {
    const c = input.charCodeAt(i);
    if (c !== 32 && c !== 9 && c !== 13) return true;
  }
  return false;
}

// returns true when every byte in [from, to) outside the given marker spans
// is whitespace or non-alphanumeric punctuation (`/`, `*`, `#`, `<`, `>`,
// `-`, `!`, etc.). language-agnostic stand-in for "the comment is
// structurally just a marker": if there's no alphanumeric content outside
// the marker, the comment exists only to host the marker.
function is_marker_only_comment(
  input: string,
  comment_start: number,
  comment_end: number,
  skips: SkipRange[],
): boolean {
  let pos = comment_start;
  for (let k = 0; k < skips.length; k++) {
    const s = skips[k];
    if (has_alnum(input, pos, s.start)) return false;
    pos = s.end;
  }
  if (has_alnum(input, pos, comment_end)) return false;
  return true;
}

function has_alnum(input: string, from: number, to: number): boolean {
  for (let i = from; i < to; i++) {
    const c = input.charCodeAt(i);
    if (
      (c >= 48 && c <= 57) ||
      (c >= 65 && c <= 90) ||
      (c >= 97 && c <= 122) ||
      c === 95 ||
      c >= 128 // non-ASCII (likely letters)
    ) {
      return true;
    }
  }
  return false;
}

// re-export anchor type so plugin authors importing from this module have
// the full surface available without going through the @twinkleplop/core
// barrel.
export type { Anchor };
