// annotation transformer extraction.
//
// post-tokenize pass that walks comment tokens, parses `[!verb[#id][ args]]`
// markers, dispatches to registered plugins, and collects overlay
// contributions into an OverlayResult that the renderer applies.
//
// the extractor is built once at language-factory time. it captures the
// resolved comment_id, verb -> plugin map, and any parser preflight. when
// `LanguageOptions.annotation` is undefined the extractor is never built;
// the LanguageFn closure is identical to today's. see create_language for
// the integration point.
//
// argument forms supported:
//   bare            line containing the marker (line-mode)
//   +N              N lines below the marker (line-mode)
//   :N              absolute line N (line-mode)
//   :N..M / :N...M  absolute line range, exclusive / inclusive (line-mode)
//   <a>..<b>        anchor range, both exclusive (token-mode)
//   <a>...<b>       anchor range, both inclusive (token-mode)
//   <a>.. / <a>...  half-open start; pairs with a closing marker
//   ..<b> / ...<b>  half-open end; pairs with an opening marker
//   =<a>            set form: every occurrence of the anchor (token-mode)
//   =<a> +N / :N / :N..M / :N...M / :*
//                   set form scoped to those lines instead of the marker's
// anchors: bare word [A-Za-z0-9_]+, "quoted literal", * wildcard.
//
// plugins registered with `parse: "raw"` receive the argument text as a
// string and resolve fragments of the grammar above on demand through
// `resolve` / `resolve_all` on their input.

import type {
  Anchor,
  AnnotationConfig,
  AnnotationIssue,
  AnnotationIssueKind,
  AnnotationOutput,
  AnnotationPlugin,
  OverlayContribution,
  OverlayResult,
  ParsedArgs,
  SetScope,
  SourcePosition,
  SourceRange,
  TokenizeResult,
} from "./types";

// ---------------------------------------------------------------------------
// public entry: build_annotation_extractor
// ---------------------------------------------------------------------------
//
// called once per language factory invocation. validates the plugin set,
// resolves the comment_id against the grammar's token_types, and returns a
// closure that runs extraction against (input, tokenize_result).

export type AnnotationExtractor = (
  input: string,
  result: TokenizeResult,
) => OverlayResult | undefined;

export function build_annotation_extractor(
  config: AnnotationConfig,
  token_types: string[],
): AnnotationExtractor {
  const verb_to_plugin = build_verb_map(config.plugins);
  const comment_id = token_types.indexOf("comment");
  // when the host grammar has no comment token, annotation is inert: every
  // call returns undefined immediately. this is the only no-op the extractor
  // ever takes when annotation IS configured; we still hit the closure but
  // the body short-circuits on the first comment-token lookup.
  return (input, result) => {
    if (comment_id < 0) return undefined;
    // whole-input short-circuit: if `[!` doesn't appear anywhere in the
    // source, no comment can contain a marker, so we skip the per-comment
    // walk entirely. native indexOf is far cheaper than the per-comment
    // charCodeAt loop and turns "annotation enabled but no markers" into a
    // near-free path for the common adopted-but-unused case.
    if (input.indexOf("[!") < 0) return undefined;
    return run_extraction(input, result, verb_to_plugin, comment_id, config.on_error);
  };
}

