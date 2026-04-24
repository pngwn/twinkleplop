// Python grammar for twinkleplop syntax highlighting.
//
// Scope:
//   - Python 3.12+ lexical grammar per the language reference (§2).
//   - All numeric forms: decimal / hex 0x / octal 0o / binary 0b ints with
//     underscores; floats with leading/trailing dot and exponents; imaginary
//     j/J suffix; pep 515 underscore digit separators.
//   - All 35 hard keywords; True/False emitted as `boolean`, None as `keyword`.
//   - Soft keywords (match, case, _, type) emit as `identifier` — context
//     promotion is a parser/reclassifier concern.
//   - Type heuristic: PascalCase identifiers (uppercase first letter) and the
//     hardcoded lowercase builtin types (int, str, list, dict, ...) emit as
//     `class_name`. This catches user-defined classes, exceptions, generics
//     (T, K, V), typing-module names (Optional, Union, List, ...), and pep
//     585 generic builtins. False positives are limited to identifiers that
//     violate PEP 8's class-naming convention.
//   - All string literals and all allowed prefix combinations per pep 701 + pep
//     750: plain / bytes / raw / u / f / t and combined (rb, br, rf, fr, rt,
//     tr). All 2-letter prefixes accept both orderings and every case mix.
//   - Single, double, triple-single, triple-double quoted strings. Newlines
//     preserved in triple-quoted.
//   - f-string / t-string replacement fields {expr [!conv] [:spec]} with brace
//     depth tracking, nested dicts/sets, arbitrary expression content,
//     reuse of the outer quote character (pep 701), and format specs with
//     embedded replacement fields.
//   - Operators with longest-match ordering (**=, //=, <<=, >>=, :=, ..., ->).
//   - Line comments (#). Line continuation backslash (handled as operator).
//   - Non-ASCII identifier characters (u+0080..u+ffff approximated).
//
// Known limitations:
//   - INDENT / DEDENT tokens are not synthesized. Indentation is colored as
//     plain whitespace. A parser-level feature we do not need for highlighting.
//   - `.5` style floats with leading dot are NOT recognized as numbers; `.`
//     is always tokenized as punctuation and the following digits as an
//     integer. `5.` (trailing dot) and `1.5` (interior dot) do work.
//     This is the pragmatic trade-off JS / Rust grammars also make.
//   - f-string debug specifier `=` is emitted as an operator, not a dedicated
//     token — distinguishing `f"{x=}"` from `f"{x==y}"` requires parser-level
//     context that the grammar does not carry. Themes that want debug
//     highlighting need a reclassifier.
//   - Soft keywords (match, case, _, type) tokenize as identifiers even when
//     used as keywords. The spec is explicit that this distinction is made at
//     the parser level; we follow suit.
//   - self, cls, and the __builtins__ set are plain identifiers. A
//     reclassifier can promote these if a theme wants them styled.
//   - Unicode identifier normalization (nfkc) is NOT applied. The tokenizer
//     accepts any non-ASCII codepoint in u+0080..u+ffff as an identifier
//     character, which over-accepts per pep 3131 but matches what tree-sitter
//     and pygments do in practice. Astral-plane codepoints (u+10000+) do not
//     tokenize as identifier characters.
//   - Encoding declarations (# -*- coding: ... -*-) tokenize as plain
//     comments — a reclassifier can sub-tokenize them if desired.
//   - Bytes literals are emitted as `string`. Distinguishing bytes content
//     requires a reclassifier (the prefix letters are visible in the source).
//   - Format spec content inside f-string replacement fields (`>10`, `.3f`,
//     `*^20`, ...) emits as the custom `format` token, NOT `string`. Themes
//     that don't recognize `format` will fall back to default styling.
//   - Unrecognized escape sequences (\z, \q) are not flagged as invalid; the
//     grammar emits them as `string_escape` (backslash plus one char). The
//     3.12 SyntaxWarning is a runtime concern.
//   - Escape sub-tokenization: `\n`, `\t`, `\xNN`, `\uNNNN`, `\UNNNNNNNN`,
//     `\N{name}`, and `\NNN` octal are all emitted as `string_escape`.
//     Raw strings (`r`, `rb`, `br`, `rf`, `fr`, `rt`, `tr`) do not escape:
//     the backslash + next char stays as plain `string` content, matching
//     cpython semantics where `r"\n"` is two literal chars.

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
  keyword,
  leave,
  match,
  on,
  range,
  within,
} from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

