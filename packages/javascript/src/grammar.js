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
				{
					match: ["0x", "0X"],
					token: "number",
					state: "hex_number",
					exit: true,
				},
				{
					match: ["0b", "0B"],
					token: "number",
					state: "binary_number",
					exit: true,
				},
				{
					match: ["0o", "0O"],
					token: "number",
					state: "octal_number",
					exit: true,
				},
				{ range: DIGIT_RANGE, token: "number", state: "number", exit: true },

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
					state: "identifier_probe",
					exit: true,
				},
				{
					range: LETTER_RANGE,
					state: "identifier_probe",
					exit: true,
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

		identifier_probe: {
			mode: "probe",
			fallback: "identifier",
			rules: [
				// First, match the first character and continue
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

		function_body: {
			rules: [
				// Comments
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,

				// Strings
				STRING_DOUBLE,
				STRING_SINGLE,

				// Numbers
				// Numbers (argument context)
				{ match: ["0x", "0X"], token: "number", state: "hex_number_arg" },
				{ match: ["0b", "0B"], token: "number", state: "binary_number_arg" },
				{ match: ["0o", "0O"], token: "number", state: "octal_number_arg" },
				{ range: DIGIT_RANGE, token: "number", state: "number_arg" },

				// End of arguments
				{
					match: ")",
					token: "punctuation",
					state: "division",
					exit: true,
				},

				// Nested parentheses (for nested calls or grouping)
				{
					match: "(",
					token: "punctuation",
					state: "paren_group", // push a nested paren group
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

						"~",
						"^",
						"%",
					],
					token: "operator",
				},
				{
					match: "/",
					token: "regex",
					state: "regex_pattern",
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
					exit: true,
				},
				{
					range: LETTER_RANGE,
					state: "identifier_probe",
					exit: true,
				},
			],
		},

		// Nested parentheses inside function arguments
		paren_group: {
			rules: [
				// Comments
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,

				// Strings
				STRING_DOUBLE,
				STRING_SINGLE,

				// Numbers (group context)
				{ match: ["0x", "0X"], token: "number", state: "hex_number_arg" },
				{ match: ["0b", "0B"], token: "number", state: "binary_number_arg" },
				{ match: ["0o", "0O"], token: "number", state: "octal_number_arg" },
				{ range: DIGIT_RANGE, token: "number", state: "number_arg" },

				// End of this paren group – just pop
				{ match: ")", token: "punctuation", exit: true },

				// Nested parentheses
				{ match: "(", token: "punctuation", state: "paren_group" },

				// Argument separator and other punctuation
				{ match: ",", token: "punctuation" },
				{ match: ["[", "]", "{", "}", ";", "."], token: "punctuation" },

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
						"/",
						"~",
						"^",
						"%",
					],
					token: "operator",
				},

				// Literals
				{ match: BOOLEAN_LITERALS, token: "boolean" },

				// Identifiers inside group (no probe here)
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
				{
					match: ["_", "$"],
					token: "identifier",
				},
				{
					range: ALPHANUMERIC_RANGE,
					token: "identifier",
				},
				// Opening brackets after an identifier
				{
					match: ["(", "[", "{"],
					token: "punctuation",
					state: "regex_allow", // Inside brackets, / is regex
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

				// Division operators should be tokenized here
				{ match: "/=", token: "operator", state: "regex_allow", exit: true },
				{ match: "/", token: "operator", state: "regex_allow", exit: true },

				// Multi-char operators
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
				{
					match: ["0x", "0X"],
					token: "number",
					state: "hex_number",
					exit: true,
				},
				{
					match: ["0b", "0B"],
					token: "number",
					state: "binary_number",
					exit: true,
				},
				{
					match: ["0o", "0O"],
					token: "number",
					state: "octal_number",
					exit: true,
				},
				{ range: DIGIT_RANGE, token: "number", state: "number", exit: true },

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

				// Identifiers - transition to probe state without tokenizing
				{
					match: ["_", "$"],
					state: "identifier_probe",
					exit: true,
				},
				{
					range: LETTER_RANGE,
					state: "identifier_probe",
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
				{
					match: ["0x", "0X"],
					token: "number",
					state: "hex_number",
					exit: true,
				},
				{
					match: ["0b", "0B"],
					token: "number",
					state: "binary_number",
					exit: true,
				},
				{
					match: ["0o", "0O"],
					token: "number",
					state: "octal_number",
					exit: true,
				},
				{ range: DIGIT_RANGE, token: "number", state: "number", exit: true },

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
					state: "identifier_probe",
					exit: true,
				},
				{
					range: LETTER_RANGE,
					state: "identifier_probe",
					exit: true,
				},

				// Whitespace
				{ match: [" ", "\t", "\n", "\r"] },
			],
		},

		// Start of identifier - use probe to check if it's a function
		// identifier_probe: {
		// 	mode: "probe",
		// 	fallback: "identifier_continue",
		// 	rules: [
		// 		// Continue consuming identifier characters in probe mode
		// 		{
		// 			match: ["_", "$"],
		// 			// Continue in probe mode
		// 		},
		// 		{
		// 			range: ALPHANUMERIC_RANGE,
		// 			// Continue in probe mode
		// 		},
		// 		// After identifier, check for function call pattern
		// 		{
		// 			match: "(",
		// 			state: "function_name",
		// 		},
		// 		// Whitespace after identifier might precede opening paren
		// 		{
		// 			match: " ",
		// 			// Continue in probe mode to check for opening paren
		// 		},
		// 		// Any other character means it's just a regular identifier
		// 		{
		// 			any: true,
		// 			state: "identifier_continue",
		// 		},
		// 	],
		// },

		// Regular identifier
		// identifier: {
		// 	rules: [
		// 		{ match: ["_", "$"], token: "identifier" },
		// 		{ range: ALPHANUMERIC_RANGE, token: "identifier" },
		// 		{
		// 			any: true,
		// 			exit: true,
		// 		},
		// 	],
		// },

		// Continue collecting function name
		// function_name: {
		// 	rules: [
		// 		// Continue function name
		// 		{ range: ALPHANUMERIC_RANGE, token: "function" },
		// 		{ match: ["_", "$"], token: "function" },
		// 		// Opening parenthesis - transition to function body
		// 		{
		// 			match: "(",
		// 			token: "punctuation",
		// 			state: "function_body",
		// 			exit: true,
		// 		},
		// 		// Whitespace before opening paren
		// 		{ match: [" ", "\t"] },
		// 	],
		// },

		// Inside function arguments - handle full syntax including nested functions
		// function_body: {
		// 	rules: [
		// 		// Comments
		// 		SINGLE_LINE_COMMENT,
		// 		MULTI_LINE_COMMENT,

		// 		// Strings and template literals
		// 		STRING_DOUBLE,
		// 		STRING_SINGLE,
		// 		TEMPLATE_LITERAL,

		// 		// Numbers
		// 		{ match: ["0x", "0X"], token: "number", state: "hex_number" },
		// 		{ match: ["0b", "0B"], token: "number", state: "binary_number" },
		// 		{ match: ["0o", "0O"], token: "number", state: "octal_number" },
		// 		{ range: DIGIT_RANGE, token: "number", state: "number" },

		// 		// End of arguments
		// 		{
		// 			match: ")",
		// 			token: "punctuation",
		// 			exit: true,
		// 		},

		// 		// Nested parentheses (for nested calls or grouping)
		// 		{
		// 			match: "(",
		// 			token: "punctuation",
		// 			state: "function_body", // Recursive for nested parens
		// 		},

		// 		// Argument separator
		// 		{ match: ",", token: "punctuation" },

		// 		// Spread/rest operator
		// 		{ match: "...", token: "operator" },

		// 		// Operators (for expressions in arguments)
		// 		{ match: ["===", "!=="], token: "operator" },
		// 		{
		// 			match: [
		// 				"--",
		// 				"++",
		// 				"<=",
		// 				">=",
		// 				"==",
		// 				"!=",
		// 				"&&",
		// 				"||",
		// 				"??",
		// 				"?.",
		// 				"=>",
		// 			],
		// 			token: "operator",
		// 		},
		// 		{
		// 			match: [
		// 				"-",
		// 				"+",
		// 				"<",
		// 				">",
		// 				"=",
		// 				"!",
		// 				"&",
		// 				"|",
		// 				"?",
		// 				"*",
		// 				"/",
		// 				"~",
		// 				"^",
		// 				"%",
		// 			],
		// 			token: "operator",
		// 		},

		// 		// Other punctuation
		// 		{ match: ["[", "]", "{", "}"], token: "punctuation" },
		// 		{ match: [";", ".", ":"], token: "punctuation" },

		// 		// Boolean and special values
		// 		{ match: BOOLEAN_LITERALS, token: "boolean" },
		// 		{ match: SPECIAL_VALUES, token: "keyword" },

		// 		// Keywords
		// 		{ match: KEYWORDS, boundary: true, token: "keyword" },

		// 		// Recursive identifier probe for nested functions
		// 		{
		// 			match: ["_", "$"],
		// 			token: "identifier",
		// 			state: "identifier_continue",
		// 		},
		// 		{
		// 			range: LETTER_RANGE,
		// 			token: "identifier",
		// 			state: "identifier_continue",
		// 		},

		// 		// Whitespace
		// 		{ match: [" ", "\t", "\n", "\r"] },
		// 	],
		// },

		// Continue collecting identifier characters
		// identifier_continue: {
		// 	rules: [
		// 		{ match: ["_", "$"], token: "identifier" },
		// 		{ range: ALPHANUMERIC_RANGE, token: "identifier" },
		// 		// Special handling for opening brackets - they indicate function/array/object access
		// 		{
		// 			match: ["(", "[", "{"],
		// 			token: "punctuation",
		// 			state: "regex_allow", // Inside brackets, / is regex
		// 			exit: true,
		// 		},
		// 		{
		// 			any: true,
		// 			state: "division", // After identifier, / is division
		// 			exit: true,
		// 		},
		// 	],
		// },

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
				{ match: "${", token: "punctuation", state: "tmpl_main" },
				{ match: "`", token: "template", exit: true },
				{ any: true, token: "template" },
			],
		},

		// Template interpolation (full JS with brace balancing)
			template_interpolation: {
			rules: [
				// Exit at top-level closing brace
				{ match: "}", token: "punctuation", exit: true },
				// Balance nested braces inside interpolation
				{ match: "{", token: "punctuation", state: "tmpl_brace" },
				// Nested template literals
				TEMPLATE_LITERAL,
				// Comments
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,
				// Strings
				STRING_DOUBLE,
				STRING_SINGLE,
				// Numbers (push/pop via *_arg variants)
				{ match: ["0x", "0X"], token: "number", state: "hex_number_arg" },
				{ match: ["0b", "0B"], token: "number", state: "binary_number_arg" },
				{ match: ["0o", "0O"], token: "number", state: "octal_number_arg" },
				{ range: DIGIT_RANGE, token: "number", state: "number_arg" },
				// Regex literal allowed at expression boundaries
				{ match: "/", token: "regex", state: "regex_pattern" },
				// Operators
				{ match: [">>>="], token: "operator" },
				{ match: ["===","!==",">>>","<<=",">>=","**=","&&=","||=","??="], token: "operator" },
				{ match: "...", token: "operator" },
				{ match: ["++","--","<=",">=","==","!=","&&","||","<<",">>","**","??","?.","=>","+=","-=","*=","/=","%=","&=","|=","^="], token: "operator" },
				{ match: ["-","+","<",">","=","!","&","|","?","*","~","^","%",":"], token: "operator" },
				// Punctuation and grouping
				{ match: ["(", "["], token: "punctuation" },
				{ match: [")", "]"], token: "punctuation", state: "tmpl_division" },
				{ match: [";", ",", "."], token: "punctuation" },
				// Keywords
				{ match: REGEX_PRECEDING_KEYWORDS, boundary: true, token: "keyword" },
				{ match: KEYWORDS.filter((k) => !REGEX_PRECEDING_KEYWORDS.includes(k)), boundary: true, token: "keyword", state: "tmpl_division" },
				// Literals
				{ match: BOOLEAN_LITERALS, boundary: true, token: "boolean", state: "tmpl_division" },
				{ match: SPECIAL_VALUES, boundary: true, token: "keyword", state: "tmpl_division" },
				// Identifiers
				{ match: ["_", "$"], token: "identifier", state: "identifier_tmpl" },
				{ range: LETTER_RANGE, token: "identifier", state: "identifier_tmpl" },
				// Whitespace
				{ match: [" ", "\t", "\n", "\r"] },
			],
		},

		// (probe removed; identifiers in interpolation handled directly)

		// Identifier inside interpolation
		identifier_tmpl: {
			rules: [
				{ match: ["_", "$"], token: "identifier" },
				{ range: ALPHANUMERIC_RANGE, token: "identifier" },
				// Opening brackets
				{ match: ["("], token: "punctuation", state: "function_body_tmpl" },
				{ match: ["["], token: "punctuation" },
				{ match: ["{"], token: "punctuation", state: "tmpl_brace" },
				// Closing brackets → hand back to division to reprocess and possibly close interpolation
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
				{ match: [
					"===","!==",">>>","<<=",">>=","**=","&&=","||=","??=",
				], token: "operator", state: "template_interpolation" },
				// Single-char operators
				{ match: ["-","+","<",">","=","!","&","|","?","*","~","^","%",":"], token: "operator", state: "template_interpolation" },
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

		function_body_tmpl: {
			rules: [
				// Comments
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,
				// Strings and template literals
				STRING_DOUBLE,
				STRING_SINGLE,
				TEMPLATE_LITERAL,
				// Numbers (argument context)
				{ match: ["0x", "0X"], token: "number", state: "hex_number_arg" },
				{ match: ["0b", "0B"], token: "number", state: "binary_number_arg" },
				{ match: ["0o", "0O"], token: "number", state: "octal_number_arg" },
				{ range: DIGIT_RANGE, token: "number", state: "number_arg" },
				// End of arguments
				{ match: ")", token: "punctuation", state: "tmpl_division", exit: true },
				// Nested parentheses
				{ match: "(", token: "punctuation", state: "paren_group_tmpl" },
				// Argument separator
				{ match: ",", token: "punctuation" },
				// Operators
				{ match: ["===","!=="], token: "operator" },
				{ match: ["--","++","<=",">=","==","!=","&&","||"], token: "operator" },
				{ match: ["-","+","<",">","=","!","&","|","?","*","/","~","^","%"], token: "operator" },
				// Punctuation
				{ match: ["[", "]", "{", "}"], token: "punctuation" },
				{ match: [";", "."], token: "punctuation" },
				// Literals
				{ match: BOOLEAN_LITERALS, token: "boolean" },
				// Identifiers inside args (reuse template probe)
				{ match: ["_", "$"], token: "identifier", state: "identifier_tmpl" },
				{ range: LETTER_RANGE, token: "identifier", state: "identifier_tmpl" },
			],
		},

		paren_group_tmpl: {
			rules: [
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,
				STRING_DOUBLE,
				STRING_SINGLE,
				{ match: ["0x", "0X"], token: "number", state: "hex_number_arg" },
				{ match: ["0b", "0B"], token: "number", state: "binary_number_arg" },
				{ match: ["0o", "0O"], token: "number", state: "octal_number_arg" },
				{ range: DIGIT_RANGE, token: "number", state: "number_arg" },
				{ match: ")", token: "punctuation", exit: true },
				{ match: "(", token: "punctuation", state: "paren_group_tmpl" },
				{ match: ",", token: "punctuation" },
				{ match: ["===","!=="], token: "operator" },
				{ match: ["--","++","<=",">=","==","!=","&&","||"], token: "operator" },
				{ match: ["-","+","<",">","=","!","&","|","?","*","/","~","^","%"], token: "operator" },
				{ match: ["[", "]", "{", "}", ";", "."], token: "punctuation" },
				{ match: BOOLEAN_LITERALS, token: "boolean" },
				{ match: ["_", "$"], token: "identifier" },
				{ range: ALPHANUMERIC_RANGE, token: "identifier" },
			],
		},

		// Division-like context within interpolation
		tmpl_division: {
			rules: [
				{ match: "}", token: "punctuation", exit: true },
				TEMPLATE_LITERAL,
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,
				STRING_DOUBLE,
				STRING_SINGLE,
				{ match: ["(", "["], token: "punctuation", state: "tmpl_regex_allow" },
				{ match: "{", token: "punctuation", state: "tmpl_brace" },
				{ match: ["0x", "0X"], token: "number", state: "hex_number", exit: true },
				{ match: ["0b", "0B"], token: "number", state: "binary_number", exit: true },
				{ match: ["0o", "0O"], token: "number", state: "octal_number", exit: true },
				{ range: DIGIT_RANGE, token: "number", state: "number", exit: true },
				{ match: "/=", token: "operator", state: "tmpl_regex_allow" },
				{ match: "/", token: "operator", state: "tmpl_regex_allow" },
				{ match: [">>>="], token: "operator", state: "tmpl_regex_allow" },
				{ match: ["===","!==",">>>","<<=",">>=","**=","&&=","||=","??="], token: "operator", state: "tmpl_regex_allow" },
				{ match: "...", token: "operator", state: "tmpl_regex_allow" },
				{ match: ["++","--","<=",">=","==","!=","&&","||","<<",">>","**","??","?.","=>","+=","-=","*","%","&=","|=","^="], token: "operator", state: "tmpl_regex_allow" },
				{ match: ["-","+","<",">","=","!","&","|","?","*","~","^","%",":"], token: "operator", state: "tmpl_regex_allow" },
				{ match: [")", "]"], token: "punctuation" },
				{ match: [";", ",", "."], token: "punctuation" },
				{ match: REGEX_PRECEDING_KEYWORDS, boundary: true, token: "keyword", state: "tmpl_regex_allow" },
				{ match: KEYWORDS.filter((k) => !REGEX_PRECEDING_KEYWORDS.includes(k)), boundary: true, token: "keyword", state: "tmpl_division" },
				{ match: BOOLEAN_LITERALS, boundary: true, token: "boolean", state: "tmpl_division" },
				{ match: SPECIAL_VALUES, boundary: true, token: "keyword", state: "tmpl_division" },
				{ match: ["_", "$"], token: "identifier", state: "identifier_tmpl" },
				{ range: LETTER_RANGE, token: "identifier", state: "identifier_tmpl" },
				{ match: [" ", "\t", "\n", "\r"] },
			],
		},

		// Regex-allowed context inside interpolation
		tmpl_regex_allow: {
			rules: [
				{ match: "}", token: "punctuation", exit: true },
				TEMPLATE_LITERAL,
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,
				STRING_DOUBLE,
				STRING_SINGLE,
				// Numbers
				{ match: ["0x", "0X"], token: "number", state: "hex_number", exit: true },
				{ match: ["0b", "0B"], token: "number", state: "binary_number", exit: true },
				{ match: ["0o", "0O"], token: "number", state: "octal_number", exit: true },
				{ range: DIGIT_RANGE, token: "number", state: "number", exit: true },
				// Here / is a regex
				{ match: "/", token: "regex", state: "regex_pattern" },
				// Operators & punctuation
				{ match: [">>>="], token: "operator" },
				{ match: ["===","!==",">>>","<<=",">>=","**=","&&=","||=","??="], token: "operator" },
				{ match: "...", token: "operator" },
				{ match: ["++","--","<=",">=","==","!=","&&","||","<<",">>","**","??","?.","=>","+=","-=","*","/","%","&=","|=","^="], token: "operator" },
				{ match: ["-","+","<",">","=","!","&","|","?","*","~","^","%",":"], token: "operator" },
				{ match: ["(", "{" , "["], token: "punctuation" },
				{ match: [")", "}", "]"], token: "punctuation", state: "tmpl_division", exit: true },
				{ match: [";", ",", "."], token: "punctuation" },
				// Keywords & literals
				{ match: REGEX_PRECEDING_KEYWORDS, boundary: true, token: "keyword" },
				{ match: KEYWORDS.filter((k) => !REGEX_PRECEDING_KEYWORDS.includes(k)), boundary: true, token: "keyword", state: "tmpl_division" },
				{ match: BOOLEAN_LITERALS, boundary: true, token: "boolean", state: "tmpl_division" },
				{ match: SPECIAL_VALUES, boundary: true, token: "keyword", state: "tmpl_division" },
				// Identifiers
				{ match: ["_", "$"], token: "identifier", state: "identifier_tmpl" },
				{ range: LETTER_RANGE, token: "identifier", state: "identifier_tmpl" },
				{ match: [" ", "\t", "\n", "\r"] },
			],
		},

		// Main-like context inside interpolation (entry after ${)
		tmpl_main: {
			rules: [
				{ match: "}", exit: true },
				// Comments
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,
				// Strings and template literals
				STRING_DOUBLE,
				STRING_SINGLE,
				TEMPLATE_LITERAL,
				// Numbers
				{ match: ["0x", "0X"], token: "number", state: "hex_number", exit: true },
				{ match: ["0b", "0B"], token: "number", state: "binary_number", exit: true },
				{ match: ["0o", "0O"], token: "number", state: "octal_number", exit: true },
				{ range: DIGIT_RANGE, token: "number", state: "number", exit: true },
				// Operators
				{ match: [">>>="], token: "operator" },
				{ match: ["===","!==",">>>","<<=",">>=","**=","&&=","||=","??="], token: "operator" },
				{ match: "...", token: "operator" },
				{ match: ["++","--","<=",">=","==","!=","&&","||","<<",">>","**","??","?.","=>","+=","-=","*=","/=","%=","&=","|=","^="], token: "operator", state: "tmpl_regex_allow", exit: true },
				{ match: ["-","+","<",">","=","!","&","|","?","*","~","^","%",":"], token: "operator", state: "tmpl_regex_allow", exit: true },
				// Punctuation
				{ match: ["(", "{", "["], token: "punctuation", state: "tmpl_regex_allow", exit: true },
				{ match: [")", "]"], token: "punctuation", state: "tmpl_division", exit: true },
				{ match: [";", ","], token: "punctuation", state: "tmpl_regex_allow", exit: true },
				{ match: ["."], token: "punctuation" },
				// Keywords
				{ match: REGEX_PRECEDING_KEYWORDS, boundary: true, token: "keyword", state: "tmpl_regex_allow", exit: true },
				{ match: KEYWORDS.filter((k) => !REGEX_PRECEDING_KEYWORDS.includes(k)), boundary: true, token: "keyword", state: "tmpl_division", exit: true },
				// Literals
				{ match: BOOLEAN_LITERALS, boundary: true, token: "boolean", state: "tmpl_division", exit: true },
				{ match: SPECIAL_VALUES, boundary: true, token: "keyword", state: "tmpl_division", exit: true },
				// Identifiers
				{ match: ["_", "$"], token: "identifier", state: "identifier_tmpl" },
				{ range: LETTER_RANGE, token: "identifier", state: "identifier_tmpl" },
				// Default: allow regex at start
				{ match: "/", token: "regex", state: "regex_pattern" },
				// Whitespace
				{ match: [" ", "\t", "\n", "\r"] },
			],
		},

		// Brace-balanced block inside interpolation
		tmpl_brace: {
			rules: [
				{ match: "}", exit: true },
				{ match: "{", token: "punctuation", state: "tmpl_brace" },
				TEMPLATE_LITERAL,
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,
				STRING_DOUBLE,
				STRING_SINGLE,
				{ match: ["0x", "0X"], token: "number", state: "hex_number", exit: true },
				{ match: ["0b", "0B"], token: "number", state: "binary_number", exit: true },
				{ match: ["0o", "0O"], token: "number", state: "octal_number", exit: true },
				{ range: DIGIT_RANGE, token: "number", state: "number", exit: true },
				{ match: "/", token: "regex", state: "regex_pattern" },
				{ match: [">>>="], token: "operator" },
				{ match: ["===","!==",">>>","<<=",">>=","**=","&&=","||=","??="], token: "operator" },
				{ match: "...", token: "operator" },
				{ match: ["++","--","<=",">=","==","!=","&&","||","<<",">>","**","??","?.","=>","+=","-=","*=","/=","%=","&=","|=","^="], token: "operator" },
				{ match: ["-","+","<",">","=","!","&","|","?","*","~","^","%",":"], token: "operator" },
				{ match: ["(",")","[","]", ",", ".", ";"], token: "punctuation" },
				{ match: REGEX_PRECEDING_KEYWORDS, boundary: true, token: "keyword" },
				{ match: KEYWORDS.filter((k) => !REGEX_PRECEDING_KEYWORDS.includes(k)), boundary: true, token: "keyword" },
				{ match: BOOLEAN_LITERALS, boundary: true, token: "boolean" },
				{ match: SPECIAL_VALUES, boundary: true, token: "keyword" },
				{ match: ["_", "$"], state: "identifier_probe", exit: true },
				{ range: LETTER_RANGE, state: "identifier_probe", exit: true },
				{ match: [" ", "\t", "\n", "\r"] },
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
