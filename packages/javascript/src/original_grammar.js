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
				{
					match: "...",
					token: "operator",
				},

				// Two-character operators (including /=)
				{
					match: [
						"--",
						"++",
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
						"/=",  // Division assignment
						"%=",
						"&=",
						"|=",
						"^=",
					],
					token: "operator",
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
					state: "after_operator",  // After operators, / is likely regex
				},

				// Punctuation that suggests regex follows
				{
					match: ["(", "{", "["],
					token: "punctuation",
					state: "after_operator",  // After these, / is likely regex
				},
				
				// Punctuation that suggests division follows
				{
					match: [")", "}", "]"],
					token: "punctuation",
					state: "after_value",  // After these, / is likely division
				},
				
				// Other punctuation
				{
					match: [";", ","],
					token: "punctuation",
					state: "after_operator",  // After these, / is likely regex
				},
				
				{
					match: ["."],
					token: "punctuation",
					// Don't change state for dot - could be property access
				},

				// Keywords that indicate regex follows
				{
					match: REGEX_PRECEDING_KEYWORDS,
					boundary: true,
					token: "keyword",
					state: "after_operator",  // After these keywords, / starts a regex
				},

				// Other keywords
				{
					match: KEYWORDS.filter(k => !REGEX_PRECEDING_KEYWORDS.includes(k)),
					boundary: true,
					token: "keyword",
					state: "after_value",  // Most keywords act like values for division
				},

				// Boolean literals and special values
				{
					match: BOOLEAN_LITERALS,
					boundary: true,
					token: "boolean",
					state: "after_value",  // After literals, / is division
				},

				// Special values
				{
					match: SPECIAL_VALUES,
					boundary: true,
					token: "keyword",
					state: "after_value",  // After values, / is division
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

				// Division operator when we're at the beginning (default to regex)
				{
					match: "/",
					state: "slash_disambiguation",
				},

				// Whitespace
				{
					match: [" ", "\t", "\n", "\r"],
				},
			],
		},

		// State after operators or punctuation where / starts a regex
		after_operator: {
			rules: [
				// Most rules same as main
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,
				STRING_DOUBLE,
				STRING_SINGLE,
				TEMPLATE_LITERAL,

				// Numbers
				{
					match: ["0x", "0X"],
					token: "number",
					state: "hex_number",
				},
				{
					match: ["0b", "0B"],
					token: "number",
					state: "binary_number",
				},
				{
					match: ["0o", "0O"],
					token: "number",
					state: "octal_number",
				},
				{
					range: DIGIT_RANGE,
					token: "number",
					state: "number",
				},

				// In this state, / starts a regex!
				{
					match: "/",
					token: "regex",
					state: "regex_pattern",
				},

				// Operators
				{
					match: [">>>="],
					token: "operator",
				},
				{
					match: [
						"===", "!==", ">>>", "<<=", ">>=",
						"**=", "&&=", "||=", "??=",
					],
					token: "operator",
				},
				{
					match: "...",
					token: "operator",
				},
				{
					match: [
						"--", "++", "<=", ">=", "==", "!=",
						"&&", "||", "<<", ">>", "**", "??",
						"?.", "=>", "+=", "-=", "*=", "/=",
						"%=", "&=", "|=", "^=",
					],
					token: "operator",
				},
				{
					match: [
						"-", "+", "<", ">", "=", "!",
						"&", "|", "?", "*", "~", "^", "%", ":",
					],
					token: "operator",
				},

				// Punctuation
				{
					match: ["(", "{", "["],
					token: "punctuation",
				},
				{
					match: [")", "}", "]"],
					token: "punctuation",
					state: "after_value",
				},
				{
					match: [";", ",", "."],
					token: "punctuation",
				},

				// Keywords
				{
					match: REGEX_PRECEDING_KEYWORDS,
					boundary: true,
					token: "keyword",
				},
				{
					match: KEYWORDS.filter(k => !REGEX_PRECEDING_KEYWORDS.includes(k)),
					boundary: true,
					token: "keyword",
					state: "after_value",
				},

				// Literals
				{
					match: BOOLEAN_LITERALS,
					boundary: true,
					token: "boolean",
					state: "after_value",
				},
				{
					match: SPECIAL_VALUES,
					boundary: true,
					token: "keyword",
					state: "after_value",
				},

				// Identifiers
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

		// State after values where / is division
		after_value: {
			rules: [
				// Most rules same as main
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,
				STRING_DOUBLE,
				STRING_SINGLE,
				TEMPLATE_LITERAL,

				// Numbers
				{
					match: ["0x", "0X"],
					token: "number",
					state: "hex_number",
				},
				{
					match: ["0b", "0B"],
					token: "number",
					state: "binary_number",
				},
				{
					match: ["0o", "0O"],
					token: "number",
					state: "octal_number",
				},
				{
					range: DIGIT_RANGE,
					token: "number",
					state: "number",
				},

				// In this state, / is division!
				{
					match: "/=",
					token: "operator",
					state: "after_operator",
				},
				{
					match: "/",
					token: "operator",
					state: "after_operator",
				},

				// Operators
				{
					match: [">>>="],
					token: "operator",
					state: "after_operator",
				},
				{
					match: [
						"===", "!==", ">>>", "<<=", ">>=",
						"**=", "&&=", "||=", "??=",
					],
					token: "operator",
					state: "after_operator",
				},
				{
					match: "...",
					token: "operator",
					state: "after_operator",
				},
				{
					match: [
						"--", "++", "<=", ">=", "==", "!=",
						"&&", "||", "<<", ">>", "**", "??",
						"?.", "=>", "+=", "-=", "*=",
						"%=", "&=", "|=", "^=",
					],
					token: "operator",
					state: "after_operator",
				},
				{
					match: [
						"-", "+", "<", ">", "=", "!",
						"&", "|", "?", "*", "~", "^", "%", ":",
					],
					token: "operator",
					state: "after_operator",
				},

				// Punctuation
				{
					match: ["(", "{", "["],
					token: "punctuation",
					state: "after_operator",
				},
				{
					match: [")", "}", "]"],
					token: "punctuation",
				},
				{
					match: [";", ","],
					token: "punctuation",
					state: "after_operator",
				},
				{
					match: ["."],
					token: "punctuation",
				},

				// Keywords
				{
					match: REGEX_PRECEDING_KEYWORDS,
					boundary: true,
					token: "keyword",
					state: "after_operator",
				},
				{
					match: KEYWORDS.filter(k => !REGEX_PRECEDING_KEYWORDS.includes(k)),
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

		// Disambiguation state for '/' at the beginning or after whitespace
		// Default to regex since that's more common at statement start
		slash_disambiguation: {
			mode: "probe",
			fallback: "regex_start",
			rules: [
				// Check if this looks like a regex pattern
				// Common regex starting patterns
				{
					match: [
						"^", "$", ".", "*", "+", "?", "|",
						"(", "[", "{",
						"\\",
					],
					state: "regex_start",
				},
				// Also check for word characters that start regex patterns
				{
					range: [...LETTER_RANGE, ...DIGIT_RANGE],
					state: "regex_start",
				},
				// If followed by '=' it's division assignment (/=)
				{
					match: "=",
					state: "division_assignment",
				},
				// If followed by space and then certain chars, probably division
				{
					match: [" ", "\t"],
					state: "division_operator",
				},
				// Otherwise default to regex (via fallback)
			],
		},

		// Start of a regex literal from ambiguous context
		regex_start: {
			rules: [
				{
					match: "/",
					token: "regex",
					state: "regex_pattern",
					exit: true,
				},
			],
		},

		division_operator: {
			rules: [
				{
					match: "/",
					token: "operator",
					state: "after_operator",
					exit: true,
				},
			],
		},

		division_assignment: {
			rules: [
				{
					match: "/=",
					token: "operator",
					state: "after_operator",
					exit: true,
				},
			],
		},

		// Start of identifier - use probe to check if it's a function
		identifier_probe: {
			mode: "probe",
			fallback: "identifier",
			rules: [
				// Check if followed by parenthesis (function call)
				{
					match: ["(", " ("],
					state: "function_name",
				},
				// Not a function call, regular identifier
				{
					match: [
						".",
						")",
						";",
						"}",
						"{",
						"[",
						"]",
						",",
						":",
						"?",
						"=>",
						"+=",
						"-=",
						"*=",
						"/=",
						"%=",
						"&=",
						"|=",
						"^=",
						"<<=",
						">>=",
						">>>=",
						"**=",
						"&&=",
						"||=",
						"??=",
					],
					state: "identifier",
				},
				// Check for operators
				{
					match: [
						"===",
						"!==",
						">>>",
						">>",
						"<<",
						"<=",
						">=",
						"==",
						"!=",
						"&&",
						"||",
						"**",
						"??",
						"?.",
					],
					state: "identifier",
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
						"*",
						"/",
						"~",
						"^",
						"%",
					],
					state: "identifier",
				},
			],
		},

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
					state: "after_value",  // After identifier, / is division
					exit: true,
					rewind: true,
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
			],
		},

		// Inside function arguments - handle full JavaScript syntax
		function_body: {
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
					// Hex numbers
					match: ["0x", "0X"],
					token: "number",
					state: "hex_number",
				},
				{
					// Binary numbers
					match: ["0b", "0B"],
					token: "number",
					state: "binary_number",
				},
				{
					// Octal numbers
					match: ["0o", "0O"],
					token: "number",
					state: "octal_number",
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
					state: "after_value",  // After function call, / is division
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

				// Arrow function
				{
					match: "=>",
					token: "operator",
				},

				// Division vs regex in function args (default to division)
				{
					match: "/=",
					token: "operator",
				},
				{
					match: "/",
					token: "operator",
				},

				// Three-character operators
				{
					match: ["===", "!==", ">>>", "**="],
					token: "operator",
				},

				// Two-character operators
				{
					match: [
						"--",
						"++",
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
						"+=",
						"-=",
						"*=",
						"%=",
						"&=",
						"|=",
						"^=",
					],
					token: "operator",
				},

				// Single-character operators
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

				// Other punctuation
				{
					match: ["[", "]", "{", "}"],
					token: "punctuation",
				},
				{
					match: [";", "."],
					token: "punctuation",
				},

				// Keywords
				{
					match: KEYWORDS,
					boundary: true,
					token: "keyword",
				},

				// Boolean literals
				{
					match: BOOLEAN_LITERALS,
					boundary: true,
					token: "boolean",
				},

				// Special values
				{
					match: SPECIAL_VALUES,
					boundary: true,
					token: "keyword",
				},

				// Recursive identifier probe for nested functions
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
					// BigInt suffix
					match: "n",
					token: "number",
					state: "after_value",  // After number, / is division
					exit: true,
				},
				{
					any: true,
					state: "after_value",  // After number, / is division
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
					state: "after_value",
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
					state: "after_value",
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
					state: "after_value",
					exit: true,
				},
				{
					any: true,
					state: "after_value",
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
					state: "after_value",
					exit: true,
				},
				{
					any: true,
					state: "after_value",
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
					state: "after_value",
					exit: true,
				},
				{
					any: true,
					state: "after_value",
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
					state: "after_value",  // After template, / is division
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
					boundary: true,
					token: "keyword",
				},
				{
					match: BOOLEAN_LITERALS,
					boundary: true,
					token: "boolean",
				},
				{
					match: ["_", "$"],
					state: "identifier_probe",
				},
				{
					range: LETTER_RANGE,
					state: "identifier_probe",
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


		// Regex pattern state - consume the regex body
		regex_pattern: {
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
					match: "\n",
					// Newline ends an unterminated regex - error condition
					state: "after_operator",
					exit: true,
					rewind: true,
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
					state: "regex_pattern",
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
					state: "regex_pattern",
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
					state: "regex_class",
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
					state: "after_value",  // After regex, / is division
					exit: true,
					rewind: true,
				},
			],
		},
	},
};