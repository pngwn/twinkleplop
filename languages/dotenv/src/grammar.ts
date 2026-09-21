// dotenv grammar, the .env files read by dotenv for node, ruby and python, godotenv and docker compose
//
// design
//   there is no spec, where the loaders disagree the node and ruby reading wins
//   the line states sit at the bottom of the stack and move with goto
//   a single char on goto does not consume, so each line state hands its newline back to line
//   only interpolations nest, each exits with leave on its closer or on its host terminator
//   open interpolations unwind at a newline or # when unquoted and at the closing " when double quoted
//   export and whole value numbers and booleans are settled by probes that rewind
//
// known limitations
//   a # anywhere in an unquoted value starts a comment, python, godotenv and compose need whitespace before it
//   single quoted values are never interpolated, python and dotenv-expand expand them too
//   KEY:value is a key and value as in compose, node and ruby need a space after the colon
//   $$VAR is a literal $ then a variable, compose reads $$ as an escaped dollar
//   quotes inside $( ) are not tracked and the command body is a flat string
//   an unterminated quote runs to the next matching quote or the end of the input
//   only decimal numbers are promoted, with no hex, exponents or separators
//   blanks before an inline comment belong to the unquoted value
//
// edge cases
//   a quote opens a quoted value only as its first char, so JSON={"a": "b"} is unquoted
//   the closing quote wins over an open interpolation, so "${A:-"x"}" closes at the inner quote
//   text after a closing quote carries on as an unquoted value
//   \' never closes a single quoted value

import { DIGIT, LETTER, enter, fallback, goto, leave, match, on } from "@twinkleplop/core";
import type { GrammarRule } from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

const BLANK = [" ", "\t"];
const EOL = ["\n", "\r"];
const SEPARATOR = ["=", ":"];

const WS = on(BLANK);
const TO_LINE = on(EOL, goto("line"));
const COMMENT = match("#", TOKENS.comment, goto("comment"));

const BOM = "\uFEFF";

// two char literals so a $ name pair shares the $ bucket with ${ and $(
const NAME_START_CHARS = [..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "_"];
const DOLLAR_NAME = NAME_START_CHARS.map((c) => `$${c}`);
const NAME_CHAR = [LETTER, DIGIT, "_"];

// sealed so back to back closers stay separate tokens
const CLOSE_BRACE: GrammarRule = { ...match("}", TOKENS.punctuation, leave()), seal: true };
const CLOSE_CMD: GrammarRule = { ...match(")", TOKENS.punctuation, leave()), seal: true };

const DQ_ESCAPES = [
  "\\n",
  "\\r",
  "\\t",
  "\\\\",
  '\\"',
  "\\'",
  "\\$",
  "\\a",
  "\\b",
  "\\f",
  "\\v",
  "\\0",
];

const BOOLEANS = ["true", "True", "TRUE", "false", "False", "FALSE"];

type Flavour = "uq" | "dq";

const aborts = (flavour: Flavour): GrammarRule =>
  flavour === "uq" ? on([...EOL, "#"], leave()) : on('"', leave());

const interpolations = (flavour: Flavour): GrammarRule[] => [
  match("${", TOKENS.punctuation, enter(`brace_name_${flavour}`)),
  match("$(", TOKENS.punctuation, enter(`cmd_${flavour}`)),
  match(DOLLAR_NAME, TOKENS.variable, enter("var_name")),
];

const interpolation_states = (flavour: Flavour) => ({
  [`brace_name_${flavour}`]: {
    rules: [
      match(NAME_CHAR, TOKENS.variable),
      CLOSE_BRACE,
      // a lone : is argument text, no loader supports bash :=
      match([":-", ":+", ":?", "-", "+", "?"], TOKENS.operator, goto(`brace_arg_${flavour}`)),
      aborts(flavour),
      fallback(goto(`brace_arg_${flavour}`)),
    ],
  },

  [`brace_arg_${flavour}`]: {
    rules: [
      CLOSE_BRACE,
      match("\\$", TOKENS.string_escape),
      ...interpolations(flavour),
      aborts(flavour),
      fallback({ token: TOKENS.string }),
    ],
  },

  [`cmd_${flavour}`]: {
    rules: [
      CLOSE_CMD,
      match("(", TOKENS.string, enter(`cmd_paren_${flavour}`)),
      match(["\\(", "\\)"], TOKENS.string),
      ...interpolations(flavour),
      aborts(flavour),
      fallback({ token: TOKENS.string }),
    ],
  },

  [`cmd_paren_${flavour}`]: {
    rules: [
      match(")", TOKENS.string, leave()),
      match("(", TOKENS.string, enter(`cmd_paren_${flavour}`)),
      match(["\\(", "\\)"], TOKENS.string),
      ...interpolations(flavour),
      aborts(flavour),
      fallback({ token: TOKENS.string }),
    ],
  },
});

