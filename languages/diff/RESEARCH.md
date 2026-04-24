# diff lexical research

target: a full syntax highlighter for standalone diff/patch files as produced
by `git diff`, `diff -u`, and related tools. this grammar covers the complete
unified diff format (posix and gnu extensions), the context diff format
(`diff -c`), git-specific metadata lines (`diff --git`, `index`, `similarity`,
`rename`, `mode` lines), the normal diff format, and common edge cases like
binary file indicators and the "no newline at end of file" marker.

this is the "full" diff grammar, intended for `.diff` and `.patch` files
viewed in isolation. a companion grammar `diff-basic` (see
`languages/diff-basic/RESEARCH.md`) provides a minimal overlay that only
highlights `+`/`-`/`!` line prefixes and `@@` hunk headers. `diff-basic` is
designed to compose with other language grammars without conflicts, for use
cases like showing a javascript file with diff markers. this full grammar
should not be used as an overlay because its tokens (`---`, `+++`, `diff`,
`index`, etc.) are ambiguous with real programming language syntax.

## character-level diff: out of scope for syntax highlighting

the user asked whether it is worth adding more granular "character diff"
highlighting within changed lines (highlighting exactly which characters
changed between a `-` line and its paired `+` line). the answer is no, this
belongs to a different layer entirely.

every major syntax highlighter (pygments, tree-sitter, textmate/vscode,
prism, highlight.js, vim) treats diff highlighting as line-level only.
character/word-level refinement is always implemented as a separate
post-processing pass that:

1. pairs removed and added lines within a hunk
2. runs a second diff algorithm (myers lcs, levenshtein, o(np)) on the
   paired line contents
3. overlays additional markup on top of the syntax-highlighted output

tools that do this include git's `contrib/diff-highlight` (perl),
`delta` (rust, levenshtein-based), `diffr` (rust, myers lcs), and
`diffchar.vim`. none of them implement it inside the tokenizer.

the reason is structural: a syntax highlighter processes one line at a time
and classifies tokens. character-level diffs require buffering paired lines
and running a comparison algorithm, which is fundamentally a rendering
concern, not a tokenization concern. a twinkleplop grammar cannot and should
not attempt this.

## sources consulted

primary (official):

- https://pubs.opengroup.org/onlinepubs/9699919799/utilities/diff.html (posix.1-2008 diff specification, includes unified format since issue 7)
- https://www.gnu.org/software/diffutils/manual/html_node/Unified-Format.html (gnu diffutils unified format)
- https://www.gnu.org/software/diffutils/manual/html_node/Context-Format.html (gnu diffutils context format)
- https://www.gnu.org/software/diffutils/manual/html_node/Normal-Format.html (gnu diffutils normal format)
- https://git-scm.com/docs/diff-generate-patch (git diff patch format, the authoritative source for git-specific extensions)
- https://git-scm.com/docs/git-diff (git diff command, including combined diff for merges)

cross-reference (existing highlighters):

- https://github.com/microsoft/vscode/blob/main/extensions/diff/syntaxes/diff.tmLanguage.json (textmate grammar used by vscode, most complete scope hierarchy)
- https://github.com/tree-sitter-grammars/tree-sitter-diff (tree-sitter grammar, most structured parse tree)
- https://github.com/PrismJS/prism/pull/1889 (prism diff language definition)
- https://github.com/highlightjs/highlight.js/blob/main/src/languages/diff.js (highlight.js diff grammar)
- https://github.com/pygments/pygments/blob/master/pygments/lexers/diff.py (pygments difflexer)
- https://github.com/sublimehq/Packages/blob/master/Diff/Diff.sublime-syntax (sublime text diff syntax)

character-level diff tools (for the "out of scope" analysis):

- https://github.com/dandavison/delta (delta, rust-based git pager)
- https://github.com/git/git/tree/master/contrib/diff-highlight (git diff-highlight, perl)
- https://github.com/mookid/diffr (diffr, rust)
- https://github.com/rickhowe/diffchar.vim (diffchar.vim)

gaps and calls:

- there is no single rfc or formal bnf for unified diff. the posix spec
  defines the `-u` option and output format but leaves some git extensions
  (like `diff --git`, `index`, `similarity index`, `rename from/to`,
  `new file mode`, `deleted file mode`) unspecified. for those, the git
  source and `git-diff(1)` man page are the authority.
