// the fence meta conventions documentation sites already use, one table row
// per convention. a part no row claims is left untouched for `parse_meta`.
//
//   {1,3-4}              shiki / vitepress   highlight those lines
//   {1,3-4}#id           rehype-pretty-code  plus data-highlighted-line-id
//   /word/               shiki               highlight every occurrence
//   /word/3-5            rehype-pretty-code  only those occurrences
//   /word/#id            rehype-pretty-code  plus data-chars-id
//   :line-numbers[=N]    vitepress           numbers on, optionally from N
//   :no-line-numbers     vitepress           numbers off
//   showLineNumbers[{N}] rehype-pretty-code  the same two
//   [title]              vitepress           title caption
//   title="..."          rehype-pretty-code  title caption
//   caption="..."        rehype-pretty-code  caption below the block
//   twoslash             shiki               use the entry's twoslash fn

export interface LineGroup {
  lines: (number | [number, number])[];
  id?: string;
}

export interface WordGroup {
  text: string;
  // 1-based occurrence bounds, inclusive. absent means every occurrence.
  from?: number;
  to?: number;
  id?: string;
}

export interface ParsedMeta {
  line_groups: LineGroup[];
  word_groups: WordGroup[];
  // absent means the meta said nothing and the site default applies.
  line_numbers?: false | { start: number };
  title?: string;
  caption?: string;
  twoslash: boolean;
}

export type Fail = (message: string) => never;

const BRACE_OPEN = 123;
const BRACE_CLOSE = 125;
const BRACKET_OPEN = 91;
const BRACKET_CLOSE = 93;
const SLASH = 47;
const BACKSLASH = 92;
const HASH = 35;
const SPACE = 32;
const TAB = 9;
const DOUBLE_QUOTE = 34;
const SINGLE_QUOTE = 39;

// the language is the first word of the info string; the rest is the meta.
export function split_info(info: string): { lang: string; meta: string } {
  const trimmed = info.trim();
  let end = 0;
  while (end < trimmed.length) {
    const c = trimmed.charCodeAt(end);
    if (c === SPACE || c === TAB) break;
    end++;
  }
  return { lang: trimmed.slice(0, end), meta: trimmed.slice(end).trim() };
}

export function parse_meta(meta: string, fail: Fail): ParsedMeta {
  const out: ParsedMeta = { line_groups: [], word_groups: [], twoslash: false };
  for (const part of split_parts(meta)) {
    for (const take of CONVENTIONS) {
      if (take(part, out, fail)) break;
    }
  }
  return out;
}

type Take = (part: string, out: ParsedMeta, fail: Fail) => boolean;

const CONVENTIONS: Take[] = [
  take_line_group,
  take_word_group,
  take_vitepress_line_numbers,
  take_show_line_numbers,
  take_bracket_title,
  take_quoted_value,
  take_twoslash,
];

// whitespace separates parts, except inside `{}`, `[]`, quotes, or a
// `/word/` pattern, all of which sites write with spaces inside.
function split_parts(meta: string): string[] {
  const parts: string[] = [];
  let i = 0;
  while (i < meta.length) {
    const c = meta.charCodeAt(i);
    if (c === SPACE || c === TAB) {
      i++;
      continue;
    }
    const start = i;
    let quote = 0;
    let depth = 0;
    let in_word = false;
    while (i < meta.length) {
      const ch = meta.charCodeAt(i);
      if (quote !== 0) {
        if (ch === quote) quote = 0;
        i++;
      } else if (in_word) {
        if (ch === BACKSLASH) i += 2;
        else {
          if (ch === SLASH) in_word = false;
          i++;
        }
      } else if (ch === DOUBLE_QUOTE || ch === SINGLE_QUOTE) {
        quote = ch;
        i++;
      } else if (ch === BRACE_OPEN || ch === BRACKET_OPEN) {
        depth++;
        i++;
      } else if (ch === BRACE_CLOSE || ch === BRACKET_CLOSE) {
        if (depth > 0) depth--;
        i++;
      } else if (ch === SLASH && i === start) {
        in_word = true;
        i++;
      } else if (depth === 0 && (ch === SPACE || ch === TAB)) {
        break;
      } else {
        i++;
      }
    }
    parts.push(meta.slice(start, i));
  }
  return parts;
}

function take_line_group(part: string, out: ParsedMeta): boolean {
  if (part.charCodeAt(0) !== BRACE_OPEN) return false;
  const close = part.indexOf("}");
  if (close === -1) return false;
  const lines = parse_line_list(part.slice(1, close));
  if (lines === null) return false;
  const id = read_id(part.slice(close + 1));
  if (id === null) return false;
  out.line_groups.push(id === "" ? { lines } : { lines, id });
  return true;
}

