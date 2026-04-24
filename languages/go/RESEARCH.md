# Go Grammar Research

Drafted 2026-04-16 against live sources.

## Sources consulted

- Official Go language specification (spec version go1.26, dated 2026-01-12): https://go.dev/ref/spec
  - local cache: `/tmp/go-spec.txt` (HTML stripped), sections "Source code representation" through "String literals"
- Go Release History: https://go.dev/doc/devel/release
- tree-sitter-go grammar (`grammar.js`, current `master`): https://github.com/tree-sitter/tree-sitter-go
  - local cache: `/tmp/ts-go.js`
- Pygments `GoLexer` (`pygments/lexers/go.py`, current `master`): https://github.com/pygments/pygments/blob/master/pygments/lexers/go.py
  - local cache: `/tmp/pyg-go.py`
- Prism `prism-go.js` (current `master`): https://github.com/PrismJS/prism/blob/master/components/prism-go.js
  - local cache: `/tmp/prism-go.js`
- highlight.js `src/languages/go.js` (current `main`): https://github.com/highlightjs/highlight.js/blob/main/src/languages/go.js
  - local cache: `/tmp/hljs-go.js`
- Go `go:build` / `//go:generate` line-directive docs: https://pkg.go.dev/cmd/go#hdr-Build_constraints

**Note on language version.** This research targets Go as specified by go1.26 (January 2026). The lexical grammar has been essentially stable since Go 1 (2012). The only lexical additions since then, each noted inline below:

- Go 1.13 (2019): binary literals (`0b`), explicit-octal prefix (`0o`), hex-exponent floats (`0x1p-2`), underscore digit separators (`1_000`), imaginary-suffix unification (any int or float may take an `i` suffix).
- Go 1.18 (2022): the `~` type-constraint approximation operator and the predeclared identifiers `any`, `comparable`. Generics also make `[` and `]` usable as type-parameter delimiters, but that is a parser concern, not a lexer one — the tokens are the same brackets.
- Go 1.21 (2023): predeclared `min`, `max`, `clear`.

Go 1.18+ is the baseline assumption; a pre-1.13 mode would need to reject `0b`/`0o`/`_` separators but nothing else.

**Where highlighters differ from the spec**:

- Prism: omits `0o` octal (only matches leading-zero octals and hex), misses the bare `0` decimal, treats `_`, `nil`, `iota`, `true`, `false` all as one "boolean" class. The `operator` regex lumps in punctuation. No rune escape detail.
- highlight.js: matches APOS strings (`'foo'`) as string literals — **wrong** in Go, a single-quoted sequence containing more than one character is a syntax error, not a string. Also lists `float` as a builtin type, which Go does not have (`float32`/`float64` only). Does not distinguish rune literals from strings.
- Pygments: uses plain `0[0-7]+` for octals, so it will not match `0o755` (bare-prefix form) nor `0O755`; lexes `0123i` as integer `0123` + identifier `i` rather than imaginary literal; treats `float` as a type. Good on escape sequences.
- tree-sitter: closest to spec; uses `\p{XID_Start}`/`\p{XID_Continue}` for identifiers, which is a narrower Unicode set than the spec's "Letter" categories (Lu, Ll, Lt, Lm, Lo). For highlighter purposes, either approximation is acceptable; the spec rule is authoritative.

**Most useful references for implementation**: the Go spec itself (unusually clear lexical section with EBNF), then tree-sitter-go for worked-out numeric regexes, then Pygments for the escape-sequence structure inside strings and runes.

---

## 1. Primary sources

### Official specification

The Go spec gives a complete EBNF for the lexical grammar in the "Lexical elements" section. Key properties:

- **Source encoding**: UTF-8. Not canonicalized (combining forms are distinct from precomposed). A UTF-8 BOM (U+FEFF) may be ignored if it is the first code point; disallowed elsewhere. NUL (U+0000) may be disallowed.
- **Character classes** (from Unicode 8.0 General Category, per spec):
  - `unicode_letter` = any code point in Lu, Ll, Lt, Lm, Lo
  - `unicode_digit` = any code point in Nd
  - `letter` = `unicode_letter | "_"` (underscore is treated as a lowercase letter)
  - `newline` = U+000A (LF only; CR is whitespace but does not terminate a line for semicolon insertion)
- **Token classes**: identifiers, keywords, operators-and-punctuation, literals.
- **Whitespace**: U+0020 space, U+0009 tab, U+000D carriage return, U+000A newline. All other whitespace code points are **not** whitespace in Go.
- **Longest match rule**: "the next token is the longest sequence of characters that form a valid token." So `<<=` is one token, not `<<` + `=`, and `:=` is one token, not `:` + `=`.

### Cross-reference: existing highlighters

