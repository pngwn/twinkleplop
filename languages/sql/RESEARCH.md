# sql lexical research

target: a pragmatic, dialect-permissive sql highlighter. the grammar should
tokenize standard sql (sql:2016 core) plus the lexical features of the four
dialects that dominate real-world use: postgresql, mysql, sqlite, and
transact-sql (microsoft sql server). when dialects conflict, accept the
superset rather than reject.

## sources consulted

primary (official specs / references):

- https://www.postgresql.org/docs/current/sql-syntax-lexical.html — postgresql lexical structure (closest to sql standard, most complete public doc)
- https://dev.mysql.com/doc/refman/8.4/en/language-structure.html — mysql 8.4 language structure
- https://www.sqlite.org/lang_keywords.html — sqlite keyword list
- https://www.sqlite.org/lang_expr.html — sqlite expression syntax, operator precedence, literals, parameters, comments
- https://learn.microsoft.com/en-us/sql/t-sql/language-elements/reserved-keywords-transact-sql — t-sql reserved + odbc + future keywords
- https://learn.microsoft.com/en-us/sql/t-sql/language-elements/transact-sql-syntax-conventions-transact-sql — t-sql conventions incl. multi-part names
- https://learn.microsoft.com/en-us/sql/t-sql/language-elements/operators-transact-sql — t-sql operator index
- https://learn.microsoft.com/en-us/sql/t-sql/data-types/constants-transact-sql — t-sql constants (character, unicode, binary, money, guid, datetime)

cross-reference (existing highlighters):

- https://unpkg.com/prismjs@1.29.0/components/prism-sql.js — prism permissive sql grammar (keywords, regex patterns)
- derekstride/tree-sitter-sql on github (referenced, page load failed; grammar noted in web search)
- highlight.js sql language (referenced via web search; page fetch failed twice)

gaps: the iso/iec 9075 (sql:2016) pdf is paywalled; i used postgresql's doc as the standard proxy since it adheres to the spec closely and documents both standard and postgres-specific forms distinctly. the odbc reserved list inside the t-sql page is effectively sql-92's reserved set.

---

## 1. primary sources

see above. when sources disagreed, the rule i followed:

- lexical forms in the sql standard (comments `--`/`/* */`, `'...'` strings with doubled-quote escape, `"..."` delimited identifiers, numeric forms without prefixes) are authoritative.
- dialect-only forms (dollar quotes, backtick identifiers, `$tag$`, hex/bit prefixes, `E'...'`, `N'...'`, square-bracket identifiers, `#` line comments, `:=` assignment, compound assignment `+=` etc., `@var`, `@@var`, `::` cast, jsonb operators, parameter markers `$n` / `?n` / `:n` / `@n`) are additive — a permissive highlighter should accept them but the grammar author should know which dialect each belongs to.
- prism / highlight.js are not authoritative; their shortcuts are noted where i avoid following them (e.g. prism treats `//` as a line comment; no major sql dialect does).

---

## 2. token inventory

### 2.1 literals

**strings (single-quoted, standard)**

- form: `'...'`, content is any character except unescaped `'` and (per spec) the null character.
- escape: doubled single quote `''` inside the string represents one literal quote.
- no backslash escapes by default (standard, sqlite).
- line continuation: two single-quoted literals separated only by whitespace containing at least one newline are implicitly concatenated into one string (postgresql, standard sql).

**strings (double-quoted, as strings — dialect-specific)**

- mysql (when `ANSI_QUOTES` sql mode is off): `"..."` is a string literal, with `""` as the escape.
- t-sql (when `QUOTED_IDENTIFIER` is off): same behaviour.
- in postgresql, sqlite, and mysql-ansi / t-sql default: `"..."` is an identifier, not a string.
- a permissive highlighter should assume identifier by default and only treat `"..."` as a string when context clearly indicates it (rare in practice — highlighters usually pick identifier).

**c-style escape strings (postgresql)**

- form: `E'...'` or `e'...'`. backslash begins an escape sequence.
- escapes: `\b \f \n \r \t`, octal `\o`, `\oo`, `\ooo`, hex `\xh`, `\xhh`, 16-bit unicode `\uXXXX`, 32-bit unicode `\UXXXXXXXX`, `\\`, `\'`, and `\<any>` → `<any>` (literal).
- requires `E` to be upper/lowercase immediately before the opening `'`.

**unicode escape strings (postgresql, sql standard)**

- form: `U&'...'` or `u&'...'`. 4-digit `\XXXX` and 6-digit `\+XXXXXX` unicode escapes.
- optional `UESCAPE 'c'` clause to change escape character (`c` may not be a hex digit, `+`, `'`, `"`, or whitespace).

**national / unicode strings (t-sql, sql-92)**

- form: `N'...'` (uppercase n required in t-sql; sql-92 allows either case).
- follows plain-string escape rules (doubled quote only; no backslash escapes).

**mysql character-set introducers**

- form: `_charset'...'` — e.g. `_utf8'...'`, `_latin1'...'`, `_ucs2'...'`.
- the introducer `_charset` is an identifier-like prefix immediately before a string literal.

