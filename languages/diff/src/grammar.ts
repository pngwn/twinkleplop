// scope:
//   unified diff (git diff, diff -u), context diff (diff -c), normal diff,
//   git-specific metadata (index, similarity, rename, mode, binary).
//   combined diff (@@@) at a basic level.
//
// known limitations:
//   context diff old/new section distinction is not tracked as separate
//   states. `!` lines are recognized as changed in both sections.
//
//   combined diff (@@@ for merge commits) hunk headers are recognized,
//   but the 2-character prefix columns inside combined hunks are classified
//   by the first prefix character only.
//
//   normal diff commands (e.g. `1,3c5,7`) are recognized when they start
//   with a digit but the full command syntax is not validated.
//
//   path quoting (c-style escapes in git paths) is not handled.
//
//   timestamps after paths in classic diff -u headers are tokenized as
//   comment after the tab separator.

import { DIGIT, HEX, enter, fallback, goto, leave, match, on } from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

const NEWLINE = on("\n");

export default define_grammar({
  name: "diff",
  states: {
    // top-level state: classifies each line by its leading characters.
    // once a hunk header (@@ line) is seen, transitions to the hunk state.
    main: {
      rules: [
        NEWLINE,
        on(" ", enter("context_line")),

        match("diff ", TOKENS.keyword, enter("diff_command")),

        // "--- " could be a unified file header or a context range.
        // compiler tries longer "--- " before shorter "-".
        match("--- ", TOKENS.heading, enter("dash_line")),
        match("+++ ", TOKENS.heading, enter("file_header_path")),

        // "*** " for context file header/range, "***" (no space) for
        // separator line. compiler tries 4-char "*** " before 3-char "***".
        match("*** ", TOKENS.heading, enter("context_star_line")),
        match("***", TOKENS.label, enter("star_separator")),

        match("@@@ ", TOKENS.label, enter("hunk_range")),
        match("@@ ", TOKENS.label, enter("hunk_range")),

        on("index ", enter("index_line")),
        on("old mode ", enter("mode_line")),
        on("new mode ", enter("mode_line")),
        on("new file mode ", enter("mode_line")),
        on("deleted file mode ", enter("mode_line")),
        on("similarity index ", enter("similarity_line")),
        on("dissimilarity index ", enter("similarity_line")),
        on("rename from ", enter("meta_path")),
        on("rename to ", enter("meta_path")),
        on("copy from ", enter("meta_path")),
        on("copy to ", enter("meta_path")),
        on("Binary files ", enter("binary_line")),
        on("GIT binary patch", enter("consume_rest")),

        match("+", TOKENS.inserted_marker, enter("inserted_line")),
        match("-", TOKENS.deleted_marker, enter("deleted_line")),
        match("!", TOKENS.changed_marker, enter("changed_line")),
        match("> ", TOKENS.inserted_marker, enter("inserted_line")),
        match("< ", TOKENS.deleted_marker, enter("deleted_line")),

        match("\\ ", TOKENS.comment, enter("consume_rest_comment")),
        match("#", TOKENS.comment, enter("consume_rest_comment")),

        match(DIGIT, TOKENS.number, enter("normal_command")),

        fallback(),
      ],
    },

    diff_command: {
      rules: [
        on("\n", leave()),
        match(["--git", "--cc", "--combined"], TOKENS.keyword),
        on(" "),
        fallback({ token: TOKENS.string }),
      ],
    },

    // after "--- ": disambiguate between file header path and context
    // range. if the next char is a digit, it is a context range
    // (--- 1,5 ----). otherwise it is a file path.
    dash_line: {
      rules: [
        on("\n", leave()),
        match(DIGIT, TOKENS.number, goto("context_range")),
        match("\t", TOKENS.punctuation, enter("file_header_timestamp")),
        fallback({ token: TOKENS.string }),
      ],
    },

    file_header_path: {
      rules: [
        on("\n", leave()),
        match("\t", TOKENS.punctuation, enter("file_header_timestamp")),
        fallback({ token: TOKENS.string }),
      ],
    },

    file_header_timestamp: {
      rules: [on("\n", goto("main")), fallback({ token: TOKENS.comment })],
    },

    // after "*** ": context file header (path + timestamp) or
    // range (*** 1,5 ****). digit means range, else path.
    context_star_line: {
      rules: [
        on("\n", leave()),
        match(DIGIT, TOKENS.number, enter("context_range")),
        match("\t", TOKENS.punctuation, enter("file_header_timestamp")),
        fallback({ token: TOKENS.string }),
      ],
    },

    // after "***" with no space: separator line (***************).
    // consume remaining asterisks and newline.
    star_separator: {
      rules: [on("\n", leave()), match("*", TOKENS.label), fallback(leave())],
    },

    // numbers, commas, then trailing stars/dashes in context ranges
    context_range: {
      rules: [
        on("\n", goto("main")),
        match(DIGIT, TOKENS.number),
        match(",", TOKENS.punctuation),
        match(" ", TOKENS.label),
        match(["*", "-"], TOKENS.label),
        fallback({ token: TOKENS.label }),
      ],
    },

    hunk_range: {
      rules: [
        match("@@@ ", TOKENS.label, goto("hunk_context")),
        match("@@@", TOKENS.label, goto("hunk_context")),
        match("@@ ", TOKENS.label, goto("hunk_context")),
        match("@@", TOKENS.label, goto("hunk_context")),
        match(DIGIT, TOKENS.number),
        match([",", "+", "-"], TOKENS.punctuation),
        on(" "),
        on("\n", goto("hunk")),
        fallback({ token: TOKENS.label }),
      ],
    },

    hunk_context: {
      rules: [on("\n", goto("hunk")), fallback({ token: TOKENS.comment })],
    },

    // inside a hunk: classify content lines by first character.
    hunk: {
      rules: [
        NEWLINE,
        on(" ", enter("context_line")),

        match("@@@ ", TOKENS.label, enter("hunk_range")),
        match("@@ ", TOKENS.label, enter("hunk_range")),

        match("diff ", TOKENS.keyword, goto("diff_command_from_hunk")),
        match("--- ", TOKENS.heading, goto("hunk_dash_line")),
        match("+++ ", TOKENS.heading, goto("file_header_path")),
        match("*** ", TOKENS.heading, goto("context_star_line")),
        match("***", TOKENS.label, enter("star_separator")),

        match("+", TOKENS.inserted_marker, enter("inserted_line")),
        match("-", TOKENS.deleted_marker, enter("deleted_line")),
        match("!", TOKENS.changed_marker, enter("changed_line")),
        match("> ", TOKENS.inserted_marker, enter("inserted_line")),
        match("< ", TOKENS.deleted_marker, enter("deleted_line")),

        match("\\ ", TOKENS.comment, enter("consume_rest_comment")),
        match("#", TOKENS.comment, enter("consume_rest_comment")),

        // normal diff separator inside hunk
        match("---\n", TOKENS.label),

        fallback(),
      ],
    },

    // "--- " inside a hunk: context range (--- 1,5 ----) if digit
    // follows, otherwise file header path (new file section).
    hunk_dash_line: {
      rules: [
        on("\n", goto("hunk")),
        match(DIGIT, TOKENS.number, goto("context_range_in_hunk")),
        match("\t", TOKENS.punctuation, enter("file_header_timestamp")),
        fallback({ token: TOKENS.string }),
      ],
    },

    context_range_in_hunk: {
      rules: [
        on("\n", goto("hunk")),
        match(DIGIT, TOKENS.number),
        match(",", TOKENS.punctuation),
        match(" ", TOKENS.label),
        match(["*", "-"], TOKENS.label),
        fallback({ token: TOKENS.label }),
      ],
    },

    diff_command_from_hunk: {
      rules: [
        on("\n", goto("main")),
        match(["--git", "--cc", "--combined"], TOKENS.keyword),
        on(" "),
        fallback({ token: TOKENS.string }),
      ],
    },

    // index TOKENS.hash..TOKENS.hash [MODE]
    // HEX includes digits, so all hash chars (0-9, a-f) match as hash.
    // after a space, enter index_mode for the file mode number.
    index_line: {
      rules: [
        on("\n", leave()),
        match("..", TOKENS.punctuation),
        on(" ", enter("index_mode")),
        match(HEX, TOKENS.hash),
        fallback({}),
      ],
    },

    // file mode digits after the hash portion of an index line
    index_mode: {
      rules: [on("\n", goto("main")), match(DIGIT, TOKENS.number), fallback(goto("main"))],
    },

    mode_line: {
      rules: [on("\n", leave()), match(DIGIT, TOKENS.number), fallback({})],
    },

    similarity_line: {
      rules: [
        on("\n", leave()),
        match(DIGIT, TOKENS.number),
        match("%", TOKENS.punctuation),
        fallback({}),
      ],
    },

    meta_path: {
      rules: [on("\n", leave()), fallback({ token: TOKENS.string })],
    },

    binary_line: {
      rules: [on("\n", leave()), on(" and "), on(" differ"), fallback({ token: TOKENS.string })],
    },

    normal_command: {
      rules: [
        on("\n", goto("hunk")),
        match(DIGIT, TOKENS.number),
        match(",", TOKENS.punctuation),
        match(["a", "c", "d"], TOKENS.keyword),
        fallback({ token: TOKENS.label }),
      ],
    },

    inserted_line: {
      rules: [on("\n", leave()), fallback({ token: TOKENS.inserted })],
    },

    deleted_line: {
      rules: [on("\n", leave()), fallback({ token: TOKENS.deleted })],
    },

    changed_line: {
      rules: [on("\n", leave()), fallback({ token: TOKENS.changed })],
    },

    context_line: {
      rules: [on("\n", leave()), fallback({})],
    },

    consume_rest_comment: {
      rules: [on("\n", leave()), fallback({ token: TOKENS.comment })],
    },

    consume_rest: {
      rules: [on("\n", leave()), fallback({})],
    },
  },
});