| Highlighter    | Keywords                         | Types/Builtins                       | Raw strings | Escape sequences       | Number forms                    | Imaginary `i`          | Rune vs string                             | Semicolon insertion |
| -------------- | -------------------------------- | ------------------------------------ | ----------- | ---------------------- | ------------------------------- | ---------------------- | ------------------------------------------ | ------------------- |
| tree-sitter-go | 25 (full)                        | full                                 | yes         | full (token immediate) | all 4 + hex float               | yes                    | distinct                                   | yes (via scanner)   |
| Pygments       | 25 (full)                        | superset (incl. `float`)             | yes         | detailed               | missing `0o`, `0O` as bare-form | partial (decimal only) | distinct (`String.Char`)                   | no                  |
| Prism          | 25 (full)                        | subset (types lumped into "builtin") | yes         | not detailed           | all 4 (regexes loose)           | yes                    | `char` distinct                            | no                  |
| highlight.js   | 24 (no `go` vs `goto` collapsed) | subset + `float` (wrong)             | yes         | not detailed           | all 4                           | yes                    | **not distinct** (matches `'x'` as string) | no                  |

The table shows why most highlighter references are not safe to copy wholesale. The spec is the authoritative source; other highlighters are useful mainly for their numeric regexes and escape-sequence inventories after cross-checking.

---

## 2. Token inventory

### 2.1 Literals

#### Integer literals (4 forms)

```ebnf
int_lit     = decimal_lit | binary_lit | octal_lit | hex_lit .
decimal_lit = "0" | ( "1" … "9" ) [ [ "_" ] decimal_digits ] .
binary_lit  = "0" ( "b" | "B" ) [ "_" ] binary_digits .
octal_lit   = "0" [ "o" | "O" ] [ "_" ] octal_digits .
hex_lit     = "0" ( "x" | "X" ) [ "_" ] hex_digits .
decimal_digits = decimal_digit { [ "_" ] decimal_digit } .
binary_digits  = binary_digit  { [ "_" ] binary_digit } .
octal_digits   = octal_digit   { [ "_" ] octal_digit } .
hex_digits     = hex_digit     { [ "_" ] hex_digit } .
```

1. **Decimal**: `0`, `42`, `4_2`, `170_141183_460469_231731_687303_715884_105727`.
   - Sign is **not** part of the literal — `-42` is unary-minus applied to `42`.
   - `0` alone is decimal zero. `01` is **octal** (leading-zero form, see below). `07` is octal; `09` is a syntax error (invalid octal digit).
2. **Binary** (Go 1.13+): `0b`/`0B` prefix, `0b1010_1100`. An optional single `_` after the prefix is allowed; interior `_` must separate digits.
3. **Octal**: two forms — legacy leading-zero `0600` and explicit-prefix `0o600`/`0O600` (Go 1.13+). `0600` is exactly the same integer as `0o600`. **Ambiguity with decimal zero**: a bare `0` is decimal, but `00` is octal zero. `08` and `09` are syntax errors.
4. **Hexadecimal**: `0x`/`0X` prefix, digits `0-9 a-f A-F`. `0xBadFace`, `0xBad_Face`, `0x_67_7a_2f_cc_40_c6`.

**Underscore placement rules** (all apply equally across bases):

