// CSS grammar — built with the @twinkleplop/core DSL helpers.
// Mirrors the original declarative grammar structure so tokenization output
// is identical; the refactor is purely surface-level (helpers + composition).

import {
	ALNUM,
	LETTER,
	HEX,
	DIGIT,
	enter,
	fallback,
	goto,
	leave,
	match,
	on,
	range,
	within,
} from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import  {define_grammar} from '@twinkleplop/core/compile'


// ---------------------------------------------------------------------------
// Shared rule fragments
// ---------------------------------------------------------------------------

const COMMENT = within("/*", "*/", TOKENS.comment);
const STRING_DOUBLE = within('"', '"', TOKENS.string, { escape: "\\" });
const STRING_SINGLE = within("'", "'", TOKENS.string, { escape: "\\" });

const ID_SELECTOR = match("#", TOKENS.selector_id, enter("id_selector"));
const CLASS_SELECTOR = match(".", TOKENS.selector_class, enter("class_selector"));
const PSEUDO_ELEMENT = match("::", TOKENS.selector_pseudo, enter("pseudo_class"));
const PSEUDO_CLASS = match(":", TOKENS.selector_pseudo, enter("pseudo"));
const PARENT_SELECTOR = match("&", TOKENS.selector, enter("nested_selector"));

const HEX_COLOR = match("#", TOKENS.number, enter("hex_color"));
const CSS_VARIABLE = match("--", TOKENS.css_variable, enter("css_custom_property"));

const ATTRIBUTE_OPERATORS = match(
	["~=", "|=", "^=", "$=", "*=", "="],
	TOKENS.operator,
);
const COMBINATORS = match([">", "+", "~"], TOKENS.operator);

/**
 * Simplified CSS Grammar — no nested block tracking.
 * @type {import("@twinkleplop/core").Grammar}
 */
