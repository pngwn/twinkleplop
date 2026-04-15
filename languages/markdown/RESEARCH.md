# markdown lexical research

target: a pragmatic commonmark 0.31.2 syntax highlighter with the github flavored
markdown (gfm) extensions layered in by default. the grammar should tokenize
every block construct (headings, quotes, lists, fences, html blocks, link
reference definitions, thematic breaks, paragraphs) and every inline construct
(emphasis, code spans, links, images, autolinks, raw html, entity references,
escapes, hard line breaks, strikethrough, gfm autolink literals, task list
markers) plus gfm tables. it should also cooperate with a front-matter
convention (`---` fenced yaml/toml at the top of the file) since that is
near-universal in static-site pipelines even though it is not in the spec.

markdown is unusual among highlight targets: the spec defines a two-pass
parser (block structure first, inline after), not a lexer. a single-pass
character-scanning tokenizer cannot faithfully implement every commonmark
rule — emphasis nesting, link reference resolution, list tightness, and lazy
blockquote continuation need parser-level state. the grammar should get the
common cases right on a line-by-line basis and tolerate getting pathological
inputs (deeply nested emphasis resolving under rule 14, link reference
forward references, lazy continuation across blockquote + setext) wrong.

## sources consulted

primary (official specs):
- https://spec.commonmark.org/0.31.2/ — commonmark 0.31.2 specification (the canonical source)
- https://github.com/commonmark/commonmark-spec/blob/master/spec.txt — commonmark spec.txt (raw source with numbered examples)
- https://github.github.com/gfm/ — github flavored markdown spec (gfm extensions to commonmark)

cross-reference (existing highlighters and parsers):
- https://github.com/PrismJS/prism/blob/master/components/prism-markdown.js — prism markdown grammar (regex-based, permissive)
- https://github.com/MDeiml/tree-sitter-markdown — tree-sitter-markdown (block + inline separate parsers, external scanner for indent)
- https://github.com/micromark/micromark — micromark (reference-quality commonmark + gfm implementation in js)
- https://github.com/micromark/micromark-extension-gfm-autolink-literal — gfm autolink-literal extension details
- https://github.com/micromark/micromark-extension-gfm-strikethrough — gfm strikethrough details
- https://github.com/micromark/micromark-extension-gfm-task-list-item — gfm task list details
- https://github.com/micromark/micromark-extension-gfm-table — gfm table details
- https://prismjs.com/tokens.html — prism standard token taxonomy (for output naming)
- https://talk.commonmark.org/t/delimiter-run-definitions-need-clarification/2134 — emphasis delimiter run clarification

gaps and policy calls:
- the commonmark spec explicitly uses a two-pass algorithm (block then inline).
  twinkleplop tokenizes in a single forward pass. this means certain
  commonmark tests cannot pass:
  - emphasis rule 14 ("the number of leading delimiters is a multiple of 3")
    — needs full delimiter-stack algorithm.
  - link reference resolution — inline `[foo][bar]` requires the `[bar]`
    definition to exist; we cannot know whether it will appear later in a
    single forward pass. treat reference links as structurally
    "link-shaped" and color the brackets/label; let the document's actual
    reference resolution happen at render time if needed.
  - list tightness, lazy continuation of blockquote paragraphs, and setext
    heading promotion of a preceding paragraph are all parser-level.
- emphasis nesting: simple cases (`**foo *bar* baz**` and `*foo **bar** baz*`)
  must work. rule 9/10 intraword underscore restriction must be respected
  because `foo_bar_baz` appearing inside identifiers is extremely common and
  not italicizing it matches user expectation everywhere except ancient
  markdown dialects.
- the 0.31.2 spec changed "unicode whitespace" and "unicode punctuation" to
  use unicode general categories (zs/zl/zp for whitespace, p* for
  punctuation) rather than the older ascii-only rule. we should use
  category-based tests for the `preceded-by-whitespace` / `followed-by-
  punctuation` emphasis-flanking checks. an ascii-only approximation is a
  common shortcut and loses correctness for non-english text (fine for v1,
  flag it).
- html in markdown: commonmark defines seven block types and six inline tag
  shapes. we should emit html-shaped tokens but not try to validate html.
  gfm's disallowed-raw-html extension is a *render-time* filter (rewrites
  `<script>` to `&lt;script>` in output); it has no lexical effect. do NOT
  treat `<script>` differently at tokenization time.
