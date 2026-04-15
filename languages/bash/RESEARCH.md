# bash lexical research

target: a bash 5.2+ syntax highlighter (the current stable grammar, including the
`@K`, `@k`, `@A`, `@a` parameter transformations added in 5.1/5.2 and the
deprecated-but-still-accepted `$[...]` arithmetic form). the highlighter should
tokenize every bash-specific extension on top of posix sh: `[[ ]]`, `(( ))`,
`$'...'` ansi-c quoting, `$"..."` locale translation, `<( )` / `>( )` process
substitution, `{a,b}` and `{1..10}` brace expansion, `<<<` here-strings,
indexed and associative arrays, coprocesses, `|&`, `;&` and `;;&` case
fall-through, bash-only reserved words (`coproc`, `time`, `select`, `function`,
`[[`, `]]`), extended globs (`?(…)` `*(…)` `+(…)` `@(…)` `!(…)`), and the
`${var@U|u|L|Q|E|P|A|a|K|k}` transformations.

posix sh is a proper subset; a bash grammar covers it. when a script declares
`#!/bin/sh` on many systems (dash, busybox sh) bash extensions are not valid,
but a highlighter has no reliable way to distinguish and should color them
anyway — highlighting liberally is strictly better than silently treating a
real token as a word.

## sources consulted

primary (official):
- https://www.gnu.org/software/bash/manual/html_node/Definitions.html — blank, word, name, metacharacter, control operator, operator (the exact char sets)
- https://www.gnu.org/software/bash/manual/html_node/Reserved-Words.html — full reserved word list
- https://www.gnu.org/software/bash/manual/html_node/Quoting.html — four quoting forms overview
- https://www.gnu.org/software/bash/manual/html_node/Escape-Character.html — backslash rules
- https://www.gnu.org/software/bash/manual/html_node/Single-Quotes.html — `'...'`
- https://www.gnu.org/software/bash/manual/html_node/Double-Quotes.html — `"..."` (backslash has special meaning only before `$` `` ` `` `"` `\` newline)
- https://www.gnu.org/software/bash/manual/html_node/ANSI_002dC-Quoting.html — `$'...'` escape table
- https://www.gnu.org/software/bash/manual/html_node/Locale-Translation.html — `$"..."`
- https://www.gnu.org/software/bash/manual/html_node/Comments.html — `#` word-start rule
- https://www.gnu.org/software/bash/manual/html_node/Shell-Expansions.html — expansion order
- https://www.gnu.org/software/bash/manual/html_node/Brace-Expansion.html — `{a,b}`, `{1..10}`, `{1..10..2}`
- https://www.gnu.org/software/bash/manual/html_node/Tilde-Expansion.html — `~`, `~user`, `~+`, `~-`, `~N`
- https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html — every `${...}` operator
- https://www.gnu.org/software/bash/manual/html_node/Command-Substitution.html — `$(...)` and `` `...` ``
- https://www.gnu.org/software/bash/manual/html_node/Arithmetic-Expansion.html — `$(( ))`
- https://www.gnu.org/software/bash/manual/html_node/Process-Substitution.html — `<( )` `>( )`
- https://www.gnu.org/software/bash/manual/html_node/Redirections.html — every redirection operator
- https://www.gnu.org/software/bash/manual/html_node/Shell-Arithmetic.html — arithmetic operator table with precedence
- https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html — if, case, `[[ ]]`, `(( ))`, select, for
- https://www.gnu.org/software/bash/manual/html_node/Bash-Conditional-Expressions.html — `-e`, `-f`, `-eq`, etc.
- https://www.gnu.org/software/bash/manual/html_node/Arrays.html — indexed and associative
- https://www.gnu.org/software/bash/manual/html_node/Special-Parameters.html — `$@`, `$*`, `$#`, `$?`, `$-`, `$$`, `$!`, `$0`, `$_`
- https://www.gnu.org/software/bash/manual/html_node/Compound-Commands.html — looping and grouping
- https://www.gnu.org/software/bash/manual/html_node/Shell-Functions.html — two definition forms
- https://www.gnu.org/software/bash/manual/html_node/Coprocesses.html — `coproc`
- https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html — posix.1-2017 shell command language (for superset/subset alignment)

cross-reference (existing highlighters):
- https://github.com/tree-sitter/tree-sitter-bash — grammar.js + src/scanner.c (external c scanner handles heredocs, concat, extglob, regex rhs). the most lexically accurate reference
- https://github.com/PrismJS/prism/blob/master/components/prism-bash.js — prism grammar, pragmatic regex
- https://github.com/highlightjs/highlight.js/blob/main/src/languages/bash.js — highlight.js grammar (lumps bash/zsh/gnu-coreutils into one)
- https://github.com/pygments/pygments/blob/master/pygments/lexers/shell.py — `BashLexer` state machine
- https://github.com/microsoft/vscode/blob/main/extensions/shellscript/syntaxes/shell-unix-bash.tmLanguage.json — textmate grammar used by vscode's built-in shell support

gaps and calls:
- posix 2.3 "token recognition" rule 5 ("if the current character is not quoted and can be used as the first character of a new operator, the current token (if any) shall be delimited...") is a parser-flavored rule. a character-scanning highlighter just emits operators when it sees them in a command-word context and relies on the fact that an operator character at word-start-ish position is overwhelmingly an operator.
- `in` and `do` are contextually reserved only as the third word of certain
  compound commands (`case … in`, `select … in`, `for … in`, `for … do`).
  a highlighter can color them as keywords any time they appear as a bare
  word, since the cases where they're identifiers and coincidentally the
  third word of `case`/`select`/`for` don't arise in practice; when they
  appear quoted or as a prefix (`in_progress`, `do_thing`), standard
  identifier rules apply. this matches what every existing highlighter does.
- `!` is a reserved word only at word-start (as pipeline negation) and only
  when history expansion is off or when quoted. in interactive bash with
  history expansion on, `!foo` expands a history entry; non-interactive bash
  treats `!` as literal unless it is at pipeline-start. highlighters should
  emit `!` as keyword/operator at word-start and literal elsewhere.
- `time` is a reserved word but only valid as a pipeline prefix. treating it
  as a keyword anywhere it appears as a bare word is fine — there is no
  competing identifier meaning in practice.
- bash's arithmetic `$[expr]` form is deprecated and not in the current
  manual but still accepted by the parser. highlighters should emit it as
  arithmetic for legacy scripts (plenty of ansible playbooks and init
  scripts in the wild still use it).
- bash's history expansion (`!`, `!!`, `!$`, `!*`, `!-n`, `!str`, `^old^new`)
  is only active in interactive shells with `histexpand` enabled, and it
  runs before any other parsing. for a highlighter that colors script files
  (the normal use case), we should NOT emit history-expansion tokens — the
  script will never see them. document this choice in the grammar file.
- extended glob patterns (`?(…)` `*(…)` `+(…)` `@(…)` `!(…)`) are only
  lexically meaningful when `shopt -s extglob` is active. since that's a
  runtime flag, a highlighter has no way to know if they're live. emit them
  when they appear in pattern-context (after `case` pattern `|`, inside `[[
  == ]]` right side, as file args to a command); otherwise treat the `?` /
  `*` / `+` / `@` / `!` as separate tokens.
- bash 5.3 introduces `${ command; }` / `${c command; }` ("valueless
  command substitution"). accept the syntax but don't worry about the
  `c` variant — a highlighter can treat `${ cmd; }` like `$( cmd )` for
  coloring purposes.
- utf-8 identifiers: bash identifiers are ascii-only per spec (`name` =
  `[A-Za-z_][A-Za-z0-9_]*`). non-ascii bytes in a command-word position are
  passed through as literal filename characters; the tokenizer treats them
  as word content, not as identifier starts.

spec-wins policy: when prism / highlight.js / pygments / tree-sitter / vscode
disagree with the bash manual, the manual wins. documented conflicts:

- highlight.js misparses `$'...'`: it tokenizes the `$` as variable sigil
  and the following `'...'` as a plain apostrophe string, losing the ansi-c
  escape semantics. follow the manual — `$'...'` is a distinct literal with
  its own escape processing.
- prism and highlight.js don't distinguish `$"..."` locale-translated
  strings from plain `"..."`. the manual marks them as a distinct form;
  tree-sitter and pygments recognize them. emit a distinct token (or at
  least a modifier) so themes can highlight translatable strings.
- prism, highlight.js, and pygments don't distinguish `[[ ]]` from the
  `test`/`[` builtin. tree-sitter and vscode do. the manual treats `[[` and
  `]]` as reserved words with their own operator grammar (including `=~`
  regex match and glob-pattern `==`/`!=`); `[` is just a command. follow
  the manual — `[[ ]]` gets its own mode.
- prism, highlight.js, and pygments do not distinguish `;;` vs `;&` vs
  `;;&`. tree-sitter does. the manual names them as distinct control
  operators, and users care visually (fall-through is rare and worth
  flagging). emit distinct tokens.
- prism's keyword list omits `time`, `coproc`, `[[`, `]]`. follow the
  manual — all are reserved words.
- highlight.js and pygments lump `true`/`false` together with builtins.
  the manual says they're the `true` and `false` builtin utilities (exit 0
  / exit 1 respectively), not keywords or constants. treat them as builtins
  for accuracy; themes that want constant-language coloring can alias.
