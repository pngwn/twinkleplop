# python lexical research

target: a python 3.12+ syntax highlighter (matches the current stable lexer
contract after pep 701 reformalized f-strings). the grammar should tokenize
all string and bytes prefix combinations, all numeric literal forms,
arbitrary f-string nesting (including quote reuse and backslashes), soft
keywords as identifiers (the parser, not the tokenizer, decides if `match` is
a keyword), and unicode identifiers at a practical level (accept ascii letters

- underscore + any non-ascii code point in id-continue/id-start, skip the full
  xid\_\* closure and nfkc normalization since those are parser concerns).

indentation-sensitive indent/dedent tokens are a parser concept; a character-
scanning highlighter does not need to emit them. the highlighter should color
the leading whitespace on each line as plain whitespace and let `:` / `def` /
`class` / `if` etc. carry the visual weight.

## sources consulted

primary (official):

- https://docs.python.org/3/reference/lexical_analysis.html — python 3.14.4 language reference, chapter 2 (the canonical lexical spec). local copy /tmp/python_lex.html
- https://peps.python.org/pep-0498/ — original f-string pep (3.6). local copy /tmp/pep498.html
- https://peps.python.org/pep-0701/ — syntactic formalization of f-strings (3.12). local copy /tmp/pep701.html
- https://peps.python.org/pep-3131/ — non-ascii identifiers (unicode xid\_\* + nfkc)
- https://peps.python.org/pep-0515/ — underscores in numeric literals (3.6)
- https://peps.python.org/pep-0526/ — variable annotations (syntax, no new tokens)
- https://peps.python.org/pep-0634/ — structural pattern matching (3.10, introduces soft keywords)
- https://peps.python.org/pep-0695/ — type parameter syntax (3.12, introduces the `type` soft keyword)
- https://peps.python.org/pep-0750/ — template strings (3.14, introduces `t` / `T` prefix)
- https://peps.python.org/pep-0414/ — re-added `u` prefix (3.3)

cross-reference (existing highlighters):

- https://github.com/tree-sitter/tree-sitter-python — tree-sitter grammar, models f-strings as a proper nested construct
- https://github.com/PrismJS/prism/blob/master/components/prism-python.js — prism grammar (regex-based, pragmatic)
- https://github.com/pygments/pygments/blob/master/pygments/lexers/python.py — pygments `PythonLexer` (the de-facto reference for docs.python.org's own code blocks)
- https://github.com/highlightjs/highlight.js/blob/main/src/languages/python.js — highlight.js grammar
- https://github.com/MagicStack/MagicPython — textmate grammar used by vscode's bundled python language support

gaps and calls:

- pep 701's grammar for f-strings is formalized as context-sensitive (the
  closing quote set depends on the opening prefix) and assumes a pda-style
  mode stack. a character-scanning tokenizer can still get this right by
  pushing an f-string mode onto the state stack each time it enters an
  expression, and remembering the opening quote string ('', '\'', '"', "'''",
  '"""') so it can match the right close.
- nfkc normalization of identifiers (pep 3131) is a semantic concern, not a
  lexical one — different identifier spellings that normalize to the same
  name are still distinct tokens. the highlighter just needs to accept the
  raw bytes.
- indentation-sensitive parsing (indent/dedent token emission) is out of scope
  for a character-scanning highlighter. the spec mandates a tabstop=8
  algorithm and raises `TabError` on mixed indentation; a highlighter never
  needs to compute it, since colons + keywords + indentation-appropriate line
  breaks are enough to make the visual block structure obvious.
- the 3.12 deprecation of invalid `\e` style escapes emits `SyntaxWarning` but
  the tokenizer still accepts them (unchanged bytes). future python versions
  will make them a `SyntaxError`. a highlighter should emit them as a distinct
  `string.escape.invalid` token so users see the warning even before runtime.
- the encoding declaration (`# -*- coding: name -*-` on line 1 or 2) is a
  protocol on top of comments; the tokenizer treats it as a plain comment.
  this highlighter may optionally emit a sub-token for the declaration's
  structured form, but it is not spec-required.

spec-wins policy: when pygments / tree-sitter / prism / highlight.js disagree
with the python language reference, the reference wins. documented conflicts:

- prism treats `r` and `u` prefixes but omits `t` and all combined forms
  (`rb`, `fr`, `tr`, etc.). follow the spec: accept every case-insensitive
  combination allowed by pep 701 and pep 750.
- highlight.js tokenizes f-string bodies with simple regex replacement; it
  does NOT handle arbitrary quote reuse or nested expressions. the spec
  (since 3.12) requires a nested tokenizer. follow the spec.
- prism's `selector_class` / `function` / `builtin` categories are semantic
  overlays on top of `NAME`, not lexical distinctions. the lexer emits
  `name`; a reclassifier (looking back at preceding `def` / `class` / `@`)
  decides whether to promote to `function` / `selector_class` / `decorator.name`.
- pygments colors `self` and `cls` as a distinct `builtin.pseudo` token.
  the spec does not privilege them — they are ordinary identifiers. the
  highlighter may still emit them specially since every theme expects it,
  but this is convention, not spec.

---

## 1. primary sources

python's lexical analyzer reads a decoded unicode code point stream (default
utf-8, or whatever the encoding declaration specifies) and produces these
token kinds:

- `NEWLINE` — logical line terminator
- `INDENT` / `DEDENT` — block structure (parser-only, synthesized from leading whitespace)
- `NAME` — identifiers, keywords, soft keywords (all one kind lexically)
- `NUMBER` — int / float / imaginary literals
- `STRING` — string, bytes, raw, u-prefix literals
- `FSTRING_START` / `FSTRING_MIDDLE` / `FSTRING_END` — f-string segments (pep 701)
- `TSTRING_START` / `TSTRING_MIDDLE` / `TSTRING_END` — t-string segments (pep 750, 3.14)
- `OP` — the union of operators and delimiters; the spec lists the specific
  strings and does not further split `op` into operator vs delimiter (see 2.4)
- `COMMENT` — not in the token stream returned to the parser, but the `tokenize`
  module reports it; a highlighter emits comments as a top-level token
- `ENCODING` — synthetic token reporting the file's encoding (not lexically
  significant for highlighting)
- `ENDMARKER` — end of stream

for highlighting, the categories we actually color are:

- `comment` — `#`-to-eol, plus the shebang variant
- `string` (plain, raw, bytes, u-prefix)
- `string.interpolated` / `template` — f-strings / t-strings
- `string.escape` — `\n`, `\xFF`, `\uXXXX`, `\UXXXXXXXX`, `\N{name}`, octal `\ooo`
- `string.escape.invalid` — unrecognized escape like `\z`
- `number` — any numeric
- `keyword` — the 35 reserved words (see 2.3)
- `keyword.control` — subset for themes that distinguish flow from declaration
- `constant.language` — `True`, `False`, `None` (the spec calls these keywords; most themes want them styled like constants)
- `builtin` — `self`, `cls`, and the list of `__builtins__` (theme convention, not spec)
- `operator` — all multi-character and single-character `OP` strings
- `punctuation` — `(` `)` `[` `]` `{` `}` `,` `:` `;` `.` `->` `@` (decorators) `=` (in default args)
- `identifier` (aka `name`) — everything else

---