- front matter: commonmark does not define front matter. jekyll / hugo /
  next.js / astro / docusaurus / obsidian all recognize a yaml front-matter
  block fenced by `---` on line 1 and a matching `---` line. some also
  recognize `+++` toml and `;;;` json. this is opt-in and should be a
  grammar-level toggle. default: recognize `---` yaml at top of document.
  inject yaml grammar if available (matches prism's `front-matter-block`).
- character references (`&amp;`, `&#42;`, `&#x2A;`) are a render-time
  transformation — they expand to their target characters before inline
  parsing continues. a highlighter just colors them as `entity`. do not
  try to "use" the expanded character for structural decisions
  (commonmark example: `&#42;` cannot start an emphasis run even though it
  produces `*`; this matches a lexer-level "we already colored it as
  entity, we don't re-examine it" behavior naturally).

---

## 1. primary sources

spec-wins policy: when prism, tree-sitter, or markdown-it disagree with
commonmark 0.31.2, the spec wins, except where noted below.

noted conflicts / deliberate divergences:

- prism tokenizes single-tilde strikethrough (`~text~`). the gfm spec
  requires two tildes (`~~text~~`). github.com in practice also accepts one,
  but the spec is explicit. we follow the spec (two tildes); a permissive
  flag can relax this but should default off.
- prism allows emphasis to span arbitrary runs (`createInline` uses
  `\b_..._\b` with word boundaries). this gets rule 9/10 right by
  accident in the common case and wrong in weird mixed punctuation cases.
  we should implement rule 9/10 directly on flanking checks, not by
  approximating with `\b`.
- prism's list item pattern is `[*+-]|\d+\.`. the spec also accepts
  `<digits>)` (paren-style ordered markers) and allows 1–9 digits. we
  follow the spec.
- prism's heading pattern does not enforce the "space after #" rule —
  `#foo` is not an atx heading per spec but prism colors it as one. we
  follow the spec.
- tree-sitter-markdown splits block and inline into two grammars because a
  single grammar cannot do both. twinkleplop is a single-pass lexer, so we
  tokenize inlines while scanning blocks and accept minor inaccuracy for
  pathological cases.
- cmark-gfm (the reference gfm implementation) is also a two-pass parser.
  its treatment of `:` colons for tables (alignment markers) and task
  list `[ ]` / `[x]` / `[X]` markers is the source of truth.
- commonmark 0.30 added the reformulation of "unicode whitespace" to mean
  "any unicode code point with the white_space property" and "unicode
  punctuation" to mean "any code point in general category p* or s*". 0.31
  refined this further. most highlighters still use ascii-only rules. a
  grammar-author may start ascii-only and widen later.

---

## 2. token inventory

the grammar outputs a flat sequence of typed tokens. the list below groups
what we need to distinguish. the final `class`-name mapping is the
grammar-author's call (prism aliases in brackets for reference).

### 2.1 literals

markdown has no numeric literals, no boolean literals, no character literals.
its "literals" are inlined text runs and code spans. the only quoted form is
a link title (see 2.7).

**code span** (inline backtick string)
- opens with a run of 1+ backticks not preceded by `` ` ``.
- closes with a run of backticks of equal length not followed by `` ` ``.
- content is opaque (no inline parsing, no entity expansion, no escape).
- a run longer than the delimiter length is content, e.g. ``` ``a `b` c`` ```
  has outer delimiter `` `` ``, inner content `` a `b` c``.
- spaces at the very start/end of content are trimmed *if* the content
  starts AND ends with a space AND is not all whitespace. this is a
  render-time normalization; the lexer should emit the span including
  any outer spaces as content.
- a code span never spans a blank line (newlines are allowed but a blank
  line terminates inline parsing first).

**text** (the default inline content)
- any run of characters that is not part of another inline construct.
- no escape sequences at the text level (escapes are a separate construct,
  see 2.10).

### 2.2 string-shaped constructs

**link title** (quoted metadata after a link destination)
- three forms: `"..."`, `'...'`, `(...)`. matching quote / paren required.
- inside double or single: backslash escapes apply (any ascii punctuation).
- inside parens: literal `(` and `)` are not allowed unless backslash-escaped
  or balanced; a single unescaped `)` terminates.
- blank lines are NOT allowed inside a title (terminates).

**link destination**
- two forms:
  - angle-bracketed: `<...>`, containing no spaces, no newlines, no
    unescaped `<` or `>`. backslash escapes apply.
  - bare: a run of non-space, non-control chars, with parentheses balanced.
    no newlines. stops at whitespace.

### 2.3 numeric character references

- decimal: `&#` + 1-7 digits + `;`. e.g. `&#35;` → `#`.
- hex: `&#x` or `&#X` + 1-6 hex digits + `;`. e.g. `&#x2A;` → `*`.
- entity name: `&` + html5 entity name + `;`. e.g. `&amp;` → `&`,
  `&ouml;` → `ö`. the authoritative list is the whatwg entities.json file
  (~2200 names). a pragmatic highlighter can match any `&[A-Za-z][A-Za-z0-9]*;`
  as `entity` without validating membership; the alternative is baking
  the 2200-entry set into the grammar (memory cost, rare benefit).
- invalid forms (`&#0;`, `&#xFFFFFFFF;`) still match lexically; render-time
  maps them to U+FFFD but lexer just emits `entity`.
- entities and character references are NOT recognized in code spans,
  code blocks, html blocks, raw html, link destinations inside `<...>`,
  or autolinks.

### 2.4 comments

html comments are the only comment form in markdown, and they are a
special case of raw html:

- **html comment (inline)**: `<!-- ... -->`. must not start with `>` or
  `->`, must not end with `-`, must not contain `--`. per commonmark
  the lexer is relaxed: any `<!--` through matching `-->` is a comment.
- **html block type 2 (block comment)**: line begins with `<!--`; block
  ends on the line that contains `-->`. unlike the inline form, a block
  comment can span multiple lines and contain arbitrary content.

markdown itself has no dedicated comment syntax. `<!-- -->` is the
convention.

### 2.5 keywords

markdown has no keywords in the programming-language sense. what a
highlighter might style as keyword-ish:

- language identifiers in fenced code info strings (`js`, `python`, etc.)
  — usually emitted as `language-<name>` or a sub-token, so injection
  can pick them up.
- reference labels inside `[label]` link references — identifiers but
  case-insensitively matched.
- the `yaml` / `toml` language names inside front-matter fences.

no reserved word list.

### 2.6 operators

markdown has no operators. what plays an operator-like role:

- emphasis delimiters: `*`, `_`, `**`, `__`, `***`, `___` (and gfm's
  `~`, `~~`).
- inline code delimiters: `` ` ``, `` `` ``, `` ``` ``, etc.
- link / image punctuation: `[`, `]`, `(`, `)`, `!`.
- autolink delimiters: `<`, `>`.
- hard line break: `\<newline>` or `<two-or-more-spaces><newline>`.

these are punctuation in the classical sense but carry semantics.

### 2.7 identifiers

no classical identifiers. the closest things:

- link reference labels (the `[label]` in `[text][label]` or
  `[label]: url`). labels are case-insensitive and unicode-normalized
  (nfc) on comparison.
- html tag names (see 2.9).
- html attribute names (see 2.9).
- fenced code info string first word (treated as language id).
- gfm autolink domain parts (alphanumeric + `-` + `_` + `.`, no underscore
  in the last two labels).
- gfm email local parts (`[a-zA-Z0-9._+-]+`).

### 2.8 punctuation and delimiters

block-level delimiters (at most 3 spaces of leading indent, per spec):

- `#` `##` `###` `####` `#####` `######` — atx heading markers.
- `=` (1+) under text — setext h1 marker.
- `-` (1+) under text — setext h2 marker / thematic break / list marker.
- `*` (1+) alone on a line — thematic break / list marker.
- `_` (1+) alone on a line — thematic break.
- `` ``` `` (3+) and `~~~` (3+) — fenced code delimiters.
- `>` — blockquote marker.
- `+`, `-`, `*` — bullet list marker (with trailing space).
- `<digits>.` and `<digits>)` — ordered list marker (1-9 digits).
- `[label]:` — link reference definition marker.
- `|` — table column separator (gfm).
- `:` in table delimiter row — alignment indicator (gfm).

inline delimiters:

- `*` `**` `***` — emphasis / strong / both.
- `_` `__` `___` — emphasis / strong / both (with intraword restriction).
- `` ` `` `` `` `` — code span (any run length).
- `~` `~~` — strikethrough (gfm; two tildes per spec).
- `[` `]` — link text / image alt / reference label brackets.
- `(` `)` — link destination / title wrappers (destination flavor).
- `<` `>` — autolink / raw html delimiters.
- `!` — image prefix (only meaningful as `![...](...)` or `![...][...]`).
- `\` — backslash escape.
- `&` `;` — entity reference delimiters (not escape-able: `\&` does
  escape the ampersand, yes).

### 2.9 raw html (inline)

commonmark inline html shapes (per §6.6):

- **open tag**: `<` tagname (attribute)* space? `/`? `>`. tagname starts
  with ascii letter, followed by letters, digits, `-`.
- **close tag**: `</` tagname space* `>`.
- **comment**: `<!-- ... -->` (per 2.4).
- **processing instruction**: `<? ... ?>`.
- **declaration**: `<!` uppercase-ascii-letter+ `... >`.
- **cdata**: `<![CDATA[ ... ]]>`.

attribute shapes:
- name: ascii letter or `_` / `:`, then any of `[A-Za-z0-9_.:-]*`.
- value: unquoted (no spaces, no `"`, no `'`, no `=`, no `<`, no `>`, no `` ` ``),
  single-quoted, or double-quoted. escape sequences are not expanded inside
  these (they are html attribute values).

### 2.10 backslash escapes

any ascii punctuation character may be backslash-escaped. the 31 characters
that can follow `\` to form an escape:

```
! " # $ % & ' ( ) * + , - . / : ; < = > ? @ [ \ ] ^ _ ` { | } ~
```

inside `\<any-other>`: the backslash is literal. inside a `code span`,
code block, html block, or autolink, backslashes are always literal (no
escape expansion). backslash at end of a line (immediately before a line
ending) inside a paragraph is a hard line break (see 2.13).

### 2.11 special syntax: reference links

commonmark has three reference-link forms, all of which produce the same
logical link but differ lexically:

- **full reference**: `[text][label]`
- **collapsed reference**: `[label][]`
- **shortcut reference**: `[label]`

all require a matching `[label]: url` definition elsewhere in the document.
a lexer cannot verify the match without a second pass. token-shape the
brackets and label; leave the dangling reference to the renderer.

### 2.12 special syntax: link reference definitions (block)

```
[label]: destination "optional title"
```

the destination follows the same rules as an inline link destination. the
title is optional and can be on the same line or the next line (at most
one line break between destination and title). a title *cannot* be on a
line by itself without a destination.

leading indent: 0-3 spaces. the label is case-insensitive and cannot be
empty. labels normalize by stripping leading/trailing whitespace and
collapsing internal whitespace runs to single spaces.

### 2.13 special syntax: hard and soft line breaks

- **hard line break**: either `\<newline>` or `<2+ spaces><newline>` at
  the end of a non-blank line within a paragraph. in table cells (gfm),
  the `\<newline>` form is the only one that works reliably.
- **soft line break**: a newline inside a paragraph that is not preceded by
  a backslash or 2+ spaces. rendered as a space (or `<br>` depending on
  renderer options). lexer emits it as plain whitespace / text.

### 2.14 special syntax: gfm tables

```
| col a | col b | col c |
| :---- | :---: | ----: |
| l     | c     | r     |
| ...   | ...   | ...   |
```

- header row: a normal pipe-delimited row.
- delimiter row: cells containing only hyphens (3+) and optional leading
  `:` (left align), trailing `:` (right align), or both (center align).
  the presence of a well-formed delimiter row is what promotes a paragraph
  into a table.
- content rows: follow until a blank line or a line that cannot be a
  table row.
- pipe escape: `\|` inserts a literal pipe in a cell. inside a code span
  within a cell, the code span does NOT suppress pipe parsing — you still
  need `\|` or to use the html entity `&#124;`. this is a gfm-specific
  wrinkle (commonmark has no tables; gfm chose pipe-wins-over-code-span
  for tables).
- leading / trailing pipes are optional: `a | b | c` with no outer pipes
  is a valid table row. delimiter row follows the same relaxation.
- the header row determines column count; data rows with fewer cells get
  padded with empties, with more cells get truncated (render-time
  behavior; lexer emits what is there).

### 2.15 special syntax: gfm task list items

```
- [ ] open task
- [x] completed task
- [X] also completed
```

- must be the first thing in a list item's first paragraph (after any
  leading indent).