function build_verb_map(plugins: AnnotationPlugin[]): Map<string, AnnotationPlugin> {
  const map = new Map<string, AnnotationPlugin>();
  for (const plugin of plugins) {
    for (const verb of plugin.verbs) {
      if (map.has(verb)) {
        throw new Error(`annotation: verb "${verb}" claimed by multiple plugins`);
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

export interface SkipRange {
  start: number;
  end: number;
  // 1-indexed line containing the marker. lets the elide step decide
  // whether the line went whitespace-only post-substitution.
  line: number;
}

// per-half-open marker entry on the pair stack. when a closing marker
// arrives we pop the most recent entry that matches `(verb, id)` and
// dispatch the combined range to the start marker's plugin.
interface PendingPair {
  marker: SourcePosition;
  verb: string;
  id?: string;
  from: Anchor;
  inclusive_start: boolean;
  standalone: boolean;
}

interface FoundMarker {
  parsed: ParsedMarker;
  plugin: AnnotationPlugin;
}

// thrown by the resolve helpers so a failure carries the issue kind the
// framework would have reported for the same fragment in a shared marker.
class ResolveError extends Error {
  kind: AnnotationIssueKind;
  constructor(kind: AnnotationIssueKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

function run_extraction(
  input: string,
  result: TokenizeResult,
  verb_to_plugin: Map<string, AnnotationPlugin>,
  comment_id: number,
  on_error: ((issue: AnnotationIssue) => void) | undefined,
): OverlayResult | undefined {
  const tokens = result.tokens;
  const n = tokens.length / 3;

  const overlays: CollectedOverlay[] = [];
  const skip_ranges: SkipRange[] = [];
  const class_to_id = new Map<string, number>();
  const classifications: string[] = [];
  let line_index: Int32Array | null = null;
  // built lazily on the first anchor lookup; pre-extraction grammars without
  // comment-typed tokens have already been short-circuited above.
  let comment_ranges: Uint32Array | null = null;
  const ensure_comment_ranges = (): Uint32Array => {
    if (comment_ranges === null) comment_ranges = build_comment_ranges(tokens, comment_id);
    return comment_ranges;
  };

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

  const report = (kind: AnnotationIssueKind, message: string, position: SourcePosition) => {
    const issue: AnnotationIssue = { kind, message, position };
    if (on_error) {
      on_error(issue);
      return;
    }
    // default policy: warn, don't throw. an in-progress edit (e.g. `[!hl
    // :10..]` mid-keystroke) shouldn't take down the whole render and leave
    // the editor staring at stale state. consumers that want strict
    // validation can pass an on_error that throws.
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn(`twinkleplop annotation [${kind}] at line ${position.line}: ${message}`);
    }
  };

  // pair stack scoped by `(verb, id)`. half-open starts push, half-open
  // ends pop the matching stack and dispatch the combined range. unmatched
  // entries surface as errors after the comment-token walk completes.
  const pair_stack = new Map<string, PendingPair[]>();
  const pair_key = (verb: string, id?: string) => verb + "\0" + (id ?? "");

  const own_line_range = (marker: SourcePosition): SourceRange => {
    const lines = ensure_line_index();
    return {
      start: line_start_of(lines, marker.line),
      end: line_end_of(lines, marker.line, input.length),
      start_line: marker.line,
      end_line: marker.line,
    };
  };

  // every non-paired argument form resolves here, for shared markers and
  // for fragments a raw plugin hands back through `resolve`.
  const resolve_parsed = (args: ParsedArgs, marker: SourcePosition): SourceRange[] => {
    const lines = ensure_line_index();
    switch (args.kind) {
      case "wholeLine":
        return [own_line_range(marker)];
      case "set": {
        const span = resolve_set_scope(args.scope, marker, lines, input.length);
        if (span === null) {
          throw new ResolveError("malformed", `set scope names a line that does not exist`);
        }
        const matches = resolve_anchor_all(
          input,
          args.anchor,
          span.start,
          span.end,
          ensure_comment_ranges(),
        );
        if (matches.length === 0) {
          throw new ResolveError("anchor_not_found", `set anchor matched zero occurrences`);
        }
        const out: SourceRange[] = [];
        for (const m of matches) {
          out.push({
            start: m.start,
            end: m.end,
            start_line: line_of(lines, m.start),
            end_line: line_of(lines, Math.max(m.start, m.end - 1)),
          });
        }
        return out;
      }
      case "range": {
        if (args.from === null || args.to === null) {
          throw new ResolveError("malformed", `half-open range cannot be resolved outside a pair`);
        }
        const range = resolve_anchor_range(
          args.from,
          args.to,
          args.inclusive_start,
          args.inclusive_end,
          marker,
          marker,
          input,
          lines,
          ensure_comment_ranges(),
        );
        if (range === null) throw new ResolveError("anchor_not_found", `anchor not found`);
        return [range];
      }
      default: {
        const range = resolve_line_mode(args, marker, lines, input.length);
        if (range === null) throw new ResolveError("malformed", `unable to resolve marker range`);
        return [range];
      }
    }
  };

  const resolve_fragment = (fragment: string, marker: SourcePosition): SourceRange[] => {
    const args = parse_args(fragment, 0, fragment.length);
    if (args === null) throw new ResolveError("malformed", `malformed argument: "${fragment}"`);
    return resolve_parsed(args, marker);
  };

  // hand `args` + `range` to the plugin under `marker`. returns false when
  // the plugin declined the marker so its text stays in the output.
  const dispatch = (
    plugin: AnnotationPlugin,
    verb: string,
    id: string | undefined,
    args: ParsedArgs | string,
    range: SourceRange,
    marker: SourcePosition,
    standalone: boolean,
  ): boolean => {
    let output: AnnotationOutput | void;
    try {
      output = plugin.handle({
        verb,
        id,
        args,
        range,
        marker,
        standalone,
        resolve: (fragment) => resolve_fragment(fragment, marker)[0],
        resolve_all: (fragment) => resolve_fragment(fragment, marker),
      });
    } catch (err) {
      if (err instanceof ResolveError) {
        report(err.kind, err.message, marker);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        report("malformed", `plugin "${verb}" threw: ${message}`, marker);
      }
      return true;
    }
    if (!output) return true;
    if (output.overlays) {
      for (const overlay of output.overlays) {
        if (overlay.start < 0 || overlay.end > input.length) {
          throw new RangeError(
            `annotation: plugin "${verb}" emitted an overlay outside the source (${overlay.start}..${overlay.end}, source length ${input.length})`,
          );
        }
        push_overlay(overlays, class_id_for, overlay);
      }
    }
    if (output.issues) {
      for (const issue of output.issues) {
        report(issue.kind, issue.message, issue.position ?? marker);
      }
    }
    return output.consumed !== false;
  };

  const dispatch_shared = (
    plugin: AnnotationPlugin,
    parsed: ParsedMarker,
    standalone: boolean,
  ): boolean => {
    const marker = parsed.marker;
    const args = parse_args(input, parsed.args_start, parsed.args_end);
    if (args === null) {
      report(
        "malformed",
        `malformed argument: "${input.slice(parsed.args_start, parsed.args_end)}"`,
        marker,
      );
      return false;
    }

    if (args.kind === "range" && (args.from === null || args.to === null)) {
      if (args.from !== null) {
        // half-open start: push and wait for the closing marker.
        const key = pair_key(parsed.verb, parsed.id);
        let stack = pair_stack.get(key);
        if (stack === undefined) {
          stack = [];
          pair_stack.set(key, stack);
        }
        stack.push({
          marker,
          verb: parsed.verb,
          id: parsed.id,
          from: args.from,
          inclusive_start: args.inclusive_start,
          standalone,
        });
        return true;
      }
      if (args.to === null) {
        // both null: parser shouldn't have produced this; defensive.
        report("malformed", `range with no anchors`, marker);
        return true;
      }
      // half-open end: pop the matching opener and dispatch the pair.
      const key = pair_key(parsed.verb, parsed.id);
      const stack = pair_stack.get(key);
      const opener = stack && stack.length > 0 ? stack.pop() : undefined;
      if (opener === undefined) {
        report(
          "unmatched_pair",
          `unmatched close for "[!${parsed.verb}${parsed.id ? "#" + parsed.id : ""}]"`,
          marker,
        );
        return true;
      }
      const range = resolve_anchor_range(
        opener.from,
        args.to,
        opener.inclusive_start,
        args.inclusive_end,
        opener.marker,
        marker,
        input,
        ensure_line_index(),
        ensure_comment_ranges(),
      );
      if (range === null) {
        report("anchor_not_found", `anchor not found`, marker);
        return true;
      }
      // synthesise the fully-resolved args so the plugin sees both
      // endpoints regardless of which marker carried which side, and
      // dispatch under the OPENER's position so diagnostics point at the
      // start of the pair.
      const merged: ParsedArgs = {
        kind: "range",
        from: opener.from,
        to: args.to,
        inclusive_start: opener.inclusive_start,
        inclusive_end: args.inclusive_end,
      };
      return dispatch(
        plugin,
        parsed.verb,
        parsed.id,
        merged,
        range,
        opener.marker,
        opener.standalone,
      );
    }

    let ranges: SourceRange[];
    try {
      ranges = resolve_parsed(args, marker);
    } catch (err) {
      if (err instanceof ResolveError) {
        report(err.kind, err.message, marker);
        return true;
      }
      throw err;
    }
    let consumed = true;
    for (const range of ranges) {
      if (!dispatch(plugin, parsed.verb, parsed.id, args, range, marker, standalone)) {
        consumed = false;
      }
    }
    return consumed;
  };

  for (let i = 0; i < n; i++) {
    if (tokens[i * 3] !== comment_id) continue;
    const start = tokens[i * 3 + 1];
    const end = tokens[i * 3 + 2];

    // the first pass collects every marker with a registered verb. dispatch
    // waits until the whole comment is known because `standalone` depends
    // on whether the comment holds anything besides markers.
    const found: FoundMarker[] = [];
    let pos = start;
    while (pos < end) {
      const at = find_marker_start(input, pos, end);
      if (at < 0) break;
      // escaped form `\[!...]` — the marker stays literal comment text.
      if (at > start && input.charCodeAt(at - 1) === 92 /* \ */) {
        pos = at + 2;
        continue;
      }

      const parsed = parse_marker(input, at, end, ensure_line_index());
      if (parsed === null) {
        // not a valid marker shape (`[!` without closing `]` on the same line,
        // empty verb, etc). skip past the `[!` and keep scanning.
        pos = at + 2;
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

      found.push({ parsed, plugin });
      pos = parsed.marker.end;
    }
    if (found.length === 0) continue;

    const markers_only = is_marker_only_comment(input, start, end, found_spans(found));
    const comment_skips: SkipRange[] = [];
    for (const { parsed, plugin } of found) {
      const marker = parsed.marker;
      const standalone =
        markers_only &&
        line_holds_only_comment(input, ensure_line_index(), marker.line, start, end);
      const consumed =
        plugin.parse === "raw"
          ? dispatch(
              plugin,
              parsed.verb,
              parsed.id,
              input.slice(parsed.raw_start, parsed.args_end),
              own_line_range(marker),
              marker,
              standalone,
            )
          : dispatch_shared(plugin, parsed, standalone);
      if (consumed) {
        comment_skips.push({ start: marker.start, end: marker.end, line: marker.line });
      }
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

  // any leftover half-open opens are unmatched — surface each one.
  for (const stack of pair_stack.values()) {
    for (const pending of stack) {
      report(
        "unmatched_pair",
        `unmatched open for "[!${pending.verb}${pending.id ? "#" + pending.id : ""}]"`,
        pending.marker,
      );
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

function found_spans(found: FoundMarker[]): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  for (let i = 0; i < found.length; i++) out.push(found[i].parsed.marker);
  return out;
}

// true when nothing but whitespace shares line `line_1` with the comment
// spanning [comment_start, comment_end). a block comment covering the whole
// line trivially qualifies.
function line_holds_only_comment(
  input: string,
  line_starts: Int32Array,
  line_1: number,
  comment_start: number,
  comment_end: number,
): boolean {
  const line_start = line_start_of(line_starts, line_1);
  const line_end = line_end_of(line_starts, line_1, input.length);
  if (comment_start > line_start && scan_non_ws(input, line_start, comment_start)) return false;
  if (comment_end < line_end && scan_non_ws(input, comment_end, line_end)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// marker scanning + parsing
// ---------------------------------------------------------------------------

interface ParsedMarker {
  verb: string;
  id?: string;
  // [args_start, args_end) is the argument text with whitespace trimmed on
  // both sides, for the shared parsers. raw_start keeps leading whitespace
  // after the single separating space, for `parse: "raw"` plugins.
  args_start: number;
  args_end: number;
  raw_start: number;
  marker: SourcePosition;
  spans_newline: boolean;
  error: { kind: AnnotationIssueKind; message: string } | null;
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
  // newline and before the comment ends. quotes are tracked so that `]`
  // inside `"..."` (with `\"` / `\\` escapes) is treated as anchor content
  // rather than as the marker close. a backslash escapes the next byte
  // outside quotes too, so raw plugins can accept `\]` in their arguments.
  //
  // we deliberately don't materialize the args as a string here. the parsers
  // below all operate on `(input, start, end)` indices, so the only string
  // allocations down the args parsing path are anchor values that the
  // overlay resolver actually needs.
  let args_start = pos;
  let args_end = pos;
  let raw_start = pos;
  if (pos < len && input.charCodeAt(pos) === 32 /* space */) {
    pos++;
    args_start = pos;
    raw_start = pos;
    let in_quote = false;
    while (pos < len && pos < comment_end) {
      const c = input.charCodeAt(pos);
      if (c === 10 /* \n */) break;
      if (c === 92 /* \ */ && pos + 1 < comment_end && input.charCodeAt(pos + 1) !== 10) {
        pos += 2;
        continue;
      }
      if (in_quote) {
        if (c === 34 /* " */) in_quote = false;
        pos++;
        continue;
      }
      if (c === 34 /* " */) {
        in_quote = true;
        pos++;
        continue;
      }
      if (c === 93 /* ] */) break;
      pos++;
    }
    args_end = pos;
    // inline trim — the parsers expect a tight range, no leading/trailing
    // whitespace. matches `String.prototype.trim` for the ascii whitespace
    // we care about (space, tab, cr); newlines never appear here because the
    // scan above breaks on `\n`.
    while (args_start < args_end) {
      const c = input.charCodeAt(args_start);
      if (c !== 32 && c !== 9 && c !== 13) break;
      args_start++;
    }
    while (args_end > args_start) {
      const c = input.charCodeAt(args_end - 1);
      if (c !== 32 && c !== 9 && c !== 13) break;
      args_end--;
    }
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

  return { verb, id, args_start, args_end, raw_start, marker, spans_newline: false, error: null };
}

function make_marker_error(
  input: string,
  open_pos: number,
  end: number,
  line_starts: Int32Array,
  verb: string,
  id: string | undefined,
  error: { kind: AnnotationIssueKind; message: string },
): ParsedMarker {
  return {
    verb,
    id,
    args_start: end,
    args_end: end,
    raw_start: end,
    marker: { start: open_pos, end, line: line_of(line_starts, open_pos) },
    spans_newline: error.kind === "marker_spans_newline",
    error,
  };
}

// the parsers below all operate on `(input, start, end)` triples directly
// over the source string — never on a sliced/copied substring. this keeps
// the args parsing path allocation-free apart from the unavoidable anchor
// values (which the resolver needs as strings for `input.indexOf`).

// dispatch on the first character: `+` -> lineCount, `:` -> lineRef, `=` ->
// set, leading `.` -> half-open end, anything else -> word/quoted/wildcard
// anchor (closed range or half-open start). `***` is a special token-mode
// shorthand for the whole marker line. returns null on any malformed form
// so the caller can report it as "unsupported" with the source location.
function parse_args(input: string, start: number, end: number): ParsedArgs | null {
  if (start >= end) return { kind: "bare" };

  // `***` (exactly three stars, nothing else) — whole-line token-mode.
  if (
    end - start === 3 &&
    input.charCodeAt(start) === 42 /* * */ &&
    input.charCodeAt(start + 1) === 42 &&
    input.charCodeAt(start + 2) === 42
  ) {
    return { kind: "wholeLine" };
  }

  const first = input.charCodeAt(start);
  if (first === 43 /* + */) {
    const n = parse_int(input, start + 1, end);
    if (n === null || n < 1) return null;
    return { kind: "lineCount", count: n };
  }
  if (first === 58 /* : */) return parse_line_ref(input, start + 1, end);
  if (first === 61 /* = */) return parse_set(input, start + 1, end);
  return parse_anchor_range(input, start, end);
}

function parse_line_ref(input: string, start: number, end: number): ParsedArgs | null {
  // check for `...` before `..` so the longer separator wins. indexOf("..")
  // would otherwise greedy-match the first two dots of `...` and leave a
  // stray `.` glued to the M operand.
  const tripledot = bounded_index_of(input, "...", start, end);
  if (tripledot >= 0) {
    const from = parse_int(input, start, tripledot);
    const to = parse_int(input, tripledot + 3, end);
    if (from === null || to === null || from < 1 || to < from) return null;
    return { kind: "lineRef", from, to, inclusive: true };
  }
  const dotdot = bounded_index_of(input, "..", start, end);
  if (dotdot < 0) {
    const n = parse_int(input, start, end);
    if (n === null || n < 1) return null;
    return { kind: "lineRef", from: n };
  }
  const from = parse_int(input, start, dotdot);
  const to = parse_int(input, dotdot + 2, end);
  if (from === null || to === null || from < 1 || to < from) return null;
  return { kind: "lineRef", from, to, inclusive: false };
}

function parse_set(input: string, start: number, end: number): ParsedArgs | null {
  // skip optional leading whitespace, then a single anchor, then an optional
  // line scope, then trailing ws.
  let pos = skip_ws(input, start, end);
  const a = parse_anchor(input, pos, end);
  if (a === null) return null;
  pos = skip_ws(input, a.next, end);
  // wildcard set is meaningless: it would expand to a single match covering
  // the whole source. reject so callers see a clear error rather than a
  // surprising no-op.
  if (a.anchor.kind === "wildcard") return null;
  if (pos === end) return { kind: "set", anchor: a.anchor };
  const scope = parse_set_scope(input, pos, end);
  if (scope === null) return null;
  return { kind: "set", anchor: a.anchor, scope };
}

// `+N`, `:N`, `:N..M`, `:N...M` or `:*` after a set anchor.
function parse_set_scope(input: string, start: number, end: number): SetScope | null {
  const first = input.charCodeAt(start);
  if (first === 43 /* + */) {
    const n = parse_int(input, start + 1, end);
    if (n === null || n < 1) return null;
    return { kind: "lineCount", count: n };
  }
  if (first !== 58 /* : */) return null;
  if (end - start === 2 && input.charCodeAt(start + 1) === 42 /* * */) return { kind: "all" };
  const ref = parse_line_ref(input, start + 1, end);
  if (ref === null || ref.kind !== "lineRef") return null;
  return ref;
}

// anchor range: `a..b`, `a...b`, `a..`, `a...`, `..b`, `...b`. wildcards may
// stand in for any anchor position (`*..foo`, `bar..*`).
function parse_anchor_range(input: string, start: number, end: number): ParsedArgs | null {
  let pos = skip_ws(input, start, end);
  let from: Anchor | null = null;
  if (pos < end && input.charCodeAt(pos) !== 46 /* . */) {
    const a = parse_anchor(input, pos, end);
    if (a === null) return null;
    from = a.anchor;
    pos = a.next;
  }
  pos = skip_ws(input, pos, end);

  // separator: `...` (inclusive on this side) or `..` (exclusive). check the
  // longer one first so `a...b` doesn't tokenize as `a` `..` `.b`.
  let inclusive_left: boolean;
  if (pos + 3 <= end && input.startsWith("...", pos)) {
    inclusive_left = true;
    pos += 3;
  } else if (pos + 2 <= end && input.startsWith("..", pos)) {
    inclusive_left = false;
    pos += 2;
  } else {
    return null;
  }
  pos = skip_ws(input, pos, end);

  let to: Anchor | null = null;
  const inclusive_right = inclusive_left;
  if (pos < end) {
    const a = parse_anchor(input, pos, end);
    if (a === null) return null;
    to = a.anchor;
    pos = a.next;
  }
  pos = skip_ws(input, pos, end);
  if (pos !== end) return null;

  // require at least one side present; bare `..` / `...` is meaningless.
  if (from === null && to === null) return null;

  // for closed ranges the dot count applies to both endpoints (per spec
  // table). for half-open markers, the dot count picks the inclusivity
  // of the present anchor only; the missing side gets a placeholder that
  // will be overwritten when the pair resolves.
  return {
    kind: "range",
    from,
    to,
    inclusive_start: from !== null ? inclusive_left : inclusive_right,
    inclusive_end: to !== null ? inclusive_right : inclusive_left,
  };
}

// parse a single anchor at position `pos` within [pos, end). returns the
// anchor and the index just past it, or null on failure.
function parse_anchor(
  input: string,
  pos: number,
  end: number,
): { anchor: Anchor; next: number } | null {
  if (pos >= end) return null;
  const c = input.charCodeAt(pos);
  if (c === 42 /* * */) {
    return { anchor: { kind: "wildcard" }, next: pos + 1 };
  }
  if (c === 34 /* " */) return parse_quoted(input, pos, end);
  if (is_word_char(c)) {
    let p = pos;
    while (p < end && is_word_char(input.charCodeAt(p))) p++;
    // anchor value is needed as a string by `resolve_anchor` (input.indexOf);
    // this slice is the only unavoidable allocation in the args path.
    return { anchor: { kind: "word", value: input.slice(pos, p) }, next: p };
  }
  return null;
}

function parse_quoted(
  input: string,
  pos: number,
  end: number,
): { anchor: Anchor; next: number } | null {
  // already validated input[pos] === '"'; collect until matching closing
  // quote, honouring `\"` and `\\` escapes per spec.
  let i = pos + 1;
  let value = "";
  let chunk_start = i;
  while (i < end) {
    const c = input.charCodeAt(i);
    if (c === 34 /* " */) {
      if (i > chunk_start) value += input.slice(chunk_start, i);
      return { anchor: { kind: "literal", value }, next: i + 1 };
    }
    if (c === 92 /* \ */) {
      if (i + 1 >= end) return null;
      const next_c = input.charCodeAt(i + 1);
      if (next_c !== 34 && next_c !== 92) return null;
      if (i > chunk_start) value += input.slice(chunk_start, i);
      value += String.fromCharCode(next_c);
      i += 2;
      chunk_start = i;
      continue;
    }
    i++;
  }
  return null;
}

function skip_ws(input: string, pos: number, end: number): number {
  while (pos < end && input.charCodeAt(pos) === 32) pos++;
  return pos;
}

// indexOf bounded by `[start, end)`. returns -1 when the needle would extend
// past `end`, even if it occurs later in `input`.
function bounded_index_of(input: string, needle: string, start: number, end: number): number {
  const idx = input.indexOf(needle, start);
  return idx < 0 || idx + needle.length > end ? -1 : idx;
}

function is_word_char(c: number): boolean {
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95;
}

function parse_int(input: string, from: number, to: number): number | null {
  if (from >= to) return null;
  let v = 0;
  for (let i = from; i < to; i++) {
    const c = input.charCodeAt(i);
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
export function build_line_starts(input: string): Int32Array {
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

export function line_of(line_starts: Int32Array, byte_offset: number): number {
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

// resolve a line-mode args (bare / +N / :N / :N..M / :N...M) to a SourceRange
// covering whole lines. anchor ranges and set form are handled separately
// (resolve_anchor_range, resolve_set).
function resolve_line_mode(
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
    default:
      // range / set are not line-mode; caller routes them elsewhere.
      return null;
  }
  return {
    start: line_starts[start_line - 1],
    end: line_end(line_starts, end_line, input_len),
    start_line,
    end_line,
  };
}

// byte span the set form searches: the marker's own line by default, the
// scoped lines otherwise. null when a line ref names a missing line.
function resolve_set_scope(
  scope: SetScope | undefined,
  marker: SourcePosition,
  line_starts: Int32Array,
  input_len: number,
): { start: number; end: number } | null {
  if (scope === undefined) {
    return {
      start: line_start_of(line_starts, marker.line),
      end: line_end_of(line_starts, marker.line, input_len),
    };
  }
  if (scope.kind === "all") return { start: 0, end: input_len };
  const range = resolve_line_mode(scope, marker, line_starts, input_len);
  if (range === null) return null;
  return { start: range.start, end: range.end };
}

// resolve a closed anchor range to a byte-level SourceRange.
//
// anchor lookup is bounded to the marker's own line — markers can't reach
// outside the line they sit on, except for half-open pairs where the
// opener's anchor is searched on the OPENER's line and the closer's anchor
// on the CLOSER's line (so the spanning range emerges from two
// independently bounded lookups, not from a global scan).
//
// anchors point at CODE, not at the marker comment itself — the marker's
// own bytes (and any other comment on the same line) would otherwise shadow
// the real anchor (consider `foo // [!em foo..bar]` where `foo` literally
// appears in the marker text). we pass the sorted comment_ranges in and
// skip any candidate match that falls inside a comment. the TO anchor is
// searched from the FROM match's END (not start), so two adjacent
// occurrences of the same anchor like `"x"..."x"` correctly bracket the
// pair instead of the parser finding the same byte twice.
//
// wildcards are line-relative to the marker that physically contains the
// `*`: `*..b` starts at the opener line's start, `a..*` ends at the
// closer line's end. for paired half-open `my_users...` ... `...*`, this
// gives the natural "wrap this block" reading.
function resolve_anchor_range(
  from: Anchor,
  to: Anchor,
  inclusive_start: boolean,
  inclusive_end: boolean,
  from_marker: SourcePosition,
  to_marker: SourcePosition,
  input: string,
  line_starts: Int32Array,
  comment_ranges: Uint32Array,
): SourceRange | null {
  // both wildcards is malformed: there's no anchor to draw the line from.
  // the parser doesn't reject this earlier so the diagnostic surfaces
  // here as anchor_not_found rather than failing silently.
  if (from.kind === "wildcard" && to.kind === "wildcard") return null;

  const from_line_start = line_start_of(line_starts, from_marker.line);
  const from_line_end = line_end_of(line_starts, from_marker.line, input.length);
  const to_line_start = line_start_of(line_starts, to_marker.line);
  const to_line_end = line_end_of(line_starts, to_marker.line, input.length);

  const a =
    from.kind === "wildcard"
      ? null
      : resolve_anchor(input, from, from_line_start, from_line_end, comment_ranges);
  if (from.kind !== "wildcard" && a === null) return null;

  // for the TO anchor, when the markers sit on the same line, start the
  // search after FROM's match end so `"x"..."x"` correctly brackets the
  // pair. for paired half-open markers on different lines, FROM is on a
  // strictly earlier line, so we begin at the closer line's start.
  const to_search_from = a !== null && from_marker.line === to_marker.line ? a.end : to_line_start;
  const b =
    to.kind === "wildcard"
      ? null
      : resolve_anchor(input, to, to_search_from, to_line_end, comment_ranges);
  if (to.kind !== "wildcard" && b === null) return null;

  let start_byte: number;
  let end_byte: number;
  if (from.kind === "wildcard") {
    // `*..b` (or paired `...*` opener): start at the beginning of the
    // marker that hosts the `*` literal.
    start_byte = from_line_start;
  } else {
    start_byte = inclusive_start ? a!.start : a!.end;
  }
  if (to.kind === "wildcard") {
    // `a..*` (or paired `...*` closer): end at the end of the marker
    // that hosts the `*` literal.
    end_byte = to_line_end;
  } else {
    end_byte = inclusive_end ? b!.end : b!.start;
  }
  if (end_byte < start_byte) end_byte = start_byte;
  return {
    start: start_byte,
    end: end_byte,
    start_line: line_of(line_starts, start_byte),
    end_line: line_of(line_starts, Math.max(start_byte, end_byte - 1)),
  };
}

// byte offset of the first char of line `line_1` (1-indexed).
function line_start_of(line_starts: Int32Array, line_1: number): number {
  return line_starts[line_1 - 1];
}

// byte offset just past the last non-newline char of line `line_1`. for the
// final unterminated line, returns input length.
function line_end_of(line_starts: Int32Array, line_1: number, input_len: number): number {
  return line_1 < line_starts.length ? line_starts[line_1] - 1 : input_len;
}

// find the first occurrence of `anchor` in `[from_offset, to_offset)` that
// is NOT inside a comment region. word anchors require word boundaries on
// both sides; literal anchors are substring matches; wildcard is handled
// by callers (different start/end semantics).
function resolve_anchor(
  input: string,
  anchor: Anchor,
  from_offset: number,
  to_offset: number,
  comment_ranges: Uint32Array,
): { start: number; end: number } | null {
  if (anchor.kind === "wildcard") return null;
  const value = anchor.value;
  if (value.length === 0) return null;
  let pos = from_offset;
  while (pos + value.length <= to_offset) {
    const idx = input.indexOf(value, pos);
    if (idx < 0 || idx + value.length > to_offset) return null;
    // skip past the enclosing comment if the candidate landed inside one.
    const cend = comment_end_containing(comment_ranges, idx);
    if (cend >= 0) {
      pos = cend;
      continue;
    }
    if (anchor.kind === "word") {
      const before_ok = idx === 0 || !is_word_char(input.charCodeAt(idx - 1));
      const after_pos = idx + value.length;
      const after_ok = after_pos >= input.length || !is_word_char(input.charCodeAt(after_pos));
      if (!before_ok || !after_ok) {
        pos = idx + 1;
        continue;
      }
    }
    return { start: idx, end: idx + value.length };
  }
  return null;
}

// find every occurrence of `anchor` in `[from_offset, to_offset)` outside
// comment regions. used for set form, scoped to the marker's own line.
function resolve_anchor_all(
  input: string,
  anchor: Anchor,
  from_offset: number,
  to_offset: number,
  comment_ranges: Uint32Array,
): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let pos = from_offset;
  while (pos < to_offset) {
    const m = resolve_anchor(input, anchor, pos, to_offset, comment_ranges);
    if (m === null) break;
    out.push(m);
    // advance at least one byte so zero-length anchors (rejected upstream
    // via length === 0) can never spin forever.
    pos = Math.max(m.end, m.start + 1);
  }
  return out;
}

// build a sorted Uint32Array of [start, end, start, end, ...] for every
// comment-typed token in the result. used by the anchor resolver to skip
// matches inside marker text.
function build_comment_ranges(tokens: Uint32Array, comment_id: number): Uint32Array {
  let n = 0;
  for (let i = 0; i < tokens.length; i += 3) {
    if (tokens[i] === comment_id) n++;
  }
  const out = new Uint32Array(n * 2);
  let w = 0;
  for (let i = 0; i < tokens.length; i += 3) {
    if (tokens[i] === comment_id) {
      out[w++] = tokens[i + 1];
      out[w++] = tokens[i + 2];
    }
  }
  return out;
}

// returns the end byte of the comment range containing `pos`, or -1 when
// `pos` isn't inside any comment. binary search over a flat array of
// [start, end) pairs.
function comment_end_containing(ranges: Uint32Array, pos: number): number {
  if (ranges.length === 0) return -1;
  // find the largest range whose start <= pos
  let lo = 0;
  let hi = ranges.length / 2 - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const s = ranges[mid * 2];
    if (s <= pos) lo = mid + 1;
    else hi = mid - 1;
  }
  // hi is now the candidate index (or -1).
  if (hi < 0) return -1;
  const e = ranges[hi * 2 + 1];
  return pos < e ? e : -1;
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
export function compute_elided_lines(
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
  skips: { start: number; end: number }[],
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
