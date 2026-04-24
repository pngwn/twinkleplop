# yaml lexical research

target: a yaml 1.2.2 syntax highlighter with permissive acceptance of yaml 1.1
legacy forms that are still prevalent in the wild (ruby/psych, pyyaml in
`safe_load` default). the grammar should tokenize plain/quoted/block scalars,
flow and block collections, anchors, aliases, tags, directives, and document
boundaries. when yaml 1.1 and 1.2 conflict, accept the superset (e.g. keep
`yes`/`no`/`on`/`off` as booleans even though 1.2 demoted them to strings) since
rejecting them makes real-world files look wrong.

## sources consulted

primary (official spec):

- https://yaml.org/spec/1.2.2/ — yaml 1.2.2 specification (the canonical source)
- https://yaml.org/spec/1.2.2/#chapter-2-language-overview — indicators, scalar styles, collection styles
- https://yaml.org/spec/1.2.2/#chapter-5-character-productions — character set productions (ns-char, c-indicator, etc.)
- https://yaml.org/spec/1.2.2/#chapter-6-structural-productions — whitespace, comments, directives, anchors, tags
- https://yaml.org/spec/1.2.2/#chapter-7-flow-style-productions — quoted and plain scalars, flow collections
- https://yaml.org/spec/1.2.2/#chapter-8-block-style-productions — block scalars, block collections
- https://yaml.org/spec/1.2.2/#chapter-10-recommended-schemas — failsafe, json, core schema tag resolution
- https://yaml.org/spec/1.1/ — yaml 1.1 (for legacy bool/timestamp patterns still common in the wild)
- https://github.com/yaml/yaml-grammar/blob/master/yaml-spec-1.2.txt — bnf grammar dump

cross-reference (existing highlighters):

- https://github.com/PrismJS/prism/blob/master/components/prism-yaml.js — prism's yaml grammar (pragmatic, context-insensitive)
- https://github.com/ikatyang/tree-sitter-yaml — tree-sitter-yaml (structurally accurate, uses external scanner for indentation)
- https://prismjs.com/tokens.html — prism standard token taxonomy (for output naming conventions)

gaps and calls:

- the yaml 1.2.2 spec declines to provide a single formal grammar for plain
  scalars (`ns-plain` is parameterized by context: block-in, block-out, flow-in,
  flow-out, block-key, flow-key). a tokenizer does not need to implement all
  five contexts faithfully; distinguishing "inside flow `[...]` / `{...}`" from
  "outside flow" captures the only lexical differences.
- the 1.2 spec replaces the 1.1 tag resolution table. the core schema (§10.3)
  is the lexically interesting one; failsafe (§10.1, everything is a string) is
  trivial and json schema (§10.2) differs from core only in case-sensitivity of
  true/false/null. a highlighter should emit `boolean` / `null` / `number`
  tokens for _either_ the core schema's accepted forms or a 1.1-compatible
  superset, and emit `string` for everything else.
- full indentation-sensitivity (detecting block-scalar end, implicit key/value
  boundaries, block-node closing) requires parser-level work and is outside
  the scope of a character-scanning tokenizer. the highlighter should get the
  common cases right via local cues (`:` followed by whitespace, `- ` at start
  of logical line, block header `|` / `>` at end of line) and tolerate getting
  deeply pathological indentation wrong.

---

## 1. primary sources

spec-wins policy: when prism or tree-sitter disagree with yaml 1.2.2, the spec
wins. noted conflicts:

- prism's `tag` regex uses `[\w\-%#;/?:@&=+$,.!~*'()\[\]]+` after the `!`; the
  spec's `ns-tag-char` excludes `!` and the flow indicators `[`, `]`, `{`, `}`,
  `,`. prism's pattern incorrectly permits `[` and `]` inside tags. we follow
  the spec.
- prism tokenizes `---` and `...` as generic punctuation. the spec makes them
  distinct structural markers (`c-directives-end`, `c-document-end`). emit a
  dedicated token for both so themes can style "between documents" hints if
  they want; prism-compatibility is achieved by aliasing to `punctuation`.
- prism does not tokenize `&anchor` and `*alias` distinctly from tags; its
  grammar lumps them under `important`. the spec treats them as separate node
  properties. emit `variable` / `variable` tokens; this is also what tree-sitter
  does.
- prism's `boolean` pattern is `/false|true/i`. yaml 1.2 core schema is
  case-restricted to six forms (`true`, `True`, `TRUE`, `false`, `False`,
  `FALSE`). a permissive pass can keep prism's case-insensitive match, but
  must also accept yaml 1.1 forms (`yes`, `no`, `on`, `off`, `y`, `n` with
  the same case variants) that are common in ansible, docker-compose, github
  actions configs, etc. do NOT match these case-insensitively in the narrow
  sense (`TrUe` is not a 1.2 boolean), but the grammar-author can decide how
  strict to be. note this trade-off in the grammar file comment.
- tree-sitter distinguishes `null_scalar`, `boolean_scalar`, `integer_scalar`,
  `float_scalar`, `string_scalar` at the node level. twinkleplop emits token
  types at the character level. the useful distinction for themes is
  `null` / `boolean` / `number` / `string` — the scalar-vs-scalar difference
  is just which token type we assign.

---

## 2. token inventory

### 2.1 indicators (the 19 special characters)

from c-indicator in the spec:

```
- ? : , [ ] { } # & * ! | > ' " % @ `
```

of these, `@` and `` ` `` are **reserved** — they cannot start a plain scalar
and have no current meaning. emitting them as a distinct `invalid` token
mirrors what editors do; emitting them as `punctuation` is also reasonable.