- recognized markers: `[ ]` (space), `[x]`, `[X]`.
- `[ ]` requires a single ascii space. `[\t]`, `[  ]` (two spaces), etc.
  are NOT task markers per spec. in practice github accepts whitespace
  inside more permissively.
- followed by a mandatory ascii space and then the item text.
- appears only inside list items — not inside paragraphs generally.

### 2.16 special syntax: gfm autolinks (literal)

four shapes, recognized inside text:

- **www autolink**: `www.<domain><path?>`. domain requires at least one `.`
  and no underscores in the last two labels.
- **url autolink**: `http://`, `https://`, or `ftp://` + `<domain><path?>`.
- **email autolink**: `<local>@<domain>`. local is `[A-Za-z0-9._+-]+`.
  domain is `[A-Za-z0-9.-_]+`, must contain at least one `.`, last char
  must not be `-` or `_`. trailing `.` is stripped.
- **xmpp autolink** (git-flavored markdown legacy, rarely implemented):
  `xmpp:user@domain`. usually skipped.

path/tail validation: greedy match of non-space non-`<` characters, then
strip trailing `?`, `!`, `.`, `,`, `:`, `*`, `_`, `~`. if the tail ends
with `)`, count parens; drop trailing `)` until the count balances or
nothing is left.

must be preceded by the start-of-line, whitespace, or one of `(`, `*`, `_`,
`~` (these are the "preceding context" chars github considers valid). this
is to avoid catching `http://` inside word-like contexts.

### 2.17 special syntax: front matter (convention, not spec)

```
---
title: Hello
date: 2026-04-14
---
```

