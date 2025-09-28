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

// Keywords after which / starts a regex (expect expression)
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
	"extends",
];

// Keywords that act like values (after which / is division)
const VALUE_LIKE_KEYWORDS = [
	"this",
	"super",
	"true",
	"false",
	"null",
	"undefined",
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
	state: "expect_operator", // After string, expect operator
};

const STRING_SINGLE = {
	match_within: {
		start: "'",
		end: "'",
		escape: "\\",
		multiline: true,
	},
	token: "string",
	state: "expect_operator", // After string, expect operator
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
		// Default state - expects expression (/ is regex)
		main: {
			rules: [
				// Comments - preserve state
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,

				// Strings and template literals
				STRING_DOUBLE,
				STRING_SINGLE,
				TEMPLATE_LITERAL,

				// Numbers - after number, expect operator
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

				// Four-character operators
				{
					match: [">>>="],
					token: "operator",
					state: "expect_expression",
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
						"..."],
					token: "operator",
					state: "expect_expression",
				},

				// Division assignment (must come before single /)
				{
					match: "/=",
					token: "operator",
					state: "expect_expression",
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
					state: "expect_expression",
				},

				// Increment/decrement can be prefix or postfix
				// We'll handle postfix in expect_operator state

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
					state: "expect_expression",
				},

				// Opening brackets - expect expression
				{
					match: ["(", "{", "["],
					token: "punctuation",
					state: "expect_expression",
				},
				
				// Closing brackets - expect operator
				{
					match: [")", "}", "]"],
					token: "punctuation",
					state: "expect_operator",
				},
				
				// Comma, semicolon - expect expression
				{
					match: [";", ","],
					token: "punctuation",
					state: "expect_expression",
				},
				
				// Dot - preserve state (could be property access or decimal)
				{
					match: ["."],
					token: "punctuation",
				},

				// Keywords that expect expression after them
				{
					match: REGEX_PRECEDING_KEYWORDS,
					boundary: true,
					token: "keyword",
					state: "expect_expression",
				},

				// Keywords that act like values
				{
					match: VALUE_LIKE_KEYWORDS,
					boundary: true,
					token: "keyword",
					state: "expect_operator",
				},

				// Other keywords
				{
					match: KEYWORDS.filter(k => 
						!REGEX_PRECEDING_KEYWORDS.includes(k) && 
						!VALUE_LIKE_KEYWORDS.includes(k)),
					boundary: true,
					token: "keyword",
					// Most keywords don't clearly indicate what follows
					// Keep current expectation
				},

				// Boolean literals - act like values
				{
					match: BOOLEAN_LITERALS,
					boundary: true,
					token: "boolean",
					state: "expect_operator",
				},

				// Special values - act like values  
				{
					match: ["NaN", "Infinity"],
					boundary: true,
					token: "keyword",
					state: "expect_operator",
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

				// Forward slash - in main state, it's a regex
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

		// State expecting an expression (/ is regex)
		expect_expression: {
			rules: [
				// Comments - preserve state
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,

				// Strings and template literals
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

				// Division assignment (must come before single /)
				{
					match: "/=",
					token: "operator",
					state: "expect_expression",
				},

				// Forward slash - here it's a regex!
				{
					match: "/",
					token: "regex",
					state: "regex_pattern",
				},

				// Operators
				{
					match: [">>>="],
					token: "operator",
					state: "expect_expression",
				},
				{
					match: [
						"===", "!==", ">>>", "<<=", ">>=",
						"**=", "&&=", "||=", "??=", "...",
					],
					token: "operator",
					state: "expect_expression",
				},
				{
					match: [
						"--", "++", "<=", ">=", "==", "!=",
						"&&", "||", "<<", ">>", "**", "??",
						"?.", "=>", "+=", "-=", "*=",
						"%=", "&=", "|=", "^=",
					],
					token: "operator",
					state: "expect_expression",
				},
				{
					match: [
						"-", "+", "<", ">", "=", "!",
						"&", "|", "?", "*", "~", "^", "%", ":",
					],
					token: "operator",
					state: "expect_expression",
				},

				// Punctuation
				{
					match: ["(", "{", "["],
					token: "punctuation",
					state: "expect_expression",
				},
				{
					match: [")", "}", "]"],
					token: "punctuation",
					state: "expect_operator",
				},
				{
					match: [";", ","],
					token: "punctuation",
					state: "expect_expression",
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
					state: "expect_expression",
				},
				{
					match: VALUE_LIKE_KEYWORDS,
					boundary: true,
					token: "keyword",
					state: "expect_operator",
				},
				{
					match: KEYWORDS.filter(k => 
						!REGEX_PRECEDING_KEYWORDS.includes(k) && 
						!VALUE_LIKE_KEYWORDS.includes(k)),
					boundary: true,
					token: "keyword",
				},

				// Literals
				{
					match: BOOLEAN_LITERALS,
					boundary: true,
					token: "boolean",
					state: "expect_operator",
				},
				{
					match: ["NaN", "Infinity"],
					boundary: true,
					token: "keyword",
					state: "expect_operator",
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

		// State expecting an operator (/ is division)
		expect_operator: {
			rules: [
				// Comments - preserve state
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,

				// Strings and template literals (unusual but possible)
				STRING_DOUBLE,
				STRING_SINGLE,
				TEMPLATE_LITERAL,

				// Numbers (unusual but possible)
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

				// Division assignment (must come before single /)
				{
					match: "/=",
					token: "operator",
					state: "expect_expression",
				},

				// Forward slash - here it's division!
				{
					match: "/",
					token: "operator",
					state: "expect_expression",
				},

				// Postfix increment/decrement
				{
					match: ["++", "--"],
					token: "operator",
					// Stay in expect_operator (can chain: x++++)
				},

				// Other operators
				{
					match: [">>>="],
					token: "operator",
					state: "expect_expression",
				},
				{
					match: [
						"===", "!==", ">>>", "<<=", ">>=",
						"**=", "&&=", "||=", "??=", "...",
					],
					token: "operator",
					state: "expect_expression",
				},
				{
					match: [
						"<=", ">=", "==", "!=",
						"&&", "||", "<<", ">>", "**", "??",
						"?.", "=>", "+=", "-=", "*=",
						"%=", "&=", "|=", "^=",
					],
					token: "operator",
					state: "expect_expression",
				},
				{
					match: [
						"-", "+", "<", ">", "=", "!",
						"&", "|", "?", "*", "~", "^", "%", ":",
					],
					token: "operator",
					state: "expect_expression",
				},

				// Punctuation
				{
					match: ["(", "{", "["],
					token: "punctuation",
					state: "expect_expression",
				},
				{
					match: [")", "}", "]"],
					token: "punctuation",
					state: "expect_operator",
				},
				{
					match: [";", ","],
					token: "punctuation",
					state: "expect_expression",
				},
				{
					match: ["."],
					token: "punctuation",
					// Don't change state - could be property access
				},

				// Keywords
				{
					match: REGEX_PRECEDING_KEYWORDS,
					boundary: true,
					token: "keyword",
					state: "expect_expression",
				},
				{
					match: VALUE_LIKE_KEYWORDS,
					boundary: true,
					token: "keyword",
					state: "expect_operator",
				},
				{
					match: KEYWORDS.filter(k => 
						!REGEX_PRECEDING_KEYWORDS.includes(k) && 
						!VALUE_LIKE_KEYWORDS.includes(k)),
					boundary: true,
					token: "keyword",
				},

				// Literals
				{
					match: BOOLEAN_LITERALS,
					boundary: true,
					token: "boolean",
					state: "expect_operator",
				},
				{
					match: ["NaN", "Infinity"],
					boundary: true,
					token: "keyword",
					state: "expect_operator",
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

		// Identifier probe - check if it's a function call
		identifier_probe: {
			mode: "probe",
			fallback: "identifier",
			rules: [
				// Check if followed by parenthesis (function call)
				{
					match: ["("],
					state: "function_name",
				},
				// Whitespace then parenthesis
				{
					match: [" (", "\t(", "\n(", "\r("],
					state: "function_name",
				},
				// Default to regular identifier
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
					state: "expect_operator", // After identifier, expect operator
					exit: true,
					rewind: true,
				},
			],
		},

		// Function name
		function_name: {
			rules: [
				{
					range: ALPHANUMERIC_RANGE,
					token: "function",
				},
				{
					match: ["_", "$"],
					token: "function",
				},
				{
					match: "(",
					token: "punctuation",
					state: "function_body",
					exit: true,
				},
				{
					match: [" ", "\t", "\n", "\r"],
				},
			],
		},

		// Inside function arguments
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

				// End of arguments
				{
					match: ")",
					token: "punctuation",
					state: "expect_operator",
					exit: true,
				},

				// Nested parentheses
				{
					match: "(",
					token: "punctuation",
					state: "function_body",
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

				// Division assignment
				{
					match: "/=",
					token: "operator",
				},

				// Division (more likely in function args than regex)
				{
					match: "/",
					token: "operator",
				},

				// Other operators
				{
					match: ["===", "!==", ">>>", "**="],
					token: "operator",
				},
				{
					match: [
						"--", "++", "<=", ">=", "==", "!=",
						"&&", "||", "<<", ">>", "**", "??",
						"?.", "+=", "-=", "*=",
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

				// Other punctuation
				{
					match: ["[", "]", "{", "}", ";", "."],
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

		// Number states
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
					match: "n",
					token: "number",
					state: "expect_operator",
					exit: true,
				},
				{
					any: true,
					state: "expect_operator",
					exit: true,
					rewind: true,
				},
			],
		},

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
					state: "expect_operator",
					exit: true,
					rewind: true,
				},
			],
		},

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

		exponent_digits: {
			rules: [
				{
					range: DIGIT_RANGE,
					token: "number",
				},
				{
					any: true,
					state: "expect_operator",
					exit: true,
					rewind: true,
				},
			],
		},

		hex_number: {
			rules: [
				{
					range: HEX_RANGE,
					token: "number",
				},
				{
					match: "n",
					token: "number",
					state: "expect_operator",
					exit: true,
				},
				{
					any: true,
					state: "expect_operator",
					exit: true,
					rewind: true,
				},
			],
		},

		binary_number: {
			rules: [
				{
					match: ["0", "1"],
					token: "number",
				},
				{
					match: "n",
					token: "number",
					state: "expect_operator",
					exit: true,
				},
				{
					any: true,
					state: "expect_operator",
					exit: true,
					rewind: true,
				},
			],
		},

		octal_number: {
			rules: [
				{
					range: [["0", "7"]],
					token: "number",
				},
				{
					match: "n",
					token: "number",
					state: "expect_operator",
					exit: true,
				},
				{
					any: true,
					state: "expect_operator",
					exit: true,
					rewind: true,
				},
			],
		},

		// Template literal
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
					state: "expect_operator",
					exit: true,
				},
				{
					match: "\\",
					token: "template",
					state: "template_escape",
				},
				{
					any: true,
					token: "template",
				},
			],
		},

		template_escape: {
			rules: [
				{
					any: true,
					token: "template",
					state: "template_literal",
					exit: true,
				},
			],
		},

		// Template interpolation
		template_interpolation: {
			rules: [
				{
					match: "}",
					token: "template",
					exit: true,
				},
				// Nested template literals
				TEMPLATE_LITERAL,
				// Strings
				STRING_DOUBLE,
				STRING_SINGLE,
				// Numbers
				{
					range: DIGIT_RANGE,
					token: "number",
					state: "number",
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
				// Identifiers
				{
					match: ["_", "$"],
					state: "identifier_probe",
				},
				{
					range: LETTER_RANGE,
					state: "identifier_probe",
				},
				// Punctuation
				{
					match: ["(", ")", "{", "[", "]", ",", ".", ";", ":", "?"],
					token: "punctuation",
				},
				// Operators
				{
					match: ["+", "-", "*", "/", "%", "=", "!", "&", "|", "<", ">"],
					token: "operator",
				},
			],
		},

		// Regex pattern
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
					// Newline ends unterminated regex
					state: "expect_expression",
					exit: true,
					rewind: true,
				},
				{
					any: true,
					token: "regex",
				},
			],
		},

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

		regex_flags: {
			rules: [
				{
					match: ["g", "i", "m", "s", "u", "y", "d"],
					token: "regex",
				},
				{
					any: true,
					state: "expect_operator",
					exit: true,
					rewind: true,
				},
			],
		},
	},
};