## 2. token inventory

### 2.1 literals

**single-quoted string** `'...'`

- delimiters: `'` ... `'`
- no newline in content (unless escaped with `\<newline>` or raw ends the string unexpectedly)
- backslash escapes processed unless raw prefix
- may be prefixed with any allowed combination (see 2.1.7)

**double-quoted string** `"..."`

- same as single but with `"` delimiters

**triple-single-quoted string** `'''...'''`

- delimiters: `'''` ... `'''`
- newlines preserved as literal content
- a single or double `'` inside is literal, only `'''` terminates
- may contain `"` freely

**triple-double-quoted string** `"""..."""`

- delimiters: `"""` ... `"""`
- newlines preserved
- `"` and `""` (fewer than three) are literal content

**string prefixes (case-insensitive, must be immediately adjacent to quote)**

spec lists these allowed combinations (any case mix permitted):

| prefix     | meaning                                                    |
| ---------- | ---------------------------------------------------------- |
| `b`        | bytes literal (ascii only in source, non-ascii via escape) |
| `r`        | raw string (backslashes are literal)                       |
| `u`        | unicode (no-op, allowed for py2 compat since pep 414)      |
| `f`        | formatted string literal (f-string) (3.6+)                 |
| `t`        | template string literal (t-string) (3.14+)                 |
| `rb`, `br` | raw bytes (equivalent orderings)                           |
| `rf`, `fr` | raw f-string (no escape processing outside `{...}`)        |
| `rt`, `tr` | raw t-string (3.14+)                                       |

case-insensitivity means `Fr`, `FR`, `fR`, `BR`, `bR`, etc. are all valid.
all 16 case combinations of each 2-letter prefix are valid lexically.

**invalid prefix combinations** (reject):

- `ur` / `ru` / `uf` / `ut` / `ub` — `u` cannot combine with any other prefix
- `bf` / `fb` / `bt` / `tb` / `ft` / `tf` — `b`, `f`, `t` are mutually exclusive
- `rrb`, `frf`, etc. — no triple combinations