- first characters in the document are `---` followed by a line break.
- body continues until a line containing exactly `---` (or `...`).
- body is yaml (or toml if opened with `+++`). inject the appropriate
  sub-grammar.
- if not at the start of the document, a `---` line is a thematic break
  or setext h2 underline — do not enter front-matter state mid-document.

---

## 3. edge case inventory

### 3.1 emphasis and strong

commonmark's emphasis algorithm (§6.2) is a delimiter-stack algorithm. a
single-pass lexer cannot implement it exactly; below are the rules that a
practical tokenizer still must get right.

- a delimiter run is a maximal sequence of `*` or `_` characters (same
  character). length matters — runs of 1, 2, or 3 open/close differently.
- **left-flanking**: the run is not followed by unicode whitespace AND
  (not followed by unicode punctuation OR preceded by unicode whitespace
  or punctuation).
- **right-flanking**: the run is not preceded by unicode whitespace AND
  (not preceded by unicode punctuation OR followed by unicode whitespace
  or punctuation).
- **rule 1 (* can open)**: left-flanking.
- **rule 2 (_ can open)**: left-flanking AND (not right-flanking OR
  preceded by punctuation). this is the intraword underscore rule:
  `foo_bar_baz` does not open because `_` is right-flanking and not
  preceded by punctuation.
- **rule 3 (* can close)**: right-flanking.
- **rule 4 (_ can close)**: right-flanking AND (not left-flanking OR
  followed by punctuation). symmetric intraword rule.
- **rule 9/10**: special case for mixed-length runs; the sum of open and
  close delimiter lengths must not be a multiple of 3 unless both
  open and close lengths are multiples of 3. this handles cases like
  `**foo*` — 2 opens, 1 closes, sum 3, opens not multiple of 3, so NO
  match. this is where single-pass tokenizers diverge from the spec.

practical highlighter advice: match runs of `*` / `_`, emit
`punctuation.delim.strong` / `...emphasis` for the opening run, find the
matching run on the same logical line, and give up on exact rule-9 fidelity.
the output is "almost right" for 99% of real input.

