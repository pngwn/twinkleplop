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

const string = [
	{
		match_within: {
			start: '"',
			end: '"',
			escape: "\\",
		},
		token: "string",
	},
	{
		match_within: {
			start: "'",
			end: "'",
			escape: "\\",
		},
		token: "string",
	},
];

const comment = {
	match_within: {
		start: "/*",
		end: "*/",
	},
	token: "comment",
};

/**
 * @type {import("@twinkleplop/core").Grammar}
 */
export default {
	name: "css",
	states: {
		main: {
			rules: [
				comment,
				...string,

				// At-rules
				{
					match: "@",
					token: "keyword",
					state: "at_rule",
				},

				// Block entry
				{
					match: "{",
					token: "punctuation",
					state: "block",
				},

				// Other punctuation
				{
					match: [";", "}", ")", "]", ","],
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

		block: {
			rules: [
				comment,
				// Exit block
				{
					match: "}",
					token: "punctuation",
					exit: true,
				},

				{
					match: ")",
					token: "punctuation",
					exit: true,
				},

				// Nested blocks (for nested CSS)
				{
					match: "{",
					token: "punctuation",
					state: "block",
				},

				// Semicolon ends declaration
				{
					match: ";",
					token: "punctuation",
				},

				// At-rules in blocks
				{
					match: "@",
					token: "keyword",
					state: "at_rule",
				},

				// Parent selector
				// {
				// 	match: "&",
				// 	token: "selector",
				// 	state: "selector_continuation",
				// },

				// Class selectors (definitely selectors, not properties)
				{
					match: ".",
					token: "class-name",
					state: "class_selector",
				},

				// ID selectors (definitely selectors, not properties)
				{
					match: "#",
					token: "id",
					state: "id_selector",
				},

				// Pseudo-selectors - but be careful with single ":"
				// Single ":" could be pseudo-selector OR property delimiter
				// Only treat "::" as definitely pseudo-selector
				{
					match: "::",
					token: "pseudo-selector",
					state: "pseudo_class",
				},

				// For single ":", we need to be more careful
				// It could be :hover (selector) or the delimiter after a property
				// This is handled by property state exiting on ":"

				// CSS custom properties (variables) starting with --
				{
					match: "--",
					token: "css-variable",
					state: "css_custom_property",
				},

				// Element selectors and properties both start with letters
				// We need to probe ahead to determine if it's a property or selector
				// Probe mode will scan until we find:
				// - { means it's a selector (nested block)
				// - : means it's a property
				// - ; or } means it's a property
				{
					match: "-",
					state: "probe_identifier",
				},
				{
					match: ":",
					token: "pseudo-selector",
					state: "pseudo",
				},
				{
					match: "&",
					token: "selector",
					state: "block_selector",
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

		// Value context (after colon in declaration)
		value: {
			rules: [
				// Comments
				comment,

				// Strings
				...string,

				// End of declaration
				{
					match: ";",
					token: "punctuation",
					exit: true,
				},
				// Property ends with } (last property in block, no semicolon)
				// We need to consume it and signal block should exit
				// For now, just consume it and exit
				{
					match: "}",
					token: "punctuation",
					exit: true,
				},

				// Important flag
				{
					match: "!",
					token: "punctuation",
					state: "important",
				},

				// Functions
				{
					match: "(",
					token: "punctuation",
					state: "function_args",
				},

				// Hex colors
				{
					match: "#",
					token: "number",
					state: "hex_color",
				},

				// Numbers with units
				{
					match: "-",
					token: "number",
					state: "negative_number_in_value",
				},
				{
					range: ["0", "9"],
					token: "number",
					state: "number",
				},
				{
					match: ".",
					state: "decimal_part",
				},

				// Keywords and identifiers
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
					match: [",", "/"],
					token: "punctuation",
				},

				// Whitespace
				{
					match: [" ", "\t", "\n", "\r"],
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		// String states with escape sequences

		// At-rules
		at_rule: {
			rules: [
				// Punctuation first - these are single char and take priority
				{
					match: "(",
					state: "media_params",
					token: "punctuation",
				},
				// Strings (for @charset, @import, etc)
				...string,
				// url() function (for @import)
				{
					match: "url(",
					token: "function",
					state: "url_content",
				},
				// Other at-rule keywords - generic letters
				{
					range: [
						["a", "z"],
						["A", "Z"],
					],
					token: "keyword",
				},
				{
					match: "{",
					token: "punctuation",
					exit: true,
				},

				// Other punctuation that would end the at-rule name
				{
					match: [";", "}", ":", ","],
					exit: true,
				},
			],
		},

		url_content: {
			rules: [
				// Quoted URLs
				...string,
				// End of url()
				{
					match: ")",
					token: "punctuation",
					exit: true,
				},
			],
		},

		// Selectors
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
					range: [0, 127],
					exit: true,
				},
			],
		},

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
					range: [0, 127],
					exit: true,
				},
			],
		},

		// selector_continuation: {
		// 	rules: [
		// 		// Pseudo-selector
		// 		{
		// 			match: ":",
		// 			token: "pseudo-selector",
		// 			state: "pseudo",
		// 		},
		// 		// Any other character exits back to parent state
		// 		{
		// 			any: true,
		// 			exit: true,
		// 		},
		// 	],
		// },

		pseudo: {
			rules: [
				// Double colon for pseudo-elements
				{
					match: ":",
					token: "pseudo-selector",
				},
				// Pseudo-class characters
				{
					range: [
						["a", "z"],
						["A", "Z"],
						["0", "9"],
					],
					token: "pseudo-selector",
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
						["0", "9"],
					],
					token: "selector",
				},
				{
					match: "-",
					token: "selector",
				},
				{
					match: "(",
					token: "punctuation",
					state: "pseudo_function_args",
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		pseudo_function_args: {
			rules: [
				{
					match: ")",
					token: "punctuation",
					exit: true,
				},
				{
					range: [
						["0", "9"],
						["a", "z"],
						["A", "Z"],
					],
					token: "selector",
				},
				{
					match: ["+", "-", "n", " "],
					token: "selector",
				},
				{
					any: true,
					token: "selector",
				},
			],
		},

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
					match: "-",
					token: "css-variable",
				},
				{
					any: true,
					exit: true,
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
					state: "decimal_part",
				},
				// CSS units
				{
					match: CSS_UNITS,
					token: "unit",
					exit: true,
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		decimal_part: {
			rules: [
				{
					range: ["0", "9"],
					token: "number",
				},
				// CSS units
				{
					match: CSS_UNITS,
					token: "unit",
					exit: true,
				},
				{
					any: true,
					exit: true,
				},
			],
		},

		negative_number_or_identifier: {
			rules: [
				{
					range: ["0", "9"],
					state: "number",
				},
				{
					range: [
						["a", "z"],
						["A", "Z"],
					],
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

		negative_number_in_value: {
			rules: [
				{
					range: ["0", "9"],
					token: "number",
					state: "number",
				},
				{
					match: ".",
					token: "number",
					state: "decimal_part",
				},
				{
					range: [
						["a", "z"],
						["A", "Z"],
					],
					state: "value_keyword",
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
					range: [0, 127],
					exit: true,
				},
			],
		},

		// Identifiers
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
				// Handle pseudo-selectors
				{
					match: ":",
					token: "pseudo-selector",
					state: "pseudo",
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
				// If followed by '(', it's a function call
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
				// Comments
				comment,

				// Strings
				...string,

				// End of function
				{
					match: ")",
					token: "punctuation",
					exit: true,
				},

				// Nested functions
				{
					match: "(",
					token: "punctuation",
					state: "function_args",
				},

				// Hex colors
				{
					match: "#",
					token: "number",
					state: "hex_color",
				},

				// Numbers (but check if it's actually a negative number)
				// Removed - we'll handle minus as operator below
				{
					range: ["0", "9"],
					token: "number",
					state: "number",
				},

				// For URL content, dots are part of filenames
				// Don't treat them as decimal points
				// Instead, treat the whole thing as a keyword
				{
					match: ".",
					token: "keyword",
					state: "url_filename",
				},

				// Keywords
				{
					range: [
						["a", "z"],
						["A", "Z"],
					],
					token: "keyword",
					state: "keyword_in_function",
				},

				// Operators (including minus)
				{
					match: [",", "/", "+", "*", "-"],
					token: "operator",
				},
			],
		},

		url_filename: {
			rules: [
				// Continue consuming filename characters
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
				// End on anything else
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

		// Media query parameters
		media_params: {
			rules: [
				// Exit on closing paren
				{
					match: ")",
					token: "punctuation",
					exit: true,
				},
				// Nested parens
				{
					match: "(",
					token: "punctuation",
					state: "media_params",
				},
				// Colon for property:value in media queries
				{
					match: ":",
					token: "punctuation",
				},
				// Numbers
				{
					range: ["0", "9"],
					token: "number",
					state: "number",
				},
				// Keywords (min-width, max-width, etc)
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

				// Operators
				{
					match: [",", "and", "or", "not"],
					token: "operator",
				},
			],
		},

		// Parentheses context (for other uses)
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
					any: true,
					token: "selector",
				},
			],
		},

		// Brackets context (for attribute selectors)
		brackets: {
			rules: [
				{
					match: "]",
					token: "punctuation",
					exit: true,
				},
				...string,
				{
					match: ["=", "~=", "|=", "^=", "$=", "*="],
					token: "operator",
				},
				{
					any: true,
					token: "selector",
				},
			],
		},

		// Probe state to determine if identifier is selector or property
		probe_identifier: {
			fallback: "block_property",
			mode: "probe",
			rules: [
				// Found opening brace - it's definitely a selector
				{
					match: "{",
					state: "block_selector",
				},
				// NO RULE FOR COLON - it's ambiguous!
				// The probe will continue scanning past : to find { or ;
				// Found semicolon - it's definitely a property
				{
					match: ";",
					state: "block_property",
				},
				// Found closing brace - it's definitely a property
				{
					match: "}",
					state: "block_property",
				},
			],
		},

		// State to handle identifiers that turn out to be selectors in block context
		// This state is entered after probe determines we have a selector
		// It must process the same characters that triggered the probe
		block_selector: {
			rules: [
				// Comments
				comment,

				// Exit block
				{
					match: "}",
					token: "punctuation",
					exit: true,
				},

				// Nested block
				{
					match: "{",
					token: "punctuation",
					state: "block",
				},

				// Selectors - process them like in main
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
				{
					match: ":",
					token: "pseudo-selector",
					state: "pseudo",
				},
				{
					match: "&",
					token: "selector",
				},

				// Combinators
				{
					match: [">", "+", "~"],
					token: "operator",
				},

				// Element selectors - tokenize directly after probe determined it's a selector
				// We're here because probe found a selector pattern, so tokenize the identifier
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
			],
		},

		// State to handle properties in block context
		// This state is entered after probe determines we have a property
		// The property name has already been tokenized by the probe
		block_property: {
			rules: [
				// After property name, expect colon
				{
					match: ":",
					token: "punctuation",
					state: "value",
				},

				// Continue scanning property name if needed (including hyphens)
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

				// Exit on anything else
				{
					any: true,
					exit: true,
				},
			],
		},
	},
};