prefix must be immediately followed by the opening quote — whitespace between
prefix and quote is invalid (spec: "the prefix (if any) must be immediately
followed by the starting quote").

### 2.2 bytes literals

- always carry a `b` / `B` prefix (possibly combined with `r` / `R`)
- content is "ascii characters only" per spec. non-ascii code points in the
  source must be written as escape sequences (`\xFF`, `\o177`, etc.)
- `\N{...}`, `\uxxxx`, `\Uxxxxxxxx` are NOT recognized escapes in bytes
  literals; they stay literal (and generate a `SyntaxWarning` in 3.12+)

### 2.3 raw string literals

- `r` / `R` prefix disables escape sequence processing. every backslash is a
  literal backslash in the result.
- the only restriction: a raw string cannot end in an odd number of
  backslashes, because the final backslash would "escape" (for lexing
  purposes) the terminating quote. so `r"\"` is a syntax error but `r"\\"` is
  fine, and `r"\""` is a two-character string (`\` + `"`) that looks like it
  contains an escape but is actually `\` + escaped `"` for lexing purposes.
- a backslash followed by a newline in a raw string is literal `\` + `\n`,
  NOT a line continuation.

### 2.4 f-strings (formatted string literals)

introduced pep 498 (3.6), reformalized pep 701 (3.12). current rules:

- `f` / `F` prefix, optionally combined with `r` / `R` (`fr`, `rf`, `Rf`,
  `fR`, `FR`, `rF`, `Fr`, `RF` — 8 cased forms).
- quote: any of `'`, `"`, `'''`, `"""`. triple-quoted f-strings can span
  multiple lines.
- body is a mix of literal text (with `{{` / `}}` as escaped braces) and
  replacement fields `{...}`.
- replacement field syntax: `{ expression [=] [! conversion] [: format_spec] }`
  - expression: any python expression. since 3.12, may contain:
    - backslashes (including in string escapes inside nested strings)
    - newlines in both single-quoted and triple-quoted f-strings
    - `#` comments (but the closing `}` must then be on a later line —
      the `#` runs to end of physical line)
    - nested strings with the SAME quote character as the outer f-string
      (pre-3.12 this was a syntax error)
    - nested f-strings, recursively
    - `await` and `async for` (since 3.7); `:=` walrus and `lambda` must be
      parenthesized
  - `=` (debug specifier, 3.8+): prints `expression=result`. whitespace
    between `{` and `=` is preserved as part of the displayed source.
  - conversion: `!s` / `!r` / `!a` (calls `str()` / `repr()` / `ascii()`)
  - format_spec: everything after the `:` up to the matching `}`. may
    itself contain replacement fields (`:{width}.{prec}f`), and the
    format-spec's replacement fields may contain further format specs,
    but pep 701 only guarantees 2 levels.
- `{{` and `}}` outside replacement fields emit a literal `{` / `}`
- inside a replacement field, `{` and `}` must match: `{` opens a nested
  replacement; `}` closes the replacement field at that nesting level.
- **raw f-strings** (`rf"..."`): escape sequences in the literal parts are
  NOT processed (backslashes are literal). escape sequences inside
  replacement field expressions ARE processed by the inner string literals,
  as normal.
- **f-strings cannot be docstrings**: syntactically valid but ignored by
  `foo.__doc__`. purely a runtime behavior; no lexical impact.

### 2.5 t-strings (template string literals, 3.14+)

- `t` / `T` prefix, optionally combined with `r` / `R`
- syntax identical to f-strings (replacement fields, conversion, format spec)
- semantic difference only: produces a `string.templatelib.Template` object
  instead of a formatted `str`. lexer can treat identically to f-strings.

### 2.6 integer literals

formal grammar (from pep 515 + current spec):

```
integer:      decinteger | bininteger | octinteger | hexinteger | zerointeger
decinteger:   nonzerodigit (["_"] digit)*
bininteger:   "0" ("b" | "B") (["_"] bindigit)+
octinteger:   "0" ("o" | "O") (["_"] octdigit)+
hexinteger:   "0" ("x" | "X") (["_"] hexdigit)+
zerointeger:  "0"+ (["_"] "0")*
```

specific properties:

- no leading zeros on non-zero decimals: `0123` is `SyntaxError`, `0` and
  `000` are fine.
- underscore rules: can separate digits (`1_000`), but not at start
  (`_123`), not at end (`123_`), not doubled (`1__000`). after the base
  prefix: `0x_1f` valid, `0x__1f` invalid, `0_x1f` invalid (underscore
  before the prefix letter).
- hex digits are case-insensitive (`0xDeAdBeEf`).
- base prefix letter is case-insensitive (`0X`, `0B`, `0O`).
- no size limit.
- no type suffix (unlike rust / js, no `n` for bigint, no `L`).

### 2.7 float literals

```
floatnumber:
   | digitpart "." [digitpart] [exponent]
   | "." digitpart [exponent]
   | digitpart exponent
digitpart:  digit (["_"] digit)*
exponent:   ("e" | "E") ["+" | "-"] digitpart
```

specific properties:

- decimal point with or without fraction on either side: `1.`, `.1`, `1.1`
- exponent: `1e3`, `1.e3`, `1.5e3`, `1.5E-3`, `1e+3`
- exponent-only (no dot): `1e3` is a float, `1e` alone is not (needs digits)
- `.` alone is the attribute operator, not a float
- underscores between digits only: `1_000.000_1`, `1.5_0e1_0`
- leading zeros ALLOWED in float: `077.01` is legal (unlike integer)
- `inf` and `nan` are NOT literals — they are accessed via `float('inf')` /
  `math.inf`. there is no lexical infinity token.

### 2.8 imaginary (complex) literals

```
imagnumber: (floatnumber | digitpart) ("j" | "J")
```

- suffix `j` (or `J`) on any float or integer digit part
- `10j` → `complex(0, 10.0)` (note: this is a FLOAT with imaginary part, not
  an integer)
- `10.5j`, `1e3j`, `.5j`, `3.14_15j` all valid
- no whitespace between digits and `j`

### 2.9 comments

- `#` starts a line comment, runs to end of physical line
- no block comment syntax (`"""..."""` as a docstring is a string, not a comment)
- `#!` at start of file is a shebang; lexically it is just a comment. the os
  consumes it before python sees the file; python treats it as a comment.
- encoding declaration: if a comment on line 1 or line 2 matches
  `coding[=:]\s*([-\w.]+)`, it is the source encoding. line 2 is only
  inspected if line 1 is also a comment (or blank). the tokenizer emits
  an encoding declaration as a plain comment token — the match is handled
  by the encoding preprocessor before lexing.
- inside a string literal `#` is literal text, not a comment
- inside an f-string replacement field (3.12+) `#` starts a comment; the
  closing `}` must appear on a later line
- the spec does not treat doctest `>>>` prompts or sphinx `..` directives
  as anything special — they are comment content or string content.

### 2.10 escape sequences (non-raw string / bytes)

from spec §2.5.4:

| escape       | meaning                                |
| ------------ | -------------------------------------- |
| `\<newline>` | ignored (line continuation in strings) |
| `\\`         | backslash                              |
| `\'`         | single quote                           |
| `\"`         | double quote                           |
| `\a`         | BEL U+0007                             |
| `\b`         | BS U+0008                              |
| `\f`         | FF U+000C                              |
| `\n`         | LF U+000A                              |
| `\r`         | CR U+000D                              |
| `\t`         | TAB U+0009                             |
| `\v`         | VT U+000B                              |
| `\ooo`       | octal (1-3 digits, 0-7)                |
| `\xhh`       | hex (exactly 2 digits)                 |
| `\N{name}`   | named unicode char (str only)          |
| `\uxxxx`     | 16-bit unicode (str only; exactly 4)   |
| `\Uxxxxxxxx` | 32-bit unicode (str only; exactly 8)   |

notes:

- octal takes up to 3 digits; stops at first non-octal digit or after 3.
  `\1234` is `\123` + `4`.
- since 3.12 octal escapes with value > 0o377 generate `SyntaxWarning`.
- hex requires exactly 2 digits; `\xF` is a `ValueError` at decode time but
  lexically the tokenizer consumes `\x` + whatever hex digits follow.
  practical highlighters emit `\xF` as invalid escape.
- `\N{...}` is a braced name (e.g., `\N{LATIN SMALL LETTER A}`). inside
  bytes literal it is NOT recognized (stays as `\`, `N`, `{...}` sequence).
- any other backslash sequence (`\z`, `\q`, `\9`, `\8`) is an UNRECOGNIZED
  escape. spec says the backslash is preserved — `'\q'` is a 2-char string
  `\` + `q`. since 3.12, unrecognized escapes emit `SyntaxWarning`. in
  future they will be `SyntaxError`. a highlighter should mark these as
  `string.escape.invalid` to visually surface the warning.
- a backslash at end of line inside a non-raw string continues the string
  on the next line, consuming the newline.

### 2.11 keywords (35 hard keywords)

spec §2.3.1:

```
False      await      else       import     pass
None       break      except     in         raise
True       class      finally    is         return
and        continue   for        lambda     try
as         def        from       nonlocal   while
assert     del        global     not        with
async      elif       if         or         yield
```

- case-sensitive (`True` is a keyword; `true` is an identifier)
- `False` / `True` / `None` are keywords per the spec, but most themes style
  them as `constant.language` rather than `keyword`. see gap note above.
- `async` and `await` became hard keywords in 3.7 (were contextual in 3.5-3.6).
  follow 3.12+: hard keywords.

### 2.12 soft keywords

spec §2.3.2:

- `match`, `case`, `_` — soft keywords inside `match` statement (3.10+).
  outside, ordinary identifiers.
- `type` — soft keyword inside the new `type X = ...` statement (3.12+).
  outside, ordinary identifier (e.g. `type(x)` calls the builtin).
- **the tokenizer does NOT treat these specially**. they emit as `name`
  tokens. the parser context promotes them. a highlighter that wants to
  style them should do it with a post-pass or by examining preceding tokens.

### 2.13 operators and delimiters

from spec §2.7 (the `OP` category):

assignment (compound):

```
+= -= *= /= //= %= **= &= |= ^= <<= >>= @= :=
```

note `:=` (walrus operator) introduced in 3.8 (pep 572).

bitwise:

```
& | ^ ~ << >>
```

comparison:

```
< > <= >= == !=
```

arithmetic:

```
+ - * / // % ** @
```

note `@` is matrix multiplication (3.5+, pep 465) AND decorator prefix.

brackets (enclosing delimiters, trigger implicit line joining):

```
( ) [ ] { }
```

other delimiters:

```
, : ! ; = -> .
```

the ellipsis:

```
...
```

(three consecutive periods — a single token, not three `.` tokens)

**multi-character operators that need longest-match ordering** (longest first):

```
**=  //=  <<=  >>=  :=   ...   ->
==   !=   <=   >=   **   //   <<   >>   +=   -=   *=   /=   %=   &=   |=   ^=   @=
=    +    -    *    /    %    &    |    ^    ~    <    >    .    @    ,    :    ;    !    (    )    [    ]    {    }
```

(the bare `!` is listed as a delimiter by the spec but is not used outside
the f-string conversion `!s|!r|!a`. in normal code `!` alone is a syntax error.
the spec still calls it an `OP` token.)

### 2.14 identifiers

spec §2.3:

```
NAME:          name_start name_continue*
name_start:    "a"..."z" | "A"..."Z" | "_" | <non-ASCII character in xid_start>
name_continue: name_start | "0"..."9" | <non-ASCII character in xid_continue>
```

- unicode: any code point matching `XID_Start` can start a name; any in
  `XID_Continue` can continue it. the `_` is explicitly added to the start
  set.
- nfkc normalization is applied to names but not to string literal content
  or comments. two spellings that normalize to the same name are the SAME
  identifier at the runtime level but DIFFERENT tokens at the lexical level.
  highlighter does not normalize.
- practical approximation: accept ascii `[A-Za-z_]` followed by
  `[A-Za-z0-9_]*`, and additionally accept any non-ascii code point (>=
  U+0080) in either position. this over-accepts some code points that would
  be rejected by a strict xid\_\* test (emoji, math symbols), but lexers like
  pygments and tree-sitter use the same approximation.
- case-sensitive.

**reserved classes by underscore convention** (no lexical impact, theme convention):

- `_single` — conventionally "private" (not imported by `from mod import *`)
- `__dunder__` — system/protocol name
- `__mangled` — name-mangled in class scope
- `_` alone — wildcard in `match`; convention for "unused" elsewhere

### 2.15 whitespace and line structure

- whitespace within a line: space (u+0020), tab (u+0009), formfeed (u+000C).
  all three are interchangeable except at the start of a logical line, where
  tabs are expanded per the spec tabstop=8 rule (total multiple of 8) and
  formfeed is ignored for indentation.
- physical line terminators: LF, CRLF, or CR (classic mac). all normalize to
  LF before tokenization.
- logical lines formed by joining physical lines via:
  - explicit: trailing `\` before newline (not in string, not in comment).
    consumes the backslash and the newline; tokens span the join as if on
    one line.
  - implicit: inside `()`, `[]`, `{}`. newlines inside these brackets emit
    no `NEWLINE` token. the depth counter is the sole criterion.
- blank lines (only whitespace / comment) emit no `NEWLINE`.
- inside triple-quoted strings, newlines are string content, not line
  terminators.

### 2.16 special syntax

- **decorators**: `@expression` at start of a line (before a `def` / `class`).
  `@` is also the matmul operator — disambiguation is positional, not lexical.
- **type annotations**: `name: type = value` and `def f() -> type:`. `:` and
  `->` are regular delimiters; annotations are expressions at the parser
  level.
- **print statement** (py2) is a `print()` function in py3; nothing special.
- **async/await**: hard keywords since 3.7. `async def`, `async for`,
  `async with`, `await expr`.
- **walrus `:=`**: assignment expression (3.8+). requires parens when used
  inside f-string replacement fields.
- **type statement**: `type Alias = int | str` (3.12+). `type` is a soft
  keyword.
- **match/case**: `match x: case 1: ...` (3.10+). `match`, `case`, `_` are
  soft keywords inside.
- **star unpacking**: `*args`, `**kwargs`, `*,`, `/`. the `/` as positional-
  only marker (3.8+) is the same `/` token.
- **pattern matching class syntax**: `case Point(x=0, y=0):` uses existing
  tokens.

---

## 3. edge case inventory

### 3.1 string prefix + quote adjacency

- `f "..."` (space between `f` and `"`) is NOT an f-string; it is the name
  `f` followed by a string `"..."`. the prefix must be immediately adjacent.
- `f""` is a valid empty f-string.
- `F'text'`, `Rf"text"`, `fR"""text"""` all valid — case-insensitive prefix,
  any quote style.
- `rb"\x41"` is raw bytes: `\x41` is literal 4 chars, not an escape.
- `u"text"` is a plain string (u is a no-op). `U"text"` also valid.
- `ur"text"` / `ru"text"` is a SyntaxError (pep 414 removed the legacy
  ur-prefix).

### 3.2 number vs attribute access ambiguity

- `1.0` → float
- `1.method()` → SyntaxError, because `1.` lexes as a float literal first
  (longest-match wins), and `method` after a float is not a valid token
  sequence. this is a common beginner trap. the highlighter should tokenize
  `1.method` as `1.` (number, likely invalid) + `method` (name) — identical
  to how python reports the error.
- `(1).method()` → `1` (number) + `.` (dot) + `method` (name). works because
  `1.` is no longer the longest match.
- `1 .method()` → same as above with explicit whitespace.

### 3.3 number underscore positions

valid:

- `1_000_000`, `0x_ff`, `0b_1010`, `1_000.5`, `1.5_0e1_0`, `1_000j`

invalid:

- `_1` (starts with underscore → this is an identifier, not a number)
- `1_` (trailing underscore)
- `1__0` (double underscore)
- `0_x1f` (underscore before base letter)
- `0x__ff` (double underscore after base letter)

highlighter behavior: tokenize greedily as number; a trailing `_` falls off
and is an identifier continuation, which in python is a syntax error. for
highlighting, just emit the number including the spurious underscore.

### 3.4 zerointeger quirk

`0`, `00`, `000`, `0_0`, `0_0_0` are all valid decimals with value 0. but
`01` is a SyntaxError (leading zero on non-zero decimal). this exists to
disambiguate from c-style octal (`0NNN` was octal in py2; in py3 octal is
`0o...`). the `zerointeger` production in the formal grammar specifically
permits `0+ ([_] 0)*`.

### 3.5 imaginary vs integer ambiguity

- `10j` is imaginary (note: internally a float, not an int)
- `0j` is imaginary zero
- `10J` with capital J is also imaginary (case-insensitive)
- `10e0j` is imaginary (the exponent applies to the real part)
- `1_000_j` is invalid (trailing underscore before the `j`)
- no whitespace between the number and `j`: `10 j` → `10` + name `j`

### 3.6 triple-quote parsing

- `""""` (4 quotes): opens `"""` triple-quoted, content starts with `"`,
  needs another `"""` to close. if file ends here, syntax error.
- `""""""` (6 quotes): empty triple-quoted string.
- `""""""""` (8 quotes): triple-quoted string with content `""` (two chars).
- `"""x"""` standard triple-quoted string.
- `""` before `"""`: `""` is empty string, then `"""` opens a new triple-quoted
  string. lexing is greedy-from-left: always try `"""` first if in a
  position where a string literal can start.
- inside triple-quoted, `"` and `""` are literal content; only `"""` closes.
  so `"""He said ""hello"""""` is ambiguous. python's lexer matches the
  first `"""` as close: content is `He said ""hello"`, then `"""` closes,
  then `""` is an adjacent empty string literal (string concatenation).

### 3.7 f-string quote reuse (pre-3.12 vs 3.12+)

- pre-3.12: `f"hello {x["key"]}"` is a SyntaxError because the inner `"`
  reuses the outer delimiter.
- 3.12+: valid. the parser uses a proper pda and knows the `{...}` region
  has its own string nesting.
- a 3.12-era tokenizer MUST handle nested strings inside expression parts.
  the only way to do this with a character scanner is to treat `{` inside an
  f-string body as "push python mode, track `(`/`[`/`{` depth, on matching
  `}` at depth 0 pop back to f-string mode, but if a string literal starts
  inside the expression, enter a nested string mode".

### 3.8 f-string debug specifier and whitespace

- `f"{x=}"` → output `x=<repr>`. the `x=` text (including surrounding
  whitespace inside the braces) is copied verbatim from the source into the
  output. so `f"{  x  =  }"` outputs `"  x  =  <repr>"`.
- lexer implication: the span from `{` to `=` (and the `=` itself plus any
  trailing whitespace before `!` or `:` or `}`) must be preserved as source
  text, not re-tokenized.
- `=` is distinguished from `==` by position: the `=` debug specifier
  appears right after the expression. `f"{x==y}"` is valid: the inner is
  `x == y`.
- conversion `!` comes after `=`: `f"{x=!r}"`. then `:`: `f"{x=!r:>10}"`.

### 3.9 f-string comments (3.12+)

- `#` inside a replacement field starts a comment. the comment runs to end
  of the physical line. the `}` closing the replacement field therefore must
  be on a later line.
- example from spec: `f"abc{a  # comment  }"  continues to eol\n + 3}"` is
  parsed as `a + 3` with a `# comment` in the middle.
- implication: an f-string replacement field can span multiple physical
  lines even if the outer f-string is single-quoted (`f"..."`).

### 3.10 f-string format spec nesting

- `f"{x:>{width}}"` — format spec `>{width}` contains a replacement field.
- `f"{x:{fmt}}"` — format spec is just `{fmt}`, which resolves at runtime.
- nested levels inside format spec: pep 701 guarantees at least 2 levels.
  `f"{x:{y:{z}}}"` may or may not work depending on implementation.
- `{{` inside a format spec is still a literal `{`. but inside a nested
  replacement field's format spec, this does NOT apply — nested fields have
  their own `{{` rules.

### 3.11 f-string vs conversion `!`

- `!=` is NOT `!` + `=` — it is the inequality operator token.
- inside an f-string replacement field, after an expression, `!s`, `!r`,
  `!a` are conversion specifiers. `!=` at that position would be ambiguous,
  but python's rule is simple: the conversion spec is a single character
  (`s`/`r`/`a`) immediately after `!`. so `!=` in a replacement field
  continues the expression (it is the `!=` operator), and `!r` ends the
  expression and starts the conversion.
- practical: the parser, not the lexer, distinguishes these. for a
  character-scanning highlighter, emit `!` + `s|r|a` as conversion if at
  replacement-field-end position, otherwise as part of the `!=` operator.
  this is context-dependent.

### 3.12 raw string end-of-string trap

- `r"\"` → SyntaxError (the backslash escapes the quote for lexing, so
  the string is unterminated).
- `r"\\"` → two characters, `\` `\`.
- `r"\""` → two characters, `\` `"` (the `\"` is "an escape for lexing
  purposes only" — the result still contains the backslash).
- this rule is the classic "cannot end in odd number of backslashes" gotcha.
- raw f-strings inherit this: `rf"\"` is also a syntax error. but
  `rf"\{x}"` is valid and outputs `\<value>`.

### 3.13 ellipsis vs float dot

- `...` → ellipsis token (a single OP token, NOT three separate dots).
- `..` → SyntaxError (`.` followed by `.` where the second dot is not part
  of a number or a valid trailing dot).
- `1...2` → `1.` (float) + `..` (invalid) + `2` (int)? or `1` + `...` + `2`?
  actually python tokenizes as `1...2` → `1` + `...` + `2` if the lexer
  tries `...` first, OR `1.` (float) + `..` + `2` if it tries number first.
  cpython tokenizes the `...` only between non-digit contexts; in `1...2`
  it matches `1.0` first (or `1`?). in practice this is a sharp edge; pep
  grammars show `...` as a distinct token. most highlighters do NOT try to
  match `...` inside a number context.

### 3.14 contextual `@`

- `@` alone at start of a statement is a decorator: `@staticmethod`.
- `@` between expressions is matrix multiplication: `A @ B`.
- `@=` is compound matmul-assignment: `A @= B`.
- disambiguation is positional (parser-level). lexically all emit the same
  `@` / `@=` tokens.

### 3.15 encoding declaration vs regular comment

- a comment on line 1 or 2 matching `coding[=:]\s*([-\w.]+)` is the source
  encoding. must be on a line of its own. if on line 2, line 1 must also be
  a comment-only line.
- examples: `# -*- coding: utf-8 -*-`, `# vim:fileencoding=utf-8`.
- tokenizer still emits a normal comment token — the encoding match happens
  at a preprocessor layer before lexing proper. a highlighter MAY emit a
  sub-token for visual distinction.

### 3.16 bom

- utf-8 bom (U+FEFF) at start of file is allowed and silently consumed.
  does NOT emit a token. does NOT count as part of the first line for
  encoding-declaration purposes.
- bom elsewhere in the file is not special.

### 3.17 line continuation inside strings

- non-raw, non-triple string: `"abc\<NL>def"` → `"abcdef"` (backslash and
  newline are consumed).
- raw string: `r"abc\<NL>def"` → two extra characters `\` and `\n` preserved
  as-is. raw strings CANNOT use line continuation.
- triple-quoted non-raw: `"""abc\<NL>def"""` → `"abcdef"` (backslash-newline
  still consumed).
- triple-quoted raw: `r"""abc\<NL>def"""` → literal backslash + newline +
  def inside the string.

### 3.18 implicit string concatenation

- adjacent string literals with only whitespace/comments between them are
  concatenated: `"hello" " " "world"` → `"hello world"`.
- works across prefixes with matching types: `"abc" r"def"` → `"abcdef"`
  (both strings). but `"abc" b"def"` → TypeError at parse time (cannot mix
  bytes and str).
- `f"abc" "def"` works; `f"abc" f"def"` works.
- lexically, each literal is its own STRING / FSTRING\_\* token. the parser
  performs concatenation.

### 3.19 case sensitivity summary

- keywords: case-sensitive (`True` ≠ `true`)
- identifiers: case-sensitive
- hex digits: case-insensitive (`0xFF` = `0xff`)
- base prefixes: case-insensitive (`0X`, `0B`, `0O`)
- exponent `e`/`E`: case-insensitive
- imaginary `j`/`J`: case-insensitive
- string prefixes `b`, `r`, `u`, `f`, `t`: case-insensitive, each independently
- escape char names `\xhh`: hex digits case-insensitive
- `\N{NAME}`: the name is case-sensitive (unicode names are uppercase)

### 3.20 whitespace handling at start of line

- tabs expand to next multiple of 8 spaces (unix rule). `TabError` if this
  produces an ambiguous indent.
- formfeed `\f` at start of line is ignored for indentation computation.
- for highlighting purposes, leading whitespace on every line is just
  whitespace; we don't compute indent/dedent tokens.

### 3.21 operator longest-match ordering

critical order (longest first):

- `**=` must match before `**` which must match before `*=` which must match before `*`
- `//=` must match before `//` which must match before `/=` which must match before `/`
- `<<=` must match before `<<` which must match before `<=` which must match before `<`
- `>>=` must match before `>>` which must match before `>=` which must match before `>`
- `...` must match before `.`
- `->` must match before `-` (and before `-=`)
- `!=` must match before `!`
- `==` must match before `=`
- `:=` must match before `:` (context matters — see 3.14)

### 3.22 what python does NOT have (no-token-for)

these are traps where a naive highlighter might emit spurious tokens:

- no char literal form (`'x'` is just a 1-char string)
- no multi-line comments (no `/* */`, no `#{`)
- no regex literal
- no template literal backticks
- no `null` / `nil` (use `None`)
- no `undefined`
- no heredocs (use triple-quoted strings)
- no semicolons required (but `;` is a valid statement separator)
- no `++`, `--` operators (use `+=`, `-=`)
- no type cast operators (use `int(x)` function)
- no typeof / sizeof keywords
- no ternary `? :` (use `x if cond else y`)
- no arrow functions (use `lambda`)
- no spread operator (use `*` / `**`)

---

## 4. nesting and context constructs

```
single-quoted string (non-raw, non-f, non-t)
  opens: ' (after optional b/B/u/U prefix)
  closes: ' (unescaped)
  nests: nothing
  escapes: \<newline> (line continuation), \\ \' \" \a \b \f \n \r \t \v,
           \ooo (octal 1-3 digits), \xhh (exactly 2 hex), \N{name},
           \uxxxx (exactly 4 hex), \Uxxxxxxxx (exactly 8 hex)
           unrecognized \<any> preserved as-is (2-char sequence)
  restrictions: no unescaped newline (raw LF or CR ends the string as syntax error)
```

```
double-quoted string (non-raw, non-f, non-t)
  opens: "
  closes: " (unescaped)
  nests: nothing
  escapes: same as single-quoted
  restrictions: same as single-quoted
```

```
triple-single-quoted string (non-raw, non-f, non-t)
  opens: '''
  closes: '''
  nests: nothing
  escapes: same as single-quoted; additionally \<newline> inside a triple
          string is a line continuation (consumes the newline)
  restrictions: none (newlines are preserved as content)
```

```
triple-double-quoted string (non-raw, non-f, non-t)
  opens: """
  closes: """
  nests: nothing
  escapes: same
```

```
raw single-quoted string (r', R' prefix)
  opens: r' (or R', rb', Rb', rB', RB', br', bR', Br', BR')
  closes: ' (but a preceding backslash "escapes" it for lexing;
           `r"\"` is still a SyntaxError)
  nests: nothing
  escapes: none (backslashes literal)
  restrictions: cannot end in an odd number of backslashes
```

```
raw triple-quoted string
  opens: r''' r""" (with optional b/R/t case variants)
  closes: matching triple quote (same odd-backslash rule applies to the
          last character before the closing triple)
  nests: nothing
  escapes: none
  restrictions: newlines and all characters literal
```

```
bytes literal (b' prefix, non-raw)
  opens: b' or B' (or b"...")
  closes: matching single or triple quote
  nests: nothing
  escapes: all the string escapes EXCEPT \N{name}, \uxxxx, \Uxxxxxxxx.
           those three stay as literal bytes (and generate SyntaxWarning
           in 3.12+). \xhh, \ooo, \<standard escapes> work.
  restrictions: only ascii source characters; non-ascii must be \xHH or similar
```

```
raw bytes literal (rb' / br' prefix)
  opens: rb' (or br', Rb', RB', etc. — any case mix)
  closes: matching quote
  nests: nothing
  escapes: none (backslashes literal)
  restrictions: ascii only + odd-backslash rule
```

```
f-string (single or double-quoted, f or F prefix, 3.12+ rules)
  opens: f' (or F', fr', Fr', rF', rf', etc.)
  closes: matching quote
  nests: replacement fields { ... } (see below). also implicit newline-joining
         inside an enclosing {...}.
  escapes: the literal portions (outside {...}) process the full standard
          escape set, unless prefix includes r (then backslashes are literal).
          inside {...}, escapes are processed by whatever string literal(s)
          appear within the expression.
  literal braces: {{ emits {, }} emits }. ONLY outside replacement fields.
  restrictions: empty replacement field {} is invalid; lambda and walrus must
                be parenthesized inside replacement field.
```

```
triple-quoted f-string (f''' or f""" prefix + R case variants)
  opens: f''' or f"""
  closes: matching triple quote
  nests: same as single-quoted f-string plus unescaped newlines in literal parts
  escapes: same rules
  extra: very common in dedented template usage; newlines are literal
```

```
f-string replacement field
  opens: { (not followed by another {)
  closes: } at the same bracket depth (not followed by another }); or
          } at the matching depth from the opening {
  nests:
    - arbitrary python expression, which may include:
      - parentheses / brackets / braces (with depth tracking)
      - string literals with any quote style, including the same quote as
        the outer f-string (3.12+)
      - nested f-strings, recursively
      - comments starting with # running to end of physical line (3.12+)
      - backslashes (3.12+)
    - optional debug specifier = (after expression, preserving whitespace)
    - optional conversion !s !r !a
    - optional format spec after : (may contain nested replacement fields)
  exit rules:
    - the closing } is at the same parenthesis / bracket depth as the opening {
    - if inside format spec (after :), } at the top level of the spec closes
      the replacement field
    - newline inside the replacement field does NOT close it (3.12+)
```

```
f-string format spec (inside {expr:HERE})
  opens: : at the top level of the replacement field
  closes: } at the top level
  nests: more { ... } replacement fields (recursive), each with their own
         conversion and format spec. pep 701 guarantees only 2 levels of
         nesting are portable.
  special: {{ and }} do NOT get doubled-brace treatment here? the spec is
           ambiguous; in practice, inside a format spec, { starts a nested
           replacement field and } closes a spec. the "doubled brace" rule
           for literal { / } only applies in the OUTER f-string body, not
           inside format specs.
