import type { OverlayItem, OverlayResult } from "./types";
import { build_line_starts, compute_elided_lines, line_of } from "./annotation";

const LINE_MODE = 1;

interface Collected {
  start: number;
  end: number;
  cls: string;
  flags: number;
}

interface Hidden {
  start: number;
  end: number;
  line: number;
}

// the union is validated at runtime, so fields are read through this loose
// view instead of narrowing per member.
interface Loose {
  start?: unknown;
  end?: unknown;
  class?: unknown;
  line?: unknown;
  lines?: unknown;
  hide?: unknown;
}

export function overlays(
  source: string,
  items: OverlayItem[],
  existing?: OverlayResult,
): OverlayResult {
  if (!Array.isArray(items)) throw new TypeError("overlays must be an array");
  const line_starts = build_line_starts(source);
  const collected: Collected[] = [];
  const hidden: Hidden[] = [];

  if (existing !== undefined) {
    const { ranges, classifications, skip_ranges } = existing;
    for (let r = 0; r < ranges.length; r += 4) {
      collected.push({
        start: ranges[r],
        end: ranges[r + 1],
        cls: classifications[ranges[r + 2]],
        flags: ranges[r + 3],
      });
    }
    for (let s = 0; s < skip_ranges.length; s += 2) {
      push_hidden(hidden, source, line_starts, skip_ranges[s], skip_ranges[s + 1]);
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Loose;
    switch (item_shape(item, i)) {
      case "range": {
        const { start, end } = resolve_bounds(item, i, source, line_starts);
        const cls = valid_class(item.class, i);
        if (start < end) collected.push({ start, end, cls, flags: 0 });
        break;
      }
      case "line": {
        const line = valid_line(item.line, i, "line", line_starts.length);
        collected.push({
          start: line_starts[line - 1],
          end: line_end(line_starts, line, source.length),
          cls: valid_class(item.class, i),
          flags: LINE_MODE,
        });
        break;
      }
      case "lines": {
        const cls = valid_class(item.class, i);
        for (const line of expand_lines(item.lines, i, line_starts.length)) {
          collected.push({
            start: line_starts[line - 1],
            end: line_end(line_starts, line, source.length),
            cls,
            flags: LINE_MODE,
          });
        }
        break;
      }
      case "hide": {
        const { start, end } = resolve_bounds(item, i, source, line_starts);
        push_hidden(hidden, source, line_starts, start, end);
        break;
      }
    }
  }

  return finalize(source, line_starts, collected, hidden, existing);
}

type Shape = "range" | "line" | "lines" | "hide";

const KNOWN_KEYS = new Set(["start", "end", "class", "line", "lines", "hide"]);

function item_shape(item: unknown, index: number): Shape {
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    throw new TypeError(`overlays[${index}] must be an object`);
  }
  const present = new Set<string>();
  for (const key of Object.keys(item)) {
    if ((item as Record<string, unknown>)[key] === undefined) continue;
    if (!KNOWN_KEYS.has(key)) {
      throw new TypeError(`overlays[${index}] has an unknown field "${key}"`);
    }
    present.add(key);
  }
  if (matches(present, "start", "end", "class")) return "range";
  if (matches(present, "line", "class")) return "line";
  if (matches(present, "lines", "class")) return "lines";
  if (matches(present, "start", "end", "hide")) {
    if ((item as { hide: unknown }).hide !== true) {
      throw new TypeError(`overlays[${index}].hide must be true`);
    }
    return "hide";
  }
  throw new TypeError(
    `overlays[${index}] must be { start, end, class }, { line, class }, { lines, class } or { start, end, hide: true }`,
  );
}

function matches(present: Set<string>, ...keys: string[]): boolean {
  if (present.size !== keys.length) return false;
  for (const key of keys) if (!present.has(key)) return false;
  return true;
}

function resolve_bounds(
  item: Loose,
  index: number,
  source: string,
  line_starts: Int32Array,
): { start: number; end: number } {
  const start = resolve_position(item.start, index, "start", source, line_starts);
  const end = resolve_position(item.end, index, "end", source, line_starts);
  if (end < start) {
    throw new RangeError(`overlays[${index}].end (${end}) is before its start (${start})`);
  }
  return { start, end };
}

function resolve_position(
  position: unknown,
  index: number,
  field: string,
  source: string,
  line_starts: Int32Array,
): number {
  if (typeof position === "number") {
    if (!Number.isInteger(position)) {
      throw new RangeError(`overlays[${index}].${field} must be an integer offset`);
    }
    if (position < 0 || position > source.length) {
      throw new RangeError(
        `overlays[${index}].${field} offset ${position} is outside 0..${source.length}`,
      );
    }
    return position;
  }
  if (typeof position !== "object" || position === null) {
    throw new TypeError(`overlays[${index}].${field} must be an offset or { line, character }`);
  }
  const at = position as { line?: unknown; character?: unknown };
  const line = valid_line(at.line, index, `${field}.line`, line_starts.length);
  const character = at.character;
  const length = line_end(line_starts, line, source.length) - line_starts[line - 1];
  const visible = line < line_starts.length ? length - 1 : length;
  if (typeof character !== "number" || !Number.isInteger(character)) {
    throw new RangeError(`overlays[${index}].${field}.character must be an integer`);
  }
  if (character < 0 || character > visible) {
    throw new RangeError(
      `overlays[${index}].${field}.character ${character} is outside 0..${visible} on line ${line}`,
    );
  }
  return line_starts[line - 1] + character;
}

