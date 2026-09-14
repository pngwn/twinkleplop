// `[!code ...]` compatibility with @shikijs/transformers 4.4.3, so content
// written for shiki highlights without edits.
//
//   highlight / hl / focus / ++ / -- / error / warning / info [:N]  line-mode
//   word:text [:N]                                                 token-mode
//
// line selection follows shiki's v3 matching: a marker on its own line
// applies to the N lines below it, a trailing marker to its own line and
// the N-1 below. occurrences inside comments are skipped for `word`, where
// shiki only skips the marker's own comment. an argument shiki would not
// recognise is left as comment text and not reported, as shiki leaves it.

import type { AnnotationPlugin, OverlayContribution, SourceRange } from "@twinkleplop/core";

export interface ShikiNotationOptions {
  // "twinkleplop" (default) shares class names with the built in verbs so
  // one theme covers both syntaxes; "shiki" keeps existing shiki css working.
  classes?: "twinkleplop" | "shiki";
}

type ClassMap = Record<string, string>;

const TWINKLEPLOP_CLASSES: ClassMap = {
  highlight: "highlight",
  hl: "highlight",
  focus: "focus",
  "++": "diff-add",
  "--": "diff-del",
  error: "error",
  warning: "warning",
  info: "info",
  word: "highlight",
};

const SHIKI_CLASSES: ClassMap = {
  highlight: "highlighted",
  hl: "highlighted",
  focus: "focused",
  "++": "diff add",
  "--": "diff remove",
  error: "highlighted error",
  warning: "highlighted warning",
  info: "highlighted info",
  word: "highlighted-word",
};

const LINE_NOTATIONS = new Set([
  "highlight",
  "hl",
  "focus",
  "++",
  "--",
  "error",
  "warning",
  "info",
]);

// shiki applies an uncounted word notation to every line after the marker;
// the count clamps to the snippet, so a huge one reads as "the rest".
const REST_OF_SNIPPET = 1_000_000_000;

type Notation =
  | { kind: "line"; name: string; count: number }
  | { kind: "word"; text: string; count: number | null }
  | { kind: "malformed"; message: string };

export function shiki_notation(options: ShikiNotationOptions = {}): AnnotationPlugin {
  const classes = options.classes === "shiki" ? SHIKI_CLASSES : TWINKLEPLOP_CLASSES;
  return {
    verbs: ["code"],
    parse: "raw",
    handle({ args, marker, standalone, resolve, resolve_all }) {
      const notation = parse_notation(args as string);
      if (notation === null) return { consumed: false };
      if (notation.kind === "malformed") {
        return { issues: [{ kind: "malformed", message: notation.message }] };
      }
      if (notation.kind === "line") {
        const range = resolve(line_scope(marker.line, standalone, notation.count));
        return {
          overlays: [
            {
              start: range.start,
              end: range.end,
              classification: classes[notation.name],
              line_mode: true,
            },
          ],
        };
      }
      const count = notation.count === null ? REST_OF_SNIPPET : notation.count;
      const scope = line_scope(marker.line, standalone, count);
      let ranges: SourceRange[];
      try {
        ranges = resolve_all(`="${quote(notation.text)}" ${scope}`);
      } catch (err) {
        // no occurrence in the selected lines is not an error; shiki is
        // silent about it too.
        if ((err as { kind?: string }).kind === "anchor_not_found") return {};
        throw err;
      }
      const overlays: OverlayContribution[] = [];
      for (const r of ranges) {
        overlays.push({ start: r.start, end: r.end, classification: classes.word });
      }
      return { overlays };
    },
  };
}

// expressed in the shared grammar so a count past the last line clamps the
// way `+N` does everywhere else.
function line_scope(line: number, standalone: boolean, count: number): string {
  if (standalone) return `+${count}`;
  if (count === 1) return `:${line}`;
  return `:${line}...${line + count - 1}`;
}

// null means shiki would not have matched either, so the text stays.
function parse_notation(args: string): Notation | null {
  if (args.length === 0) return null;
  if (args.startsWith("word:")) return parse_word(args, 5);
  const colon = args.indexOf(":");
  const name = (colon < 0 ? args : args.slice(0, colon)).toLowerCase();
  if (!LINE_NOTATIONS.has(name)) return null;
  if (colon < 0) return { kind: "line", name, count: 1 };
  const count = parse_count(args, colon + 1);
  if (count === null) return malformed(args);
  return { kind: "line", name, count };
}

// any `\x` in the word stands for the bare character, as shiki unescapes.
function parse_word(args: string, from: number): Notation | null {
  let text = "";
  let i = from;
  let count: number | null = null;
  while (i < args.length) {
    const c = args.charCodeAt(i);
    if (c === 92 /* \ */ && i + 1 < args.length) {
      text += args[i + 1];
      i += 2;
      continue;
    }
    if (c === 58 /* : */) {
      count = parse_count(args, i + 1);
      if (count === null) return malformed(args);
      break;
    }
    text += args[i];
    i++;
  }
  if (text.length === 0) return null;
  return { kind: "word", text, count };
}

function parse_count(args: string, from: number): number | null {
  if (from >= args.length) return null;
  let v = 0;
  for (let i = from; i < args.length; i++) {
    const c = args.charCodeAt(i);
    if (c < 48 || c > 57) return null;
    v = v * 10 + (c - 48);
  }
  return v < 1 ? null : v;
}

function malformed(args: string): Notation {
  return {
    kind: "malformed",
    message: `[!code ${args}]: expected a line count of 1 or more after ":"`,
  };
}

// the word becomes a quoted literal anchor, so its own quotes and
// backslashes need the anchor grammar's escapes.
function quote(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 34 /* " */ || c === 92 /* \ */) out += "\\";
    out += text[i];
  }
  return out;
}