**mysql backslash-escaped strings**

- whether `'...'` supports backslash escapes depends on sql mode (`NO_BACKSLASH_ESCAPES`). default: yes.
- escapes: `\0 \' \" \b \n \r \t \Z \\ \% \_` and `\<any>` → `<any>`.

**bit-string constants (postgresql, sql standard)**

- binary: `B'0101'` / `b'0101'` — content restricted to `0` and `1`.
- hex: `X'1FF'` / `x'1FF'` — content restricted to `[0-9a-fA-F]`.
- may span lines like regular strings.

**hex / bit literals (mysql, t-sql)**

- mysql: `x'48656C'`, `X'...'`, `0x48656C` (no quotes) for hex; `b'1010'`, `B'...'`, `0b1010` for binary.
- t-sql: `0xAE12` (no quotes) as binary constant.

**blob literals (sqlite)**

- `x'AB12'` / `X'AB12'` — hex pairs only.

**dollar-quoted strings (postgresql only, non-standard)**

- form: `$$...$$` or `$tag$...$tag$`.
- tag rules: optional; if present, same rules as unquoted identifier but may not contain `$`; case-sensitive.
- no internal escaping whatsoever — backslashes, quotes, dollar signs, newlines are literal.
- nesting requires different tags at each level.
- must be separated from a preceding keyword/identifier by whitespace (to disambiguate `$1` positional param vs dollar quote).

**numeric literals — decimal**

- integer: `[0-9]+` with optional `_` separator between digits (not at start/end, not adjacent to `.` or `e`, no doubled `__`).
- decimal: `[0-9]+\.[0-9]*` | `\.[0-9]+` | `[0-9]+\.` — at least one digit on one side of the dot.
- exponent: `[eE][+-]?[0-9]+` appended to integer or decimal; at least one digit required after `e`.
- no numeric suffixes in standard sql (contrast js/rust `n`, `f`, `L`, etc.).
- leading `+`/`-` is a unary operator, not part of the constant.

**numeric literals — non-decimal bases (postgresql 16+)**

- hex: `0x[0-9a-fA-F_]+` / `0X...` (underscores allowed inside).
- octal: `0o[0-7_]+` / `0O...`.
- binary: `0b[01_]+` / `0B...`.
- mysql accepts `0x...` hex and `0b...` binary as well.
- t-sql accepts `0x...` hex only.
- sqlite accepts `0x...` hex for integer literals.

**money constants (t-sql only)**

- form: `$` followed by optional sign and digits with optional decimal point, e.g. `$12`, `$542023.14`, `$-23`, `+$423456.99`.
- not quoted. other currency symbols also accepted by the server but `$` is the example. commas are ignored inside.

**date / time constants**

- sql standard `DATE 'yyyy-mm-dd'`, `TIME 'hh:mm:ss'`, `TIMESTAMP '...'`, `INTERVAL '...' DAY TO HOUR` — these are a type-name keyword followed by a string literal; lex as keyword + string.
- t-sql has no separate date literal syntax; dates are ordinary character strings.

**guid constants (t-sql)**

- no distinct token; written as a character string `'6F9619FF-...-...'` or as binary `0x...`.

**boolean and null**

- `TRUE`, `FALSE`, `NULL` (case-insensitive) — keywords, not literals at the lexical level, but typically tokenized as `builtin` / `constant.language`.
- `UNKNOWN` (sql standard ternary logic) — keyword.

**standard constant-like keywords (lex as builtin/constant)**

- `CURRENT_DATE`, `CURRENT_TIME`, `CURRENT_TIMESTAMP`, `CURRENT_USER`, `SESSION_USER`, `SYSTEM_USER`, `USER`, `LOCALTIME`, `LOCALTIMESTAMP`.

### 2.2 comments

- line comment: `--` to end of line. standard sql. all dialects. (mysql quirk: `--` must be followed by whitespace or eol to be a comment; otherwise it is the subtraction-of-negation operator `- -`. a permissive highlighter may ignore this quirk.)
- block comment: `/* ... */`. standard sql.
- nested block comments: postgresql and mysql support nesting (`/* a /* b */ c */` — still in comment after inner close). sqlite does not nest. sql standard does not require nesting. a permissive highlighter should support nesting.
- hash line comment: `#` to end of line. mysql only. not standard.
- version-specific executable comments (mysql only): `/*! ... */` and `/*!50700 ... */` — content is executed as sql in matching mysql versions. the `!` (and optional version digits) follow `/*` immediately with no whitespace. lex the opening marker as a comment-punctuation token and the body as ordinary sql tokens? this is above lexical scope; practical choice: treat as a comment like any other.
- optimizer hints (mysql): `/*+ ... */` — structured comment, treated as comment at lex level.
- no doc-comment convention in sql.
- no shebang.

### 2.3 keywords

sql keywords are case-insensitive in all dialects.

**approach**: twinkleplop grammar should use a single flattened keyword set for case-insensitive lookup. the union of keyword sets across dialects is large (~500+ words). the practical baseline is the prism list (see source); i recommend starting from that and adding:

