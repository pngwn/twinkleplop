// JavaScript keywords
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

// Common character ranges
const LETTER_RANGE = [
	["a", "z"],
	["A", "Z"],
];

const DIGIT_RANGE = [["0", "9"]];

const ALPHANUMERIC_RANGE = [...LETTER_RANGE, ...DIGIT_RANGE];

const HEX_RANGE = [...DIGIT_RANGE, ["a", "f"], ["A", "F"]];

const IDENTIFIER_START = [...LETTER_RANGE, "_", "$"];
const IDENTIFIER_CONTINUE = [...ALPHANUMERIC_RANGE, "_", "$"];

// Common patterns
const SINGLE_LINE_COMMENT = {
	match_within: {
		start: "//",
		end: "\n",
	},
	token: "comment",
};

const MULTI_LINE_COMMENT = {
	match_within: {
		start: "/*",
		end: "*/",
	},
	token: "comment",
};

const STRING_DOUBLE = {
	match_within: {
		start: '"',
		end: '"',
		escape: "\\",
		multiline: true,
	},
	token: "string",
};

const STRING_SINGLE = {
	match_within: {
		start: "'",
		end: "'",
		escape: "\\",
		multiline: true,
	},
	token: "string",
};

// Template literal
const TEMPLATE_LITERAL = {
	match: "`",
	token: "template",
	state: "template_literal",
};

// Regular expression literal
const REGEX_LITERAL = {
	match: "/",
	peek: {
		range: [["a", "z"], ["A", "Z"], ["0", "9"], "[", "(", "{", "^", "$", ".", "*", "+", "?", "|", "\\"],
	},
	token: "regex",
	state: "regex",
};

/**
 * @type {import("@twinkleplop/core").Grammar}
 */
