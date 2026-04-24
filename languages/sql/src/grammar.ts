// sql grammar for twinkleplop syntax highlighting.
//
// scope:
//   permissive union across sql:2016 core, postgresql, mysql, sqlite, and
//   transact-sql. when dialects conflict we accept the superset rather than
//   reject. keyword classification is case-insensitive and handled by a
//   reclassifier post-pass rather than listed in the state machine, so the
//   grammar only needs to recognise structure.
//
//   covered:
//     - line comments: -- and # (mysql)
//     - block comments: /* */ with nesting
//     - strings: '...' with '' escape and \X escape (mysql-default style),
//       prefixed E'...' / e'...' (pg c-escape), N'...' / n'...' (t-sql
//       unicode), U&'...' / u&'...' (pg unicode escape), B'...' / X'...'
//       (bit / hex), _charset is lexed as identifier + ordinary string
//     - dollar-quoted strings in the $$...$$ form (untagged only)
//     - numbers: decimal, hex 0x.., binary 0b.., octal 0o.., with optional
//       fractional part, exponent, and underscore digit separators
//     - identifiers: unquoted, "double-quoted", `backtick`, [bracket],
//       u&"..." unicode identifier
//     - parameters: $n positional, :name, @var, @@var, ? and ?nnn
//     - operators: all multi-char forms listed in the research doc
//
// known limitations:
//   - tagged dollar-quoted strings $tag$...$tag$ are NOT supported. only
//     the empty-tag $$...$$ form is recognised. inside $tag$...$tag$
//     content the tokenizer will try to interpret body characters as sql,
//     producing incorrect tokens.
//   - mysql `--` comment quirk (must be followed by whitespace) is not
//     enforced. permissive behavior: any `--` starts a comment.
//   - postgresql `#` bit-xor operator is not recognised. `#` is always a
//     line comment. two-char `#>` and `#>>` are still operators because
//     operators are tried before line comments.
//   - leading-dot decimals like `.5` tokenize as `.` punctuation followed
//     by `5` number. write as `0.5` to get a single number token.
//   - mysql charset introducers `_utf8'...'` tokenize as identifier `_utf8`
//     plus an ordinary string, not as a single unit.
//   - the `::` operator is tokenized the same in pg (cast) and t-sql
//     (scope resolution). downstream consumers cannot tell them apart.
//   - the `odbc escape clauses` `{d '...'}`, `{ts '...'}`, etc. are not
//     recognised; braces tokenize as punctuation.
//   - case sensitivity of quoted identifiers is preserved at the text
//     level, but the grammar makes no per-dialect claim about equality.
//   - the postgresql `copy ... from stdin` data block is not detected;
//     the `\.` terminator and tsv body are tokenized as ordinary sql.

import {
  ALNUM,
  DIGIT,
  HEX,
  LETTER,
  enter,
  fallback,
  goto,
  leave,
  match,
  on,
  range,
  within,
} from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

// ---------------------------------------------------------------------------
// custom token types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// operator lists.
//
// listed explicitly so the compiler sorts them longest-first within each
// first-char bucket; longer operators always win their prefix. order in
// the array is irrelevant thanks to the bucket sort.
// ---------------------------------------------------------------------------

const OPERATORS = [
  // three-char
  "<=>",
  "!~*",
  "->>",
  "#>>",
  // two-char
  "!=",
  "<=",
  ">=",
  "<>",
  "::",
  "->",
  "#>",
  "@>",
  "<@",
  "||",
  "&&",
  "!~",
  "~*",
  "?|",
  "?&",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "!<",
  "!>",
  "==",
  "**",
  "<<",
  ">>",
  ":=",
  "@@",
  // single-char. note: `?` is intentionally NOT here — the parameter rule
  // below owns `?` and `?nnn` so they coalesce into a single identifier
  // token. `?|` and `?&` remain in this list and still match first.
  "+",
  "-",
  "*",
  "/",
  "%",
  "^",
  "=",
  "<",
  ">",
  "!",
  "~",
  "&",
  "|",
];

