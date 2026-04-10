// JavaScript grammar - minimal fix for regex/division disambiguation
// Based on original_grammar.js with improved regex/division handling

const KEYWORDS = [
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
	// Operators/expressions
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

const BOOLEAN_LITERALS = ["true", "false"];
const SPECIAL_VALUES = ["undefined", "null", "NaN", "Infinity"];

// Keywords after which / starts a regex
const REGEX_PRECEDING_KEYWORDS = [
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

const OPERATORS = [
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

// Common character ranges
const LETTER_RANGE = [
	["a", "z"],
	["A", "Z"],
];
const DIGIT_RANGE = [["0", "9"]];
const ALPHANUMERIC_RANGE = [...LETTER_RANGE, ...DIGIT_RANGE];
const HEX_RANGE = [...DIGIT_RANGE, ["a", "f"], ["A", "F"]];

// Common patterns
const SINGLE_LINE_COMMENT = {
	match_within: { start: "//", end: "\n" },
	token: "comment",
};

const MULTI_LINE_COMMENT = {
	match_within: { start: "/*", end: "*/" },
	token: "comment",
};

const STRING_DOUBLE = {
	match_within: { start: '"', end: '"', escape: "\\", multiline: true },
	token: "string",
};

const STRING_SINGLE = {
	match_within: { start: "'", end: "'", escape: "\\", multiline: true },
	token: "string",
};

const TEMPLATE_LITERAL = {
	match: "`",
	token: "template",
	state: "template_literal",
};

/**
 * @type {import("@twinkleplop/core").Grammar}
 */
export default {
	name: "javascript",

	rulesets: {
		// ---------------------------------------------------------------------------
		// Atomic rulesets
		// ---------------------------------------------------------------------------

		// Line and block comments
		js_comments: {
			rules: [SINGLE_LINE_COMMENT, MULTI_LINE_COMMENT],
		},

		// All string forms including template literals
		js_strings: {
			rules: [STRING_DOUBLE, STRING_SINGLE, TEMPLATE_LITERAL],
		},

		// String forms without template literals (for function/paren body contexts)
		js_strings_no_template: {
			rules: [STRING_DOUBLE, STRING_SINGLE],
		},

		// Horizontal and vertical whitespace
		js_whitespace: {
			rules: [{ match: [" ", "\t", "\n", "\r"] }],
		},

		// Numbers in top-level contexts: sideways-transition to division after
		js_numbers_top: {
			rules: [
				{ match: ["0x", "0X"], token: "number", state: "hex_number", exit: true },
				{ match: ["0b", "0B"], token: "number", state: "binary_number", exit: true },
				{ match: ["0o", "0O"], token: "number", state: "octal_number", exit: true },
				{ range: DIGIT_RANGE, token: "number", state: "number", exit: true },
			],
		},

		// Numbers in argument/group contexts: push nested number states
		js_numbers_arg: {
			rules: [
				{ match: ["0x", "0X"], token: "number", state: "hex_number_arg" },
				{ match: ["0b", "0B"], token: "number", state: "binary_number_arg" },
				{ match: ["0o", "0O"], token: "number", state: "octal_number_arg" },
				{ range: DIGIT_RANGE, token: "number", state: "number_arg" },
			],
		},

		// ---------------------------------------------------------------------------
		// Composite rulesets
		// ---------------------------------------------------------------------------

		// Shared foundation for main, regex_allow, division, and tmpl_* states.
		// Excludes operators, punctuation, keywords, identifiers, and slash handling
		// because those differ per state.
		js_common: {
			include: ["js_comments", "js_strings", "js_numbers_top", "js_whitespace"],
			rules: [],
		},

		// Shared foundation for function_body, paren_group, and paren_group_tmpl.
		// Uses arg-variant number states and excludes template literals.
		js_body_common: {
			include: ["js_comments", "js_strings_no_template", "js_numbers_arg"],
			rules: [],
		},
	},

	states: {
		// -------------------------------------------------------------------------
		// Main state — entry point; / is ambiguous (default: regex)
		// -------------------------------------------------------------------------
		main: {
			include: "js_common",
			rules: [
				// Four-character operators
				{ match: [">>>="], token: "operator" },

				// Three-character operators
				{
					match: [
						"===",
						"!==",
						">>>",
						"<<=",
						">>=",
						"**=",
						"&&=",
						"||=",
						"??=",
					],
					token: "operator",
				},

				// Spread/rest operator
				{ match: "...", token: "operator" },

				// Two-character operators (including /=)
				{
					match: [
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
					],
					token: "operator",
					state: "regex_allow",
					exit: true,
				},

				// Single-character operators (except /)
				{
					match: [
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
					],
					token: "operator",
					state: "regex_allow",
					exit: true,
				},

				// Opening brackets — after these, / is regex
				{
					match: ["(", "{", "["],
					token: "punctuation",
					state: "regex_allow",
					exit: true,
				},

				// Closing brackets — after these, / is division
				{
					match: [")", "}", "]"],
					token: "punctuation",
					state: "division",
					exit: true,
				},

				// Comma, semicolon — after these, / is regex
				{
					match: [";", ","],
					token: "punctuation",
					state: "regex_allow",
					exit: true,
				},

				// Dot — don't change state
				{ match: ["."], token: "punctuation" },

				// Keywords that indicate regex follows
				{
					match: REGEX_PRECEDING_KEYWORDS,
					boundary: true,
					token: "keyword",
					state: "regex_allow",
					exit: true,
				},

				// Other keywords — most act like values
				{
					match: KEYWORDS.filter((k) => !REGEX_PRECEDING_KEYWORDS.includes(k)),
					boundary: true,
					token: "keyword",
					state: "division",
					exit: true,
				},

				// Boolean literals
				{
					match: BOOLEAN_LITERALS,
					boundary: true,
					token: "boolean",
					state: "division",
					exit: true,
				},

				// Special values
				{
					match: SPECIAL_VALUES,
					boundary: true,
					token: "keyword",
					state: "division",
					exit: true,
				},

				// Identifiers (must come after keywords so keyword charMap wins)
				{ match: ["_", "$"], state: "identifier_probe", exit: true },
				{ range: LETTER_RANGE, state: "identifier_probe", exit: true },

				// Default: / starts a regex at beginning of statement
				{ match: "/", token: "regex", state: "regex_pattern" },
			],
		},

		identifier_probe: {
			mode: "probe",
			fallback: "identifier",
			rules: [
				{
					match: ["("],
					state: "function_name",
					exit: true,
				},
				{
					match: [".", " ", ")", ";", "}", "{", "[", ",", ...OPERATORS],
					state: "identifier",
					exit: true,
				},
			],
		},

		function_name: {
			rules: [
				{ range: ALPHANUMERIC_RANGE, token: "function" },
				{ match: ["_", "$"], token: "function" },
				{
					match: "(",
					token: "punctuation",
					state: "function_body",
					exit: true,
				},
				{ match: [" ", "\t"] },
			],
		},

		// -------------------------------------------------------------------------
		// function_body — inside call-site parentheses (top-level context)
		// -------------------------------------------------------------------------
		function_body: {
			include: "js_body_common",
			rules: [
				// End of arguments
				{
					match: ")",
					token: "punctuation",
					state: "division",
					exit: true,
				},

				// Nested parentheses
				{ match: "(", token: "punctuation", state: "paren_group" },

				// Argument separator
				{ match: ",", token: "punctuation" },

				// Operators
				{ match: ["===", "!=="], token: "operator" },
				{
					match: ["--", "++", "<=", ">=", "==", "!=", "&&", "||"],
					token: "operator",
				},
				{
					match: [
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
					],
					token: "operator",
				},
				{ match: "/", token: "regex", state: "regex_pattern" },

				// Other punctuation
				{ match: ["[", "]", "{", "}"], token: "punctuation" },
				{ match: [";", "."], token: "punctuation" },

				// Literals
				{ match: BOOLEAN_LITERALS, token: "boolean" },

				// Identifiers (recursive probe for nested function calls)
				{ match: ["_", "$"], state: "identifier_probe", exit: true },
				{ range: LETTER_RANGE, state: "identifier_probe", exit: true },
			],
		},

		// -------------------------------------------------------------------------
		// paren_group — nested parentheses inside function arguments
		// -------------------------------------------------------------------------
		paren_group: {
			include: "js_body_common",
			rules: [
				{ match: ")", token: "punctuation", exit: true },
				{ match: "(", token: "punctuation", state: "paren_group" },

				{ match: ",", token: "punctuation" },
				{ match: ["[", "]", "{", "}", ";", "."], token: "punctuation" },

				{ match: ["===", "!=="], token: "operator" },
				{
					match: ["--", "++", "<=", ">=", "==", "!=", "&&", "||"],
					token: "operator",
				},
				{
					match: [
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
					],
					token: "operator",
				},

				{ match: BOOLEAN_LITERALS, token: "boolean" },
				{ match: ["_", "$"], token: "identifier" },
				{ range: ALPHANUMERIC_RANGE, token: "identifier" },
			],
		},

		// Number states for argument/group context (pop back instead of switching to division)
		number_arg: {
			rules: [
				{ range: DIGIT_RANGE, token: "number" },
				{ match: ".", token: "number", state: "decimal_number_arg" },
				{ match: ["e", "E"], token: "number", state: "exponent_sign_arg" },
				{ match: "n", token: "number", exit: true },
				{ any: true, exit: true },
			],
		},

		decimal_number_arg: {
			rules: [
				{ range: DIGIT_RANGE, token: "number" },
				{ match: ["e", "E"], token: "number", state: "exponent_sign_arg" },
				{ any: true, exit: true },
			],
		},

		exponent_sign_arg: {
			rules: [
				{ match: ["+", "-"], token: "number", state: "exponent_digits_arg" },
				{ range: DIGIT_RANGE, token: "number", state: "exponent_digits_arg" },
			],
		},

		exponent_digits_arg: {
			rules: [
				{ range: DIGIT_RANGE, token: "number" },
				{ any: true, exit: true },
			],
		},

		hex_number_arg: {
			rules: [
				{ range: HEX_RANGE, token: "number" },
				{ match: "n", token: "number", exit: true },
				{ any: true, exit: true },
			],
		},

		binary_number_arg: {
			rules: [
				{ match: ["0", "1"], token: "number" },
				{ match: "n", token: "number", exit: true },
				{ any: true, exit: true },
			],
		},

		octal_number_arg: {
			rules: [
				{ range: [["0", "7"]], token: "number" },
				{ match: "n", token: "number", exit: true },
				{ any: true, exit: true },
			],
		},

		identifier: {
			rules: [
				{ match: ["_", "$"], token: "identifier" },
				{ range: ALPHANUMERIC_RANGE, token: "identifier" },
				// Opening brackets after an identifier
				{
					match: ["(", "[", "{"],
					token: "punctuation",
					state: "regex_allow",
					exit: true,
				},
				// Closing brackets after an identifier
				{
					match: [")", "]", "}"],
					token: "punctuation",
					state: "division",
					exit: true,
				},
				// Comma and semicolon delimiters
				{
					match: [",", ";"],
					token: "punctuation",
					state: "regex_allow",
					exit: true,
				},
				// Dot accessor
				{ match: ["."], token: "punctuation", state: "division", exit: true },
				// Division operators
				{ match: "/=", token: "operator", state: "regex_allow", exit: true },
				{ match: "/", token: "operator", state: "regex_allow", exit: true },
				// Multi-char operators
				{ match: [">>>="], token: "operator", state: "regex_allow", exit: true },
				{
					match: [
						"===",
						"!==",
						">>>",
						"<<=",
						">>=",
						"**=",
						"&&=",
						"||=",
						"??=",
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
						"%=",
						"&=",
						"|=",
						"^=",
					],
					token: "operator",
					state: "regex_allow",
					exit: true,
				},
				// Single-char operators
				{
					match: [
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
					],
					token: "operator",
					state: "regex_allow",
					exit: true,
				},
				// Whitespace after identifier -> switch to division context
				{ match: [" ", "\t", "\n", "\r"], state: "division", exit: true },
			],
		},

		// -------------------------------------------------------------------------
		// regex_allow — after operators or opening brackets; / starts a regex
		// -------------------------------------------------------------------------
		regex_allow: {
			include: "js_common",
			rules: [
				// Here, / is a regex!
				{ match: "/", token: "regex", state: "regex_pattern" },

				// Operators (stay in regex_allow)
				{ match: [">>>="], token: "operator" },
				{
					match: [
						"===",
						"!==",
						">>>",
						"<<=",
						">>=",
						"**=",
						"&&=",
						"||=",
						"??=",
					],
					token: "operator",
				},
				{ match: "...", token: "operator" },
				{
					match: [
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
					],
					token: "operator",
				},
				{
					match: [
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
					],
					token: "operator",
				},

				// Punctuation
				{ match: ["(", "{", "["], token: "punctuation" },
				{
					match: [")", "}", "]"],
					token: "punctuation",
					state: "division",
					exit: true,
				},
				{ match: [";", ",", "."], token: "punctuation" },

				// Keywords
				{
					match: REGEX_PRECEDING_KEYWORDS,
					boundary: true,
					token: "keyword",
				},
				{
					match: KEYWORDS.filter((k) => !REGEX_PRECEDING_KEYWORDS.includes(k)),
					boundary: true,
					token: "keyword",
					state: "division",
					exit: true,
				},

				// Literals
				{
					match: BOOLEAN_LITERALS,
					boundary: true,
					token: "boolean",
					state: "division",
					exit: true,
				},
				{
					match: SPECIAL_VALUES,
					boundary: true,
					token: "keyword",
					state: "division",
					exit: true,
				},

				// Identifiers
				{ match: ["_", "$"], state: "identifier_probe", exit: true },
				{ range: LETTER_RANGE, state: "identifier_probe", exit: true },
			],
		},

		// -------------------------------------------------------------------------
		// division — after values or closing brackets; / is the division operator
		// -------------------------------------------------------------------------
		division: {
			include: "js_common",
			rules: [
				// Opening brackets — after these, / is regex
				{
					match: ["(", "{", "["],
					token: "punctuation",
					state: "regex_allow",
					exit: true,
				},

				// Here, / is division — check /= first
				{
					match: "/=",
					token: "operator",
					state: "regex_allow",
					exit: true,
				},
				{
					match: "/",
					token: "operator",
					state: "regex_allow",
					exit: true,
				},

				// Operators
				{
					match: [">>>="],
					token: "operator",
					state: "regex_allow",
					exit: true,
				},
				{
					match: [
						"===",
						"!==",
						">>>",
						"<<=",
						">>=",
						"**=",
						"&&=",
						"||=",
						"??=",
					],
					token: "operator",
					state: "regex_allow",
					exit: true,
				},
				{
					match: "...",
					token: "operator",
					state: "regex_allow",
					exit: true,
				},
				{
					match: [
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
						"%=",
						"&=",
						"|=",
						"^=",
					],
					token: "operator",
					state: "regex_allow",
					exit: true,
				},
				{
					match: [
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
					],
					token: "operator",
					state: "regex_allow",
					exit: true,
				},

				// Punctuation
				{ match: [")", "}", "]"], token: "punctuation" },
				{
					match: [";", ","],
					token: "punctuation",
					state: "regex_allow",
					exit: true,
				},
				{ match: ["."], token: "punctuation" },

				// Keywords
				{
					match: REGEX_PRECEDING_KEYWORDS,
					boundary: true,
					token: "keyword",
					state: "regex_allow",
					exit: true,
				},
				{
					match: KEYWORDS.filter((k) => !REGEX_PRECEDING_KEYWORDS.includes(k)),
					boundary: true,
					token: "keyword",
				},

				// Literals
				{ match: BOOLEAN_LITERALS, boundary: true, token: "boolean" },
				{ match: SPECIAL_VALUES, boundary: true, token: "keyword" },

				// Identifiers
				{ match: ["_", "$"], state: "identifier_probe", exit: true },
				{ range: LETTER_RANGE, state: "identifier_probe", exit: true },
			],
		},

		// -------------------------------------------------------------------------
		// Number states (top-level — sideways to division on exit)
		// -------------------------------------------------------------------------
		number: {
			rules: [
				{ range: DIGIT_RANGE, token: "number" },
				{ match: ".", token: "number", state: "decimal_number" },
				{ match: ["e", "E"], token: "number", state: "exponent_sign" },
				{ match: "n", token: "number", state: "division", exit: true },
				{ any: true, state: "division", exit: true },
			],
		},

		decimal_number: {
			rules: [
				{ range: DIGIT_RANGE, token: "number" },
				{ match: ["e", "E"], token: "number", state: "exponent_sign" },
				{ any: true, state: "division", exit: true },
			],
		},

		exponent_sign: {
			rules: [
				{ match: ["+", "-"], token: "number", state: "exponent_digits" },
				{ range: DIGIT_RANGE, token: "number", state: "exponent_digits" },
			],
		},

		exponent_digits: {
			rules: [
				{ range: DIGIT_RANGE, token: "number" },
				{ any: true, state: "division", exit: true },
			],
		},

		hex_number: {
			rules: [
				{ range: HEX_RANGE, token: "number" },
				{ match: "n", token: "number", state: "division", exit: true },
				{ any: true, state: "division", exit: true },
			],
		},

		binary_number: {
			rules: [
				{ match: ["0", "1"], token: "number" },
				{ match: "n", token: "number", state: "division", exit: true },
				{ any: true, state: "division", exit: true },
			],
		},

		octal_number: {
			rules: [
				{ range: [["0", "7"]], token: "number" },
				{ match: "n", token: "number", state: "division", exit: true },
				{ any: true, state: "division", exit: true },
			],
		},

		// -------------------------------------------------------------------------
		// Template literal
		// -------------------------------------------------------------------------
		template_literal: {
			rules: [
				{ match: "${", token: "punctuation", state: "tmpl_main" },
				{ match: "`", token: "template", exit: true },
				{ any: true, token: "template" },
			],
		},

		// -------------------------------------------------------------------------
		// Template interpolation states
		// -------------------------------------------------------------------------

		// Full JS expression context inside ${ ... }
		template_interpolation: {
			include: ["js_comments", "js_strings", "js_numbers_arg", "js_whitespace"],
			rules: [
				// Exit at top-level closing brace
				{ match: "}", token: "punctuation", exit: true },
				// Balance nested braces inside interpolation
				{ match: "{", token: "punctuation", state: "tmpl_brace" },
				// Regex literal allowed at expression boundaries
				{ match: "/", token: "regex", state: "regex_pattern" },
				// Operators
				{ match: [">>>="], token: "operator" },
				{
					match: ["===", "!==", ">>>", "<<=", ">>=", "**=", "&&=", "||=", "??="],
					token: "operator",
				},
				{ match: "...", token: "operator" },
				{
					match: [
						"++", "--", "<=", ">=", "==", "!=", "&&", "||", "<<", ">>",
						"**", "??", "?.", "=>", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=",
					],
					token: "operator",
				},
				{
					match: ["-", "+", "<", ">", "=", "!", "&", "|", "?", "*", "~", "^", "%", ":"],
					token: "operator",
				},
				// Punctuation and grouping
				{ match: ["(", "["], token: "punctuation" },
				{ match: [")", "]"], token: "punctuation", state: "tmpl_division" },
				{ match: [";", ",", "."], token: "punctuation" },
				// Keywords
				{ match: REGEX_PRECEDING_KEYWORDS, boundary: true, token: "keyword" },
				{
					match: KEYWORDS.filter((k) => !REGEX_PRECEDING_KEYWORDS.includes(k)),
					boundary: true,
					token: "keyword",
					state: "tmpl_division",
				},
				// Literals
				{
					match: BOOLEAN_LITERALS,
					boundary: true,
					token: "boolean",
					state: "tmpl_division",
				},
				{
					match: SPECIAL_VALUES,
					boundary: true,
					token: "keyword",
					state: "tmpl_division",
				},
				// Identifiers
				{ match: ["_", "$"], token: "identifier", state: "identifier_tmpl" },
				{ range: LETTER_RANGE, token: "identifier", state: "identifier_tmpl" },
			],
		},

		// Identifier inside interpolation
		identifier_tmpl: {
			rules: [
				{ match: ["_", "$"], token: "identifier" },
				{ range: ALPHANUMERIC_RANGE, token: "identifier" },
				// Opening brackets
				{ match: ["("], token: "punctuation", state: "function_body_tmpl" },
				{ match: ["["], token: "punctuation" },
				{ match: ["{"], token: "punctuation", state: "tmpl_brace" },
				// Closing brackets → hand back to division to reprocess
				{ match: [")", "]", "}"], state: "tmpl_division", exit: true },
				// Comma, semicolon → allow regex after
				{ match: [",", ";"], token: "punctuation", state: "template_interpolation" },
				// Dot accessor
				{ match: ["."], token: "punctuation", state: "tmpl_division" },
				// Division operators
				{ match: "/=", token: "operator", state: "template_interpolation" },
				{ match: "/", token: "operator", state: "template_interpolation" },
				// Multi-char operators
				{ match: [">>>="], token: "operator", state: "template_interpolation" },
				{
					match: ["===", "!==", ">>>", "<<=", ">>=", "**=", "&&=", "||=", "??="],
					token: "operator",
					state: "template_interpolation",
				},
				// Single-char operators
				{
					match: ["-", "+", "<", ">", "=", "!", "&", "|", "?", "*", "~", "^", "%", ":"],
					token: "operator",
					state: "template_interpolation",
				},
				// Any non-identifier char: switch to division and reprocess
				{ any: true, state: "tmpl_division", exit: true },
			],
		},

		function_name_tmpl: {
			rules: [
				{ range: ALPHANUMERIC_RANGE, token: "function" },
				{ match: ["_", "$"], token: "function" },
				{ match: "(", token: "punctuation", state: "function_body_tmpl", exit: true },
				{ match: [" ", "\t"] },
			],
		},

		// -------------------------------------------------------------------------
		// function_body_tmpl — call-site args inside template interpolation
		// -------------------------------------------------------------------------
		function_body_tmpl: {
			include: ["js_comments", "js_strings", "js_numbers_arg"],
			rules: [
				// End of arguments
				{ match: ")", token: "punctuation", state: "tmpl_division", exit: true },
				// Nested parentheses
				{ match: "(", token: "punctuation", state: "paren_group_tmpl" },
				// Argument separator
				{ match: ",", token: "punctuation" },
				// Operators
				{ match: ["===", "!=="], token: "operator" },
				{
					match: ["--", "++", "<=", ">=", "==", "!=", "&&", "||"],
					token: "operator",
				},
				{
					match: [
						"-", "+", "<", ">", "=", "!", "&", "|", "?", "*", "/", "~", "^", "%",
					],
					token: "operator",
				},
				// Punctuation
				{ match: ["[", "]", "{", "}"], token: "punctuation" },
				{ match: [";", "."], token: "punctuation" },
				// Literals
				{ match: BOOLEAN_LITERALS, token: "boolean" },
				// Identifiers inside args
				{ match: ["_", "$"], token: "identifier", state: "identifier_tmpl" },
				{ range: LETTER_RANGE, token: "identifier", state: "identifier_tmpl" },
			],
		},

		// -------------------------------------------------------------------------
		// paren_group_tmpl — nested parens inside template interpolation args
		// -------------------------------------------------------------------------
		paren_group_tmpl: {
			include: "js_body_common",
			rules: [
				{ match: ")", token: "punctuation", exit: true },
				{ match: "(", token: "punctuation", state: "paren_group_tmpl" },
				{ match: ",", token: "punctuation" },
				{ match: ["===", "!=="], token: "operator" },
				{
					match: ["--", "++", "<=", ">=", "==", "!=", "&&", "||"],
					token: "operator",
				},
				{
					match: [
						"-", "+", "<", ">", "=", "!", "&", "|", "?", "*", "/", "~", "^", "%",
					],
					token: "operator",
				},
				{ match: ["[", "]", "{", "}", ";", "."], token: "punctuation" },
				{ match: BOOLEAN_LITERALS, token: "boolean" },
				{ match: ["_", "$"], token: "identifier" },
				{ range: ALPHANUMERIC_RANGE, token: "identifier" },
			],
		},

		// -------------------------------------------------------------------------
		// tmpl_main — entry after ${ (regex allowed by default)
		// -------------------------------------------------------------------------
		tmpl_main: {
			include: "js_common",
			rules: [
				{ match: "}", exit: true },
				// Default: / starts a regex
				{ match: "/", token: "regex", state: "regex_pattern" },
				// Operators
				{ match: [">>>="], token: "operator" },
				{
					match: ["===", "!==", ">>>", "<<=", ">>=", "**=", "&&=", "||=", "??="],
					token: "operator",
				},
				{ match: "...", token: "operator" },
				{
					match: [
						"++", "--", "<=", ">=", "==", "!=", "&&", "||", "<<", ">>",
						"**", "??", "?.", "=>", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=",
					],
					token: "operator",
					state: "tmpl_regex_allow",
					exit: true,
				},
				{
					match: ["-", "+", "<", ">", "=", "!", "&", "|", "?", "*", "~", "^", "%", ":"],
					token: "operator",
					state: "tmpl_regex_allow",
					exit: true,
				},
				// Punctuation
				{
					match: ["(", "{", "["],
					token: "punctuation",
					state: "tmpl_regex_allow",
					exit: true,
				},
				{
					match: [")", "]"],
					token: "punctuation",
					state: "tmpl_division",
					exit: true,
				},
				{ match: [";", ","], token: "punctuation", state: "tmpl_regex_allow", exit: true },
				{ match: ["."], token: "punctuation" },
				// Keywords
				{
					match: REGEX_PRECEDING_KEYWORDS,
					boundary: true,
					token: "keyword",
					state: "tmpl_regex_allow",
					exit: true,
				},
				{
					match: KEYWORDS.filter((k) => !REGEX_PRECEDING_KEYWORDS.includes(k)),
					boundary: true,
					token: "keyword",
					state: "tmpl_division",
					exit: true,
				},
				// Literals
				{
					match: BOOLEAN_LITERALS,
					boundary: true,
					token: "boolean",
					state: "tmpl_division",
					exit: true,
				},
				{
					match: SPECIAL_VALUES,
					boundary: true,
					token: "keyword",
					state: "tmpl_division",
					exit: true,
				},
				// Identifiers
				{ match: ["_", "$"], token: "identifier", state: "identifier_tmpl" },
				{ range: LETTER_RANGE, token: "identifier", state: "identifier_tmpl" },
			],
		},

		// -------------------------------------------------------------------------
		// tmpl_division — after a value inside interpolation; / is division
		// -------------------------------------------------------------------------
		tmpl_division: {
			include: "js_common",
			rules: [
				{ match: "}", token: "punctuation", exit: true },
				{ match: ["(", "["], token: "punctuation", state: "tmpl_regex_allow" },
				{ match: "{", token: "punctuation", state: "tmpl_brace" },
				{ match: "/=", token: "operator", state: "tmpl_regex_allow" },
				{ match: "/", token: "operator", state: "tmpl_regex_allow" },
				{ match: [">>>="], token: "operator", state: "tmpl_regex_allow" },
				{
					match: ["===", "!==", ">>>", "<<=", ">>=", "**=", "&&=", "||=", "??="],
					token: "operator",
					state: "tmpl_regex_allow",
				},
				{ match: "...", token: "operator", state: "tmpl_regex_allow" },
				{
					match: [
						"++", "--", "<=", ">=", "==", "!=", "&&", "||", "<<", ">>",
						"**", "??", "?.", "=>", "+=", "-=", "*", "%", "&=", "|=", "^=",
					],
					token: "operator",
					state: "tmpl_regex_allow",
				},
				{
					match: ["-", "+", "<", ">", "=", "!", "&", "|", "?", "*", "~", "^", "%", ":"],
					token: "operator",
					state: "tmpl_regex_allow",
				},
				{ match: [")", "]"], token: "punctuation" },
				{ match: [";", ",", "."], token: "punctuation" },
				{
					match: REGEX_PRECEDING_KEYWORDS,
					boundary: true,
					token: "keyword",
					state: "tmpl_regex_allow",
				},
				{
					match: KEYWORDS.filter((k) => !REGEX_PRECEDING_KEYWORDS.includes(k)),
					boundary: true,
					token: "keyword",
					state: "tmpl_division",
				},
				{ match: BOOLEAN_LITERALS, boundary: true, token: "boolean", state: "tmpl_division" },
				{ match: SPECIAL_VALUES, boundary: true, token: "keyword", state: "tmpl_division" },
				{ match: ["_", "$"], token: "identifier", state: "identifier_tmpl" },
				{ range: LETTER_RANGE, token: "identifier", state: "identifier_tmpl" },
			],
		},

		// -------------------------------------------------------------------------
		// tmpl_regex_allow — after operator inside interpolation; / is regex
		// -------------------------------------------------------------------------
		tmpl_regex_allow: {
			include: "js_common",
			rules: [
				{ match: "}", token: "punctuation", exit: true },
				// Here / is a regex
				{ match: "/", token: "regex", state: "regex_pattern" },
				// Operators
				{ match: [">>>="], token: "operator" },
				{
					match: ["===", "!==", ">>>", "<<=", ">>=", "**=", "&&=", "||=", "??="],
					token: "operator",
				},
				{ match: "...", token: "operator" },
				{
					match: [
						"++", "--", "<=", ">=", "==", "!=", "&&", "||", "<<", ">>",
						"**", "??", "?.", "=>", "+=", "-=", "*", "/", "%", "&=", "|=", "^=",
					],
					token: "operator",
				},
				{
					match: ["-", "+", "<", ">", "=", "!", "&", "|", "?", "*", "~", "^", "%", ":"],
					token: "operator",
				},
				{ match: ["(", "{", "["], token: "punctuation" },
				{
					match: [")", "}", "]"],
					token: "punctuation",
					state: "tmpl_division",
					exit: true,
				},
				{ match: [";", ",", "."], token: "punctuation" },
				// Keywords & literals
				{ match: REGEX_PRECEDING_KEYWORDS, boundary: true, token: "keyword" },
				{
					match: KEYWORDS.filter((k) => !REGEX_PRECEDING_KEYWORDS.includes(k)),
					boundary: true,
					token: "keyword",
					state: "tmpl_division",
				},
				{
					match: BOOLEAN_LITERALS,
					boundary: true,
					token: "boolean",
					state: "tmpl_division",
				},
				{
					match: SPECIAL_VALUES,
					boundary: true,
					token: "keyword",
					state: "tmpl_division",
				},
				// Identifiers
				{ match: ["_", "$"], token: "identifier", state: "identifier_tmpl" },
				{ range: LETTER_RANGE, token: "identifier", state: "identifier_tmpl" },
			],
		},

		// -------------------------------------------------------------------------
		// tmpl_brace — brace-balanced block inside interpolation
		// -------------------------------------------------------------------------
		tmpl_brace: {
			include: "js_common",
			rules: [
				{ match: "}", exit: true },
				{ match: "{", token: "punctuation", state: "tmpl_brace" },
				{ match: "/", token: "regex", state: "regex_pattern" },
				{ match: [">>>="], token: "operator" },
				{
					match: ["===", "!==", ">>>", "<<=", ">>=", "**=", "&&=", "||=", "??="],
					token: "operator",
				},
				{ match: "...", token: "operator" },
				{
					match: [
						"++", "--", "<=", ">=", "==", "!=", "&&", "||", "<<", ">>",
						"**", "??", "?.", "=>", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=",
					],
					token: "operator",
				},
				{
					match: ["-", "+", "<", ">", "=", "!", "&", "|", "?", "*", "~", "^", "%", ":"],
					token: "operator",
				},
				{ match: ["(", ")", "[", "]", ",", ".", ";"], token: "punctuation" },
				{
					match: REGEX_PRECEDING_KEYWORDS,
					boundary: true,
					token: "keyword",
				},
				{
					match: KEYWORDS.filter((k) => !REGEX_PRECEDING_KEYWORDS.includes(k)),
					boundary: true,
					token: "keyword",
				},
				{ match: BOOLEAN_LITERALS, boundary: true, token: "boolean" },
				{ match: SPECIAL_VALUES, boundary: true, token: "keyword" },
				{ match: ["_", "$"], state: "identifier_probe", exit: true },
				{ range: LETTER_RANGE, state: "identifier_probe", exit: true },
			],
		},

		// -------------------------------------------------------------------------
		// Regex pattern states
		// -------------------------------------------------------------------------
		regex_pattern: {
			rules: [
				{ match: "/", token: "regex", state: "regex_flags", exit: true },
				{ match: "\\", token: "regex", state: "regex_escape" },
				{ match: "[", token: "regex", state: "regex_class" },
				{ match: ["\n", ";"], state: "division", exit: true },
				{ any: true, token: "regex" },
			],
		},

		regex_escape: {
			rules: [{ any: true, token: "regex", exit: true }],
		},

		regex_class: {
			rules: [
				{ match: "]", token: "regex", exit: true },
				{ match: "\\", token: "regex", state: "regex_class_escape" },
				{ any: true, token: "regex" },
			],
		},

		regex_class_escape: {
			rules: [{ any: true, token: "regex", exit: true }],
		},

		regex_flags: {
			rules: [
				{ match: ["g", "i", "m", "s", "u", "y", "d"], token: "regex" },
				{ any: true, exit: true },
			],
		},
	},
};
