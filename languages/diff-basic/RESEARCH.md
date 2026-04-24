# diff-basic lexical research

target: a minimal diff overlay grammar that highlights only the unambiguous
line-level diff markers: `+`/`-`/`!` prefixes and `@@` hunk headers. this
grammar is designed to compose with other language grammars (e.g., highlighting
a javascript file that has diff markers) without introducing conflicts or
ambiguities.

the full diff grammar lives at `languages/diff/RESEARCH.md` and covers
standalone `.diff`/`.patch` files with all git metadata, context diff, normal
diff, etc. this grammar intentionally omits all of that.

## design rationale: why two grammars

diff tokenization has a conflict problem when used alongside other languages.
the full diff format uses tokens that are valid syntax in many programming
languages:

- `---` and `+++` are valid operators or expressions in many languages
  (decrement/increment, markdown headings, yaml document markers)
- `diff` is a common identifier name
- `index` is a keyword or identifier in many languages
- `***` is a valid expression (pointer dereference in c, exponentiation in
  python, bold in markdown)
- lines starting with `<` or `>` conflict with html tags, generics, shell
  redirects, and comparison operators

when diff output is shown alongside or embedded within another language
(code review UIs, documentation, literate programming), these conflicts
make a full diff grammar unusable as an overlay.

the only diff markers that are truly unambiguous in practice:

1. `+` at column 0 followed by non-`+` (or end of line). a line starting
   with a single `+` then content is extremely rare in real source code
   outside of diff context.
2. `-` at column 0 followed by non-`-` (same reasoning).
3. `!` at column 0 followed by a space (context diff changed line). rare
   as a line start in most languages.
4. `@@` at column 0 (hunk header). `@@` is essentially never valid as a
   line-start token in programming languages (objective-c `@` attributes
   never double up at column 0; java annotations start with single `@`).
5. `\ ` at column 0 (no newline marker). backslash-space at line start is
   not valid syntax in any common language.

by restricting to just these markers, the grammar can safely overlay any
language without false positives.

## sources consulted

same sources as the full diff grammar (see `languages/diff/RESEARCH.md`).
the design of this grammar is not driven by spec completeness but by
conflict analysis against common programming languages.

additional conflict analysis references:

- javascript/typescript: `+` and `-` are unary operators but always appear
  mid-expression, not at column 0 as a statement start
- python: `+` and `-` same as above; `---` is not valid syntax
- c/c++: `+`/`-` as above; `---` would be `-- -` (decrement then negate)
  which is theoretically valid but never appears in practice at column 0
- html/xml: `<` at column 0 is common (opening tags), which is why `<`
  (normal diff deleted marker) is excluded from this grammar
- yaml: `---` is a document separator at column 0, a genuine conflict,
  but this grammar does not match `---` so no issue
- markdown: `---` is a horizontal rule, `+++` is sometimes used in hugo
  front matter, again not matched by this grammar

## 1. token inventory

this grammar has exactly five token categories.

### inserted line

- prefix: `+` at column 0, followed by any character except `+`, or
  followed by end of line (a bare `+` on its own line)
- the `+` prefix character is the marker token
- everything after `+` to end of line is the content token
- does NOT match `+++` (which is a file header in full diff, and a valid
  operator/marker in other languages)

### deleted line

- prefix: `-` at column 0, followed by any character except `-`, or
  followed by end of line (a bare `-` on its own line)
- the `-` prefix character is the marker token
- everything after `-` to end of line is the content token
- does NOT match `---` (file header in full diff, yaml document separator,
  markdown horizontal rule)

### changed line (context diff)

- prefix: `!` at column 0, followed by a space
- the `!` is the marker token
- everything after `! ` to end of line is the content token
- the space requirement avoids conflicts with languages that use `!` at
  line start (e.g., shell history expansion `!command`, rust macros
  `macro_name!()`)

### hunk header

- `@@` at column 0, the entire line through to end of line
- the opening `@@` is the label token
- the range information (`-N,N +N,N`) contains number tokens
- the closing `@@` is the label token
- everything after the closing `@@` is a comment token (function context)
- also matches `@@@` (combined diff) for the same structure

### no newline marker

- `\ ` (backslash space) at column 0
- the entire line is a comment token
- matches `\ No newline at end of file` and localized variants

### what is deliberately excluded

| excluded construct                | reason                                              |
| --------------------------------- | --------------------------------------------------- |
| `---` / `+++` file headers        | conflicts with yaml, markdown, operators            |
| `diff --git` header               | `diff` is a common identifier                       |
| `index`, `similarity index`, etc. | `index` is a keyword in many languages              |
| `***` context file header         | conflicts with pointer deref, exponentiation, bold  |
| `< ` / `> ` normal diff markers   | conflicts with html tags, shell redirects, generics |
| `Binary files ... differ`         | too many common words                               |
| `#` comment lines                 | conflicts with comments in shell, python, etc.      |
| context lines (space prefix)      | a space at column 0 is universal in indented code   |