- missing ansi/iso reserved words from the t-sql odbc list (e.g. `ALLOCATE`, `CASCADED`, `CORRESPONDING`, `DEFERRABLE`, `ONLY`, `OVERLAPS`, `SIMILAR`, `TRANSLATION`, etc.).
- missing postgres-specific (`ILIKE`, `RETURNING`, `DO`, `LATERAL`, `RECURSIVE`, `WINDOW`).
- missing sqlite-specific from the 147-keyword list (`ABORT`, `AFTER`, `ATTACH`, `AUTOINCREMENT`, `CONFLICT`, `DEFERRABLE`, `DETACH`, `EXCLUSIVE`, `FAIL`, `GLOB`, `INDEXED`, `INSTEAD`, `MATERIALIZED`, `REINDEX`, `VACUUM`, `VIRTUAL`, `WITHOUT`, `WINDOW`, …).
- t-sql-specific (`DBCC`, `DENY`, `ERRLVL`, `HOLDLOCK`, `NOCHECK`, `NONCLUSTERED`, `OPENDATASOURCE`, `OPENQUERY`, `OPENROWSET`, `OPENXML`, `PIVOT`, `RAISERROR`, `RECONFIGURE`, `REVERT`, `ROWGUIDCOL`, `SEMANTICKEYPHRASETABLE`, `TABLESAMPLE`, `TRY_CONVERT`, `TSEQUAL`, `UNPIVOT`, `WAITFOR`).

**contextual / soft keywords** (usable as identifiers in certain positions; the grammar author can decide whether to still highlight them):

- sqlite: most of its 147 keywords are usable as identifiers in most contexts; only a handful (e.g. `SELECT`, `FROM`, `WHERE`) are strictly reserved. a highlighter usually still colours all of them.
- postgresql: reserved vs non-reserved distinction documented in appendix c; lex both the same.
- mysql: reserved vs non-reserved; reserved must be backtick-quoted to be identifiers.
- t-sql: reserved list + future list.

**literal-valued keywords** (highlight separately from ordinary keywords):

- `TRUE`, `FALSE`, `NULL`, `UNKNOWN`, `DEFAULT`.
- `CURRENT_DATE`, `CURRENT_TIME`, `CURRENT_TIMESTAMP`, `CURRENT_USER`, `CURRENT_ROLE`, `SESSION_USER`, `SYSTEM_USER`, `LOCALTIME`, `LOCALTIMESTAMP`, `USER`.

**type keywords** (highlight separately in typical themes):

- standard: `INT`, `INTEGER`, `SMALLINT`, `BIGINT`, `TINYINT`, `DECIMAL`, `NUMERIC`, `REAL`, `FLOAT`, `DOUBLE`, `DOUBLE PRECISION`, `CHAR`, `VARCHAR`, `NCHAR`, `NVARCHAR`, `TEXT`, `CLOB`, `BLOB`, `DATE`, `TIME`, `TIMESTAMP`, `TIMESTAMPTZ`, `INTERVAL`, `BOOLEAN`, `BIT`, `VARBIT`, `BYTEA`, `JSON`, `JSONB`, `UUID`, `XML`, `SERIAL`, `BIGSERIAL`, `MONEY`, `ARRAY`.

### 2.4 operators

**single-character**

- `+` `-` `*` `/` `%` `^` `=` `<` `>` `!` `~` `&` `|` `:` `?` `@` `#` `.` `,` `;` `(` `)` `[` `]` `{` `}`

**multi-character (standard)**

- `<>` not equal
- `<=` `>=` comparison
- `||` string concatenation (standard; in mysql-default mode `||` is logical OR instead, configurable via `PIPES_AS_CONCAT` sql mode)

**multi-character (common across dialects)**

- `!=` not equal (non-standard synonym of `<>`)
- `**` exponent (some dialects)

**postgresql additions**

- `::` typecast
- `->`, `->>` json/composite access
- `#>`, `#>>` json path access
- `@>`, `<@` contains / contained by (range, jsonb, array)
- `~`, `~*`, `!~`, `!~*` regex match (pattern and case-insensitive variants)
- `?`, `?|`, `?&` json key existence tests (jsonb)
- `||/`, `|/` cube/square root operators
- `#`, `@`, `^` user-definable operators (lexed as operator, not punctuation)
- user-defined operators may be any sequence of `+ - * / < > = ~ ! @ # % ^ & | ? \`` up to 63 chars, with restrictions: may not contain `--`or`/\*`; if ends in `+`or`-`must also contain`~ ! @ # % ^ & | ? \``.

**mysql additions**

- `<=>` null-safe equality
- `&&` logical AND (synonym of `AND`)
- `||` logical OR (synonym of `OR`) — conflicts with standard concat
- `!` logical NOT
- `:=` assignment (within expressions, for `SET @var := expr`)
- `<<`, `>>` bit shift

**t-sql additions**

- `::` scope resolution (different from postgres cast)
- compound assignment: `+=` `-=` `*=` `/=` `%=` `&=` `|=` `^=`
- `!<`, `!>` comparison (not less than, not greater than)
- string concat: `+` (not `||`)

