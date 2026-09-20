// HTML -> markdown for the prerendered docs.
//
// Almost every docs route is hand-authored Svelte rather than mdsvex, and the
// code samples only exist once twoslash has run, so there is no markdown to
// serve until the site has been rendered. Walking the build output instead
// treats every route the same and needs no per-page wiring.
//
// What makes that tractable: a `<pre>`'s text is the code, exactly, and
// everything a reader is not meant to hear carries `aria-hidden`, so dropping
// those subtrees is the whole cleanup.

const VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

// consumed verbatim to the close tag
const RAW_TEXT = new Set(["script", "style", "textarea", "title"]);

const BLOCK = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "details",
  "div",
  "dl",
  "dd",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);

// -- parsing ---------------------------------------------------------------

const NAMED = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
};

function decode_entities(text) {
  if (!text.includes("&")) return text;
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return NAMED[body] ?? whole;
  });
}

function parse_attrs(source) {
  const attrs = {};
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(source))) {
    attrs[m[1].toLowerCase()] = decode_entities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

/**
 * Parse into a lite tree of `{ tag, attrs, children }` and `{ text }` nodes.
 * Svelte's SSR output is well formed, so a stray end tag matching no open
 * element is ignored rather than allowed to corrupt the tree.
 */
function parse(html) {
  const root = { tag: "#root", attrs: {}, children: [] };
  const stack = [root];
  const push = (node) => stack[stack.length - 1].children.push(node);

  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      if (i < html.length) push({ text: decode_entities(html.slice(i)) });
      break;
    }
    if (lt > i) push({ text: decode_entities(html.slice(i, lt)) });

    // including the `<!--[-->` hydration markers svelte emits everywhere
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith("<!", lt)) {
      const end = html.indexOf(">", lt);
      i = end === -1 ? html.length : end + 1;
      continue;
    }

    const close = /^<\/([a-zA-Z][^\s>]*)\s*>/.exec(html.slice(lt));
    if (close) {
      const tag = close[1].toLowerCase();
      const at = stack.findLastIndex((n) => n.tag === tag);
      if (at > 0) stack.length = at;
      i = lt + close[0].length;
      continue;
    }

    const open = /^<([a-zA-Z][^\s/>]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/.exec(html.slice(lt));
    if (!open) {
      push({ text: "<" });
      i = lt + 1;
      continue;
    }

    const tag = open[1].toLowerCase();
    const node = { tag, attrs: parse_attrs(open[2]), children: [] };
    push(node);
    i = lt + open[0].length;

    if (VOID.has(tag) || open[2].trimEnd().endsWith("/")) continue;

    if (RAW_TEXT.has(tag)) {
      const end = html.toLowerCase().indexOf(`</${tag}`, i);
      const stop = end === -1 ? html.length : end;
      node.children.push({ text: html.slice(i, stop) });
      const gt = html.indexOf(">", stop);
      i = gt === -1 ? html.length : gt + 1;
      continue;
    }

    stack.push(node);
  }

  return root;
}

// -- tree helpers ----------------------------------------------------------

const classes = (node) => (node.attrs?.class ?? "").split(/\s+/);
const has_class = (node, name) => classes(node).includes(name);

function find(node, predicate) {
  if (node.tag && predicate(node)) return node;
  for (const child of node.children ?? []) {
    const hit = find(child, predicate);
    if (hit) return hit;
  }
  return null;
}

/** Raw text of a subtree, entity-decoded, with nothing collapsed. */
function text_of(node) {
  if (node.text !== undefined) return node.text;
  return (node.children ?? []).map(text_of).join("");
}

// skipped whole: `aria-hidden` covers the twoslash popovers and the
// decorative heading glyphs, `hidden` anything toggled off.
function skipped(node) {
  if (!node.tag) return false;
  if (RAW_TEXT.has(node.tag) || node.tag === "template" || node.tag === "noscript") return true;
  if (node.attrs["aria-hidden"] === "true") return true;
  if ("hidden" in node.attrs) return true;
  return false;
}

// -- serialising -----------------------------------------------------------

const collapse = (text) => text.replace(/\s+/g, " ");

