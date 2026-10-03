import {
  ALNUM,
  DIGIT,
  HEX,
  LETTER,
  enter,
  fallback,
  goto,
  keyword,
  leave,
  match,
  on,
  range,
} from "@twinkleplop/core";
import type { GrammarRule, GrammarState } from "@twinkleplop/core";
import * as T from "@twinkleplop/core/tokens";

const NON_ASCII = range([[0x80, 0xffff]]);
const START = ["_", "$", LETTER, NON_ASCII];
const CONTINUE = ["_", "$", ALNUM, NON_ASCII];
const NL = ["\r\n", "\n", "\r"];
const SPLICE = ["\\\r\n", "\\\n", "\\\r"];
const SPACE = on([" ", "\t", "\v", "\f"]);
const OPERATORS = [
  "%:%:",
  "##",
  "->",
  "++",
  "--",
  "<<=",
  ">>=",
  "<<",
  ">>",
  "<=",
  ">=",
  "==",
  "!=",
  "&&",
  "||",
  "*=",
  "/=",
  "%=",
  "+=",
  "-=",
  "&=",
  "^=",
  "|=",
  "+",
  "-",
  "*",
  "/",
  "%",
  "&",
  "|",
  "^",
  "~",
  "!",
  "=",
  "<",
  ">",
  "?",
  "#",
  "%:",
];
const PUNCTUATION = [
  "...",
  "::",
  "<:",
  ":>",
  "<%",
  "%>",
  "[",
  "]",
  "(",
  ")",
  "{",
  "}",
  ";",
  ",",
  ".",
  ":",
];
const WORD_OPERATORS = [
  "and",
  "and_eq",
  "bitand",
  "bitor",
  "compl",
  "not",
  "not_eq",
  "or",
  "or_eq",
  "xor",
  "xor_eq",
];
const PREFIXES = ["", "u8", "u", "U", "L"];
const sealed = (rule: GrammarRule): GrammarRule => ({ ...rule, seal: true });

export function code_rules(words: string[], cpp = false): GrammarRule[] {
  return [
    SPACE,
    on(SPLICE),
    on(NL, goto("line_start")),
    match("//", T.comment, goto("line_comment")),
    match("/*", T.comment, goto("block_code")),
    ...(cpp
      ? PREFIXES.map(
          (prefix): GrammarRule => ({
            match_delimited: {
              start: prefix + 'R"',
              open: "(",
              close: ")",
              end: '"',
              max_length: 16,
              exclude: "()\\",
            },
            token: T.string,
            ...enter("literal_end"),
          }),
        )
      : []),
    sealed(
      match(
        PREFIXES.map((p) => p + '"'),
        T.string,
        enter("string"),
      ),
    ),
    sealed(
      match(
        PREFIXES.map((p) => p + "'"),
        T.string,
        enter("character"),
      ),
    ),
    on([...words, "true", "false", ...(cpp ? WORD_OPERATORS : [])], enter("word_probe")),
    sealed(match(DIGIT, T.number, enter("number"))),
    sealed(
      match(
        Array.from({ length: 10 }, (_, n) => "." + n),
        T.number,
        enter("number"),
      ),
    ),
    sealed(match([...OPERATORS, ...(cpp ? ["<=>", ".*", "->*"] : [])], T.operator)),
    sealed(match(PUNCTUATION, T.punctuation)),
    sealed(match(["\\u", "\\U", ...START], T.identifier, enter("identifier"))),
  ];
}