**sqlite additions**

- `==` equality (synonym of `=`)
- `->`, `->>` json access (3.38+)
- bit shift `<<`, `>>`, bitwise `&`, `|`, `~`

**length-sort note for grammar author**: the multi-char operators `<=>`, `!~*`, `!=`, `<=`, `>=`, `<>`, `::`, `->`, `->>`, `#>`, `#>>`, `@>`, `<@`, `||`, `&&`, `!~`, `~*`, `?|`, `?&`, `+=`, `-=`, `*=`, `/=`, `%=`, `&=`, `|=`, `^=`, `!<`, `!>`, `==`, `**`, `<<`, `>>`, `:=` must be tried before their single-char prefixes. longest-match first.

**keyword operators** (operator semantics, keyword token shape — standard unless noted):

- `AND`, `OR`, `NOT`, `XOR` (mysql)
- `BETWEEN`, `IN`, `LIKE`, `ILIKE` (pg), `SIMILAR TO`, `IS`, `IS NOT`, `IS DISTINCT FROM`, `IS NOT DISTINCT FROM`, `ISNULL`, `NOTNULL`
- `GLOB`, `MATCH`, `REGEXP`, `RLIKE` (sqlite/mysql)
- `EXISTS`, `UNIQUE`, `OVERLAPS`
- `ALL`, `ANY`, `SOME`
- `ESCAPE` (postfix, within LIKE)
- `COLLATE` (postfix)
- `AT TIME ZONE`, `AT LOCAL` (postfix)
- `DIV`, `MOD` (mysql keyword operators for integer div / modulo)

### 2.5 identifiers

**unquoted**

- ascii start: letter `[a-zA-Z]` or underscore `_`.
- postgresql extends to any letter (including non-latin) and diacritical marks.
- continuation: letters, digits, underscore; additionally `$` in postgresql and mysql (not standard).
- case-insensitive in postgresql (folded to lower) and most dialects for comparison; the source text preserves case but the identifier matches keywords and other identifiers case-insensitively.
- length limits are implementation-specific (63 bytes in pg, 64 chars in mysql, longer in t-sql); not relevant to lexing.

**delimited identifiers (double quote — standard)**

- `"foo"`, `"foo bar"`, `"select"` (use keyword as identifier).
- case-sensitive (contents preserved).
- escape embedded `"` by doubling: `"foo""bar"` → identifier `foo"bar`.
- no backslash escapes.

**delimited identifiers (backticks — mysql, sqlite-compat)**

- `` `foo` ``, `` `foo``bar` `` (doubled backtick escapes).
- case-sensitive.

**delimited identifiers (square brackets — t-sql, sqlite-compat, ms access)**

- `[foo]`, `[foo]]bar]` (doubled `]` escapes `]`). no escape for `[`.
- case-sensitivity depends on collation.
- note: square brackets are also used in pg for array subscript and in json path operators. context-disambiguated.

**unicode-quoted identifiers (postgresql, sql standard)**

- `U&"foo\0061"` with optional `UESCAPE 'c'`.

**sigils**

- `$n` positional parameter (postgresql, prepared statements; n is digits).
- `?`, `?NNN` parameter marker (jdbc, sqlite, mysql).
- `:name` named parameter (sqlite, oracle-style).
- `@name` session / user variable (mysql, t-sql), or named parameter (sqlite).
- `@@name` system variable (mysql, t-sql).
- `$name` tcl-style named parameter (sqlite).
- in postgresql, `@` is an operator (unary absolute-value), not a sigil. `@@` is an operator (tsquery matches tsvector).
- disambiguation: sigil vs operator depends on what follows. `@foo` in mysql / t-sql → variable; in postgres → operator `@` followed by identifier `foo`.

### 2.6 punctuation and delimiters

- `;` statement terminator (cannot appear inside string, quoted identifier, or comment).
- `,` list separator.
- `(` `)` grouping.
- `[` `]` array subscript (pg), identifier quoting (t-sql/sqlite/access), json path hints.
- `.` schema/table/column separator (also numeric, also t-sql multi-part names with empty parts like `db..obj`).
- `*` wildcard in `SELECT *`, `table.*` (otherwise the multiplication operator).
- `{` `}` not used in sql except inside odbc escape sequences `{d 'yyyy-mm-dd'}`, `{t 'hh:mm:ss'}`, `{ts 'yyyy-mm-dd hh:mm:ss'}`, `{fn FUNC(...)}`, `{call PROC(...)}`, `{oj ...}`. most highlighters ignore odbc escapes.

### 2.7 special syntax

- **positional parameter** (pg): `$1`, `$2`, ... `$n` — contiguous digits after `$` with no intervening whitespace.
- **dollar-quoted string** (pg): `$tag$...$tag$` — must be separated from preceding identifier/keyword by whitespace to disambiguate from `$1`.
- **odbc escape clauses**: `{d '...'}`, `{t '...'}`, `{ts '...'}`, `{fn name(...)}`, `{call name(...)}`, `{oj ...}`, `{ ? = call ... }` — uncommon in practice.
- **batch separator** (t-sql, sqlcmd, ssms): `GO` on its own line (optionally `GO n` to repeat). technically a client-utility directive, not a language keyword. lex as keyword if present at line-start.
- **label syntax**:
  - pl/pgsql: `<<label>>`, `<< label_name >>`.
  - mysql stored procedures: `label_name:`.
  - t-sql: `label_name:` (with `GOTO label_name`).