function inline(node, ctx) {
  if (node.text !== undefined) return collapse(node.text);
  if (skipped(node)) return "";

  const kids = () => (node.children ?? []).map((c) => inline(c, ctx)).join("");

  switch (node.tag) {
    case "br":
      return "\n";
    case "code": {
      const raw = collapse(text_of(node));
      const ticks = "`".repeat(backticks(raw) + 1);
      const pad = raw.startsWith("`") || raw.endsWith("`") ? " " : "";
      return `${ticks}${pad}${raw}${pad}${ticks}`;
    }
    case "strong":
    case "b": {
      const inner = kids().trim();
      return inner ? `**${inner}**` : "";
    }
    case "em":
    case "i": {
      const inner = kids().trim();
      return inner ? `*${inner}*` : "";
    }
    case "del":
    case "s": {
      const inner = kids().trim();
      return inner ? `~~${inner}~~` : "";
    }
    case "a": {
      const inner = kids().trim();
      const href = absolute(node.attrs.href, ctx);
      if (!inner) return "";
      return href ? `[${inner}](${href})` : inner;
    }
    case "img": {
      const alt = node.attrs.alt ?? "";
      const src = absolute(node.attrs.src, ctx);
      return src ? `![${alt}](${src})` : "";
    }
    default:
      return kids();
  }
}

function backticks(text) {
  let best = 0;
  let run = 0;
  for (const c of text) {
    run = c === "`" ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

function absolute(href, ctx) {
  if (!href) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) return href;
  if (href.startsWith("#")) return ctx.url + href;
  try {
    return new URL(href, ctx.url).toString();
  } catch {
    return href;
  }
}

const LANG_BY_EXT = {
  ts: "ts",
  tsx: "tsx",
  js: "js",
  jsx: "jsx",
  mjs: "js",
  svelte: "svelte",
  css: "css",
  json: "json",
  jsonc: "jsonc",
  sh: "bash",
  bash: "bash",
  html: "html",
  md: "md",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  py: "python",
  rs: "rust",
  go: "go",
  sql: "sql",
  diff: "diff",
};

/** A `.code` block renders as a fence; its `.head` is chrome, bar the name. */
function code_block(node, ctx) {
  const head = find(node, (n) => has_class(n, "head"));
  const fname = head && find(head, (n) => has_class(n, "fname"));
  const name = fname ? text_of(fname).trim() : "";
  const pre = find(node, (n) => n.tag === "pre");
  if (!pre) return "";

  const lang = LANG_BY_EXT[name.split(".").pop()?.toLowerCase() ?? ""] ?? "text";
  return fence(code_text(pre), lang, name);
}

/**
 * A `<pre>`'s text with every `aria-hidden` subtree removed. Twoslash nests a
 * popover holding a type signature, docs and tags inline between the tokens it
 * describes, so taking the text wholesale splices them into the source:
 * `const greeting = "hello world"` comes back as
 * `const greetingconst greeting: "hello world" = "hello world"`.
 */
const LINE_ANNOTATION = new Set([
  "twoslash-query",
  "twoslash-error-line",
  "twoslash-tag",
  "twoslash-completions",
]);

// a break that collapses into whatever newline is already there, so an
// annotation lands on its own line without opening a blank one
const BREAK = "\u0000";

function code_walk(node, out) {
  if (node.text !== undefined) {
    out.push(node.text);
    return;
  }
  if (skipped(node)) return;

  const annotation = classes(node).some((c) => LINE_ANNOTATION.has(c));
  if (annotation) out.push(BREAK);
  for (const child of node.children ?? []) code_walk(child, out);
  if (annotation) out.push(BREAK);
}

function code_text(node) {
  const out = [];
  code_walk(node, out);
  return out.join("").replace(/\n?\u0000\n?/g, "\n");
}

function fence(code, lang, name) {
  const ticks = "`".repeat(Math.max(backticks(code) + 1, 3));
  const info = [lang || "text", name && `title="${name}"`].filter(Boolean).join(" ");
  const body = code.replace(/^\n+|\n+$/g, "");
  return `${ticks}${info}\n${body}\n${ticks}`;
}

function table(node, ctx) {
  const rows = [];
  const walk = (n) => {
    if (!n.tag || skipped(n)) return;
    if (n.tag === "tr") {
      const cells = (n.children ?? [])
        .filter((c) => c.tag === "td" || c.tag === "th")
        .map((c) => ({
          head: c.tag === "th",
          text: (c.children ?? [])
            .map((x) => inline(x, ctx))
            .join("")
            .trim()
            .replace(/\|/g, "\\|"),
        }));
      if (cells.length) rows.push(cells);
      return;
    }
    (n.children ?? []).forEach(walk);
  };
  walk(node);
  if (!rows.length) return "";

  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r) => {
    const cells = r.map((c) => c.text);
    while (cells.length < width) cells.push("");
    return `| ${cells.join(" | ")} |`;
  };

  // a table with no header row still needs one for the markdown to parse
  const headed = rows[0].every((c) => c.head);
  const head = headed ? rows[0] : Array.from({ length: width }, () => ({ text: "" }));
  const body = headed ? rows.slice(1) : rows;

  return [pad(head), `|${" --- |".repeat(width)}`, ...body.map(pad)].join("\n");
}