- combined diff format (for merge commits, showing multiple parents with
  multiple `+`/`-` columns) is documented in `git diff-generate-patch` but
  is rarely highlighted by existing tools. we will support it at a basic
  level.

---

## 1. token inventory

### headers

**git diff header**
`diff --git a/path b/path`
the first line of each file in `git diff` output. always starts with
`diff --git `.

**git metadata lines** (appear between the diff header and file headers):

- `index <hash>..<hash> <mode>` (abbreviated commit hashes and optional file mode)
- `old mode <mode>` / `new mode <mode>` (file permission changes)
- `new file mode <mode>` / `deleted file mode <mode>`
- `similarity index <n>%` / `dissimilarity index <n>%`
- `rename from <path>` / `rename to <path>`
- `copy from <path>` / `copy to <path>`
- `Binary files <path> and <path> differ`

**file headers (unified)**

- `--- a/path` or `--- /dev/null` (old file)
- `+++ b/path` or `+++ /dev/null` (new file)

**file headers (context)**

- `*** path timestamp` (old file)
- `--- path timestamp` (new file, reuses `---` but in context format)

**normal diff header**

- `diff path path` (without `--git`)

### hunk headers

**unified hunk**
`@@ -start,count +start,count @@ optional function context`
the `@@` markers, the range numbers, and the trailing function name context
(everything after the closing `@@` to end of line).

**context hunk**
`***************` (separator between hunks)
`*** start,end ****` (old file range)
`--- start,end ----` (new file range)

**normal hunk**
`NUMBERcNUMBER`, `NUMBERaNUMBER`, `NUMBERdNUMBER` (change/add/delete commands)
where NUMBER is a line number or `start,end` range.

### line content

**added line**: starts with `+` (unified) or `> ` (normal/context)
**deleted line**: starts with `-` (unified) or `< ` (normal/context)
**changed line**: starts with `!` (context format only)
**context line**: starts with ` ` (single space, unified and context)
**separator**: `---` between old and new sections in normal diff
**no newline marker**: `\ No newline at end of file` (backslash at column 0)

### combined diff lines (merge commits)

in combined diff for n parents, each line has n prefix columns:

- `+` in column i means the line was added relative to parent i
- `-` in column i means the line was removed relative to parent i
- ` ` (space) in column i means the line matches parent i

the hunk header has n+1 `@` signs: `@@@ -range -range +range @@@` for two
parents.

### comment lines

lines starting with `#` can appear as comments in some diff contexts (patch
files). not universally present.

---

## 2. complete token type mapping

the following token types are appropriate for a diff grammar:

