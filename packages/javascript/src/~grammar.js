// JavaScript grammar with improved regex/division disambiguation
// Uses two primary states: expect_expression (/ is regex) and expect_operator (/ is division)

const KEYWORDS = [
	// Control flow
	"if", "else", "switch", "case", "default", "while", "do", "for", "break", "continue", "return",
	// Declarations
	"var", "let", "const", "function", "class", "extends", "static", "async", "await",
	// Operators/expressions
	"new", "typeof", "instanceof", "in", "of", "delete", "void",
	// Exception handling
	"try", "catch", "finally", "throw",
	// Module system
	"import", "export", "from", "as",
	// Other
	"this", "super", "null", "undefined", "debugger", "with", "yield", "get", "set",
];

const BOOLEAN_LITERALS = ["true", "false"];
const SPECIAL_VALUES = ["undefined", "null", "NaN", "Infinity"];

// Keywords after which / starts a regex (expect expression)
const REGEX_PRECEDING_KEYWORDS = [
	"return", "throw", "typeof", "new", "void", "delete", 
	"in", "of", "instanceof", "yield", "await", "case", "else", "extends",
];

// Keywords that act like values (after which / is division)
const VALUE_LIKE_KEYWORDS = ["this", "super"];

// Common character ranges
const LETTER_RANGE = [["a", "z"], ["A", "Z"]];
const DIGIT_RANGE = [["0", "9"]];
const ALPHANUMERIC_RANGE = [...LETTER_RANGE, ...DIGIT_RANGE];
const HEX_RANGE = [...DIGIT_RANGE, ["a", "f"], ["A", "F"]];

// Helper to create rules that exist in both expect_expression and expect_operator states
function createCommonRules(expectState) {
	const isExpectExpression = expectState === "expect_expression";
	
	return [
		// Comments - preserve current state
		{
			match_within: { start: "//", end: "\n" },
			token: "comment",
		},
		{
			match_within: { start: "/*", end: "*/" },
			token: "comment",
		},

		// Strings - after strings, expect operator
		{
			match_within: { start: '"', end: '"', escape: "\\", multiline: true },
			token: "string",
			state: "expect_operator",
		},
		{
			match_within: { start: "'", end: "'", escape: "\\", multiline: true },
			token: "string",
			state: "expect_operator",
		},

		// Template literal
		{
			match: "`",
			token: "template",
			state: "template_literal",
		},

		// Numbers - after numbers, expect operator
		{ match: ["0x", "0X"], token: "number", state: "hex_number" },
		{ match: ["0b", "0B"], token: "number", state: "binary_number" },
		{ match: ["0o", "0O"], token: "number", state: "octal_number" },
		{ range: DIGIT_RANGE, token: "number", state: "number" },

		// Four-character operators
		{ match: [">>>="], token: "operator", state: "expect_expression" },

		// Three-character operators  
		{
			match: ["===", "!==", ">>>", "<<=", ">>=", "**=", "&&=", "||=", "??=", "..."],
			token: "operator",
			state: "expect_expression",
		},

		// Division assignment MUST come before other two-char operators
		{ match: "/=", token: "operator", state: "expect_expression" },

		// Two-character operators - MUST come before single-character operators
		// ++ and -- need special handling for prefix vs postfix
		// In expect_expression, ++ and -- are prefix operators (go to expect_expression)
		// In expect_operator, ++ and -- are postfix operators (stay in expect_operator)
		{
			match: "++",
			token: "operator",
			...(isExpectExpression ? { state: "expect_expression" } : {}),
		},
		{
			match: "--",
			token: "operator",
			...(isExpectExpression ? { state: "expect_expression" } : {}),
		},
		
		// Other two-character operators
		{
			match: [
				"<=", ">=", "==", "!=", "&&", "||", "<<", ">>", "**", "??", "?.",
				"=>", "+=", "-=", "*=", "%=", "&=", "|=", "^=",
			],
			token: "operator",
			state: "expect_expression",
		},

		// Single-character operators - MUST come after two-character operators
		{
			match: ["-", "+", "<", ">", "=", "!", "&", "|", "?", "*", "~", "^", "%", ":"],
			token: "operator",
			state: "expect_expression",
		},

		// Opening brackets - expect expression
		{ match: ["(", "{", "["], token: "punctuation", state: "expect_expression" },
		
		// Closing brackets - expect operator
		{ match: [")", "}", "]"], token: "punctuation", state: "expect_operator" },
		
		// Comma, semicolon - expect expression
		{ match: [";", ","], token: "punctuation", state: "expect_expression" },
		
		// Dot - preserve state (could be property access or decimal)
		{ match: ["."], token: "punctuation" },

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

		// Other keywords - most don't clearly indicate what follows
		{
			match: KEYWORDS.filter(k => 
				!REGEX_PRECEDING_KEYWORDS.includes(k) && 
				!VALUE_LIKE_KEYWORDS.includes(k)),
			boundary: true,
			token: "keyword",
			// Keep current state
		},

		// Boolean literals - act like values
		{
			match: BOOLEAN_LITERALS,
			boundary: true,
			token: "boolean",
			state: "expect_operator",
		},

		// Special values (NaN, Infinity) - act like values  
		{
			match: ["NaN", "Infinity"],
			boundary: true,
			token: "keyword",
			state: "expect_operator",
		},

		// Identifiers
		{ match: ["_", "$"], state: "identifier_probe" },
		{ range: LETTER_RANGE, state: "identifier_probe" },

		// Whitespace
		{ match: [" ", "\t", "\n", "\r"] },
	];
}

