import { to_html } from "@twinkleplop/core";
import type { HookResult, OverlayItem, RenderOptions, TokenizeResult } from "@twinkleplop/core";
import { parse_meta, split_info } from "./meta";
import type { Fail, ParsedMeta } from "./meta";
import { resolve_registry } from "./registry";
import type {
  HighlightFn,
  MarkdownOptions,
  RegistryEntry,
  Renderer,
  SourceLocation,
} from "./types";

// a token stream with no tokens renders every byte as escaped text inside the
// ordinary block markup, so the unknown-language fallback shares the
// renderer with every other fence instead of hand-rolling one.
const NO_TOKENS: TokenizeResult = { tokens: new Uint32Array(0), token_types: [] };

const HIGHLIGHT_CLASS = "highlight";
const WORD_CLASS = "highlighted-word";

interface WordId {
  start: number;
  end: number;
  id: string;
}

export function create_renderer(options: MarkdownOptions): Renderer {
  if (typeof options !== "object" || options === null) {
    throw new TypeError("the plugin options must be an object with a `languages` registry");
  }
  const registry = resolve_registry(options.languages, options.default_language);
  const default_language = options.default_language;
  const on_unknown = options.on_unknown_language ?? "throw";
  const twoslash_mode = options.twoslash ?? "meta";
  const inline_mode = options.inline ?? false;
  const site_line_numbers = options.line_numbers;
  const parse_meta_hook = options.parse_meta;
  const base = options.render ?? {};

  function fence(
    lang: string | undefined,
    meta: string | undefined,
    code: string,
    location?: SourceLocation,
  ): string | null {
    const name = (lang ?? "").trim() || default_language;
    if (name === undefined || name === "") return null;

    const raw_meta = meta ?? "";
    const fail = fence_fail(name, location);
    const parsed = parse_meta(raw_meta, fail);
    const source = strip_trailing_newline(code);
    const entry = registry.get(name);

    if (entry === undefined && on_unknown === "throw") {
      throw new Error(`unknown fence language "${name}"${at(location)}`);
    }

    let render = build_render(name, parsed, source, fail);
    if (parse_meta_hook !== undefined) render = parse_meta_hook(raw_meta, render) ?? render;

    const highlight = pick_highlight(name, entry, parsed, fail);
    return wrap(name, parsed, run(highlight, source, render, name, location));
  }

  function pick_highlight(
    name: string,
    entry: RegistryEntry | undefined,
    parsed: ParsedMeta,
    fail: Fail,
  ) {
    if (entry === undefined) return plain_highlight;
    if (parsed.twoslash) {
      if (entry.twoslash === undefined) fail(`"${name}" has no twoslash highlighter`);
      return entry.twoslash;
    }
    if (twoslash_mode === "always" && entry.twoslash !== undefined) return entry.twoslash;
    return entry.highlight;
  }

  function build_render(
    name: string,
    parsed: ParsedMeta,
    source: string,
    fail: Fail,
  ): RenderOptions {
    const items: OverlayItem[] = base.overlays === undefined ? [] : [...base.overlays];
    const line_ids = new Map<number, string>();
    const word_ids: WordId[] = [];

    collect_lines(parsed, source, items, line_ids, fail);
    collect_words(parsed, source, items, word_ids);

    // the fence name comes from the document and the renderer emits
    // class_name verbatim, so it is escaped here. `data-language` rides
    // `attributes`, which the renderer escapes itself.
    const render: RenderOptions = {
      ...base,
      class_name: join(base.class_name ?? "twinkleplop", "language-" + escape_html(name)),
      attributes: { ...base.attributes, "data-language": name },
      line_numbers: resolve_line_numbers(parsed, site_line_numbers, base.line_numbers),
    };
    if (items.length > 0) render.overlays = items;
    if (line_ids.size > 0) render.line = line_id_hook(line_ids, base.line);
    if (word_ids.length > 0) render.token = word_id_hook(word_ids, base.token);
    return render;
  }

  function inline_code(text: string, location?: SourceLocation): string | null {
    if (inline_mode === false) return null;
    const suffix = read_inline_suffix(text);
    if (suffix === null) return null;

    const { name, code } = suffix;
    const entry = registry.get(name);
    if (entry === undefined && on_unknown === "throw") {
      throw new Error(`unknown inline code language "${name}"${at(location)}`);
    }
    const highlight = entry === undefined ? plain_highlight : entry.highlight;
    const html = run(highlight, code, { ...base, structure: "inline" }, name, location);
    return `<code class="twinkleplop-inline language-${escape_html(name)}">${html}</code>`;
  }

  return { inline: inline_mode !== false, fence, inline_code };
}

