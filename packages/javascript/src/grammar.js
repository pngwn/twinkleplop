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
	states: {
		// Main state - default, / could be either regex or division
		main: {
			rules: [
				// Comments
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,

				// Strings and template literals
				STRING_DOUBLE,
				STRING_SINGLE,
				TEMPLATE_LITERAL,

				// Numbers
				{ match: ["0x", "0X"], token: "number", state: "hex_number" },
				{ match: ["0b", "0B"], token: "number", state: "binary_number" },
				{ match: ["0o", "0O"], token: "number", state: "octal_number" },
				{ range: DIGIT_RANGE, token: "number", state: "number" },

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

				// Opening brackets - after these, / is regex
				{
					match: ["(", "{", "["],
					token: "punctuation",
					state: "regex_allow",
					exit: true,
				},

				// Closing brackets - after these, / is division
				{
					match: [")", "}", "]"],
					token: "punctuation",
					state: "division",
					exit: true,
				},

				// Comma, semicolon - after these, / is regex
				{
					match: [";", ","],
					token: "punctuation",
					state: "regex_allow",
					exit: true,
				},

				// Dot - don't change state
				{
					match: ["."],
					token: "punctuation",
				},

				// Keywords that indicate regex follows
				{
					match: REGEX_PRECEDING_KEYWORDS,
					boundary: true,
					token: "keyword",
					state: "regex_allow",
					exit: true,
				},

				// Other keywords - most act like values
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

				// Identifiers
				{
					match: ["_", "$"],
					token: "identifier",
					state: "identifier_continue",
				},
				{
					range: LETTER_RANGE,
					token: "identifier",
					state: "identifier_continue",
				},

				// Default: / starts a regex at beginning of statement
				{
					match: "/",
					token: "regex",
					state: "regex_pattern",
				},

				// Whitespace
				{
					match: [" ", "\t", "\n", "\r"],
				},
			],
		},

		// After operators or contexts where / is a regex
		regex_allow: {
			rules: [
				// Most rules same as main
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,
				STRING_DOUBLE,
				STRING_SINGLE,
				TEMPLATE_LITERAL,

				// Numbers
				{ match: ["0x", "0X"], token: "number", state: "hex_number" },
				{ match: ["0b", "0B"], token: "number", state: "binary_number" },
				{ match: ["0o", "0O"], token: "number", state: "octal_number" },
				{ range: DIGIT_RANGE, token: "number", state: "number" },

				// Here, / is a regex!
				{
					match: "/",
					token: "regex",
					state: "regex_pattern",
				},

				// Operators (same as main)
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
				{
					match: ["_", "$"],
					token: "identifier",
					state: "identifier_continue",
					exit: true,
				},
				{
					range: LETTER_RANGE,
					token: "identifier",
					state: "identifier_continue",
					exit: true,
				},

				// Whitespace
				{ match: [" ", "\t", "\n", "\r"] },
			],
		},

		// After values where / is division
		division: {
			rules: [
				// Most rules same as main
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,
				STRING_DOUBLE,
				STRING_SINGLE,
				TEMPLATE_LITERAL,
				{
					match: ["(", "{", "["],
					token: "punctuation",
					state: "regex_allow",
					exit: true,
				},

				// Numbers
				{ match: ["0x", "0X"], token: "number", state: "hex_number" },
				{ match: ["0b", "0B"], token: "number", state: "binary_number" },
				{ match: ["0o", "0O"], token: "number", state: "octal_number" },
				{ range: DIGIT_RANGE, token: "number", state: "number" },

				// Here, / is division! Check /= first
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
				{
					match: BOOLEAN_LITERALS,
					boundary: true,
					token: "boolean",
				},
				{
					match: SPECIAL_VALUES,
					boundary: true,
					token: "keyword",
				},

				// Identifiers
				{
					match: ["_", "$"],
					// token: "identifier",
					state: "identifier_continue",
				},
				{
					range: LETTER_RANGE,
					// token: "identifier",
					state: "identifier_continue",
				},

				// Whitespace
				{ match: [" ", "\t", "\n", "\r"] },
			],
		},

		// Continue collecting identifier characters
		identifier_continue: {
			rules: [
				{ match: ["_", "$"], token: "identifier" },
				{ range: ALPHANUMERIC_RANGE, token: "identifier" },
				// Special handling for opening brackets - they indicate function/array/object access
				{
					match: ["(", "[", "{"],
					token: "punctuation",
					state: "regex_allow", // Inside brackets, / is regex
					exit: true,
				},
				{
					any: true,
					state: "division", // After identifier, / is division
					exit: true,
				},
			],
		},

		// Number states
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

		// Template literal
		template_literal: {
			rules: [
				{ match: "${", token: "template", state: "template_interpolation" },
				{ match: "`", token: "template", state: "division", exit: true },
				{ any: true, token: "template" },
			],
		},

		// Template interpolation
		template_interpolation: {
			rules: [
				{ match: "}", token: "template", exit: true },
				// Nested template literals
				TEMPLATE_LITERAL,
				// All other JavaScript syntax
				STRING_DOUBLE,
				STRING_SINGLE,
				{ range: DIGIT_RANGE, token: "number", state: "number" },
				{ match: KEYWORDS, boundary: true, token: "keyword" },
				{ match: BOOLEAN_LITERALS, boundary: true, token: "boolean" },
				{
					match: ["_", "$"],
					token: "identifier",
					state: "identifier_continue",
				},
				{
					range: LETTER_RANGE,
					token: "identifier",
					state: "identifier_continue",
				},
				{
					match: ["(", ")", "{", "[", "]", ",", ".", ";", ":", "?"],
					token: "punctuation",
				},
				{
					match: ["+", "-", "*", "/", "%", "=", "!", "&", "|", "<", ">"],
					token: "operator",
				},
			],
		},

		// Regex pattern
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
