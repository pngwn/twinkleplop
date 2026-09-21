// keys stay plain strings here, the property reclassifier labels them
// invalid input follows the microsoft jsonc parser scanner since the spec leaves it open
// every enter must pop on every path, the 256 slot stack corrupts on leaked frames

import { DIGIT, HEX, enter, fallback, goto, keyword, leave, match, on } from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

const WHITESPACE = [" ", "\t", "\n", "\r"];

// slash ends a word so a comment glued to invalid text still opens
const WORD_END = [...WHITESPACE, "{", "}", "[", "]", '"', ":", ",", "/"];

export default define_grammar({
  name: "jsonc",
  states: {
    main: {
      rules: [
        on(WHITESPACE),

        match('"', TOKENS.string, enter("string_body")),

        match("//", TOKENS.comment, enter("line_comment")),
        match("/*", TOKENS.comment, enter("block_comment")),

        keyword(["true", "false"], {}, TOKENS.boolean),
        keyword(["null"], {}, TOKENS["null"]),

        match(["{", "}", "[", "]", ",", ":"], TOKENS.punctuation),

        match("-", TOKENS.number, enter("number_sign")),
        match(DIGIT, TOKENS.number, enter("number_int")),

        // invalid runs get no token so xtrue never shows a literal inside
        fallback(enter("bare_word")),
      ],
    },

    string_body: {
      rules: [
        match("\\", TOKENS.string_escape, enter("string_escape_start")),
        match('"', TOKENS.string, leave()),
        // a raw line break ends the string so an unclosed quote cannot swallow the file
        on(["\n", "\r"], leave()),
        fallback({ token: TOKENS.string }),
      ],
    },

    string_escape_start: {
      rules: [
        match("u", TOKENS.string_escape, goto("esc_u4_d1")),
        match("\r", TOKENS.string_escape, goto("esc_cr")),
        // this escapes a line break too, so the string carries on
        fallback({ token: TOKENS.string_escape, exit: true }),
      ],
    },

    // take the lf of a crlf so crlf and lf files tokenize alike
    esc_cr: {
      rules: [match("\n", TOKENS.string_escape, leave()), fallback(leave())],
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

    line_comment: {
      rules: [on(["\n", "\r"], leave()), fallback({ token: TOKENS.comment })],
    },

    // step the closer one char at a time, a multichar match would split the token
    block_comment: {
      rules: [
        match("*", TOKENS.comment, goto("block_comment_star")),
        fallback({ token: TOKENS.comment }),
      ],
    },

    block_comment_star: {
      rules: [
        match("/", TOKENS.comment, leave()),
        match("*", TOKENS.comment),
        fallback({ token: TOKENS.comment, ...goto("block_comment") }),
      ],
    },

    number_sign: {
      rules: [match(DIGIT, TOKENS.number, goto("number_int")), fallback(leave())],
    },
    number_int: {
      rules: [
        match(DIGIT, TOKENS.number),
        match(".", TOKENS.number, goto("number_frac")),
        match(["e", "E"], TOKENS.number, goto("number_exp_sign")),
        fallback(leave()),
      ],
    },
    number_frac: {
      rules: [
        match(DIGIT, TOKENS.number),
        match(["e", "E"], TOKENS.number, goto("number_exp_sign")),
        fallback(leave()),
      ],
    },
    number_exp_sign: {
      rules: [match(["+", "-", DIGIT], TOKENS.number, goto("number_exp")), fallback(leave())],
    },
    number_exp: {
      rules: [match(DIGIT, TOKENS.number), fallback(leave())],
    },

    bare_word: {
      rules: [on(WORD_END, leave()), fallback()],
    },
  },
});
