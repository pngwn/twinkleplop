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
				{
					match: "/*",
					token: "comment",
					state: "comment",
				},

				// Strings
				{
					match: '"',
					token: "string",
					state: "string_double",
				},
				{
					match: "'",
					token: "string",
					state: "string_single",
				},

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
				{
					match: "#",
					token: "id",
					state: "id_selector",
				},
				{
					match: ".",
					token: "class-name",
					state: "class_selector",
				},

				// Pseudo-selectors and pseudo-elements
				{
					match: "::",
					token: "pseudo-selector",
					state: "pseudo_class",
				},
				{
					match: ":",
					token: "pseudo-selector",
					state: "pseudo",
				},

				// Attribute selector operators
				{
					match: ["~=", "|=", "^=", "$=", "*=", "="],
					token: "operator",
				},

				// Combinators
				{
					match: [">", "+", "~"],
					token: "operator",
				},

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
					range: [
						["a", "z"],
						["A", "Z"],
					],
					token: "selector",
					state: "identifier",
				},
			],
		},

		// Inside a declaration block - properties and nested selectors
		declaration: {
			rules: [
				// Comments
				{
					match: "/*",
					token: "comment",
					state: "comment",
				},

				// End of block - go back to main
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
				{
					match: "&",
					token: "selector",
					state: "nested_selector",
				},

				// Class selectors (could be nested selector)
				{
					match: ".",
					token: "class-name",
					state: "class_selector",
				},

				// ID selectors (could be nested selector)
				{
					match: "#",
					token: "id",
					state: "id_selector",
				},

				// Pseudo-selectors
				{
					match: "::",
					token: "pseudo-selector",
					state: "pseudo_class",
				},

				// CSS custom properties (variables)
				{
					match: "--",
					token: "css-variable",
					state: "css_custom_property",
				},

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
					range: [
						["a", "z"],
						["A", "Z"],
					],
					state: "probe_identifier",
				},
			],
		},

		// After a colon - we're in property value mode
		value: {
			rules: [
				// Comments
				{
					match: "/*",
					token: "comment",
					state: "comment",
				},

				// Strings
				{
					match: '"',
					token: "string",
					state: "string_double",
				},
				{
					match: "'",
					token: "string",
					state: "string_single",
				},

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
				{
					match: "#",
					token: "number",
					state: "hex_color",
				},

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
					range: [
						["a", "z"],
						["A", "Z"],
					],
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
				{
					match: ":",
					token: "pseudo-selector",
					state: "pseudo",
				},
				{
					match: "::",
					token: "pseudo-selector",
					state: "pseudo_class",
				},
				{
					match: ".",
					token: "class-name",
					state: "class_selector",
				},
				{
					match: "#",
					token: "id",
					state: "id_selector",
				},
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
				{
					match: [">", "+", "~"],
					token: "operator",
				},
				// Exit on anything else
				{
					any: true,
					exit: true,
				},
			],
		},

		// Comments
		comment: {
			rules: [
				{
					match: "*/",
					token: "comment",
					exit: true,
				},
				{
					range: [0, 127],
					token: "comment",
				},
			],
		},

		// String states
		string_double: {
			rules: [
				{
					match: "\\",
					token: "string",
					state: "escape_sequence",
				},
				{
					match: '"',
					token: "string",
					exit: true,
				},
				{
					range: [0, 127],
					token: "string",
				},
			],
		},

		string_single: {
			rules: [
				{
					match: "\\",
					token: "string",
					state: "escape_sequence",
				},
				{
					match: "'",
					token: "string",
					exit: true,
				},
				{
					range: [0, 127],
					token: "string",
				},
			],
		},

		escape_sequence: {
			rules: [
				{
					range: [0, 127],
					token: "string",
					exit: true,
				},
			],
		},

		// At-rule handling
		at_rule: {
			rules: [
				{
					range: [
						["a", "z"],
						["A", "Z"],
					],
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
				{
					any: true,
					exit: true,
				},
			],
		},

		// Media query parameters
		media_params: {
			rules: [
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
				{
					match: ":",
					token: "punctuation",
				},
				{
					range: ["0", "9"],
					token: "number",
					state: "number",
				},
				{
					match: "-",
					token: "keyword",
				},
				{
					range: [
						["a", "z"],
						["A", "Z"],
					],
					token: "keyword",
				},
			],
		},

		// Property state (after probe determines it's a property)
		property: {
			rules: [
				{
					range: [
						["a", "z"],
						["A", "Z"],
						["0", "9"],
					],
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
					range: [
						["a", "z"],
						["A", "Z"],
						["0", "9"],
					],
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
					range: [
						["a", "z"],
						["A", "Z"],
						["0", "9"],
					],
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
					range: [
						["a", "z"],
						["A", "Z"],
						["0", "9"],
					],
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
					range: [
						["a", "z"],
						["A", "Z"],
					],
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
					range: [
						["a", "z"],
						["A", "Z"],
					],
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
				{
					match: '"',
					token: "string",
					state: "string_double",
				},
				{
					match: "'",
					token: "string",
					state: "string_single",
				},
				{
					match: ["~=", "|=", "^=", "$=", "*=", "="],
					token: "operator",
				},
				{
					range: [
						["a", "z"],
						["A", "Z"],
						["0", "9"],
					],
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
					range: [
						["a", "z"],
						["A", "Z"],
					],
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
					range: [
						["a", "z"],
						["A", "Z"],
					],
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
					range: [
						["a", "z"],
						["A", "Z"],
					],
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
					range: [
						["a", "z"],
						["A", "Z"],
					],
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
					range: [
						["a", "z"],
						["A", "Z"],
						["0", "9"],
					],
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
					range: [
						["a", "z"],
						["A", "Z"],
						["0", "9"],
					],
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
				{
					match: '"',
					token: "string",
					state: "string_double",
				},
				{
					match: "'",
					token: "string",
					state: "string_single",
				},
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
					range: [
						["a", "z"],
						["A", "Z"],
					],
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
					range: [
						["a", "z"],
						["A", "Z"],
						["0", "9"],
					],
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
					range: [
						["a", "z"],
						["A", "Z"],
						["0", "9"],
					],
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
					range: [
						["a", "z"],
						["A", "Z"],
						["0", "9"],
					],
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
					range: [
						["a", "z"],
						["A", "Z"],
					],
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