intraword examples:
- `foo*bar*baz` → emphasis match (rule 1 and 3 both pass).
- `foo_bar_baz` → no emphasis (rules 2 and 4 both fail).
- `5*6 = 30*2 / 60` → no emphasis (rule 1 open fails due to digit-flanking
  being "unicode punctuation = false" but also "not preceded by
  whitespace").

### 3.2 code spans vs emphasis

code spans take precedence over emphasis. `*foo `bar` baz*` — the `` `bar` ``
is a code span first, and the surrounding `*` is then examined as emphasis
around the text + code span pair. the tokenizer must scan for code span
delimiters before deciding on emphasis matching.

### 3.3 code spans with internal backticks

- `` `a`b` `` — open is 1 backtick, close is the FIRST run of 1 backtick
  not preceded/followed by `` ` ``. so this parses as `` `a` `` code span
  followed by `b` ` text and a dangling backtick.
- ``` ``a`b`` ``` — open is 2, close is 2, content is `` a`b ``.
- always pick the first matching run of the same length. if no match,
  the opening run is literal text (not a code span at all).

### 3.4 emphasis nesting

- `*foo **bar** baz*` → emphasis around strong around text.
- `**foo *bar* baz**` → strong around emphasis around text.
- `***foo***` → can be strong+emphasis nested, or emphasis+strong nested —
  the spec picks one based on length preference rules.
- `**foo**bar**` → strong `foo`, then text `bar**`. this is one of the
  rule-9 cases — a naive greedy match would get it wrong.

### 3.5 setext heading vs thematic break vs list item

a line of `---` at column 0-3 can be any of:
- setext h2 underline (if preceded by a non-blank paragraph line).
- thematic break (if not following a paragraph, and not otherwise blocked).
- a list item beginning (if followed by a space and inline content: `- x`).
- yaml front-matter boundary (at top of file, before any content).

precedence (spec):
- inside a paragraph: setext wins over thematic break.
- a line like `- - -` (with internal spaces) is a thematic break, not a list.
- a single `-` with no content is a bullet list marker, not a thematic
  break (spec needs 3 chars for thematic break).

### 3.6 atx heading edge cases

- `#foo` is NOT a heading (needs space after `#`). emit as paragraph text.
- `# foo #` is a heading with text `foo` and a closing `#` sequence.
- `# foo ###` — text `foo`, closing sequence `###`.
- `# foo # \#` — text `foo # #` (last `#` is escaped, then the preceding `#`
  is not a closing sequence because it's not preceded by just spaces).
  actually: the closing sequence must be preceded by a space OR tab, and
  followed by only spaces/tabs to eol. so a backslash-escaped `#` is not
  a closing sequence.
- `####### foo` (7 hashes) — NOT a heading (max 6). emit as paragraph.
- `# ` (nothing after) — valid empty heading.
- `#` alone — valid empty heading (no space-after-hash required when the
  content is empty).

### 3.7 list item edge cases

- indentation within a list item: the body of a list item is indented by
  the width of the marker + 1 space after. for `- foo`, the continuation
  must be indented 2 columns. for `10. foo`, 4 columns.
- a blank line ends a list item's paragraph but not necessarily the list —
  the list continues as long as subsequent lines are indented appropriately.
- a list item can contain an indented code block at its start: `-     code`
  has marker `-`, space, then 4 more spaces (indented code) + `code`.
- ordered list items can use `.` or `)`. a list started with `.` and one
  started with `)` are different lists even at the same indent.
- loose vs tight: a list is loose if any item is separated from another
  by a blank line OR if any item contains multiple block elements with
  blanks between them. render-time detail; lexer-wise both produce the
  same tokens.

### 3.8 fenced code block edge cases

- info string: any text after the opening fence (trimmed). the first word
  is the language id; remaining text is arbitrary metadata (often used for
  highlighting options). MUST NOT contain backticks when the fence uses
  backticks (spec restriction).
- closing fence: same character as opening, at least as many characters
  as the opening. can have any trailing whitespace but NO info string.
- unclosed fence: runs to end of document or end of containing container
  block.
- the fence opening column sets the base indent for all content lines
  (leading indent up to that column is stripped at render time; lexer
  just emits content).

### 3.9 indented code block edge cases

- 4 spaces (or 1 tab = 4 columns) at the start of a line, NOT inside any
  other container, NOT interrupting a paragraph.
- blank lines within are preserved.
- cannot interrupt a paragraph — `hello\n    world` is a paragraph with
  `hello world`, not an indented code block.
- preceding and trailing blank lines are stripped at render but lexer
  emits them as blank lines / whitespace.

### 3.10 html block edge cases

the seven html block types have different start/end conditions. the
critical insight: html blocks "swallow" content until their end condition
— inline markdown inside is NOT parsed. the exception is type 6 and 7,
which terminate on a blank line (but their content is still raw).

- **type 1** (`<pre>`, `<script>`, `<style>`, `<textarea>` and their case
  variants): start when the line begins with `<pre` etc. (case-insensitive)
  followed by space/tab/`>`/eol. end when a line contains `</pre>` (or the
  corresponding closing tag) — case-insensitive, closing tag need not match
  the opening tag (`<pre>...</style>` closes).
- **type 2** (html comment): start `<!--`, end `-->`. end can be on same line.
- **type 3** (processing instruction): start `<?`, end `?>`.
- **type 4** (declaration): start `<!` + ascii letter, end `>`.
- **type 5** (cdata): start `<![CDATA[`, end `]]>`.
- **type 6** (block element tags): line begins with `<` or `</` + one of
  the block-level tag names (`address`, `article`, ..., `ul`), case-
  insensitive, followed by whitespace, eol, `>`, or `/>`. end on blank
  line. block-level tag names (full list):
  `address`, `article`, `aside`, `base`, `basefont`, `blockquote`, `body`,
  `caption`, `center`, `col`, `colgroup`, `dd`, `details`, `dialog`,
  `dir`, `div`, `dl`, `dt`, `fieldset`, `figcaption`, `figure`, `footer`,
  `form`, `frame`, `frameset`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `head`,
  `header`, `hr`, `html`, `iframe`, `legend`, `li`, `link`, `main`,
  `menu`, `menuitem`, `nav`, `noframes`, `ol`, `optgroup`, `option`, `p`,
  `param`, `section`, `search` (0.31.2), `source`, `summary`, `table`,
  `tbody`, `td`, `tfoot`, `th`, `thead`, `title`, `tr`, `track`, `ul`.
- **type 7** (complete open/close tag): line begins with a complete open
  tag or close tag (any tag name other than `script`, `style`, `pre`),
  followed only by whitespace to eol. end on blank line. MAY NOT
  interrupt a paragraph (types 1-6 may).

### 3.11 link edge cases

- link text can contain any inline EXCEPT another link (no nested links).
  images inside link text are allowed: `[![alt](img.png)](url)`.
- link text brackets must balance (backslash-escaped or in code spans
  do not count).
- destination balance: bare destinations allow balanced `(...)` nesting
  but unbalanced close-paren terminates.
- a `[` that does not close before eol leaves a `[` as literal text.
- shortcut reference: `[foo]` at end of line followed by text on next
  line is tricky — if followed by `[]`, it's collapsed form; if followed
  by `[bar]`, it's full form. the lexer should look at what's
  immediately after `]`.

### 3.12 autolink (angle-bracket form) vs raw html

- `<http://example.com>` — angle-bracket autolink (inline type).
- `<foo@example.com>` — angle-bracket email autolink.
- `<foo>` with `foo` matching a tag name pattern — raw html.
- `<foo bar>` (containing space) and not matching autolink uri pattern —
  raw html if `foo` is valid tag name shape, else literal text.
- the autolink pattern for URIs: scheme + `:` + any non-space,
  non-control, non-`<`, non-`>` characters. scheme is letter followed by
  2-31 letters/digits/`+`/`.`/`-`.
- gfm disallowed-raw-html extension: at render time, `<script>`,
  `<title>`, `<textarea>`, `<style>`, `<xmp>`, `<iframe>`, `<noembed>`,
  `<noframes>`, `<plaintext>` are rewritten (prepended with `&lt;`).
  the LEXER does not treat them differently — same html block type 1
  (for script/style/textarea/pre) or type 6/7 rules apply.

### 3.13 escape edge cases

- `\*foo*` — first `*` is escaped (literal), second `*` never pairs → all
  literal text.
- `\\*foo*` — escaped backslash, then `*foo*` normal emphasis.
- `\<newline>` inside a paragraph — hard line break (not a literal
  backslash + newline).
- `\<newline>` inside a code span — literal backslash + newline.
- `\&` — escaped ampersand, NOT an entity reference. emit as escape.
- `\&amp;` — escape + entity? no: the `\&` consumes the ampersand; the
  rest is literal text `amp;`. so backslash-escaping an ampersand
  disables entity recognition.

### 3.14 entity / numeric character reference edge cases

- entities inside a code span are literal. `` `&amp;` `` emits `&amp;` verbatim.
- `&;` (just the delimiters) is not an entity — emit as literal text.
- `&nbsp ` (no semicolon) is not an entity — literal text.
- `&nosuchentity;` — if you're doing entity-list validation, literal text.
  if you're pattern-matching any `&[A-Za-z][A-Za-z0-9]*;`, it gets colored
  as entity.
- `&#;` (no digits) — not a reference.
- `&#x;` (no hex digits) — not a reference.

### 3.15 case sensitivity

- html tag names are case-insensitive for html block type 1 and type 6.
- language id in info strings is case-sensitive per spec but usually
  lowercased by renderers before dispatching to highlighter.
- link reference labels are case-insensitive (and unicode-normalized).
- task list markers: `[x]` and `[X]` both recognized. `[ ]` requires a
  single ascii space.

### 3.16 whitespace significance

- indentation matters: 4 spaces = indented code block, 0-3 spaces =
  "no indent" for block-construct recognition.
- tabs: expand to next multiple of 4. so `\t` at column 0 is equivalent
  to 4 spaces for block recognition. `<space>\t` expands to 4 spaces
  (one space + 3 tab-spaces).
- trailing whitespace on a line is usually stripped at render, but 2+
  trailing spaces BEFORE a newline is a hard line break.
- a "blank line" is a line containing only spaces/tabs (including zero
  chars). blank lines end most block constructs.

### 3.17 gfm table edge cases

- a line without pipes becomes a paragraph, not a table (table requires
  at least one pipe).
- the delimiter row must have the same number of cells as the header
  row; otherwise the table is not recognized and both rows are a paragraph.
- `|` inside a code span or backslash-escaped (`\|`) does not split cells
  — but note, in the delimiter row no inline parsing occurs, so only `\|`
  works there.
- trailing `|` at end of row is optional.
- a trailing backslash-space within a cell represents a hard line break
  (and a literal `\<newline>` inside a cell also does). spec says the
  only way to get a line break inside a cell is `<br>`, but github
  accepts `\<newline>` too.

### 3.18 gfm strikethrough

- `~~text~~` — strikethrough. two tildes each side.
- `~text~` — per spec NOT valid. github in practice accepts it. our
  default: spec-strict (two tildes only); permissive flag can enable.
- `~~` delimiters follow emphasis flanking rules (left/right-flanking).
- cannot span blank lines.

### 3.19 gfm autolink literal edge cases

- `www.a.b` with underscore in last two labels: `www.foo_bar.com` — NO
  autolink (underscore forbidden in last two labels). `www.a.foo_bar.com`
  — still NO (last two labels are `foo_bar` and `com`).
- `http://example.com/(foo)` — balanced parens kept.
- `http://example.com/)` — trailing `)` dropped (unbalanced).
- `http://example.com.` — trailing `.` dropped.
- `http://example.com/?` — trailing `?` dropped.
- `foo@bar.com.` — email autolink `foo@bar.com`, trailing `.` dropped.
- must be preceded by start-of-line, whitespace, or `(`, `*`, `_`, `~`.
- the email local part cannot end with `.`. if it does, the `.` and the
  `@` onward are NOT an autolink.

### 3.20 list interruption

- a paragraph can be interrupted by: atx heading, setext heading (via
  underline), thematic break, blockquote, fenced code block, html block
  (types 1-6), any list marker with EXCEPTIONS:
  - a list marker with `1.` or `1)` can interrupt a paragraph only if
    start = 1 (to avoid `Foo\n2. Bar` being parsed as an ordered list).
  - a bullet list with empty content (`-` alone) cannot interrupt a
    paragraph.
  - a list that would start with a non-blank marker-followed-by-content
    CAN interrupt.

### 3.21 blockquote edge cases

- `>` with no space after is still a blockquote marker (`>foo` → quote
  containing paragraph with text `foo`).
- `  >` (up to 3 leading spaces) works. 4+ spaces makes it an indented
  code block inside the containing context.
- lazy continuation: within a paragraph inside a blockquote, a
  continuation line without a `>` marker still counts as part of the
  paragraph if it would otherwise be paragraph continuation text.
  practical impact on a single-pass lexer: we emit `>` markers for lines
  that have them, and otherwise emit text; the renderer stitches them
  together. the lexer does NOT need to emit invisible `>` tokens for
  lazy lines.
- nested blockquotes: `> > foo` is two nested quotes with paragraph `foo`.
  the second `>` is a blockquote marker INSIDE the first one.

### 3.22 bom

commonmark silently strips a utf-8 bom (U+FEFF) at the start of the
document. the lexer should skip it if present.

---

## 4. nesting and context constructs

block-level containers and leaves, then inline contexts. "nests" lists
what other constructs can appear inside.

```
document
  opens: start of input (optionally after utf-8 bom, optionally after a
         front-matter block if enabled)
  closes: end of input
  nests: any block construct; blank lines between; front matter block at
         start only
```

```
blockquote
  opens: 0-3 space indent + > (with or without trailing space)
  closes: a blank line not followed by another > line, or a line that
          begins a block construct that cannot be contained, or end of
          input
  nests: any block construct (recursive: blockquote in blockquote is fine)
  lazy rule: paragraph continuation lines inside the quote may omit the >
```

```
list (bullet or ordered)
  opens: 0-3 space indent + marker + (space or tab OR end of line)
  closes: blank line followed by a line less-indented than the list's
          base indent, or a line that starts a block construct at outer
          indent, or end of input
  nests: any block construct, inside each list item (list items are
         themselves containers)
  marker families: bullets - + *; ordered <digits>. <digits>)
  a list is a sequence of items with the same marker family; changing
  marker ends the list and starts a new one
```

```
list item
  opens: same conditions as list (the marker starts the item)
  closes: blank line + less-indented line, or end of list
  nests: any block construct, indented by marker-width + 1 space
  can contain an indented code block if marker + 5+ spaces
  gfm task marker: [ ], [x], [X] at the start of the first paragraph
    inside the item (before any inline content)
```

```
atx heading
  opens: 0-3 space indent + 1-6 # + (space or tab OR end of line)
  closes: end of line
  nests: inline content (text, emphasis, code span, links, images,
         autolinks, raw html, escapes, entities, strikethrough)
  no line continuation; a single line only
  optional trailing ## sequence (must be preceded by space/tab, followed
    by only spaces/tabs to eol)
```

```
setext heading
  opens: a paragraph line (not interruptible by another construct)
  closes: a line of 1+ = (for h1) or 1+ - (for h2), 0-3 space indent,
          any trailing spaces
  nests: inline content (same set as atx)
  the preceding paragraph becomes the heading text; a single-pass lexer
    must NOT finalize a paragraph until it sees whether an underline
    follows (or emit as paragraph and let renderer re-interpret; this
    is the pragmatic choice for a highlighter)
```

```
thematic break
  opens: 0-3 space indent + 3+ of same character (*, -, _), optional
         spaces/tabs between each char
  closes: end of line (single-line construct)
  nests: nothing
```

```
indented code block
  opens: 4+ space (or equivalent tab) indent, not interrupting a paragraph
  closes: a non-blank line with less than 4 spaces of indent
  nests: nothing (content is raw)
```

```
fenced code block
  opens: 0-3 space indent + 3+ ` or 3+ ~, optional info string
  closes: line with 0-3 space indent + same-char fence of equal or
          greater length, trailed only by whitespace
  nests: nothing (content is raw until close, but language in info
         string may trigger injection)
  info string: after the opening fence; first word is language id;
    for backtick fences, info string CANNOT contain backticks
```

```
html block (types 1-7)
  opens: matches one of seven start conditions (see 3.10)
  closes: matches corresponding end condition (see 3.10). most types
          terminate on blank line; types 1-5 terminate on specific
          closing patterns, possibly on the same line
  nests: raw html content only; no markdown parsing inside
  type 6 and 7 can interrupt paragraph (type 7 cannot); others can
```

```
link reference definition
  opens: 0-3 space indent + [label]: destination [title]
  closes: end of the definition (label+destination+optional title),
          which may span up to one line break between dest and title
  nests: nothing; the destination and title are leaf fields
  the label is case-insensitively matched to reference links elsewhere
    in the document (but the lexer does not resolve; it just emits the
    definition-shaped tokens)
```

```
gfm table
  opens: a line containing at least one unescaped |, immediately
         followed by a delimiter row (| :--- | ---: |)
  closes: blank line, or a line that starts a non-table block construct
  nests: per cell: inline content (but no block-level constructs);
         cells cannot contain line breaks except via \<newline> or <br>
```

```
paragraph
  opens: a non-blank line at the current container's base indent that
         does not match any other block opener
  closes: blank line, another block-starter that can interrupt a
          paragraph, or end of input
  nests: inline content (all inline types)
```

```
front matter block (convention, opt-in)
  opens: --- on line 1, followed by a line break
  closes: --- (or ...) on its own line
  nests: yaml (or toml if opened with +++)
  enabled only at document start; anywhere else, --- is thematic break
    or setext underline
```

inline contexts:

```
inline content (inside paragraph, heading, table cell, link text,
                emphasis, blockquote, list item paragraphs)
  nests: text, escape, entity, code span, emphasis, strong, strikethrough
         (gfm), link, image, autolink (angle or gfm literal), raw html,
         hard line break, soft line break
  exclusion: link text cannot contain another link (images are fine)
```

```
code span
  opens: run of 1+ backticks (length N)
  closes: run of exactly N backticks, not preceded/followed by backtick
  nests: nothing (content is raw); entities, emphasis, escapes all
         disabled
```

```
angle-bracket autolink
  opens: <
  closes: >
  nests: nothing; the content is either a valid uri or a valid email
         address; no escape processing inside
```

```
inline raw html
  opens: < followed by shape matching one of: open tag, close tag,
         comment <!-- , pi <?, declaration <!ALPHA, cdata <![CDATA[
  closes: matching close character for the shape
  nests: attributes (for open tags) which have quoted values; no
         markdown parsing inside
```

```
inline link
  opens: [ (link text begins)
  closes: ) at end of ](destination title)
  nests: link text contains inline content (no links); destination has
         its own lexical shape (bare or <bracketed>); title is
         "..." or '...' or (...)
```

```
inline image
  opens: ! immediately followed by [ (image alt begins)
  closes: ) at end of ](destination title)
  nests: same as link; alt text can contain any inline including other
         images and links (no restriction against images inside image)
```

```
reference link / image
  opens: [ (text or label begins)
  closes: ][label], ][], or just ]
  nests: text content has inline content; labels are literal, not
         inline-parsed