function take_word_group(part: string, out: ParsedMeta): boolean {
  if (part.charCodeAt(0) !== SLASH) return false;
  let text = "";
  let i = 1;
  let closed = false;
  for (; i < part.length; i++) {
    const c = part.charCodeAt(i);
    if (c === BACKSLASH && i + 1 < part.length) {
      text += part[i + 1];
      i++;
    } else if (c === SLASH) {
      closed = true;
      break;
    } else {
      text += part[i];
    }
  }
  if (!closed || text.length === 0) return false;

  const rest = part.slice(i + 1);
  if (rest.length === 0) {
    out.word_groups.push({ text });
    return true;
  }
  if (rest.charCodeAt(0) === HASH) {
    const id = read_id(rest);
    if (id === null || id === "") return false;
    out.word_groups.push({ text, id });
    return true;
  }
  const range = parse_range(rest);
  if (range === null) return false;
  out.word_groups.push({ text, from: range[0], to: range[1] });
  return true;
}

function take_vitepress_line_numbers(part: string, out: ParsedMeta): boolean {
  if (part === ":no-line-numbers") {
    out.line_numbers = false;
    return true;
  }
  if (part === ":line-numbers") {
    out.line_numbers = { start: 1 };
    return true;
  }
  if (part.startsWith(":line-numbers=")) {
    const start = parse_digits(part.slice(14));
    if (start === -1) return false;
    out.line_numbers = { start };
    return true;
  }
  return false;
}

function take_show_line_numbers(part: string, out: ParsedMeta): boolean {
  if (part === "showLineNumbers") {
    out.line_numbers = { start: 1 };
    return true;
  }
  if (part.startsWith("showLineNumbers{") && part.endsWith("}")) {
    const start = parse_digits(part.slice(16, part.length - 1));
    if (start === -1) return false;
    out.line_numbers = { start };
    return true;
  }
  return false;
}

function take_bracket_title(part: string, out: ParsedMeta, fail: Fail): boolean {
  if (part.charCodeAt(0) !== BRACKET_OPEN) return false;
  if (part.charCodeAt(part.length - 1) !== BRACKET_CLOSE) return false;
  const title = part.slice(1, part.length - 1);
  if (title.length === 0) return false;
  set_title(out, title, fail);
  return true;
}

function take_quoted_value(part: string, out: ParsedMeta, fail: Fail): boolean {
  const eq = part.indexOf("=");
  if (eq <= 0) return false;
  const key = part.slice(0, eq);
  if (key !== "title" && key !== "caption") return false;
  const value = unquote(part.slice(eq + 1));
  if (value === null) return false;
  if (key === "title") set_title(out, value, fail);
  else if (out.caption !== undefined) fail("two caption conventions");
  else out.caption = value;
  return true;
}

function take_twoslash(part: string, out: ParsedMeta): boolean {
  if (part !== "twoslash") return false;
  out.twoslash = true;
  return true;
}

function set_title(out: ParsedMeta, title: string, fail: Fail): void {
  if (out.title !== undefined) fail("two title conventions");
  out.title = title;
}

// "" when there is no suffix, the id when there is one, null when the tail
// is something this convention does not own.
function read_id(rest: string): string | null {
  if (rest.length === 0) return "";
  if (rest.charCodeAt(0) !== HASH) return null;
  const id = rest.slice(1);
  return id.length === 0 ? null : id;
}

function parse_line_list(body: string): (number | [number, number])[] | null {
  if (body.trim().length === 0) return null;
  const lines: (number | [number, number])[] = [];
  for (const piece of body.split(",")) {
    const range = parse_range(piece.trim());
    if (range === null) return null;
    lines.push(range[0] === range[1] ? range[0] : range);
  }
  return lines;
}

// "3" or "3-5".
function parse_range(text: string): [number, number] | null {
  const dash = text.indexOf("-");
  if (dash === -1) {
    const n = parse_digits(text);
    return n === -1 ? null : [n, n];
  }
  const from = parse_digits(text.slice(0, dash));
  const to = parse_digits(text.slice(dash + 1));
  if (from === -1 || to === -1) return null;
  return [from, to];
}

function parse_digits(text: string): number {
  if (text.length === 0) return -1;
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 48 || c > 57) return -1;
    n = n * 10 + (c - 48);
  }
  return n;
}

function unquote(text: string): string | null {
  if (text.length < 2) return null;
  const open = text.charCodeAt(0);
  if (open !== DOUBLE_QUOTE && open !== SINGLE_QUOTE) return null;
  if (text.charCodeAt(text.length - 1) !== open) return null;
  return text.slice(1, text.length - 1);
}