function plain_highlight(code: string, render?: RenderOptions): string {
  return to_html(code, NO_TOKENS, render);
}

// whatever the highlighter throws (an annotation issue with no sink, a bad
// render option) is the caller's error, so it keeps its class and stack and
// only gains the position the toolchain knew about.
function run(
  highlight: HighlightFn,
  code: string,
  render: RenderOptions,
  name: string,
  location?: SourceLocation,
): string {
  try {
    return highlight(code, render);
  } catch (error) {
    const suffix = at(location);
    if (suffix !== "" && error instanceof Error) {
      const note = ` (\`${name}\` fence${suffix})`;
      if (!error.message.endsWith(note)) error.message += note;
    }
    throw error;
  }
}

// the wrapper only appears when there is something to caption; a plain fence
// stays a bare <pre>.
function wrap(name: string, parsed: ParsedMeta, block: string): string {
  const { title, caption } = parsed;
  if (title === undefined && caption === undefined) return block;
  let out = `<figure class="twinkleplop-block" data-language="${escape_html(name)}">\n`;
  if (title !== undefined) {
    out += `<figcaption class="twinkleplop-title">${escape_html(title)}</figcaption>\n`;
  }
  out += block;
  if (caption !== undefined) {
    out += `\n<figcaption class="twinkleplop-caption">${escape_html(caption)}</figcaption>`;
  }
  return out + "\n</figure>";
}

function collect_lines(
  parsed: ParsedMeta,
  source: string,
  items: OverlayItem[],
  line_ids: Map<number, string>,
  fail: Fail,
): void {
  if (parsed.line_groups.length === 0) return;
  const line_count = count_lines(source);

  for (const group of parsed.line_groups) {
    for (const entry of group.lines) {
      if (typeof entry === "number") {
        check_line(entry, line_count, fail);
        if (group.id !== undefined) line_ids.set(entry, group.id);
        continue;
      }
      const [from, to] = entry;
      check_line(from, line_count, fail);
      check_line(to, line_count, fail);
      if (to < from) fail(`line range ${from}-${to} runs backwards`);
      if (group.id !== undefined) {
        for (let line = from; line <= to; line++) line_ids.set(line, group.id);
      }
    }
    items.push({ lines: group.lines, class: HIGHLIGHT_CLASS });
  }
}

function collect_words(
  parsed: ParsedMeta,
  source: string,
  items: OverlayItem[],
  word_ids: WordId[],
): void {
  for (const group of parsed.word_groups) {
    // an occurrence range that overshoots wraps fewer words rather than
    // failing, the same way a pattern that matches nothing renders normally.
    const hits = occurrences(source, group.text);
    const from = group.from ?? 1;
    const to = Math.min(group.to ?? hits.length, hits.length);
    for (let n = from; n <= to; n++) {
      const start = hits[n - 1];
      const end = start + group.text.length;
      items.push({ start, end, class: WORD_CLASS });
      if (group.id !== undefined) word_ids.push({ start, end, id: group.id });
    }
  }
}

// non-overlapping, left to right, as shiki counts them.
function occurrences(source: string, text: string): number[] {
  const hits: number[] = [];
  let from = 0;
  for (;;) {
    const at_index = source.indexOf(text, from);
    if (at_index === -1) return hits;
    hits.push(at_index);
    from = at_index + text.length;
  }
}