flow indicators (c-flow-indicator), a stricter subset:

```
, [ ] { }
```

these have extra restrictions on plain scalars in flow context.

### 2.2 literals

**plain scalars (unquoted)**

- no delimiters, no escape sequences.
- first character must be either (a) a non-indicator `ns-char`, or (b) one of
  `?`, `:`, `-` _immediately_ followed by an `ns-plain-safe` character (no
  whitespace). this permits `-1`, `?foo`, `:bar` as plain scalars but rejects
  `- ` (block sequence entry), `? ` (explicit key), `: ` (map value).
- inside the scalar, `:` is allowed only when not followed by whitespace or a
  flow indicator (in flow context). `#` is allowed only when NOT preceded by
  whitespace (`foo#bar` is a scalar; `foo #bar` starts a comment).
- in flow context (`[...]` or `{...}`), `,`, `[`, `]`, `{`, `}` also terminate
  the scalar.
- line folding: plain scalars can span multiple lines; line breaks fold to
  spaces, empty lines fold to a newline. a tokenizer generally does not need
  to compute folding, only tokenize each line's content.
- plain scalars resolve (under core schema) to null / bool / int / float /
  string depending on content match.

**single-quoted strings** `'...'`

- the only escape is `''` (two consecutive single quotes) which produces one
  literal `'`. no backslash escapes.
- may span multiple lines; line folding rules apply (line break becomes space,
  blank line becomes newline).
- a trailing whitespace before a line break and leading whitespace on the
  next line are stripped by the folding rule.

**double-quoted strings** `"..."`

- full escape sequence support (see 2.6 below).
- may span multiple lines; line folding rules apply.
- a backslash at end of line suppresses the line break entirely (line
  continuation), like shell/c.

**block scalar: literal** `|`

- header: `|` optionally followed by indentation indicator (`1`..`9`) and/or
  chomping indicator (`-` strip, `+` keep, default clip).
  - `|` — literal, clip (single trailing newline).
  - `|-` — literal, strip (no trailing newline).
  - `|+` — literal, keep (preserve all trailing newlines).
  - `|2` — literal, explicit 2-space indentation.
  - `|2+`, `|+2`, `|-2`, etc. — any order of digit and `+`/`-`.
- header is followed by optional comment, then line break. body starts on next
  line.
- body is indented relative to the parent node (or by the header's digit if
  present); every line with indentation greater than or equal to the detected
  indent is content. line breaks are preserved verbatim (no folding).
- ends at the first line whose indentation is less than the detected content
  indent (or end of stream).

**block scalar: folded** `>`

- header: same rules as literal (`>`, `>-`, `>+`, `>2`, etc.).
- body: same indentation rules, but line breaks fold to spaces, blank lines
  become newlines, and "more indented" lines (indented beyond the base content
  indent) keep their own line breaks.
- chomping applies to the trailing newlines the same way as literal.

**flow scalars in collections**: inside `[...]` or `{...}`, plain / quoted /
block scalars all have additional termination rules (see 2.1, 2.7).

### 2.3 numeric literals (core schema)

all numeric values are plain scalars — the lexer needs to tokenize them as a
plain scalar first, then a reclassifier decides whether to emit them as
`number` vs `string`. regex patterns from yaml 1.2.2 §10.3.2:

- **decimal int**: `[-+]?[0-9]+`
- **octal int**: `0o[0-7]+` (note: the yaml 1.1 form `01234` is NOT an octal
  in 1.2; it's a decimal. in 1.1 it was octal. many 1.1-era files depend on
  this; a permissive highlighter can still emit `01234` as `number` since
  either way it's numeric.)
- **hex int**: `0x[0-9a-fA-F]+`
- **float**: `[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?`
- **infinity**: `[-+]?(\.inf|\.Inf|\.INF)`
- **nan**: `\.nan|\.NaN|\.NAN`

NO other numeric forms in core schema: no binary (`0b...`) prefix, no digit
separators, no numeric suffixes.

yaml 1.1 extras seen in the wild:

- commas as thousand separators: `1,000,000` — DO NOT highlight as number,
  `,` is too overloaded (flow entry). keep as plain scalar.
- sexagesimal: `1:2:3` meaning `3723` — likewise do not specialize.

### 2.4 booleans and null (core schema)

- **bool**: `true | True | TRUE | false | False | FALSE` (exactly these six).
- **null**: `null | Null | NULL | ~ | <empty>`. the `<empty>` case means an
  absent value (e.g., `key:` with nothing after the colon) is a null scalar.
  the tokenizer does not need to synthesize an "empty null" token — no
  characters to color.

legacy yaml 1.1 booleans (still matched by many tools):

- `y | Y | yes | Yes | YES | n | N | no | No | NO`
- `on | On | ON | off | Off | OFF`

a permissive highlighter should accept these. flag in the grammar comment that
this is 1.1-compat, not 1.2.

### 2.5 timestamp literals (yaml 1.1 legacy; not in 1.2 core)

1.2 core schema dropped the `!!timestamp` implicit type. most editors still
highlight iso-8601-looking strings. the 1.1 regex:

```
[0-9]{4}-[0-9]{2}-[0-9]{2}                                # date
(?:
  [Tt\x20]                                                # separator
  [0-9]{1,2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]*)?               # time
  (?:[\x20\t]*(?:Z|[-+][0-9]{1,2}(?::?[0-9]{2})?))?       # tz
)?
```

emit as `number` (prism's alias convention for datetime) or a dedicated
`datetime` token if the theme distinguishes.

### 2.6 escape sequences (double-quoted only)

verbatim list from yaml 1.2.2 §5.7 (c-ns-esc-char):

| escape       | meaning                                  | codepoint  |
| ------------ | ---------------------------------------- | ---------- |
| `\0`         | null                                     | U+0000     |
| `\a`         | bell                                     | U+0007     |
| `\b`         | backspace                                | U+0008     |
| `\t`         | horizontal tab                           | U+0009     |
| `\<TAB>`     | (literal tab, only inside double-quoted) | U+0009     |
| `\n`         | line feed                                | U+000A     |
| `\v`         | vertical tab                             | U+000B     |
| `\f`         | form feed                                | U+000C     |
| `\r`         | carriage return                          | U+000D     |
| `\e`         | escape                                   | U+001B     |
| `\ `         | literal space                            | U+0020     |
| `\"`         | literal double quote                     | U+0022     |
| `\/`         | literal forward slash (json compat)      | U+002F     |
| `\\`         | literal backslash                        | U+005C     |
| `\N`         | next line                                | U+0085     |
| `\_`         | non-breaking space                       | U+00A0     |
| `\L`         | line separator                           | U+2028     |
| `\P`         | paragraph separator                      | U+2029     |
| `\xXX`       | 8-bit unicode                            | U+00XX     |
| `\uXXXX`     | 16-bit unicode                           | U+XXXX     |
| `\UXXXXXXXX` | 32-bit unicode                           | U+XXXXXXXX |
| `\<break>`   | line continuation (escape + line break)  | —          |

an unrecognized escape (e.g., `\z`) is a lexical error in strict parsers. a
permissive highlighter should emit the `\z` as two characters: `\` as
`string.escape.invalid` (or just string) and `z` as string, and let the parse
continue.

### 2.7 comments

- `#` starts a comment that runs to end of line.
- `#` is only a comment indicator when preceded by whitespace (or at start of
  line). `foo#bar` is a scalar, `foo #bar` has a comment.
- inside quoted scalars (single or double), `#` is literal.
- inside block scalar bodies (between the header and the de-indent), `#` is
  literal.
- between the block-scalar header line and the body, a `#` can appear as a
  comment: `|  # this is a comment` — the header and comment both count as the
  header line.

### 2.8 directives (only at document start)

- `%YAML <major>.<minor>` — e.g. `%YAML 1.2`. only one allowed per document.
- `%TAG <handle> <prefix>` — e.g. `%TAG !! tag:example.com,2024:`. multiple
  allowed.
- `%<anything_else>` — reserved directive. grammar should emit it as a
  directive token without trying to parse arguments.

directives appear before `---`. the first non-directive, non-blank line either
starts with `---` (explicit doc start) or begins the first node.

### 2.9 document markers

- `---` at start of a line, followed by whitespace or eol: document start
  (directives-end).
- `...` at start of a line, followed by whitespace or eol: document end.
- both are only tokens when on their own at column 0; otherwise they're part
  of a plain scalar. (e.g., `---foo` at column 0 with no space after the
  hyphens is actually `---foo` as a plain scalar per spec, since the
  directives-end marker requires trailing whitespace or eol. in practice
  highlighters are relaxed about this.)

### 2.10 node properties (anchors, aliases, tags)

anchors and aliases share the same name character set (c-ns-anchor-char):
any `ns-char` that is not a flow indicator. i.e.:

```
any printable non-space, non-tab character except , [ ] { }
```

this is broader than "word chars". valid anchor names include `my.anchor`,
`anchor!name`, `a/b`, `a:b`, `a#b`. in practice tree-sitter and most editors
restrict to a simpler subset; we should follow the spec.

- **anchor**: `&name`
- **alias**: `*name`
- **tag shorthand**: `!`, `!!typename`, `!typename`, `!handle!local`
- **tag verbatim**: `!<uri>`, where uri is any ns-uri-char (see 2.11)
- **non-specific tag**: `!` alone (no following name) — forces non-plain
  resolution.

ordering rules: tag and anchor may be combined in either order on the same
node: `!!str &anchor "value"` and `&anchor !!str "value"` are equivalent.
whitespace between properties is required.

### 2.11 tag character sets

- `ns-uri-char` = word chars, `%XX` hex escapes, and `# ; / ? : @ & = + $ , _ . ! ~ * ' ( ) [ ]`
- `ns-tag-char` = `ns-uri-char` minus `!`, `[`, `]`, `{`, `}`, `,`

inside a verbatim tag `!<uri>`, the full `ns-uri-char` set is allowed (including
`[` and `]` — they delimit only the flow context, not the uri inside the angle
brackets). outside verbatim form, tag names use `ns-tag-char`.

### 2.12 operators

yaml has no operators in the expression sense. what this grammar needs to
handle:

- `:` (mapping value separator)
- `-` (block sequence entry)
- `?` (explicit block mapping key)
- `,` (flow entry separator)

all of these are punctuation / structural, not operators.

### 2.13 identifiers

yaml has no identifiers per se. the closest are:

- anchor / alias names (see 2.10)
- tag handles (`!`, `!!`, `!foo!`)
- directive names (`YAML`, `TAG`, plus reserved)
- plain scalars (unquoted text, the default scalar form)

### 2.14 punctuation and delimiters

- `-` block sequence entry (only when followed by whitespace at start of line)
- `?` explicit block key (only when followed by whitespace)
- `:` block mapping value (when followed by whitespace or eol)
- `,` flow entry separator
- `[` / `]` flow sequence
- `{` / `}` flow mapping
- `|` / `>` block scalar headers
- `'` / `"` quote delimiters
- `#` comment start
- `&` anchor / `*` alias / `!` tag (see 2.10)
- `%` directive start
- `---` / `...` document markers
- `@` / `` ` `` reserved (forbidden in plain scalars)

### 2.15 special syntax

- **flow-indented block scalars**: none. block scalars `|` and `>` are only
  valid in block context, never inside `[]` / `{}`.
- **complex keys**: `? <any node>\n: <any node>` — block mapping with
  non-scalar keys. the `?` at start of line is the marker.
- **implicit keys**: a scalar followed by `:` is a key. `foo: bar` is parsed
  as a mapping; `foo` is a key, `bar` is a value. highlighters typically emit
  a distinct `key` (alias of `property` or `atrule`) for the scalar before
  `: `.
- **merge key**: `<<` is a conventional key name for psych/ruby's merge
  feature (`<<: *base`). not a 1.2 spec feature but widely used. emit as
  plain scalar / key; no special styling required.

---

## 3. edge case inventory

### 3.1 plain scalar boundary rules

- `foo: bar` → `foo` (key), `:` (punctuation), `bar` (plain scalar).
- `foo:bar` → `foo:bar` is a plain scalar. the `:` is not a value separator
  because no whitespace follows.
- `foo :bar` → tricky. the spec considers this `foo ` as a plain scalar key
  (trailing whitespace stripped) followed by `:bar` as another plain scalar,
  but in a block mapping this is actually a syntax error. most highlighters
  emit `foo` as scalar, `:` as punctuation, `bar` as scalar.
- `foo #bar` → `foo` (plain scalar), `#bar` (comment). the space before `#` is
  mandatory.
- `foo#bar` → `foo#bar` (plain scalar).
- `- foo` at column 0 → `-` (punctuation), `foo` (plain scalar).
- `-foo` at column 0 → `-foo` is a plain scalar. no whitespace after `-`.
- `---` at column 0 alone on a line → document start.
- `---foo` at column 0 → plain scalar (no whitespace after `---`). rare, but
  technically valid per spec.

### 3.2 quoted scalars

- double-quoted spanning lines: `"line1\n  line2"` — the `\n` at end and
  leading whitespace on next line get folded to one space per spec. a
  tokenizer just emits string tokens for each line's content.
- single-quoted `''` inside: `'it''s'` → content is `it's`. the doubled quote
  is an escape, not a terminator.
- empty quoted scalars: `""` and `''` are valid empty strings.
- unclosed quote to eof: lexical error; highlighters typically emit the quote
  as string-start and keep everything to eof as string content.
- escape sequences at eol: `"abc\` followed by newline + next line is line
  continuation. the newline is consumed.

### 3.3 block scalar headers

- `|` alone: literal, clip, auto-detect indent. valid.
- `|+`, `|-`: chomping only.
- `|2`, `|-2`, `|+2`, `|2-`, `|2+`: indentation + chomping, in either order.
- `|abc`: invalid (chomping/indicator must be `+`/`-` or `1`..`9`). emit as
  block header with the trailing chars as error / text.
- `|  # comment here` → header, then comment. body starts next line.
- block scalar at end of flow: not allowed. flow context disables `|` / `>`.

### 3.4 document boundaries and directives

- `%YAML 1.3` is a future minor version; spec says processors should warn but
  accept. emit as directive.
- `%YAML 2.0` is a future major version; should be rejected. still emit as
  directive (it's a well-formed directive).
- bare directives without a `---` after them: the first non-blank, non-comment
  line after the directives starts the doc (implicit doc start). `---` is
  explicit but optional... EXCEPT when any directive is present, then `---`
  is required per spec. highlighters should not enforce this.
- multiple documents in one stream: directives reset per document. `...`
  ends one, `---` starts the next.

### 3.5 anchors and aliases

- `&` with nothing after: invalid. emit as punctuation alone.
- `*foo` in a value position: alias. `*foo` at start of plain scalar: alias,
  not plain scalar.
- anchor names with colons: `&my:anchor` — legal per spec, rare in practice.
  parse as anchor with name `my:anchor`.
- reused anchor names: spec allows the same name to be reassigned; later
  references resolve to the most recent definition. no lexical impact.

### 3.6 tags

- `!str` → shorthand with primary handle `!`, expands to `!str` (local).
- `!!str` → shorthand with secondary handle `!!`, expands to
  `tag:yaml.org,2002:str`.
- `!foo!bar` → shorthand with named handle `!foo!`, local part `bar`.
- `!<tag:example.com,2024:foo>` → verbatim tag.
- `!` alone → non-specific tag.
- whitespace requirements: `!!str "value"` — single space between tag and
  scalar. a tag without trailing whitespace is probably still valid but
  ambiguous: `!str"foo"` is either (a) tag `!str` then `"foo"`, or (b) malformed.

### 3.7 numeric / boolean / null detection ambiguity

- `.5` is a float. `5.` is a float. `.` alone is a plain scalar (string).
- `-` alone is a plain scalar (not a number). `-5` is a float/int.
- `0x`, `0o` without digits: plain scalar (not numeric).
- `true` is bool, but `true foo` (with any following char forming a longer
  plain scalar) is a string. the boolean pattern matches only when the plain
  scalar is _exactly_ `true` etc. — a reclassifier needs to check the whole
  scalar, not just a prefix.
- `Null` and `NULL` — both null. `null-value` — string.
- same for bool: `true-ish` is a string. anchoring on the full scalar range
  after tokenization is mandatory.

### 3.8 case sensitivity

- core schema null/bool/float-special forms have restricted case (see 2.4,
  2.3). case matters: `True` is bool, `tRUe` is a string.
- tag names are case-sensitive (`!!str` ≠ `!!Str`).
- anchor names are case-sensitive.
- directive names (`YAML`, `TAG`) are case-sensitive.

### 3.9 whitespace

- only space (u+0020) and tab (u+0009) are whitespace within a line.
- tabs are forbidden in indentation (would make indentation depth
  ambiguous). they are allowed in separation spaces (between a scalar and
  its `:`, inside a flow collection, etc.). a tokenizer does not need to
  enforce this; parsers catch it.
- line breaks: lf (u+000a), cr (u+000d), or crlf. non-ascii line breaks
  (u+0085 next-line, u+2028 line-separator, u+2029 paragraph-separator) are
  NOT line breaks in yaml 1.2 (for json compat). yaml 1.1 treated them as
  line breaks. twinkleplop should follow 1.2.

### 3.10 flow context changes

plain scalars in flow context (`[...]`, `{...}`) cannot contain `,`, `[`, `]`,
`{`, `}` (they terminate the scalar). outside flow, these are literal. this
means the tokenizer needs a flow depth counter (increment on `[`/`{`,
decrement on `]`/`}`) or an equivalent state.

example: `[a, b, c]` — `a`, `b`, `c` are plain scalars; `,` separates.
without flow context, `a, b, c` as a line would be one plain scalar
`a, b, c` because `,` is not a plain-scalar terminator outside flow.

### 3.11 indentation-based tokenization

purely lexical tokenization cannot detect block-scalar end perfectly without
tracking indentation. practical approach:

- for `|` / `>` headers, consume the rest of the header line, then keep
  consuming lines as block-scalar content until a line has less indentation
  than the first content line.
- for implicit block mappings / sequences, indentation changes are handled
  by the collection structure, which we don't need to recover lexically —
  emit tokens per line and let `:` / `-` / `,` be the signals.

### 3.12 the `%` in non-directive context

- `%` at column 0 starts a directive.
- `%` in the middle of a line is just a plain scalar character. `foo: 50%` is
  `foo` key, `:` sep, `50%` plain scalar.
- `%` cannot start a plain scalar (it's a c-indicator). but it can appear
  inside one after a non-indicator start character.

### 3.13 bom

yaml 1.2 permits a leading utf-8 bom (u+feff) at the start of a stream and
at the start of every document in a multi-doc stream. tokenizer should skip
it (not emit a token).

### 3.14 the merge key `<<`

not a yaml 1.2 feature but universally supported. `<<: *base` merges the
aliased mapping. purely lexical — `<<` is a plain scalar key — but a theme
might want to highlight it as a keyword.

---

## 4. nesting and context constructs

```
double-quoted string
  opens: "
  closes: " (unescaped)
  nests: nothing (escapes are the only sub-construct)
  escapes: \0 \a \b \t \n \v \f \r \e \" \\ \/ \N \_ \L \P \xXX \uXXXX \UXXXXXXXX \<tab> \<space> \<linebreak>
  folding: unescaped line break + leading whitespace on next line fold to
           a single space; empty lines fold to line feed. tokenizer does
           not compute the result, only colors the characters.
```

```
single-quoted string
  opens: '
  closes: ' (not followed by another ')
  nests: nothing
  escapes: '' → literal '
  folding: same line-folding rules as double-quoted.
```

```
plain scalar (block context)
  opens: any ns-char that is not c-indicator, or one of ?/:/- followed by a
         non-whitespace character
  closes: whitespace + # (comment), `: ` (mapping value), end of line, or
          end of node
  nests: nothing
  escapes: none
  folding: multi-line plain scalars fold line breaks to spaces; empty lines
           fold to line feeds.
```

```
plain scalar (flow context)
  opens: same as block
  closes: additionally, , [ ] { } terminate the scalar
  nests: nothing
  escapes: none
```

```
literal block scalar
  opens: | at end of line (after optional indentation/chomping indicators)
  closes: a line less-indented than the content base indent, or end of stream
  nests: nothing (no escapes, no interpolation, truly raw)
  content rules: line breaks preserved, indentation stripped by detected amount
```

```
folded block scalar
  opens: > at end of line (after optional indicators)
  closes: same as literal
  nests: nothing
  content rules: line breaks fold to spaces by default; blank lines become
                 newlines; "more-indented" lines keep their line breaks
```

```
flow sequence
  opens: [
  closes: ]
  nests: flow sequence, flow mapping, any scalar (plain/quoted), anchor,
         alias, tag, comment (comments allowed between entries)
  separators: , (optional trailing comma allowed)
  special: inside, plain scalars have restricted terminators (, [ ] { })
```

```
flow mapping
  opens: {
  closes: }
  nests: flow sequence, flow mapping, any scalar, anchor, alias, tag, comment
  separators: , between pairs; : between key and value (must be followed by
              space or be at end of flow node)
  special: ? can prefix a key; trailing comma allowed; empty pairs allowed
           (e.g., { , , } is not valid but { : } is an empty-key empty-value
           pair)
```

```
block sequence
  opens: - followed by space or line break at the current logical indent
  closes: a line less-indented than the sequence items
  nests: block sequence, block mapping, flow sequence, flow mapping, any
         scalar, block scalar, anchor, alias, tag, comment
  separators: each entry starts with a new `-` at the same indentation
```

```
block mapping
  opens: (implicit) a plain scalar followed by `: `
          (explicit) `?` followed by space starts a complex key, then `:`
          on a later line at the same indent denotes the value
  closes: a line less-indented than the mapping pairs
  nests: same set as block sequence
```

```
directive block
  opens: % at column 0
  closes: end of line
  nests: nothing
  structure: %YAML <version>, %TAG <handle> <prefix>, %RESERVED <anything>
```

```
document
  opens: start of stream, or --- at column 0 followed by whitespace/eol
  closes: ... at column 0 followed by whitespace/eol, another --- starting
          the next document, or end of stream
  nests: directives (only before ---), one root node, comments between
  note: in a single-document stream without directives, --- and ... are
        optional; the whole stream is one document.
```

```
comment
  opens: # preceded by whitespace or start of line
  closes: line break
  nests: nothing
  special: comments are allowed between tokens, between collection items,
           after a block scalar header, and on their own lines.
```

```
tag / anchor / alias node property
  opens: ! & or *
  closes: whitespace, line break, or flow indicator (depending on context)
  nests: nothing (tags can contain uri-escape %XX but that's a sub-token,
         not a nested construct)
  special: tag and anchor can both be applied to the same node, in either
           order, separated by whitespace.
```

---

## 5. manual trace

traces use plain english. grammar-author will re-map "enter x" to concrete
state-machine operations.

### trace 1: multi-document file with directives, anchors, flow mapping

input:

```
%YAML 1.2
%TAG !e! tag:example.com,2024:
---
server: &default
  host: localhost
  port: 8080
clients:
  - *default
  - { host: "10.0.0.1", port: 9090 }
  - !e!special
    host: 'example.com'
    port: 443
...
```

trace (condensed; per-line unless a line needs sub-line detail):

- `%YAML 1.2\n`
  - `%` at col 0 → enter directive
  - `YAML` → directive name
  - ` ` → whitespace (separator within directive)
  - `1.2` → directive argument (version, plain text inside directive)
  - `\n` → exit directive, line break
- `%TAG !e! tag:example.com,2024:\n`
  - `%` → enter directive
  - `TAG` → directive name
  - `!e!` → tag handle (argument 1)
  - `tag:example.com,2024:` → tag prefix (argument 2)
  - `\n` → exit directive
- `---\n`
  - `---` at col 0 + eol → document start marker
- `server: &default\n`
  - `server` → plain scalar (key, since `:` follows with space)
  - `:` → mapping value separator
  - ` ` → whitespace
  - `&default` → anchor (`&` is anchor indicator, `default` is ns-anchor-char+)
  - `\n` → line break (the value is a collection on following lines)
- `  host: localhost\n`
  - (2 spaces of indent, just whitespace)
  - `host` → plain scalar (key)
  - `:` → mapping value separator
  - ` ` → whitespace
  - `localhost` → plain scalar (value)
  - `\n` → line break
- `  port: 8080\n`
  - `port` → plain scalar (key)
  - `:` → sep, ` ` → ws
  - `8080` → plain scalar (reclassifier says number)
- `clients:\n` → `clients` plain scalar key, `:` sep, eol (value follows)
- `  - *default\n`
  - `  ` → indent
  - `-` followed by ` ` → block sequence entry
  - `*default` → alias
- `  - { host: "10.0.0.1", port: 9090 }\n`
  - `- ` → block sequence entry
  - `{` → enter flow mapping (flow depth = 1)
  - ` ` → ws
  - `host` → plain scalar (key)
  - `:` → sep, ` ` → ws
  - `"10.0.0.1"` → enter double-quoted string, content, exit
  - `,` → flow entry separator
  - ` ` → ws
  - `port` → plain scalar key, `:` sep, ` ` ws
  - `9090` → plain scalar (number)
  - ` ` → ws
  - `}` → exit flow mapping (flow depth = 0)
- `  - !e!special\n`
  - `- ` → block sequence entry
  - `!e!special` → tag (shorthand, handle `!e!`, local name `special`)
- `    host: 'example.com'\n`
  - `host` → plain scalar (key), `:` → sep, ` ` → ws
  - `'` → enter single-quoted string
  - `example.com` → string content
  - `'` → exit single-quoted string
- `    port: 443\n` → same as before, `443` is number.
- `...\n` → document end marker

key observations from this trace:

- flow depth tracking is needed between `{` and `}`.
- after `:` + whitespace, the next token is a value; reclassifier looks at the
  full plain scalar to decide number vs string vs bool etc.
- anchors and aliases consume characters greedily until a flow indicator or
  whitespace.

### trace 2: block scalars with headers and indentation indicators

input:

```
description: >-
  This is a folded
  scalar that spans

  multiple paragraphs.

code: |2
    indent preserved
    from column 2
more: value
```

trace:

- `description` → plain scalar key
- `:` → sep, ` ` → ws
- `>-` → block scalar header (folded, strip chomping)
  - `>` → folded indicator
  - `-` → strip chomping
- `\n` → end of header line
- `  This is a folded\n` → block scalar body line 1 (indent = 2 = base)
- `  scalar that spans\n` → block scalar body line 2
- `\n` → blank line (becomes newline in folded output; still body)
- `  multiple paragraphs.\n` → body line 3
- `\n` → blank line (trailing; chomping `-` strips it)
- `code` → this line's indentation is 0, LESS than 2. block scalar ENDS.
  tokenizer emits `code` as plain scalar key.
- `:` sep, ` ` ws
- `|2` → block scalar header (literal, explicit indent = 2)
  - `|` → literal indicator
  - `2` → indentation indicator (content is indented 2 spaces more than
    parent, so effectively 2 cols)
- `\n`
- `    indent preserved\n` — 4 spaces of indent. content is stored as
  "stripped by 2 spaces" → `  indent preserved`. (tokenizer just tokenizes
  line as block-scalar body; the folding/stripping is semantic.)
- `    from column 2\n` — same
- `more` → col 0, less indent than 2, block scalar ends. plain scalar key.
- `:` sep, ` ` ws, `value` plain scalar.

observations:

- `>-` requires recognizing two header characters, in strict left-to-right
  order: first `>` or `|`, then optional digit and/or `+`/`-`.
- the block scalar end is detected by a line whose indentation drops below
  the detected base. for `|2`, the base is explicitly 2 (relative to parent).
  for `>-`, the base is auto-detected from the first content line's indent.
- blank lines inside the block scalar stay inside it; an empty line does not
  end a block scalar.

### trace 3: flow-heavy content with tags, comments, numeric edge cases

input:

```
# top-level comment
metrics:
  latency_ms: 1.5e-3  # float with exponent
  count: 0x1F
  weird: +.inf
  bits: 0b1010       # NOT a yaml 1.2 number, but pyyaml accepts it
  ratio: 3:00:00     # sexagesimal (yaml 1.1), but parsed as plain string in 1.2
  empty:
  nullable: ~
  legacy_bool: yes   # yaml 1.1 bool, yaml 1.2 string
  path: /usr/local/bin
  regex: '\d+\.\d+'  # single-quoted: no escape processing
  items: [1, 2, !!str 3, &a 4, *a]
```

trace (per-line):

- `# top-level comment\n` → comment (the `#` is at col 0, which is
  "preceded by start of line")
- `metrics:\n` → plain scalar key `metrics`, `:` sep, eol
- `  latency_ms: 1.5e-3  # float with exponent\n`
  - `  ` ws
  - `latency_ms` plain scalar key
  - `:` sep, ` ` ws
  - `1.5e-3` plain scalar → reclassifier: matches float pattern → number
  - `  ` ws (two spaces)
  - `#` preceded by ws → enter comment
  - ` float with exponent` comment body
  - `\n` exit comment
- `  count: 0x1F\n`
  - `count` key, `:` sep, ws, `0x1F` plain scalar → reclassifier: hex int → number
- `  weird: +.inf\n`
  - `+.inf` plain scalar → reclassifier: float infinity → number
- `  bits: 0b1010       # NOT ... number\n`
  - `0b1010` plain scalar → reclassifier: NOT matched by core-schema int
    patterns (no 0b). emit as string. (permissive mode could emit as number;
    this is a decision for the grammar author.)
- `  ratio: 3:00:00     # sexagesimal ...\n`
  - `ratio` key, `:` sep, ws
  - `3:00:00` — now careful. this is tokenized as plain scalar starting with
    `3`. next character is `:` — but is it followed by whitespace? `:0` means
    no. so `:` is part of the plain scalar. same for the second `:`. the
    whole `3:00:00` is ONE plain scalar. reclassifier: no match → string.
    (yaml 1.1 would resolve to 10800. a permissive highlighter MAY emit as
    number; default to string for safety.)
  - then whitespace, then `#` comment.
- `  empty:\n`
  - `empty` key, `:` sep, eol. value is implicitly null. no value token to emit.
- `  nullable: ~\n`
  - `~` plain scalar → reclassifier: null → emit null token.
- `  legacy_bool: yes   # yaml 1.1 bool\n`
  - `yes` plain scalar → in strict 1.2: string. in permissive mode: bool.
- `  path: /usr/local/bin\n`
  - `/usr/local/bin` plain scalar. starts with `/` which is not a c-indicator;
    legal plain scalar first char. no sub-tokens. string.
- `  regex: '\d+\.\d+'\n`
  - `'` enter single-quoted string
  - `\d+\.\d+` string content — NO escape processing, `\` is literal in
    single-quoted.
  - `'` exit single-quoted
  - (important: this is a common bug — tokenizers that apply double-quote
    escape rules to single-quoted strings will mis-color `\d` as an escape.)
- `  items: [1, 2, !!str 3, &a 4, *a]\n`
  - `items` key, `:` sep, ws
  - `[` enter flow sequence (flow depth 1)
  - `1` plain scalar (number)
  - `,` flow sep, ` ` ws
  - `2` plain scalar (number)
  - `,` sep, ` ` ws
  - `!!str` tag (shorthand, secondary handle, local `str`)
  - ` ` ws
  - `3` plain scalar — but tagged with `!!str`, so a strict reclassifier
    respects the tag: emit as string. (most highlighters ignore the tag and
    still emit as number; tag-aware reclassification is a nice-to-have.)
  - `,` sep, ` ` ws
  - `&a` anchor
  - ` ` ws
  - `4` plain scalar (number)
  - `,` sep, ` ` ws
  - `*a` alias
  - `]` exit flow sequence (flow depth 0)

observations from trace 3:

- numeric vs string is decided by reclassifier over the FULL plain scalar
  span, not by a lookahead at first char.
- single-quoted vs double-quoted must be distinguished: double-quoted
  processes backslash escapes, single-quoted does not.
- comments require a whitespace-before-`#` rule to avoid eating `#` inside
  plain scalars.
- tags optionally override auto-typing of the following scalar. this is a
  reclassifier concern, not a tokenizer concern.
- flow sequences change the plain-scalar terminator set; the lexer needs
  flow-depth state.
