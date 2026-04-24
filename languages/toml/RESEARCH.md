# TOML Grammar Research

Originally drafted 2026-04-01. Refreshed 2026-04-15 against live sources (ABNF, CHANGELOG, release metadata).

## Sources consulted

- Official TOML v1.0.0 spec (prose): https://toml.io/en/v1.0.0
- Official TOML v1.1.0 spec (prose): https://toml.io/en/v1.1.0
- Official TOML v1.0.0 ABNF grammar: https://raw.githubusercontent.com/toml-lang/toml/1.0.0/toml.abnf
- Official TOML v1.1.0 ABNF grammar (current `main`): https://raw.githubusercontent.com/toml-lang/toml/main/toml.abnf
- Official CHANGELOG: https://raw.githubusercontent.com/toml-lang/toml/main/CHANGELOG.md
- toml-test suite (BurntSushi/toml-test): https://github.com/BurntSushi/toml-test
- tree-sitter-toml grammar (latest tag v0.7.0, 2024-12-03): https://github.com/tree-sitter-grammars/tree-sitter-toml
- Prism prism-toml.js: https://github.com/PrismJS/prism/blob/master/components/prism-toml.js
- highlight.js ini.js (TOML alias): https://github.com/highlightjs/highlight.js/blob/main/src/languages/ini.js
- Pygments TOMLLexer (latest tag 2.20.0): https://github.com/pygments/pygments/blob/master/pygments/lexers/configs.py
- Sublime Text TOML syntax: https://github.com/sublimehq/Packages/blob/master/TOML/TOML.sublime-syntax

**Note on spec version**: TOML v1.1.0 was **officially released on 2025-12-18** (no longer pre-release). This research continues to target v1.0.0 as the baseline because (a) it is the dominant deployed version across parsers in April 2026 and (b) v1.1.0 is strictly additive at the lexical level — every v1.0.0 token is also a valid v1.1.0 token. The v1.1.0 deltas below are documented so the author can gate them behind a mode flag:

- `\e` escape (U+001B) in basic strings
- `\xHH` escape (U+00HH, 2 hex digits) in basic strings
- Seconds optional in local-time / local-date-time / offset-date-time (e.g., `14:15`, `2010-02-03 14:15`)
- Newlines and comments permitted inside inline tables
- Trailing comma permitted in inline tables

Non-lexical v1.1.0 clarifications (table creation, sub-millisecond precision, int/float size freedom) are out of scope for the highlighter.

---

## 1. Primary sources

### Official specification

The TOML v1.0.0 specification is the authoritative source, published at toml.io with an accompanying ABNF grammar. The ABNF is normative for syntax; the prose adds semantic constraints that the ABNF alone cannot express.

Key structural rules from the ABNF:

- A TOML document is a sequence of expressions (blank/comment, keyval, or table header)
- Whitespace is strictly space (0x20) and tab (0x09) — no other Unicode whitespace
- Newlines are LF or CRLF
- Comments start with `#` and run to end of line; NOT recognized inside strings
- Key-value pairs: `key = value` on a single line
- Table headers: `[key]` or `[[key]]`

### Cross-reference: existing highlighters

| Highlighter  | Parser type     | Spec version | Key vs value context | Dotted keys                | Table vs array-of-tables | Datetime                      | Hex/oct/bin | inf/nan | String type distinction | Escape highlighting |
| ------------ | --------------- | ------------ | -------------------- | -------------------------- | ------------------------ | ----------------------------- | ----------- | ------- | ----------------------- | ------------------- |
| tree-sitter  | Full CFG        | v1.0.0       | Full (AST)           | YES                        | YES (separate nodes)     | YES (@string.special)         | YES         | YES     | NO (all @string)        | YES                 |
| Pygments     | State machine   | v1.1.0       | Full (states)        | YES                        | YES                      | YES (Literal.Date)            | YES         | YES     | YES (Double/Single)     | YES (String.Escape) |
| Sublime      | Context-based   | v1.1.0       | Full (contexts)      | YES                        | YES                      | YES (constant.other.datetime) | YES         | YES     | YES (double/single)     | YES (incl. invalid) |
| Prism        | Flat regex      | ~v1.0        | Weak (lookbehind)    | Partial (no dot highlight) | NO distinction           | YES (alias number)            | YES         | YES     | NO (all one)            | NO                  |
| highlight.js | Regex+begin/end | ~v0.4        | Weak (lookahead)     | YES                        | NO distinction           | NO                            | NO          | NO      | NO (all one)            | NO                  |

**Critical finding**: highlight.js shares its grammar with INI, introducing case-insensitivity, semicolon comments, on/off/yes/no literals, and $variable syntax — all invalid in TOML. Do NOT use it as a reference.