- pygments tokenizes `$"..."` the same as `"..."` via `\$?"..."`. that's a
  simplification; keep them separate for our emit, but the two look nearly
  identical in most themes so this is cosmetic.
- prism's comment lookbehind `(^|[^"{\\$])#.*` is a heuristic for "# is only
  a comment if not preceded by certain chars". the manual's rule is
  "word-begin": `#` starts a comment only at the start of a word (beginning
  of line, after unquoted whitespace, or after an operator). follow the
  manual. this matters for cases like `echo foo#bar` (not a comment — `#`
  is mid-word) vs `echo foo #bar` (comment starts at `#`).
- none of the surveyed highlighters correctly track heredoc body content
  across nested command substitutions (e.g. a `$(cat <<EOF … EOF)` inside a
  larger `"…"` string). a faithful implementation needs a heredoc queue
  keyed on delimiter word, processed on the next newline. this is complex
  but is the only way to get real-world bash right.
- prism colors external command names from a large hardcoded list
  (`grep`, `awk`, `sed`, …). the manual does not distinguish these
  lexically — they are just words. we should NOT do this; any word in
  command position is a command. a highlighter may post-process to promote
  `function` / `alias` targets to a function-name token, but it should not
  maintain a list of "common unix utilities".

---

## 1. primary sources

bash reads input byte-by-byte (with utf-8 passed through in string contexts).
the lexer produces these token kinds (mapping to the bash source code's
`WORD` / operator categories):

- `WORD` — any sequence of characters treated as a unit: identifiers,
  command names, filenames, plain arguments, unquoted values. produced by
  the state machine after concatenating any mix of unquoted chars, single
  quotes, double quotes, ansi-c quotes, `$var`, `${…}`, `$(…)`, `$((…))`,
  `` `…` ``, `<(…)`, `>(…)`, brace expansions, tildes, and backslash
  escapes. bash does not split a "word" into sub-tokens at the parser
  level; the highlighter does.
- `NAME` — a lexical subset of `WORD` matching `[A-Za-z_][A-Za-z0-9_]*`,
  used for variable names, function names, parameter names in expansions.
- `NUMBER` — sequences of digits, used as file descriptor prefixes and
  inside `(( ))` / `[[ ]]` arithmetic. the lexer does not emit a distinct
  token; numbers are recognized in the surrounding context. highlighters
  emit `number` when an integer appears in arithmetic or as an fd prefix.
- `ASSIGNMENT_WORD` — a word of the form `name=value`, `name+=value`, or
  `name[subscript]=value` / `name[subscript]+=value` at command-word-start
  position. the `name` and `=` / `+=` parts get distinct tokens.
- reserved words — see section 2.3
- operators — see section 2.4 and 2.7
- comment — `#` to end of line, only at word-start
- newline — a token (statement terminator, like `;`)

for highlighting, the categories we emit are:

- `comment` — `#` to eol, plus the shebang variant
- `string` — single-quoted, plain double-quoted, plain
- `string.ansi-c` — `$'...'`
- `string.translated` — `$"..."`
- `string.heredoc` — heredoc body, expanding or literal
- `string.herestring` — the `<<<` right-hand side if the argument is
  an unquoted word (often treated as `string` in practice)
- `string.escape` — backslash escape inside double-quoted and ansi-c
  contexts (`\$`, `\"`, `\\`, `` \` ``, `\<newline>`, `\n`, `\t`, `\xHH`,
  `\uHHHH`, `\UHHHHHHHH`, `\nnn`, `\cx`, etc.)
- `string.escape.invalid` — a backslash escape inside ansi-c that isn't a
  recognized sequence
- `number` — any integer literal (decimal, octal `0…`, hex `0x…`, custom
  base `base#n`) in arithmetic or redirection-fd context
- `keyword` — the reserved words (see 2.3)
- `keyword.control` — flow-control subset
- `constant.language` — none in bash per spec (`true`/`false` are
  builtins, not constants); themes may optionally alias builtins
- `builtin` — bash shell builtins (`echo`, `cd`, `read`, `printf`, `let`,
  `declare`, `typeset`, `local`, `export`, `readonly`, `set`, `unset`,
  `shift`, `test`, `alias`, `unalias`, `bind`, `builtin`, `caller`,
  `command`, `continue`, `break`, `return`, `eval`, `exec`, `exit`,
  `getopts`, `hash`, `help`, `history`, `jobs`, `kill`, `pwd`, `mapfile`,
  `readarray`, `shopt`, `source`, `.` aka source, `times`, `trap`, `type`,
  `ulimit`, `umask`, `wait`, `enable`, `true`, `false`, `:` null command).
  list is closed — see bash manual section 4 "shell builtin commands".
- `operator` — arithmetic operators, conditional operators, assignment
  operators, pipeline `|`, `|&`, `&&`, `||`, `!`, process substitution,
  test file ops (`-e`, `-f`, …), `-eq` / `-ne` / `-lt` / …
- `operator.redirect` — `<`, `>`, `>>`, `<<`, `<<-`, `<<<`, `<&`, `>&`,
  `<>`, `>|`, `&>`, `&>>`, `N<`, `N>`, `N>>`, `N<&M`, `N>&M`, `N<&-`,
  `N>&-`, `N<>`
- `operator.expansion` — `$` (bare sigil), `${`, `$(`, `$((`, `)`, `}`,
  `))`, `<(`, `>(`, `` ` ``
- `operator.expansion.param` — inside `${}`: `:-`, `:=`, `:?`, `:+`, `-`,
  `=`, `?`, `+`, `#`, `##`, `%`, `%%`, `/`, `//`, `/#`, `/%`, `^`, `^^`,
  `,`, `,,`, `!`, `@U`, `@u`, `@L`, `@Q`, `@E`, `@P`, `@A`, `@a`, `@K`,
  `@k`
- `variable` — `$name`, `$1`..`$9`, `$0`
- `variable.special` — `$*`, `$@`, `$#`, `$?`, `$-`, `$$`, `$!`, `$_`
- `punctuation` — `(`, `)`, `{`, `}`, `[[`, `]]`, `(( `, ` ))`, `;`, `;;`,
  `;&`, `;;&`, `,` (brace expansion), `..` (sequence expression), `:`
  (inside parameter expansion, conditional ternary, path sep in scripts
  themselves is just a char)
- `glob.pattern` — `*`, `?`, `[...]`, extglob `?(…)` `*(…)` `+(…)`
  `@(…)` `!(…)`. typically colored only inside pattern contexts; elsewhere
  they are word content.
- `regex` — the rhs of `=~` inside `[[ ]]` is parsed as posix-ere (with
  bash-specific word-splitting rules on whitespace unless quoted). emit
  as a distinct token so themes can style it.
- `identifier` — fallback for bare words that aren't any of the above

---

## 2. token inventory

### 2.1 literals

bash does not have "literal" tokens in the python sense — numbers appear
only inside arithmetic or as fd prefixes, and strings are the quoted forms
below. command-word position produces `WORD` tokens regardless of content.

### 2.2 string forms

**single-quoted string** `'...'`
- opens: `'`
- closes: first unescaped `'` (no way to include `'` inside)
- content: literal bytes. no expansions, no escapes. backslash is literal.
- multi-line: yes. newlines preserved.

**double-quoted string** `"..."`
- opens: `"`
- closes: first unescaped `"`
- content: literal bytes with these chars active:
  - `$` — starts an expansion (`$var`, `${…}`, `$(…)`, `$((…))`, `$'…'`
    nested, `$"…"` nested)
  - `` ` `` — starts legacy command substitution
  - `\` — escape: active ONLY before `$`, `` ` ``, `"`, `\`, or newline.
    before any other char, backslash is literal.
  - `!` — history expansion, only in interactive bash with `histexpand`
    on; non-interactive: literal
- escapes (recognized only for the 5 chars above):
  - `\$` — literal `$`
  - `` \` `` — literal backtick
  - `\"` — literal double-quote
  - `\\` — literal backslash
  - `\<newline>` — line continuation (both chars consumed)
- multi-line: yes. newlines preserved unless `\<newline>` consumed.
- note: unlike single-quotes, double-quotes may contain `'`.

**ansi-c quoted string** `$'...'`
- opens: `$'` (literal two-char sequence)
- closes: first unescaped `'`
- content: literal with backslash escape processing
- complete escape table (per manual, ANSI_002dC-Quoting.html):

  | escape | meaning |
  | --- | --- |
  | `\a` | alert (bell, 0x07) |
  | `\b` | backspace (0x08) |
  | `\e`, `\E` | escape character (0x1b) |
  | `\f` | form feed (0x0c) |
  | `\n` | newline (0x0a) |
  | `\r` | carriage return (0x0d) |
  | `\t` | horizontal tab (0x09) |
  | `\v` | vertical tab (0x0b) |
  | `\\` | backslash |
  | `\'` | single quote |
  | `\"` | double quote |
  | `\?` | question mark |
  | `\nnn` | octal value (1 to 3 octal digits) |
  | `\xHH` | hex value (1 to 2 hex digits) |
  | `\uHHHH` | unicode (1 to 4 hex digits) |
  | `\UHHHHHHHH` | unicode (1 to 8 hex digits) |
  | `\cx` | control-x character |

- after processing: "the expanded result is single-quoted, as if the
  dollar sign had not been present" — no further expansion.
- invalid escape: `\z`, `\g`, etc. bash leaves them literal (backslash +
  char); we emit `string.escape.invalid` for them.

**locale-translated string** `$"..."`
- opens: `$"` (literal two-char sequence)
- closes: first unescaped `"`
- content: same escape rules as plain `"..."`, PLUS translation at runtime
  via `gettext`. lexically identical to a plain double-quote; the only
  distinction is the `$` prefix.
- `shopt -s noexpand_translation` changes runtime behavior (output as
  single-quoted) but has no lexical effect.

**backslash-escaped character** (outside quotes)
- `\<char>` — the character is taken literally (loses special meaning
  except newline, which does line-continuation)
- `\<newline>` — line continuation: both chars removed from input

### 2.3 reserved words

complete list (per Reserved-Words.html):

```
!  [[  ]]  {  }
case  coproc  do  done  elif  else  esac  fi  for  function
if  in  select  then  time  until  while
```

contextual recognition:
- `in` — reserved only as the 3rd word of `case`, `select`, `for`.
  ambiguity between `for x in` and `for ((…))` is resolved by the `((`.
- `do` — reserved only as the 3rd word of `for` (and by analogy all loop
  heads: `while`, `until`, `select`). practical highlighter rule: if
  `in` / `do` appears as a bare unquoted word, color it as keyword.
- `!` — reserved only at pipeline-start, for negation. elsewhere inside
  `[[ ]]` it's the logical-not operator. inside `$( )` as a bare word it
  could be either. in double-quoted strings with histexpand on, it does
  history expansion; else literal.
- `[[` and `]]` — reserved words (not operators) at word-start. inside
  the `[[ ]]` body, operators use their own sub-grammar.
- `{` and `}` — reserved words only when surrounded by blanks/newlines and
  used as a command group. `${…}` / `{a,b}` / `{1..10}` are NOT reserved.
  `foo{bar` is not a command group, it's brace expansion (and probably
  malformed).