// ---------------------------------------------------------------------------
// case-variant helper
//
// python string prefixes are case-insensitive. `rb` accepts rb, rB, Rb, RB.
// this helper enumerates every case variant so we can pass them to match().
// ---------------------------------------------------------------------------

function case_variants(s: string): string[] {
  if (s === "") return [""];
  const tail = case_variants(s.slice(1));
  const lo = s[0].toLowerCase();
  const up = s[0].toUpperCase();
  if (lo === up) return tail.map((t) => lo + t);
  return [...tail.map((t) => lo + t), ...tail.map((t) => up + t)];
}

function prefixes_from(stems: string[]): string[] {
  const out: string[] = [];
  for (const stem of stems) out.push(...case_variants(stem));
  return out;
}

// ---------------------------------------------------------------------------
// prefix sets
// ---------------------------------------------------------------------------

// non-f, non-t string prefixes. bare `""` is kept separate from the rest
// because it is matched together with the quote char (for `"hello"` with
// no prefix), while non-empty prefixes like `b`, `rb`, `B`, `rB` go
// through the probe split so the letters emit as `keyword` and the quote
// as `string` (matching the github theme's storage.type.string scope).
//
// plain prefixes are split into raw vs non-raw because escapes are tokenized
// as `string_escape` only in non-raw strings. raw strings (`r`, `rb`, `br`)
// keep `\` + next char as literal `string` content, matching cpython.
const NON_RAW_PLAIN_PREFIXES: string[] = prefixes_from(["b", "u"]);
const RAW_PLAIN_PREFIXES: string[] = prefixes_from(["r", "rb", "br"]);
const PLAIN_PREFIXES_NON_EMPTY: string[] = [...NON_RAW_PLAIN_PREFIXES, ...RAW_PLAIN_PREFIXES];

// f-string prefixes (also covers t-string — same lexical structure). split
// by raw semantics for the same reason as plain strings: `rf"\n"` keeps
// the backslash literal while `f"\n"` is a newline escape.
const NON_RAW_FT_PREFIXES: string[] = prefixes_from(["f", "t"]);
const RAW_FT_PREFIXES: string[] = prefixes_from(["rf", "fr", "rt", "tr"]);
const FT_PREFIXES: string[] = [...NON_RAW_FT_PREFIXES, ...RAW_FT_PREFIXES];

// all prefixes that go through the probe split — f/t and non-empty plain
// share the same commit state (prefix as keyword, quote as string) and
// the same fallback state (re-emit as identifier / class_name).
const ALL_PREFIXES = [...FT_PREFIXES, ...PLAIN_PREFIXES_NON_EMPTY];

// split by first-char case for the fallback path — a bare `f` / `b` that
// does NOT start a string literal (e.g. `f = 5`, `b = 5`) should still be
// emitted as a plain identifier, and `F` / `B` (uppercase start) as a
// class_name, matching how the grammar handles unprefixed identifiers.
const ALL_PREFIXES_LOWER_START = ALL_PREFIXES.filter((p) => p[0] >= "a" && p[0] <= "z");
const ALL_PREFIXES_UPPER_START = ALL_PREFIXES.filter((p) => p[0] >= "A" && p[0] <= "Z");

// build { prefix + quote } lists for each (string class × quote style).
const with_quote = (prefixes: string[], quote: string): string[] => prefixes.map((p) => p + quote);

// bare quote entries (no prefix). prefixed strings go through the probe
// split and never touch these match rules.
const BARE_TRIPLE_DQ = ['"""'];
const BARE_TRIPLE_SQ = ["'''"];
const BARE_SINGLE_DQ = ['"'];
const BARE_SINGLE_SQ = ["'"];

// ---------------------------------------------------------------------------
// keyword lists
// ---------------------------------------------------------------------------

// hard keywords from §2.3.1, minus True/False/None which are styled as
// boolean / keyword separately.
const KEYWORDS = [
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
];

export const BOOLEAN_LITERALS = ["True", "False"];
const NONE_LITERAL = ["None"];