function valid_line(line: unknown, index: number, field: string, count: number): number {
  if (typeof line !== "number" || !Number.isInteger(line)) {
    throw new RangeError(`overlays[${index}].${field} must be an integer line number`);
  }
  if (line < 1 || line > count) {
    throw new RangeError(`overlays[${index}].${field} ${line} is outside 1..${count}`);
  }
  return line;
}

function expand_lines(lines: unknown, index: number, count: number): number[] {
  if (!Array.isArray(lines)) {
    throw new TypeError(`overlays[${index}].lines must be an array`);
  }
  const seen = new Set<number>();
  const out: number[] = [];
  const add = (line: number) => {
    if (seen.has(line)) return;
    seen.add(line);
    out.push(line);
  };
  for (const entry of lines) {
    if (Array.isArray(entry)) {
      if (entry.length !== 2) {
        throw new TypeError(`overlays[${index}].lines pairs must be [from, to]`);
      }
      const from = valid_line(entry[0], index, "lines[from]", count);
      const to = valid_line(entry[1], index, "lines[to]", count);
      if (to < from) {
        throw new RangeError(`overlays[${index}].lines pair [${from}, ${to}] runs backwards`);
      }
      for (let line = from; line <= to; line++) add(line);
      continue;
    }
    add(valid_line(entry, index, "lines", count));
  }
  return out;
}

// the value is emitted into a class attribute verbatim, so the check has to
// exclude every byte that could close the attribute or start a tag.
function valid_class(value: unknown, index: number): string {
  if (typeof value !== "string" || !is_class_list(value)) {
    throw new TypeError(
      `overlays[${index}].class must be one or more css class tokens separated by single spaces`,
    );
  }
  return value;
}

function is_class_list(value: string): boolean {
  const len = value.length;
  if (len === 0) return false;
  let token_start = 0;
  for (let i = 0; i <= len; i++) {
    const c = i < len ? value.charCodeAt(i) : 32;
    if (c === 32) {
      if (i === token_start) return false;
      if (value.charCodeAt(token_start) >= 48 && value.charCodeAt(token_start) <= 57) {
        return false;
      }
      token_start = i + 1;
      continue;
    }
    if (c >= 128) continue;
    if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122)) continue;
    if (c === 45 || c === 95) continue;
    return false;
  }
  return true;
}

function line_end(line_starts: Int32Array, line: number, source_length: number): number {
  return line < line_starts.length ? line_starts[line] : source_length;
}

// the renderer and the elision pass both work one line at a time and never
// see the newline byte, so a hidden range is stored as per-line pieces.
function push_hidden(
  out: Hidden[],
  source: string,
  line_starts: Int32Array,
  start: number,
  end: number,
): void {
  if (start >= end) return;
  const first = line_of(line_starts, start);
  const last = line_of(line_starts, end - 1);
  for (let line = first; line <= last; line++) {
    const ls = line_starts[line - 1];
    const le = line < line_starts.length ? line_starts[line] - 1 : source.length;
    const s = start > ls ? start : ls;
    const e = end < le ? end : le;
    if (s < e) out.push({ start: s, end: e, line });
  }
}

// ordering by class name on ties, and assigning ids in that order, is what
// makes the same items in any order render identically. existing ids are
// kept so a caller's own result stays valid after merging.
function finalize(
  source: string,
  line_starts: Int32Array,
  collected: Collected[],
  hidden: Hidden[],
  existing: OverlayResult | undefined,
): OverlayResult {
  collected.sort(
    (a, b) =>
      a.start - b.start ||
      a.end - b.end ||
      a.flags - b.flags ||
      (a.cls < b.cls ? -1 : a.cls > b.cls ? 1 : 0),
  );

  const classifications: string[] = existing === undefined ? [] : existing.classifications.slice();
  const class_to_id = new Map<string, number>();
  for (let i = 0; i < classifications.length; i++) class_to_id.set(classifications[i], i);

  const ranges = new Uint32Array(collected.length * 4);
  for (let i = 0; i < collected.length; i++) {
    const o = collected[i];
    let id = class_to_id.get(o.cls);
    if (id === undefined) {
      id = classifications.length;
      classifications.push(o.cls);
      class_to_id.set(o.cls, id);
    }
    ranges[i * 4] = o.start;
    ranges[i * 4 + 1] = o.end;
    ranges[i * 4 + 2] = id;
    ranges[i * 4 + 3] = o.flags;
  }

  hidden.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Hidden[] = [];
  for (const h of hidden) {
    const last = merged.length === 0 ? null : merged[merged.length - 1];
    if (last !== null && h.start <= last.end && h.line === last.line) {
      if (h.end > last.end) last.end = h.end;
      continue;
    }
    merged.push({ start: h.start, end: h.end, line: h.line });
  }
  const skip_ranges = new Uint32Array(merged.length * 2);
  for (let i = 0; i < merged.length; i++) {
    skip_ranges[i * 2] = merged[i].start;
    skip_ranges[i * 2 + 1] = merged[i].end;
  }

  return {
    ranges,
    classifications,
    skip_ranges,
    elided_lines: compute_elided_lines(source, merged, line_starts),
  };
}
