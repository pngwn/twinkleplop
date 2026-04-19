// JavaScript grammar — regex/division disambiguation via state machine.
// Built with the @twinkleplop/core DSL helpers (match/on/keyword/within/fallback
// + enter/goto/leave/to), so rules are plain JS composition rather than a
// declarative JSON blob.

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
	to,
	within,
} from "@twinkleplop/core";

import { define_grammar } from "@twinkleplop/core/compile";
//Tokens
import * as TOKENS from "@twinkleplop/core/tokens";

// ---------------------------------------------------------------------------
// Keyword / literal sets
// ---------------------------------------------------------------------------

export const KEYWORDS = [
	// Control flow
	"if",
	"else",
	"switch",
	"case",
	"default",
	"while",
	"do",
	"for",
	"break",
	"continue",
	"return",
	// Declarations
	"var",
	"let",
	"const",
	"function",
	"class",
	"extends",
	"static",
	"async",
	"await",
	// Operators / expressions
	"new",
	"typeof",
	"instanceof",
	"in",
	"of",
	"delete",
	"void",
	// Exception handling
	"try",
	"catch",
	"finally",
	"throw",
	// Module system
	"import",
	"export",
	"from",
	"as",
	// Other
	"this",
	"super",
	"null",
	"undefined",
	"debugger",
	"with",
	"yield",
	"get",
	"set",
];

export const BOOLEAN_LITERALS = ["true", "false"];
export const SPECIAL_VALUES = ["undefined", "null", "NaN", "Infinity"];

// Keywords after which `/` starts a regex.
export const REGEX_PRECEDING_KEYWORDS = [
	"return",
	"throw",
	"typeof",
	"new",
	"void",
	"delete",
	"in",
	"of",
	"instanceof",
	"yield",
	"await",
	"case",
	"else",
];

// Keywords after which `/` is division (value-producing keywords).
export const DIVISION_KEYWORDS = KEYWORDS.filter(
	(k) => !REGEX_PRECEDING_KEYWORDS.includes(k),
);

// ---------------------------------------------------------------------------
// Operator sets
// ---------------------------------------------------------------------------
//
// The compiler sorts each first-char bucket by descending length, so a single
// rule matching a flat list of operators yields correct longest-match
// semantics (`/=` wins over `/`, `>>>=` wins over `>>>`, etc.).

export const OP_4CHAR = [">>>="];
export const OP_3CHAR = [
	"===",
	"!==",
	">>>",
	"<<=",
	">>=",
	"**=",
	"&&=",
	"||=",
	"??=",
];
export const OP_SPREAD = "...";
export const OP_2CHAR = [
	"++",
	"--",
	"<=",
	">=",
	"==",
	"!=",
	"&&",
	"||",
	"<<",
	">>",
	"**",
	"??",
	"?.",
	"=>",
	"+=",
	"-=",
	"*=",
	"/=",
	"%=",
	"&=",
	"|=",
	"^=",
];
export const OP_1CHAR = [
	"-",
	"+",
	"<",
	">",
	"=",
	"!",
	"&",
	"|",
	"?",
	"*",
	"~",
	"^",
	"%",
	":",
];

// Full operator set (excludes bare `/`, which is state-dependent).
export const OP_ALL = [
	...OP_4CHAR,
	...OP_3CHAR,
	OP_SPREAD,
	...OP_2CHAR,
	...OP_1CHAR,
];

// Operator subset used by identifier_probe's "not a function call" rule.
export const PROBE_OPERATORS = [
	"===",
	"!==",
	"--",
	"++",
	"<=",
	">=",
	"==",
	"!=",
	"&&",
	"||",
	"-",
	"+",
	"<",
	">",
	"=",
	"!",
	"&",
	"|",
	"?",
	"*",
	"/",
	"~",
	"^",
	"%",
];

// Non-operator chars that terminate an identifier and signal "not a function
// call". Used by both identifier_probe and identifier_probe_tmpl.
export const IDENTIFIER_TERMINATORS = [
	".",
	" ",
	"\t",
	"\n",
	"\r",
	")",
	"[",
	"]",
	"{",
	"}",
	";",
	",",
	"`",
];

