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

import {
	DIGIT,
	HEX,
	enter,
	fallback,
	goto,
	leave,
	match,
	on,
} from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

const INSERTED = "inserted";
const INSERTED_MARKER = "inserted_marker";
const DELETED = "deleted";
const DELETED_MARKER = "deleted_marker";
const CHANGED = "changed";
const CHANGED_MARKER = "changed_marker";
const CONTEXT = "context";
const HEADING = "heading";
const LABEL = "label";
const META = "meta";
const HASH = "hash";

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
				match("--- ", HEADING, enter("dash_line")),
				match("+++ ", HEADING, enter("file_header_path")),

				// "*** " for context file header/range, "***" (no space) for
				// separator line. compiler tries 4-char "*** " before 3-char "***".
				match("*** ", HEADING, enter("context_star_line")),
				match("***", LABEL, enter("star_separator")),

				match("@@@ ", LABEL, enter("hunk_range")),
				match("@@ ", LABEL, enter("hunk_range")),

				match("index ", META, enter("index_line")),
				match("old mode ", META, enter("mode_line")),
				match("new mode ", META, enter("mode_line")),
				match("new file mode ", META, enter("mode_line")),
				match("deleted file mode ", META, enter("mode_line")),
				match("similarity index ", META, enter("similarity_line")),
				match("dissimilarity index ", META, enter("similarity_line")),
				match("rename from ", META, enter("meta_path")),
				match("rename to ", META, enter("meta_path")),
				match("copy from ", META, enter("meta_path")),
				match("copy to ", META, enter("meta_path")),
				match("Binary files ", META, enter("binary_line")),
				match("GIT binary patch", META, enter("consume_rest")),

				match("+", INSERTED_MARKER, enter("inserted_line")),
				match("-", DELETED_MARKER, enter("deleted_line")),
				match("!", CHANGED_MARKER, enter("changed_line")),
				match("> ", INSERTED_MARKER, enter("inserted_line")),
				match("< ", DELETED_MARKER, enter("deleted_line")),

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
			rules: [on("\n", leave()), match("*", LABEL), fallback(leave())],
		},

		// numbers, commas, then trailing stars/dashes in context ranges
		context_range: {
			rules: [
				on("\n", goto("main")),
				match(DIGIT, TOKENS.number),
				match(",", TOKENS.punctuation),
				match(" ", LABEL),
				match(["*", "-"], LABEL),
				fallback({ token: LABEL }),
			],
		},

		hunk_range: {
			rules: [
				match("@@@ ", LABEL, goto("hunk_context")),
				match("@@@", LABEL, goto("hunk_context")),
				match("@@ ", LABEL, goto("hunk_context")),
				match("@@", LABEL, goto("hunk_context")),
				match(DIGIT, TOKENS.number),
				match([",", "+", "-"], TOKENS.punctuation),
				on(" "),
				on("\n", goto("hunk")),
				fallback({ token: LABEL }),
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

				match("@@@ ", LABEL, enter("hunk_range")),
				match("@@ ", LABEL, enter("hunk_range")),

				match("diff ", TOKENS.keyword, goto("diff_command_from_hunk")),
				match("--- ", HEADING, goto("hunk_dash_line")),
				match("+++ ", HEADING, goto("file_header_path")),
				match("*** ", HEADING, goto("context_star_line")),
				match("***", LABEL, enter("star_separator")),

				match("+", INSERTED_MARKER, enter("inserted_line")),
				match("-", DELETED_MARKER, enter("deleted_line")),
				match("!", CHANGED_MARKER, enter("changed_line")),
				match("> ", INSERTED_MARKER, enter("inserted_line")),
				match("< ", DELETED_MARKER, enter("deleted_line")),

				match("\\ ", TOKENS.comment, enter("consume_rest_comment")),
				match("#", TOKENS.comment, enter("consume_rest_comment")),

				// normal diff separator inside hunk
				match("---\n", LABEL),

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
				match(" ", LABEL),
				match(["*", "-"], LABEL),
				fallback({ token: LABEL }),
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

		// index HASH..HASH [MODE]
		// HEX includes digits, so all hash chars (0-9, a-f) match as hash.
		// after a space, enter index_mode for the file mode number.
		index_line: {
			rules: [
				on("\n", leave()),
				match("..", TOKENS.punctuation),
				on(" ", enter("index_mode")),
				match(HEX, HASH),
				fallback({ token: META }),
			],
		},

		// file mode digits after the hash portion of an index line
		index_mode: {
			rules: [
				on("\n", goto("main")),
				match(DIGIT, TOKENS.number),
				fallback(goto("main")),
			],
		},

		mode_line: {
			rules: [
				on("\n", leave()),
				match(DIGIT, TOKENS.number),
				fallback({ token: META }),
			],
		},

		similarity_line: {
			rules: [
				on("\n", leave()),
				match(DIGIT, TOKENS.number),
				match("%", TOKENS.punctuation),
				fallback({ token: META }),
			],
		},

		meta_path: {
			rules: [on("\n", leave()), fallback({ token: TOKENS.string })],
		},

		binary_line: {
			rules: [
				on("\n", leave()),
				match(" and ", META),
				match(" differ", META),
				fallback({ token: TOKENS.string }),
			],
		},

		normal_command: {
			rules: [
				on("\n", goto("hunk")),
				match(DIGIT, TOKENS.number),
				match(",", TOKENS.punctuation),
				match(["a", "c", "d"], TOKENS.keyword),
				fallback({ token: LABEL }),
			],
		},

		inserted_line: {
			rules: [on("\n", leave()), fallback({ token: INSERTED })],
		},

		deleted_line: {
			rules: [on("\n", leave()), fallback({ token: DELETED })],
		},

		changed_line: {
			rules: [on("\n", leave()), fallback({ token: CHANGED })],
		},

		context_line: {
			rules: [on("\n", leave()), fallback({ token: CONTEXT })],
		},

		consume_rest_comment: {
			rules: [on("\n", leave()), fallback({ token: TOKENS.comment })],
		},

		consume_rest: {
			rules: [on("\n", leave()), fallback({ token: META })],
		},
	},
});