```

```
t-string (3.14+)
  identical lexical structure to f-string. only the token names differ
  (TSTRING_START / TSTRING_MIDDLE / TSTRING_END).
```

```
parenthesized / bracketed / braced group
  opens: ( [ {
  closes: ) ] }
  nests: any expression. newlines inside do NOT emit NEWLINE tokens
         (implicit line joining).
  special: depth counter. inside a { ... } group at the top level, the
           contents are a dict or set; tokenization is identical to
           top-level. inside an f-string replacement field { ... }, the
           outer { / } belongs to the f-string — only deeper { / } are
           dict/set braces.
```

```
line comment
  opens: # (not inside a string, bytes, f-string middle, or t-string middle)
  closes: end of physical line
  nests: nothing
  special: inside an f-string replacement field (3.12+), # starts a comment
           that runs to end of physical line, forcing the closing } to a
           later line
```

```
explicit line continuation
  opens: \ at end of physical line (not in string, not in comment)
  closes: consumed by the immediately following newline
  effect: the physical line following is a continuation of the current
          logical line; no NEWLINE token emitted; no token can span the
          continuation except string literals inside triple quotes (which
          use their own rules)
```

---

## 5. manual trace

traces use plain english — grammar-author re-maps "enter string" / "push
f-string mode" to concrete state operations.

### trace 1: decorator, class, method with type annotations, docstring

input:

```
@dataclass(frozen=True)
class Circle:
    """A circle with a radius."""
    radius: float = 1.0
    def area(self) -> float:
        return 3.14 * self.radius ** 2