- **assignment in procedural contexts**:
  - pl/pgsql: `var := expr;`.
  - mysql: `SET @var := expr;` or `SET @var = expr;`.
  - t-sql: `SET @var = expr;`, or compound `SET @var += expr;`.
- **postgresql `COPY ... FROM stdin` data section**: ends with a line containing only `\.`. the data between is not sql and has its own mini-format (tab-separated values with backslash escapes). typically out of lexical scope for a syntax highlighter; either treat as plain text or stop tokenising until `\.`.

---

## 3. edge case inventory

**ambiguous tokens**

- `--` starts a comment — except:
  - in mysql, `--` without trailing whitespace is the double-negation operator `- -` (e.g. `5---1` → `5 - -1 = 6`). permissive highlighter may ignore.
  - inside a string, `--` is content.
  - inside a dollar-quoted string, `--` is content.
- `/*` starts a block comment — except inside any string form.
- `/` vs `/*`: `/` is division; only emit comment on the two-char sequence `/*`.
- `*` vs `/*`: `*` is multiplication / wildcard; pair with `/` to close a block comment.
- `.` is:
  - a decimal separator if it is adjacent to digits (`3.14`, `.5`, `5.`);
  - a name qualifier (`schema.table.column`) otherwise;
  - in t-sql, `..` is "omitted middle component" in multi-part names (`db..obj`).
- `-`/`+` are unary or binary. never part of a numeric literal.
- `?` is:
  - jdbc positional parameter (`... WHERE x = ?`);
  - sqlite parameter `?NNN`;
  - postgresql jsonb operators `?`, `?|`, `?&` (in jsonb expression context).
- `@` is:
  - mysql / t-sql user variable sigil (`@var`);
  - mysql / t-sql system variable sigil with `@@` (`@@version`, `@@rowcount`);
  - sqlite named parameter `@name`;
  - postgresql unary operator (absolute value) and part of operators like `@>`, `@@`, `@?`, `@-@`.
- `#` is:
  - mysql line comment start;
  - postgresql bit-xor operator and component of `#>`, `#>>`;
  - t-sql temp-table name prefix (`#temp`, `##global_temp`) — these are ordinary identifiers with `#` allowed as leading char in t-sql.
- `$` is:
  - pg positional parameter prefix (`$1`);
  - pg dollar-quote open/close;
  - pg/mysql allowed inside identifiers (not at start);
  - sqlite tcl-style named-parameter prefix `$name`;
  - t-sql money constant prefix `$100`.
- `:` is:
  - sqlite named parameter prefix `:name`;
  - oracle / mysql bind variable prefix in some contexts;
  - pg `::` cast and array-slice `arr[1:3]`;
  - pg/mysql `:=` assignment.
- `'` versus `''`:
  - outside a string, `''` is an empty string literal.
  - inside a string, `''` is an escaped single quote that does not close the string.
  - the tokenizer must track "am i inside a string" to decide.
- `` ` `` versus operator: postgresql allows `` ` `` as part of a user-defined operator symbol. highlighters outside mysql rarely encounter backtick identifiers, but the author should decide which dialect wins.
- identifier vs string prefix: `E'...'`, `N'...'`, `B'...'`, `X'...'`, `U&'...'`, `_utf8'...'`, `R'...'` (raw, some dialects).
  - the prefix letter immediately before `'` with no whitespace forms the prefixed literal.
  - `E 'foo'` (space before quote) is identifier `E` followed by string `'foo'`.
  - the check is "prefix identifier that is exactly one of these forms + no intervening whitespace + quote".
- `0x1F` is a hex numeric literal; `0xxyz` is `0` identifier `xxyz`? actually `0x` requires at least one hex digit. so `0x` alone is invalid; `0xG` is `0` + identifier — but no lexer would produce that. simpler rule: `0x[0-9a-fA-F_]+` is numeric; anything else falls back to `0` (integer) followed by identifier tokenization of the rest. in practice `0xG` is a syntax error; mark the `0x` as the best-available token.
- `1e` alone is not valid; `1e5` is; `1e` followed by identifier is tokenised as integer `1` then identifier `e...` by spec. some highlighters greedily accept `1e`. spec-compliant tokenisers reject partial exponents.

**nesting edge cases**

- dollar-quoted strings can contain dollar signs as long as the closing tag is not matched. `$$a$b$$` is a valid dollar-quoted string with content `a$b`.
- nested dollar quotes: `$outer$ ... $inner$ x $inner$ ... $outer$` requires tracking the opening tag and only closing on that exact tag.
- nested block comments: depth counter required. `/* a /* b */ c */` — at the first `*/`, decrement; still in comment.
- string interpolation: sql does not have native string interpolation (unlike template literals in js or sh). no nested expression-in-string context. a permissive highlighter can ignore this category.
- single-quoted strings may not cross dollar-quote boundaries; dollar-quoted strings may contain any characters including single quotes.