// ---------------------------------------------------------------------------
// Common rule constants
// ---------------------------------------------------------------------------

export const SINGLE_LINE_COMMENT = within("//", "\n", "comment");
export const MULTI_LINE_COMMENT = within("/*", "*/", "comment");
// strings use explicit body states (string_double / string_single) so that
// escape sequences (\n, \t, \xNN, \uNNNN, \u{...}) can be emitted as distinct
// `string_escape` tokens. the body states themselves are defined on the
// grammar below; they pop back to whatever state pushed them, matching the
// old within-based "don't change outer state" semantics.
export const STRING_DOUBLE = match('"', TOKENS.string, enter("string_double"));
export const STRING_SINGLE = match("'", TOKENS.string, enter("string_single"));
export const TEMPLATE_LITERAL = match(
	"`",
	TOKENS.template,
	enter("template_literal"),
);

// ---------------------------------------------------------------------------
// Rule groups (shared fragments, spread into states)
// ---------------------------------------------------------------------------

export const js_comments = [SINGLE_LINE_COMMENT, MULTI_LINE_COMMENT];
export const js_strings = [STRING_DOUBLE, STRING_SINGLE, TEMPLATE_LITERAL];
export const js_whitespace = [on([" ", "\t", "\n", "\r"])];

// Numbers in top-level contexts — sideways-transition to the number state
// (which eventually exits to `division`).
export const js_numbers_top = [
	match(["0x", "0X"], TOKENS.number, goto("hex_number")),
	match(["0b", "0B"], TOKENS.number, goto("binary_number")),
	match(["0o", "0O"], TOKENS.number, goto("octal_number")),
	match(DIGIT, TOKENS.number, goto(TOKENS.number)),
];

// Numbers in argument/group contexts — push nested number states (pop back
// instead of sideways-transitioning to `division`).
export const js_numbers_arg = [
	match(["0x", "0X"], TOKENS.number, enter("hex_number_arg")),
	match(["0b", "0B"], TOKENS.number, enter("binary_number_arg")),
	match(["0o", "0O"], TOKENS.number, enter("octal_number_arg")),
	match(DIGIT, TOKENS.number, enter("number_arg")),
];

// Shared foundation for main / regex_allow / division / tmpl_* states.
// Excludes operators, punctuation, keywords, identifiers, and slash handling —
// those differ per state.
export const js_common = [
	...js_comments,
	...js_strings,
	...js_numbers_top,
	...js_whitespace,
];

// Shared foundation for function_body / paren_group. Uses arg-variant number
// states (pop back instead of sideways to top-level `division`).
export const js_body_common = [
	...js_comments,
	...js_strings,
	...js_numbers_arg,
];

// Shared foundation for tmpl_* states inside `${...}`. Uses arg-variant number
// states (push semantics → pop back to the tmpl context instead of sideways to
// base `division`) and keeps template literals in the strings set so nested
// `${...}` can push a fresh `template_literal`.
export const js_tmpl_common = [
	...js_comments,
	...js_strings,
	...js_numbers_arg,
	...js_whitespace,
];

// Rules used inside `paren_group`.
export const js_paren_common = [
	match(")", TOKENS.punctuation, leave()),
	match(",", TOKENS.punctuation),
	match(["[", "]", "{", "}", ";", "."], TOKENS.punctuation),
	match(["===", "!=="], TOKENS.operator),
	match(["--", "++", "<=", ">=", "==", "!=", "&&", "||"], TOKENS.operator),
	match(
		["-", "+", "<", ">", "=", "!", "&", "|", "?", "*", "/", "~", "^", "%"],
		TOKENS.operator,
	),
	match(BOOLEAN_LITERALS, TOKENS.boolean),
	match(["_", "$", ALNUM], TOKENS.identifier),
];

// ---------------------------------------------------------------------------
// Parameterised rule factories
// ---------------------------------------------------------------------------

