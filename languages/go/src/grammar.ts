// Go grammar for twinkleplop syntax highlighting.
//
// Scope:
//   - Full Go lexical grammar per the Go 1.26 spec:
//     25 reserved keywords, operators and punctuation (including the unusual
//     `&^`, `&^=`, `<-`, `:=`, `...`, `~`), literals (integers in all four
//     bases with `_` separators, decimal and hex floats, imaginary suffix,
//     interpreted and raw strings, rune literals), and comments (line, block).
//   - Predeclared identifiers classified by role: `true`/`false` as boolean,
//     `nil`/`iota` plus predeclared types (`int`, `string`, `bool`, etc.) as
//     keyword, predeclared builtin functions (`make`, `len`, `append`, etc.)
//     as function.
//
// Known limitations:
//   - Identifiers are ASCII-only (`[A-Za-z_][A-Za-z0-9_]*`). Go allows any
//     Unicode Letter category (Lu, Ll, Lt, Lm, Lo) plus `_` to start an
//     identifier, and any Unicode Letter or decimal-digit (Nd) to continue.
//     Matches Prism and Pygments. A grammar extension for Unicode identifiers
//     would need range definitions beyond ASCII.
//   - Semicolon auto-insertion is not emitted as tokens. The spec defines
//     automatic semicolon insertion at newlines after certain tokens; this
//     grammar treats newlines as whitespace. A semantic analyzer (not a
//     highlighter) would need those inserted semicolons.
//   - Invalid escape sequences inside interpreted strings and runes are not
//     flagged. Unknown 1-char escapes (`\k`, `\z`) tokenize as
//     `string_escape`; short `\x`, `\u`, `\U`, and `\NNN` escapes (fewer
//     than required digits) tokenize the partial sequence as `string_escape`
//     and return the remaining chars to the string body. A validator would
//     reject these.
//   - `//go:build` and `//go:generate` directive comments are tokenized as
//     ordinary line comments. Most Go highlighters do not distinguish them.
//   - The imaginary-literal back-compat rule (`0123i` is decimal 123i, not
//     octal 0o123 * 1i) is not observable at the token level — both forms
//     emit a single `number` token. The distinction is semantic, not lexical.
//   - Byte-order mark (U+FEFF) at the start of source is not stripped.

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

import { define_grammar } from "@twinkleplop/core/compile";
import * as TOKENS from "@twinkleplop/core/tokens";

// ---------------------------------------------------------------------------
// keyword / predeclared identifier lists
// ---------------------------------------------------------------------------

// the 25 reserved keywords from the spec.
const KEYWORDS = [
	"break",
	"case",
	"chan",
	"const",
	"continue",
	"default",
	"defer",
	"else",
	"fallthrough",
	"for",
	"func",
	"go",
	"goto",
	"if",
	"import",
	"interface",
	"map",
	"package",
	"range",
	"return",
	"select",
	"struct",
	"switch",
	"type",
	"var",
];

// predeclared constants that are not reserved but are universally typed.
// nil and iota behave like keywords in idiomatic code (cannot be meaningfully
// shadowed without breaking readers' expectations).
const PREDECLARED_CONSTANTS = ["nil", "iota"];

// predeclared types — not reserved words but always classified as keywords in
// every mainstream Go highlighter. classified here as keyword, not class_name,
// because they are lowercase and share the same visual role as primitives.
const PREDECLARED_TYPES = [
	"any",
	"bool",
	"byte",
	"comparable",
	"complex64",
	"complex128",
	"error",
	"float32",
	"float64",
	"int",
	"int8",
	"int16",
	"int32",
	"int64",
	"rune",
	"string",
	"uint",
	"uint8",
	"uint16",
	"uint32",
	"uint64",
	"uintptr",
];

// predeclared builtin functions. classified as `function` so they render
// distinctly from types.
const PREDECLARED_FUNCTIONS = [
	"append",
	"cap",
	"clear",
	"close",
	"complex",
	"copy",
	"delete",
	"imag",
	"len",
	"make",
	"max",
	"min",
	"new",
	"panic",
	"print",
	"println",
	"real",
	"recover",
];