**case sensitivity**

- keywords: case-insensitive in every dialect.
- unquoted identifiers: case-insensitive in pg (folded to lower), mysql (default, file-system-dependent on some platforms), sqlite, t-sql (collation-dependent). in practice, highlighting treats unquoted identifiers case-insensitively for keyword lookup.
- quoted identifiers: case-sensitive in pg (exact case preserved and compared); in mysql backticks preserve case but comparison depends on collation; t-sql brackets preserve case, comparison collation-dependent.
- prefix letters `E`, `N`, `B`, `X`, `U&` etc. are case-insensitive.

**whitespace significance**

- sql has no indentation-based syntax.
- newline separation matters only for:
  - adjacent single-quoted strings (auto-concatenation requires intervening newline + whitespace);
  - `GO` batch separator (t-sql, must be alone on a line);
  - `--` line comment terminates at newline;
  - `#` line comment (mysql) terminates at newline.
- in most other contexts, any whitespace sequence is equivalent.

**contextual tokenisation**

- `*` → wildcard after `SELECT`, `table.*`, `count(*)`; otherwise multiplication. lex the same, let renderer decide from context (or use a post-pass).
- `E`, `N`, `B`, `X` prefixes: a quote must immediately follow.
- `$` dollar-quote vs positional parameter:
  - `$` followed by `[0-9]+` and not followed by `$` or tag chars → positional parameter.
  - `$` followed by optional identifier-chars then `$` → dollar-quote open.
  - rule of thumb: try dollar-quote first; if no closing `$` is seen on the tag identifier, treat as `$[0-9]+` positional param or fallback.
- `[...]` in t-sql / sqlite is identifier; in pg it is array subscript; `[` after `array` keyword is array constructor syntax. a dialect-neutral highlighter typically treats `[...]` as identifier only when content is ident-like and no obvious expression syntax is inside.
- `::` in pg is a cast operator; in t-sql it is scope resolution. in ansi it is unused. lex as a single token in all cases.

---

## 4. nesting and context constructs

```
single-quoted string (standard)
  opens:  '
  closes: ' (unescaped; doubled '' is an escape)
  nests:  nothing
  escapes: '' → ' ; in mysql default mode (no NO_BACKSLASH_ESCAPES): \n \t \r \0 \b \Z \" \' \\ \% \_ \<any>
  notes:  auto-concatenates with an adjacent '...' if separated only by whitespace containing ≥1 newline
```

```
postgresql c-style escape string
  opens:  E' or e'  (letter immediately before ', no whitespace)
  closes: ' (unescaped)
  nests:  nothing
  escapes: \b \f \n \r \t, \ooo octal, \xhh hex, \uXXXX / \UXXXXXXXX unicode, \\, \', \<any>
```

```
postgresql unicode escape string
  opens:  U&' or u&'
  closes: ' (unescaped)
  nests:  nothing
  escapes: \XXXX 4-digit, \+XXXXXX 6-digit; optional UESCAPE 'c' clause right after the closing ' changes the escape character
  notes:  the UESCAPE clause is lexically after the close quote — the tokenizer should recognise 'UESCAPE' + string as part of the same literal or as separate tokens (grammar author's call)
```

```
postgresql dollar-quoted string
  opens:  $tag$  (tag is 0+ identifier-start/continue chars, no $, case-sensitive)
  closes: the exact same $tag$ sequence
  nests:  a different tag may be used inside; a matching inner $tag$ does not close the outer
  escapes: none — all content is literal including \ ' " $
  notes:  the empty-tag form $$...$$ is valid; must be preceded by whitespace or punctuation to disambiguate from $n positional parameter
```

```
double-quoted identifier (standard / postgresql)
  opens:  "
  closes: " (unescaped; doubled "" is an escape)
  nests:  nothing
  escapes: "" → "
```

```
unicode-escaped identifier (postgresql)
  opens:  U&"  or u&"
  closes: "
  nests:  nothing
  escapes: \XXXX, \+XXXXXX, optional UESCAPE clause
```

```
backtick-quoted identifier (mysql, sqlite)
  opens:  `
  closes: ` (unescaped; doubled `` is an escape)
  nests:  nothing
```

```
square-bracket identifier (t-sql, sqlite, ms access)
  opens:  [
  closes: ] (unescaped; doubled ]] is an escape)
  nests:  does not nest
  escapes: ]] → ]
  notes:  disambiguation vs array subscript (pg) / json path: in t-sql / sqlite only the [ident] form is identifier; in pg, [ never opens an identifier.
```

```
block comment (standard)
  opens:  /*
  closes: */
  nests:  yes in postgresql and mysql (depth-counted); no in sqlite, t-sql, and sql standard
  escapes: none
  notes:  optimizer-hint /*+ ... */ and mysql version-executable /*! ... */ are the same lexical construct with extra internal syntax the highlighter can ignore
```