export function shared_states(words: string[], cpp = false): Record<string, GrammarState> {
  const block = (after: string): GrammarState => ({
    rules: [
      match("*/", T.comment, goto(after)),
      match(SPLICE, T.comment),
      match(NL, T.comment, goto("block_line")),
      fallback({ token: T.comment }),
    ],
  });
  const quoted = (quote: string): GrammarState => ({
    rules: [
      match(SPLICE, T.string_escape),
      match("\\", T.string_escape, enter("escape")),
      match(quote, T.string, cpp ? goto("literal_end") : leave()),
      on(NL, leave()),
      fallback({ token: T.string }),
    ],
  });
  const header = (end: string): GrammarState => ({
    rules: [match(end, T.string, leave()), on(NL, leave()), fallback({ token: T.string })],
  });
  return {
    line_start: {
      rules: [
        SPACE,
        on(SPLICE),
        on(NL),
        match("/*", T.comment, goto("block_line")),
        sealed(match(["##", "%:%:"], T.operator, goto("code"))),
        match(["#", "%:"], T.keyword, goto("directive")),
        fallback(goto("code")),
      ],
    },
    directive: {
      rules: [
        SPACE,
        on(SPLICE),
        on(NL, goto("line_start")),
        match("/*", T.comment, goto("block_directive")),
        keyword(cpp ? ["include"] : ["include", "embed"], goto("header")),
        keyword(
          [
            "define",
            "undef",
            "if",
            "ifdef",
            "ifndef",
            "elif",
            "elifdef",
            "elifndef",
            "else",
            "endif",
            "line",
            "error",
            "warning",
            "pragma",
          ],
          goto("code"),
        ),
        fallback(goto("code")),
      ],
    },
    header: {
      rules: [
        SPACE,
        on(SPLICE),
        on(NL, goto("line_start")),
        match("/*", T.comment, goto("block_header")),
        match("<", T.string, enter("header_angle")),
        match('"', T.string, enter("header_quote")),
        fallback(goto("code")),
      ],
    },
    header_angle: header(">"),
    header_quote: header('"'),
    line_comment: {
      rules: [match(SPLICE, T.comment), on(NL, goto("line_start")), fallback({ token: T.comment })],
    },
    block_line: {
      rules: [match("*/", T.comment, goto("line_start")), fallback({ token: T.comment })],
    },
    block_code: block("code"),
    block_directive: block("directive"),
    block_header: block("header"),
    string: quoted('"'),
    character: quoted("'"),
    escape: {
      rules: [
        ...(cpp ? [match(["x{", "u{", "o{", "N{"], T.string_escape, goto("escape_braced"))] : []),
        match("x", T.string_escape, goto("escape_hex")),
        match("u", T.string_escape, goto("escape_u4")),
        match("U", T.string_escape, goto("escape_u8")),
        match(range([["0", "7"]]), T.string_escape, goto("escape_o2")),
        match("\r\n", T.string_escape, leave()),
        fallback({ token: T.string_escape, ...leave() }),
      ],
    },
    escape_hex: { rules: [match(HEX, T.string_escape), fallback(leave())] },
    ...Object.fromEntries(
      Array.from({ length: 8 }, (_, i) => [
        "escape_u" + (i + 1),
        {
          rules: [
            match(HEX, T.string_escape, i === 0 ? leave() : goto("escape_u" + i)),
            fallback(leave()),
          ],
        },
      ]),
    ),
    escape_o2: {
      rules: [match(range([["0", "7"]]), T.string_escape, goto("escape_o1")), fallback(leave())],
    },
    escape_o1: { rules: [match(range([["0", "7"]]), T.string_escape, leave()), fallback(leave())] },
    // preprocessing numbers include invalid literals and exponent signs
    number: {
      rules: [
        match(["e", "E", "p", "P"], T.number, goto("number_sign")),
        match([".", "'", ...CONTINUE], T.number),
        fallback(leave()),
      ],
    },
    number_sign: { rules: [match(["+", "-"], T.number, goto("number")), fallback(goto("number"))] },
    // keyword boundaries must include unicode and escaped identifier characters
    word_probe: {
      mode: "probe",
      fallback: "word_token",
      rules: [
        on(["\\u", "\\U", ...CONTINUE], enter("identifier")),
        on(range([[0, 127]]), enter("word_token")),
      ],
    },
    word_token: {
      rules: [
        keyword(["true", "false"], leave(), T.boolean),
        keyword(words, leave()),
        ...(cpp ? [keyword(WORD_OPERATORS, leave(), T.operator)] : []),
        fallback(leave()),
      ],
    },
    identifier: {
      rules: [
        match("\\", T.identifier, enter("identifier_escape")),
        match(CONTINUE, T.identifier),
        fallback(leave()),
      ],
    },
    identifier_escape: { rules: [match(["u", "U"], T.identifier, leave()), fallback(leave())] },
    ...(cpp
      ? {
          escape_braced: {
            rules: [
              match("}", T.string_escape, leave()),
              on(['"', "'", ...NL], leave()),
              fallback({ token: T.string_escape }),
            ],
          },
          literal_end: {
            rules: [match(START, T.string, goto("literal_suffix")), fallback(leave())],
          },
          literal_suffix: { rules: [match(CONTINUE, T.string), fallback(leave())] },
        }
      : {}),
  };
}
