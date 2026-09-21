// JSDoc sub-grammar — the inside of a `/** … */` comment.
//
// Doc comments are embedded the same way `` html`…` `` and `` css`…` ``
// are: the host grammar still produces one `comment` token, and an
// `embed_interleaved` pass re-tokenizes its body with this grammar (see
// `scan_jsdoc` in reclassifiers.ts). Everything that is not a tag or a
// type expression stays `comment`, so a doc comment reads as a comment
// with the structured parts lifted out of it.
//
// What gets lifted:
//   @param, @returns, …          → keyword
//   the `{…}` after a tag        → `type` names, `punctuation` delimiters
//   the name after `@param {T}`  → parameter
//   the name after `@typedef {T}`→ type
//
// Scope / known limitations:
//   - A `{` only opens a type expression directly after a tag word. A
//     brace in prose (`@example const x = {}`) stays comment text.
//   - `@template T, U` tags only `T`; the tail reads as prose.
//   - An unterminated `{` runs to the end of the comment as a type.

import {
  ALNUM,
  DIGIT,
  LETTER,
  enter,
  fallback,
  goto,
  keyword,
  leave,
  match,
  on,
} from "@twinkleplop/core";

import { define_grammar } from "@twinkleplop/core/compile";
import * as TOKENS from "@twinkleplop/core/tokens";

// tags whose first non-type word names a value — `@param {string} name`.
// matched with the sigil attached: the tokenizer only coalesces
// single-character emissions, so `@` + a multi-character word would come
// back as two adjacent keyword tokens.
const NAME_TAGS = ["@param", "@arg", "@argument", "@property", "@prop"];

// tags whose first non-type word names a type — `@typedef {object} Point`.
const TYPE_NAME_TAGS = ["@typedef", "@callback", "@template"];

// characters that structure a type expression. everything word-shaped
// between them is a type name.
const TYPE_PUNCTUATION = [
  "<",
  ">",
  "[",
  "]",
  "(",
  ")",
  ",",
  "|",
  "&",
  "=",
  "?",
  "!",
  "*",
  ":",
  ";",
  "'",
  '"',
];

// a doc-comment line opens with indentation and an optional `*` gutter;
// both stay comment text. shared by the line-start rules below.
const GUTTER = match([" ", "\t", "\r", "\n", "*"], TOKENS.comment);

export default define_grammar({
  name: "jsdoc",

  states: {
    // -------------------------------------------------------------------
    // line_start — initial state, and where every newline returns to.
    // only here does an `@` open a tag, so an `@` inside prose (an email
    // address, a package name) stays comment text.
    // -------------------------------------------------------------------
    line_start: {
      rules: [
        GUTTER,
        // the two recognised families branch to states that know what the
        // word after the type expression means. every other tag goes to
        // `tag`, which reads the word and lands in `after_tag`, where a
        // type expression is still recognised but a trailing word is prose.
        keyword(NAME_TAGS, goto("after_name_tag")),
        keyword(TYPE_NAME_TAGS, goto("after_type_tag")),
        match("@", TOKENS.keyword, goto("tag")),
        fallback(goto("prose")),
      ],
    },

    // -------------------------------------------------------------------
    // tag — the word of an unrecognised tag, one character at a time so
    // it coalesces with the `@` that preceded it.
    // -------------------------------------------------------------------
    tag: {
      rules: [match([LETTER, DIGIT, "-", "_"], TOKENS.keyword), fallback(goto("after_tag"))],
    },

    // -------------------------------------------------------------------
    // after_tag — `@returns {T} description`. a type expression may
    // follow; anything after it is prose.
    // -------------------------------------------------------------------
    after_tag: {
      rules: [
        match([" ", "\t"], TOKENS.comment),
        match("{", TOKENS.punctuation, enter("type_expr")),
        match("\n", TOKENS.comment, goto("line_start")),
        fallback(goto("prose")),
      ],
    },

    // -------------------------------------------------------------------
    // after_name_tag — `@param {T} name`, `@param name`, `@param [name]`.
    // -------------------------------------------------------------------
    after_name_tag: {
      rules: [
        match([" ", "\t"], TOKENS.comment),
        match("{", TOKENS.punctuation, enter("type_expr")),
        match("[", TOKENS.punctuation),
        match("\n", TOKENS.comment, goto("line_start")),
        on(["_", "$", LETTER], goto("name")),
        fallback(goto("prose")),
      ],
    },

    // -------------------------------------------------------------------
    // after_type_tag — `@typedef {object} Point`, `@template T`.
    // -------------------------------------------------------------------
    after_type_tag: {
      rules: [
        match([" ", "\t"], TOKENS.comment),
        match("{", TOKENS.punctuation, enter("type_expr")),
        match("\n", TOKENS.comment, goto("line_start")),
        on(["_", "$", LETTER], goto("type_name")),
        fallback(goto("prose")),
      ],
    },

    // one dotted name, then the rest of the line is prose.
    name: {
      rules: [match(["_", "$", ".", ALNUM], TOKENS.parameter), fallback(goto("prose"))],
    },

    type_name: {
      rules: [match(["_", "$", ".", ALNUM], TOKENS.type), fallback(goto("prose"))],
    },

    // -------------------------------------------------------------------
    // type_expr — inside `{…}`. nests, so `{{ a: number }}` and
    // `{Map<string, Foo[]>}` close on the right brace.
    // -------------------------------------------------------------------
    type_expr: {
      rules: [
        match("}", TOKENS.punctuation, leave()),
        match("{", TOKENS.punctuation, enter("type_expr")),
        // `{@link Foo}` — an inline tag rather than a type.
        match("@", TOKENS.keyword, goto("inline_tag")),
        match(["_", "$", ".", ALNUM], TOKENS.type),
        match(TYPE_PUNCTUATION, TOKENS.punctuation),
        GUTTER,
        fallback({ token: TOKENS.comment }),
      ],
    },

    // the word of an inline `{@link …}` tag; the rest of the braces are
    // handled by type_expr, which this returns to at the same depth.
    inline_tag: {
      rules: [match([LETTER, DIGIT, "-"], TOKENS.keyword), fallback(goto("type_expr"))],
    },

    // -------------------------------------------------------------------
    // prose — comment text up to the end of the line.
    // -------------------------------------------------------------------
    prose: {
      rules: [match("\n", TOKENS.comment, goto("line_start")), fallback({ token: TOKENS.comment })],
    },
  },
});