```
line comment
  opens:  -- (standard, all dialects), or # (mysql only)
  closes: newline or eof
  nests:  n/a
  escapes: n/a
  notes:  mysql quirk: -- must be followed by whitespace or eol to count as a comment. permissive highlighter may ignore.
```

```
bit-string / hex-string literal
  opens:  B' / b' / X' / x'
  closes: '
  nests:  nothing
  escapes: none
  content restriction: 0-1 for B, 0-9a-fA-F for X
```

```
mysql character-set introducer
  opens:  _<charset-ident>'
  closes: '
  nests:  nothing
  escapes: same as an ordinary mysql single-quoted string
  notes:  the _charset prefix is a single logical token before the string, or can be lexed as identifier + string — grammar author's call
```

```
procedural/sql statement scope (not lexical but worth noting)
  many sql dialects embed a procedural language (pl/pgsql inside $$ ... $$ in postgres,
  stored-procedure bodies delimited by BEGIN/END, etc.). at the lex level treat these as
  ordinary sql — the tokens look the same. a highlighter does not need a separate state.
```

---

## 5. manual trace

### sample 1 — postgresql function with dollar-quoted body, embedded quotes and comments

```
CREATE OR REPLACE FUNCTION greet(who text) RETURNS text AS $fn$
DECLARE msg text := 'Hello, ' || who || '!';
BEGIN
  -- a real line comment inside the dollar-quoted body
  RETURN msg;
END;
$fn$ LANGUAGE plpgsql;
```

trace (context in brackets, `→` indicates emit):

```
[top] CREATE            → keyword
[top] <space>           → whitespace
[top] OR                → keyword
[top] <space>           → whitespace
[top] REPLACE           → keyword
[top] <space>
[top] FUNCTION          → keyword
[top] <space>
[top] greet             → identifier
[top] (                 → punctuation    enter group
[top] who               → identifier
[top] <space>
[top] text              → type keyword
[top] )                 → punctuation    exit group
[top] <space>
[top] RETURNS           → keyword
[top] <space>
[top] text              → type keyword
[top] <space>
[top] AS                → keyword
[top] <space>
[top] $fn$              → string.dollar-open            enter dollar-string tag=fn
[dollar=fn] \n          → string content
[dollar=fn] DECLARE msg text := 'Hello, ' || who || '!';
  → entire line is literal string content; the inner ' characters do NOT open a string because inside a dollar-quoted literal the single quote is literal
[dollar=fn] \n          → string content
[dollar=fn] BEGIN       → string content
[dollar=fn] \n  -- a real line comment inside the dollar-quoted body\n
  → still string content; -- is not a comment inside a dollar-quoted literal
[dollar=fn]   RETURN msg;\nEND;\n
  → string content
[dollar=fn] $fn$        → string.dollar-close          exit dollar-string
[top] <space>
[top] LANGUAGE          → keyword
[top] <space>
[top] plpgsql           → identifier
[top] ;                 → punctuation
```

key lessons: inside a dollar-quoted string, neither single-quote nor `--` nor `/*` have their usual meaning. the only way to exit is the matching `$fn$` close tag.

### sample 2 — mysql with backticks, hash comment, introducer, hex, bit, user var, null-safe equals

```
SELECT `user`.`id`, @@version, @cutoff
FROM `user` # active users
WHERE `email` LIKE _utf8'%@example.com'
  AND `flags` & 0x0F = b'0101'
  AND `deleted_at` <=> NULL;
SET @cutoff := 10;
```

trace:

```
[top] SELECT                    → keyword
[top] <space>
[top] `user`                    → identifier.delimited.backtick
[top] .                         → punctuation.accessor
[top] `id`                      → identifier.delimited.backtick
[top] ,
[top] <space>
[top] @@version                 → variable.system    (sigil @@ + identifier)
[top] ,
[top] <space>
[top] @cutoff                   → variable.user      (sigil @ + identifier)
[top] \n
[top] FROM                      → keyword
[top] <space>
[top] `user`                    → identifier.delimited.backtick
[top] <space>
[top] #                         → comment.line.open   enter line-comment
[line-comment] ' active users\n' (until eol)  → comment content
[top] \n  (end of line exits the comment)
[top] WHERE                     → keyword
[top] <space>
[top] `email`                   → identifier.delimited.backtick
[top] <space>
[top] LIKE                      → keyword.operator
[top] <space>
[top] _utf8                     → identifier.charset-introducer (a single logical prefix)
[top] '%@example.com'           → string.single-quoted
  inside string: %, @, e, x, a, m, p, l, e, ., c, o, m are all content; ' closes
[top] \n
[top] AND                       → keyword.operator
[top] <space>
[top] `flags`                   → identifier.delimited.backtick
[top] <space>
[top] &                         → operator.bitwise-and
[top] <space>
[top] 0x0F                      → number.hex
[top] <space>
[top] =                         → operator.equality
[top] <space>
[top] b'0101'                   → number.bit            (b prefix + '0101')
[top] \n
[top] AND                       → keyword.operator
[top] <space>
[top] `deleted_at`              → identifier
[top] <space>
[top] <=>                       → operator.null-safe-equality    (three-char; must be tried before <= and <)
[top] <space>
[top] NULL                      → constant.null
[top] ;
[top] \n
[top] SET                       → keyword
[top] <space>
[top] @cutoff                   → variable.user
[top] <space>
[top] :=                        → operator.assignment             (two-char)
[top] <space>
[top] 10                        → number.integer
[top] ;
```