| token name        | what it covers                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keyword`         | diff command word (`diff`), format flags (`--git`, `--cc`)                                                                                                                            |
| `heading`         | file header lines (`---`, `+++` in unified; `***` in context)                                                                                                                         |
| `label`           | hunk header markers (`@@`, `***...****`, `---...----`)                                                                                                                                |
| `number`          | line numbers and ranges in hunk headers, mode numbers                                                                                                                                 |
| `string`          | file paths in headers                                                                                                                                                                 |
| `hash`            | git object hashes in `index` lines                                                                                                                                                    |
| `meta`            | git metadata keywords (`index`, `old mode`, `new mode`, `similarity index`, `rename from`, `rename to`, `copy from`, `copy to`, `new file mode`, `deleted file mode`, `Binary files`) |
| `inserted`        | added line content (after the `+` prefix)                                                                                                                                             |
| `inserted.marker` | the `+` or `>` prefix character itself                                                                                                                                                |
| `deleted`         | removed line content (after the `-` prefix)                                                                                                                                           |
| `deleted.marker`  | the `-` or `<` prefix character itself                                                                                                                                                |
| `changed`         | changed line content in context format (after `!`)                                                                                                                                    |
| `changed.marker`  | the `!` prefix character                                                                                                                                                              |
| `context`         | unchanged context line content                                                                                                                                                        |
| `comment`         | comment lines, "no newline at end of file" marker, section context after `@@`                                                                                                         |
| `punctuation`     | range separators (`,`, `..`), path prefixes (`a/`, `b/`), `%` in similarity                                                                                                           |

note: `inserted`, `deleted`, `changed` are semantic token types specific to
diff. they map naturally to green/red/yellow background highlighting in
themes. most highlighting systems use similar names (pygments: Generic.Inserted
/ Generic.Deleted; textmate: markup.inserted / markup.deleted; tree-sitter:
addition / deletion).

---

## 3. edge case inventory

### ambiguous prefixes

- `---` can mean: (1) old file header in unified format, (2) new file range
  in context format, (3) section separator in normal diff. disambiguation:
  in the main/top state, `--- a/` or `--- /` followed by a path is a file
  header; inside a hunk, `-` at column 0 is a deleted line (even `---foo`
  is a deleted line starting with `--foo`). the three-dash ambiguity is
  resolved by position: before any hunk it is a header, inside a hunk it is
  content.

- `+++` can mean: (1) new file header in unified format, (2) inside a hunk,
  a line starting with `++` (added line whose content starts with `+`).
  same disambiguation as `---`: before first hunk = header, inside hunk =
  content.

- `***` can mean: (1) old file header in context format, (2) hunk separator
  `***************`, (3) old file range `*** 1,5 ****`. disambiguated by
  what follows: 15+ asterisks = separator, space + digits = range, space +
  path = header.

### the space prefix for context lines

context lines in unified diff start with exactly one space. this means a
blank line in the original file appears as a line containing only a single
space. a truly empty line in the diff output (no characters at all) is not a
valid diff line and should be treated as outside-diff text or a formatting
artifact.

### no newline at end of file

`\ No newline at end of file` appears on its own line, starting with `\`.
it is not a deleted/added/context line. it can appear after any of the three
line types (`+`, `-`, or ` `). some tools localize this string, so matching
on just `\ ` at line start is more robust than matching the full english text.

### binary files

`Binary files a/path and b/path differ` appears instead of hunks when the
diff engine detects binary content. some variants: `GIT binary patch`
followed by literal/delta data (which should not be tokenized as diff lines).

### combined diff prefix width

for an n-parent merge, each line has n prefix characters instead of 1.
for the common 2-parent case, each content line starts with two characters
from the set `{+, -, ' '}`. the hunk header uses `@@@` (three `@` signs)
instead of `@@` (two). this means the grammar needs to handle variable-width
prefixes. in practice, almost all combined diffs are 2-parent, so supporting
`@@@ ... @@@` and 2-character prefixes covers real-world usage.

### git diff with rename detection

when git detects a rename, the header includes:

```
similarity index 95%
rename from old/path
rename to new/path
```

and the diff may show only the changed portions. these metadata lines appear
between `diff --git` and the `---`/`+++` file headers.

### empty hunks

a file that only changes metadata (permissions, rename with 100% similarity)
may have `diff --git` and metadata lines but no `---`/`+++` headers and no
hunks at all. the grammar should not require hunks.

### path quoting

git quotes paths containing special characters with c-style escaping:
`"path/with spaces/file.txt"` or `path/with\ttab`. the `---`/`+++` headers
and `diff --git` line can contain quoted paths.

### timestamps in headers

classic `diff -u` output includes timestamps after paths:
`--- file.txt    2024-01-15 10:30:00.000000000 +0000`
git diff does not include timestamps (uses `a/`/`b/` prefixes instead).
the grammar should handle both forms.

---

## 4. nesting and context constructs

diff is an unusually flat format. there is very little nesting compared to
programming languages. the main structural contexts are:

```
file block
  opens: `diff` command line (e.g., `diff --git a/foo b/foo`) or
         `---`/`+++` file headers when no `diff` line is present
  closes: next `diff` command line, or end of input
  contains: metadata lines, file headers, hunks
  nests: does not nest (files are sequential)
```

```
metadata section
  opens: immediately after `diff` command line
  closes: `---` file header line (start of actual diff content)
  contains: `index`, `old mode`, `new mode`, `new file mode`,
            `deleted file mode`, `similarity index`, `rename from/to`,
            `copy from/to`, `Binary files` lines
  nests: does not nest
  note: may be absent (classic diff has no metadata)
```

```
unified hunk
  opens: `@@ -N,N +N,N @@` line
  closes: next `@@` line, next `diff` line, or end of input
  contains: added lines (`+`), deleted lines (`-`), context lines (` `),
            `\ No newline at end of file` lines
  nests: does not nest
  escapes: none (all content is literal, no escape sequences)