## 2. complete token type mapping

| token name        | what it covers                                                   |
| ----------------- | ---------------------------------------------------------------- |
| `inserted`        | added line content (after the `+` prefix)                        |
| `inserted.marker` | the `+` prefix character itself                                  |
| `deleted`         | removed line content (after the `-` prefix)                      |
| `deleted.marker`  | the `-` prefix character itself                                  |
| `changed`         | changed line content in context format (after `! `)              |
| `changed.marker`  | the `! ` prefix                                                  |
| `label`           | `@@` / `@@@` hunk header delimiters                              |
| `number`          | line numbers and ranges within hunk headers                      |
| `comment`         | function context after closing `@@`, no-newline marker           |
| `punctuation`     | `,` range separator in hunk headers, `+`/`-` signs before ranges |

this is 10 token types vs 17 in the full diff grammar. the semantic types
(`inserted`, `deleted`, `changed`) are shared between both grammars so themes
only need one set of color definitions.

## 3. edge case inventory

### false positive: `+` or `-` at column 0 in real code

this is the main risk. cases where source code legitimately starts a line
with `+` or `-`:

- **continuation expressions**: `var x = a\n+ b` in javascript. this does
  happen, but the preceding line usually ends with an operator or open paren,
  so the `+`/`-` is column 0. however, most style guides and formatters
  indent continuation lines, so the `+`/`-` would be at column 2+, not
  column 0. in practice this is rare enough to accept.
- **unary operators**: `+x` or `-x` as a standalone statement at column 0.
  extremely rare. `-1` as a literal might appear but would typically be
  part of a larger expression.
- **preprocessor directives in diff**: if the underlying language has `#`
  directives, those are fine since we do not match `#`.

the false positive rate for `+`/`-` at column 0 in properly formatted code
is very low. when this grammar is used as an overlay, the consuming tool
likely knows it is displaying diff content, so the markers are expected.

### `++` and `--` at column 0

a line like `++i;` in c/c++ starts with `++` at column 0. the grammar must
NOT match this as an inserted line. the rule is: match `+` at column 0
only when the next character is not `+`. similarly for `-` at column 0
only when the next character is not `-`.

edge case: `+ +i;` (inserted line whose content is ` +i;`) starts with
`+` then space, which is correctly matched as an inserted line. the `++`
exclusion only applies to immediately adjacent `+` characters.

### bare `+` or `-` line

a line containing only `+` and nothing else is a valid diff line meaning
"an empty line was added." the grammar should match this. similarly `-`
alone means "an empty line was deleted."

### `@@` inside strings or comments

when used as an overlay, `@@` at column 0 inside a multiline string or
block comment in the underlying language would be a false positive. this
is an acceptable tradeoff because:

1. `@@` at column 0 inside a string/comment is extremely rare
2. the overlay grammar has no way to know about the underlying language's
   string/comment state
3. the visual result (hunk header highlighting) is a minor cosmetic issue

### combined diff `@@@`

combined diff uses `@@@` for 2-parent merges, `@@@@` for 3-parent, etc.
the grammar should match 2+ `@` at column 0 as hunk header start, not
just exactly 2.

### the `\ No newline` marker after different line types

the `\ ` line can appear after `+`, `-`, or context lines. since context
lines (space prefix) are not matched by this grammar, the `\ ` marker
should still be matched regardless of what preceded it. no special
handling needed; it is just another line-start pattern.

## 4. nesting and context constructs

this grammar is essentially stateless. every line is classified
independently based on its first character(s) at column 0. there are no
push/pop transitions, no nested contexts, no state that carries between
lines.

the one exception is the hunk header, which has internal structure (the
`@@` delimiters, ranges, and trailing comment). this can be handled either
as a single-line context that is entered and exited within the same line,
or as a sequence of match rules within the main state.

```
hunk header (single line)
  opens: `@@` at column 0
  closes: end of line
  contains: opening `@@`/`@@@`, range info with numbers and punctuation,
            closing `@@`/`@@@`, optional function context text
  nests: nothing (single line, no recursion)
```

all other tokens are single-character prefix checks at column 0 followed
by consuming to end of line. no nesting, no state.

this statelessness is the key advantage for overlay use: the grammar
cannot get "stuck" in a state that conflicts with the underlying language
grammar's state machine. each line is an independent classification.

## 5. manual traces

### trace 1: typical unified diff hunk (as seen in code review)

```
@@ -10,7 +10,8 @@ function process(input) {
   const result = [];
-  for (let i = 0; i < input.length; i++) {
-    result.push(input[i] * 2);
+  for (const item of input) {
+    result.push(item * 2);
+    console.log(item);
   }
   return result;
```

