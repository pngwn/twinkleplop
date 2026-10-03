// scope covers powershell scripts and data with nested interpolation and here strings
// limitations include keyword promotion in arguments and hashtable keys
// bare word indices are treated as types and dash operators win over parameters
// malformed numbers are split and numeric values are not validated
// dynamic keywords and legacy doubled quote rescanning are not supported
// comments do not nest and here string footers must start at column zero

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
} from "@twinkleplop/core";
import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";
import { UNICODE_NAME } from "./unicode.js";

const SINGLE = ["'", "‘", "’", "‚", "‛"];
const DOUBLE = ['"', "“", "”", "„"];
const DASH = ["-", "–", "—", "―"];
const HSPACE = [
  " ",
  "\t",
  "\v",
  "\f",
  "\u00a0",
  "\u1680",
  "\u202f",
  "\u205f",
  "\u3000",
  range([[0x2000, 0x200a]]),
];
const NEWLINE = ["\r\n", "\n", "\r"];
const NAME = ["_", "?", ALNUM, UNICODE_NAME];
const WORD_END = [
  ...HSPACE,
  ...NEWLINE,
  "(",
  ")",
  "{",
  "}",
  "[",
  "]",
  ";",
  ",",
  "|",
  "&",
  "=",
  "+",
  "*",
  "%",
  "!",
  "<",
  ">",
];
const PARAMETERS_END = [...WORD_END, ".", ...SINGLE, ...DOUBLE, "$", "@"];
const pairs = (quotes: string[]) => quotes.flatMap((a) => quotes.map((b) => a + b));
const cases = (word: string): string[] =>
  [...word].reduce<string[]>((xs, c) => xs.flatMap((x) => [x + c, x + c.toUpperCase()]), [""]);

const VARIABLES = [
  match("${", TOKENS.variable, enter("braced_variable")),
  match(["$$", "$?", "$^"], TOKENS.variable),
  on("$", enter("variable_probe")),
];
const EXPANSIONS = [match("$(", TOKENS.punctuation, enter("paren")), ...VARIABLES];
const STRINGS = [
  match(
    SINGLE.map((q) => "@" + q),
    TOKENS.string,
    enter("here_header_single"),
  ),
  match(
    DOUBLE.map((q) => "@" + q),
    TOKENS.string,
    enter("here_header_double"),
  ),
  match(SINGLE, TOKENS.string, enter("single")),
  match(DOUBLE, TOKENS.string, enter("double")),
];
const SUFFIX = [
  match(["u", "U"], TOKENS.number, goto("unsigned_suffix")),
  match(["y", "s", "l", "n", "d"].flatMap(cases), TOKENS.number, goto("multiplier")),
  fallback(goto("multiplier")),
];
const REDIRECT = ["", "1", "2", "3", "4", "5", "6", "*"].flatMap((s) => [
  s + ">>",
  s + ">",
  s + ">&1",
  s + ">&2",
]);
const CODE = [
  on([...HSPACE, ...NEWLINE]),
  match("<#", TOKENS.comment, enter("block_comment")),
  match("#", TOKENS.comment, enter("line_comment")),
  ...STRINGS,
  ...EXPANSIONS,
  match("@(", TOKENS.punctuation, enter("paren")),
  match("@{", TOKENS.punctuation, enter("brace")),
  match("@", TOKENS.variable, enter("variable")),
  match("(", TOKENS.punctuation, enter("paren")),
  match("{", TOKENS.punctuation, enter("brace")),
  match("?[", TOKENS.operator, enter("bracket")),
  match("[", TOKENS.punctuation, enter("bracket")),
  match(REDIRECT, TOKENS.operator),
  match(["0x", "0X"], TOKENS.number, enter("hex")),
  match(["0b", "0B"], TOKENS.number, enter("binary")),
  match(DIGIT, TOKENS.number, enter("integer")),
  match(
    Array.from({ length: 10 }, (_, n) => "." + n),
    TOKENS.number,
    enter("fraction"),
  ),
  match("..", TOKENS.operator),
  match([".", "::", "?."], TOKENS.punctuation, enter("member")),
  match("--%", TOKENS.operator, enter("verbatim_arguments")),
  match(
    [
      "??=",
      "??",
      "&&",
      "||",
      "++",
      "--",
      "+=",
      "-=",
      "*=",
      "/=",
      "%=",
      "=",
      "+",
      "*",
      "/",
      "%",
      "!",
      "|",
      "&",
      "?",
    ],
    TOKENS.operator,
  ),
  on(DASH, enter("dash_probe")),
  match([")", "}", "]", ";", ",", ":"], TOKENS.punctuation),
  match("`", TOKENS.identifier, enter("word_escape")),
  fallback({ token: TOKENS.identifier, ...enter("word") }),
];

