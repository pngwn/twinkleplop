// scope:
//   minimal diff overlay that highlights only unambiguous line-level markers:
//   +/- prefixes, ! (changed), @@ hunk headers, and the no-newline marker.
//   designed to compose with other language grammars without conflicts.
//
// known limitations:
//   deliberately omits: --- / +++ file headers, diff --git headers, index
//   lines, context diff *** headers, < / > normal diff markers, # comments,
//   and space-prefixed context lines. see RESEARCH.md for the full conflict
//   analysis explaining each exclusion.
//
//   ++ and -- at column 0 are excluded to avoid false positives with
//   increment/decrement operators. this means a diff line whose content
//   starts with + or - (e.g., a line adding "++i;") will have its first
//   content character absorbed into the exclusion.
//
//   false positives: + or - at column 0 in real source code (continuation
//   expressions, unary operators) will be incorrectly highlighted as diff
//   markers. this is rare in practice with standard formatting.

import {
	DIGIT,
	enter,
	fallback,
	goto,
	leave,
	match,
	on,
} from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

export default define_grammar({
	name: "diff-basic",
	states: {
		// each line is classified independently by its first character(s).
		// unrecognized lines are consumed silently (overlay pass-through).
		main: {
			rules: [
				on("\n"),

				match("@@", TOKENS.label, enter("hunk_range")),

				// "! " requires the space to avoid shell !command conflicts
				match("! ", TOKENS.changed_marker, enter("changed_line")),

				// no-newline marker
				match("\\ ", TOKENS.comment, enter("consume_rest_comment")),

				// ++ and -- exclusions must precede single + and -.
				// within the + first-char bucket, "++" (2 chars) is tried
				// before "+" (1 char) because these are separate rules and
				// rule order wins. same for - bucket.
				on("++", enter("consume_line")),
				on("--", enter("consume_line")),

				match("+", TOKENS.inserted_marker, enter("inserted_line")),
				match("-", TOKENS.deleted_marker, enter("deleted_line")),

				// non-diff line: consume silently
				fallback(enter("consume_line")),
			],
		},

		// @@ -N,N +N,N @@ optional context text
		hunk_range: {
			rules: [
				// closing delimiter. @@@ before @@ for correct length priority.
				match("@@@", TOKENS.label, goto("hunk_context")),
				match("@@", TOKENS.label, goto("hunk_context")),
				// extra @ from opening @@@ (main consumed first 2)
				match("@", TOKENS.label),
				match(DIGIT, TOKENS.number),
				match(",", TOKENS.punctuation),
				match(["+", "-"], TOKENS.punctuation),
				on(" "),
				on("\n", goto("main")),
				fallback({ token: TOKENS.label }),
			],
		},

		// function context text after closing @@
		hunk_context: {
			rules: [on("\n", goto("main")), fallback({ token: TOKENS.comment })],
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

		consume_rest_comment: {
			rules: [on("\n", leave()), fallback({ token: TOKENS.comment })],
		},

		// non-diff lines: consume everything to newline without tokens
		consume_line: {
			rules: [on("\n", leave()), fallback()],
		},
	},
});