export default define_grammar({
  name: "dotenv",
  states: {
    line: {
      rules: [
        on([...BLANK, ...EOL, BOM]),
        COMMENT,
        on("e", enter("export_probe")),
        // a line may open with its separator, as in =value
        match(SEPARATOR, TOKENS.operator, goto("value")),
        fallback(goto("key")),
      ],
    },

    // export is a prefix only when a key follows, enter between probes keeps scanning
    export_probe: {
      mode: "probe",
      fallback: "key",
      rules: [on(["xport ", "xport\t"], enter("export_probe_gap")), fallback(goto("key"))],
    },

    export_probe_gap: {
      mode: "probe",
      fallback: "key",
      rules: [WS, on([...SEPARATOR, "#", ...EOL], goto("key")), fallback(goto("export_keyword"))],
    },

    export_keyword: {
      rules: [match("export", TOKENS.keyword, goto("export_gap")), fallback(goto("key"))],
    },

    export_gap: {
      rules: [WS, fallback(goto("key"))],
    },

    // the loaders disagree on key chars, so a key is anything up to a terminator
    key: {
      rules: [
        match(SEPARATOR, TOKENS.operator, goto("value")),
        on(BLANK, goto("after_key")),
        COMMENT,
        TO_LINE,
        fallback({ token: TOKENS.property }),
      ],
    },

    after_key: {
      rules: [
        WS,
        match(SEPARATOR, TOKENS.operator, goto("value")),
        COMMENT,
        TO_LINE,
        fallback(goto("junk")),
      ],
    },

    junk: {
      rules: [TO_LINE, COMMENT, fallback()],
    },

    value: {
      rules: [
        WS,
        TO_LINE,
        COMMENT,
        match('"', TOKENS.string, goto("double_quoted")),
        match("'", TOKENS.string, goto("single_quoted")),
        match("`", TOKENS.string, goto("backtick")),
        on(BOOLEANS, enter("boolean_probe")),
        on(["-", "+"], enter("number_probe_sign")),
        on(DIGIT, enter("number_probe_int")),
        fallback(goto("unquoted")),
      ],
    },

    // a probe skips unlisted chars, so each one ends in a catch all
    number_probe_sign: {
      mode: "probe",
      fallback: "unquoted",
      rules: [on(DIGIT, enter("number_probe_int")), fallback(goto("unquoted"))],
    },

    number_probe_int: {
      mode: "probe",
      fallback: "number_value",
      rules: [
        on(DIGIT),
        on(".", enter("number_probe_dot")),
        on(BLANK, enter("number_probe_tail")),
        on(["#", ...EOL], goto("number_value")),
        fallback(goto("unquoted")),
      ],
    },

    number_probe_dot: {
      mode: "probe",
      fallback: "unquoted",
      rules: [on(DIGIT, enter("number_probe_frac")), fallback(goto("unquoted"))],
    },

    number_probe_frac: {
      mode: "probe",
      fallback: "number_value",
      rules: [
        on(DIGIT),
        on(BLANK, enter("number_probe_tail")),
        on(["#", ...EOL], goto("number_value")),
        fallback(goto("unquoted")),
      ],
    },

    number_probe_tail: {
      mode: "probe",
      fallback: "number_value",
      rules: [WS, on(["#", ...EOL], goto("number_value")), fallback(goto("unquoted"))],
    },

    // the probe already checked the shape
    number_value: {
      rules: [match([DIGIT, "-", "+", "."], TOKENS.number), fallback(goto("value_end"))],
    },

    boolean_probe: {
      mode: "probe",
      fallback: "boolean_value",
      rules: [WS, on(["#", ...EOL], goto("boolean_value")), fallback(goto("unquoted"))],
    },

    boolean_value: {
      rules: [match(BOOLEANS, TOKENS.boolean, goto("value_end")), fallback(goto("unquoted"))],
    },

    unquoted: {
      rules: [
        TO_LINE,
        COMMENT,
        match("\\$", TOKENS.string_escape),
        ...interpolations("uq"),
        fallback({ token: TOKENS.string }),
      ],
    },

    // escapes are two char literals, so "C:\\" closes at its last quote
    double_quoted: {
      rules: [
        match('"', TOKENS.string, goto("value_end")),
        match(DQ_ESCAPES, TOKENS.string_escape),
        ...interpolations("dq"),
        fallback({ token: TOKENS.string }),
      ],
    },

    single_quoted: {
      rules: [
        match("'", TOKENS.string, goto("value_end")),
        match(["\\'", "\\\\"], TOKENS.string_escape),
        fallback({ token: TOKENS.string }),
      ],
    },

    backtick: {
      rules: [
        match("`", TOKENS.string, goto("value_end")),
        match(["\\`", "\\\\"], TOKENS.string_escape),
        fallback({ token: TOKENS.string }),
      ],
    },

    value_end: {
      rules: [WS, COMMENT, TO_LINE, fallback(goto("unquoted"))],
    },

    comment: {
      rules: [TO_LINE, fallback({ token: TOKENS.comment })],
    },

    var_name: {
      rules: [match(NAME_CHAR, TOKENS.variable), fallback(leave())],
    },

    ...interpolation_states("uq"),
    ...interpolation_states("dq"),
  },
});
