// Rust grammar for twinkleplop syntax highlighting.
//
// Scope:
//   - All Rust lexical tokens per the Rust Reference:
//     keywords (strict + reserved), identifiers, literals (integers, floats,
//     chars, byte chars, strings, byte strings, raw strings, raw byte strings,
//     c-strings, raw c-strings, booleans), comments (line, nested block),
//     operators, punctuation, attributes, lifetimes, and macro invocations.
//
// Known limitations:
//   - Raw strings with more than 3 `#` delimiters (r####"..."####) are not
//     handled. r"...", r#"..."#, r##"..."##, and r###"..."### cover the vast
//     majority of real code. The same limit applies to br/cr prefixed raws.
//   - `r#ident` raw identifiers are not distinguished from plain identifiers
//     starting with `r`. They tokenize correctly but `r` and `#` get separate
//     tokens before the identifier body.
//   - Doc comments (///, //!, /**, /*!) are tokenized as plain comments.
//     A syntax highlighter typically styles all comments the same.
//   - Char literal edge cases: multi-codepoint unicode escapes in char
//     literals are accepted by the tokenizer without validation; the
//     tokenizer is not a validator.
//   - `>>` is always tokenized as a single operator, even when it represents
//     two closing angle brackets in nested generics. The parser, not the
//     tokenizer, handles this distinction.
//   - Type annotations after `:` and `->` are not semantically distinguished
//     from other identifiers. A tokenizer operates at the lexical level.

import {
  ALNUM,
  DIGIT,
  HEX,
  LETTER,
  LOWER,
  UPPER,
  enter,
  fallback,
  goto,
  leave,
  match,
  on,
  range,
  within,
  keyword,
} from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

// ---------------------------------------------------------------------------
// custom token types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// keyword lists
// ---------------------------------------------------------------------------

const KEYWORDS = [
  // control flow
  "if",
  "else",
  "match",
  "loop",
  "while",
  "for",
  "break",
  "continue",
  "return",
  // declarations
  "fn",
  "let",
  "const",
  "static",
  "struct",
  "enum",
  "trait",
  "impl",
  "type",
  "mod",
  "use",
  "extern",
  "crate",
  // modifiers
  "pub",
  "mut",
  "ref",
  "move",
  "async",
  "await",
  "unsafe",
  "dyn",
  // other
  "as",
  "in",
  "where",
  "self",
  "super",
  "Self",
  // reserved
  "abstract",
  "become",
  "box",
  "do",
  "final",
  "macro",
  "override",
  "priv",
  "try",
  "typeof",
  "unsized",
  "virtual",
  "yield",
];

export const BOOLEAN_LITERALS = ["true", "false"];

// ---------------------------------------------------------------------------
// operator lists (sorted by descending length for maximal munch)
// ---------------------------------------------------------------------------

const OP_3CHAR = ["<<=", ">>=", "..="];
const OP_2CHAR = [
  "::",
  "->",
  "=>",
  "..",
  "<<",
  ">>",
  "<=",
  ">=",
  "==",
  "!=",
  "&&",
  "||",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
];
const OP_1CHAR = ["+", "-", "*", "/", "%", "&", "|", "^", "!", "<", ">", "=", ".", "?", "~", "@"];

const OP_ALL = [...OP_3CHAR, ...OP_2CHAR, ...OP_1CHAR];

// ---------------------------------------------------------------------------
// number suffix set (for type suffixes on numeric literals)
// ---------------------------------------------------------------------------

const INT_SUFFIXES = [
  "i8",
  "i16",
  "i32",
  "i64",
  "i128",
  "isize",
  "u8",
  "u16",
  "u32",
  "u64",
  "u128",
  "usize",
];

const FLOAT_SUFFIXES = ["f32", "f64"];

const ALL_SUFFIXES = [...INT_SUFFIXES, ...FLOAT_SUFFIXES];

// lowercase primitive type names — tokenized as class_name so they highlight
// alongside other types rather than falling through to `identifier`. the
// integer / float width names overlap with numeric literal suffixes above.
export const PRIMITIVE_TYPES = [...INT_SUFFIXES, ...FLOAT_SUFFIXES, "bool", "char", "str"];