```

```
emphasis / strong
  opens: left-flanking delimiter run of * or _ (1, 2, or 3 chars)
  closes: right-flanking delimiter run of same char, matching length
          per the spec's rules 9/10 algorithm
  nests: inline content (including nested emphasis/strong of the
         opposite delimiter char, and of the same char at a different
         length)
```

```
strikethrough (gfm)
  opens: left-flanking run of ~ (spec: exactly 2; permissive: 1 or 2)
  closes: right-flanking run of same length
  nests: inline content
```

---

## 5. manual trace

traces use plain english. "enter x" / "exit x" maps to state-machine
push/pop at the grammar-author's discretion.

### trace 1: mixed paragraph with emphasis, code span, link, and autolink

input:
```
A link to [example](https://example.com "Ex") uses *emphasis* and `inline
code` with a <https://foo.bar> autolink.
```

trace:

- `A link to ` → text (paragraph content)
- `[` → enter link text
  - `example` → link-text content
- `]` → exit link text, expect destination
- `(` → enter link destination
- `https://example.com` → link-destination-bare
- ` ` → whitespace separator
- `"Ex"` → link-title
  - `"` → enter title
  - `Ex` → title content
  - `"` → exit title
- `)` → exit link (end of inline link)
- ` uses ` → text
- `*` → potential emphasis open. check flanking: preceded by space
  (whitespace), followed by `e` (not whitespace, not punctuation) →
  left-flanking. rule 1 satisfied. → enter emphasis (depth 1)
- `emphasis` → text inside emphasis
- `*` → potential close. preceded by `s` (not ws, not punct), followed by
  space (ws) → right-flanking. rule 3 satisfied. → exit emphasis
- ` and ` → text
- `` ` `` → enter code span (delimiter length 1)
- `inline` → code content
- `\n` → code content (code spans allow newlines)
- `code` → code content
- `` ` `` → exit code span (same length, not followed by `` ` ``)
- ` with a ` → text
- `<` → potential autolink open. scan ahead: `https://foo.bar` is a valid
  uri (scheme `https`, colon, `//foo.bar`). next char after is `>`. → enter
  autolink
- `https://foo.bar` → autolink uri
- `>` → exit autolink
- ` autolink.` → text
- end of paragraph

key observations:
- code span delimiter scanning must happen BEFORE emphasis matching
  (precedence).
- link destinations are ambiguous — a parenthesis inside the destination
  requires balance; the title is optional.
- autolink vs raw html: after `<` we speculate which shape matches first.
- newline inside code span is fine; newline ending paragraph is not
  (blank line would have terminated before reaching code span close).

### trace 2: fenced code block with language, inside a list item, followed by task list

input:
```
- First item

  ```js
  console.log("hi");
  ```

- [ ] unchecked task
- [x] done task that references [foo][ref]
  (continuation line)

[ref]: https://example.com
```

trace:

- `-` at col 0 + space → bullet list marker; list opens, item opens.
  continuation indent = 2.
- `First item` → paragraph content (inside item)
- blank line → paragraph ends, but list / item continues
- (blank consumed; next line at 2-space indent stays in item)
- `  ` → indent matching item's base
- `` ``` `` → fenced code block opens
- `js` → info string (language id)
- newline → end of header line
- `  console.log("hi");` → code content line (strip 2-space item indent,
  content is `console.log("hi");`)
- `  ` + `` ``` `` → fenced code block closes
- blank line → current item ends, list may continue
- `-` + space → new list item
- `[ ]` → task list marker (open box). followed by space.
- ` unchecked task` → paragraph content (task body)
- newline + `-` + space → next list item
- `[x]` → task list marker (checked)
- ` done task that references ` → text
- `[` → enter reference link text
- `foo` → link-text content
- `]` → end text
- `[` → begin reference label
- `ref` → reference-label
- `]` → end label (full reference link shape). emit as "reference link
  shape with label `ref`"; no resolution.
- newline + `  ` (2-space indent → paragraph continuation)
- `(continuation line)` → paragraph content
- blank line → ends list
- `[` → potential link or link-ref-definition. at col 0, followed by
  `ref]:` → link reference definition start
- `ref` → definition-label
- `]:` → definition punctuation
- ` ` → whitespace
- `https://example.com` → definition-destination
- end of line → end of definition

key observations:
- fenced code block inside a list item: the content is dedented by the
  item's base indent at render but tokenized as raw content.
- task list markers are recognized only at the start of a list item's
  first paragraph.
- reference links emit link-shaped tokens; the link-reference-definition
  on a later line emits definition-shaped tokens. no lexical
  connection between them.
- a list item's paragraph can continue after a blank line without a
  dedent only if the continuation is indented — but in this trace the
  `(continuation line)` comes right after the checked-task item's text,
  suggesting it belongs to that item.

### trace 3: gfm table with escapes and code, then html block

input:
```
| Feature       | Syntax      | Notes                 |
| :------------ | :---------: | --------------------: |
| bold          | `**text**`  | pipes in code: \|     |
| link          | [x](y)      | x has \| escaped      |

<div class="note">
This is an **html block** type 6.
No markdown here.
</div>

After the block.
```

trace:

- `|` → table column separator
- ` Feature       ` → table header cell content
- `|` → separator
- ` Syntax      ` → cell
- `|` → separator
- ` Notes                 ` → cell
- `|` → trailing separator
- newline
- `|` → start of delimiter row
- ` :------------ ` → delimiter cell (left-aligned due to leading `:`)
- `|` → separator
- ` :---------: ` → delimiter cell (center-aligned)
- `|` → separator
- ` --------------------: ` → delimiter cell (right-aligned)
- `|` → trailing separator
- newline
- `|` → start of data row
- ` bold          ` → cell content (text)
- `|` → separator
- ` ` → whitespace, then `` ` `` → enter code span
- `**text**` → code content (emphasis delimiters are literal inside code)
- `` ` `` → exit code span
- `  ` → whitespace
- `|` → separator
- ` pipes in code: ` → text
- `\|` → escaped pipe (single token: backslash-escape) — does NOT split
  the cell
- `     ` → trailing whitespace in cell
- `|` → separator (end of row)
- newline
- next data row: similar pattern with `[x](y)` → inline link inside
  cell, then `x has \| escaped` with an escaped pipe.
- blank line → ends table
- `<div class="note">` at col 0 → html block type 6 begins. `div` is in
  the block-level tag list. no markdown parsing inside until blank line.
  - `<` → html-tag-open
  - `div` → html-tag-name
  - ` ` → whitespace
  - `class` → html-attr-name
  - `=` → punctuation
  - `"note"` → html-attr-value (quoted)
  - `>` → html-tag-close
- newline → still inside html block
- `This is an **html block** type 6.` → raw html content (NOT parsed as
  markdown — the `**...**` is literal even though it looks like emphasis)
- newline → still inside
- `No markdown here.` → raw content
- newline → still inside
- `</div>` → raw content (and matches a close tag shape, but since we're
  already in the html block, the shape is just content)
- blank line → terminates html block (type 6 end condition)
- `After the block.` → new paragraph

key observations:
- in a gfm table, `\|` is the only reliable way to get a literal pipe in
  a cell; a code span containing `|` would split the cell (surprising but
  spec-correct).
- html block type 6 does NOT parse markdown between its start and its
  terminating blank line. this is a hard departure from surrounding
  inline rules.
- detecting the table requires looking at the delimiter row — a paragraph
  with `|` but no delimiter row is not a table, so strictly we can't
  decide "this is a table" until we've scanned the second line. practical
  single-pass: scan the first line, peek at the next line for delimiter
  shape, and commit based on that peek.
- the html block end condition (blank line) is checked per-line; emitting
  the closing `</div>` as just html content is fine — the renderer
  terminates on the blank line after, not on the `</div>` itself.

---

## notes for the grammar author

- markdown is block-first, inline-second. a character-scanning state
  machine that tries to do both simultaneously will need a "block state"
  tier and an "inline state" tier, and a rule that at a blank line we
  reset to block-context. consider emitting block-opening tokens
  (heading-marker, fence, list-marker, blockquote-marker, table-row-sep)
  as soon as recognized, and only then entering inline state for the
  remaining content of the line.
- precedence among inline constructs (highest first): code span >
  autolink / raw html > emphasis / strikethrough > links > textual. this
  is the effective ordering; the delimiter-stack algorithm in the spec
  describes how emphasis and links interact in detail.
- the lexer cannot correctly handle reference links without a second
  pass. emit reference-shaped tokens and let the render step decide
  whether they are real links. a snapshot test should accept "shape is
  right, resolution is wrong" as a passing outcome.
- for gfm tables, an easy two-pass-lite approach is to buffer the first
  line, peek the second, and only then emit the buffered line as a table
  header. this is a localized lookahead, not a full second pass.
- suggested token name set (lowercase, kebab-case) aligned with prism's
  markdown grammar for compatibility:
  `heading`, `heading-marker`, `bold`, `italic`, `strike`,
  `code`, `code-block`, `code-language`, `blockquote`, `list-marker`,
  `task-marker`, `hr`, `url`, `url-text`, `url-link`, `url-title`,
  `url-reference`, `image`, `autolink`, `entity`, `escape`, `hard-break`,
  `html-tag`, `html-attr`, `html-attr-value`, `html-comment`, `punctuation`,
  `table-separator`, `table-align`, `front-matter`, `language-<name>`.
- do not try to match the full html5 entity list; match `&[A-Za-z][A-Za-z0-9]*;`
  as `entity` and be done. if a theme wants to distinguish valid vs invalid
  entities, that's a render step.