// shiki's transformers ignore a line past the end of the snippet. failing
// here turns a stale range in docs into a build error instead of a fence that
// quietly highlights nothing.
function check_line(line: number, line_count: number, fail: Fail): void {
  if (line < 1 || line > line_count) {
    fail(`line ${line} is beyond the fence's ${line_count} line${line_count === 1 ? "" : "s"}`);
  }
}

function count_lines(source: string): number {
  let count = 1;
  for (let i = 0; i < source.length; i++) {
    if (source.charCodeAt(i) === 10) count++;
  }
  return count;
}

// the meta wins over the site default, which wins over anything the shared
// render options carry.
function resolve_line_numbers(
  parsed: ParsedMeta,
  site: MarkdownOptions["line_numbers"],
  base: RenderOptions["line_numbers"],
): RenderOptions["line_numbers"] {
  if (parsed.line_numbers !== undefined) return parsed.line_numbers;
  if (site !== undefined) return site;
  return base;
}

function line_id_hook(
  line_ids: Map<number, string>,
  user: RenderOptions["line"],
): NonNullable<RenderOptions["line"]> {
  return (n, source_line) => {
    const id = line_ids.get(source_line);
    const theirs = user?.(n, source_line);
    if (id === undefined) return theirs;
    return merge_hook(theirs, { attrs: { "data-highlighted-line-id": id } });
  };
}

// overlays carry classes, not attributes, so the id lands on the token spans
// the wrapper holds rather than on the wrapper itself.
function word_id_hook(
  word_ids: WordId[],
  user: RenderOptions["token"],
): NonNullable<RenderOptions["token"]> {
  return (type, start, end) => {
    const theirs = user?.(type, start, end);
    for (const word of word_ids) {
      if (start >= word.start && end <= word.end) {
        return merge_hook(theirs, { attrs: { "data-chars-id": word.id } });
      }
    }
    return theirs;
  };
}

function merge_hook(theirs: HookResult | void, ours: HookResult): HookResult {
  if (theirs === undefined || theirs === null) return ours;
  return {
    class: join(theirs.class ?? "", ours.class ?? ""),
    attrs: { ...theirs.attrs, ...ours.attrs },
  };
}

// `code{:ts}` in prose: the suffix names the language and is removed.
function read_inline_suffix(text: string): { name: string; code: string } | null {
  if (!text.endsWith("}")) return null;
  const open = text.lastIndexOf("{:");
  if (open === -1) return null;
  const name = text.slice(open + 2, text.length - 1);
  if (name.length === 0) return null;
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    if (c === 32 || c === 9 || c === 123 || c === 125) return null;
  }
  return { name, code: text.slice(0, open) };
}

// the toolchains hand over a body with the fence's closing newline still on
// it; everything else about the body is passed through untouched.
function strip_trailing_newline(code: string): string {
  if (code.endsWith("\n")) return code.slice(0, code.length - 1);
  return code;
}

function fence_fail(name: string, location?: SourceLocation): Fail {
  return (message) => {
    throw new Error(`${message} (\`${name}\` fence${at(location)})`);
  };
}

function at(location?: SourceLocation): string {
  if (location === undefined) return "";
  const { file, line } = location;
  if (file !== undefined && line !== undefined) return ` at ${file}:${line}`;
  if (file !== undefined) return ` at ${file}`;
  if (line !== undefined) return ` at line ${line}`;
  return "";
}

function join(left: string, right: string): string {
  if (left.length === 0) return right;
  if (right.length === 0) return left;
  return left + " " + right;
}

function escape_html(text: string): string {
  let out = "";
  let flushed = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    let entity: string | null = null;
    if (code === 38) entity = "&amp;";
    else if (code === 60) entity = "&lt;";
    else if (code === 62) entity = "&gt;";
    else if (code === 34) entity = "&quot;";
    else if (code === 39) entity = "&#39;";
    if (entity !== null) {
      if (i > flushed) out += text.slice(flushed, i);
      out += entity;
      flushed = i + 1;
    }
  }
  return flushed === 0 ? text : out + text.slice(flushed);
}

export { escape_html, split_info };
