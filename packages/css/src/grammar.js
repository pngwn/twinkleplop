const CSS_UNITS = [
	"px",
	"em",
	"rem",
	"vh",
	"vw",
	"vmin",
	"vmax",
	"%",
	"cm",
	"mm",
	"in",
	"pt",
	"pc",
	"ex",
	"ch",
	"deg",
	"rad",
	"grad",
	"turn",
	"s",
	"ms",
	"Hz",
	"kHz",
];

// Common match_within patterns
const COMMENT = {
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
	},
	token: "string",
};

const STRING_SINGLE = {
	match_within: {
		start: "'",
		end: "'",
		escape: "\\",
	},
	token: "string",
};

// Common selector patterns
const ID_SELECTOR = {
	match: "#",
	token: "id",
	state: "id_selector",
};

const CLASS_SELECTOR = {
	match: ".",
	token: "class-name",
	state: "class_selector",
};

const PSEUDO_ELEMENT = {
	match: "::",
	token: "pseudo-selector",
	state: "pseudo_class",
};

const PSEUDO_CLASS = {
	match: ":",
	token: "pseudo-selector",
	state: "pseudo",
};

const PARENT_SELECTOR = {
	match: "&",
	token: "selector",
	state: "nested_selector",
};

// Common value patterns
const HEX_COLOR = {
	match: "#",
	token: "number",
	state: "hex_color",
};

const CSS_VARIABLE = {
	match: "--",
	token: "css-variable",
	state: "css_custom_property",
};

// Common operators
const ATTRIBUTE_OPERATORS = {
	match: ["~=", "|=", "^=", "$=", "*=", "="],
	token: "operator",
};

const COMBINATORS = {
	match: [">", "+", "~"],
	token: "operator",
};

/**
 * @type {[string, string][]}
 */
const LETTER_RANGE = [
	["a", "z"],
	["A", "Z"],
];

/**
 * @type {[string, string][]}
 */
const ALPHANUMERIC_RANGE = [
	["a", "z"],
	["A", "Z"],
	["0", "9"],
];

/**
 * Simplified CSS Grammar - No nested block tracking
 * @type {import("@twinkleplop/core").Grammar}
 */