key lessons:

- `@@version` is one token, not `@` + `@version`. longest-match sigil rule.
- `<=>` must be tried before `<=`, which must be tried before `<`.
- `:=` vs `:` vs `::` — all must be tried in length order.
- `_utf8` is a prefix identifier; the `'` that follows is still a string open, and the overall literal is logically `_utf8'...'`.
- `#` is a comment in mysql but would be an operator token in postgres — a permissive grammar should emit it as a comment when not preceded by an operator-context, but mysql-specific would be clearer.

### sample 3 — t-sql with brackets, n-prefix unicode, compound assignment, money, GO

```
DECLARE @total money = $100.00;
SET @total += 50;

SELECT [Order ID], N'café' AS label
FROM [dbo].[Orders]
WHERE [Customer ID] = 0x1F
   OR [notes] LIKE N'it''s urgent';
GO
```

trace:

```
[top] DECLARE                   → keyword
[top] <space>
[top] @total                    → variable.local
[top] <space>
[top] money                     → keyword.type
[top] <space>
[top] =                         → operator.assignment
[top] <space>
[top] $100.00                   → number.money  ($ + decimal)
[top] ;
[top] \n
[top] SET                       → keyword
[top] <space>
[top] @total                    → variable.local
[top] <space>
[top] +=                        → operator.compound-assignment    (two-char before +)
[top] <space>
[top] 50                        → number.integer
[top] ;
[top] \n\n
[top] SELECT                    → keyword
[top] <space>
[top] [Order ID]                → identifier.delimited.bracket    enter/exit bracket-identifier
  inside brackets: 'O','r','d','e','r',' ','I','D' are content; ] closes
[top] ,
[top] <space>
[top] N'café'                   → string.unicode                  (N prefix + single-quoted)
  inside string: c, a, f, é are content; ' closes
[top] <space>
[top] AS                        → keyword
[top] <space>
[top] label                     → identifier
[top] \n
[top] FROM                      → keyword
[top] <space>
[top] [dbo]                     → identifier.delimited.bracket
[top] .                         → punctuation.accessor
[top] [Orders]                  → identifier.delimited.bracket
[top] \n
[top] WHERE                     → keyword
[top] <space>
[top] [Customer ID]             → identifier.delimited.bracket
[top] <space>
[top] =                         → operator.equality
[top] <space>
[top] 0x1F                      → number.hex
[top] \n
[top] OR                        → keyword.operator
[top] <space>
[top] [notes]                   → identifier.delimited.bracket
[top] <space>
[top] LIKE                      → keyword.operator
[top] <space>
[top] N'it''s urgent'           → string.unicode
  trace within string:
    N'                          → open unicode string
    i, t                        → content
    ''                          → escaped single quote (content: ')
    s, <space>, u, r, g, e, n, t → content
    '                           → close
[top] ;
[top] \n
[top] GO                        → directive.batch-separator  (line-only; not strictly a language keyword)
[top] \n
```

key lessons:

- `$100.00` is a money constant in t-sql but would be a syntax error in pg (since `$` expects a digit-only positional parameter or a dollar-quoted string). dialect-aware or permissive-permissive choice for grammar author.
- `+=` needs to be tried before `+`.
- inside an n-prefixed unicode string, the only escape is `''`; all other characters (including `é` or any unicode) are content.
- `[ ... ]` in t-sql cannot nest; the closing `]` is found with a doubling rule (`]]` escapes `]`).
- `GO` is line-delimited and not a real sql keyword — but tokenise as keyword for colouring.

---

## summary for grammar-author

when you pick this up:

- aim for a permissive union highlighter unless the user wants per-dialect grammars.
- the seven distinct string-opening forms (`'`, `"`, `` ` ``, `[`, `$$` / `$tag$`, prefix letters `E|N|B|X|U&` before `'`, and `_charset'...'`) each need their own state or prefix check.
- comments have two variants (line: `--` and `#`; block: `/* */` with nesting) — depth counter required for the block form.
- multi-char operators are dominated by the 2- and 3-char forms listed in §2.4; implement longest-match.
- sigils (`@`, `@@`, `$n`, `?`, `:name`) require per-sigil scanning, not a single "identifier" rule.
- keywords, type names, literal-keywords (`TRUE`/`FALSE`/`NULL`/`CURRENT_*`) should be three separate lookups against the identifier slot.
- the only genuinely context-sensitive pieces are: `$` (positional vs dollar-quote), `*` (wildcard vs multiply), `[` (identifier vs array subscript), `''` (empty string vs escape). track minimal state or delegate to a post-pass.

nothing about this language requires backtracking beyond one character of lookahead.