grouped by purpose:

- conditional: `if`, `then`, `elif`, `else`, `fi`, `[[`, `]]`
- loop: `for`, `in`, `while`, `until`, `do`, `done`, `select`
- case: `case`, `esac`, `in`
- function: `function`
- grouping: `{`, `}`
- async/coproc: `coproc`
- timing: `time`
- logical: `!`

### 2.4 operators

from Definitions.html: "a metacharacter is a `space`, `tab`, `newline`, or
one of `|`, `&`, `;`, `(`, `)`, `<`, `>`."

**control operators** (exact list from manual):
- newline
- `||` — logical or / pipe-or chain
- `&&` — logical and
- `&` — background / async
- `;` — statement separator
- `;;` — case clause end
- `;&` — case fall-through, no re-match
- `;;&` — case fall-through, re-match next patterns
- `|` — pipe
- `|&` — pipe stderr+stdout (equivalent to `2>&1 |`, bash 4+)
- `(` — subshell open (also function-def parens)
- `)` — subshell close

**redirection operators** (from Redirections.html):
- `<`, `>`, `>>`, `<>`
- `<<`, `<<-`, `<<<` — heredoc, tab-stripping heredoc, herestring
- `<&`, `>&` — duplicate fd
- `<&-`, `>&-` — close fd (via `-` as target)
- `<&N-`, `>&N-` — move fd
- `>|` — clobber (override noclobber)
- `&>`, `&>>` — combined stdout+stderr

redirections may be prefixed with a single digit fd (`2>`, `2>&1`, `10<`
requires brace form `{fd}<`). there is no whitespace between the fd
digit and the operator. since bash 4.1, `{varname}<file` opens the file
and assigns the allocated fd to `varname`.

**pipeline / command**:
- `!` (at pipeline start, negation)
- `time` (at pipeline start, timing)
- `time -p` (posix-format output)

**arithmetic operators** (inside `$(( ))`, `(( ))`, `[[ …  ]]` arithmetic
comparisons, `let`, array subscripts, `${arr[expr]}`):

precedence table (per Shell-Arithmetic.html), highest to lowest:

1. `id++`, `id--` — postfix inc/dec
2. `++id`, `--id` — prefix inc/dec
3. `+`, `-` (unary), `!`, `~`
4. `**` — exponentiation
5. `*`, `/`, `%`
6. `+`, `-` (binary)
7. `<<`, `>>`
8. `<=`, `>=`, `<`, `>`
9. `==`, `!=`
10. `&`
11. `^`
12. `|`
13. `&&`
14. `||`
15. `? :` — ternary
16. `=`, `*=`, `/=`, `%=`, `+=`, `-=`, `<<=`, `>>=`, `&=`, `^=`, `|=`
17. `,` — comma

integer forms inside arithmetic:
- decimal: `0`, `1`, `42`, `1_000` (no underscore support — unlike
  python; highlighter should treat `1_000` as an identifier followed by
  nothing sensible, but in practice bash users write `1000`)
- leading-zero octal: `0`, `0755`, `077`
- hex: `0x1f`, `0X1F`
- arbitrary base: `N#digits` where N is 2 through 64 (e.g. `16#ff`,
  `2#1010`, `64#Az`). digits for base > 10 are `0-9`, `a-z`, `A-Z`, `@`, `_`.
- names: an identifier evaluates to its integer value (0 if unset/empty).
  `${var}` also works.

**conditional operators** inside `[[ ]]` (per Conditional-Constructs.html
and Bash-Conditional-Expressions.html):

file-test unary:
- `-a` (deprecated alias for `-e`)
- `-b`, `-c` (block / character special)
- `-d` (directory)
- `-e` (exists)
- `-f` (regular file)
- `-g`, `-u` (setgid, setuid)
- `-h`, `-L` (symlink, both forms)
- `-k` (sticky)
- `-N` (modified since last read)
- `-O`, `-G` (owned by euid, egid)
- `-p` (named pipe / fifo)
- `-r`, `-w`, `-x` (readable, writable, executable)
- `-s` (non-empty)
- `-S` (socket)
- `-t` (fd is a terminal)

variable/shell-option unary:
- `-o optname` (shopt/set option enabled)
- `-v varname` (var set, including indexed arrays / subscripts)
- `-R varname` (var set AND is a nameref)

binary file comparisons:
- `file1 -ef file2` (same device+inode)
- `file1 -nt file2` (newer than)
- `file1 -ot file2` (older than)

string:
- `-z string`, `-n string`
- `string1 == string2`, `string1 = string2` (both are pattern match;
  `==` preferred)
- `string1 != string2`
- `string1 < string2`, `string1 > string2` (locale-aware sort)
- `string1 =~ ere-pattern` (posix-ere regex match; rhs is parsed as a
  regex with whitespace significant unless quoted)

arithmetic (inside `[[ ]]` — distinct from `(( ))`):
- `arg1 -eq arg2`, `-ne`, `-lt`, `-le`, `-gt`, `-ge`

logical (inside `[[ ]]`):
- `!` (not), `&&` (and), `||` (or)
- `( … )` (grouping)

**assignment operators**:
- `=` (plain assign, only at command-word-start position)
- `+=` (append; indexed array append with `arr+=(…)`)