// `.code` and `.callout` are divs that read as blocks; everything else is
// judged by its tag.
function is_block(node) {
  if (!node.tag) return false;
  return BLOCK.has(node.tag) || has_class(node, "code") || has_class(node, "callout");
}

/**
 * Children of a container, as markdown blocks. Runs of inline content are
 * gathered into one paragraph — without that a `<div>` holding
 * `text <a>link</a> text`, which is how a callout body is authored, comes out
 * as three separate blocks.
 */
function blocks(node, ctx, depth = 0) {
  const out = [];
  let pending = [];

  const flush = () => {
    const text = pending.join("").trim();
    pending = [];
    if (text) out.push(text);
  };

  for (const child of node.children ?? []) {
    if (is_block(child)) {
      flush();
      out.push(...block(child, ctx, depth));
    } else {
      pending.push(inline(child, ctx));
    }
  }
  flush();
  return out;
}

function block(node, ctx, depth) {
  if (skipped(node)) return [];

  // navigation, not article content
  if (has_class(node, "prev-next")) return [];

  if (has_class(node, "code")) {
    const rendered = code_block(node, ctx);
    return rendered ? [rendered] : [];
  }

  switch (node.tag) {
    case "pre":
      return [fence(code_text(node), "", "")];
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const text = (node.children ?? [])
        .map((c) => inline(c, ctx))
        .join("")
        .trim();
      return text ? [`${"#".repeat(Number(node.tag[1]))} ${collapse(text)}`] : [];
    }
    case "p": {
      const text = (node.children ?? [])
        .map((c) => inline(c, ctx))
        .join("")
        .trim();
      return text ? [text] : [];
    }
    case "ul":
    case "ol": {
      const ordered = node.tag === "ol";
      const items = (node.children ?? []).filter((c) => c.tag === "li" && !skipped(c));
      const lines = items.map((li, n) => {
        const marker = ordered ? `${n + 1}. ` : "- ";
        const body = blocks(li, ctx, depth + 1).join("\n\n");
        const indented = body
          .split("\n")
          .map((line, idx) => (idx === 0 ? line : line && " ".repeat(marker.length) + line))
          .join("\n");
        return marker + indented;
      });
      return lines.length ? [lines.join("\n")] : [];
    }
    case "li":
      return blocks(node, ctx, depth);
    case "table": {
      const rendered = table(node, ctx);
      return rendered ? [rendered] : [];
    }
    case "blockquote": {
      const body = blocks(node, ctx, depth).join("\n\n");
      return body
        ? [
            body
              .split("\n")
              .map((l) => (l ? `> ${l}` : ">"))
              .join("\n"),
          ]
        : [];
    }
    case "hr":
      return ["---"];
    default: {
      // a callout is a div that reads as an aside
      if (has_class(node, "callout")) {
        const body = blocks(node, ctx, depth).join("\n\n");
        return body
          ? [
              body
                .split("\n")
                .map((l) => (l ? `> ${l}` : ">"))
                .join("\n"),
            ]
          : [];
      }
      return blocks(node, ctx, depth);
    }
  }
}

// -- page ------------------------------------------------------------------

/**
 * Convert one prerendered page, or null when it has no article: `/explore` and
 * the 404 render from client state, so there is no text to serve.
 */
export function page_to_markdown(html, { url, origin }) {
  const root = parse(html);
  const main = find(root, (n) => n.tag === "main");
  if (!main) return null;

  const content = find(main, (n) => has_class(n, "content")) ?? main;
  const ctx = { url, origin };

  const body = blocks(content, ctx)
    .map((b) => b.trimEnd())
    .filter(Boolean)
    .join("\n\n");
  if (!body.trim()) return null;

  return `${body}\n`;
}

export function page_title(html) {
  const root = parse(html);
  const title = find(root, (n) => n.tag === "title");
  return title ? text_of(title).trim() : "";
}
