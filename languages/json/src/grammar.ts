// JSON grammar — a complete, annotated example for grammar authors.
//
// Scope:
//   - All JSON per RFC 8259: objects, arrays, strings, numbers, booleans, null
//   - String escape sequences: \" \\ \/ \b \f \n \r \t \uXXXX
//   - Numbers: integer, negative, decimal, exponent with optional sign
//
// Known limitations:
//   - JSON5 extensions are not supported (no trailing commas, no comments,
//     no single-quoted strings, no hex numbers, no Infinity/NaN).
//   - Duplicate keys are not flagged — the tokenizer operates at the lexical
//     level and does not track semantic structure.
//   - Leading zeros on numbers (e.g. 007) are tokenized without error,
//     even though they are invalid JSON. A tokenizer is not a validator.

import {
	DIGIT,
	HEX,
	enter,
	fallback,
	goto,
	keyword,
	leave,
	match,
	on,
} from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

// ---------------------------------------------------------------------------
// shared rule: whitespace consumption without emitting a token.
// extracted as a constant so it can be spread into any state that needs it.
// JSON allows whitespace between any two tokens.
// ---------------------------------------------------------------------------
const WHITESPACE = on([" ", "\t", "\n", "\r"]);

export default define_grammar({
	name: "json",
	states: {
		// -----------------------------------------------------------------
		// main — the entry point and only structural state.
		//
		// JSON is context-free at the lexical level: the same set of tokens
		// can appear inside objects, arrays, or at the top level. this means
		// a single state handles everything — no need for separate object/
		// array states. the parser (not the tokenizer) enforces structure.
		// -----------------------------------------------------------------
		main: {
			rules: [
				WHITESPACE,

				// strings — push into a body state so escape sequences get
				// their own `string_escape` tokens. the body handles the
				// closing `"`, and the `\` rule routes through the shared
				// escape sub-machine (simple escapes and `\uNNNN` unicode).
				match('"', TOKENS.string, enter("string_body")),

				// boolean literals and null — keyword() adds word-boundary
				// checking so `trueish` does not match as `true` + `ish`.
				// without boundary checking (plain match()), `true` would
				// greedily match the first four characters of `trueish`.
				keyword(["true", "false"], {}, TOKENS.boolean),
				keyword(["null"]),

				// structural punctuation — no state transitions needed because
				// JSON's lexical grammar is the same at every nesting depth.
				match(["{", "}", "[", "]", ",", ":"], TOKENS.punctuation),

				// negative numbers — the minus sign is part of the number token.
				// enter() pushes main onto the stack so that when the number
				// state chain finishes, we can return here.
				match("-", TOKENS.number, enter("negative_number")),

				// numbers starting with a digit.
				match(DIGIT, TOKENS.number, enter("number")),
			],
		},

		// -----------------------------------------------------------------
		// negative_number — consumed `-`, now expecting digits.
		//
		// this is a separate state because `-` alone is not a valid number;
		// we need at least one digit after it.
		//
		// the first digit uses goto("number") NOT enter("number"):
		//   enter would push negative_number onto the stack, so leave()
		//   in number would return here (stuck — nothing left to match).
		//   goto replaces negative_number on the stack, so leave() in
		//   number returns to main instead (correct).
		// this is the key distinction between enter (push) and goto (replace).
		// -----------------------------------------------------------------
		negative_number: {
			rules: [
				match(DIGIT, TOKENS.number, goto("number")),
				// no digit after minus — hand character back to main.
				// fallback(goto(...)) does NOT consume the character. this is
				// how you "hand back" a character when you realize you are in
				// the wrong context. a plain fallback(leave()) WOULD consume.
				fallback(goto("main")),
			],
		},

		// -----------------------------------------------------------------
		// number — integer digits, with optional decimal and exponent.
		//
		// sub-states (decimal, exponent) are entered with enter() so the
		// token coalescing chain is maintained (each emits the same "number"
		// type and the tokenizer fuses adjacent same-type tokens into one).
		//
		// exit strategy: every number sub-state uses fallback(goto("main"))
		// to return control to the main state without consuming the
		// terminating character. this is simpler and more robust than trying
		// to unwind a deep enter/leave chain: each fallback(goto("main"))
		// pops one stack frame and jumps directly to main. the remaining
		// stack entries from intermediate enter() calls are harmlessly
		// leaked — they have no effect because main never calls leave().
		// this is the same pattern the JavaScript grammar uses for its
		// number states.
		// -----------------------------------------------------------------
		number: {
			rules: [
				// continue consuming digits (coalesced into one number token).
				match(DIGIT, TOKENS.number),
				// decimal point transitions to the decimal state.
				match(".", TOKENS.number, enter("decimal")),
				// exponent marker transitions to the exponent sign state.
				match(["e", "E"], TOKENS.number, enter("exponent_sign")),
				// anything else means the number is complete — go back to main.
				fallback(goto("main")),
			],
		},

		// -----------------------------------------------------------------
		// decimal — digits after the decimal point.
		// -----------------------------------------------------------------
		decimal: {
			rules: [
				match(DIGIT, TOKENS.number),
				match(["e", "E"], TOKENS.number, enter("exponent_sign")),
				fallback(goto("main")),
			],
		},

		// -----------------------------------------------------------------
		// exponent_sign — the optional +/- after e/E.
		//
		// this state consumes exactly one character (sign or first digit)
		// then enters exponent_digits for the rest. the fallback handles
		// the case where the exponent is malformed (no sign or digit).
		// -----------------------------------------------------------------
		exponent_sign: {
			rules: [
				match(["+", "-"], TOKENS.number, enter("exponent_digits")),
				match(DIGIT, TOKENS.number, enter("exponent_digits")),
				fallback(goto("main")),
			],
		},

		// -----------------------------------------------------------------
		// exponent_digits — digits of the exponent value.
		// -----------------------------------------------------------------
		exponent_digits: {
			rules: [
				match(DIGIT, TOKENS.number),
				fallback(goto("main")),
			],
		},

		// -----------------------------------------------------------------
		// string_body — content inside `"..."`.
		//
		// `\` is re-tokenised as `string_escape` and pushes the escape
		// sub-machine. `"` closes the string and pops back to main.
		// all other chars (including non-ASCII and whitespace) emit as
		// plain `string`. JSON does not permit literal control chars
		// inside strings per RFC 8259 §7, but the tokenizer does not
		// enforce that.
		// -----------------------------------------------------------------
		string_body: {
			rules: [
				match("\\", TOKENS.string_escape, enter("string_escape_start")),
				match('"', TOKENS.string, leave()),
				fallback({ token: TOKENS.string }),
			],
		},

		// -----------------------------------------------------------------
		// string_escape_start — dispatch on the char after `\`.
		//
		// JSON recognises 8 simple escapes (\" \\ \/ \b \f \n \r \t) and
		// one structured form (\uNNNN with exactly 4 hex digits). everything
		// else (e.g. \z) is still emitted as `string_escape` for the two
		// chars `\X` — JSON would reject it at parse time; the tokenizer
		// does not validate.
		// -----------------------------------------------------------------
		string_escape_start: {
			rules: [
				match("u", TOKENS.string_escape, goto("esc_u4_d1")),
				fallback({ token: TOKENS.string_escape, exit: true }),
			],
		},

		// \uNNNN — exactly 4 hex digits. fallback(leave()) unwinds on a
		// shorter sequence without consuming so the parent body re-processes
		// the non-hex char normally.
		esc_u4_d1: {
			rules: [
				match(HEX, TOKENS.string_escape, goto("esc_u4_d2")),
				fallback(leave()),
			],
		},
		esc_u4_d2: {
			rules: [
				match(HEX, TOKENS.string_escape, goto("esc_u4_d3")),
				fallback(leave()),
			],
		},
		esc_u4_d3: {
			rules: [
				match(HEX, TOKENS.string_escape, goto("esc_u4_d4")),
				fallback(leave()),
			],
		},
		esc_u4_d4: {
			rules: [
				match(HEX, TOKENS.string_escape, leave()),
				fallback(leave()),
			],
		},
	},
});