export default define_grammar({
	name: "css",
	states: {
		// Top level — looking for selectors and at-rules
		main: {
			rules: [
				COMMENT,

				STRING_DOUBLE,
				STRING_SINGLE,

				// At-rules
				match("@", TOKENS.keyword, enter("at_rule")),

				// Start of declaration block
				match("{", TOKENS.punctuation, enter("declaration")),

				// Closing brace at top level (ignore)
				match("}", TOKENS.punctuation),

				// Other punctuation
				match([";", ")", "]", ","], TOKENS.punctuation),
				match("(", TOKENS.punctuation, enter("parentheses")),
				match("[", TOKENS.punctuation, enter("brackets")),

				// Selectors — IDs and classes
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
				match("*", TOKENS.selector),

				// Numbers (for things like nth-child)
				on("-", enter("negative_number_or_identifier")),
				match(DIGIT, TOKENS.number, enter("number")),

				// Element selectors
				match(LETTER, TOKENS.selector, enter("identifier")),
			],
		},

		// Inside a declaration block — properties and nested selectors
		declaration: {
			rules: [
				COMMENT,

				// End of block
				match("}", TOKENS.punctuation, leave()),

				// Another block opening (nested selectors): push another
				// declaration state for the nested block.
				match("{", TOKENS.punctuation, enter("declaration")),

				// Semicolon ends a property declaration
				match(";", TOKENS.punctuation),

				// At-rules in declarations
				match("@", TOKENS.keyword, enter("at_rule")),

				// Parent selector for nested CSS
				PARENT_SELECTOR,

				// Class / ID selectors (could be nested selector)
				CLASS_SELECTOR,
				ID_SELECTOR,

				// Pseudo-element
				PSEUDO_ELEMENT,

				// CSS custom properties (variables) — treated as properties
				// that go directly to value state.
				match("--", TOKENS.css_variable, enter("css_custom_property_declaration")),

				// Colon could be property delimiter or pseudo-selector
				match(":", TOKENS.punctuation, enter("value")),

				// Identifiers — could be properties or nested selectors.
				// Use probe state to disambiguate.
				on("-", enter("probe_identifier")),
				on(LETTER, enter("probe_identifier")),
			],
		},

		// After a colon — we're in property value mode
		value: {
			rules: [
				COMMENT,

				STRING_DOUBLE,
				STRING_SINGLE,

				// End of declaration — semicolon or closing brace
				match(";", TOKENS.punctuation, leave()),
				// Just exit from value state, let declaration handle the brace
				match("}", TOKENS.punctuation, leave()),

				// Important flag
				match("!", TOKENS.keyword, enter("important")),

				// Hex colors
				HEX_COLOR,

				// Functions (rgb, calc, var, etc)
				match("(", TOKENS.punctuation, enter("function_args")),

				// CSS variables
				CSS_VARIABLE,

				// Minus — could be negative number or operator
				match("-", TOKENS.operator, enter("after_minus")),
				match(DIGIT, TOKENS.number, enter("number")),
				match(".", TOKENS.number, enter("decimal")),

				// Keywords (color names, inherit, auto, etc)
				match(LETTER, TOKENS.keyword, enter("value_keyword")),

				// Operators
				match([",", "/", "+", "*"], TOKENS.operator),
			],
		},

		// Probe state to disambiguate property vs selector
		probe_identifier: {
			mode: "probe",
			fallback: "property",
			rules: [
				// Opening brace → definitely a selector
				on("{", enter("selector")),
				// Closing brace or semicolon → property
				on([";", "}"], enter("property")),
			],
		},

		// Nested selector continuation
		nested_selector: {
			rules: [
				PSEUDO_CLASS,
				PSEUDO_ELEMENT,
				CLASS_SELECTOR,
				ID_SELECTOR,
				match("[", TOKENS.punctuation, enter("brackets")),
				// Opening brace — start declarations
				match("{", TOKENS.punctuation, enter("declaration")),
				COMBINATORS,
				// Exit on anything else
				fallback(leave()),
			],
		},

		// At-rule handling
		at_rule: {
			rules: [
				STRING_DOUBLE,
				STRING_SINGLE,
				match(LETTER, TOKENS.keyword),
				match("-", TOKENS.keyword),
				match("(", TOKENS.punctuation, enter("media_params")),
				match("{", TOKENS.punctuation, leave()),
				match(";", TOKENS.punctuation, leave()),
			],
		},

		// Media query parameters
		media_params: {
			rules: [
				COMMENT,

				STRING_DOUBLE,
				STRING_SINGLE,

				match(")", TOKENS.punctuation, leave()),
				match("(", TOKENS.punctuation, enter("media_params")),

				// Punctuation and operators — BEFORE keywords
				match(":", TOKENS.punctuation),
				match(",", TOKENS.punctuation),
				match(";", TOKENS.punctuation),
				match("=", TOKENS.operator),
				match([">", "<"], TOKENS.operator),

				// Numbers — MUST be before keywords
				match(DIGIT, TOKENS.number, enter("number")),
				match(".", TOKENS.number, enter("decimal")),

				// Keywords and properties
				match(LETTER, TOKENS.keyword, enter("media_keyword")),
				match("-", TOKENS.keyword, enter("media_keyword")),
			],
		},

		// Media keywords — consume only the keyword, not punctuation
		media_keyword: {
			rules: [
				// Exit immediately on punctuation or whitespace
				on([":", ",", ";", ")", " ", "\t", "\n", "\r"], leave()),
				match(ALNUM, TOKENS.keyword),
				match(["-", "_"], TOKENS.keyword),
				// Exit on anything else
				fallback(leave()),
			],
		},

		// Property state (after probe determines it's a property)
		property: {
			rules: [
				match(ALNUM, TOKENS.property),
				match(["-", "_"], TOKENS.property),
				match(":", TOKENS.punctuation, enter("value")),
				fallback(leave()),
			],
		},

		// Selector state (after probe determines it's a selector)
		selector: {
			rules: [
				match(ALNUM, TOKENS.selector),
				match(["-", "_"], TOKENS.selector),
				// Handle pseudo-class
				match(":", TOKENS.selector_pseudo, enter("pseudo")),
				match("{", TOKENS.punctuation, enter("declaration")),
				fallback(leave()),
			],
		},

		// ID selector
		id_selector: {
			rules: [
				match(ALNUM, TOKENS.selector_id),
				match(["-", "_"], TOKENS.selector_id),
				fallback(leave()),
			],
		},

		// Class selector
		class_selector: {
			rules: [
				match(ALNUM, TOKENS.selector_class),
				match(["-", "_"], TOKENS.selector_class),
				fallback(leave()),
			],
		},

		// Pseudo-class / pseudo-element content
		pseudo: {
			rules: [
				match(LETTER, TOKENS.selector_pseudo),
				match("-", TOKENS.selector_pseudo),
				match("(", TOKENS.punctuation, enter("parentheses")),
				fallback(leave()),
			],
		},

		pseudo_class: {
			rules: [match(LETTER, TOKENS.selector_pseudo), match("-", TOKENS.selector_pseudo), fallback(leave())],
		},

		// Parentheses content
		parentheses: {
			rules: [
				match(")", TOKENS.punctuation, leave()),
				match("(", TOKENS.punctuation, enter("parentheses")),
				match(range([[0, 127]]), TOKENS.keyword),
			],
		},

		// Brackets (attribute selectors)
		brackets: {
			rules: [
				match("]", TOKENS.punctuation, leave()),
				STRING_DOUBLE,
				STRING_SINGLE,
				ATTRIBUTE_OPERATORS,
				match(ALNUM, TOKENS.attribute),
				match(["-", "_"], TOKENS.attribute),
			],
		},

		// Numbers
		number: {
			rules: [
				match(DIGIT, TOKENS.number),
				match(".", TOKENS.number, enter("decimal")),
				// Check for units
				match(LETTER, TOKENS.unit, enter("unit")),
				match("%", TOKENS.unit, leave()),
				fallback(leave()),
			],
		},

		decimal: {
			rules: [
				match(DIGIT, TOKENS.number),
				// Check for units
				match(LETTER, TOKENS.unit, enter("unit")),
				match("%", TOKENS.unit, leave()),
				fallback(leave()),
			],
		},

		// After minus in value context
		after_minus: {
			rules: [
				// Number follows minus
				match(DIGIT, TOKENS.number, enter("number")),
				// Decimal follows minus
				match(".", TOKENS.number, enter("decimal")),
				// Another dash — CSS variable
				match("-", TOKENS.css_variable, enter("css_custom_property")),
				// Letter — keyword starting with dash
				match(LETTER, TOKENS.keyword, enter("value_keyword")),
				// Anything else — just the minus operator
				fallback(leave()),
			],
		},

		unit: {
			rules: [match(LETTER, TOKENS.unit), fallback(leave())],
		},

		// Hex colors
		hex_color: {
			rules: [match(HEX, TOKENS.number), fallback(leave())],
		},

		// CSS custom properties
		css_custom_property: {
			rules: [
				match(ALNUM, TOKENS.css_variable),
				match(["-", "_"], TOKENS.css_variable),
				fallback(leave()),
			],
		},

		// CSS custom property in declaration context (expecting colon after)
		css_custom_property_declaration: {
			rules: [
				match(ALNUM, TOKENS.css_variable),
				match(["-", "_"], TOKENS.css_variable),
				match(":", TOKENS.punctuation, enter("value")),
				fallback(leave()),
			],
		},

		// Value keywords
		value_keyword: {
			rules: [
				match(ALNUM, TOKENS.keyword),
				match(["-", "_"], TOKENS.keyword),
				match("(", TOKENS.punctuation, enter("function_args")),
				fallback(leave()),
			],
		},

		// Function arguments
		function_args: {
			rules: [
				COMMENT,
				STRING_DOUBLE,
				STRING_SINGLE,
				match(")", TOKENS.punctuation, leave()),
				match("(", TOKENS.punctuation, enter("function_args")),
				match("#", TOKENS.number, enter("hex_color")),
				// CSS variables must come before single dash
				match("--", TOKENS.css_variable, enter("css_custom_property")),
				match(DIGIT, TOKENS.number, enter("number")),
				match(".", TOKENS.keyword, enter("url_filename")),
				match(LETTER, TOKENS.keyword, enter("keyword_in_function")),
				match([",", "/", "+", "*", "-"], TOKENS.operator),
			],
		},

		url_filename: {
			rules: [
				match(ALNUM, TOKENS.keyword),
				match([".", "-", "_", "/", ":"], TOKENS.keyword),
				fallback(leave()),
			],
		},

		keyword_in_function: {
			rules: [
				match(ALNUM, TOKENS.keyword),
				match(["-", "_"], TOKENS.keyword),
				fallback(leave()),
			],
		},

		// Important flag
		important: {
			rules: [match("important", TOKENS.keyword, leave())],
		},

		// General identifier state
		identifier: {
			rules: [
				match(ALNUM, TOKENS.selector),
				match(["-", "_"], TOKENS.selector),
				fallback(leave()),
			],
		},

		// Negative number or identifier starting with dash
		negative_number_or_identifier: {
			rules: [
				match(DIGIT, TOKENS.number, enter("number")),
				match(LETTER, TOKENS.selector, enter("identifier")),
				match("-", TOKENS.selector),
				fallback(leave()),
			],
		},
	},
});