```

trace:

- `@` at start of line → decorator start. emit `@` (punctuation or operator).
- `dataclass` → name (will be reclassified as decorator name by context).
- `(` → open paren. push paren depth.
- `frozen` → name (argument name).
- `=` → punctuation/operator (here it is the keyword-argument `=`).
- `True` → keyword (or constant.language).
- `)` → close paren. pop paren depth.
- `\n` → NEWLINE.
- `class` → keyword.
- ` ` → whitespace.
- `Circle` → name (reclassify as class-name by context: follows `class`).
- `:` → punctuation.
- `\n` → NEWLINE.
- `    ` → leading whitespace (INDENT at parser level; highlighter emits
  plain whitespace).
- `"""A circle with a radius."""` → triple-double-quoted string. enter string,
  consume content `A circle with a radius.`, see `"""`, exit string. this is
  a docstring by convention (first statement in a class body), but the lexer
  doesn't know that — it is just a STRING.
- `\n    ` → NEWLINE, whitespace.
- `radius` → name.
- `:` → punctuation.
- ` ` → ws.
- `float` → name (this is an annotation context, but the lexer doesn't know
  — it is just a name reference).
- ` ` → ws.
- `=` → operator.
- ` ` → ws.
- `1.0` → number (float).
- `\n    ` → NEWLINE, ws.
- `def` → keyword.
- ` area` → ws, name (reclassify as function name by context: follows `def`).
- `(` → open paren. push paren depth.
- `self` → name (pseudo-builtin by theme convention; spec says plain name).
- `)` → close paren. pop paren depth.
- ` ` → ws.
- `->` → operator (return type arrow). longest-match ensures `->` matches
  before `-`.
- ` float` → ws, name.
- `:` → punctuation.
- `\n        ` → NEWLINE, ws.
- `return` → keyword.
- ` ` → ws.
- `3.14` → number.
- ` ` → ws.
- `*` → operator.
- ` ` → ws.
- `self` → name.
- `.` → punctuation.
- `radius` → name.
- ` ` → ws.
- `**` → operator (longest-match over `*` `*`).
- ` ` → ws.
- `2` → number.
- `\n` → NEWLINE.

observations:

- no lexical distinction between decorator names, type names, function names,
  argument names, or variable references. all emit as `name`. themes
  reclassify using surrounding tokens.
- `->` and `**` require longest-match ordering.
- the docstring's triple quotes must consume three `"` characters as one
  opening delimiter, not three single-quote strings.
- whitespace at start of line is just whitespace for highlighting. indent/
  dedent is a parser concern.

### trace 2: f-string edge cases (3.12+ quote reuse, backslash, comment, nested)

input:

```
name = "Ada"
items = ["x", "y"]
msg = f"Hello, {name.upper()}!\n{"<<".join(items)}, level={level:>{width}.{prec}f}"
debug = f"{value = !r:>10}"
sql = f"""
SELECT *
FROM t
WHERE x = {x  # sanitize
           + 1}