```

```
context hunk
  opens: `***************` separator or `*** N,N ****` range line
  closes: next `***************` separator, next `diff` line, or end of input
  contains: two sub-sections:
    old section: `*** N,N ****` header, then lines prefixed with ` `, `-`, `!`
    new section: `--- N,N ----` header, then lines prefixed with ` `, `+`, `!`
  nests: does not nest
```

```
normal hunk
  opens: `NUMa/c/dNUM` command line
  closes: next command line, next `diff` line, or end of input
  contains: `< ` lines (old), `> ` lines (new), `---` separator
  nests: does not nest
```

```
combined diff hunk (merge)
  opens: `@@@ -N,N -N,N +N,N @@@` line (or more `@` for n > 2 parents)
  closes: next `@@@` line, next `diff` line, or end of input
  contains: lines with 2+ prefix characters from {+, -, space}
  nests: does not nest
```

the overall structure is strictly hierarchical with no recursion:
input -> file blocks -> (metadata + file headers + hunks) -> lines.
there is no construct that can nest inside itself.

---

## 5. manual traces

### trace 1: git diff with rename and content change

```
diff --git a/src/old_name.js b/src/new_name.js
similarity index 85%
rename from src/old_name.js
rename to src/new_name.js
index abc1234..def5678 100644
--- a/src/old_name.js
+++ b/src/new_name.js
@@ -1,4 +1,4 @@
 const foo = 1;
-const bar = 2;
+const bar = 3;
 const baz = foo + bar;
```

character-by-character trace:

| pos     | char(s)                                          | context      | token                                                                                                                                                    | transition                        |
| ------- | ------------------------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| line 1  | `diff --git a/src/old_name.js b/src/new_name.js` | top          | `keyword` for `diff`, `keyword` for `--git`, `string` for paths                                                                                          | enter file block                  |
| line 2  | `similarity index 85%`                           | metadata     | `meta` for `similarity index`, `number` for `85`, `punctuation` for `%`                                                                                  | stay in metadata                  |
| line 3  | `rename from src/old_name.js`                    | metadata     | `meta` for `rename from`, `string` for path                                                                                                              | stay in metadata                  |
| line 4  | `rename to src/new_name.js`                      | metadata     | `meta` for `rename to`, `string` for path                                                                                                                | stay in metadata                  |
| line 5  | `index abc1234..def5678 100644`                  | metadata     | `meta` for `index`, `hash` for `abc1234`, `punctuation` for `..`, `hash` for `def5678`, `number` for `100644`                                            | stay in metadata                  |
| line 6  | `--- a/src/old_name.js`                          | metadata     | `heading` for `---`, `string` for path                                                                                                                   | exit metadata, enter file headers |
| line 7  | `+++ b/src/new_name.js`                          | file headers | `heading` for `+++`, `string` for path                                                                                                                   | stay in file headers              |
| line 8  | `@@ -1,4 +1,4 @@`                                | file headers | `label` for `@@`, `number` for `1`, `punctuation` for `,`, `number` for `4`, `number` for `1`, `punctuation` for `,`, `number` for `4`, `label` for `@@` | enter hunk                        |
| line 9  | ` const foo = 1;`                                | hunk         | `context` (space prefix + content)                                                                                                                       | stay in hunk                      |
| line 10 | `-const bar = 2;`                                | hunk         | `deleted.marker` for `-`, `deleted` for rest                                                                                                             | stay in hunk                      |
| line 11 | `+const bar = 3;`                                | hunk         | `inserted.marker` for `+`, `inserted` for rest                                                                                                           | stay in hunk                      |
| line 12 | ` const baz = foo + bar;`                        | hunk         | `context` (space prefix + content)                                                                                                                       | stay in hunk                      |
| eof     |                                                  | hunk         |                                                                                                                                                          | exit hunk, exit file block        |

### trace 2: context diff with changed lines

```
*** old_file.txt	2024-01-15 10:00:00.000000000 +0000
--- new_file.txt	2024-01-15 10:30:00.000000000 +0000
***************
*** 1,5 ****
  line one
! line two old
  line three
--- 1,5 ----
  line one
! line two new
  line three