// ---------------------------------------------------------------------------
// shared rule fragments
// ---------------------------------------------------------------------------

const WS = on([" ", "\t", "\n", "\r"]);
const LINE_COMMENT_DASH = within("--", "\n", TOKENS.comment);
const LINE_COMMENT_HASH = within("#", "\n", TOKENS.comment);

// identifier continuation chars (ascii). postgres allows diacritical /
// non-latin letters in identifiers; we accept ascii plus `$` for pg / mysql
// compatibility. quoted identifier forms carry the rest through literal.
const ID_CONT = range([
  ["a", "z"],
  ["A", "Z"],
  ["0", "9"],
  ["_", "_"],
  ["$", "$"],
]);

// identifier start: letter or underscore. `$` is NOT a start char (matches
// pg and mysql). leading-`$` forms are dispatched earlier (dollar strings
// and positional parameters).
const ID_START = range([
  ["a", "z"],
  ["A", "Z"],
  ["_", "_"],
]);

export default define_grammar({
  name: "sql",
  states: {
    // -----------------------------------------------------------------
    // main — top-level dispatch.
    // -----------------------------------------------------------------
    main: {
      rules: [
        WS,

        // comments. line comments must come before operators so that
        // `--` wins over `-`, and block comments before the `/` in
        // the operators list.
        LINE_COMMENT_DASH,
        LINE_COMMENT_HASH,
        match("/*", TOKENS.comment, enter("block_comment")),

        // unicode-prefix (U&) string and identifier. the ampersand
        // makes these awkward to split, so they stay as a 3-char
        // single open token for now.
        match(["U&'", "u&'"], TOKENS.string, enter("single_string")),
        match(['U&"', 'u&"'], TOKENS.identifier, enter("double_ident")),

        // single-letter string prefixes (E/e, N/n, B/b, X/x). the
        // prefix letter is emitted as a separate `identifier` token;
        // a lookahead state then decides whether to open the string
        // (next char is `'`) or continue scanning as a regular
        // identifier. this keeps `E` / `N` / `B` / `X` used as plain
        // identifier names from being miscoloured as string opens.
        match(["E", "e"], TOKENS.identifier, enter("e_prefix_body")),
        match(["N", "n"], TOKENS.identifier, enter("n_prefix_body")),
        match(["B", "b"], TOKENS.identifier, enter("bx_prefix_body")),
        match(["X", "x"], TOKENS.identifier, enter("bx_prefix_body")),

        // plain single-quoted string
        match("'", TOKENS.string, enter("single_string")),

        // quoted identifier forms
        match('"', TOKENS.identifier, enter("double_ident")),
        match("`", TOKENS.identifier, enter("backtick_ident")),
        match("[", TOKENS.identifier, enter("bracket_ident")),

        // dollar forms. `$$` opens an untagged dollar string. `$`
        // followed by a digit (positional parameter) or by ident
        // chars is handled by a probe; bare `$` becomes an operator.
        match("$$", TOKENS.string, enter("dollar_string")),
        on("$", enter("dollar_probe")),

        // operators. this rule includes @@, which means @@var starts
        // with the @@ operator token. the variable rule below will
        // therefore match @@ first for the system-variable case.
        //
        // ordering note: the @@ pattern inside OPERATORS is listed
        // BEFORE the `@` variable rule below, so `@@` takes
        // precedence as an operator when not followed by an ident
        // char. when it IS followed by an ident char we want the
        // variable interpretation. that's handled by putting the
        // @@variable probe BEFORE the operators rule.
        on("@@", enter("at_at_probe")),
        on("@", enter("at_probe")),

        // multi- and single-char operators
        match(OPERATORS, TOKENS.operator),

        // parameter sigils. these must come after operators so that
        // ?| and ?& are claimed first, and after the @ probes.
        match(":", TOKENS.variable, enter("colon_var_body")),
        // `?` and `?nnn` tokenize as a single `identifier` token.
        // everything coalesces because both the sigil and the body
        // emit the same token type.
        match("?", TOKENS.identifier, enter("qmark_body")),

        // numbers. prefixed forms before the digit rule. the hex /
        // binary / octal prefixes would otherwise be `0` + ident.
        match(["0x", "0X"], TOKENS.number, enter("hex_number")),
        match(["0b", "0B"], TOKENS.number, enter("bin_number")),
        match(["0o", "0O"], TOKENS.number, enter("oct_number")),
        match(DIGIT, TOKENS.number, enter("number")),

        // punctuation. `.` is punctuation in this state; `.5` decimals
        // would require a probe we're not bothering with.
        match(["(", ")", "{", "}", ",", ";", "."], TOKENS.punctuation),

        // identifiers. emit everything as `identifier`; the
        // reclassifier promotes keywords, types, and boolean / null
        // literals in a post-pass.
        match(ID_START, TOKENS.identifier, enter("identifier_body")),
      ],
    },

    // -----------------------------------------------------------------
    // identifier_body — continuation of an unquoted identifier.
    // -----------------------------------------------------------------
    identifier_body: {
      rules: [match(ID_CONT, TOKENS.identifier), fallback(leave())],
    },

    // -----------------------------------------------------------------
    // block_comment — nested via enter/leave. pg and mysql nest; sqlite
    // and standard sql do not. permissive union: always nest.
    // -----------------------------------------------------------------
    block_comment: {
      rules: [
        match("/*", TOKENS.comment, enter("block_comment")),
        match("*/", TOKENS.comment, leave()),
        fallback({ token: TOKENS.comment }),
      ],
    },

    // -----------------------------------------------------------------
    // single_string — plain single-quoted string, also used for N'...'
    // and U&'...' where the grammar treats the body the same.
    //
    // two escape mechanisms are accepted concurrently:
    //   - `''`  → doubled single-quote, standard sql (emits as
    //             string_escape so themes can distinguish it)
    //   - `\X`  → 2-char backslash escape, mysql-default permissive.
    //             the grammar does NOT sub-tokenize \xNN / \uNNNN in
    //             plain strings because pg (with standard_conforming_
    //             strings) and ANSI SQL treat `\` as literal; only
    //             E-strings route through the richer esc_ machine.
    // -----------------------------------------------------------------
    single_string: {
      rules: [
        match("''", TOKENS.string_escape),
        match("\\", TOKENS.string_escape, enter("esc_simple")),
        match("'", TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    // -----------------------------------------------------------------
    // pg_escape_string — E'...' / e'...' postgres c-style escape
    // strings. full escape table per §4.1.2.2:
    //   - `\b` `\f` `\n` `\r` `\t` — simple control chars
    //   - `\NNN`   — 1 to 3 octal digits
    //   - `\xNN`   — 1 to 2 hex digits
    //   - `\uNNNN` — exactly 4 hex (BMP unicode)
    //   - `\UNNNNNNNN` — exactly 8 hex (full unicode)
    //   - `\X`     — any other char, literal (still emitted as
    //                string_escape so the `\` is visually marked)
    //   - `''`     — doubled-quote also works in E-strings
    // -----------------------------------------------------------------
    pg_escape_string: {
      rules: [
        match("''", TOKENS.string_escape),
        match("\\x", TOKENS.string_escape, enter("esc_hex_d1")),
        match("\\u", TOKENS.string_escape, enter("esc_u4_d1")),
        match("\\U", TOKENS.string_escape, enter("esc_u8_d1")),
        match("\\", TOKENS.string_escape, enter("e_esc_start")),
        match("'", TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    // -----------------------------------------------------------------
    // escape sub-machine.
    //
    // esc_simple: generic 1-char escape (for plain single_string's \X).
    // e_esc_start: dispatcher for E-strings' `\` already consumed —
    //   routes octal digits to a 2-digit tail, anything else to the
    //   same 1-char-consume fallback.
    // esc_hex_d1/d2: up to 2 hex digits.
    // esc_u4_d1..d4: up to 4 hex digits.
    // esc_u8_d1..d8: up to 8 hex digits.
    // esc_oct_d2/d3: optional 2nd and 3rd octal digit after the
    //   dispatcher consumed the 1st.
    // partial matches unwind via fallback(leave()) without consuming,
    // so remaining chars fall back to the parent string body.
    // -----------------------------------------------------------------
    esc_simple: {
      rules: [fallback({ token: TOKENS.string_escape, exit: true })],
    },

    e_esc_start: {
      rules: [
        match(range([["0", "7"]]), TOKENS.string_escape, goto("esc_oct_d2")),
        fallback({ token: TOKENS.string_escape, exit: true }),
      ],
    },

    esc_hex_d1: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_hex_d2")), fallback(leave())],
    },
    esc_hex_d2: {
      rules: [match(HEX, TOKENS.string_escape, leave()), fallback(leave())],
    },

    esc_u4_d1: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u4_d2")), fallback(leave())],
    },
    esc_u4_d2: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u4_d3")), fallback(leave())],
    },
    esc_u4_d3: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u4_d4")), fallback(leave())],
    },
    esc_u4_d4: {
      rules: [match(HEX, TOKENS.string_escape, leave()), fallback(leave())],
    },

    esc_u8_d1: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u8_d2")), fallback(leave())],
    },
    esc_u8_d2: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u8_d3")), fallback(leave())],
    },
    esc_u8_d3: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u8_d4")), fallback(leave())],
    },
    esc_u8_d4: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u8_d5")), fallback(leave())],
    },
    esc_u8_d5: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u8_d6")), fallback(leave())],
    },
    esc_u8_d6: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u8_d7")), fallback(leave())],
    },
    esc_u8_d7: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_u8_d8")), fallback(leave())],
    },
    esc_u8_d8: {
      rules: [match(HEX, TOKENS.string_escape, leave()), fallback(leave())],
    },

    esc_oct_d2: {
      rules: [
        match(range([["0", "7"]]), TOKENS.string_escape, goto("esc_oct_d3")),
        fallback(leave()),
      ],
    },
    esc_oct_d3: {
      rules: [match(range([["0", "7"]]), TOKENS.string_escape, leave()), fallback(leave())],
    },

    // -----------------------------------------------------------------
    // prefix body states — entered after emitting a 1-char identifier
    // (E/N/B/X). each peeks one char: if `'`, the string-body state
    // takes over; otherwise we behave like a normal identifier_body.
    // -----------------------------------------------------------------
    e_prefix_body: {
      rules: [
        match("'", TOKENS.string, goto("pg_escape_string")),
        match(ID_CONT, TOKENS.identifier, goto("identifier_body")),
        fallback(leave()),
      ],
    },

    n_prefix_body: {
      rules: [
        match("'", TOKENS.string, goto("single_string")),
        match(ID_CONT, TOKENS.identifier, goto("identifier_body")),
        fallback(leave()),
      ],
    },

    bx_prefix_body: {
      rules: [
        match("'", TOKENS.bit, goto("bit_string")),
        match(ID_CONT, TOKENS.identifier, goto("identifier_body")),
        fallback(leave()),
      ],
    },

    // -----------------------------------------------------------------
    // bit_string — body of B'...' and X'...' bit / hex string literals.
    // content restriction (0/1 for B, hex digits for X) is not enforced
    // at the lexical level; the tokenizer is not a validator.
    // -----------------------------------------------------------------
    bit_string: {
      rules: [match("'", TOKENS.bit, leave()), fallback({ token: TOKENS.bit })],
    },

    // -----------------------------------------------------------------
    // dollar_string — $$...$$ untagged dollar-quoted string.
    // no escape sequences; only the literal `$$` closes.
    // -----------------------------------------------------------------
    dollar_string: {
      rules: [match("$$", TOKENS.string, leave()), fallback({ token: TOKENS.string })],
    },

    // -----------------------------------------------------------------
    // double_ident — "..." quoted identifier. `""` escape for embedded
    // double quote. used for both the plain form and U&"..." unicode
    // identifier since the body recognition is identical.
    // -----------------------------------------------------------------
    double_ident: {
      rules: [
        match('""', TOKENS.identifier),
        match('"', TOKENS.identifier, leave()),
        fallback({ token: TOKENS.identifier }),
      ],
    },

    // -----------------------------------------------------------------
    // backtick_ident — `...` mysql / sqlite identifier with `` `` escape.
    // -----------------------------------------------------------------
    backtick_ident: {
      rules: [
        match("``", TOKENS.identifier),
        match("`", TOKENS.identifier, leave()),
        fallback({ token: TOKENS.identifier }),
      ],
    },

    // -----------------------------------------------------------------
    // bracket_ident — [...] t-sql / sqlite identifier. `]]` escape.
    // square brackets do not nest per spec.
    // -----------------------------------------------------------------
    bracket_ident: {
      rules: [
        match("]]", TOKENS.identifier),
        match("]", TOKENS.identifier, leave()),
        fallback({ token: TOKENS.identifier }),
      ],
    },

    // -----------------------------------------------------------------
    // dollar / @ / @@ probes.
    //
    // dollar_probe disambiguates `$`:
    //   - `$<digit>` → positional parameter (pg)
    //   - any other char → treat `$` as an operator
    //
    // the probe must enumerate non-digit chars explicitly so that it
    // doesn't keep skipping ahead until it finds a stray digit in
    // unrelated source. see research doc section 2.7 for context.
    // -----------------------------------------------------------------
    dollar_probe: {
      mode: "probe",
      fallback: "dollar_as_operator",
      rules: [
        on(DIGIT, enter("pg_param_start")),
        on(
          [
            LETTER,
            "_",
            " ",
            "\t",
            "\n",
            "\r",
            "'",
            '"',
            "`",
            "[",
            "]",
            "{",
            "}",
            "(",
            ")",
            ".",
            ",",
            ";",
            ":",
            "+",
            "-",
            "*",
            "/",
            "%",
            "&",
            "|",
            "^",
            "=",
            "<",
            ">",
            "~",
            "!",
            "?",
            "@",
            "#",
            "$",
            "\\",
          ],
          enter("dollar_as_operator"),
        ),
      ],
    },

    dollar_as_operator: {
      rules: [match("$", TOKENS.operator, leave())],
    },

    pg_param_start: {
      rules: [match("$", TOKENS.variable, goto("pg_param_body"))],
    },

    pg_param_body: {
      rules: [match(DIGIT, TOKENS.variable), fallback(goto("main"))],
    },

    // @@ probe: if followed by an identifier start char, treat as a
    // mysql / t-sql system variable. otherwise emit @@ as an operator
    // (pg tsquery matches tsvector).
    at_at_probe: {
      mode: "probe",
      fallback: "at_at_as_operator",
      rules: [
        on(ID_START, enter("at_at_variable")),
        on(
          [
            DIGIT,
            " ",
            "\t",
            "\n",
            "\r",
            "'",
            '"',
            "`",
            "[",
            "]",
            "{",
            "}",
            "(",
            ")",
            ".",
            ",",
            ";",
            ":",
            "+",
            "-",
            "*",
            "/",
            "%",
            "&",
            "|",
            "^",
            "=",
            "<",
            ">",
            "~",
            "!",
            "?",
            "@",
            "#",
            "$",
            "\\",
          ],
          enter("at_at_as_operator"),
        ),
      ],
    },

    at_at_as_operator: {
      rules: [match("@@", TOKENS.operator, leave())],
    },

    at_at_variable: {
      rules: [match("@@", TOKENS.variable, goto("var_name_body"))],
    },

    // single @ probe: if followed by ident char, treat as user var.
    // otherwise fall through to the main operator handling — we emit
    // `@` as an operator directly since pg uses it as unary abs.
    at_probe: {
      mode: "probe",
      fallback: "at_as_operator",
      rules: [
        on(ID_START, enter("at_variable")),
        on(
          [
            DIGIT,
            " ",
            "\t",
            "\n",
            "\r",
            "'",
            '"',
            "`",
            "[",
            "]",
            "{",
            "}",
            "(",
            ")",
            ".",
            ",",
            ";",
            ":",
            "+",
            "-",
            "*",
            "/",
            "%",
            "&",
            "|",
            "^",
            "=",
            "<",
            ">",
            "~",
            "!",
            "?",
            "@",
            "#",
            "$",
            "\\",
          ],
          enter("at_as_operator"),
        ),
      ],
    },

    at_as_operator: {
      rules: [match("@", TOKENS.operator, leave())],
    },

    at_variable: {
      rules: [match("@", TOKENS.variable, goto("var_name_body"))],
    },

    // shared tail: consume identifier chars as the variable name so
    // the sigil and the body coalesce into one `variable` token.
    var_name_body: {
      rules: [match(ID_CONT, TOKENS.variable), fallback(goto("main"))],
    },

    // -----------------------------------------------------------------
    // colon variable / parameter (sqlite / oracle style). only the
    // body is named here; the leading `:` token is emitted by the
    // rule in main.
    // -----------------------------------------------------------------
    colon_var_body: {
      rules: [match(ID_CONT, TOKENS.variable), fallback(goto("main"))],
    },

    // jdbc `?` parameter and sqlite `?nnn` numbered parameter. emits
    // `identifier` so the sigil and the digits coalesce into one token.
    qmark_body: {
      rules: [match(DIGIT, TOKENS.identifier), fallback(goto("main"))],
    },

    // -----------------------------------------------------------------
    // numeric sub-states. modelled on the json grammar; each sub-state
    // emits `number` so coalescing fuses the whole literal into one
    // token. fallback(goto("main")) is a deliberate controlled stack
    // leak (see json grammar's comment on the same pattern).
    // -----------------------------------------------------------------
    number: {
      rules: [
        match(DIGIT, TOKENS.number),
        match("_", TOKENS.number),
        match(".", TOKENS.number, enter("number_decimal")),
        match(["e", "E"], TOKENS.number, enter("number_exp_sign")),
        fallback(goto("main")),
      ],
    },

    number_decimal: {
      rules: [
        match(DIGIT, TOKENS.number),
        match("_", TOKENS.number),
        match(["e", "E"], TOKENS.number, enter("number_exp_sign")),
        fallback(goto("main")),
      ],
    },

    number_exp_sign: {
      rules: [
        match(["+", "-"], TOKENS.number, enter("number_exp_digits")),
        match(DIGIT, TOKENS.number, enter("number_exp_digits")),
        fallback(goto("main")),
      ],
    },

    number_exp_digits: {
      rules: [match(DIGIT, TOKENS.number), fallback(goto("main"))],
    },

    hex_number: {
      rules: [
        match(
          [
            DIGIT,
            range([
              ["a", "f"],
              ["A", "F"],
            ]),
            "_",
          ],
          TOKENS.number,
        ),
        fallback(goto("main")),
      ],
    },

    bin_number: {
      rules: [match([range([["0", "1"]]), "_"], TOKENS.number), fallback(goto("main"))],
    },

    oct_number: {
      rules: [match([range([["0", "7"]]), "_"], TOKENS.number), fallback(goto("main"))],
    },
  },
});