// ---------------------------------------------------------------------------
// shared rule fragments
// ---------------------------------------------------------------------------

const LINE_COMMENT = within("//", "\n", TOKENS.comment);
const STRING_DOUBLE = within('"', '"', TOKENS.string, { escape: "\\" });
const WS = on([" ", "\t", "\n", "\r"]);

// ---------------------------------------------------------------------------
// grammar
// ---------------------------------------------------------------------------

export default define_grammar({
  name: "rust",
  states: {
    // -------------------------------------------------------------------
    // main — entry state
    // -------------------------------------------------------------------
    main: {
      rules: [
        WS,

        // comments: line comments must come before block comments and
        // operators so `//` is matched before `/`
        LINE_COMMENT,
        match("/*", TOKENS.comment, enter("block_comment")),

        // strings: prefixed forms must come before plain identifiers
        // so `b"`, `r"`, `br"`, `c"`, `cr"` are matched first.

        // raw strings with hashes (most specific first)
        match('r###"', TOKENS.string, enter("raw_string_3")),
        match('r##"', TOKENS.string, enter("raw_string_2")),
        match('r#"', TOKENS.string, enter("raw_string_1")),
        match('r"', TOKENS.string, enter("raw_string_0")),

        // byte raw strings
        match('br###"', TOKENS.string, enter("raw_string_3")),
        match('br##"', TOKENS.string, enter("raw_string_2")),
        match('br#"', TOKENS.string, enter("raw_string_1")),
        match('br"', TOKENS.string, enter("raw_string_0")),

        // c raw strings
        match('cr###"', TOKENS.string, enter("raw_string_3")),
        match('cr##"', TOKENS.string, enter("raw_string_2")),
        match('cr#"', TOKENS.string, enter("raw_string_1")),
        match('cr"', TOKENS.string, enter("raw_string_0")),

        // byte strings and c-strings
        match('b"', TOKENS.string, enter("string_body")),
        match('c"', TOKENS.string, enter("string_body")),

        // regular strings
        match('"', TOKENS.string, enter("string_body")),

        // char and byte char literals
        match("b'", TOKENS.string, enter("char_body")),
        on("'", enter("quote_probe")),

        // attributes: #![...] and #[...]
        match("#!", TOKENS.attr_sigil, enter("attribute_open")),
        match("#", TOKENS.attr_sigil, enter("attribute_open")),

        // punctuation (structural delimiters)
        match(["{", "}", "(", ")", "[", "]", ";", ","], TOKENS.punctuation),
        match("::", TOKENS.punctuation),
        match(":", TOKENS.punctuation),

        // operators (after :: so :: is punctuation, not two colons)
        match(OP_ALL, TOKENS.operator),

        // keywords only. BOOLEAN_LITERALS and PRIMITIVE_TYPES used to be
        // emitted here as typed tokens; they now fall through to the
        // identifier path and are restored post-hoc by the reclassifier
        // pipeline, so consumers can opt in to the `boolean` and
        // `class_name` classifications.
        keyword(KEYWORDS),

        // numbers starting with 0 (hex, octal, binary prefixes)
        match(["0x", "0X"], TOKENS.number, enter("hex_number")),
        match(["0o", "0O"], TOKENS.number, enter("octal_number")),
        match(["0b", "0B"], TOKENS.number, enter("binary_number")),

        // decimal numbers
        match(DIGIT, TOKENS.number, enter("number")),

        // identifiers: two entry states so uppercase-start names can be
        // continued by their own body state (useful for future rules
        // that differ between UPPER- and lower-start identifiers). both
        // dispatches emit `identifier`; PascalCase promotion happens
        // in the restoration reclassifier.
        match(UPPER, TOKENS.identifier, enter("type_identifier")),
        match(["_", LOWER], TOKENS.identifier, enter("identifier")),
      ],
    },

    // -------------------------------------------------------------------
    // identifier — continuation of a lowercase/_ identifier
    // -------------------------------------------------------------------
    identifier: {
      rules: [
        match(["_", ALNUM], TOKENS.identifier),
        match("!", TOKENS.builtin, leave()),
        fallback(leave()),
      ],
    },

    // -------------------------------------------------------------------
    // type_identifier — continuation of an uppercase identifier
    // (structs, enums, traits, type aliases: Vec, String, Option, etc.).
    // emits plain `identifier`; PascalCase promotion happens post-hoc.
    // -------------------------------------------------------------------
    type_identifier: {
      rules: [
        match(["_", ALNUM], TOKENS.identifier),
        match("!", TOKENS.builtin, leave()),
        fallback(leave()),
      ],
    },

    // -------------------------------------------------------------------
    // block comments — nested via enter/leave
    // -------------------------------------------------------------------
    block_comment: {
      rules: [
        match("/*", TOKENS.comment, enter("block_comment")),
        match("*/", TOKENS.comment, leave()),
        fallback({ token: TOKENS.comment }),
      ],
    },

    // -------------------------------------------------------------------
    // string body — regular and byte/c strings with escape sequences.
    // routes `\u{...}`, `\xNN`, and bare `\X` through the shared
    // esc_unicode / esc_hex / esc_simple sub-states so escapes are
    // emitted as distinct `string_escape` tokens. raw strings do NOT
    // route here — they use raw_string_* states with no escape handling.
    // -------------------------------------------------------------------
    string_body: {
      rules: [
        match("\\u{", TOKENS.string_escape, enter("esc_unicode")),
        match("\\x", TOKENS.string_escape, enter("esc_hex")),
        match("\\", TOKENS.string_escape, enter("esc_simple")),
        match('"', TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    // -------------------------------------------------------------------
    // raw strings — one state per hash count
    // -------------------------------------------------------------------
    raw_string_0: {
      rules: [match('"', TOKENS.string, leave()), fallback({ token: TOKENS.string })],
    },

    raw_string_1: {
      rules: [match('"#', TOKENS.string, leave()), fallback({ token: TOKENS.string })],
    },

    raw_string_2: {
      rules: [match('"##', TOKENS.string, leave()), fallback({ token: TOKENS.string })],
    },

    raw_string_3: {
      rules: [match('"###', TOKENS.string, leave()), fallback({ token: TOKENS.string })],
    },

    // -------------------------------------------------------------------
    // quote_probe — two-phase probe to disambiguate lifetimes vs
    // char literals. entered from main via on("'") + enter().
    //
    // probe_entry.pos = position of `'` (before it was consumed).
    // probe_entry.state = main.
    // probe_entry.stack_ptr = 0.
    //
    // phase 1 (quote_probe): checks the first char after `'`.
    //   - letter/_ → ambiguous, continue to phase 2 (quote_probe_ident)
    //   - `\` or `'` or anything else → char literal
    //
    // phase 2 (quote_probe_ident): scans identifier continuation.
    //   - `'` after ident chars → char literal
    //   - non-ident char → lifetime
    //
    // transitioning between two probe states does NOT trigger rewind.
    // only the final transition to a non-probe state rewinds to `'`.
    //
    // enter() in exit rules pushes probe_entry.state (= main) onto
    // the stack, so target states can leave() back to main.
    // -------------------------------------------------------------------
    quote_probe: {
      mode: "probe",
      fallback: "char_literal",
      rules: [
        // letter/_ → ambiguous, need to scan further
        on(["_", LETTER], enter("quote_probe_ident")),
        // backslash → escape, definitely char literal
        on("\\", enter("char_literal")),
        // closing quote → char literal (empty or after ident)
        on("'", enter("char_literal")),
        // any other char (space, digit, etc.) → char literal
        on(
          [
            " ",
            "\t",
            "\n",
            "\r",
            ",",
            ";",
            ":",
            ".",
            ">",
            ")",
            "]",
            "}",
            "+",
            "-",
            "*",
            "/",
            "%",
            "&",
            "|",
            "^",
            "!",
            "=",
            "<",
            "?",
            "(",
            "[",
            "{",
            "#",
            "@",
            "~",
            DIGIT,
          ],
          enter("char_literal"),
        ),
      ],
    },

    quote_probe_ident: {
      mode: "probe",
      fallback: "lifetime_token",
      rules: [
        // closing `'` after identifier chars → char literal
        on("'", enter("char_literal")),
        // non-identifier, non-`'` chars → lifetime
        on(
          [
            " ",
            "\t",
            "\n",
            "\r",
            ",",
            ";",
            ":",
            ".",
            ">",
            ")",
            "]",
            "}",
            "+",
            "-",
            "*",
            "/",
            "%",
            "&",
            "|",
            "^",
            "!",
            "=",
            "<",
            "?",
            "(",
            "[",
            "{",
            "#",
            "@",
            "~",
          ],
          enter("lifetime_token"),
        ),
      ],
    },

    // -------------------------------------------------------------------
    // char_literal — entered after probe rewinds to the `'`.
    // consumes the full char literal: `'<body>'`
    // -------------------------------------------------------------------
    char_literal: {
      rules: [
        // opening quote
        match("'", TOKENS.string, goto("char_literal_body")),
        // should not reach here, but recover gracefully
        fallback(leave()),
      ],
    },

    // char literal body after the opening quote. shares the same
    // esc_* sub-states as string_body — every rust escape form is
    // valid in both contexts.
    char_literal_body: {
      rules: [
        match("\\u{", TOKENS.string_escape, enter("esc_unicode")),
        match("\\x", TOKENS.string_escape, enter("esc_hex")),
        match("\\", TOKENS.string_escape, enter("esc_simple")),
        // closing quote (empty char literal)
        match("'", TOKENS.string, leave()),
        // body character then expect closing quote
        fallback({ token: TOKENS.string, ...goto("char_literal_close") }),
      ],
    },

    // -------------------------------------------------------------------
    // shared escape sub-states — used by string_body, char_literal_body
    // and char_body (byte chars). each emits `string_escape` for the
    // escape payload and pops back to the parent body on completion or
    // a mismatched char (fallback(leave()) without consuming, so the
    // parent body re-processes the terminator).
    // -------------------------------------------------------------------
    esc_simple: {
      rules: [
        // consume the escape char (n, t, r, 0, \, ', ") and leave.
        // bare `\z` / unknown escapes also get emitted as
        // string_escape here; rust flags them at compile time.
        fallback({ token: TOKENS.string_escape, exit: true }),
      ],
    },

    esc_unicode: {
      rules: [
        match(HEX, TOKENS.string_escape),
        match("_", TOKENS.string_escape),
        match("}", TOKENS.string_escape, leave()),
        fallback(leave()),
      ],
    },

    esc_hex: {
      rules: [match(HEX, TOKENS.string_escape), fallback(leave())],
    },

    // expect closing `'` and leave to main
    char_literal_close: {
      rules: [match("'", TOKENS.string, leave()), fallback(leave())],
    },

    // -------------------------------------------------------------------
    // lifetime_token — entered after probe rewinds to the `'`.
    // the leading `'` is punctuation, the identifier body is tagged
    // `lifetime`. the reclassifier pipeline may later extend a lifetime
    // token forward to swallow a trailing type identifier (e.g. `str`
    // in `&'a str`), which is why the body itself is kept minimal here.
    // -------------------------------------------------------------------
    lifetime_token: {
      rules: [match("'", TOKENS.punctuation, goto("lifetime_body")), fallback(leave())],
    },

    lifetime_body: {
      rules: [match(["_", ALNUM], TOKENS.lifetime), fallback(leave())],
    },

    // byte char literal body (after b' which is already consumed).
    // main is the parent on the stack. shares the esc_* sub-states
    // with regular string/char bodies.
    char_body: {
      rules: [
        match("\\u{", TOKENS.string_escape, enter("esc_unicode")),
        match("\\x", TOKENS.string_escape, enter("esc_hex")),
        match("\\", TOKENS.string_escape, enter("esc_simple")),
        match("'", TOKENS.string, leave()),
        fallback({ token: TOKENS.string, ...goto("char_literal_close") }),
      ],
    },

    // -------------------------------------------------------------------
    // attribute states — granular tokenization of #[...] / #![...]
    // -------------------------------------------------------------------

    // expect opening `[` after sigil
    attribute_open: {
      rules: [match("[", TOKENS.punctuation, goto("attribute_body")), fallback(leave())],
    },

    attribute_body: {
      rules: [
        match("]", TOKENS.punctuation, leave()),
        match("(", TOKENS.punctuation, enter("attribute_parens")),
        match("[", TOKENS.punctuation, enter("attribute_brackets")),
        match([",", "="], TOKENS.punctuation),
        within('"', '"', TOKENS.string, { escape: "\\" }),
        on([" ", "\t", "\n", "\r"]),
        match(["_", ALNUM], TOKENS.attribute),
        match(["-", ":"], TOKENS.attribute),
      ],
    },

    attribute_parens: {
      rules: [
        match(")", TOKENS.punctuation, leave()),
        match("(", TOKENS.punctuation, enter("attribute_parens")),
        match([",", "="], TOKENS.punctuation),
        within('"', '"', TOKENS.string, { escape: "\\" }),
        on([" ", "\t", "\n", "\r"]),
        match(["_", ALNUM], TOKENS.attribute),
        match(["-", ":"], TOKENS.attribute),
      ],
    },

    attribute_brackets: {
      rules: [
        match("]", TOKENS.punctuation, leave()),
        match("[", TOKENS.punctuation, enter("attribute_brackets")),
        match([",", "="], TOKENS.punctuation),
        within('"', '"', TOKENS.string, { escape: "\\" }),
        on([" ", "\t", "\n", "\r"]),
        match(["_", ALNUM], TOKENS.attribute),
        match(["-", ":"], TOKENS.attribute),
      ],
    },

    // -------------------------------------------------------------------
    // number states — decimal integers and floats
    // main pushes one frame, phases move with goto and every exit pops it with leave
    // -------------------------------------------------------------------
    number: {
      rules: [
        match(["_", DIGIT], TOKENS.number),
        // dot followed by a digit is a decimal point
        // dot followed by dot is the range operator (..)
        // dot alone could be method call — leave for main
        match("..", TOKENS.operator, leave()),
        match(".", TOKENS.number, goto("decimal")),
        // the exponent indicator splits out as its own operator token
        match(["e", "E"], TOKENS.operator, goto("exponent_sign")),
        // type suffixes
        keyword(ALL_SUFFIXES, leave(), TOKENS.class_name),
        fallback(leave()),
      ],
    },

    decimal: {
      rules: [
        match(["_", DIGIT], TOKENS.number),
        match(["e", "E"], TOKENS.operator, goto("exponent_sign")),
        keyword(FLOAT_SUFFIXES, leave(), TOKENS.class_name),
        fallback(leave()),
      ],
    },

    exponent_sign: {
      rules: [
        match(["+", "-"], TOKENS.number, goto("exponent_digits")),
        match(DIGIT, TOKENS.number, goto("exponent_digits")),
        fallback(leave()),
      ],
    },

    exponent_digits: {
      rules: [
        match(["_", DIGIT], TOKENS.number),
        keyword(FLOAT_SUFFIXES, leave(), TOKENS.class_name),
        fallback(leave()),
      ],
    },

    hex_number: {
      rules: [
        match(["_", HEX], TOKENS.number),
        keyword(INT_SUFFIXES, leave(), TOKENS.class_name),
        fallback(leave()),
      ],
    },

    octal_number: {
      rules: [
        match(["_", range([["0", "7"]])], TOKENS.number),
        keyword(INT_SUFFIXES, leave(), TOKENS.class_name),
        fallback(leave()),
      ],
    },

    binary_number: {
      rules: [
        match(["_", "0", "1"], TOKENS.number),
        keyword(INT_SUFFIXES, leave(), TOKENS.class_name),
        fallback(leave()),
      ],
    },
  },
});