export default {
	name: "css",
	states: {
		// Top level - looking for selectors and at-rules
		main: {
			rules: [
				// Comments
				COMMENT,

				// Strings
				STRING_DOUBLE,
				STRING_SINGLE,

				// At-rules
				{
					match: "@",
					token: "keyword",
					state: "at_rule",
				},

				// Start of declaration block
				{
					match: "{",
					token: "punctuation",
					state: "declaration",
				},

				// Closing brace at top level (ignore)
				{
					match: "}",
					token: "punctuation",
				},

				// Other punctuation
				{
					match: [";", ")", "]", ","],
					token: "punctuation",
				},
				{
					match: "(",
					token: "punctuation",
					state: "parentheses",
				},
				{
					match: "[",
					token: "punctuation",
					state: "brackets",
				},

				// Selectors - IDs and classes
				ID_SELECTOR,
				CLASS_SELECTOR,

				// Pseudo-selectors and pseudo-elements
				PSEUDO_ELEMENT,
				PSEUDO_CLASS,

				// Attribute selector operators
				ATTRIBUTE_OPERATORS,

				// Combinators
				COMBINATORS,

				// Universal selector
				{
					match: "*",
					token: "selector",
				},

				// Numbers (for things like nth-child)
				{
					match: "-",
					state: "negative_number_or_identifier",
				},
				{
					range: ["0", "9"],
					token: "number",
					state: "number",
				},

				// Element selectors
				{
					range: LETTER_RANGE,
					token: "selector",
					state: "identifier",
				},
			],
		},

		// Inside a declaration block - properties and nested selectors
		declaration: {
			rules: [
				// Comments
				COMMENT,

				// End of block - go back to previous context
				{
					match: "}",
					token: "punctuation",
					exit: true,
				},

				// Another block opening (nested selectors)
				// Push another declaration state for the nested block
				{
					match: "{",
					token: "punctuation",
					state: "declaration",
				},

				// Semicolon ends a property declaration
				{
					match: ";",
					token: "punctuation",
				},

				// At-rules in declarations
				{
					match: "@",
					token: "keyword",
					state: "at_rule",
				},

				// Parent selector for nested CSS
				PARENT_SELECTOR,

				// Class selectors (could be nested selector)
				CLASS_SELECTOR,

				// ID selectors (could be nested selector)
				ID_SELECTOR,

				// Pseudo-selectors
				PSEUDO_ELEMENT,

				// CSS custom properties (variables)
				CSS_VARIABLE,

				// Colon could be property delimiter or pseudo-selector
				{
					match: ":",
					token: "punctuation",
					state: "value",
				},

				// Identifiers - could be properties or nested selectors
				// Use probe to disambiguate
				{
					match: "-",
					state: "probe_identifier",
				},
				{
					range: LETTER_RANGE,
					state: "probe_identifier",
				},
			],
		},

		// After a colon - we're in property value mode
		value: {
			rules: [
				// Comments
				COMMENT,

				// Strings
				STRING_DOUBLE,
				STRING_SINGLE,

				// End of declaration - semicolon or closing brace
				{
					match: ";",
					token: "punctuation",
					exit: true,
				},
				{
					match: "}",
					token: "punctuation",
					// Just exit from value state, let declaration handle the brace
					exit: true,
				},

				// Important flag
				{
					match: "!",
					token: "keyword",
					state: "important",
				},

				// Hex colors
				HEX_COLOR,

				// Functions (rgb, calc, var, etc)
				{
					match: "(",
					token: "punctuation",
					state: "function_args",
				},

				// CSS variables
				{
					match: "--",
					token: "css-variable",
					state: "css_custom_property",
				},

				// Numbers
				{
					match: "-",
					state: "negative_number",
				},
				{
					range: ["0", "9"],
					token: "number",
					state: "number",
				},
				{
					match: ".",
					token: "number",
					state: "decimal",
				},

				// Keywords (color names, inherit, auto, etc)
				{
					range: LETTER_RANGE,
					token: "keyword",
					state: "value_keyword",
				},

				// Operators
				{
					match: [",", "/", "+", "*"],
					token: "operator",
				},
			],
		},

		// Probe state to disambiguate property vs selector
		probe_identifier: {
			mode: "probe",
			fallback: "property",
			rules: [
				// If we see an opening brace, it's definitely a selector
				{
					match: "{",
					state: "selector",
				},
				// If we see closing brace or semicolon, it's a property
				{
					match: [";", "}"],
					state: "property",
				},
			],
		},

		// Nested selector continuation
		nested_selector: {
			rules: [
				// Continue with selector syntax
				PSEUDO_CLASS,
				PSEUDO_ELEMENT,
				CLASS_SELECTOR,
				ID_SELECTOR,
				{
					match: "[",
					token: "punctuation",
					state: "brackets",
				},
				// Opening brace - start declarations
				{
					match: "{",
					token: "punctuation",
					state: "declaration",
				},
				// Combinators
				COMBINATORS,
				// Exit on anything else
				{
					any: true,
					exit: true,
				},
			],
		},

		// At-rule handling
		at_rule: {
			rules: [
				{
					range: LETTER_RANGE,
					token: "keyword",
				},
				{
					match: "-",
					token: "keyword",
				},
				{
					match: "(",
					token: "punctuation",
					state: "media_params",
				},
				{
					match: "{",
					token: "punctuation",
					exit: true,
				},
				{
					match: ";",
					token: "punctuation",
					exit: true,
				},
			],
		},

		// Media query parameters
		media_params: {
			rules: [
				// Comments
				COMMENT,

				// Strings
				STRING_DOUBLE,
				STRING_SINGLE,

				{
					match: ")",
					token: "punctuation",
					exit: true,
				},
				{
					match: "(",
					token: "punctuation",
					state: "media_params",
				},

				// Punctuation and operators - BEFORE keywords
				{
					match: ":",
					token: "punctuation",
				},
				{
					match: ",",
					token: "punctuation",
				},
				{
					match: ";",
					token: "punctuation",
				},
				{
					match: "=",
					token: "operator",
				},
				{
					match: [">", "<"],
					token: "operator",
				},

				// Numbers - MUST be before keywords
				{
					range: ["0", "9"],
					token: "number",
					state: "number",
				},
				{
					match: ".",
					token: "number",
					state: "decimal",
				},

				// Keywords and properties
				{
					range: LETTER_RANGE,
					token: "keyword",
					state: "media_keyword",
				},
				{
					match: "-",
					token: "keyword",
					state: "media_keyword",
				},
			],
		},

		// Media keywords - consume only the keyword, not punctuation
		media_keyword: {
			rules: [
				// Exit immediately on punctuation or whitespace
				{
					match: [":", ",", ";", ")", " ", "\t", "\n", "\r"],
					exit: true,
				},
				{
					range: ALPHANUMERIC_RANGE,
					token: "keyword",
				},
				{
					match: ["-", "_"],
					token: "keyword",
				},
				// Exit on anything else
				{
					any: true,
					exit: true,
				},
			],
		},

		// Property state (after probe determines it's a property)
		property: {
			rules: [
				{
					range: ALPHANUMERIC_RANGE,
					token: "property",
				},
				{
					match: ["-", "_"],
					token: "property",
				},
				{
					match: ":",
					token: "punctuation",
					state: "value",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		// Selector state (after probe determines it's a selector)
		selector: {
			rules: [
				{
					range: ALPHANUMERIC_RANGE,
					token: "selector",
				},
				{
					match: ["-", "_"],
					token: "selector",
				},
				{
					match: "{",
					token: "punctuation",
					state: "declaration",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		// ID selector
		id_selector: {
			rules: [
				{
					range: ALPHANUMERIC_RANGE,
					token: "id",
				},
				{
					match: ["-", "_"],
					token: "id",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		// Class selector
		class_selector: {
			rules: [
				{
					range: ALPHANUMERIC_RANGE,
					token: "class-name",
				},
				{
					match: ["-", "_"],
					token: "class-name",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		// Pseudo-class/element
		pseudo: {
			rules: [
				{
					range: LETTER_RANGE,
					token: "pseudo-selector",
				},
				{
					match: "-",
					token: "pseudo-selector",
				},
				{
					match: "(",
					token: "punctuation",
					state: "parentheses",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		pseudo_class: {
			rules: [
				{
					range: LETTER_RANGE,
					token: "pseudo-selector",
				},
				{
					match: "-",
					token: "pseudo-selector",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		// Parentheses content
		parentheses: {
			rules: [
				{
					match: ")",
					token: "punctuation",
					exit: true,
				},
				{
					match: "(",
					token: "punctuation",
					state: "parentheses",
				},
				{
					range: [0, 127],
					token: "keyword",
				},
			],
		},

		// Brackets (attribute selectors)
		brackets: {
			rules: [
				{
					match: "]",
					token: "punctuation",
					exit: true,
				},
				STRING_DOUBLE,
				STRING_SINGLE,
				ATTRIBUTE_OPERATORS,
				{
					range: ALPHANUMERIC_RANGE,
					token: "attribute",
				},
				{
					match: ["-", "_"],
					token: "attribute",
				},
			],
		},

		// Numbers
		number: {
			rules: [
				{
					range: ["0", "9"],
					token: "number",
				},
				{
					match: ".",
					token: "number",
					state: "decimal",
				},
				// Check for units
				{
					range: LETTER_RANGE,
					token: "unit",
					state: "unit",
				},
				{
					match: "%",
					token: "unit",
					exit: true,
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		decimal: {
			rules: [
				{
					range: ["0", "9"],
					token: "number",
				},
				// Check for units
				{
					range: LETTER_RANGE,
					token: "unit",
					state: "unit",
				},
				{
					match: "%",
					token: "unit",
					exit: true,
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		negative_number: {
			rules: [
				{
					range: ["0", "9"],
					token: "number",
					state: "number",
				},
				{
					match: ".",
					token: "number",
					state: "decimal",
				},
				// It's a keyword starting with dash
				{
					range: LETTER_RANGE,
					token: "keyword",
					state: "value_keyword",
				},
				{
					match: "-",
					token: "css-variable",
					state: "css_custom_property",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		unit: {
			rules: [
				{
					range: LETTER_RANGE,
					token: "unit",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		// Hex colors
		hex_color: {
			rules: [
				{
					range: [
						["0", "9"],
						["a", "f"],
						["A", "F"],
					],
					token: "number",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		// CSS custom properties
		css_custom_property: {
			rules: [
				{
					range: ALPHANUMERIC_RANGE,
					token: "css-variable",
				},
				{
					match: ["-", "_"],
					token: "css-variable",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		// Value keywords
		value_keyword: {
			rules: [
				{
					range: ALPHANUMERIC_RANGE,
					token: "keyword",
				},
				{
					match: ["-", "_"],
					token: "keyword",
				},
				{
					match: "(",
					token: "punctuation",
					state: "function_args",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		// Function arguments
		function_args: {
			rules: [
				{
					match: "/*",
					token: "comment",
					state: "comment",
				},
				STRING_DOUBLE,
				STRING_SINGLE,
				{
					match: ")",
					token: "punctuation",
					exit: true,
				},
				{
					match: "(",
					token: "punctuation",
					state: "function_args",
				},
				{
					match: "#",
					token: "number",
					state: "hex_color",
				},
				{
					range: ["0", "9"],
					token: "number",
					state: "number",
				},
				{
					match: ".",
					token: "keyword",
					state: "url_filename",
				},
				{
					range: LETTER_RANGE,
					token: "keyword",
					state: "keyword_in_function",
				},
				{
					match: [",", "/", "+", "*", "-"],
					token: "operator",
				},
			],
		},

		url_filename: {
			rules: [
				{
					range: ALPHANUMERIC_RANGE,
					token: "keyword",
				},
				{
					match: [".", "-", "_", "/", ":"],
					token: "keyword",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		keyword_in_function: {
			rules: [
				{
					range: ALPHANUMERIC_RANGE,
					token: "keyword",
				},
				{
					match: ["-", "_"],
					token: "keyword",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		// Important flag
		important: {
			rules: [
				{
					match: "important",
					token: "keyword",
					exit: true,
				},
			],
		},

		// General identifier state
		identifier: {
			rules: [
				{
					range: ALPHANUMERIC_RANGE,
					token: "selector",
				},
				{
					match: ["-", "_"],
					token: "selector",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		// Negative number or identifier starting with dash
		negative_number_or_identifier: {
			rules: [
				{
					range: ["0", "9"],
					token: "number",
					state: "number",
				},
				{
					range: LETTER_RANGE,
					token: "selector",
					state: "identifier",
				},
				{
					match: "-",
					token: "selector",
				},
				{
					any: true,
					exit: true,
				},
			],
		},
	},
};