```

| pos     | char(s)                           | context      | token                                                                                            | transition                          |
| ------- | --------------------------------- | ------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------- |
| line 1  | `*** old_file.txt\t2024-01-15...` | top          | `heading` for `***`, `string` for path, `comment` for timestamp                                  | enter file block (context format)   |
| line 2  | `--- new_file.txt\t2024-01-15...` | file headers | `heading` for `---`, `string` for path, `comment` for timestamp                                  | stay in file headers                |
| line 3  | `***************`                 | file headers | `label` for the separator                                                                        | enter context hunk                  |
| line 4  | `*** 1,5 ****`                    | context hunk | `label` for `***`, `number` for `1`, `punctuation` for `,`, `number` for `5`, `label` for `****` | enter old section                   |
| line 5  | `  line one`                      | old section  | `context` (two-space prefix + content)                                                           | stay in old section                 |
| line 6  | `! line two old`                  | old section  | `changed.marker` for `!`, `changed` for rest                                                     | stay in old section                 |
| line 7  | `  line three`                    | old section  | `context`                                                                                        | stay in old section                 |
| line 8  | `--- 1,5 ----`                    | old section  | `label` for `---`, `number` for `1`, `punctuation` for `,`, `number` for `5`, `label` for `----` | exit old section, enter new section |
| line 9  | `  line one`                      | new section  | `context`                                                                                        | stay in new section                 |
| line 10 | `! line two new`                  | new section  | `changed.marker` for `!`, `changed` for rest                                                     | stay in new section                 |
| line 11 | `  line three`                    | new section  | `context`                                                                                        | stay in new section, then exit      |

### trace 3: git diff with binary, new file, no newline, and combined diff

```
diff --git a/image.png b/image.png
new file mode 100644
Binary files /dev/null and b/image.png differ
diff --git a/config.json b/config.json
index 1a2b3c4..5d6e7f8 100644
--- a/config.json
+++ b/config.json
@@ -1,3 +1,3 @@
 {
-  "port": 3000
+  "port": 8080
\ No newline at end of file
 }
```

| pos     | char(s)                                         | context      | token                                                                                | transition                 |
| ------- | ----------------------------------------------- | ------------ | ------------------------------------------------------------------------------------ | -------------------------- |
| line 1  | `diff --git a/image.png b/image.png`            | top          | `keyword` for `diff --git`, `string` for paths                                       | enter file block           |
| line 2  | `new file mode 100644`                          | metadata     | `meta` for `new file mode`, `number` for `100644`                                    | stay in metadata           |
| line 3  | `Binary files /dev/null and b/image.png differ` | metadata     | `meta` for `Binary files`, `string` for paths, `meta` for `and`, `meta` for `differ` | exit file block (no hunks) |
| line 4  | `diff --git a/config.json b/config.json`        | top          | `keyword` for `diff --git`, `string` for paths                                       | enter new file block       |
| line 5  | `index 1a2b3c4..5d6e7f8 100644`                 | metadata     | `meta` for `index`, `hash` for hashes, `punctuation` for `..`, `number` for `100644` | stay in metadata           |
| line 6  | `--- a/config.json`                             | metadata     | `heading` for `---`, `string` for path                                               | exit metadata              |
| line 7  | `+++ b/config.json`                             | file headers | `heading` for `+++`, `string` for path                                               | stay in file headers       |
| line 8  | `@@ -1,3 +1,3 @@`                               | file headers | `label` for `@@`, numbers, `label` for `@@`                                          | enter hunk                 |
| line 9  | ` {`                                            | hunk         | `context`                                                                            | stay in hunk               |
| line 10 | `-  "port": 3000`                               | hunk         | `deleted.marker` for `-`, `deleted` for rest                                         | stay in hunk               |
| line 11 | `+  "port": 8080`                               | hunk         | `inserted.marker` for `+`, `inserted` for rest                                       | stay in hunk               |
| line 12 | `\ No newline at end of file`                   | hunk         | `comment` for entire line (starts with `\`)                                          | stay in hunk               |
| line 13 | ` }`                                            | hunk         | `context`                                                                            | stay in hunk               |
| eof     |                                                 | hunk         |                                                                                      | exit hunk, exit file block |

notes from traces:

- the main complexity is distinguishing `---`/`+++`/`***` as headers vs
  content lines. the key signal is position: before any hunk they are
  headers, inside a hunk they are content prefixed with `-`/`+`/`*`.
- the `\ No newline` line can appear after any content line type and is
  always a comment/annotation, never a content line.
- binary file blocks have no hunks at all, just metadata.
- the grammar is fundamentally line-oriented: every token boundary aligns
  with line starts, and the first character(s) of each line determine its
  type. this makes diff one of the simplest grammars to implement in a
  character scanner.