const BOOLEAN_LITERALS = ["true", "false"];

// ---------------------------------------------------------------------------
// operator and punctuation lists
// ---------------------------------------------------------------------------

// the compiler sorts patterns longest-first inside each first-character
// bucket, so the grouping below is for human readability only — not for
// matching precedence.
const OPERATORS = [
	// 3-char
	"<<=",
	">>=",
	"&^=",
	"...",
	// 2-char
	"&^",
	"+=",
	"-=",
	"*=",
	"/=",
	"%=",
	"&=",
	"|=",
	"^=",
	"<<",
	">>",
	"&&",
	"||",
	"==",
	"!=",
	"<=",
	">=",
	"<-",
	"++",
	"--",
	":=",
	// 1-char
	"+",
	"-",
	"*",
	"/",
	"%",
	"&",
	"|",
	"^",
	"<",
	">",
	"=",
	"!",
	"~",
];

const PUNCTUATION = ["(", ")", "[", "]", "{", "}", ",", ";", ":", "."];

// the 10 two-char patterns that start a bare-dot float: .0 through .9.
// these must appear in main BEFORE the bare "." punctuation rule so that
// `.5` enters the decimal-fraction state instead of being tokenized as a
// dot followed by `5`.
const DOT_FLOAT_STARTS = [
	".0",
	".1",
	".2",
	".3",
	".4",
	".5",
	".6",
	".7",
	".8",
	".9",
];

// ---------------------------------------------------------------------------
// shared rule fragments
// ---------------------------------------------------------------------------

const WHITESPACE = on([" ", "\t", "\n", "\r"]);

// note: we deliberately do NOT use `within()` for comments, strings, or
// runes. the within() helper expands into a content state whose default
// content rule is a range capped at ASCII (0-127). non-ASCII characters
// in a string body, comment, or rune simply fall through the state with
// no token emitted, leaving a gap in the output. explicit states with a
// `fallback({ token })` rule catch non-ASCII because `any: true` maps to
// the fallback_transitions slot used by the tokenizer's non-ASCII branch.
// this is the same approach the rust grammar takes.

// ---------------------------------------------------------------------------
// grammar
// ---------------------------------------------------------------------------