**Most useful references for implementation**:

1. Pygments TOMLLexer — best state-machine reference, proper key vs value context separation, datetime patterns from CPython's tomllib
2. tree-sitter-toml — most structurally correct, distinct node types for tables vs array-of-tables, recursive dotted keys
3. Sublime TOML syntax — finest-grained token scopes, only one that marks invalid escapes explicitly

**Where highlighters conflict with the spec**:

- Prism and highlight.js do not distinguish `[table]` from `[[array-of-tables]]` — the spec requires they be semantically different
- Prism does not highlight dots in dotted keys — the spec treats them as separate key segments
- highlight.js marks TOML as case-insensitive — the spec says keys and values ARE case-sensitive
- None validate TOML semantics (duplicate keys, table type conflicts) — this is expected and acceptable for a highlighter

---

## 2. Token inventory

### 2.1 Literals

#### Strings (4 forms)

1. **Basic string**: `"..."` — double-quoted, supports escape sequences
   - Escapes: `\"`, `\\`, `\b`, `\f`, `\n`, `\r`, `\t`, `\uXXXX`, `\UXXXXXXXX`
   - All other escape sequences are RESERVED (error in strict mode)
   - Cannot span newlines

2. **Multi-line basic string**: `"""..."""` — three double-quotes
   - Supports same escapes as basic string
   - Newlines are allowed in the body
   - Newline immediately after opening `"""` is trimmed (does not appear in value)
   - Line-ending backslash (`\` at end of line) trims all following whitespace/newlines up to next non-whitespace
   - Up to 2 unescaped `"` allowed anywhere inside; 3+ consecutive `"` requires escaping the middle one(s)
   - Two `"` right before closing `"""` is OK (e.g., `"""...""""` contains value `..."`)

3. **Literal string**: `'...'` — single-quoted, NO escaping
   - What you see is what you get
   - Cannot contain `'` or control characters (except tab)
   - Cannot span newlines
   - Ideal for Windows paths, regexes: `'C:\Users\nodejs'`

4. **Multi-line literal string**: `'''...'''` — three single-quotes
   - No escaping (same as literal string)
   - Newlines allowed in the body
   - Newline immediately after opening `'''` is trimmed
   - Up to 2 consecutive `'` allowed inside
   - 3+ consecutive `'` are NOT permitted inside (and CANNOT be escaped since there is no escape mechanism)
   - This is a hard limitation of the format

#### Numbers

**Integers** (4 forms):

1. Decimal: optional `+`/`-`, digits with optional `_` separators (e.g., `+99`, `42`, `-17`, `1_000`, `53_49_221`)
   - No leading zeros: `01` is INVALID, `0` alone is valid
2. Hexadecimal: `0x` prefix + hex digits with optional `_` (e.g., `0xDEADBEEF`, `0xdead_beef`)
   - Case-insensitive prefix and digits
   - No `+`/`-` sign; leading zeros OK after prefix
3. Octal: `0o` prefix + octal digits with optional `_` (e.g., `0o01234567`, `0o755`)
   - No `+`/`-` sign; leading zeros OK after prefix
4. Binary: `0b` prefix + binary digits with optional `_` (e.g., `0b11010110`)
   - No `+`/`-` sign; leading zeros OK after prefix

**Floats** (3 forms):

1. Fractional: decimal-integer `.` digits with optional `_` (e.g., `3.1415`, `-0.01`, `224_617.445_991_228`)
   - Must have digit on BOTH sides of `.`: `1.`, `.5`, `1.e2` are INVALID
2. Exponent: decimal-integer `e`/`E` optional `+`/`-` digits (e.g., `5e+22`, `1e06`, `-2E-2`)
3. Fractional + exponent: decimal-integer `.` digits `e`/`E` ... (e.g., `6.626e-34`)

**Special floats**: `inf`, `+inf`, `-inf`, `nan`, `+nan`, `-nan`

- ALWAYS lowercase

#### Boolean literals

- `true`, `false` — lowercase ONLY
- `True`, `TRUE`, `False`, `FALSE` are INVALID

#### Date-time (4 forms)

1. **Offset date-time**: `YYYY-MM-DDTHH:MM:SSZ` or `YYYY-MM-DDTHH:MM:SS+HH:MM` or `YYYY-MM-DDTHH:MM:SS-HH:MM`
   - `T` or space as delimiter between date and time
   - `Z` for UTC, or `+HH:MM`/`-HH:MM` for offset
   - Optional fractional seconds: `.123`, `.999999`
   - Case-insensitive: both `T` and `t`, both `Z` and `z` are valid

2. **Local date-time**: `YYYY-MM-DDTHH:MM:SS` (no timezone)
   - Same format without the offset/Z suffix
   - Optional fractional seconds

3. **Local date**: `YYYY-MM-DD`
   - 4-digit year, 2-digit month, 2-digit day

4. **Local time**: `HH:MM:SS`
   - Optional fractional seconds: `07:32:00.999999`

TOML has NO null/none type. Absent keys are simply undefined.

### 2.2 Comments

- Line comment: `#` through end of line
- NOT recognized inside strings (strings are opaque)
- Control characters other than tab (U+0000-U+0008, U+000A-U+001F, U+007F) are NOT permitted in comments per prose spec
- NO block comments, NO doc comments, NO nested comments
- NO shebang (though `#` at position 0,0 would be treated as a regular comment)
- **ABNF vs prose nit**: the published v1.0.0 ABNF set `non-eol = %x09 / %x20-7F / non-ascii`, which technically allowed U+007F (DEL); the prose forbids it. v1.1.0 ABNF corrects this to `%x20-7E`. A highlighter should follow the prose (reject DEL) to stay consistent across versions.

### 2.3 Keywords

TOML has a small set of value-level keywords (not key-level):

**Hard keywords** (always recognized):

- `true`, `false` — boolean literals
- `inf` — positive infinity (also `+inf`, `-inf`)
- `nan` — not-a-number (also `+nan`, `-nan`)

These are contextual — they are only keywords when appearing as values (after `=`). As bare keys, `true = 1` is valid TOML where `true` is a key name, not a boolean. This is a critical disambiguation the tokenizer must handle.

**Soft keywords** (contextual):

- None — TOML has no contextual keyword distinction beyond the key/value context

### 2.4 Operators

- `=` — key-value separator (surrounded by optional whitespace)
- `.` — dotted key separator (surrounded by optional whitespace)
- `,` — array/inline-table value separator
- `+`, `-` — numeric sign prefix (unary)

Multi-character operators that need length-sorted matching:

- None — TOML has no `==`, `!=`, `<=`, `>=`, etc. All operators are single characters.

### 2.5 Identifiers

**Bare keys** (unquoted identifiers):

- Start characters: `A-Z`, `a-z`, `0-9`, `-`, `_`
- Continuation characters: same as start characters
- Key distinction: bare keys can START with a digit, hyphen, or underscore — unlike most languages where identifiers must start with a letter
- Must be non-empty
- Can be all digits: `1234` is a valid bare key (always interpreted as a string, not a number)

**Quoted keys**:

- `"..."` — basic string as key (supports escapes, same as basic string values)
- `'...'` — literal string as key (no escapes, same as literal string values)
- Empty quoted key `""` is valid but discouraged

### 2.6 Punctuation and delimiters

- `[` `]` — table header OR array value delimiter
- `[[` `]]` — array-of-tables header
- `{` `}` — inline table delimiters
- `,` — value separator (arrays and inline tables)
- `=` — key-value separator
- `.` — dotted key separator
- `"` — basic string delimiter
- `"""` — multi-line basic string delimiter
- `'` — literal string delimiter
- `'''` — multi-line literal string delimiter
- `#` — comment start
- `+` `-` — numeric sign
- `_` — numeric digit separator

### 2.7 Special syntax

- **Dotted keys**: `a.b.c = value` — creates nested table structure, whitespace around dots is ignored
- **Table headers**: `[name]` — defines a table scope for subsequent keyvals
- **Array-of-tables headers**: `[[name]]` — each occurrence adds a new element
- **Inline tables**: `{ key = value, key = value }` — single-line table (v1.0.0: no newlines between pairs)
- **Arrays**: `[value, value, value]` — can span multiple lines, trailing comma allowed, comments allowed between elements
- **Date-time values**: not a special syntax per se, but the datetime formats are distinct token types that look like `YYYY-MM-DDTHH:MM:SSZ`

---

## 3. Edge case inventory

### 3.1 Ambiguous tokens

1. **`[` is overloaded**: table header start, array-of-tables header start (when doubled), AND array value delimiter. Disambiguation requires context:
   - At line start (after whitespace): table header `[key]` or array-of-tables `[[key]]`
   - After `=`: array value `[...]` or inline table `{...}` (but `{` is unambiguous)
   - Inside an array: nested array or inline table
   - CRITICAL: `[key]` at line start is a table header; `[1, 2, 3]` after `=` is an array. The same `[` character has different semantics.

2. **`true`/`false`/`inf`/`nan` as keys vs values**: `true = false` is valid TOML — the first `true` is a bare key name, the second `false` is a boolean value. Context (before vs after `=`) determines the interpretation.

3. **Numeric bare keys vs number values**: `1234 = "value"` has `1234` as a key; `x = 1234` has `1234` as a number. Same character sequence, different token type based on position relative to `=`.

4. **`-` and `+` as numeric signs vs bare key characters**: `+99` is a number, but `plus+ = 1` has `+` as part of a bare key (wait — `+` is NOT a valid bare key character. Only `A-Za-z0-9-_`). So `+` can only be a numeric sign. But `-` IS a valid bare key character: `my-key = 1` has `-` in the key; `x = -1` has `-` as a numeric sign.

5. **`_` in bare keys vs numeric separators**: `my_key = 1_000` — `_` in key is part of the identifier; `_` in value is a numeric separator.

6. **`.` as dotted-key separator vs inside a quoted key**: `site."google.com" = true` — the first `.` is a dotted-key separator; the `.` inside `"google.com"` is part of the key string.

7. **`0` prefix disambiguation**: `0x` = hex, `0o` = octal, `0b` = binary, `0` alone = decimal zero, `00` = invalid (leading zero), `0.5` = float.

8. **`e`/`E` in numbers vs as bare key characters**: `flt = 1e06` — `e` is part of the exponent notation; `e_key = 1` — `e` is a bare key character.

### 3.2 Nesting

1. **Arrays can contain arrays**: `data = [[1, 2], [3, 4]]` — nested bracket tracking needed
2. **Arrays can contain inline tables**: `people = [{name = "Alice"}, {name = "Bob"}]`
3. **Inline tables can contain arrays**: `person = {tags = ["dev", "admin"]}`
4. **Inline tables can contain inline tables**: NOT in v1.0.0 spec examples but grammatically possible
5. **Arrays of arrays**: `arr = [[1,2],[3,4]]` — two levels of `[]`
6. **Multi-line strings inside arrays**: `arr = [""",line1,line2,"""]` — a multi-line string inside an array value
7. **Table headers define scope nesting**: `[a.b.c]` implicitly defines tables `a` and `a.b`

### 3.3 Escape sequences

1. **Basic strings support escapes** (v1.0.0): `\"`, `\\`, `\b`, `\f`, `\n`, `\r`, `\t`, `\uXXXX`, `\UXXXXXXXX`
2. **Multi-line basic strings support same escapes PLUS line-ending backslash**: `\` at end of line trims following whitespace/newlines
3. **Literal strings have NO escapes**: `'C:\Users'` — the backslash is literal
4. **Multi-line literal strings have NO escapes**: same — what you see is what you get
5. **v1.1.0 additions (released 2025-12-18)**: `\e` (U+001B) and `\xHH` (exactly 2 hex digits, U+00HH). The author should introduce these as a version-gated rule rather than treating them as invalid; a v1.0.0-only highlighter would mark them as errors, while a v1.1.0 highlighter treats them as valid escapes.
6. **Invalid escapes in basic strings**: `\a`, `\v`, `\0`, lone `\` followed by anything else are RESERVED and should produce an error in strict mode — a highlighter should mark them as invalid/error. Note the overlap: `\x` is invalid in v1.0.0 but valid prefix in v1.1.0.

### 3.4 Numeric forms

1. **Decimal leading zeros**: `01`, `007` are INVALID; `0` alone, `+0`, `-0` are valid
2. **Underscore placement**: must be between digits — `1_000`, `_1000`, `1000_` are all treated differently (first valid, latter two invalid)
3. **Hex/oct/bin leading zeros after prefix**: `0x0001`, `0o007` are VALID (unlike decimal)
4. **Float decimal point**: must have digit on both sides — `1.`, `.5`, `1.e2` are INVALID
5. **Float without fractional part**: `1e2` is valid (just exponent, no decimal point)
6. **inf/nan with sign**: `+inf`, `-inf`, `+nan`, `-nan` are valid
7. **Mixed integer prefixes**: `0x` + non-hex, `0o` + `8`/`9`, `0b` + `2` — invalid digit for base

### 3.5 Context-sensitive tokenization

1. **Key position vs value position**: The same text is tokenized differently before `=` (key) and after `=` (value). Most critically:
   - `true` before `=` is a bare key (identifier); after `=` is a boolean keyword
   - `1234` before `=` is a bare key; after `=` is a number
   - `"hello"` before `=` is a quoted key; after `=` is a string value (same token type, different semantic role)
   - `0x1F` before `=` is a bare key (if unquoted... wait, `0x1F` contains `x` which is valid in bare keys, but is it really treated as a bare key? YES — bare keys are `[A-Za-z0-9-_]+`, so `0x1F` is a valid bare key name before `=`)

2. **`[` at line start vs after `=`**: Table header vs array literal

3. **Whitespace around `.` in dotted keys**: `a . b . c` is valid — the `.` is a separator and whitespace is ignored

4. **Whitespace around `=` in keyval**: `key   =   value` — whitespace around `=` is ignored

5. **Table header key**: `[a.b."c.d".e]` — the key in a table header follows the same rules as dotted keys, and can contain quoted segments with dots inside

### 3.6 Case sensitivity

- Keywords are case-sensitive: `true`/`false` only (not `True`/`FALSE`)
- `inf`/`nan` are lowercase only
- Hex digits are case-insensitive: `0xDEAD` == `0xdead`
- Datetime `T`/`t` and `Z`/`z` are case-insensitive per ABNF
- Bare keys are case-sensitive: `Key` and `key` are different keys
- Exponent `e`/`E` are case-insensitive

### 3.7 Whitespace significance

- Only space (0x20) and tab (0x09) are whitespace — no other Unicode whitespace
- Newlines are LF or CRLF
- Whitespace around `.` and `=` is ignored
- Indentation is cosmetic only — no significance
- Newlines are significant in that they terminate:
  - Comments
  - Bare keys (bare keys cannot span lines)
  - Single-line strings
  - Key-value pairs (key, =, and value must be on the same line)
- Multi-line strings CAN span newlines
- Arrays CAN span newlines (values and comments between elements)
- v1.0.0: inline tables CANNOT span newlines (all pairs on one line)
- Table headers must be on their own line: `[key]` followed by newline

---

## 4. Nesting and context constructs

### 4.1 Basic string

```
basic string
  opens: "
  closes: " (unescaped)
  nests: nothing — no interpolation, no sub-languages
  escapes: \", \\, \b, \f, \n, \r, \t, \uXXXX, \UXXXXXXXX
  cannot span newlines
```

### 4.2 Multi-line basic string

```
multi-line basic string
  opens: """
  closes: """
  nests: nothing — no interpolation, no sub-languages
  escapes: same as basic string, plus line-ending backslash (\ at end of line trims
           all following whitespace and newlines up to next non-whitespace)
  special quote rule: up to 2 unescaped " allowed anywhere; 3+ consecutive " requires
                      escaping at least one. Two " right before closing """ is OK.
  newline after opening """ is trimmed (not in value)
  can span multiple lines
```

### 4.3 Literal string

```
literal string
  opens: '
  closes: '
  nests: nothing
  escapes: NONE — no escape mechanism at all
  cannot contain ' (apostrophe) or control characters (except tab)
  cannot span newlines
```

### 4.4 Multi-line literal string

```
multi-line literal string
  opens: '''
  closes: '''
  nests: nothing
  escapes: NONE — no escape mechanism
  special quote rule: up to 2 consecutive ' allowed inside; 3+ consecutive ' is
                      IMPOSSIBLE (cannot be escaped, no escape mechanism exists)
  newline after opening ''' is trimmed
  can span multiple lines
```

### 4.5 Array

```
array
  opens: [ (in value position, after = or inside another array/inline-table)
  closes: ] (matching the opening [)
  nests: any value type, including other arrays, inline tables, and multi-line strings
  can span multiple lines
  trailing comma allowed
  comments allowed between elements (between values, after commas)
  separators: , between values
  important: [ at line start is a TABLE HEADER, not an array — context matters
```

### 4.6 Inline table

```
inline table
  opens: { (in value position)
  closes: }
  nests: key-value pairs (key = value), where values can be arrays or other inline tables
  separators: , between pairs
  empty inline table allowed: x = {}

  v1.0.0 rules (baseline):
    - newlines FORBIDDEN between pairs (entire inline table on one line)
    - trailing comma FORBIDDEN
    - no comments inside

  v1.1.0 deltas (released 2025-12-18, gate behind a flag):
    - newlines and comments permitted between pairs and around commas
    - trailing comma permitted after last pair
    - ABNF: inline-table-keyvals now allows ws-comment-newline around each keyval
```

### 4.7 Table header

```
standard table header
  opens: [ at line start (after optional whitespace)
  closes: ] (on the same line)
  contains: a key (bare, quoted, or dotted) — same syntax as keyval keys
  whitespace allowed inside brackets: [ foo . bar ]
  defines scope for subsequent keyvals until next header or EOF
  cannot be duplicated (same table defined twice is INVALID)
```

### 4.8 Array-of-tables header

```
array-of-tables header
  opens: [[ at line start
  closes: ]]
  contains: a key (same as table header)
  each occurrence adds a NEW element to the named array
  cannot be used for the same key as a standard table
  can have sub-tables: [[products]] then [products.physical]
  can have sub-array-of-tables: [[fruits]] then [[fruits.varieties]]
```

### 4.9 Key-value pair

```
key-value pair
  format: key = value (on a single line)
  key: bare key, quoted key, or dotted key
  =: surrounded by optional whitespace
  value: string | number | boolean | datetime | array | inline table
  must be followed by newline or EOF (except inside inline tables)
  same key cannot be defined twice
```

### 4.10 Dotted key

```
dotted key
  format: simple-key . simple-key . simple-key ...
  .: surrounded by optional whitespace (whitespace is ignored)
  each segment is a bare key or quoted key
  creates nested table structure: a.b.c = 1 is equivalent to [a.b] then c = 1
  can appear in both key position (before =) and table headers (inside [])
```

---

## 5. Manual traces

### Trace 1: Complex strings and numerics

Source: toml-test spec examples + edge cases

```toml
str1 = """
Roses are red
Violets are blue"""

str2 = """\
The quick brown \
  fox jumps over \
  the lazy dog.\
  """

regex2 = '''I [dw]on't need \d{2} apples'''

hex1 = 0xDEADBEEF
sf1 = inf
sf6 = -nan
```

Trace:

```
Pos 0: 's' — in root, start bare key
Pos 0-3: "str1" — bare key token (property)
Pos 4: ' ' — whitespace
Pos 5: '=' — operator (keyval separator)
Pos 6: ' ' — whitespace
Pos 7-9: '"""' — enter multi-line basic string, opening delimiter
Pos 10: '\n' — newline inside multi-line string (this newline is TRIMMED per spec, but for highlighting we still emit it as part of the string token)
Pos 11-25: "Roses are red\n" — multi-line string body
Pos 25-42: "Violets are blue" — multi-line string body
Pos 42-44: '"""' — exit multi-line basic string, closing delimiter
  Result: string token covering """ through """ (coalesced)

Pos 45: '\n' — newline, back in root

Pos 46-49: "str2" — bare key token
Pos 50: ' ' — whitespace
Pos 51: '=' — operator
Pos 52: ' ' — whitespace
Pos 53-55: '"""' — enter multi-line basic string
Pos 56: '\' — line-ending backslash: this + following whitespace/newlines are trimmed
  (the \ and the newline after it are consumed as part of the escape, not emitted as visible string content, but for highlighting we mark them as string/escape tokens)
Pos 57: '\n' — consumed by line-ending backslash escape
Pos 58: 'T' — string body content
Pos 58-79: "The quick brown " — string body
Pos 80: '\' — line-ending backslash again
Pos 81: '\n' — consumed by escape
Pos 82: ' ' — consumed by escape (whitespace after line-ending backslash)
Pos 83-97: "fox jumps over " — string body
Pos 98: '\' — line-ending backslash
Pos 99: '\n' — consumed
Pos 100: ' ' — consumed
Pos 101-116: "the lazy dog." — string body
Pos 117: '\' — line-ending backslash
Pos 118: '\n' — consumed
Pos 119: ' ' — consumed
Pos 120-122: '"""' — exit multi-line basic string
  Result: string token covering entire """...""" span

Pos 123: '\n' — newline

Pos 124-130: "regex2" — bare key
Pos 131: ' '
Pos 132: '=' — operator
Pos 133: ' '
Pos 134-136: "'''" — enter multi-line literal string
Pos 137-157: "I [dw]on't need \\d{2} apples" — literal string body (no escaping, backslash is literal)
  Note: the ' in "on't" is fine — it's a single apostrophe, not two consecutive
Pos 158-160: "'''" — exit multi-line literal string
  Result: string token

Pos 161: '\n'

Pos 162-165: "hex1" — bare key
Pos 166: ' '
Pos 167: '=' — operator
Pos 168: ' '
Pos 169-180: "0xDEADBEEF" — number (hex integer)
  Breakdown: "0x" = prefix, "DEADBEEF" = hex digits

Pos 181: '\n'

Pos 182-184: "sf1" — bare key
Pos 185: ' '
Pos 186: '=' — operator
Pos 187: ' '
Pos 188-190: "inf" — keyword (special float)

Pos 191: '\n'

Pos 192-194: "sf6" — bare key
Pos 195: ' '
Pos 196: '=' — operator
Pos 197: ' '
Pos 198: '-' — operator (sign)
Pos 199-201: "nan" — keyword (special float)
```

### Trace 2: Dotted keys, tables, inline tables

Source: toml-test spec examples

```toml
physical.color = "orange"
site."google.com" = true

[dog."tater.man"]
type.name = "pug"

point = { x = 1, y = 2 }
```

Trace:

```
Pos 0-7: "physical" — bare key segment
Pos 8: '.' — punctuation (dotted key separator)
Pos 9-13: "color" — bare key segment (still part of key, not a new key)
  Key context: physical.color is the full key
Pos 14: ' '
Pos 15: '=' — operator
Pos 16: ' '
Pos 17-24: '"orange"' — string (basic string value)

Pos 25: '\n'

Pos 26-29: "site" — bare key segment
Pos 30: '.' — punctuation (dotted key separator)
Pos 31: '"' — enter basic string (as quoted key)
Pos 32-42: "google.com" — string body (the . is part of the string, NOT a dotted-key separator)
Pos 43: '"' — exit basic string (quoted key)
  Key context: site."google.com" is the full key
Pos 44: ' '
Pos 45: '=' — operator
Pos 46: ' '
Pos 47-50: "true" — boolean keyword (in value position)

Pos 51: '\n'
Pos 52: '\n'

Pos 53: '[' — enter table header context
Pos 54-56: "dog" — bare key segment in table header
Pos 57: '.' — punctuation (dotted key separator in header)
Pos 58: '"' — enter basic string (quoted key in header)
Pos 59-68: "tater.man" — string body
Pos 69: '"' — exit quoted key
Pos 70: ']' — exit table header
  Table header token: [dog."tater.man"]

Pos 71: '\n'

Pos 72-75: "type" — bare key segment
Pos 76: '.' — punctuation (dotted key separator)
Pos 77-80: "name" — bare key segment
  Key context: type.name (inside [dog."tater.man"] table)
Pos 81: ' '
Pos 82: '=' — operator
Pos 83: ' '
Pos 84-87: '"pug"' — string value

Pos 88: '\n'
Pos 89: '\n'

Pos 90-94: "point" — bare key
Pos 95: ' '
Pos 96: '=' — operator
Pos 97: ' '
Pos 98: '{' — enter inline table
Pos 99: ' '
Pos 100: 'x' — bare key (inside inline table)
Pos 101: ' '
Pos 102: '=' — operator (inside inline table)
Pos 103: ' '
Pos 104: '1' — number
Pos 105: ',' — punctuation (inline table separator)
Pos 106: ' '
Pos 107: 'y' — bare key (inside inline table)
Pos 108: ' '
Pos 109: '=' — operator
Pos 110: ' '
Pos 111: '2' — number
Pos 112: ' '
Pos 113: '}' — exit inline table
  Inline table: { x = 1, y = 2 }
```

### Trace 3: Array-of-tables, arrays with comments, datetime

Source: toml-test spec examples

```toml
[database]
server = "192.168.1.1"
ports = [ 8001, 8001, 8002 ]  # trailing comma allowed
enabled = true

[[fruits]]
name = "apple"

[fruits.physical]
color = "red"

[[fruits.varieties]]
name = "red delicious"

[[fruits]]
name = "banana"

odt1 = 1979-05-27T07:32:00Z
ldt1 = 1979-05-27T07:32:00
ld1 = 1979-05-27
lt1 = 07:32:00
```

Trace:

```
Pos 0: '[' — enter table header
Pos 1-8: "database" — bare key in table header
Pos 9: ']' — exit table header
  Table: [database]

Pos 10: '\n'

Pos 11-16: "server" — bare key
Pos 17: ' '
Pos 18: '=' — operator
Pos 19: ' '
Pos 20-32: '"192.168.1.1"' — string value

Pos 33: '\n'

Pos 34-38: "ports" — bare key
Pos 39: ' '
Pos 40: '=' — operator
Pos 41: ' '
Pos 42: '[' — enter array
Pos 43: ' '
Pos 44-47: "8001" — number
Pos 48: ',' — punctuation (array separator)
Pos 49: ' '
Pos 50-53: "8001" — number
Pos 54: ',' — punctuation
Pos 55: ' '
Pos 56-59: "8002" — number
Pos 60: ',' — punctuation (trailing comma — VALID in arrays)
Pos 61: ' '
Pos 62: ']' — exit array
Pos 63-64: '  '
Pos 65: '#' — enter comment
Pos 66-88: " trailing comma allowed" — comment body (to end of line)

Pos 89: '\n'

Pos 90-96: "enabled" — bare key
Pos 97: ' '
Pos 98: '=' — operator
Pos 99: ' '
Pos 100-103: "true" — boolean keyword (value position)

Pos 104: '\n'
Pos 105: '\n'

Pos 106: '[' — could be table header OR array-of-tables — lookahead needed
Pos 107: '[' — second bracket — this is array-of-tables header
  Enter array-of-tables context
Pos 108-113: "fruits" — bare key in array-of-tables header
Pos 114: ']' — first closing bracket
Pos 115: ']' — second closing bracket — exit array-of-tables header
  Header: [[fruits]]

Pos 116: '\n'

Pos 117-120: "name" — bare key
Pos 121: ' '
Pos 122: '=' — operator
Pos 123: ' '
Pos 124-130: '"apple"' — string value

Pos 131: '\n'
Pos 132: '\n'

Pos 133: '[' — table header start
Pos 134-147: "fruits.physical" — dotted key in table header
  Breakdown: "fruits" bare key, "." separator, "physical" bare key
Pos 148: ']' — exit table header
  Table: [fruits.physical] — sub-table of the current array-of-tables element

Pos 149: '\n'

Pos 150-154: "color" — bare key
Pos 155: ' '
Pos 156: '=' — operator
Pos 157: ' '
Pos 158-162: '"red"' — string value

Pos 163: '\n'
Pos 164: '\n'

Pos 165: '[' — start
Pos 166: '[' — second bracket — array-of-tables header
Pos 167-175: "fruits.varieties" — dotted key
  Breakdown: "fruits" bare key, "." separator, "varieties" bare key
Pos 176: ']' — first close
Pos 177: ']' — second close
  Header: [[fruits.varieties]] — nested array-of-tables

Pos 178: '\n'

Pos 179-182: "name" — bare key
Pos 183: ' '
Pos 184: '=' — operator
Pos 185: ' '
Pos 186-200: '"red delicious"' — string value

Pos 201: '\n'
Pos 202: '\n'

Pos 203: '[' — start
Pos 204: '[' — array-of-tables header
Pos 205-210: "fruits" — bare key
Pos 211: ']' — close
Pos 212: ']' — close
  Header: [[fruits]] — new element in fruits array

Pos 213: '\n'

Pos 214-217: "name" — bare key
Pos 218: ' '
Pos 219: '=' — operator
Pos 220: ' '
Pos 221-229: '"banana"' — string value

Pos 230: '\n'
Pos 231: '\n'

Pos 232-234: "odt1" — bare key
Pos 235: ' '
Pos 236: '=' — operator
Pos 237: ' '
Pos 238-257: "1979-05-27T07:32:00Z" — datetime (offset datetime)
  Breakdown: 1979-05-27 = date, T = delimiter, 07:32:00 = time, Z = UTC offset

Pos 258: '\n'

Pos 259-262: "ldt1" — bare key
Pos 263: ' '
Pos 264: '=' — operator
Pos 265: ' '
Pos 266-284: "1979-05-27T07:32:00" — datetime (local datetime, no offset)

Pos 285: '\n'

Pos 286-288: "ld1" — bare key
Pos 289: ' '
Pos 290: '=' — operator
Pos 291: ' '
Pos 292-301: "1979-05-27" — datetime (local date)

Pos 302: '\n'

Pos 303-305: "lt1" — bare key
Pos 306: ' '
Pos 307: '=' — operator
Pos 308: ' '
Pos 309-316: "07:32:00" — datetime (local time)

Key observations from traces:
1. The `[` character is deeply ambiguous — context (line position, lookahead for `[[`, position after `=`) determines meaning
2. `true`/`false` are keywords in value position but bare keys in key position
3. Dotted keys require tracking that `.` in quoted segments is NOT a separator
4. Array-of-tables `[[...]]` needs lookahead to distinguish from table `[...]` — must check for second `[`
5. Datetime values look like `YYYY-MM-DD` which could initially match a number — the `-` and digit pattern needs special handling
6. Line-ending backslash in multi-line basic strings is a unique construct — it consumes the backslash + following whitespace/newlines as an escape
```

---

## Checkpoint

This research covers TOML v1.0.0 with documented v1.1.0 deltas. All five sections are complete:

1. Primary sources — official v1.0.0 ABNF + v1.1.0 ABNF diff + prose spec + CHANGELOG, cross-referenced against 5 highlighter implementations
2. Token inventory — all string forms, number forms, keywords, operators, identifiers, punctuation, special syntax
3. Edge case inventory — 7 categories of ambiguity, nesting, escapes, numerics, context-sensitivity, case, whitespace (v1.1.0 escape additions noted)
4. Nesting and context constructs — 10 constructs with open/close/nest/escape details (v1.1.0 inline-table relaxation noted)
5. Manual traces — 3 traces covering multi-line strings, dotted keys, inline tables, array-of-tables, datetime

Refresh history:

- 2026-04-15: re-verified sources, confirmed v1.1.0 shipped 2025-12-18, applied ABNF diff to escapes/inline-tables/comment-char-range.

Ready for grammar-author, passing language name: `toml`