"""
```

trace (condensed; per-token for the tricky f-strings):

- `name = "Ada"`: `name` name, ` ` ws, `=` operator, ` ` ws, `"Ada"` string
  (enter `"`, content `Ada`, exit `"`), NEWLINE.
- `items = ["x", "y"]`: `items` name, ` ` ws, `=` operator, ` ` ws, `[` open
  bracket, `"x"` string, `,` punct, ` ` ws, `"y"` string, `]` close bracket,
  NEWLINE.
- `msg = f"Hello, {name.upper()}!\n{"<<".join(items)}, level={level:>{width}.{prec}f}"`:
  - `msg` name, ` ` ws, `=` op, ` ` ws.
  - `f"` → FSTRING_START (prefix `f`, delimiter `"`).
  - `Hello, ` → FSTRING_MIDDLE literal text.
  - `{` → push f-string expression mode at bracket depth 0.
  - `name` → name.
  - `.` → punct.
  - `upper` → name.
  - `(` → open paren (paren depth 1 inside f-string expression).
  - `)` → close paren (paren depth 0).
  - `}` → at bracket depth 0, end replacement field; pop to f-string body.
  - `!\n` → FSTRING_MIDDLE. this includes `!` (literal text since we are
    NOT in a replacement field anymore — the earlier `}` closed it) and
    `\n` which is an escape sequence processed into a LF. the MIDDLE token
    contains both bytes; a highlighter that wants to color `\n` as escape
    can emit a sub-token.
  - `{` → push f-string expression mode.
  - `"<<"` → **this is the critical case**: a string literal whose quote
    is the same as the outer f-string's quote. 3.12+ allows this. enter a
    nested string with `"`, content `<<`, exit `"`. this nested string is
    NOT the outer f-string's close.
  - `.` → punct.
  - `join` → name.
  - `(` → open paren (paren depth 1).
  - `items` → name.
  - `)` → close paren (paren depth 0).
  - `}` → close replacement field.
  - `, level=` → FSTRING_MIDDLE literal text.
  - `{` → push f-string expression mode.
  - `level` → name.
  - `:` → here, since we are at bracket depth 0 inside a replacement field,
    this starts the FORMAT SPEC. switch to format-spec sub-mode.
  - `>` → FSTRING_MIDDLE (literal format spec char).
  - `{` → nested replacement field inside format spec (push expression mode).
  - `width` → name.
  - `}` → close nested field.
  - `.` → FSTRING_MIDDLE (literal format spec char, NOT attribute access
    because we are in format spec mode).
  - `{` → nested replacement field.
  - `prec` → name.
  - `}` → close nested field.
  - `f` → FSTRING_MIDDLE (format type code; literal in format spec).
  - `}` → close outer replacement field; exit format spec mode, return to
    f-string body mode.
  - `"` → FSTRING_END (matches opening quote).
  - NEWLINE.
- `debug = f"{value = !r:>10}"`:
  - `debug` name, ` ` ws, `=` op, ` ` ws.
  - `f"` FSTRING_START.
  - `{` push replacement.
  - `value` name (note: the WHITESPACE around `=` is preserved as source text
    for the debug display). the tokenizer sees ` ` ws, `=` the debug
    specifier (3.12: equal sign, optionally surrounded by whitespace, right
    after the expression), ` ` ws.
  - `!r` → conversion specifier (the `!` + `r` together; `!` must be
    followed by exactly one of `s`/`r`/`a`).
  - `:` → enter format spec.
  - `>10` → FSTRING_MIDDLE (format spec literal content).
  - `}` → close replacement.
  - `"` FSTRING_END.
- the triple-quoted `sql = f"""...\nWHERE x = {x  # sanitize\n           + 1}\n"""`:
  - `sql` name, ` ` ws, `=` op, ` ` ws.
  - `f"""` FSTRING_START (triple quote).
  - `\nSELECT *\nFROM t\nWHERE x = ` → FSTRING_MIDDLE. contains literal
    newlines (allowed in triple-quoted) and text.
  - `{` → push replacement.
  - `x` → name.
  - `  ` → ws (inside the expression, normal ws).
  - `#` → start of comment (3.12+). `# sanitize` consumed to end of line.
  - `\n` → newline inside replacement field (allowed since 3.12). consumed.
  - `           ` → ws on next line.
  - `+` → operator.
  - ` ` → ws.
  - `1` → number.
  - `}` → close replacement.
  - `\n` → FSTRING_MIDDLE (newline as literal inside triple f-string).
  - `"""` → FSTRING_END (matches opening triple quote).

observations:

- the `"<<"` nested string with same quote as outer f-string ONLY works
  since 3.12. a pre-3.12-aware highlighter would have to emit this as an
  error. we target 3.12+, so accept it.
- format spec mode changes the meaning of `.` and other characters — inside
  a format spec, `.` is literal, not attribute access.
- the debug `=` is distinguishable from `==` by position (right after the
  expression, at the top-level of the replacement field).
- `# comment` inside a replacement field requires newline to close the
  replacement — so a single-quoted f-string CANNOT contain a `#` comment
  because the closing `}` on the same line would be swallowed by the
  comment. only triple-quoted f-strings can.
- bracket depth tracking is essential to know when `}` closes the
  replacement field vs a dict/set brace.

### trace 3: numeric and string literal edge cases, match statement

input:

```
x = 0x_1f_ff
y = 1_000_000.5e-3j
z = .5 + 5.
pi = 3.14
b = 0b1010_0101
o = 0o777
zero = 0_0_0
bad = 0123  # syntax error but highlighter should still tokenize
s1 = r"C:\Users\name\path"
s2 = b"\x89PNG\r\n"
s3 = rb'\x89PNG'
s4 = "unicode: \N{SNAKE} \u00e9 \U0001F40D"
s5 = "mystery: \q \z"
unicode_id = π_1 = "pi subscript one"
match command:
    case "quit" | "q":
        pass
    case Point(x=0, y=0):
        pass
    case _:
        pass
type Vec[T] = list[T]
```

trace:

- `x = 0x_1f_ff`: `x` name, ` ` ws, `=` op, ` ` ws, `0x_1f_ff` number (hex
  with optional underscore after `0x` and between hex digits). NEWLINE.
- `y = 1_000_000.5e-3j`: `y` name, `=` op, `1_000_000.5e-3j` NUMBER (imag
  with float + exponent + underscore grouping — the `j` is part of the
  literal, no whitespace between digits and `j`). NEWLINE.
- `z = .5 + 5.`: `z` name, `=` op, `.5` number (float with leading dot),
  ` ` ws, `+` op, ` ` ws, `5.` number (float with trailing dot). NEWLINE.
- `pi = 3.14`: `pi` name, `=` op, `3.14` number. NEWLINE.
- `b = 0b1010_0101`: `b` name, `=` op, `0b1010_0101` number (binary).
- `o = 0o777`: `o` name, `=` op, `0o777` number (octal).
- `zero = 0_0_0`: zerointeger form. tokenize greedily as number. value is 0.
- `bad = 0123`: `bad` name, `=` op. `0123` — leading zero on non-zero
  decimal. python raises SyntaxError at parse time, but the LEXER consumes
  the digit sequence as a potential integer. behavior choice: emit as
  `0123` NUMBER (and let a linter flag it), OR emit `0` NUMBER + `123`
  NUMBER. cpython's tokenizer accepts `0123` as a single token then parser
  rejects. we follow the same: emit as one number token (possibly with an
  `invalid` modifier). ` ` ws, `# syntax error but...` comment.
- `s1 = r"C:\Users\name\path"`:
  - `s1` name, `=` op, ` ` ws.
  - `r"` open raw string. all chars to the next `"` are literal content
    including every `\`. so `C:\Users\name\path` is string content. `"`
    closes.
  - note `\U` is NOT an escape here (raw); it's just a `\` + `U` pair.
- `s2 = b"\x89PNG\r\n"`:
  - `s2` name, `=` op, ` ` ws.
  - `b"` bytes literal, non-raw.
  - content `\x89` (hex escape, valid), `PNG` (literal ascii), `\r` (CR
    escape), `\n` (LF escape).
  - `"` closes.
- `s3 = rb'\x89PNG'`:
  - `rb'` raw bytes, single-quoted.
  - content literal: `\x89PNG` (5 chars: `\`, `x`, `8`, `9`, `P`, `N`, `G` —
    7 bytes actually).
- `s4 = "unicode: \N{SNAKE} \u00e9 \U0001F40D"`:
  - `"` string, content with mixed literal text and escapes.
  - emit escape sub-tokens if the grammar distinguishes. the `\N{SNAKE}`
    consumes up to the closing `}`. the `\u00e9` consumes exactly 4 hex.
    `\U0001F40D` consumes exactly 8 hex.
- `s5 = "mystery: \q \z"`:
  - `\q` and `\z` are UNRECOGNIZED escapes. since 3.12 they emit
    SyntaxWarning. python keeps them as literal `\q` / `\z`. a highlighter
    should mark `\q` as `string.escape.invalid` to visually surface the
    warning.
- `unicode_id = π_1 = "pi subscript one"`:
  - `unicode_id` name. `=` op. ` ` ws.
  - `π_1` → name. `π` is xid_start (greek pi, small letter, category Ll).
    `_1` is xid_continue.
  - `=` op. `"pi subscript one"` string.
- `match command:`:
  - `match` → emit as `name` (soft keyword — NOT a keyword at the lexer
    level). in a post-pass, a reclassifier may promote to `keyword` if a
    `case` appears in the body.
  - ` ` ws.
  - `command` → name.
  - `:` punct.
  - NEWLINE.
- `    case "quit" | "q":`:
  - ws (indent).
  - `case` → name (soft keyword, same treatment).
  - ` "quit" | "q"` → string, op, string.
  - `:` punct. NEWLINE.
- `    case Point(x=0, y=0):`:
  - ws, `case` name, `Point` name (class pattern), `(` paren,
    `x` name, `=` op, `0` number, `,` punct, ` ` ws, `y` name, `=` op,
    `0` number, `)` paren, `:` punct. NEWLINE.
- `    case _:`:
  - ws, `case` name, `_` name (soft keyword wildcard). `_` is a valid
    identifier lexically. `:` punct. NEWLINE.
  - NEWLINE; indent decreases (DEDENT at parser level).
- `type Vec[T] = list[T]`:
  - `type` → name (soft keyword since 3.12).
  - ` ` ws. `Vec` name.
  - `[` bracket (opens a type parameter list — same lexical token as
    subscript brackets).
  - `T` name.
  - `]` bracket.
  - ` ` ws. `=` op. ` ` ws.
  - `list` name. `[` bracket. `T` name. `]` bracket.

observations from trace 3:

- numeric underscores require a small state machine per digit: between two
  digit characters only.
- hex, octal, binary each have their own digit-class check.
- raw vs non-raw dramatically changes escape sequence handling. a single
  state flag "raw" is enough.
- soft keywords (`match`, `case`, `_`, `type`) require reclassification, not
  lexical keyword treatment.
- non-ascii identifiers work if the identifier continuation loop accepts
  any codepoint >= U+0080 (not bothering with full xid\_\* validation).
- `\U0001F40D` is 8 hex digits; careful: after `\U` exactly 8 hex digits
  must be consumed.
- `\N{SNAKE}` consumes up to the closing `}`; the name inside is uppercase
  per unicode convention but the lexer accepts any characters until `}`.
- bad literals (`0123`) should still tokenize as a single number token; the
  parser is the one that errors. highlighters generally follow this.

---

## summary for grammar-author

key shapes the author will implement:

1. a top-level state that handles keywords, identifiers (including non-ascii),
   numbers with all the underscore/base/exponent/imaginary edge cases, and
   operators with strict longest-match ordering.
2. multiple string states, parameterized by (quote, triple, raw, prefix
   category). prefix categories: plain-str, bytes, f-string, t-string. raw
   flag disables escape processing. triple flag allows newlines and requires
   three-quote close detection.
3. an f-string mode stack: each f-string pushes a state that knows its
   opening quote string (e.g. `"""`, `'`). `{` in the body pushes an
   expression state (python mode within f-string). `}` in the expression at
   depth 0 pops. `:` in the expression at depth 0 pushes a format-spec sub-
   state. nested replacement fields push again.
4. comment state inside f-string expressions (3.12+): `#` runs to end of
   physical line even while the expression is active.
5. implicit line joining: a single bracket-depth counter at the top level.
   newlines when bracket depth > 0 are whitespace, not NEWLINE.
6. soft keywords (`match`, `case`, `_`, `type`) tokenize as `name`. a
   reclassifier can promote in context, but this is optional for
   highlighting.
7. no need for INDENT/DEDENT generation. leading whitespace is just
   whitespace.