| line                            | col 0       | match?                          | token                                                                                                                                                              | notes                 |
| ------------------------------- | ----------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| `@@ -10,7 +10,8 @@ function...` | `@`         | yes                             | `label` `@@`, `number` `10`, `punctuation` `,`, `number` `7`, `number` `10`, `punctuation` `,`, `number` `8`, `label` `@@`, `comment` ` function process(input) {` | hunk header           |
| `   const result = [];`         | ` ` (space) | no                              | (not matched, pass through to underlying grammar)                                                                                                                  | context line, ignored |
| `-  for (let i = 0; ...`        | `-`         | yes, next char is ` ` (not `-`) | `deleted.marker` `-`, `deleted` rest of line                                                                                                                       | deleted line          |
| `-    result.push(input[i]...`  | `-`         | yes                             | `deleted.marker` `-`, `deleted` rest                                                                                                                               | deleted line          |
| `+  for (const item of ...`     | `+`         | yes, next char is ` ` (not `+`) | `inserted.marker` `+`, `inserted` rest                                                                                                                             | inserted line         |
| `+    result.push(item...`      | `+`         | yes                             | `inserted.marker` `+`, `inserted` rest                                                                                                                             | inserted line         |
| `+    console.log(item);`       | `+`         | yes                             | `inserted.marker` `+`, `inserted` rest                                                                                                                             | inserted line         |
| `   }`                          | ` `         | no                              | (pass through)                                                                                                                                                     | context line          |
| `   return result;`             | ` `         | no                              | (pass through)                                                                                                                                                     | context line          |

### trace 2: edge cases with `++`, `--`, and bare markers

```
@@ -1,6 +1,6 @@
 int main() {
-    int x = 0;
-    x--;
+    int x = 1;
+    x++;
+
-
 }
```

| line              | col 0 | match?                   | token                         | notes                                                                     |
| ----------------- | ----- | ------------------------ | ----------------------------- | ------------------------------------------------------------------------- |
| `@@ -1,6 +1,6 @@` | `@`   | yes                      | hunk header tokens            | hunk header                                                               |
| ` int main() {`   | ` `   | no                       | pass through                  | context                                                                   |
| `-    int x = 0;` | `-`   | yes, next is ` `         | `deleted.marker`, `deleted`   | deleted line                                                              |
| `-    x--;`       | `-`   | yes, next is ` `         | `deleted.marker`, `deleted`   | deleted line (content contains `--` but that is fine, only col 0 matters) |
| `+    int x = 1;` | `+`   | yes, next is ` `         | `inserted.marker`, `inserted` | inserted line                                                             |
| `+    x++;`       | `+`   | yes, next is ` `         | `inserted.marker`, `inserted` | inserted line (content contains `++`, fine)                               |
| `+`               | `+`   | yes, next is end of line | `inserted.marker`             | bare `+`, empty line was added                                            |
| `-`               | `-`   | yes, next is end of line | `deleted.marker`              | bare `-`, empty line was deleted                                          |
| ` }`              | ` `   | no                       | pass through                  | context                                                                   |

### trace 3: overlay scenario with false positive analysis

imagine this python file displayed with diff-basic overlay:

```
+def new_function():
+    return 42

 def existing():
-    return old_value
+    return new_value
\ No newline at end of file
```

| line                          | col 0 | match?     | token                                                    | notes                              |
| ----------------------------- | ----- | ---------- | -------------------------------------------------------- | ---------------------------------- |
| `+def new_function():`        | `+`   | yes        | `inserted.marker` `+`, `inserted` `def new_function():`  | correct: this is a diff-added line |
| `+    return 42`              | `+`   | yes        | `inserted.marker` `+`, `inserted` `    return 42`        | correct                            |
| ` `                           | ` `   | no         | pass through (underlying grammar sees empty line)        | context line with just a space     |
| ` def existing():`            | ` `   | no         | pass through (underlying grammar highlights `def` etc.)  | context line                       |
| `-    return old_value`       | `-`   | yes        | `deleted.marker` `-`, `deleted` `    return old_value`   | correct                            |
| `+    return new_value`       | `+`   | yes        | `inserted.marker` `+`, `inserted` `    return new_value` | correct                            |
| `\ No newline at end of file` | `\`   | yes (`\ `) | `comment` entire line                                    | no-newline marker                  |

now imagine the same python file WITHOUT diff markers (pure source code).
the only lines that could false-positive are lines starting with `+`, `-`,
or `!` at column 0. in standard python:

- `+x` or `-x` at column 0 would be a bare expression statement with unary
  operator, which is syntactically valid but pointless and extremely rare
- `!` at column 0 is not valid python syntax (ipython magic, not real python)
- `@@` at column 0 is a decorator with no name, which is a syntax error

so in practice the false positive rate against python source is effectively
zero. the same analysis holds for javascript, typescript, go, rust, c, java,
and most other common languages.