// lowercase builtin types — pep 8 / pep 585 puts these in type-annotation
// positions (`x: list[int]`, `def f() -> dict: ...`) but they look like plain
// identifiers lexically. these emit as `builtin` (not `class_name`) because
// textmate-style grammars scope them as `support.type.python` → the github
// theme's `support` rule, which resolves to blue; user-defined PascalCase
// class names stay as `class_name` (the orange `entity.name` color).
export const BUILTIN_TYPES = [
  "int",
  "float",
  "complex",
  "bool",
  "str",
  "bytes",
  "bytearray",
  "memoryview",
  "list",
  "tuple",
  "dict",
  "set",
  "frozenset",
  "object",
  "range",
  "slice",
  "type",
];

// ---------------------------------------------------------------------------
// operator list (sorted by descending length for longest-match)
// ---------------------------------------------------------------------------

const OP_3CHAR = ["**=", "//=", "<<=", ">>=", "..."];
const OP_2CHAR = [
  "**",
  "//",
  "<<",
  ">>",
  "<=",
  ">=",
  "==",
  "!=",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "@=",
  ":=",
  "->",
];
const OP_1CHAR = ["+", "-", "*", "/", "%", "&", "|", "^", "~", "<", ">", "=", "@"];

// operators that include `.` — NOT in this list because `.` has special
// handling (attribute access / member). `!` is also excluded from 1-char ops
// because `!` is not a standalone operator in Python (only `!=` is valid).
const OP_ALL = [...OP_3CHAR, ...OP_2CHAR, ...OP_1CHAR];

// punctuation set — brackets, commas, semicolons, colons, dots.
// `:` and `{` / `}` need per-state handling inside f-string expressions,
// so we list them separately where relevant.
const PAREN_OPEN = ["(", "[", "{"];
const PAREN_CLOSE = [")", "]", "}"];

// non-ASCII codepoint range for identifier chars. approximation: accept
// any BMP codepoint >= 0x80. astral-plane chars are not handled.
const NON_ASCII = range([[0x80, 0xffff]]);

// custom token for f-string format spec content (`>10`, `.3f`, `x<*^20`, ...).
// not the same as `string` because it is a mini-language inside the
// replacement field rather than literal text.
// ---------------------------------------------------------------------------
// shared rule fragments
// ---------------------------------------------------------------------------

const WS = on([" ", "\t", "\n", "\r", "\f"]);
const LINE_COMMENT = within("#", "\n", TOKENS.comment);
const BACKSLASH_CONTINUATION = match("\\", TOKENS.operator);

// entry rules for all string / f-string / t-string prefix combinations.
//
// any non-empty prefix (`f`, `rf`, `fR`, `t`, `b`, `B`, `r`, `rb`, `Br`,
// `u`, ...) enters a probe that scans ahead for a quote. on commit the
// prefix is re-tokenised as `keyword` and the opening quote separately
// as `string` — matching how the github theme splits
// `storage.type.string.python` (red) from `string.quoted.*` (blue). the
// probe's fallback handles the `f = 5` case where the prefix is actually
// a plain identifier.
//
// bare quotes (no prefix) are matched whole; the commit state for the
// probe routes f / t prefixes to the f-string body states and plain
// prefixes (b, r, u, ...) to the regular string body states.
const string_entries = [
  // f/t prefixes → fstring body states (braces are interpolation)
  on(FT_PREFIXES, enter("fstring_prefix_probe")),
  // plain prefixes (b/r/u/rb/br/...) → regular string body states
  on(PLAIN_PREFIXES_NON_EMPTY, enter("plain_prefix_probe")),
  match(BARE_TRIPLE_DQ, TOKENS.string, enter("string_triple_dq")),
  match(BARE_TRIPLE_SQ, TOKENS.string, enter("string_triple_sq")),
  match(BARE_SINGLE_DQ, TOKENS.string, enter("string_single_dq")),
  match(BARE_SINGLE_SQ, TOKENS.string, enter("string_single_sq")),
];

// number entry rules. consumes the prefix / first digit, pushes the right
// continuation state.
const number_entries = [
  match(["0x", "0X"], TOKENS.number, enter("hex_number")),
  match(["0b", "0B"], TOKENS.number, enter("bin_number")),
  match(["0o", "0O"], TOKENS.number, enter("oct_number")),
  match(DIGIT, TOKENS.number, enter("number")),
];

// keyword / literal rules — word-boundary aware via keyword().
// builtin types come BEFORE the regular keywords so e.g. `int` resolves to
// `builtin` rather than being swallowed by a generic identifier rule;
// ordering relative to other keyword rules does not matter since the sets
// are disjoint.
// BUILTIN_TYPES and BOOLEAN_LITERALS are no longer matched as typed keywords
// at grammar time. they fall through to the identifier path and a restoration
// reclassifier (promote_by_text_set) upgrades them post-hoc, so consumers can
// opt out of the `builtin` / `boolean` classification.
const keyword_entries = [keyword(NONE_LITERAL), keyword(KEYWORDS)];