export default {
	name: "javascript",
	states: {
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
				{
					// Hex numbers (0x or 0X)
					match: ["0x", "0X"],
					token: "number",
					state: "hex_number",
				},
				{
					// Binary numbers (0b or 0B)
					match: ["0b", "0B"],
					token: "number",
					state: "binary_number",
				},
				{
					// Octal numbers (0o or 0O)
					match: ["0o", "0O"],
					token: "number",
					state: "octal_number",
				},
				{
					// Regular numbers (including floats and scientific notation)
					range: DIGIT_RANGE,
					token: "number",
					state: "number",
				},

				// Four-character operators
				{
					match: [">>>="],
					token: "operator",
				},

				// Three-character operators
				{
					match: ["===", "!==", ">>>", "<<=", ">>=", "**=", "&&=", "||=", "??="],
					token: "operator",
				},

				// Two-character operators
				{
					match: ["--", "++", "<=", ">=", "==", "!=", "&&", "||", "<<", ">>", "**", "??", "?.", "=>", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^="],
					token: "operator",
				},

				// Spread/rest operator
				{
					match: "...",
					token: "operator",
				},

				// Single-character operators
				{
					match: ["-", "+", "<", ">", "=", "!", "&", "|", "?", "*", "/", "~", "^", "%"],
					token: "operator",
				},

				// Punctuation
				{
					match: ["(", ")", "{", "}", "[", "]"],
					token: "punctuation",
				},
				{
					match: [";", ",", "."],
					token: "punctuation",
				},

				// Keywords (must come before identifiers)
				{
					match: KEYWORDS,
					token: "keyword",
				},

				// Boolean literals
				{
					match: BOOLEAN_LITERALS,
					token: "boolean",
				},

				// Special values
				{
					match: SPECIAL_VALUES,
					token: "keyword",
				},

				// Identifiers - handle underscore and dollar explicitly
				{
					match: ["_", "$"],
					token: "identifier",
					state: "identifier",
				},
				{
					range: LETTER_RANGE,
					token: "identifier", 
					state: "identifier",
				},

				// Backslash for namespaces (PHP-style)
				{
					match: "\\",
					token: "punctuation",
				},

				// Whitespace
				{
					match: [" ", "\t", "\n", "\r"],
				},
			],
		},

		// Identifier state - just continue collecting identifier characters
		identifier: {
			rules: [
				{
					range: ALPHANUMERIC_RANGE,
					token: "identifier",
				},
				{
					match: ["_", "$"],
					token: "identifier",
				},
				{
					any: true,
					exit: true,
					rewind: true,
				},
			],
		},

		// Number state
		number: {
			rules: [
				{
					range: DIGIT_RANGE,
					token: "number",
				},
				{
					match: ".",
					token: "number",
					state: "decimal_number",
				},
				{
					match: ["e", "E"],
					token: "number",
					state: "exponent_sign",
				},
				{
					// BigInt suffix
					match: "n",
					token: "number",
					exit: true,
				},
				{
					any: true,
					exit: true,
					rewind: true,
				},
			],
		},

		// Decimal number state  
		decimal_number: {
			rules: [
				{
					range: DIGIT_RANGE,
					token: "number",
				},
				{
					match: ["e", "E"],
					token: "number",
					state: "exponent_sign",
				},
				{
					any: true,
					exit: true,
					rewind: true,
				},
			],
		},

		// Exponent sign state - handles optional +/- after e/E
		exponent_sign: {
			rules: [
				{
					match: ["+", "-"],
					token: "number",
					state: "exponent_digits",
				},
				{
					range: DIGIT_RANGE,
					token: "number",
					state: "exponent_digits",
				},
			],
		},

		// Exponent digits state
		exponent_digits: {
			rules: [
				{
					range: DIGIT_RANGE,
					token: "number",
				},
				{
					any: true,
					exit: true,
					rewind: true,
				},
			],
		},

		// Hex number state
		hex_number: {
			rules: [
				{
					range: HEX_RANGE,
					token: "number",
				},
				{
					// BigInt suffix
					match: "n",
					token: "number",
					exit: true,
				},
				{
					any: true,
					exit: true,
					rewind: true,
				},
			],
		},

		// Binary number state
		binary_number: {
			rules: [
				{
					match: ["0", "1"],
					token: "number",
				},
				{
					// BigInt suffix
					match: "n",
					token: "number",
					exit: true,
				},
				{
					any: true,
					exit: true,
					rewind: true,
				},
			],
		},

		// Octal number state
		octal_number: {
			rules: [
				{
					range: [["0", "7"]],
					token: "number",
				},
				{
					// BigInt suffix
					match: "n",
					token: "number",
					exit: true,
				},
				{
					any: true,
					exit: true,
					rewind: true,
				},
			],
		},

		// Template literal state - handle ${} interpolation
		template_literal: {
			rules: [
				{
					match: "${",
					token: "template",
					state: "template_interpolation",
				},
				{
					match: "`",
					token: "template",
					exit: true,
				},
				{
					any: true,
					token: "template",
				},
			],
		},

		// Template interpolation - JavaScript expression inside ${}
		template_interpolation: {
			rules: [
				{
					match: "}",
					token: "template",
					exit: true,
				},
				// Nested template literals
				TEMPLATE_LITERAL,
				// All other JavaScript syntax
				STRING_DOUBLE,
				STRING_SINGLE,
				{
					range: DIGIT_RANGE,
					token: "number",
					state: "number",
				},
				{
					match: KEYWORDS,
					token: "keyword",
				},
				{
					match: BOOLEAN_LITERALS,
					token: "boolean",
				},
				{
					match: ["_", "$"],
					token: "identifier",
					state: "identifier",
				},
				{
					range: LETTER_RANGE,
					token: "identifier",
					state: "identifier",
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

		// Regular expression state
		regex: {
			rules: [
				{
					match: "/",
					token: "regex",
					state: "regex_flags",
				},
				{
					match: "\\",
					token: "regex",
					state: "regex_escape",
				},
				{
					match: "[",
					token: "regex",
					state: "regex_class",
				},
				{
					any: true,
					token: "regex",
				},
			],
		},

		// Regex escape - consume next character
		regex_escape: {
			rules: [
				{
					any: true,
					token: "regex",
					exit: true,
				},
			],
		},

		// Regex character class [...]
		regex_class: {
			rules: [
				{
					match: "]",
					token: "regex",
					exit: true,
				},
				{
					match: "\\",
					token: "regex",
					state: "regex_class_escape",
				},
				{
					any: true,
					token: "regex",
				},
			],
		},

		// Regex class escape
		regex_class_escape: {
			rules: [
				{
					any: true,
					token: "regex",
					exit: true,
				},
			],
		},

		// Regex flags
		regex_flags: {
			rules: [
				{
					match: ["g", "i", "m", "s", "u", "y", "d"],
					token: "regex",
				},
				{
					any: true,
					exit: true,
					rewind: true,
				},
			],
		},
	},
};
