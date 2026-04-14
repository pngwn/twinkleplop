// TypeScript experimental grammar. explores moving class-field / interface-
// member disambiguation out of the reclassifier pipeline and into grammar
// states.
//
// prerequisite refactor: `{` and `}` handling uses push/pop (enter/leave)
// instead of goto/stay, so the stack tracks brace depth. without this, a
// pushed class_body state gets stranded by the goto-heavy main grammar's
// identifier_probe / identifier / regex_allow chain.

import {
	ALNUM,
	LETTER,
	enter,
	fallback,
	goto,
	keyword,
	leave,
	match,
	on,
	to,
} from "@twinkleplop/core";

import { define_grammar } from "@twinkleplop/core/compile";
import * as TOKENS from "@twinkleplop/core/tokens";

import {
	BOOLEAN_LITERALS,
	IDENTIFIER_TERMINATORS,
	KEYWORDS,
	OP_ALL,
	PROBE_OPERATORS,
	REGEX_PRECEDING_KEYWORDS,
	SPECIAL_VALUES,
	TEMPLATE_LITERAL,
	js_body_common,
	js_common,
	js_comments,
	js_numbers_arg,
	js_strings,
	js_whitespace,
	raw_grammar as js_grammar,
	js_tmpl_common,
} from "@twinkleplop/javascript";

const TYPE = "type";
const DECORATOR = "decorator";

const TS_KEYWORDS = [
	"type",
	"interface",
	"enum",
	"namespace",
	"module",
	"declare",
	"abstract",
	"readonly",
	"public",
	"private",
	"protected",
	"override",
	"accessor",
	"as",
	"satisfies",
	"keyof",
	"infer",
	"is",
	"using",
	"implements",
];

const ALL_KEYWORDS = [...KEYWORDS, ...TS_KEYWORDS];

// class and interface route to dedicated header states instead of the generic
// `goto division` destination, so the stack gains a class_body / interface_body
// frame that survives through the body's contents.
const HEADER_PUSHING_KEYWORDS = ["class", "interface"];

const ALL_DIVISION_KEYWORDS = ALL_KEYWORDS.filter(
	(k) =>
		!REGEX_PRECEDING_KEYWORDS.includes(k) &&
		!HEADER_PUSHING_KEYWORDS.includes(k),
);

const BUILTIN_TYPES = [
	"number",
	"string",
	"boolean",
	"any",
	"never",
	"unknown",
	"object",
	"symbol",
	"bigint",
];

const ts_operators = (after: string | null) =>
	match(OP_ALL, TOKENS.operator, to(after));

const ts_keywords_literals = (
	regex_dest: string | null,
	div_dest: string | null,
) => [
	keyword(REGEX_PRECEDING_KEYWORDS, to(regex_dest)),
	keyword(ALL_DIVISION_KEYWORDS, to(div_dest)),
	keyword(["class"], enter("class_header")),
	keyword(["interface"], enter("interface_header")),
	keyword(BOOLEAN_LITERALS, to(div_dest), TOKENS.boolean),
	keyword(SPECIAL_VALUES, to(div_dest)),
	keyword(BUILTIN_TYPES, to(div_dest), TYPE),
];

// header absorbs identifiers via a sub-state so that class_header / interface_header
// themselves remain on the stack — the sub-state leaves back on any non-identifier
// char. this avoids the goto-heavy identifier_probe chain that would replace
// the header state and lose its position.
const header_ident_cont = {
	rules: [
		match(["_", "$", ALNUM], TOKENS.identifier),
		fallback(leave()),
	],
};