// identifier entry — split by case only so `type_identifier_body`'s rules
// stay reachable. both dispatches emit `identifier`; the restoration pass
// (promote_pascal_case) upgrades PascalCase names to `class_name` post-hoc.
// keeping two states lets us preserve the dispatch shape without doing the
// classification at lex time.
const uppercase_identifier_entry = match(UPPER, TOKENS.identifier, enter("type_identifier_body"));
const identifier_entry = match(
  ["_", LOWER, NON_ASCII],
  TOKENS.identifier,
  enter("identifier_body"),
);

// ---------------------------------------------------------------------------
// grammar
// ---------------------------------------------------------------------------

export default define_grammar({
  name: "python",

  states: {
    // =================================================================
    // main — top-level expression / statement context.
    // =================================================================
    main: {
      rules: [
        WS,
        LINE_COMMENT,

        // strings come before identifiers so `f"..."` / `r"..."` etc.
        // are recognized as strings, not identifier + string.
        ...string_entries,

        // numbers come before identifiers so `0x` etc. are recognized
        // as number prefixes, not identifier starts.
        ...number_entries,

        // keywords before identifiers; keyword() adds word-boundary.
        ...keyword_entries,

        // operators before `.` punctuation so `->` / `**=` / `:=` win.
        match(OP_ALL, TOKENS.operator),

        // backslash line continuation.
        BACKSLASH_CONTINUATION,

        // punctuation. `.` is here as a simple attribute-access
        // token — we do NOT support .5 leading-dot floats (see
        // known limitations).
        match(["(", ")", "[", "]", "{", "}", ",", ";", ":", "."], TOKENS.punctuation),

        // identifier starts last. uppercase first → `class_name`
        // (PascalCase = type per PEP 8 convention); other starts →
        // `identifier`.
        uppercase_identifier_entry,
        identifier_entry,
      ],
    },

    // =================================================================
    // identifier_body — continuation of an identifier.
    // =================================================================
    identifier_body: {
      rules: [match(["_", ALNUM, NON_ASCII], TOKENS.identifier), fallback(leave())],
    },

    // =================================================================
    // type_identifier_body — continuation of a PascalCase identifier.
    // emits plain `identifier` for the continuation chars so the whole
    // token coalesces into one identifier span. a restoration pass
    // (promote_pascal_case) upgrades the token to `class_name` afterward.
    // =================================================================
    type_identifier_body: {
      rules: [match(["_", ALNUM, NON_ASCII], TOKENS.identifier), fallback(leave())],
    },

    // =================================================================
    // number states — integer / float / hex / oct / bin continuations.
    //
    // each sub-state uses fallback(leave()) so that on a non-numeric
    // terminator, control pops back to whoever called the entry rule
    // — main for top-level numbers, fstring_expr_top / nested for
    // numbers inside f-string replacement fields. this is the rust /
    // javascript-arg pattern; the json pattern of fallback(goto("main"))
    // would skip past the f-string body / expression frames and break
    // state nesting (numbers inside `f"{5}"` would close the f-string).
    //
    // when number → float_decimal → float_exponent_sign nests via
    // enter(), a single non-numeric char triggers chained
    // fallback(leave()) calls (each fallback is no-consume), unwinding
    // the chain one frame at a time without consuming the terminator.
    // =================================================================
    number: {
      rules: [
        match(["_", DIGIT], TOKENS.number),
        match(".", TOKENS.number, enter("float_decimal")),
        match(["e", "E"], TOKENS.number, enter("float_exponent_sign")),
        match(["j", "J"], TOKENS.number, leave()),
        fallback(leave()),
      ],
    },

    float_decimal: {
      rules: [
        match(["_", DIGIT], TOKENS.number),
        match(["e", "E"], TOKENS.number, enter("float_exponent_sign")),
        match(["j", "J"], TOKENS.number, leave()),
        fallback(leave()),
      ],
    },

    float_exponent_sign: {
      rules: [
        match(["+", "-"], TOKENS.number, enter("float_exponent_digits")),
        match(DIGIT, TOKENS.number, enter("float_exponent_digits")),
        fallback(leave()),
      ],
    },

    float_exponent_digits: {
      rules: [
        match(["_", DIGIT], TOKENS.number),
        match(["j", "J"], TOKENS.number, leave()),
        fallback(leave()),
      ],
    },

    hex_number: {
      rules: [match(["_", HEX], TOKENS.number), fallback(leave())],
    },

    bin_number: {
      rules: [match(["_", "0", "1"], TOKENS.number), fallback(leave())],
    },

    oct_number: {
      rules: [match(["_", range([["0", "7"]])], TOKENS.number), fallback(leave())],
    },

    // =================================================================
    // plain (non-raw) string body states.
    //
    // bare strings and u / b / U / B prefixed strings share these four
    // content states — one per quote style. the leading `\` is re-
    // tokenised as `string_escape` and pushes the escape sub-machine
    // that recognises every python escape form (\n, \xNN, \uNNNN,
    // \UNNNNNNNN, \N{name}, \NNN octal, and any bare \x fallback).
    // raw strings (`r`, `rb`, `br`) route to rstring_* instead.
    // =================================================================
    string_single_dq: {
      rules: [
        match("\\", TOKENS.string_escape, enter("string_escape_start")),
        match('"', TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    string_single_sq: {
      rules: [
        match("\\", TOKENS.string_escape, enter("string_escape_start")),
        match("'", TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    string_triple_dq: {
      rules: [
        match("\\", TOKENS.string_escape, enter("string_escape_start")),
        match('"""', TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    string_triple_sq: {
      rules: [
        match("\\", TOKENS.string_escape, enter("string_escape_start")),
        match("'''", TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    // =================================================================
    // raw string body states — r / rb / br and case variants.
    //
    // `\` is NOT an escape introducer in python raw strings, but the
    // lexer still has to consume `\"` / `\'` as one unit so the quote
    // doesn't terminate the string. both chars emit as plain `string`
    // (no escape tokenisation), matching `r"\n"` = two literal chars.
    // =================================================================
    rstring_single_dq: {
      rules: [
        match("\\", TOKENS.string, enter("raw_esc_consume")),
        match('"', TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    rstring_single_sq: {
      rules: [
        match("\\", TOKENS.string, enter("raw_esc_consume")),
        match("'", TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    rstring_triple_dq: {
      rules: [
        match("\\", TOKENS.string, enter("raw_esc_consume")),
        match('"""', TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    rstring_triple_sq: {
      rules: [
        match("\\", TOKENS.string, enter("raw_esc_consume")),
        match("'''", TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    // generic one-character consumer for the char after `\` in raw
    // strings — emits it as plain `string` (coalesces with surrounding
    // string content) and pops back to the parent body state.
    raw_esc_consume: {
      rules: [fallback({ token: TOKENS.string, exit: true })],
    },

    // =================================================================
    // escape sub-machine — entered after the leading `\` has been
    // emitted as `string_escape`. each sub-state is a sideways (goto)
    // transition so the stack depth stays at +1 above the string body;
    // the final `leave()` in the terminal state (or a `fallback(leave())`
    // on a mismatched char) pops back into the parent string body.
    //
    // fallbacks in each digit slot use `leave()` without consuming so
    // partial escapes like `\x` (no hex), `\u12` (short), `\Nfoo` (no
    // brace) gracefully end the escape token and return the remaining
    // chars to the string body for normal tokenisation.
    // =================================================================
    string_escape_start: {
      rules: [
        match("x", TOKENS.string_escape, goto("esc_hex_d1")),
        match("u", TOKENS.string_escape, goto("esc_u4_d1")),
        match("U", TOKENS.string_escape, goto("esc_u8_d1")),
        match("N", TOKENS.string_escape, goto("esc_named_open")),
        match(range([["0", "7"]]), TOKENS.string_escape, goto("esc_oct_d2")),
        fallback({ token: TOKENS.string_escape, exit: true }),
      ],
    },

    // \xNN — hex byte escape, up to 2 hex digits.
    esc_hex_d1: {
      rules: [match(HEX, TOKENS.string_escape, goto("esc_hex_d2")), fallback(leave())],
    },
    esc_hex_d2: {
      rules: [match(HEX, TOKENS.string_escape, leave()), fallback(leave())],
    },

    // \uNNNN — short unicode escape, up to 4 hex digits.
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

    // \UNNNNNNNN — long unicode escape, up to 8 hex digits.
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

    // \N{name} — named unicode escape. body accepts the A-Z/0-9/space/
    // hyphen/underscore subset of unicode name chars; bail out on
    // anything else (newline, quote) so a malformed `\N{...` doesn't
    // swallow the string terminator.
    esc_named_open: {
      rules: [match("{", TOKENS.string_escape, goto("esc_named_body")), fallback(leave())],
    },
    esc_named_body: {
      rules: [
        match("}", TOKENS.string_escape, leave()),
        match([ALNUM, "_", " ", "-"], TOKENS.string_escape),
        fallback(leave()),
      ],
    },

    // \NNN octal — up to 3 octal digits. the first digit is consumed
    // by string_escape_start, so these states handle only the 2nd and
    // 3rd slots.
    esc_oct_d2: {
      rules: [
        match(range([["0", "7"]]), TOKENS.string_escape, goto("esc_oct_d3")),
        fallback(leave()),
      ],
    },
    esc_oct_d3: {
      rules: [match(range([["0", "7"]]), TOKENS.string_escape, leave()), fallback(leave())],
    },

    // =================================================================
    // string prefix disambiguation.
    //
    // the prefix letters (`f`, `rf`, `fR`, `t`, `b`, `B`, `r`, `rb`,
    // `Br`, `u`, ...) are consumed by the appropriate probe without
    // emitting. the probe scans one more char for a quote; on a hit it
    // rewinds and the commit state re-tokenises the run as keyword +
    // string. on a miss the shared fallback rewinds and emits the
    // prefix as a plain identifier (or class_name for uppercase-start
    // prefixes like `F` / `B` / `Rf`).
    //
    // f/t and plain prefixes use separate probe + commit states because
    // they route to different body states on commit — f/t prefixes go
    // to fstring_body_* (where `{` opens an interpolation), plain ones
    // go to string_* (no interpolation).
    // =================================================================
    fstring_prefix_probe: {
      mode: "probe",
      fallback: "string_prefix_fallback",
      rules: [
        // `enter` (push) rather than `goto` (sideways) so that when
        // the probe commits / falls back the parent state (main /
        // fstring_expr_top / ...) is pushed back onto the stack for
        // the target's eventual `leave()` to pop back to.
        on(['"""', "'''", '"', "'"], enter("fstring_prefix_commit")),
        // probe mode SKIPS unmatched characters and keeps scanning —
        // for `f = '...'` that would falsely resolve to a commit on
        // the later `'`. bail out explicitly on anything non-quote.
        fallback(enter("string_prefix_fallback")),
      ],
    },

    // commit step 1: emit the prefix letters as `keyword` and route
    // to the correct quote-matching state based on raw-ness. splitting
    // the quote match into its own state lets us target raw_fstring_*
    // bodies for rf/fr/rt/tr and the regular fstring_* bodies for f/t.
    fstring_prefix_commit: {
      rules: [
        match(NON_RAW_FT_PREFIXES, TOKENS.keyword, goto("fstring_prefix_quote")),
        match(RAW_FT_PREFIXES, TOKENS.keyword, goto("raw_fstring_prefix_quote")),
      ],
    },

    // commit step 2 (non-raw): match the quote and enter the f-string
    // body that tokenises escapes.
    fstring_prefix_quote: {
      rules: [
        match('"""', TOKENS.string, goto("fstring_body_triple_dq")),
        match("'''", TOKENS.string, goto("fstring_body_triple_sq")),
        match('"', TOKENS.string, goto("fstring_body_single_dq")),
        match("'", TOKENS.string, goto("fstring_body_single_sq")),
      ],
    },

    // commit step 2 (raw): match the quote and enter the raw f-string
    // body where `\` stays as literal `string`.
    raw_fstring_prefix_quote: {
      rules: [
        match('"""', TOKENS.string, goto("raw_fstring_body_triple_dq")),
        match("'''", TOKENS.string, goto("raw_fstring_body_triple_sq")),
        match('"', TOKENS.string, goto("raw_fstring_body_single_dq")),
        match("'", TOKENS.string, goto("raw_fstring_body_single_sq")),
      ],
    },

    plain_prefix_probe: {
      mode: "probe",
      fallback: "string_prefix_fallback",
      rules: [
        on(['"""', "'''", '"', "'"], enter("plain_prefix_commit")),
        fallback(enter("string_prefix_fallback")),
      ],
    },

    // commit step 1 (plain prefixes): dispatch raw (r / rb / br) to
    // rstring_* bodies, non-raw (b / u) to string_* bodies.
    plain_prefix_commit: {
      rules: [
        match(NON_RAW_PLAIN_PREFIXES, TOKENS.keyword, goto("plain_prefix_quote")),
        match(RAW_PLAIN_PREFIXES, TOKENS.keyword, goto("raw_prefix_quote")),
      ],
    },

    plain_prefix_quote: {
      rules: [
        match('"""', TOKENS.string, goto("string_triple_dq")),
        match("'''", TOKENS.string, goto("string_triple_sq")),
        match('"', TOKENS.string, goto("string_single_dq")),
        match("'", TOKENS.string, goto("string_single_sq")),
      ],
    },

    raw_prefix_quote: {
      rules: [
        match('"""', TOKENS.string, goto("rstring_triple_dq")),
        match("'''", TOKENS.string, goto("rstring_triple_sq")),
        match('"', TOKENS.string, goto("rstring_single_dq")),
        match("'", TOKENS.string, goto("rstring_single_sq")),
      ],
    },

    // shared fallback for both probes: re-tokenise the consumed prefix
    // letters as a plain identifier and route to the appropriate
    // continuation state based on case. class_name promotion for
    // PascalCase starts happens in the restoration reclassifier.
    string_prefix_fallback: {
      rules: [
        match(ALL_PREFIXES_LOWER_START, TOKENS.identifier, goto("identifier_body")),
        match(ALL_PREFIXES_UPPER_START, TOKENS.identifier, goto("type_identifier_body")),
      ],
    },

    // =================================================================
    // f-string / t-string body states (non-raw).
    //
    // body sees literal chars, {{ / }} escaped braces, { → push
    // fstring_expr_top (replacement field), \ → escape (via the
    // shared string_escape_start sub-machine), closing quote → leave.
    // =================================================================
    // `{` entering an f-string replacement field is the textmate
    // `punctuation.section.embedded` scope — the github theme paints that
    // red, distinct from regular punctuation. we use the `expression`
    // token for it (mapped to the same red as keyword in our palette).
    fstring_body_single_dq: {
      rules: [
        match("\\", TOKENS.string_escape, enter("string_escape_start")),
        match("{{", TOKENS.string),
        match("}}", TOKENS.string),
        match("{", TOKENS.expression, enter("fstring_expr_top")),
        match('"', TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    fstring_body_single_sq: {
      rules: [
        match("\\", TOKENS.string_escape, enter("string_escape_start")),
        match("{{", TOKENS.string),
        match("}}", TOKENS.string),
        match("{", TOKENS.expression, enter("fstring_expr_top")),
        match("'", TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    fstring_body_triple_dq: {
      rules: [
        match("\\", TOKENS.string_escape, enter("string_escape_start")),
        match("{{", TOKENS.string),
        match("}}", TOKENS.string),
        match("{", TOKENS.expression, enter("fstring_expr_top")),
        match('"""', TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    fstring_body_triple_sq: {
      rules: [
        match("\\", TOKENS.string_escape, enter("string_escape_start")),
        match("{{", TOKENS.string),
        match("}}", TOKENS.string),
        match("{", TOKENS.expression, enter("fstring_expr_top")),
        match("'''", TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    // =================================================================
    // raw f-string / t-string body states — rf / fr / rt / tr.
    //
    // identical to the non-raw bodies except `\` does not introduce an
    // escape: backslash + next char stay as plain `string`, matching
    // `rf"\n"` = two literal chars. replacement fields ({expr}) and
    // literal braces ({{ }}) still work the same way.
    // =================================================================
    raw_fstring_body_single_dq: {
      rules: [
        match("\\", TOKENS.string, enter("raw_esc_consume")),
        match("{{", TOKENS.string),
        match("}}", TOKENS.string),
        match("{", TOKENS.expression, enter("fstring_expr_top")),
        match('"', TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    raw_fstring_body_single_sq: {
      rules: [
        match("\\", TOKENS.string, enter("raw_esc_consume")),
        match("{{", TOKENS.string),
        match("}}", TOKENS.string),
        match("{", TOKENS.expression, enter("fstring_expr_top")),
        match("'", TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    raw_fstring_body_triple_dq: {
      rules: [
        match("\\", TOKENS.string, enter("raw_esc_consume")),
        match("{{", TOKENS.string),
        match("}}", TOKENS.string),
        match("{", TOKENS.expression, enter("fstring_expr_top")),
        match('"""', TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    raw_fstring_body_triple_sq: {
      rules: [
        match("\\", TOKENS.string, enter("raw_esc_consume")),
        match("{{", TOKENS.string),
        match("}}", TOKENS.string),
        match("{", TOKENS.expression, enter("fstring_expr_top")),
        match("'''", TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    // =================================================================
    // fstring_expr_top — top-level replacement field.
    //
    // entered from an fstring_body on `{`. the parent on the stack is
    // the fstring_body state, so `}` (leave) pops back to the string
    // body. rules special to the top level:
    //   - `:` → goto fstring_format_spec (format spec begins)
    //   - `!s|!r|!a` → conversion marker, stays
    //   - `}` → leave (close replacement field)
    // =================================================================
    fstring_expr_top: {
      rules: [
        WS,
        LINE_COMMENT,
        ...string_entries,
        ...number_entries,

        // conversion specifiers MUST come before operators so `!r`
        // is not parsed as `!` + `r`. tokenised as `expression` (the
        // same token we use for the surrounding `{` / `}`) because
        // they're part of the same textmate `section.embedded`
        // scope — github paints the whole mini-language red.
        match(["!s", "!r", "!a"], TOKENS.expression),

        // operators including `:=` and `==` (sorted longest-first).
        match(OP_ALL, TOKENS.operator),
        BACKSLASH_CONTINUATION,

        // `}` closes the replacement field — paired with the opening
        // `{` from the body state, same `section.embedded` scope.
        match("}", TOKENS.expression, leave()),
        // `:` enters format spec mode.
        match(":", TOKENS.punctuation, goto("fstring_format_spec")),
        // `{` nested inside expression → dict/set literal (plain
        // punctuation, not an embedded-section marker).
        match("{", TOKENS.punctuation, enter("fstring_expr_nested")),
        // `(` `[` nested groups.
        match(["(", "["], TOKENS.punctuation, enter("fstring_expr_nested")),
        // unmatched `)` `]` treated as close of a nested scope we
        // did not open (malformed); leave to recover.
        match([")", "]"], TOKENS.punctuation, leave()),
        // `,` `;` `.` stay in state.
        match([",", ";", "."], TOKENS.punctuation),

        ...keyword_entries,
        uppercase_identifier_entry,
        identifier_entry,
      ],
    },

    // =================================================================
    // fstring_expr_nested — inside a nested (, [, or { within an
    // f-string replacement field.
    //
    // `:` is ordinary punctuation here (dict key separator, slice,
    // annotation); format-spec mode is NOT entered because we are
    // not at the top level of the replacement.
    // =================================================================
    fstring_expr_nested: {
      rules: [
        WS,
        LINE_COMMENT,
        ...string_entries,
        ...number_entries,
        match(OP_ALL, TOKENS.operator),
        BACKSLASH_CONTINUATION,

        // any close delimiter pops one level. assumes balanced code.
        match(PAREN_CLOSE, TOKENS.punctuation, leave()),
        // any open delimiter pushes another nested level.
        match(PAREN_OPEN, TOKENS.punctuation, enter("fstring_expr_nested")),
        // punctuation including `:` (here it is just a separator).
        match([",", ";", ".", ":"], TOKENS.punctuation),

        ...keyword_entries,
        uppercase_identifier_entry,
        identifier_entry,
      ],
    },

    // =================================================================
    // fstring_format_spec — after `:` in an f-string replacement field.
    //
    // most chars are literal format spec content (emitted as string).
    // `{` opens a nested replacement field. `}` closes the spec AND
    // the parent replacement field — since format_spec was entered
    // via goto (replacing fstring_expr_top on the stack), leave()
    // here pops back to the fstring_body.
    // =================================================================
    fstring_format_spec: {
      rules: [
        match("{{", TOKENS.format),
        match("}}", TOKENS.format),
        // `{` opens a nested replacement inside the format spec
        // (e.g. `f"{x:{width}}"`) — still a section-embedded marker.
        match("{", TOKENS.expression, enter("fstring_expr_top")),
        // `}` closes the outer replacement field; format_spec was
        // entered via goto so leave() here pops back to the body.
        match("}", TOKENS.expression, leave()),
        fallback({ token: TOKENS.format }),
      ],
    },
  },
});