- A single `_` may appear immediately after the base prefix: `0x_FF` OK, `0_x1` NOT OK (underscore before `x`).
- Interior `_` must have digits on both sides: `1_000` OK, `1__000`, `1_` NOT OK, `_1` NOT OK (that's an identifier).
- Trailing `_` always invalid: `42_` is a syntax error.
- These rules cover every invalid case from the spec (`42_`, `4__2`, `0_xBadFace`).

#### Floating-point literals (2 forms: decimal and hex)

```ebnf
float_lit         = decimal_float_lit | hex_float_lit .
decimal_float_lit = decimal_digits "." [ decimal_digits ] [ decimal_exponent ] |
                    decimal_digits decimal_exponent |
                    "." decimal_digits [ decimal_exponent ] .
decimal_exponent  = ( "e" | "E" ) [ "+" | "-" ] decimal_digits .

hex_float_lit     = "0" ( "x" | "X" ) hex_mantissa hex_exponent .
hex_mantissa      = [ "_" ] hex_digits "." [ hex_digits ] |
                    [ "_" ] hex_digits |
                    "." hex_digits .
hex_exponent      = ( "p" | "P" ) [ "+" | "-" ] decimal_digits .
```

- Decimal float must have **either** a `.` **or** an exponent: `1.`, `.5`, `1e6`, `1.5e6`, `0.15e+0_2`.
- Decimal floats **never** use a hex prefix. `0.5` has a leading zero, but it's still decimal-float (leading zero is OK for floats).
- Hex float **requires** a `p`/`P` exponent. The mantissa must have at least one hex digit (either before or after the radix point). Exponent digits are always decimal.
- `0x15e-2` is **not** a hex float — it lexes as `0x15e` (an integer: `0x15e` = 350) minus `2`. This is the spec's explicit example of the required-`p` rule.
- `1p-2` is **not** a hex float — `p` exponents require a `0x`/`0X` mantissa.

#### Imaginary literals (Go 1.13+)

```ebnf
imaginary_lit = (decimal_digits | int_lit | float_lit) "i" .
```

- A lowercase `i` suffix turns any integer or float literal into the imaginary part of a complex number.
- **Backward-compatibility oddity**: if the imaginary literal's integer part consists entirely of decimal digits and underscores but starts with `0`, it is interpreted as **decimal**, not octal. So `0123i` means `123i`, **not** `0o123 * 1i`. (But `0o123i` is still `0o123 * 1i == 83i`.)
- `0xabci` = `0xabc * 1i`, `1.5e10i`, `.25i`, `0x1p-2i`, `0i`.
- Only lowercase `i`. Uppercase `I` is just an identifier.

#### Rune literals

```ebnf
rune_lit         = "'" ( unicode_value | byte_value ) "'" .
unicode_value    = unicode_char | little_u_value | big_u_value | escaped_char .
byte_value       = octal_byte_value | hex_byte_value .
octal_byte_value = `\` octal_digit octal_digit octal_digit .
hex_byte_value   = `\` "x" hex_digit hex_digit .
little_u_value   = `\` "u" hex_digit hex_digit hex_digit hex_digit .
big_u_value      = `\` "U" hex_digit hex_digit hex_digit hex_digit
                           hex_digit hex_digit hex_digit hex_digit .
escaped_char     = `\` ( "a" | "b" | "f" | "n" | "r" | "t" | "v" | `\` | "'" | `"` ) .
```

Exactly **one** `unicode_value` or `byte_value` between single quotes. `'aa'` is a syntax error.

Newline inside a rune literal is a syntax error. An unescaped `'` inside is the closing quote.

#### String literals (2 forms)

```ebnf
string_lit             = raw_string_lit | interpreted_string_lit .
raw_string_lit         = "`" { unicode_char | newline } "`" .
interpreted_string_lit = `"` { unicode_value | byte_value } `"` .
```

1. **Interpreted string**: `"..."`. Same escape vocabulary as rune literals **except** `\'` is illegal and `\"` is legal. Newline inside is a syntax error.
2. **Raw string**: `` `...` ``. Backticks enclose. Backslashes are literal (no escapes). `\r` characters are stripped from the value (but see them as ordinary content during tokenization). **Newlines are allowed** — raw strings can span lines. The only character that cannot appear is a literal backtick.

#### Escape sequences (shared between interpreted strings and runes)

| Escape       | Meaning                                                              | Valid in rune | Valid in interp. string |
| ------------ | -------------------------------------------------------------------- | ------------- | ----------------------- |
| `\a`         | U+0007 bell                                                          | yes           | yes                     |
| `\b`         | U+0008 backspace                                                     | yes           | yes                     |
| `\f`         | U+000C form feed                                                     | yes           | yes                     |
| `\n`         | U+000A newline                                                       | yes           | yes                     |
| `\r`         | U+000D carriage return                                               | yes           | yes                     |
| `\t`         | U+0009 tab                                                           | yes           | yes                     |
| `\v`         | U+000B vertical tab                                                  | yes           | yes                     |
| `\\`         | U+005C backslash                                                     | yes           | yes                     |
| `\'`         | U+0027 single quote                                                  | yes           | **NO**                  |
| `\"`         | U+0022 double quote                                                  | **NO**        | yes                     |
| `\xHH`       | byte value, exactly 2 hex digits                                     | yes           | yes                     |
| `\NNN`       | byte value, **exactly** 3 octal digits, value ≤ 255                  | yes           | yes                     |
| `\uHHHH`     | Unicode BMP, exactly 4 hex digits                                    | yes           | yes                     |
| `\UHHHHHHHH` | full Unicode, exactly 8 hex digits, ≤ U+10FFFF, not a surrogate half | yes           | yes                     |

Any other backslash-character pair is **illegal** (not silently passed through). Examples of illegal escapes the spec calls out: `'\k'`, `'\0'` (too few digits), `'\xa'` (too few hex), `'\400'` (value > 255), `'\uDFFF'` (surrogate half), `'\U00110000'` (> max code point).

#### Boolean / constant "literals"

Go treats `true`, `false`, `iota`, `nil` as **predeclared identifiers**, not as reserved keywords. They may be shadowed (`var true = 5` compiles). A highlighter should still classify them visually as constants when they resolve to their predeclared meanings — which is always the case except inside declarations that shadow them, and a lexical highlighter cannot distinguish those without scope tracking. In practice every Go highlighter classes them as literals/constants unconditionally, and that's acceptable.

### 2.2 Comments

- **Line comment**: `//` to end-of-line (LF). The `//` marker does **not** start inside a string or rune literal or another comment.
- **General (block) comment**: `/* ... */`, **not nesting**. Ends at the first `*/` regardless of any intervening `/*`.
- **No doc comment syntax** distinct from the two forms above — godoc extracts doc comments by position relative to declarations, not by markup.
- **Shebang**: the spec does not define `#!` handling. Go source files do not normally use shebangs (they're not executable scripts).
- **Build directive lines**: `//go:build ...` and `// +build ...` lines before the `package` clause are magic to the Go toolchain but lex as ordinary line comments. A highlighter may choose to treat them as a distinct "directive" sub-class; Pygments and tree-sitter do not, Go's own `gofmt` does not either.
- **Semicolon-insertion interaction**: per the spec, a general comment containing **no newlines** acts like a space; a general comment containing a newline acts like a newline. This matters for semicolon insertion (see 2.3).

### 2.3 Keywords (25, reserved)

```
break        default      func         interface    select
case         defer        go           map          struct
chan         else         goto         package      switch
const        fallthrough  if           range        type
continue     for          import       return       var
```

All lowercase. Go is case-sensitive. `Break` is an identifier, not a keyword.

**No contextual / soft keywords.** Every keyword is always a keyword.

**Predeclared identifiers** (not keywords but conventionally highlighted as such):

- Types: `any` `bool` `byte` `comparable` `complex64` `complex128` `error` `float32` `float64` `int` `int8` `int16` `int32` `int64` `rune` `string` `uint` `uint8` `uint16` `uint32` `uint64` `uintptr`
- Constants: `true` `false` `iota`
- Zero value: `nil`
- Functions: `append` `cap` `clear` `close` `complex` `copy` `delete` `imag` `len` `make` `max` `min` `new` `panic` `print` `println` `real` `recover`

(`any`, `comparable` added Go 1.18; `min`, `max`, `clear` added Go 1.21.)

### 2.4 Operators and punctuation

Complete list from the spec:

```
+    &     +=    &=     &&    ==    !=    (    )
-    |     -=    |=     ||    <     <=    [    ]
*    ^     *=    ^=     <-    >     >=    {    }
/    <<    /=    <<=    ++    =     :=    ,    ;
%    >>    %=    >>=    --    !     ...   .    :
     &^          &^=          ~
```

**By length** (for a length-sorted matcher):

- **4 chars**: `<<=`, `>>=`, `&^=`
- **3 chars**: `...`, `&^`
- **2 chars**: `+=`, `-=`, `*=`, `/=`, `%=`, `&=`, `|=`, `^=`, `<<`, `>>`, `&&`, `||`, `==`, `!=`, `<=`, `>=`, `<-`, `++`, `--`, `:=`
- **1 char**: `+`, `-`, `*`, `/`, `%`, `&`, `|`, `^`, `<`, `>`, `=`, `!`, `,`, `;`, `.`, `:`, `(`, `)`, `[`, `]`, `{`, `}`, `~`

Notes:

- `&^` is bit-clear (AND NOT); `&^=` is its compound-assign. These only exist in Go.
- `<-` is the channel send/receive operator. It's a single token.
- `:=` is short-variable-declaration. Single token.
- `...` is variadic / spread. Single token.
- `~` was added in Go 1.18 for type-constraint approximation inside `interface { ~int | ~string }`.
- `;` is rarely written — most are inserted by the automatic semicolon rule (see 2.5), but the character is legal and used inside `for` clauses and for separating multiple statements on one line.

Unary operators are **not distinct tokens** from binary ones (`-`, `+`, `*`, `&`, `!`, `^`, `<-` all serve unary roles depending on position).

### 2.5 Automatic semicolon insertion

Per the spec, a semicolon is inserted at the end of a line if the final token of the line is one of:

- an identifier
- an integer, floating-point, imaginary, rune, or string literal
- one of the keywords `break`, `continue`, `fallthrough`, `return`
- one of the operators/punctuation `++`, `--`, `)`, `]`, `}`

A semicolon may also be omitted before a closing `)` or `}`.

**What "end of line" means for this rule**: the newline character U+000A, or EOF. A general comment containing a newline also acts like a newline for this rule.

**Implication for a tokenizer**: automatic semicolon insertion is a lexical-level concern — the token stream should include inserted semicolons. A purely display-oriented highlighter may skip this rule (Prism, Pygments, highlight.js all do), but a correct tokenizer emits the inserted `;`. For a syntax highlighter it is acceptable to not surface these as visible tokens; the classifier doesn't need them for styling.

### 2.6 Identifiers

```ebnf
identifier = letter { letter | unicode_digit } .
letter     = unicode_letter | "_" .
```

- Start: Unicode Letter (Lu, Ll, Lt, Lm, Lo) **or** `_`.
- Continuation: same as start **plus** Unicode decimal digit (Nd).
- Examples from spec: `a`, `_x9`, `ThisVariableIsExported`, `αβ`.
- The underscore alone `_` is the **blank identifier** — a valid identifier with special semantics (discards value). Tokenizes as a plain identifier; semantics are a parser/semantic concern.
- Unicode: Go does not normalize, so NFC/NFD forms of the same name differ. A highlighter does not need to canonicalize.

**Exported vs unexported** is a semantic distinction (first character is Lu = exported, else not). Some highlighters (tree-sitter) expose this; most do not. Out of scope for a pure lexer.

### 2.7 Punctuation

Included in the operator table above. The delimiters `(` `)` `[` `]` `{` `}` and the separators `,` `;` `:` `.` are all listed as operators/punctuation by the spec; there is no separate "punctuation" category at the token level.

### 2.8 Special syntax

- **Struct tags**: a raw string or interpreted string immediately following a struct field declaration — lexically just a string, but commonly displayed in a distinct color. Example: `Name string `` `json:"name"` ``.
- **Build-constraint comments**: `//go:build linux && amd64` at the top of a file, or the older `// +build linux,amd64`. Lex as line comments.
- **`//go:generate` directives**, `//go:noinline`, `//go:nosplit`, etc. — all line comments.
- **No regex literals**, no template strings, no heredocs, no interpolation. Go strings are just strings.
- **No macros, no attributes, no decorators.**

---

## 3. Edge case inventory

### 3.1 Ambiguous tokens

1. **Hex-integer vs hex-float**: `0x15e` is an integer (hex 350). `0x15e-2` tokenizes as `0x15e`, `-`, `2` because hex floats require a `p` exponent. `0x15ep2` would be `0x15e * 2^2 = 1400` as a hex float.
2. **Decimal-float vs imaginary**: `.25i` is an imaginary float; `.25` is a float; `.` alone is the dot operator. Trailing `i` on any numeric literal makes it imaginary.
3. **`.` vs `..` vs `...`**: `.` is the field-selector; `...` is variadic. There is **no** `..` token — `a..b` is a syntax error (it would lex as `a`, `.`, `.`, `b`). Longest match rule picks `...` when all three dots are adjacent.
4. **Leading-zero decimal vs octal**: `0` is decimal zero. `01` is octal one. `0.1` is decimal float zero-point-one. `08` is invalid (octal digit out of range). `0x10` is hex sixteen.
5. **`0123i` back-compat**: spec mandates decimal-integer interpretation of an imaginary literal whose integer part is all digits-and-underscores starting with `0`. So `0123i == 123i`, **not** `0o123i`. This is the one case where leading-zero digit strings are not octal.
6. **`:` vs `:=`**: longest match selects `:=` when `:` is followed immediately by `=`. No space is allowed — `: =` is two tokens `:` and `=`.
7. **`<` vs `<<` vs `<<=` vs `<=` vs `<-`**: longest match resolves all of these.
8. **`&` vs `&&` vs `&=` vs `&^` vs `&^=`**: longest match. Note `&^` is a single token (two characters), **not** `&` followed by `^`. And `&^=` is four wait, three chars: `&` `^` `=` — tokenizer sees `&^` then `=` and must extend to `&^=`. Length-sorted scanning handles this correctly if `&^=` is tried before `&^` and `&`.
9. **`/` vs `//` vs `/*` vs `/=`**: when the scanner sees `/`, it must peek ahead: `/` then `/` → line comment; `/` then `*` → block comment; `/` then `=` → compound-assign; otherwise `/` division.
10. **No regex-vs-division ambiguity** (Go has no regex literals).
11. **`[` / `<` and generics**: Go uses `[T any]` (brackets) for generic parameters, **not** `<T>`. So there's no JS/TS-style less-than-vs-generic ambiguity. `<` is always a comparison or shift-related character.

### 3.2 Nesting

1. **Parens / brackets / braces** can nest arbitrarily. Raw tokenizer does not need to match them; higher layers do.
2. **Comments do not nest**. `/* /* inner */ more */` ends at the first `*/` and leaves `more */` as garbage outside a comment. This is a common foot-gun when commenting out a block of Go code that already contains block comments.
3. **Strings and comments are mutually exclusive**: `"/* not a comment */"` is a string. `/* "not a string" */` is a comment. A highlighter must respect lexical state strictly.
4. **No string interpolation** — no nested expressions inside strings. A string is opaque.
5. **Raw strings span newlines**; interpreted strings and runes do not.

### 3.3 Escape sequences

- Covered in the table in 2.1. Recap of quirks:
  - `\xHH`: **exactly** 2 hex digits (not 1, not "at least 2"). Reject `\xA` (one digit).
  - `\NNN`: **exactly** 3 octal digits. Reject `\0`, `\00`. Accept `\000` through `\377`.
  - `\uHHHH`: exactly 4 hex digits.
  - `\UHHHHHHHH`: exactly 8 hex digits.
  - `\'` valid only in runes; `\"` valid only in interpreted strings. A highlighter may either (a) accept both everywhere (more permissive, matches tree-sitter/Pygments behavior) or (b) strictly enforce the rune-vs-string split. Strict mode gives better feedback but requires different escape tables per context.
  - In raw strings, there are no escapes at all — `\n` is a backslash followed by `n`, period.

### 3.4 Numeric forms — complete prefix/suffix matrix

| Prefix                       | Digit set     | Exponent                   | Suffix | Meaning                                      |
| ---------------------------- | ------------- | -------------------------- | ------ | -------------------------------------------- |
| (none) or `+`/`-`            | `0-9`         | `e`/`E` opt                | none   | decimal int (if no `.`/exp) or decimal float |
| `0` + following digits `0-7` | `0-7`         | none                       | none   | legacy octal int                             |
| `0o` / `0O`                  | `0-7`         | none                       | none   | explicit octal int (Go 1.13+)                |
| `0b` / `0B`                  | `0-1`         | none                       | none   | binary int (Go 1.13+)                        |
| `0x` / `0X`                  | `0-9 a-f A-F` | `p`/`P` required for float | none   | hex int (no exp) or hex float (with `p`)     |
| any of the above             | same          | same                       | `i`    | imaginary (Go 1.13+ for all forms)           |

Exponent sign is optional in decimal exponents (`e+10`, `e-10`, `e10` all legal). Same for hex `p`.

Underscore digit separators are allowed in every numeric form (Go 1.13+), with the placement rules above.

### 3.5 Context-sensitive tokenization

Go is almost entirely context-free at the lexical level. The two sources of context-sensitivity:

1. **Automatic semicolon insertion** (see 2.5). The lexer needs a one-token lookback (the last emitted token) plus awareness of newline positions (including newlines inside block comments) to decide whether to emit a `;` before consuming the newline.
2. **Comment-as-newline rule**: a `/* ... */` comment that contains a newline counts as a newline for semicolon insertion, even though it emits no visible newline token. The scanner must remember whether any line-crossing comment was skipped since the last real token.

Outside of semicolon insertion, Go is context-free: every character sequence has one valid tokenization.

### 3.6 Case sensitivity

Go is strictly case-sensitive. Keywords, predeclared identifiers, and user identifiers all are. `INT` is an identifier, not a predeclared type. `TRUE` is an identifier, not the constant.

### 3.7 Whitespace

- Not significant to tokenization outside of separating adjacent tokens and the newline → automatic-semicolon rule.
- **No indentation significance**.
- **CR (U+000D)** is whitespace but **not a line terminator** for the semicolon-insertion rule (only LF is). CRLF line endings work because the LF is the trigger.
- Only `\t \n \r \x20` are whitespace. Other Unicode whitespace (U+00A0 NBSP, U+2028 LINE SEPARATOR, etc.) is **not whitespace** — using it as a separator is a syntax error.

---

## 4. Nesting and context constructs

```
line comment
  opens: //
  closes: newline (LF) or EOF
  nests: nothing
  escapes: none — backslashes inside are literal
  note: content is a "run to end of line" that never needs to look at string-start characters

general comment
  opens: /*
  closes: */ (first occurrence wins; comments DO NOT nest)
  nests: nothing — no inner /* starts anything
  escapes: none
  note: may span multiple newlines; whether it contains a newline affects
        semicolon insertion at its outer boundary

interpreted string literal
  opens: "
  closes: " (unescaped, on the same line)
  nests: nothing (no interpolation in Go)
  escapes: \a \b \f \n \r \t \v \\ \" \xHH \NNN \uHHHH \UHHHHHHHH
  terminators: \n (LF) before closing quote is a syntax error
  note: \' is illegal inside an interpreted string

raw string literal
  opens: `
  closes: ` (unescaped — but there are no escapes here, backticks cannot appear at all)
  nests: nothing
  escapes: NONE — backslashes are literal
  terminators: none — newlines are permitted inside; CR characters are
               dropped from the value at parse time
  note: the only forbidden character inside is the backtick itself

rune literal
  opens: '
  closes: ' (unescaped)
  nests: nothing
  escapes: same table as interpreted strings EXCEPT \" is illegal and \' is legal
  terminators: \n (LF) is a syntax error; content must be exactly one
               unicode_value or byte_value
  note: multi-character content like 'ab' is a syntax error

parenthesized / bracketed / braced groups
  opens: ( [ {
  closes: ) ] }
  nests: yes, any of the above inside any other
  note: not a lexical context at all — the lexer emits open/close tokens;
        matching is the parser's problem. Mentioned here because some
        highlighters track depth to colorize matching pairs.
```

The above seven contexts are the **only** things a Go tokenizer's state machine needs to track. There are no heredocs, no template literals, no interpolation, no nested comments, no regex literals. Go's lexical grammar is notably simple.

---

## 5. Manual trace

### Sample A — imports, function body, rune, escapes, printf

Source (with backslash-escapes shown literally):

```go
package main

import "fmt"

func main() {
	s := "hello\tworld\n"
	r := '\u00e4'
	fmt.Println(s, r)
}
```

Char-by-char trace (one entry per token; whitespace and newlines collapsed into context notes):

| Context    | Input        | Token                                               | Transition      |
| ---------- | ------------ | --------------------------------------------------- | --------------- |
| top        | `package`    | keyword `package`                                   | stay            |
| top        | ` `          | (whitespace)                                        |                 |
| top        | `main`       | identifier `main`                                   |                 |
| top        | `\n`         | **auto `;` inserted** (last token is an identifier) |                 |
| top        | `\n`         | blank line                                          |                 |
| top        | `import`     | keyword `import`                                    |                 |
| top        | ` `          |                                                     |                 |
| top        | `"`          | enter interpreted-string                            | push interp-str |
| interp-str | `fmt`        | string content                                      |                 |
| interp-str | `"`          | exit interpreted-string                             | pop             |
| top        | `\n`         | **auto `;`** (last token is a string literal)       |                 |
| top        | (blank line) |                                                     |                 |
| top        | `func`       | keyword                                             |                 |
| top        | ` `          |                                                     |                 |
| top        | `main`       | identifier                                          |                 |
| top        | `(`          | punctuation                                         |                 |
| top        | `)`          | punctuation                                         |                 |
| top        | ` `          |                                                     |                 |
| top        | `{`          | punctuation                                         |                 |
| top        | `\n`         | no `;` (last token `{`)                             |                 |
| top        | `s`          | identifier                                          |                 |
| top        | ` `          |                                                     |                 |
| top        | `:=`         | operator (2-char longest match)                     |                 |
| top        | ` `          |                                                     |                 |
| top        | `"`          | enter interp-str                                    | push            |
| interp-str | `hello`      | string content                                      |                 |
| interp-str | `\t`         | escape `\t`                                         |                 |
| interp-str | `world`      | string content                                      |                 |
| interp-str | `\n`         | escape `\n` (not a literal newline)                 |                 |
| interp-str | `"`          | exit                                                | pop             |
| top        | `\n`         | **auto `;`**                                        |                 |
| top        | `r`          | identifier                                          |                 |
| top        | ` `          |                                                     |                 |
| top        | `:=`         | operator                                            |                 |
| top        | ` `          |                                                     |                 |
| top        | `'`          | enter rune                                          | push rune       |
| rune       | `\u00e4`     | escape `\uHHHH` (exactly 4 hex)                     |                 |
| rune       | `'`          | exit rune                                           | pop             |
| top        | `\n`         | **auto `;`**                                        |                 |
| top        | `fmt`        | identifier                                          |                 |
| top        | `.`          | punctuation (selector)                              |                 |
| top        | `Println`    | identifier                                          |                 |
| top        | `(`          | punctuation                                         |                 |
| top        | `s`          | identifier                                          |                 |
| top        | `,`          | punctuation                                         |                 |
| top        | ` `          |                                                     |                 |
| top        | `r`          | identifier                                          |                 |
| top        | `)`          | punctuation                                         |                 |
| top        | `\n`         | **auto `;`** (last token `)`)                       |                 |
| top        | `}`          | punctuation                                         |                 |
| top        | EOF          | **auto `;`** (last token `}`)                       |                 |

Key observations from this sample:

- `:=` wins over `:`+`=` by longest match.
- `\u00e4` is one escape token of length 6 inside the rune, not a backslash plus `u00e4`.
- Every newline after an identifier, literal, `)`, or `}` auto-inserts a semicolon.
- The `.` in `fmt.Println` is a field-selector, unambiguous here (no adjacent `.`s).

### Sample B — struct with raw-string tags, block comment containing newline

Source:

```go
type User struct {
	Name string `json:"name,omitempty"` // inline comment
	/* tags are raw strings, so backslashes are literal:
	   the \n below is two chars, not a newline */
	Age  int    `json:"age"`
}
```

Trace notes (abbreviated; focus on edge cases):

- `type` `User` `struct` `{` — four tokens, no semicolons between them (last tokens are keyword, identifier, keyword, `{`, none of which trigger auto-semi on newline, and `{` explicitly does not).
- Newline after `{`: no auto-semi (last token `{`).
- `Name` `string` — identifier, identifier (both predeclared, `string` is a predeclared type, not a keyword).
- ` ` then `` ` `` — enter raw-string context.
  - Inside raw-string: content is literally `json:"name,omitempty"`. The embedded `"` characters are ordinary characters here, **not** string-delimiters, because we are already in the raw-string context.
  - Closing `` ` `` exits raw-string.
- ` ` then `//` — enter line-comment. Content is ` inline comment`. Ends at newline.
- Newline after the line comment: is there an auto-semi? The last real token before the comment was the raw-string `` `json:"name,omitempty"` `` — a string literal, which **does** trigger auto-semi on newline. The comment doesn't break that: the spec says a line comment "acts like a newline", and the last **token** before this newline is the string literal. So **yes**, a semicolon is inserted here.
- Next line: `\t` whitespace, then `/*` — enter general-comment. This comment spans two source lines.
- On exit `*/`: the scanner notes that this block comment contained a newline, so for semicolon-insertion purposes it counts as a newline. But the last real token before this comment was the auto-inserted `;` from the previous line, so no further `;` is inserted.
- `Age` `int` — two identifiers (well, one identifier and a predeclared type).
- `` `json:"age"` `` — raw string.
- Newline → auto-semi (last token was string literal).
- `}` → no auto-semi before it (spec says `;` may be omitted before `}`). Then newline after `}` → auto-semi.

Key observations:

- A raw-string can contain `"` freely — the double quotes are just bytes.
- A raw-string containing newlines would be legal (this one doesn't).
- Block comments that contain newlines affect semicolon logic but do not produce any token themselves.
- The `\n` inside the block comment is just two characters (backslash, letter n) — the comment doesn't interpret it. But the spec's description of raw strings does note that `\n` is literal there too. A highlighter should not paint `\n` as an "escape" inside either raw strings or comments.

### Sample C — numeric edge cases, imaginary, hex float, hex-minus-int

Source:

```go
x := 0x15e-2
y := 0x1.Fp+0
z := 1_000_000i
w := 0123i
q := .25i + 0x1p-2i
```

Line-by-line trace:

**`x := 0x15e-2`**

- `x` identifier
- `:=` operator
- `0x15e` — hex integer literal (value 350). The scanner reads `0x`, then as many hex digits and underscores as possible. It reaches `e`, which is a hex digit, and consumes it. Then it sees `-`, which is **not** a hex digit and is **not** `p` or `P`, so the literal ends here. This is an **integer**, not a float.
- `-` operator (binary, but lexer doesn't care)
- `2` decimal integer

So `x := 0x15e-2` is the expression `0x15e - 2 == 348`. The spec explicitly calls out `0x15e-2` as an example of this trap.

**`y := 0x1.Fp+0`**

- `y` identifier
- `:=` operator
- `0x1.Fp+0` — hex float literal. Scanner reads `0x`, then hex mantissa `1.F`, then `p`, optional sign `+`, exponent `0`. One token.

**`z := 1_000_000i`**

- `z` identifier
- `:=` operator
- `1_000_000i` — imaginary integer literal. Scanner reads digits and interior underscores (rules satisfied), reaches `i`, consumes it as the imaginary suffix. One token.

**`w := 0123i`**

- `w` identifier
- `:=` operator
- `0123i` — imaginary literal. **Crucial**: although `0123` looks like a legacy-octal integer, the imaginary-literal back-compat rule says the integer part of an imaginary literal that's all digits-and-underscores starting with `0` is treated as **decimal**. Value is `123i`, not `83i` (= 0o123). One token.

**`q := .25i + 0x1p-2i`**

- `q` identifier
- `:=` operator
- `.25i` — imaginary decimal-float. Scanner sees `.`, peeks and finds digit, consumes `25`, then `i`. One token.
- ` ` whitespace
- `+` operator
- ` ` whitespace
- `0x1p-2i` — imaginary hex float. Scanner reads `0x1p-2` as a hex float (required `p` exponent with `-2`), then the `i` suffix. One token. Value is `0.25i`.

End of line: newline after `.25i + 0x1p-2i` — last token is imaginary literal → auto-semi.

Key observations:

- The lexer is **greedy** within a literal but only consumes chars that belong to the current base. The `e` in a hex integer is a digit; in a decimal integer it's an exponent marker; outside a literal it's an identifier character. Which state the lexer is in determines the tokenization.
- The imaginary back-compat rule (`0123i == 123i`) is easy to miss.
- `.25` and `0.25` are both valid decimal floats; `.` at the start is fine.
- Hex floats **must** have `p`, period. If no `p`, it's a hex integer that may or may not then eat a following `-` as a separate operator.

---

## Checkpoint

All five sections produced. Official spec was reachable via `curl` (WebFetch was timing out) and the full lexical section was captured in `/tmp/go-spec.txt`. tree-sitter-go, Pygments, Prism, and highlight.js grammars were all fetched and reviewed locally. No source gaps.

Next step: invoke **grammar-author** with the language name `go` to produce the twinkleplop grammar from this research.
