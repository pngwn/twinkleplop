// C-like language keywords
const KEYWORDS = [
	"if",
	"else",
	"while",
	"do",
	"for",
	"return",
	"in",
	"instanceof",
	"function",
	"new",
	"try",
	"throw",
	"catch",
	"finally",
	"null",
	"break",
	"continue",
	"class",
	"interface",
	"extends",
	"implements",
	"trait",
	"const",
	"let",
	"var",
	"async",
	"await",
	"typeof",
	"void",
	"delete",
	"this",
	"super",
	"import",
	"export",
	"default",
	"from",
	"as",
	"static",
	"private",
	"public",
	"protected",
];

const BOOLEAN_LITERALS = ["true", "false"];

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

/**
 * @type {import("@twinkleplop/core").Grammar}
 */
export default {
	name: "clike",
	states: {
		main: {
			rules: [
				// Comments
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,

				// Strings
				STRING_DOUBLE,
				STRING_SINGLE,

				// Numbers
				{
					// Hex numbers
					match: "0x",
					token: "number",
					state: "hex_number",
				},
				{
					// Regular numbers (including floats and scientific notation)
					range: DIGIT_RANGE,
					token: "number",
					state: "number",
				},

				// Three-character operators
				{
					match: OPERATORS,
					token: "operator",
				},

				// Two-character operators

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

				// Identifiers - transition to probe state without tokenizing
				{
					match: ["_", "$"],
					state: "identifier_probe",
				},
				{
					range: LETTER_RANGE,
					state: "identifier_probe",
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

		// Start of identifier - use probe to check if it's a function
		identifier_probe: {
			mode: "probe",
			fallback: "identifier",
			rules: [
				// First, match the first character and continue
				{
					match: ["(", " ("],
					state: "function_name",
				},
				{
					match: [".", ")", ";", "}", "{", "[", ",", ...OPERATORS],
					state: "identifier",
				},
			],
		},

		// Continue probing through identifier

		// Regular identifier
		identifier: {
			rules: [
				{
					match: ["_", "$"],
					token: "identifier",
				},
				{
					range: ALPHANUMERIC_RANGE,
					token: "identifier",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		// Continue collecting function name
		function_name: {
			rules: [
				// Continue function name
				{
					range: ALPHANUMERIC_RANGE,
					token: "function",
				},
				{
					match: ["_", "$"],
					token: "function",
				},
				// Opening parenthesis - transition to arguments
				{
					match: "(",
					token: "punctuation",
					state: "function_body",
					exit: true,
				},
				// Whitespace before opening paren
				{
					match: [" ", "\t"],
				},
				// Exit if we see anything else
			],
		},

		// Inside function arguments - handle full syntax
		function_body: {
			rules: [
				// Comments
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,

				// Strings
				STRING_DOUBLE,
				STRING_SINGLE,

				// Numbers
				{
					// Hex numbers
					match: "0x",
					token: "number",
					state: "hex_number",
				},
				{
					// Regular numbers
					range: DIGIT_RANGE,
					token: "number",
					state: "number",
				},

				// End of arguments
				{
					match: ")",
					token: "punctuation",
					exit: true,
				},

				// Nested parentheses (for nested calls or grouping)
				{
					match: "(",
					token: "punctuation",
					state: "function_body", // Recursive for nested parens
				},

				// Argument separator
				{
					match: ",",
					token: "punctuation",
				},

				// Operators (for expressions in arguments)
				{
					match: ["===", "!=="],
					token: "operator",
				},
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

				// Other punctuation
				{
					match: ["[", "]", "{", "}"],
					token: "punctuation",
				},
				{
					match: [";", "."],
					token: "punctuation",
				},

				// Boolean literals (more specific, so check before identifiers)
				{
					match: BOOLEAN_LITERALS,
					token: "boolean",
				},

				// recursive identifier probe for nested functions
				{
					match: ["_", "$"],
					state: "identifier_probe",
				},
				{
					range: LETTER_RANGE,
					state: "identifier_probe",
				},

				// Whitespace
				{
					match: [" ", "\t", "\n", "\r"],
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
					any: true,
					exit: true,
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
					any: true,
					exit: true,
					rewind: true,
				},
			],
		},
	},
};