// Full operator set as one rule. `after` = null → stay; string → sideways.
export const operators = (after: null | "regex_allow" | "tmpl_regex_allow") =>
	match(OP_ALL, TOKENS.operator, to(after));

// Keyword + literal branching.
//   regexDest → where REGEX_PRECEDING_KEYWORDS go after matching
//   divDest   → where DIVISION_KEYWORDS / literals go after matching
// null → stay in current state.
export const keywordsLiterals = (
	regexDest: null | "regex_allow" | "tmpl_regex_allow",
	divDest: null | "division" | "tmpl_division",
) => [
	keyword(REGEX_PRECEDING_KEYWORDS, to(regexDest)),
	keyword(DIVISION_KEYWORDS, to(divDest)),
	keyword(BOOLEAN_LITERALS, to(divDest), TOKENS.boolean),
	keyword(SPECIAL_VALUES, to(divDest)),
];

// ---------------------------------------------------------------------------
// Grammar
// ---------------------------------------------------------------------------

/**
 * @type {import("@twinkleplop/core").Grammar}
 */
export default define_grammar({
	name: "javascript",

	states: {
		// -------------------------------------------------------------------------
		// regex_allow — initial state and return target; `/` starts a regex here
		// -------------------------------------------------------------------------
		regex_allow: {
			rules: [
				...js_common,
				operators(null),
				...keywordsLiterals(null, "division"),

				// Here, `/` is a regex!
				match("/", TOKENS.regex, enter("regex_pattern")),

				// Punctuation
				match(["(", "{", "["], TOKENS.punctuation),
				match([")", "}", "]"], TOKENS.punctuation, goto("division")),
				match([";", ",", "."], TOKENS.punctuation),

				// Identifiers
				on(["_", "$", LETTER], goto("identifier_probe")),
			],
		},

		identifier_probe: {
			mode: "probe",
			fallback: TOKENS.identifier,
			rules: [
				on("(", goto("function_name")),
				on(
					[...IDENTIFIER_TERMINATORS, ...PROBE_OPERATORS],
					goto(TOKENS.identifier),
				),
			],
		},

		function_name: {
			rules: [
				match(["_", "$", ALNUM], TOKENS.function),
				match("(", TOKENS.punctuation, goto("function_body")),
				on([" ", "\t"]),
			],
		},

		// -------------------------------------------------------------------------
		// function_body — inside call-site parentheses (top-level context)
		// -------------------------------------------------------------------------
		function_body: {
			rules: [
				...js_body_common,

				// End of arguments
				match(")", TOKENS.punctuation, goto("division")),
				// Nested parentheses
				match("(", TOKENS.punctuation, enter("paren_group")),
				// Argument separator
				match(",", TOKENS.punctuation),

				// Operators (legacy subset — no compound assigns here)
				match(["===", "!=="], TOKENS.operator),
				match(
					["--", "++", "<=", ">=", "==", "!=", "&&", "||"],
					TOKENS.operator,
				),
				match(
					["-", "+", "<", ">", "=", "!", "&", "|", "?", "*", "~", "^", "%"],
					TOKENS.operator,
				),
				match("/", TOKENS.regex, enter("regex_pattern")),

				// Other punctuation
				match(["[", "]", "{", "}"], TOKENS.punctuation),
				match([";", "."], TOKENS.punctuation),

				// Literals
				match(BOOLEAN_LITERALS, TOKENS.boolean),

				// Identifiers (recursive probe for nested function calls)
				on(["_", "$", LETTER], goto("identifier_probe")),
			],
		},

		// -------------------------------------------------------------------------
		// paren_group — nested parentheses inside function arguments
		// -------------------------------------------------------------------------
		paren_group: {
			rules: [
				...js_body_common,
				...js_paren_common,
				match("(", TOKENS.punctuation, enter("paren_group")),
			],
		},

		// -------------------------------------------------------------------------
		// Number states — argument/group context (pop back on exit)
		// Each continuation accepts `_` as a numeric separator.
		// -------------------------------------------------------------------------
		number_arg: {
			rules: [
				match(["_", DIGIT], TOKENS.number),
				match(".", TOKENS.number, enter("decimal_number_arg")),
				match(["e", "E"], TOKENS.number, enter("exponent_sign_arg")),
				match("n", TOKENS.number, leave()),
				fallback(leave()),
			],
		},

		decimal_number_arg: {
			rules: [
				match(["_", DIGIT], TOKENS.number),
				match(["e", "E"], TOKENS.number, enter("exponent_sign_arg")),
				fallback(leave()),
			],
		},

		exponent_sign_arg: {
			rules: [
				match(["+", "-"], TOKENS.number, enter("exponent_digits_arg")),
				match(DIGIT, TOKENS.number, enter("exponent_digits_arg")),
			],
		},

		exponent_digits_arg: {
			rules: [match(["_", DIGIT], TOKENS.number), fallback(leave())],
		},

		hex_number_arg: {
			rules: [
				match(["_", HEX], TOKENS.number),
				match("n", TOKENS.number, leave()),
				fallback(leave()),
			],
		},

		binary_number_arg: {
			rules: [
				match(["_", "0", "1"], TOKENS.number),
				match("n", TOKENS.number, leave()),
				fallback(leave()),
			],
		},

		octal_number_arg: {
			rules: [
				match(["_", range([["0", "7"]])], TOKENS.number),
				match("n", TOKENS.number, leave()),
				fallback(leave()),
			],
		},

		// -------------------------------------------------------------------------
		// identifier — reached via probe; handles trailing punctuation/ops
		// -------------------------------------------------------------------------
		identifier: {
			rules: [
				match(["_", "$", ALNUM], TOKENS.identifier),
				// Tagged template literal — backtick after identifier (e.g. html`...`)
				TEMPLATE_LITERAL,
				// Opening brackets after an identifier
				match(["(", "[", "{"], TOKENS.punctuation, goto("regex_allow")),
				// Closing brackets after an identifier
				match([")", "]", "}"], TOKENS.punctuation, goto("division")),
				// Comma and semicolon delimiters
				match([",", ";"], TOKENS.punctuation, goto("regex_allow")),
				// Dot accessor
				match(".", TOKENS.punctuation, goto("division")),
				// All operators including `/` and `/=` — sideways to regex_allow
				match([...OP_ALL, "/"], TOKENS.operator, goto("regex_allow")),
				// Whitespace after identifier → switch to division context
				on([" ", "\t", "\n", "\r"], goto("division")),
			],
		},

		// -------------------------------------------------------------------------
		// division — after values or closing brackets; `/` is the division operator
		// -------------------------------------------------------------------------
		division: {
			rules: [
				...js_common,
				operators("regex_allow"),
				...keywordsLiterals("regex_allow", null),

				// Opening brackets — after these, `/` is regex
				match(["(", "{", "["], TOKENS.punctuation, goto("regex_allow")),
				// Here, `/` is division — `operators(...)` covers `/=`; bare `/` is its own rule
				match("/", TOKENS.operator, goto("regex_allow")),

				// Punctuation
				match([")", "}", "]"], TOKENS.punctuation),
				match([";", ","], TOKENS.punctuation, goto("regex_allow")),
				match(".", TOKENS.punctuation),

				// Identifiers
				on(["_", "$", LETTER], goto("identifier_probe")),
			],
		},

		// -------------------------------------------------------------------------
		// Number states — top-level (sideways to division on exit)
		//
		// Each continuation rule accepts `_` as a numeric separator (ES2021),
		// so literals like `1_000_000` or `0xFF_FF_FF` are one number token.
		// -------------------------------------------------------------------------
		number: {
			rules: [
				match(["_", DIGIT], TOKENS.number),
				match(".", TOKENS.number, enter("decimal_number")),
				match(["e", "E"], TOKENS.number, enter("exponent_sign")),
				match("n", TOKENS.number, goto("division")),
				fallback(goto("division")),
			],
		},

		decimal_number: {
			rules: [
				match(["_", DIGIT], TOKENS.number),
				match(["e", "E"], TOKENS.number, enter("exponent_sign")),
				fallback(goto("division")),
			],
		},

		exponent_sign: {
			rules: [
				match(["+", "-"], TOKENS.number, enter("exponent_digits")),
				match(DIGIT, TOKENS.number, enter("exponent_digits")),
			],
		},

		exponent_digits: {
			rules: [match(["_", DIGIT], TOKENS.number), fallback(goto("division"))],
		},

		hex_number: {
			rules: [
				match(["_", HEX], TOKENS.number),
				match("n", TOKENS.number, goto("division")),
				fallback(goto("division")),
			],
		},

		binary_number: {
			rules: [
				match(["_", "0", "1"], TOKENS.number),
				match("n", TOKENS.number, goto("division")),
				fallback(goto("division")),
			],
		},

		octal_number: {
			rules: [
				match(["_", range([["0", "7"]])], TOKENS.number),
				match("n", TOKENS.number, goto("division")),
				fallback(goto("division")),
			],
		},

		// -------------------------------------------------------------------------
		// String body states — pushed from STRING_DOUBLE / STRING_SINGLE.
		//
		// escapes route to the shared esc_* sub-machine so each escape
		// sequence emits its own `string_escape` token:
		//   - `\u{...}` → esc_u_braces (arbitrary hex + closing `}`)
		//   - `\uNNNN`  → esc_u4_d1 .. esc_u4_d4 (up to 4 hex digits)
		//   - `\xNN`    → esc_hex_d1, esc_hex_d2 (up to 2 hex digits)
		//   - `\X`      → esc_simple (any single char, incl. `\n`, `\\`,
		//                 `\"`, `\'`, `\0`, `\<newline>` line continuation)
		//
		// the longer matches come first so `\u{` wins over `\u` and `\u`
		// wins over `\`.
		// -------------------------------------------------------------------------
		string_double: {
			rules: [
				match("\\u{", TOKENS.string_escape, enter("esc_u_braces")),
				match("\\u", TOKENS.string_escape, enter("esc_u4_d1")),
				match("\\x", TOKENS.string_escape, enter("esc_hex_d1")),
				match("\\", TOKENS.string_escape, enter("esc_simple")),
				match('"', TOKENS.string, leave()),
				fallback({ token: TOKENS.string }),
			],
		},

		string_single: {
			rules: [
				match("\\u{", TOKENS.string_escape, enter("esc_u_braces")),
				match("\\u", TOKENS.string_escape, enter("esc_u4_d1")),
				match("\\x", TOKENS.string_escape, enter("esc_hex_d1")),
				match("\\", TOKENS.string_escape, enter("esc_simple")),
				match("'", TOKENS.string, leave()),
				fallback({ token: TOKENS.string }),
			],
		},

		// -------------------------------------------------------------------------
		// shared escape sub-states — used by string_double, string_single,
		// and template_literal. every sub-state emits `string_escape`; the
		// final consumed char uses `leave()` (or the 1-char fallback exits)
		// to pop back to the parent string/template body. partial matches
		// like `\x` (no hex digits) unwind via `fallback(leave())` without
		// consuming, so the parent body re-processes the char normally.
		// -------------------------------------------------------------------------
		esc_simple: {
			rules: [fallback({ token: TOKENS.string_escape, exit: true })],
		},

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

		esc_u_braces: {
			rules: [
				match(HEX, TOKENS.string_escape),
				match("}", TOKENS.string_escape, leave()),
				fallback(leave()),
			],
		},

		// -------------------------------------------------------------------------
		// Template literal
		//
		// escapes route through the same esc_* sub-machine as strings so
		// `\`` is an escape (doesn't terminate the template) and `\n` /
		// `\u{...}` etc. emit as `string_escape` for themeable contrast
		// against the surrounding `template` content.
		// -------------------------------------------------------------------------
		template_literal: {
			rules: [
				match("${", TOKENS.punctuation, enter("tmpl_regex_allow")),
				match("\\u{", TOKENS.string_escape, enter("esc_u_braces")),
				match("\\u", TOKENS.string_escape, enter("esc_u4_d1")),
				match("\\x", TOKENS.string_escape, enter("esc_hex_d1")),
				match("\\", TOKENS.string_escape, enter("esc_simple")),
				match("`", TOKENS.template, leave()),
				fallback({ token: TOKENS.template }),
			],
		},

		// -------------------------------------------------------------------------
		// tmpl_regex_allow — inside `${...}`, "expression expected" context
		//
		// Pushed from template_literal on `${`. Transitions between tmpl_* states
		// use `goto` (sideways) to keep depth constant, EXCEPT for `{` which
		// pushes (enters) `tmpl_regex_allow` recursively to track brace depth.
		// This makes `}` pop one brace level at a time — the interpolation only
		// truly ends when the stack pops back to `template_literal`, which
		// naturally handles nested object literals, function bodies, and block
		// statements inside `${...}` expressions like `${fn({a: 1})}`.
		// -------------------------------------------------------------------------
		tmpl_regex_allow: {
			rules: [
				...js_tmpl_common,
				operators(null),
				...keywordsLiterals(null, "tmpl_division"),

				match("}", TOKENS.punctuation, leave()),
				match("/", TOKENS.regex, enter("regex_pattern")),
				// `{` pushes tmpl_regex_allow recursively — tracks brace depth.
				match("{", TOKENS.punctuation, enter("tmpl_regex_allow")),
				match(["(", "["], TOKENS.punctuation),
				match([")", "]"], TOKENS.punctuation, goto("tmpl_division")),
				match([";", ",", "."], TOKENS.punctuation),

				on(["_", "$", LETTER], goto("identifier_probe_tmpl")),
			],
		},

		// -------------------------------------------------------------------------
		// tmpl_division — after a value inside `${...}`; `/` is division
		// -------------------------------------------------------------------------
		tmpl_division: {
			rules: [
				...js_tmpl_common,
				operators("tmpl_regex_allow"),
				...keywordsLiterals("tmpl_regex_allow", null),

				match("}", TOKENS.punctuation, leave()),
				// `{` pushes tmpl_regex_allow to track brace depth (same as
				// tmpl_regex_allow — after `{` we're back in expression context).
				match("{", TOKENS.punctuation, enter("tmpl_regex_allow")),
				match(["(", "["], TOKENS.punctuation, goto("tmpl_regex_allow")),
				match("/", TOKENS.operator, goto("tmpl_regex_allow")),
				match([")", "]"], TOKENS.punctuation),
				match([";", ","], TOKENS.punctuation, goto("tmpl_regex_allow")),
				match(".", TOKENS.punctuation),

				on(["_", "$", LETTER], goto("identifier_probe_tmpl")),
			],
		},

		// -------------------------------------------------------------------------
		// identifier_probe_tmpl — tmpl-aware version of identifier_probe
		//
		// Same probe semantics as the base identifier_probe, but fallbacks /
		// matches to tmpl-aware targets so function-call detection keeps us in
		// the interpolation universe.
		// -------------------------------------------------------------------------
		identifier_probe_tmpl: {
			mode: "probe",
			fallback: "identifier_tmpl",
			rules: [
				on("(", goto("function_name_tmpl")),
				on(
					[...IDENTIFIER_TERMINATORS, ...PROBE_OPERATORS],
					goto("identifier_tmpl"),
				),
			],
		},

		// -------------------------------------------------------------------------
		// function_name_tmpl — emits `function` tokens for a call-site identifier
		// inside `${...}`. Mirror of base function_name.
		// -------------------------------------------------------------------------
		function_name_tmpl: {
			rules: [
				match(["_", "$", ALNUM], TOKENS.function),
				match("(", TOKENS.punctuation, goto("function_body_tmpl")),
				on([" ", "\t"]),
			],
		},

		// -------------------------------------------------------------------------
		// function_body_tmpl — call-site args inside `${...}`. Mirror of base
		// function_body but transitions to tmpl_division on `)` so we stay in
		// the interpolation universe. `{` pushes tmpl_regex_allow to track
		// brace depth and `}` leaves so nested object literals inside call
		// arguments (like `${fn({a: 1})}`) work correctly.
		// -------------------------------------------------------------------------
		function_body_tmpl: {
			rules: [
				...js_body_common,

				match(")", TOKENS.punctuation, goto("tmpl_division")),
				match("(", TOKENS.punctuation, enter("paren_group")),
				match(",", TOKENS.punctuation),

				match(["===", "!=="], TOKENS.operator),
				match(
					["--", "++", "<=", ">=", "==", "!=", "&&", "||"],
					TOKENS.operator,
				),
				match(
					["-", "+", "<", ">", "=", "!", "&", "|", "?", "*", "~", "^", "%"],
					TOKENS.operator,
				),
				match("/", TOKENS.regex, enter("regex_pattern")),

				// Brace-depth tracking inside interpolation: `{` pushes, `}` pops.
				match("{", TOKENS.punctuation, enter("tmpl_regex_allow")),
				match("}", TOKENS.punctuation, leave()),
				match(["[", "]"], TOKENS.punctuation),
				match([";", "."], TOKENS.punctuation),

				match(BOOLEAN_LITERALS, TOKENS.boolean),

				on(["_", "$", LETTER], goto("identifier_probe_tmpl")),
			],
		},

		// -------------------------------------------------------------------------
		// identifier_tmpl — inside an identifier inside `${...}`
		//
		// Entered from identifier_probe_tmpl's fallback when the identifier is
		// NOT a function call. Mirrors the base `identifier` state with tmpl_*
		// targets; `}` is carved out as `leave()` so the closing brace of the
		// interpolation pops directly back to template_literal.
		// -------------------------------------------------------------------------
		identifier_tmpl: {
			rules: [
				match(["_", "$", ALNUM], TOKENS.identifier),
				// Tagged template literal inside an interpolation
				TEMPLATE_LITERAL,
				// `{` pushes a new brace level so `}` pops one level at a time
				// — required for `${ obj.method({a: 1}) }` and similar.
				match("{", TOKENS.punctuation, enter("tmpl_regex_allow")),
				match(["(", "["], TOKENS.punctuation, goto("tmpl_regex_allow")),
				match("}", TOKENS.punctuation, leave()),
				match([")", "]"], TOKENS.punctuation, goto("tmpl_division")),
				match([",", ";"], TOKENS.punctuation, goto("tmpl_regex_allow")),
				match(".", TOKENS.punctuation, goto("tmpl_division")),
				match([...OP_ALL, "/"], TOKENS.operator, goto("tmpl_regex_allow")),
				on([" ", "\t", "\n", "\r"], goto("tmpl_division")),
			],
		},

		// -------------------------------------------------------------------------
		// Regex pattern states
		// -------------------------------------------------------------------------
		regex_pattern: {
			rules: [
				match("/", TOKENS.regex, goto("regex_flags")),
				match("\\", TOKENS.regex, enter("regex_escape")),
				match("[", TOKENS.regex, enter("regex_class")),
				on(["\n", ";"], goto("division")),
				fallback({ token: TOKENS.regex }),
			],
		},

		regex_escape: {
			rules: [fallback({ token: TOKENS.regex, exit: true })],
		},

		regex_class: {
			rules: [
				match("]", TOKENS.regex, leave()),
				match("\\", TOKENS.regex, enter("regex_class_escape")),
				fallback({ token: TOKENS.regex }),
			],
		},

		regex_class_escape: {
			rules: [fallback({ token: TOKENS.regex, exit: true })],
		},

		regex_flags: {
			rules: [
				match(["g", "i", "m", "s", "u", "y", "d"], TOKENS.regex),
				fallback(leave()),
			],
		},
	},
});