### 2.5 identifiers and names

- `name` regex: `[A-Za-z_][A-Za-z0-9_]*`
- function names may contain any char except metacharacters and reserved-
  word characters in practice (bash is lax: `foo-bar`, `foo.bar`, `foo:bar`
  are all valid function names). for highlighting, `function name` and
  `name ()` accept an extended charset.
- array subscripts: any arithmetic expression for indexed arrays, or any
  non-empty string for associative arrays (including spaces if quoted)

### 2.6 punctuation and delimiters

- `(`, `)` — subshell group, function-def parens, arithmetic grouping
  inside `(( ))`, array initializer `( … )`, process substitution inner
- `(( `, ` ))` — arithmetic command (no `$`), arithmetic for-loop head
- `{`, `}` — command group, also brace expansion open/close, also
  `${…}` parameter expansion delimiters (distinct tokens in different
  contexts)
- `[[ `, ` ]]` — conditional command
- `[`, `]` — the `test` / `[` builtin and its close, also array subscript
  brackets, also glob character class
- `;` — statement separator
- `,` — argument separator inside brace expansion and inside arithmetic
- `..` — sequence range inside brace expansion
- `:` — null command (the `:` builtin), also inside `${…}` as conditional
  operator prefix (`${v:-x}`, `${v:?}`, etc.), also inside `PATH`-style
  colon-separated values (not lexically special — just a char)
- newline — statement separator (equivalent to `;` in most contexts)
- `=` — assignment operator, also conditional `==` / `!=` operator
- `#` — word-start comment; inside `${…}` length operator and shortest-
  prefix-remove operator; inside `printf -v` format strings (not lexical)
- backslash `\` — escape/continuation

### 2.7 special syntax

**comments**
- `#` at the start of a word (line-begin, after unquoted blank, or after
  an operator) starts a comment through end of line.
- `#!` on line 1 is a shebang (highlighted as comment but recognized
  specially).