/**
 * @type {import("@twinkleplop/core").Grammar}
 */
export default {
	name: "javascript",
	states: {
		// Main state - defaults to expect_expression (/ is regex)
		main: {
			rules: [
				...createCommonRules("expect_expression"),
				
				// Forward slash - in main/expect_expression, it's a regex
				{
					match: "/",
					token: "regex",
					state: "regex_pattern",
				},
			],
		},

		// State expecting an expression (/ is regex)
		expect_expression: {
			rules: [
				...createCommonRules("expect_expression"),
				
				// Forward slash - here it's a regex
				{
					match: "/",
					token: "regex",
					state: "regex_pattern",
				},
			],
		},

		// State expecting an operator (/ is division)
		expect_operator: {
			rules: [
				...createCommonRules("expect_operator"),
				
				// Forward slash - here it's division
				{
					match: "/",
					token: "operator",
					state: "expect_expression",
				},
			],
		},

		// Identifier probe - check if it's a function call
		identifier_probe: {
			mode: "probe",
			fallback: "identifier",
			rules: [
				// Check if followed by parenthesis (function call)
				{ match: ["("], state: "function_name" },
				// Whitespace then parenthesis
				{ match: [" (", "\t(", "\n(", "\r("], state: "function_name" },
				// Default to regular identifier via fallback
			],
		},

		// Regular identifier
		identifier: {
			rules: [
				{ match: ["_", "$"], token: "identifier" },
				{ range: ALPHANUMERIC_RANGE, token: "identifier" },
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
				{ range: ALPHANUMERIC_RANGE, token: "function" },
				{ match: ["_", "$"], token: "function" },
				{
					match: "(",
					token: "punctuation",
					state: "function_body",
					exit: true,
				},
				{ match: [" ", "\t", "\n", "\r"] },
			],
		},

		// Inside function arguments - full JS syntax with expect_expression context
		function_body: {
			rules: [
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

				// Most rules from expect_expression, but simplified
				// Comments
				{ match_within: { start: "//", end: "\n" }, token: "comment" },
				{ match_within: { start: "/*", end: "*/" }, token: "comment" },

				// Strings
				{ match_within: { start: '"', end: '"', escape: "\\", multiline: true }, token: "string" },
				{ match_within: { start: "'", end: "'", escape: "\\", multiline: true }, token: "string" },
				
				// Template literal
				{ match: "`", token: "template", state: "template_literal" },

				// Numbers
				{ match: ["0x", "0X"], token: "number", state: "hex_number" },
				{ match: ["0b", "0B"], token: "number", state: "binary_number" },
				{ match: ["0o", "0O"], token: "number", state: "octal_number" },
				{ range: DIGIT_RANGE, token: "number", state: "number" },

				// In function args, / should be regex by default
				// (since args are expressions)
				{ match: "/", token: "regex", state: "regex_pattern" },

				// Operators - order matters!
				{ match: "/=", token: "operator" },
				{ match: ["===", "!==", ">>>", "**="], token: "operator" },
				// ++ and -- MUST come before + and -
				{ match: ["++", "--"], token: "operator" },
				// Other two-character operators
				{
					match: [
						"<=", ">=", "==", "!=", "&&", "||", 
						"<<", ">>", "**", "??", "?.", "=>", 
						"+=", "-=", "*=", "%=", "&=", "|=", "^=",
					],
					token: "operator",
				},
				// Single-character operators
				{
					match: ["-", "+", "<", ">", "=", "!", "&", "|", "?", "*", "~", "^", "%", ":"],
					token: "operator",
				},

				// Punctuation
				{ match: ["[", "]", "{", "}", ";", ".", ","], token: "punctuation" },

				// Keywords
				{ match: KEYWORDS, boundary: true, token: "keyword" },

				// Boolean literals
				{ match: BOOLEAN_LITERALS, boundary: true, token: "boolean" },

				// Special values
				{ match: SPECIAL_VALUES, boundary: true, token: "keyword" },

				// Identifiers
				{ match: ["_", "$"], state: "identifier_probe" },
				{ range: LETTER_RANGE, state: "identifier_probe" },

				// Whitespace
				{ match: [" ", "\t", "\n", "\r"] },
			],
		},

		// Number states
		number: {
			rules: [
				{ range: DIGIT_RANGE, token: "number" },
				{ match: ".", token: "number", state: "decimal_number" },
				{ match: ["e", "E"], token: "number", state: "exponent_sign" },
				{ match: "n", token: "number", state: "expect_operator", exit: true },
				{ any: true, state: "expect_operator", exit: true, rewind: true },
			],
		},

		decimal_number: {
			rules: [
				{ range: DIGIT_RANGE, token: "number" },
				{ match: ["e", "E"], token: "number", state: "exponent_sign" },
				{ any: true, state: "expect_operator", exit: true, rewind: true },
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
				{ any: true, state: "expect_operator", exit: true, rewind: true },
			],
		},

		hex_number: {
			rules: [
				{ range: HEX_RANGE, token: "number" },
				{ match: "n", token: "number", state: "expect_operator", exit: true },
				{ any: true, state: "expect_operator", exit: true, rewind: true },
			],
		},

		binary_number: {
			rules: [
				{ match: ["0", "1"], token: "number" },
				{ match: "n", token: "number", state: "expect_operator", exit: true },
				{ any: true, state: "expect_operator", exit: true, rewind: true },
			],
		},

		octal_number: {
			rules: [
				{ range: [["0", "7"]], token: "number" },
				{ match: "n", token: "number", state: "expect_operator", exit: true },
				{ any: true, state: "expect_operator", exit: true, rewind: true },
			],
		},

		// Template literal
		template_literal: {
			rules: [
				{ match: "${", token: "template", state: "template_interpolation" },
				{ match: "`", token: "template", state: "expect_operator", exit: true },
				{ match: "\\", token: "template", state: "template_escape" },
				{ any: true, token: "template" },
			],
		},

		template_escape: {
			rules: [
				{ any: true, token: "template", state: "template_literal", exit: true },
			],
		},

		// Template interpolation - back to expect_expression context
		template_interpolation: {
			rules: [
				{ match: "}", token: "template", exit: true },
				// Most expect_expression rules apply here
				{ match_within: { start: '"', end: '"', escape: "\\", multiline: true }, token: "string" },
				{ match_within: { start: "'", end: "'", escape: "\\", multiline: true }, token: "string" },
				{ match: "`", token: "template", state: "template_literal" },
				{ range: DIGIT_RANGE, token: "number", state: "number" },
				{ match: KEYWORDS, boundary: true, token: "keyword" },
				{ match: BOOLEAN_LITERALS, boundary: true, token: "boolean" },
				{ match: ["_", "$"], state: "identifier_probe" },
				{ range: LETTER_RANGE, state: "identifier_probe" },
				{ match: ["(", ")", "{", "[", "]", ",", ".", ";", ":", "?"], token: "punctuation" },
				{ match: ["+", "-", "*", "/", "%", "=", "!", "&", "|", "<", ">"], token: "operator" },
			],
		},

		// Regex pattern
		regex_pattern: {
			rules: [
				{ match: "/", token: "regex", state: "regex_flags" },
				{ match: "\\", token: "regex", state: "regex_escape" },
				{ match: "[", token: "regex", state: "regex_class" },
				{ match: "\n", state: "expect_expression", exit: true, rewind: true },
				{ any: true, token: "regex" },
			],
		},

		regex_escape: {
			rules: [
				{ any: true, token: "regex", state: "regex_pattern", exit: true },
			],
		},

		regex_class: {
			rules: [
				{ match: "]", token: "regex", state: "regex_pattern", exit: true },
				{ match: "\\", token: "regex", state: "regex_class_escape" },
				{ any: true, token: "regex" },
			],
		},

		regex_class_escape: {
			rules: [
				{ any: true, token: "regex", state: "regex_class", exit: true },
			],
		},

		regex_flags: {
			rules: [
				{ match: ["g", "i", "m", "s", "u", "y", "d"], token: "regex" },
				{ any: true, state: "expect_operator", exit: true, rewind: true },
			],
		},
	},
};