export default define_grammar({
  name: "powershell",
  states: {
    main: { rules: CODE },
    paren: { rules: [match(")", TOKENS.punctuation, leave()), ...CODE] },
    brace: { rules: [match("}", TOKENS.punctuation, leave()), ...CODE] },
    bracket: {
      rules: [
        match("]", TOKENS.punctuation, leave()),
        match(["_", LETTER, UNICODE_NAME], TOKENS.type, enter("type_word")),
        ...CODE,
      ],
    },
    type_word: {
      rules: [match(["_", ".", "+", "`", ALNUM, UNICODE_NAME], TOKENS.type), fallback(leave())],
    },
    member: {
      rules: [
        on(HSPACE),
        match(["_", LETTER, UNICODE_NAME], TOKENS.property, goto("member_word")),
        fallback(leave()),
      ],
    },
    member_word: { rules: [match(["_", ALNUM, UNICODE_NAME], TOKENS.property), fallback(leave())] },
    word: {
      rules: [
        on(WORD_END, leave()),
        ...STRINGS,
        ...EXPANSIONS,
        match("`", TOKENS.identifier, enter("word_escape")),
        fallback({ token: TOKENS.identifier }),
      ],
    },
    word_escape: {
      rules: [
        match("\r\n", TOKENS.identifier, leave()),
        fallback({ token: TOKENS.identifier, ...leave() }),
      ],
    },
    variable_probe: {
      mode: "probe",
      fallback: "literal_dollar",
      rules: [on(NAME, enter("variable_start")), fallback(enter("literal_dollar"))],
    },
    variable_start: { rules: [match("$", TOKENS.variable, goto("variable"))] },
    literal_dollar: { rules: [match("$", TOKENS.string, leave())] },
    variable: {
      rules: [on("::", leave()), match([...NAME, ":"], TOKENS.variable), fallback(leave())],
    },
    braced_variable: {
      rules: [
        match("}", TOKENS.variable, leave()),
        match("`", TOKENS.variable, enter("variable_escape")),
        fallback({ token: TOKENS.variable }),
      ],
    },
    variable_escape: { rules: [fallback({ token: TOKENS.variable, ...leave() })] },
    dash_probe: {
      mode: "probe",
      fallback: "minus",
      rules: [
        on(["_", "?", LETTER, UNICODE_NAME], enter("parameter_start")),
        fallback(enter("minus")),
      ],
    },
    minus: { rules: [match(DASH, TOKENS.operator, leave())] },
    parameter_start: { rules: [match(DASH, TOKENS.parameter, goto("parameter"))] },
    parameter: {
      rules: [
        on(PARAMETERS_END, leave()),
        match(":", TOKENS.punctuation, leave()),
        fallback({ token: TOKENS.parameter }),
      ],
    },
    single: {
      rules: [
        match(pairs(SINGLE), TOKENS.string),
        match(SINGLE, TOKENS.string, leave()),
        fallback({ token: TOKENS.string }),
      ],
    },
    double: {
      rules: [
        match(pairs(DOUBLE), TOKENS.string),
        match(DOUBLE, TOKENS.string, leave()),
        match("`", TOKENS.string, enter("string_escape")),
        ...EXPANSIONS,
        fallback({ token: TOKENS.string }),
      ],
    },
    string_escape: {
      rules: [
        match("\r\n", TOKENS.string, leave()),
        fallback({ token: TOKENS.string, ...leave() }),
      ],
    },
    // header and body phases share one stack frame
    here_header_single: {
      rules: [
        match(HSPACE, TOKENS.string),
        match(NEWLINE, TOKENS.string, goto("here_line_single")),
        fallback(leave()),
      ],
    },
    here_header_double: {
      rules: [
        match(HSPACE, TOKENS.string),
        match(NEWLINE, TOKENS.string, goto("here_line_double")),
        fallback(leave()),
      ],
    },
    here_line_single: {
      rules: [
        match(
          SINGLE.map((q) => q + "@"),
          TOKENS.string,
          leave(),
        ),
        fallback(goto("here_body_single")),
      ],
    },
    here_line_double: {
      rules: [
        match(
          DOUBLE.map((q) => q + "@"),
          TOKENS.string,
          leave(),
        ),
        fallback(goto("here_body_double")),
      ],
    },
    here_body_single: {
      rules: [
        match(NEWLINE, TOKENS.string, goto("here_line_single")),
        fallback({ token: TOKENS.string }),
      ],
    },
    here_body_double: {
      rules: [
        match(NEWLINE, TOKENS.string, goto("here_line_double")),
        match("`", TOKENS.string, enter("string_escape")),
        ...EXPANSIONS,
        fallback({ token: TOKENS.string }),
      ],
    },
    block_comment: {
      rules: [match("#>", TOKENS.comment, leave()), fallback({ token: TOKENS.comment })],
    },
    line_comment: { rules: [on(NEWLINE, leave()), fallback({ token: TOKENS.comment })] },
    verbatim_arguments: {
      rules: [on([...NEWLINE, "|"], leave()), fallback({ token: TOKENS.string })],
    },
    // hexadecimal digits take precedence over suffixes
    integer: {
      rules: [
        match(DIGIT, TOKENS.number),
        on("..", leave()),
        match(".", TOKENS.number, goto("fraction")),
        match(["e", "E"], TOKENS.number, goto("exponent_sign")),
        ...SUFFIX,
      ],
    },
    fraction: {
      rules: [
        match(DIGIT, TOKENS.number),
        match(["e", "E"], TOKENS.number, goto("exponent_sign")),
        ...SUFFIX,
      ],
    },
    exponent_sign: {
      rules: [match(["+", ...DASH], TOKENS.number, goto("exponent")), fallback(goto("exponent"))],
    },
    exponent: { rules: [match(DIGIT, TOKENS.number), ...SUFFIX] },
    hex: { rules: [match(HEX, TOKENS.number), ...SUFFIX] },
    binary: { rules: [match(["0", "1"], TOKENS.number), ...SUFFIX] },
    unsigned_suffix: {
      rules: [
        match(["y", "s", "l"].flatMap(cases), TOKENS.number, goto("multiplier")),
        fallback(goto("multiplier")),
      ],
    },
    multiplier: {
      rules: [
        match(["k", "m", "g", "t", "p"].flatMap(cases), TOKENS.number, goto("multiplier_b")),
        fallback(leave()),
      ],
    },
    multiplier_b: { rules: [match(["b", "B"], TOKENS.number, leave()), fallback(leave())] },
  },
});