export default define_grammar({
	name: "go",
	states: {
		// -------------------------------------------------------------------
		// main — entry state. go has no lexical ambiguity that requires
		// context switching at the main level: the same tokens are valid
		// everywhere, so all "top-level" tokenization happens here.
		// -------------------------------------------------------------------
		main: {
			rules: [
				WHITESPACE,

				// comments first: `//` must beat `/` and `/=`; `/*` must beat
				// `/` and `/=`. maximal munch sorts multi-char patterns by
				// descending length inside each first-char bucket, so `//`
				// beats `/=` (both 2 chars — same length, but the leading
				// `/` bucket tries them in order, and `//` is specific).
				match("//", TOKENS.comment, enter("line_comment")),
				match("/*", TOKENS.comment, enter("block_comment")),

				// strings and runes.
				match('"', TOKENS.string, enter("string_body")),
				match("`", TOKENS.string, enter("raw_string_body")),
				match("'", TOKENS.string, enter("rune_body")),

				// dot-leading float literals (e.g. `.5`). must come BEFORE the
				// `.` punctuation rule so that `.5` is one number token, not
				// a dot followed by `5`.
				match(DOT_FLOAT_STARTS, TOKENS.number, enter("decimal_fraction")),

				// operators. sorted longest-first inside each first-char
				// bucket by the compiler; grouping below is cosmetic.
				match(OPERATORS, TOKENS.operator),

				// punctuation. note that `.` lives here — but the dot-float
				// rule above already peeled off `.0`-`.9`.
				match(PUNCTUATION, TOKENS.punctuation),

				// keywords and literals with keyword-like word boundaries.
				// order within the keyword family does not matter (they are
				// all length-sorted and boundary-checked). but keyword rules
				// MUST come before the identifier rule so they are not
				// swallowed as identifiers.
				keyword(KEYWORDS),
				keyword(BOOLEAN_LITERALS, {}, TOKENS.boolean),
				keyword(PREDECLARED_CONSTANTS),
				keyword(PREDECLARED_TYPES),
				keyword(PREDECLARED_FUNCTIONS, {}, TOKENS.function),

				// numbers. base-prefixed forms first, then bare-digit. the
				// compiler's maximal munch ensures `0x` beats `0` in the same
				// rule or across rules.
				match(["0x", "0X"], TOKENS.number, enter("hex_number")),
				match(["0b", "0B"], TOKENS.number, enter("binary_number")),
				match(["0o", "0O"], TOKENS.number, enter("octal_number")),
				match(DIGIT, TOKENS.number, enter("decimal_number")),

				// identifiers — must come AFTER all keyword rules. ASCII-only
				// (see known limitations).
				match(["_", LETTER], TOKENS.identifier, enter("identifier")),
			],
		},

		// -------------------------------------------------------------------
		// identifier — ordinary identifier continuation
		// -------------------------------------------------------------------
		identifier: {
			rules: [match(["_", ALNUM], TOKENS.identifier), fallback(leave())],
		},

		// -------------------------------------------------------------------
		// line comment body — consume everything up to and including `\n`.
		// the newline is emitted as part of the comment (same as within()).
		// fallback catches non-ASCII content.
		// -------------------------------------------------------------------
		line_comment: {
			rules: [
				match("\n", TOKENS.comment, leave()),
				fallback({ token: TOKENS.comment }),
			],
		},

		// -------------------------------------------------------------------
		// block comment body — consume up to and including `*/`.
		// go block comments DO NOT nest; first `*/` wins.
		// -------------------------------------------------------------------
		block_comment: {
			rules: [
				match("*/", TOKENS.comment, leave()),
				fallback({ token: TOKENS.comment }),
			],
		},

		// -------------------------------------------------------------------
		// interpreted string body — "..." with \-escapes. newlines inside
		// are a syntax error per spec, but the highlighter does not enforce
		// that; an unterminated string consumes until the next `"` or EOF.
		// escapes route through the shared string_escape_start sub-machine
		// so every form (\uNNNN, \UNNNNNNNN, \xNN, \NNN octal, \n / \t /
		// etc.) emits as a distinct `string_escape` token.
		// -------------------------------------------------------------------
		string_body: {
			rules: [
				match("\\", TOKENS.string_escape, enter("string_escape_start")),
				match('"', TOKENS.string, leave()),
				fallback({ token: TOKENS.string }),
			],
		},

		// -------------------------------------------------------------------
		// raw string body — `...` with NO escapes. backticks cannot appear
		// inside; newlines ARE allowed and become part of the token.
		// -------------------------------------------------------------------
		raw_string_body: {
			rules: [
				match("`", TOKENS.string, leave()),
				fallback({ token: TOKENS.string }),
			],
		},

		// -------------------------------------------------------------------
		// rune body — '...' with \-escapes. a rune contains exactly one
		// character or one escape per spec, but the tokenizer does not
		// enforce that (over-accepting multi-char runes is what prism and
		// pygments also do). escapes share the same sub-machine as strings.
		// -------------------------------------------------------------------
		rune_body: {
			rules: [
				match("\\", TOKENS.string_escape, enter("string_escape_start")),
				match("'", TOKENS.string, leave()),
				fallback({ token: TOKENS.string }),
			],
		},

		// -------------------------------------------------------------------
		// escape sub-machine — shared by string_body and rune_body.
		//
		// go recognises five structured escape forms plus simple 1-char
		// escapes:
		//   - `\uNNNN`     — 4 hex digits (BMP unicode)
		//   - `\UNNNNNNNN` — 8 hex digits (full unicode)
		//   - `\xNN`       — exactly 2 hex digits (byte value)
		//   - `\NNN`       — exactly 3 octal digits (byte value 0-255)
		//   - `\X`         — 1-char escape (\a \b \f \n \r \t \v \\ \' \")
		//
		// sub-states transition via `goto` so the stack depth stays at +1
		// above the string/rune body; the terminal state's `leave()` (or
		// a fallback(leave()) on a too-short escape) pops back. partial
		// matches unwind without consuming so the remaining chars are
		// picked up by the parent body.
		// -------------------------------------------------------------------
		string_escape_start: {
			rules: [
				match("x", TOKENS.string_escape, goto("esc_hex_d1")),
				match("u", TOKENS.string_escape, goto("esc_u4_d1")),
				match("U", TOKENS.string_escape, goto("esc_u8_d1")),
				// octal first digit 0-7. the spec requires exactly 3 digits,
				// so esc_oct_d2 and esc_oct_d3 are strict (fallback leaves
				// without consuming on anything non-octal).
				match(
					range([["0", "7"]]),
					TOKENS.string_escape,
					goto("esc_oct_d2"),
				),
				// simple 1-char escape (\n, \t, \\, \", \', \a, \b, \f, \r,
				// \v, and unrecognized \z etc.).
				fallback({ token: TOKENS.string_escape, exit: true }),
			],
		},

		// \xNN — exactly 2 hex digits.
		esc_hex_d1: {
			rules: [
				match(HEX, TOKENS.string_escape, goto("esc_hex_d2")),
				fallback(leave()),
			],
		},
		esc_hex_d2: {
			rules: [
				match(HEX, TOKENS.string_escape, leave()),
				fallback(leave()),
			],
		},

		// \uNNNN — exactly 4 hex digits.
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

		// \UNNNNNNNN — exactly 8 hex digits.
		esc_u8_d1: {
			rules: [
				match(HEX, TOKENS.string_escape, goto("esc_u8_d2")),
				fallback(leave()),
			],
		},
		esc_u8_d2: {
			rules: [
				match(HEX, TOKENS.string_escape, goto("esc_u8_d3")),
				fallback(leave()),
			],
		},
		esc_u8_d3: {
			rules: [
				match(HEX, TOKENS.string_escape, goto("esc_u8_d4")),
				fallback(leave()),
			],
		},
		esc_u8_d4: {
			rules: [
				match(HEX, TOKENS.string_escape, goto("esc_u8_d5")),
				fallback(leave()),
			],
		},
		esc_u8_d5: {
			rules: [
				match(HEX, TOKENS.string_escape, goto("esc_u8_d6")),
				fallback(leave()),
			],
		},
		esc_u8_d6: {
			rules: [
				match(HEX, TOKENS.string_escape, goto("esc_u8_d7")),
				fallback(leave()),
			],
		},
		esc_u8_d7: {
			rules: [
				match(HEX, TOKENS.string_escape, goto("esc_u8_d8")),
				fallback(leave()),
			],
		},
		esc_u8_d8: {
			rules: [
				match(HEX, TOKENS.string_escape, leave()),
				fallback(leave()),
			],
		},

		// \NNN octal — exactly 3 octal digits. the first digit was consumed
		// by string_escape_start, so these states handle only the 2nd and
		// 3rd slots.
		esc_oct_d2: {
			rules: [
				match(
					range([["0", "7"]]),
					TOKENS.string_escape,
					goto("esc_oct_d3"),
				),
				fallback(leave()),
			],
		},
		esc_oct_d3: {
			rules: [
				match(range([["0", "7"]]), TOKENS.string_escape, leave()),
				fallback(leave()),
			],
		},

		// -------------------------------------------------------------------
		// numeric states.
		//
		// every numeric sub-state falls back with `goto("main")` rather than
		// `leave()`. this is intentional: because sub-states chain via
		// enter() (decimal_number -> decimal_fraction -> exponent_sign ->
		// exponent_digits), a deep leave() would stop at the first parent,
		// not jump back to main. going directly to main with goto() drops
		// whatever intermediate frames remain on the stack; those frames are
		// harmlessly leaked because main never calls leave().
		// this matches the pattern used by the JSON and JavaScript grammars.
		// -------------------------------------------------------------------

		// decimal number after the leading digit. covers:
		//   - pure decimal integers (42, 1_000)
		//   - legacy octal (0600) — same shape, parser decides base
		//   - decimal floats (1.5, 1e5, 1.5e5)
		//   - imaginary suffix (42i, 1.5i, 1e5i)
		decimal_number: {
			rules: [
				match(["_", DIGIT], TOKENS.number),
				match(".", TOKENS.number, enter("decimal_fraction")),
				match(["e", "E"], TOKENS.number, enter("exponent_sign")),
				match("i", TOKENS.number, goto("main")),
				fallback(goto("main")),
			],
		},

		// after a decimal point (from `1.` or `.5`): more digits + optional
		// exponent + optional `i`.
		decimal_fraction: {
			rules: [
				match(["_", DIGIT], TOKENS.number),
				match(["e", "E"], TOKENS.number, enter("exponent_sign")),
				match("i", TOKENS.number, goto("main")),
				fallback(goto("main")),
			],
		},

		// right after `e`/`E` in a decimal float — optional sign then digits.
		exponent_sign: {
			rules: [
				match(["+", "-"], TOKENS.number, enter("exponent_digits")),
				match(DIGIT, TOKENS.number, enter("exponent_digits")),
				fallback(goto("main")),
			],
		},

		exponent_digits: {
			rules: [
				match(["_", DIGIT], TOKENS.number),
				match("i", TOKENS.number, goto("main")),
				fallback(goto("main")),
			],
		},

		// hex integer / hex float after `0x` or `0X`. hex floats REQUIRE a
		// `p`/`P` exponent per spec; without `p`, it is a hex integer that
		// stops at the first non-hex character. this is why `0x15e-2` lexes
		// as `0x15e` + `-` + `2` rather than a hex float: no `p`.
		hex_number: {
			rules: [
				match(["_", HEX], TOKENS.number),
				match(".", TOKENS.number, enter("hex_fraction")),
				match(["p", "P"], TOKENS.number, enter("hex_exponent_sign")),
				match("i", TOKENS.number, goto("main")),
				fallback(goto("main")),
			],
		},

		hex_fraction: {
			rules: [
				match(["_", HEX], TOKENS.number),
				match(["p", "P"], TOKENS.number, enter("hex_exponent_sign")),
				match("i", TOKENS.number, goto("main")),
				fallback(goto("main")),
			],
		},

		// hex float exponent — digits are DECIMAL even though the mantissa
		// is hex (p-exponent scales by powers of 2).
		hex_exponent_sign: {
			rules: [
				match(["+", "-"], TOKENS.number, enter("hex_exponent_digits")),
				match(DIGIT, TOKENS.number, enter("hex_exponent_digits")),
				fallback(goto("main")),
			],
		},

		hex_exponent_digits: {
			rules: [
				match(["_", DIGIT], TOKENS.number),
				match("i", TOKENS.number, goto("main")),
				fallback(goto("main")),
			],
		},

		// binary integer after `0b`/`0B`. only digits 0 and 1.
		binary_number: {
			rules: [
				match(["_", "0", "1"], TOKENS.number),
				match("i", TOKENS.number, goto("main")),
				fallback(goto("main")),
			],
		},

		// explicit-prefix octal integer after `0o`/`0O`. digits 0-7.
		// (legacy leading-zero octal `0600` goes through decimal_number,
		// because the parser distinguishes base from digit set — for a
		// highlighter, emitting a single `number` token is correct.)
		octal_number: {
			rules: [
				match(["_", range([["0", "7"]])], TOKENS.number),
				match("i", TOKENS.number, goto("main")),
				fallback(goto("main")),
			],
		},
	},
});