export default define_grammar({
	name: "typescript_experiment",

	states: {
		...js_grammar.states,

		// ---------------------------------------------------------------------
		// refactored: `{` pushes a new regex_allow frame, `}` pops. the stack
		// now tracks brace depth, so class_body / interface_body can live on
		// the stack through the body's contents.
		// ---------------------------------------------------------------------

		regex_allow: {
			rules: [
				...js_common,
				ts_operators(null),
				...ts_keywords_literals(null, "division"),

				match("@", DECORATOR),

				match("/", TOKENS.regex, enter("regex_pattern")),

				match(["(", "["], TOKENS.punctuation),
				match("{", TOKENS.punctuation, enter("regex_allow")),
				match([")", "]"], TOKENS.punctuation, goto("division")),
				match("}", TOKENS.punctuation, leave()),
				match([";", ",", "."], TOKENS.punctuation),

				on(["_", "$", LETTER], goto("identifier_probe")),
			],
		},

		division: {
			rules: [
				...js_common,
				ts_operators("regex_allow"),
				...ts_keywords_literals("regex_allow", null),

				match("@", DECORATOR),

				match(["(", "["], TOKENS.punctuation, goto("regex_allow")),
				match("{", TOKENS.punctuation, enter("regex_allow")),
				match("/", TOKENS.operator, goto("regex_allow")),

				match([")", "]"], TOKENS.punctuation),
				match("}", TOKENS.punctuation, leave()),
				match([";", ","], TOKENS.punctuation, goto("regex_allow")),
				match(".", TOKENS.punctuation),

				on(["_", "$", LETTER], goto("identifier_probe")),
			],
		},

		identifier: {
			rules: [
				match(["_", "$", ALNUM], TOKENS.identifier),
				TEMPLATE_LITERAL,
				match(["(", "["], TOKENS.punctuation, goto("regex_allow")),
				match("{", TOKENS.punctuation, enter("regex_allow")),
				match([")", "]"], TOKENS.punctuation, goto("division")),
				match("}", TOKENS.punctuation, leave()),
				match([",", ";"], TOKENS.punctuation, goto("regex_allow")),
				match(".", TOKENS.punctuation, goto("division")),
				match([...OP_ALL, "/"], TOKENS.operator, goto("regex_allow")),
				on([" ", "\t", "\n", "\r"], goto("division")),
			],
		},

		function_body: {
			rules: [
				...js_body_common,

				match(")", TOKENS.punctuation, goto("division")),
				match("(", TOKENS.punctuation, enter("paren_group")),
				match(",", TOKENS.punctuation),

				match(["===", "!=="], TOKENS.operator),
				match(
					["--", "++", "<=", ">=", "==", "!=", "&&", "||"],
					TOKENS.operator,
				),
				match(
					["-", "+", "<", ">", "=", "!", "&", "|", "?", "*", "~", "^", "%"],
					TOKENS.operator,
				),
				match("/", TOKENS.regex, enter("regex_pattern")),

				match(["[", "]"], TOKENS.punctuation),
				match("{", TOKENS.punctuation, enter("regex_allow")),
				match("}", TOKENS.punctuation, leave()),
				match([";", "."], TOKENS.punctuation),

				match(BOOLEAN_LITERALS, TOKENS.boolean),

				on(["_", "$", LETTER], goto("identifier_probe")),
			],
		},

		paren_group: {
			rules: [
				...js_body_common,
				match(")", TOKENS.punctuation, leave()),
				match(",", TOKENS.punctuation),
				match(["[", "]", ";", "."], TOKENS.punctuation),
				match("{", TOKENS.punctuation, enter("regex_allow")),
				match("}", TOKENS.punctuation, leave()),
				match(["===", "!=="], TOKENS.operator),
				match(
					["--", "++", "<=", ">=", "==", "!=", "&&", "||"],
					TOKENS.operator,
				),
				match(
					["-", "+", "<", ">", "=", "!", "&", "|", "?", "*", "/", "~", "^", "%"],
					TOKENS.operator,
				),
				match(BOOLEAN_LITERALS, TOKENS.boolean),
				match(["_", "$", ALNUM], TOKENS.identifier),
				match("(", TOKENS.punctuation, enter("paren_group")),
			],
		},

		tmpl_regex_allow: {
			rules: [
				...js_tmpl_common,
				ts_operators(null),
				...ts_keywords_literals(null, "tmpl_division"),

				match("@", DECORATOR),

				match("}", TOKENS.punctuation, leave()),
				match("/", TOKENS.regex, enter("regex_pattern")),
				match("{", TOKENS.punctuation, enter("tmpl_regex_allow")),
				match(["(", "["], TOKENS.punctuation),
				match([")", "]"], TOKENS.punctuation, goto("tmpl_division")),
				match([";", ",", "."], TOKENS.punctuation),

				on(["_", "$", LETTER], goto("identifier_probe_tmpl")),
			],
		},

		tmpl_division: {
			rules: [
				...js_tmpl_common,
				ts_operators("tmpl_regex_allow"),
				...ts_keywords_literals("tmpl_regex_allow", null),

				match("@", DECORATOR),

				match("}", TOKENS.punctuation, leave()),
				match("{", TOKENS.punctuation, enter("tmpl_regex_allow")),
				match(["(", "["], TOKENS.punctuation, goto("tmpl_regex_allow")),
				match("/", TOKENS.operator, goto("tmpl_regex_allow")),
				match([")", "]"], TOKENS.punctuation),
				match([";", ","], TOKENS.punctuation, goto("tmpl_regex_allow")),
				match(".", TOKENS.punctuation),

				on(["_", "$", LETTER], goto("identifier_probe_tmpl")),
			],
		},

		// ---------------------------------------------------------------------
		// class_header — pushed by the `class` keyword. absorbs the header
		// (name, generics, extends, implements) without using goto (which
		// would replace class_header and lose its stack frame). on `{`,
		// transitions sideways to class_body.
		// ---------------------------------------------------------------------

		class_header: {
			rules: [
				...js_whitespace,
				...js_comments,
				keyword([
					"extends",
					"implements",
					"keyof",
					"typeof",
					"infer",
					"readonly",
					"new",
				]),
				match(["_", "$", LETTER], TOKENS.identifier, enter("class_header_ident_cont")),
				match(OP_ALL, TOKENS.operator),
				match([",", ".", ";"], TOKENS.punctuation),
				match(["(", ")", "[", "]"], TOKENS.punctuation),
				match("{", "class_open", goto("class_body")),
			],
		},

		class_header_ident_cont: header_ident_cont,

		// ---------------------------------------------------------------------
		// class_body — the direct body of a class declaration. stage-2
		// behavior: same as regex_allow except `}` pops back to whatever
		// was beneath class_header (the state that emitted `class`). stage-4
		// will diverge member-level identifier-colon handling.
		// ---------------------------------------------------------------------

		class_body: {
			rules: [
				...js_common,
				ts_operators(null),
				...ts_keywords_literals(null, "division"),

				match("@", DECORATOR),

				match("/", TOKENS.regex, enter("regex_pattern")),

				match(["(", "["], TOKENS.punctuation),
				match("{", TOKENS.punctuation, enter("regex_allow")),
				match([")", "]"], TOKENS.punctuation, goto("division")),
				match("}", "class_close", leave()),
				match([";", ",", "."], TOKENS.punctuation),

				on(["_", "$", LETTER], goto("identifier_probe")),
			],
		},

		// ---------------------------------------------------------------------
		// interface_header / interface_body — mirror of class_header / class_body
		// ---------------------------------------------------------------------

		interface_header: {
			rules: [
				...js_whitespace,
				...js_comments,
				keyword([
					"extends",
					"implements",
					"keyof",
					"typeof",
					"infer",
					"readonly",
				]),
				match(["_", "$", LETTER], TOKENS.identifier, enter("interface_header_ident_cont")),
				match(OP_ALL, TOKENS.operator),
				match([",", ".", ";"], TOKENS.punctuation),
				match(["(", ")", "[", "]"], TOKENS.punctuation),
				match("{", "interface_open", goto("interface_body")),
			],
		},

		interface_header_ident_cont: header_ident_cont,

		interface_body: {
			rules: [
				...js_common,
				ts_operators(null),
				...ts_keywords_literals(null, "division"),

				match("@", DECORATOR),

				match("/", TOKENS.regex, enter("regex_pattern")),

				match(["(", "["], TOKENS.punctuation),
				match("{", TOKENS.punctuation, enter("regex_allow")),
				match([")", "]"], TOKENS.punctuation, goto("division")),
				match("}", "interface_close", leave()),
				match([";", ",", "."], TOKENS.punctuation),

				on(["_", "$", LETTER], goto("identifier_probe")),
			],
		},
	},
});