- `#` in-word (like `foo#bar`) is a literal `#`.
- `#` inside single or double quotes is a literal `#`.
- `#` inside `$((…))` is NOT a comment (it's a special char, see below).

**shebang**
- only on line 1. `#!/bin/bash`, `#!/usr/bin/env bash`, etc. lexically
  identical to a comment, but themes often color it distinctly.

**brace expansion** (Brace-Expansion.html)
- list form: `{a,b,c}` — generates words `a`, `b`, `c`
- sequence form: `{start..end}` — generates integers or single chars
- sequence with increment: `{start..end..incr}`
- preamble + brace + postscript: `pre{a,b}post`
- zero-padding: `{01..10}` preserves the 2-digit form
- nesting: `{a,{b,c}}`
- rules to NOT trigger expansion:
  - `${…}` does not start a brace expansion (the `${` sequence suppresses
    until the matching `}`)
  - `\{` disables
  - an unpaired `{` or `}`, or missing `,` / `..`, leaves the sequence
    literal
  - inside single-quoted, double-quoted, and ansi-c strings: literal

**tilde expansion** (Tilde-Expansion.html)
- `~` at word-start → `$HOME`
- `~user` → user's home
- `~+` → `$PWD`
- `~-` → `$OLDPWD`
- `~N` / `~+N` / `~-N` → dirs stack entries
- the tilde-prefix ends at the first unquoted `/`
- also triggers after `:` or after the first `=` in an assignment-word
  context (so `PATH=~/bin:~/local/bin` expands both tildes)

**parameter expansion** (Shell-Parameter-Expansion.html)
- basic: `$name`, `$1`, `$N`, `${name}`, `${N}`, `$0`
- specials: `$*`, `$@`, `$#`, `$?`, `$-`, `$$`, `$!`, `$_`
- indirect: `${!name}` (the value of the variable named by `$name`)
- length: `${#name}`, `${#@}`, `${#*}`
- substring: `${name:offset}`, `${name:offset:length}`
  - offset and length are arithmetic expressions; may be negative.
    negative offset MUST be written `${name: -1}` (space required) since
    `:-` is a different operator.
- default / alternate:
  - `${name:-word}` — word if unset or null
  - `${name-word}` — word if unset only
  - `${name:=word}` — assign if unset or null; never works on positional
    or special parameters
  - `${name=word}` — assign if unset only
  - `${name:?word}` — error if unset or null
  - `${name?word}` — error if unset only
  - `${name:+word}` — word if set and non-null
  - `${name+word}` — word if set only
- prefix/suffix remove:
  - `${name#pattern}` — shortest match from start
  - `${name##pattern}` — longest match from start
  - `${name%pattern}` — shortest match from end
  - `${name%%pattern}` — longest match from end
- substitution:
  - `${name/pattern/string}` — first match
  - `${name//pattern/string}` — all matches
  - `${name/#pattern/string}` — anchor match at start
  - `${name/%pattern/string}` — anchor match at end
  - the final `/string` is optional (`${name/pattern}` deletes)
- case change:
  - `${name^pattern}` — uppercase first matching char
  - `${name^^pattern}` — uppercase all matching chars
  - `${name,pattern}` — lowercase first
  - `${name,,pattern}` — lowercase all
- variable-set listing:
  - `${!prefix*}`, `${!prefix@}` — names starting with prefix
  - `${!arr[*]}`, `${!arr[@]}` — keys of array
- transformation (bash 4.4+):
  - `${name@U}` — uppercase (like `tr a-z A-Z`)
  - `${name@u}` — uppercase first char
  - `${name@L}` — lowercase
  - `${name@Q}` — quoted for reuse
  - `${name@E}` — expand backslash escapes (like `printf %b`)
  - `${name@P}` — expand as if a prompt string (runs `$PS1` rules)
  - `${name@A}` — emit assignment command with attributes
  - `${name@a}` — emit attribute flag string
  - `${name@K}` — quoted key-value pairs (bash 5.1+)
  - `${name@k}` — unquoted keys and values as separate words (bash 5.1+)

all operators above work with array subscripts too: `${arr[3]:-default}`,
`${arr[@]##prefix}`, `${arr[@]/pat/new}`, etc.

**command substitution** (Command-Substitution.html)
- `$(command)` — preferred form. parens balance.
- `` `command` `` — legacy form. backslash inside retains literal meaning
  EXCEPT before `$`, `` ` ``, or `\`.
- `$(< file)` — fast form for reading a file (equivalent to
  `$(cat file)`).
- `${ command; }` — valueless substitution (bash 5.3+). runs in current
  shell, captures stdout. the space after `${` is required.
- inside double quotes: result is not word-split or glob-expanded.

**arithmetic expansion** (Arithmetic-Expansion.html)
- `$((expression))` — preferred.
- `$[expression]` — deprecated legacy form. still accepted.
- inside `$(( ))`, the chars `$`, `` ` ``, `\` retain their meaning.
  `"` and `'` are NOT special — they just quote word-split boundaries at
  the outer word level, not within arithmetic.

**arithmetic command** (Conditional-Constructs.html)
- `(( expression ))` — runs as a standalone command. exit status 0 if
  result is nonzero.
- also appears as the head of C-style for: `for (( init; cond; step ))`

**process substitution** (Process-Substitution.html)
- `<(list)` — list is run with its stdout connected to a fifo/named pipe;
  expansion produces a filename
- `>(list)` — list's stdin is connected
- "no space may appear between the `<` or `>` and the left parenthesis"
- nests normally

**heredoc** (Redirections.html)
- `[n]<<delimiter` — body runs until a line containing only `delimiter`
- `[n]<<-delimiter` — leading tabs (not spaces) are stripped from each
  body line AND from the closing delimiter line
- `[n]<<<word` — here-string (one-line, adds trailing newline)
- if any char of the opening `delimiter` is quoted (`<<'EOF'`, `<<"EOF"`,
  `<<\EOF`), the body is treated as literal — no `$var`, no `$(…)`, no
  `` `…` ``, no `\<char>` escapes. this is the most common way to embed
  sql/python/etc. without interpolation.
- if the delimiter is unquoted, the body has parameter, command, and
  arithmetic expansion, and `\<char>` escapes (for the active chars:
  `$`, `` ` ``, `\`, and newline — unchanged from double-quote rules).
- the `delimiter` is read as a word (may contain `"`, `'`, `\` as
  quoting metachar) but most scripts use a bare word like `EOF`.
- heredocs may be queued: `cat <<A <<B` on one line, followed by both
  bodies in order on subsequent lines. each heredoc body starts on the
  next line AFTER the line containing the `<<`.
- multiple redirections on the same command: `cat <<A <<B` queues two
  heredocs. they fire in order after the current logical line ends.

**herestring** — `[n]<<< word`
- word is subjected to tilde, parameter, command, arithmetic expansion
  and quote removal but NOT word splitting or pathname expansion
- lexically, `<<<` is a redirection operator; the rhs is a normal word

**glob patterns** (pathname expansion)
- `*` — any sequence of chars
- `?` — any single char
- `[chars]` — any of the enclosed chars; `[!chars]` or `[^chars]` negated;
  ranges `[a-z]`; posix classes `[[:alpha:]]`, `[[:digit:]]`, etc.
- extended (with `shopt -s extglob`):
  - `?(pattern)` — 0 or 1 occurrence
  - `*(pattern)` — 0 or more
  - `+(pattern)` — 1 or more
  - `@(pattern)` — exactly one
  - `!(pattern)` — anything except
- `**` with `shopt -s globstar` — recursive subdirectory match
- inside `case` patterns and `[[ == ]]` right sides, glob patterns apply
  regardless of `extglob` (at least conceptually — in practice bash still
  gates extglob).

**arrays** (Arrays.html)
- declare indexed: `declare -a arr`, or implicit `arr[i]=v` / `arr=(…)`
- declare associative: `declare -A arr` (required — no implicit form)
- init: `arr=(a b c)` or `arr=([0]=a [1]=b)` or `arr=([k1]=v1 [k2]=v2)`
- access: `${arr[i]}`, `${arr[@]}` (all elts, each one word),
  `${arr[*]}` (all elts, single word joined by `$IFS[0]`)
- length: `${#arr[@]}`, `${#arr[i]}`
- keys: `${!arr[@]}`, `${!arr[*]}`
- slice: `${arr[@]:offset:length}`
- negative indices (indexed): `arr[-1]` is last, supported in bash 4.3+
- append: `arr+=(d e f)`, `arr[i]+=string`
- unset: `unset 'arr[i]'`, `unset arr`

**function definitions** (Shell-Functions.html)
two equivalent forms:
```
name () compound-command [ redirections ]
function name [()] compound-command [ redirections ]
```
- body is any compound command: `{ … }`, `( … )`, `(( … ))`, `[[ … ]]`,
  `if`/`for`/`while`/`case`/`select`, etc.
- function name accepts a broader char set than regular identifiers —
  hyphens, dots, and colons are common (`foo-bar` `foo.bar`) especially
  in portability helpers.
- when using `{ … }`: must be blanks/newline separating the `{` and `}`
  from the body, and the body must end with `;`, `&`, or newline before
  the `}`.

**coprocesses** (Coprocesses.html)
- `coproc [NAME] simple-command [redirections]`
- `coproc [NAME] compound-command`
- `coproc { command; }` (name defaults to `COPROC`)
- creates `NAME[0]` (read end) and `NAME[1]` (write end), plus
  `NAME_PID`.

### 2.8 history expansion (active in interactive shells only)

- `!` — history expansion introducer
- `!!` — last command
- `!N` / `!-N` — command N / N commands back
- `!str` — most recent command starting with `str`
- `!?str[?]` — most recent containing `str`
- `^old^new^` — quick substitution on previous command
- `!$`, `!*`, `!:N`, `!:N-M`, `!:^`, `!:$`, `!:*`, `!:N*` — word designators
- `:p`, `:s/old/new/`, `:g&`, `:h`, `:t`, `:r`, `:e`, `:q`, `:x` — modifiers

all of this runs BEFORE any other parsing, so in non-interactive script
files none of these tokens ever exist. the highlighter for scripts should
NOT emit history-expansion tokens; it's only relevant for a live-repl
frontend, which is out of scope. document this choice so users asking
"why isn't `!!` highlighted?" can find the answer.

---

## 3. edge case inventory

### 3.1 `#` ambiguity
- `foo #comment` — `#` starts comment (preceded by unquoted blank)
- `foo#bar` — `#` is literal mid-word
- `foo;#comment` — `#` starts comment (after control operator)
- `$#` — special parameter "argc"
- `${#name}` — length of `name`
- `${name#pat}` — shortest prefix remove
- `${name##pat}` — longest prefix remove
- `"foo #bar"` — literal `#` (inside double quotes)
- `<<-#EOF` — `#EOF` is the heredoc delimiter, not a comment
- `case x in #pat) …` — `#` in pattern context is NOT a comment (it's
  inside a command, but the shell's comment-at-word-start rule still
  applies — bash actually accepts this as a pattern `#pat`; tree-sitter
  and vscode both treat `case` patterns as word-context with `#` being a
  literal pattern char)

### 3.2 `=` ambiguity
- `VAR=value` at word-start → assignment
- `VAR = value` with spaces → command `VAR` with args `=` and `value`
- `echo foo=bar` — `=` is part of the word (not an assignment)
- `[[ x = y ]]` — equality op inside conditional
- `(( x = y ))` — assignment op inside arithmetic
- `let x=5` — the `let` argument gets arithmetic-parsed
- `local var=value` — builtin prefix + assignment
- `export VAR=value` — builtin prefix + assignment
- `declare -A m=([k]=v)` — associative-array init inside declare

### 3.3 `(` ambiguity
- `(cmd)` — subshell
- `cmd()` — function def (with `{…}` body after)
- `func ()  { … }` — function def with space before parens
- `(( x+1 ))` — arithmetic command
- `$((…))` — arithmetic expansion
- `$(…)` — command substitution
- `<(…)` / `>(…)` — process substitution (no space between `<`/`>` and `(`)
- `arr=(a b c)` — array init (RHS of assignment starts with `(`)
- `case x in pat1 | pat2) … ;;` — optional `(` before pattern:
  `case x in (pat1 | pat2) … ;;`
- `?(…)`, `*(…)`, `+(…)`, `@(…)`, `!(…)` — extglob patterns

### 3.4 `)` ambiguity
- subshell close
- function-def parens close
- arithmetic close `))`
- process-sub close
- parameter-expansion (rare, doesn't use parens)
- case pattern terminator: `pattern)`
- arithmetic group close inside `[[ ]]`: `[[ (x = y) ]]`

### 3.5 `[` `]` ambiguity
- `[ … ]` — the `test` / `[` builtin (a command, takes arguments)
- `[[ … ]]` — conditional command (keyword, special grammar)
- `arr[i]` — array subscript (only after an identifier with no space)
- `${arr[i]}` — array subscript in parameter expansion
- `[abc]` — glob character class (inside a word)
- `[[:alpha:]]` — posix character class inside a glob char class

### 3.6 `$` ambiguity
- `$name`, `$1`, `$0` — simple variable
- `$#`, `$*`, `$@`, `$?`, `$-`, `$$`, `$!`, `$_` — special
- `${…}` — parameter expansion
- `$(…)` — command substitution
- `$((…))` — arithmetic expansion
- `$[…]` — legacy arithmetic
- `$'...'` — ansi-c string
- `$"..."` — locale-translated string
- `$ ` — literal dollar sign (followed by space or eof)
- `\$` inside `"…"` — literal `$`

### 3.7 `<` `>` ambiguity
- `cmd < file`, `cmd > file` — redirection
- `cmd <<EOF` — heredoc
- `cmd <<<word` — herestring
- `cmd << -EOF` — NOT a heredoc with dash (`<<-` must be a single token)
- `cmd <file >file` — two redirections on one command
- `[[ a < b ]]` — string lexicographic compare
- `(( a < b ))` — arithmetic less-than
- `<(cmd)`, `>(cmd)` — process substitution
- `2>&1`, `2>/dev/null`, `&>file` — fd-prefixed redirection
- `{fd}<file` — fd-alloc redirection (bash 4.1+)
- `<&3` — dup from fd 3
- `<&3-` — move fd 3

### 3.8 `!` ambiguity
- `!` at pipeline-start — negate (keyword)
- `! expr` inside `[[ ]]` — logical not operator
- `${!var}` — indirect expansion
- `${!arr[@]}` — array keys
- `${!prefix*}` — variable-name listing
- `<< !DELIM` — unquoted delimiter starting with `!` (unusual but legal)
- `!pattern` inside `[abc]` char class — negation (posix form is `[!abc]`,
  bash also accepts `[^abc]`)
- `!(…)` — extglob "not"
- `!!`, `!$`, `!foo` — history expansion (interactive only)
- inside `"…"` with history enabled — history expansion (must be
  backslash-escaped)

### 3.9 heredoc edge cases
- `cat <<EOF` with body — expansions active
- `cat <<"EOF"` or `cat <<'EOF'` or `cat <<\EOF` — literal body
- `cat <<-EOF` — strips leading TABS only (not spaces) from body lines
  AND from the closing `EOF` line
- `cat <<EOF | tee file` — pipe after heredoc: the pipeline continues
  on the same logical line; the heredoc body still starts on the next
  line
- multiple heredocs on one command:
  ```
  cat <<A <<B
  body-a
  A
  body-b
  B
  ```
- heredoc inside `$(…)`: needs the scanner to track the enclosing level.
  heredoc delimiter is looked for starting on the line after the `<<…`
  regardless of nesting depth.
- heredoc body may contain the delimiter string as long as it's not on
  a line by itself (after optional tab stripping).
- heredoc delimiter token is itself word-parsed: `<<$FOO` uses the value
  of `$FOO` (at parse time? actually at read time) as the delimiter.
  most highlighters just treat the delimiter as the literal word after
  `<<`.

### 3.10 `;` ambiguity
- `cmd;` — statement separator
- `cmd;;` inside `case` — clause end
- `cmd;&` inside `case` — fall-through
- `cmd;;&` inside `case` — fall-through-and-test
- `;` outside case is just a statement sep; `;;` outside case is a syntax
  error; `;&` and `;;&` are parse errors outside case.
- in a function body terminator: `f() { cmd; }` — the `;` is required
  before `}` because `}` is a reserved word (word-boundary required).

### 3.11 quoting edge cases
- `\<newline>` inside `"…"` — line continuation (both chars removed)
- `\<newline>` inside `'…'` — literal backslash + literal newline
- `\<newline>` inside `$'…'` — literal backslash + literal newline (the
  ansi-c escapes are `\n` not `\<literal newline>`)
- `'` inside `"…"` — literal
- `"` inside `'…'` — literal
- `"` inside `$'…'` — literal (no need to escape)
- `\"` outside quotes — literal `"`
- `\'` outside quotes — literal `'`
- `'\''` — empty single-quote + escaped single-quote + empty single-quote:
  a common idiom to embed `'` inside a single-quoted context

### 3.12 case-pattern edge cases
- `case x in a) … ;; esac` — simple pattern
- `case x in (a) … ;; esac` — optional leading `(` for symmetry
- `case x in a|b|c) … ;; esac` — pattern alternation with `|`
- `case x in *.txt) … ;; esac` — glob in pattern
- `case x in [a-z]*) … ;; esac` — char class + glob
- `case x in esac) … ;; esac` — the first `esac` is a pattern (reserved
  word allowed as pattern), second is the close
- `case x in in) … ;; esac` — same as above; `in` as a pattern works
- bash is lenient: a pattern may be an arbitrary word, including
  metacharacters if quoted

### 3.13 `[[ ]]` edge cases
- `[[ $a = pat* ]]` — glob pattern match; unquoted rhs is a pattern
- `[[ $a = "pat*" ]]` — literal match; quoted rhs is a literal
- `[[ $a =~ ^[0-9]+$ ]]` — regex; spaces inside the regex are
  significant, so `[[ $a =~ ^ [0-9]+ $ ]]` parses but matches differently
- `[[ $a =~ "x y" ]]` — quoted rhs regex; quoting strips regex semantics
  for the quoted part, so this matches a literal `x y`
- `[[ $a < $b ]]` — string sort compare (NOT arithmetic)
- `[[ ! -z $x && -f $y ]]` — unary, binary, logical combined
- `[[ ( -f a || -f b ) && -r c ]]` — grouping with parens inside
- file-test operators (`-f`, `-e`, etc.) only make sense in `[[ ]]` or
  `[ ]`; they're not operators in `(( ))`

### 3.14 `(( ))` / arithmetic edge cases
- `(( i++ ))` — returns 0 if i was nonzero, 1 if i was zero (exit status
  is inverse of arithmetic value)
- `(( i = j + 1 ))` — assignment inside arithmetic
- `$var` inside `(( ))` — optional; `(( $x + 1 ))` and `(( x + 1 ))`
  both work
- `(( 0x1f + 010 + 2#1010 ))` — mixed bases
- `$((…))` vs `$[...]` — both work, `$[…]` deprecated
- `(( arr[i+1] = 42 ))` — subscript arithmetic

### 3.15 numeric / fd prefixes on redirections
- `2>&1` — tight: no whitespace between digit and operator
- `10>file` — multi-digit fd on lhs is allowed (bash ≥ 2.05 or so)
- `{varname}<file` — fd allocation (bash ≥ 4.1); creates variable
- `echo 2>file` — the `2` is just an arg (must be adjacent to `>` to be
  an fd prefix)

### 3.16 `in` as identifier vs keyword
- `for i in 1 2 3; do …` — `in` is keyword (3rd word of for)
- `local in=foo` — `in` is a variable name (assignment context)
- `declare in=foo` — same
- `$in` — variable expansion
- `${in}` — variable expansion
- `function in { … }` — `in` as function name (legal; function-name
  position accepts reserved words)
- defensive rule: if `in` appears as a bare unquoted word, emit
  keyword. the edge cases above are rare.

### 3.17 unicode
- bash identifier charset is ascii-only per spec
- utf-8 bytes in command-word position are passed through literally
- utf-8 inside `"…"` and `'…'` is transparent
- `\uHHHH` / `\UHHHHHHHH` inside `$'…'` produces unicode output per
  locale
- `LC_ALL=C.UTF-8` is the usual locale; bash's comparison operators in
  `[[ ]]` use locale for sort order

### 3.18 `|&` and `&>` and `&>>`
- `cmd1 |& cmd2` — pipe both stdout and stderr (bash 4+). equivalent to
  `cmd1 2>&1 | cmd2`.
- `&>file` — redirect both stdout and stderr to file (bash-specific)
- `&>>file` — append both to file (bash-specific)
- `>&file` — also works as "redirect both" in some contexts but the
  `&>` / `&>>` forms are preferred; `>&word` is primarily "duplicate
  fd" semantics

### 3.19 pattern vs regex vs glob context
three distinct pattern syntaxes:
- **glob** (pathname expansion, case patterns, `[[ = ]]`, parameter
  `#%/` operators): `*`, `?`, `[abc]`, extglob
- **posix-ere regex** (`[[ =~ ]]`): full POSIX extended regex
- **brace expansion** (`{a,b}`, `{1..10}`): not a pattern, just
  literal character expansion

the highlighter emits `glob.pattern` tokens inside the first, `regex`
tokens inside the second, and `punctuation` tokens for brace expansion.

### 3.20 case-sensitivity
- bash is case-sensitive everywhere: keywords, variable names, function
  names, glob patterns (unless `nocaseglob` / `nocasematch` shopt set)

### 3.21 whitespace significance
- inter-token: space and tab are word separators
- intra-token inside quotes: literal
- `\<newline>` outside quotes: line continuation
- newline unquoted: statement separator
- `[[ $a == b ]]` — the spaces around `==` are required (it's an
  operator in a command position; `[[ $a==b ]]` would parse `$a==b` as
  one word)
- `${var: -1}` — the space after `:` is required to disambiguate from
  `${var:-...}`
- `(( i++ ))` — spaces around `((` and `))` are required (else bash
  would try to parse `((i++))` as something else in contexts where
  `((` starts an arithmetic group inside `[[ ]]`)
- heredoc delimiter line must match exactly (no leading/trailing
  whitespace except with `<<-` tab-stripping)

---

## 4. nesting and context constructs

### single-quoted string
- opens: `'`
- closes: first `'` (no escape possible)
- nests: nothing (literal)
- escapes: none

### double-quoted string
- opens: `"`
- closes: first unescaped `"`
- nests: `$var`, `${…}`, `$(…)`, `$((…))`, `` `…` ``, `$'…'`, `$"…"`
- escapes: `\$`, `` \` ``, `\"`, `\\`, `\<newline>` (line continuation).
  all other backslash sequences are literal `\` + char.
- history: `!` triggers expansion if interactive + histexpand (out of
  scope for script highlighter)

### ansi-c string
- opens: `$'`
- closes: first unescaped `'`
- nests: nothing (no further expansion after escape processing)
- escapes: `\a`, `\b`, `\e`, `\E`, `\f`, `\n`, `\r`, `\t`, `\v`, `\\`,
  `\'`, `\"`, `\?`, `\nnn` (octal), `\xHH`, `\uHHHH`, `\UHHHHHHHH`,
  `\cx`

### locale-translated string
- opens: `$"`
- closes: first unescaped `"`
- nests: same as double-quoted string
- escapes: same as double-quoted string

### command substitution `$(…)`
- opens: `$(`
- closes: matching `)` (parens balance; arbitrary nesting of subshells
  and substitutions inside)
- nests: full bash syntax — any command, pipeline, compound command,
  heredoc, further substitutions, strings, arithmetic. recursive.
- escapes: none directly; the inner chars are parsed as new shell input

### command substitution (backtick) `` `…` ``
- opens: `` ` ``
- closes: first unescaped `` ` ``
- nests: full bash syntax BUT backslash escaping is degraded:
  `` `foo \`bar\` baz` `` requires escaping inner backticks.
  backslash retains literal meaning except before `$`, `` ` ``, or `\`.
- use `$(…)` in modern bash; backticks are legacy.

### arithmetic expansion `$((…))`
- opens: `$((`
- closes: first `))` at matching depth
- nests: arithmetic operators, variable names (both `$var` and `var`),
  integers (`0x…`, `0…`, `N#…`), `$(…)` command substitution, strings
  (rarely — strings are unusual inside arithmetic but legal; they
  evaluate to 0)
- escapes: `\$`, `` \` ``, `\\` retain literal meaning. quotes `"` and
  `'` can appear but are not special to arithmetic itself.

### arithmetic command `((…))`
- opens: `((`
- closes: matching `))`
- nests: same as `$((…))`
- distinct from `$((…))` only in that it's a command, not a word:
  `(( i = 1 ))` is a statement; `$(( i = 1 ))` is an expansion.

### parameter expansion `${…}`
- opens: `${`
- closes: matching `}`
- nests: `$(…)`, `$((…))`, `${…}` (another parameter expansion in
  the rhs of substitution ops), strings (`"…"`, `'…'`, `$'…'`) in the
  rhs of `:-`, `:=`, `:?`, `:+`, `/pat/str`, etc.
- escapes: inside the rhs word, double-quote rules apply — `\$`, `\\`,
  `` \` ``, `\<newline>`, `\"` (in quoted rhs)

### process substitution `<(…)` / `>(…)`
- opens: `<(` or `>(`
- closes: matching `)`
- nests: full bash syntax (same as `$(…)` contents)
- escapes: none directly

### heredoc body (unquoted delimiter)
- opens: the newline after the line containing `<<DELIM`
- closes: a line containing exactly `DELIM` (with optional leading tabs
  stripped if `<<-DELIM`)
- nests: `$var`, `${…}`, `$(…)`, `$((…))`, `` `…` ``
- escapes: `\$`, `` \` ``, `\\`, `\<newline>` (line continuation, per
  double-quote rules)

### heredoc body (quoted delimiter)
- opens: newline after the line containing `<<'DELIM'` /
  `<<"DELIM"` / `<<\DELIM`
- closes: line containing exactly the literal delimiter
- nests: nothing
- escapes: none (completely literal)

### here-string `<<<word`
- not a nesting context — `word` is parsed as a normal word (expansions
  apply: tilde, parameter, command, arithmetic, quote removal). not a
  multiline construct.

### `[[ ]]` conditional body
- opens: `[[` (with blank before and after)
- closes: `]]` (with blank before)
- nests: words (which may contain `$var`, `${…}`, etc.), quoted strings,
  grouping `( … )` (with blanks), rhs of `=~` is a regex (different
  pattern language), rhs of `==`/`!=` is a glob pattern
- escapes: none directly; inside the body words follow normal word rules

### `[[ =~ ]]` regex rhs
- sub-context of `[[ ]]` starting after `=~` and ending at the word
  boundary (first unquoted whitespace) or at the `]]`
- syntax: posix-extended regex
- quoting: quoted parts become literal (they lose regex metachar status)
- escapes: regex escapes (`\(`, `\)`, `\d` not supported — this is
  ERE, not pcre), NOT shell escapes
- nests: nothing (it's a leaf token)

### case pattern
- opens: after `in` (first pattern) or after `;;` / `;&` / `;;&` (next
  pattern), optional `(` before the pattern
- closes: `)` (pattern terminator)
- nests: `$var`, `${…}` (expansions produce literal chars; resulting
  string is treated as a glob pattern), `|` separates alternate patterns
- extglob patterns valid: `?(…)` `*(…)` `+(…)` `@(…)` `!(…)`
- glob metachars: `*`, `?`, `[…]`, `[^…]`, `[[:class:]]`

### subshell `(…)`
- opens: `(` (word-start, with blank before)
- closes: matching `)` (with blank after for most contexts)
- nests: full bash syntax
- escapes: none directly

### command group `{…;}`
- opens: `{` (word-start, with blank after)
- closes: `}` (word-start, preceded by `;`, `&`, or newline)
- nests: full bash syntax
- escapes: none directly

### brace expansion `{a,b,c}` or `{1..10}`
- opens: `{` with no immediate `$` before (i.e. not `${`), at word-start
  or mid-word
- closes: matching `}`
- nests: recursive brace expansions (`{a,{b,c}}`)
- rules: must contain at least one unquoted `,` or valid `..` sequence
  to be recognized; otherwise `{` and `}` are literal
- escapes: `\{`, `\}`, `\,` disable

### function body
- any compound command (`{…}`, `(…)`, `((…))`, `[[…]]`, `if`, `for`,
  `while`, `until`, `case`, `select`)
- the body nesting is whatever the compound command's nesting rules are

---

## 5. manual trace

### sample 1 — heredoc with mixed quoting and command substitution

input:
```bash
log_error() {
    local msg="$1"
    cat <<EOF >&2
$(date +%Y-%m-%d) ERROR: ${msg//\"/\'}
  host: $HOSTNAME
  pid:  $$
EOF
    return 1
}
```

trace (by char, with context transitions):

```
l o g _ e r r o r      — word "log_error" (function name)
(                       — punctuation (function-def parens open)
)                       — punctuation (close)
<space>                 — blank
{                       — keyword (command-group open)
<newline>               — statement sep

<spaces>                — blank (indentation)
l o c a l               — builtin "local"
<space>                 — blank
m s g                   — name "msg" (part of assignment-word)
=                       — operator (assign)
"                       — enter double-quoted string
$                       — operator.expansion (sigil)
1                       — variable.special "$1" (emitted as one token)
"                       — exit double-quoted string
<newline>

<spaces>
c a t                   — word "cat" (command)
<space>
<                       — start of redirection... actually:
<<                      — operator.redirect (heredoc intro)
E O F                   — word (heredoc delimiter; memorized for later)
<space>
>                       — operator.redirect
& 2                     — fd-2 (the `&2` is the target; emitted as
                          fd reference)
<newline>               — statement sep, AND triggers queued heredoc
                          body read
                          ↓ ENTER heredoc body (expanding, delimiter EOF)

$ ( d a t e             — inside heredoc body:
                          `$(` opens command substitution
                          ↓ ENTER command subst
                          `date` is a word (command)
  <space> + % Y - % m - % d
                          — word "+%Y-%m-%d" (argument)
)                       — close command subst
                          ↑ EXIT command subst (back in heredoc body)
<space>                 — literal (inside heredoc)
E R R O R : <space>     — literal
$ {                     — enter parameter expansion
                          ↓ ENTER param expansion
m s g                   — name
/ /                     — operator.expansion.param (replace all)
\                       — start of escape inside param rhs
"                       — \" → literal `"` (string.escape)
/                       — separator between pattern and replacement
\                       — start of escape
'                       — \' → literal `'` (string.escape)
}                       — close param expansion
                          ↑ EXIT param expansion
<newline>               — literal newline (inside heredoc)
<spaces>                — literal (inside heredoc)
h o s t : <space>       — literal
$ H O S T N A M E       — variable "$HOSTNAME"
<newline>
<spaces>
p i d : <spaces>        — literal
$ $                     — variable.special "$$"
<newline>
E O F                   — close of heredoc (line matches delimiter exactly)
                          ↑ EXIT heredoc body
<newline>

<spaces>
r e t u r n             — builtin "return"
<space>
1                       — word "1" (argument)
<newline>

}                       — keyword (command-group close)
```

key observations:
1. the heredoc delimiter `EOF` is captured at `<<EOF` time and must be
   remembered across the rest of the current logical line AND the
   heredoc body.
2. `>&2` on the same line as `<<EOF` queues the redirection without
   affecting the heredoc queue.
3. inside the heredoc body, `$(date +%Y-%m-%d)` recursively enters a
   command-substitution context where full shell syntax applies
   (including more heredocs if we wanted).
4. `${msg//\"/\'}` uses pattern-substitution with `//` (replace all).
   the `\"` is a string.escape (literal `"` in the pattern), and
   `\'` is a string.escape (literal `'` in the replacement). without
   the escape the first `"` would terminate nothing here since we're
   not inside a double-quote, but the replacement is still useful.

### sample 2 — `[[ ]]` with regex, arrays, and extglob

input:
```bash
declare -A paths=(
    ["src"]="/usr/local/src"
    ["bin"]="/usr/local/bin"
)

for key in "${!paths[@]}"; do
    dir="${paths[$key]}"
    if [[ -d "$dir" && "$dir" =~ ^/usr/local/[a-z]+$ ]]; then
        shopt -s extglob
        rm -f "$dir"/!(*.bak|*.log)
    fi
done
```

trace (condensed — transitions only):

```
declare                 — builtin
-A                      — word "-A" (argument)
paths                   — name
=                       — operator (assign)
(                       — punctuation (array-init open)
                          ↓ ENTER array initializer

[                       — punctuation (subscript open)
"src"                   — double-quoted string
]                       — punctuation (subscript close)
=                       — operator (subscript-specific assign)
"/usr/local/src"        — double-quoted string

[...] similarly for "bin"...

)                       — punctuation (array-init close)
                          ↑ EXIT array initializer

for                     — keyword
key                     — name
in                      — keyword (3rd word of for)
"                       — enter double-quoted string
$ {                     — open parameter expansion inside string
                          ↓ ENTER param expansion
!                       — operator.expansion.param (indirect / keys)
paths                   — name
[ @ ]                   — operator.expansion.param (array keys via @)
}                       — close param expansion
                          ↑ EXIT param expansion
"                       — close double-quoted string
;                       — operator (statement sep)
do                      — keyword
<newline>

dir                     — name
=                       — operator (assign)
"                       — enter double-quoted string
$ {                     — open param expansion
paths                   — name
[ $ key ]               — subscript: `$key` is nested variable
}                       — close param expansion
"                       — close string
<newline>

if                      — keyword
[[                      — keyword (conditional-open)
                          ↓ ENTER [[ ]] context
-d                      — operator (file-test unary)
"$dir"                  — double-quoted string containing `$dir`
&&                      — operator (logical and)
"$dir"                  — double-quoted string
=~                      — operator (regex match)
                          ↓ ENTER regex rhs
^/usr/local/[a-z]+$     — regex (posix-ere). tokenized as a whole unit
                          (single regex token). unquoted, so the
                          whitespace ending at `]]` terminates.
                          ↑ EXIT regex rhs
]]                      — keyword (conditional-close)
                          ↑ EXIT [[ ]] context
;                       — operator
then                    — keyword

shopt                   — builtin
-s                      — word
extglob                 — word

rm                      — word (command)
-f                      — word
"$dir"                  — double-quoted string
/                       — literal (mid-word; between quoted and glob)
                          note: `"$dir"/!(*.bak|*.log)` is ONE word,
                          with double-quote + literal + extglob parts
                          concatenated. concat is implicit.
!(                      — glob.pattern (extglob "not"): this enters
                          a glob sub-pattern
                          ↓ ENTER extglob pattern
*.bak                   — literal pattern + glob `*`
|                       — glob alternation (inside extglob)
*.log                   — literal + glob
)                       — glob close
                          ↑ EXIT extglob pattern

fi                      — keyword
<newline>
done                    — keyword
```

key observations:
1. `"${!paths[@]}"` nests: double-quote string → `${…}` → `!` indirect
   operator → array-keys `[@]`. three tokens at least:
   `"`, `${`, `!`, `paths`, `[`, `@`, `]`, `}`, `"`. all emitted as
   separate tokens with the quote context preserved across.
2. `[[ =~ regex ]]`: the regex rhs is tokenized as a single unit
   (`regex` token), not as shell operators. the regex parser takes
   over from the first non-blank after `=~` until the next unquoted
   `]]` or whitespace-delimited boundary.
3. the extglob `!(*.bak|*.log)` is an atomic sub-pattern. inside it,
   `|` is glob-alternation, not pipe.
4. `"$dir"/!(*.bak|*.log)` concatenates a quoted string, a literal
   `/`, and an extglob pattern into a single word. this is bash's
   implicit concat — no operator required.

### sample 3 — arithmetic-heavy, coprocess, process substitution

input:
```bash
#!/usr/bin/env bash
set -euo pipefail

declare -i count=0
for ((i=0; i < 0x100; i+=2)); do
    (( count++ ))
done

coproc SORTER { sort -n; }
exec {log_fd}>log.txt

diff <(sort file1.txt) <(sort file2.txt) |& tee /dev/stderr >&${log_fd}

printf '%s\n' "Count: $count / 0x${count:+0x$(printf '%X' "$count")}"
```

trace (condensed):

```
#!/usr/bin/env bash     — shebang (comment, line-1 variant)

set                     — builtin
-euo                    — word (combined single-letter options)
pipefail                — word

declare                 — builtin
-i                      — word (integer attribute)
count                   — name
=                       — operator (assign)
0                       — word "0"

for                     — keyword
((                      — operator (arithmetic-for open)
                          ↓ ENTER arithmetic context
i                       — name (variable, bare)
=                       — operator (assign within arithmetic)
0                       — number
;                       — operator (sep within arithmetic for)
i                       — name
<                       — operator (arithmetic less-than)
0x100                   — number (hex)
;                       — operator
i                       — name
+=                      — operator (compound assign)
2                       — number
))                      — operator (arithmetic-for close)
                          ↑ EXIT arithmetic context
;                       — operator
do                      — keyword

((                      — operator (arithmetic command open)
                          ↓ ENTER arithmetic
count                   — name
++                      — operator (postfix inc)
))                      — close
                          ↑ EXIT arithmetic

done                    — keyword

coproc                  — keyword
SORTER                  — word (coproc name)
{                       — keyword (group open)
sort                    — word (command)
-n                      — word
;                       — operator
}                       — keyword (group close)

exec                    — builtin
{log_fd}                — redirection fd-alloc: the `{log_fd}` syntax
                          allocates an fd and assigns to `log_fd`.
                          emitted as several tokens:
                          `{` punctuation, `log_fd` name, `}` punctuation
>                       — operator.redirect
log.txt                 — word

diff                    — word (command)
<(                      — operator (process-subst open)
                          ↓ ENTER process subst
sort file1.txt          — command + arg
)                       — close
                          ↑ EXIT process subst
<(                      — open another process subst
sort file2.txt
)
|&                      — operator (pipe both)
tee /dev/stderr         — command + arg
>&                      — operator.redirect (dup)
${log_fd}               — parameter expansion (the fd number is read
                          from `log_fd`): `${` + `log_fd` + `}`

printf                  — builtin
'%s\n'                  — single-quoted string
"Count: $count / 0x${count:+0x$(printf '%X' "$count")}"
                          — double-quoted string containing:
                          literal "Count: "
                          $count — variable
                          literal " / 0x"
                          ${                — enter param expansion
                            count            — name
                            :+               — operator.expansion.param
                                              (alt-if-set)
                            0x               — literal (in rhs word)
                            $(               — enter command subst
                                              (inside param-rhs,
                                              inside double quote)
                              printf        — builtin
                              '%X'          — single-quoted string
                              "$count"      — double-quoted containing
                                              `$count` variable
                            )               — close command subst
                          }                  — close param expansion
                          literal ""
```

key observations:
1. arithmetic for `for ((i=0; i<0x100; i+=2))` uses `((` as the
   arithmetic-for-open token (NOT the arithmetic-command `(( ))` —
   they share tokens but parser-context differs). inside, `;` is a
   within-arithmetic separator, not a statement sep.
2. `coproc SORTER { … }` — the `{` and `}` here are command-group
   reserved words; `SORTER` is an identifier that becomes an array
   variable at runtime. lexically, it's just a `name` token.
3. `exec {log_fd}>log.txt` — the `{log_fd}` syntax is distinct from
   brace expansion and from `${log_fd}`. it's the fd-allocation form
   introduced in bash 4.1. no `$` prefix, and the parser looks for
   it only in redirection context.
4. `>&${log_fd}` — `>&` is a dup-fd operator whose rhs is a word that
   expands to a number. the `${log_fd}` is a parameter expansion in
   redirection-target position.
5. `${count:+0x$(printf '%X' "$count")}` — four levels of nesting:
   double-quote → parameter expansion → literal + command substitution
   → single-quoted string + double-quoted string → variable expansion.
   the tokenizer must handle all four simultaneously via a state stack.

these three samples cover: heredocs + nested expansions, `[[ ]]` with
regex and arrays and extglob, and deep nesting through process
substitution, coproc, fd allocation, and arithmetic. the grammar-author
should hand-trace these (or equivalent) against the state machine
before claiming the grammar is done.
