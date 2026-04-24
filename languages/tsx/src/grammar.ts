// TSX grammar — extends TypeScript with JSX syntax (element/fragment/
// attribute/children/expression-container forms) for .tsx files.
//
// Scope:
//   - Everything TypeScript supports (inherited — keywords, types,
//     decorators, generics, template literals, regex, etc.)
//   - JSX elements: `<Name attrs>...</Name>`, `<Name />`, member/namespace
//     tag names (`<Foo.Bar>`, `<svg:path>`), dashed attribute names
//     (`data-*`, `aria-*`).
//   - JSX fragments: `<>...</>`.
//   - JSX attribute values: double/single-quoted strings with html-entity
//     recognition, expression containers `{...}` (re-enter js mode with
//     brace-depth tracking), spread attributes `{...expr}`, nested elements
//     as values.
//   - JSX children: text runs, nested elements, nested fragments,
//     expression containers, html character references (`&amp;`, `&#10;`,
//     `&#x1F;`).
//
// Generic-arrow disambiguation (handled by the two-phase jsx probe):
//   - `<T,>(x) => x`              tokenized as ts (comma disambiguator)
//   - `<T extends X>(x) => x`     tokenized as ts (extends keyword)
//   - `<T, U>(x, y) => ...`       tokenized as ts (comma)
//   - `<T>(x) => x`               tokenized as jsx (no disambiguator — use
//                                 one of the workarounds above, as is
//                                 standard practice in .tsx code)
//
// Known limitations:
//   - The tsx-forbidden angle-bracket type assertion form `<T>value` is
//     tokenized as jsx (since there is no disambiguator after the name).
//     typescript marks this as an error at parse time; the highlighter
//     does not. authors should use `value as T`.
//   - `<` inside function call arguments (`foo(<div />)`) or grouped
//     expressions inside `foo(...)` (since those enter function_body /
//     paren_group, not regex_allow) is tokenized as the less-than
//     operator rather than a jsx opener. assigning the jsx to a local
//     variable (`const el = <div />; foo(el)`) is a reliable workaround.
//     jsx in arrow function bodies (`map(x => <div />)`) works because
//     `=>` transitions to regex_allow before the `<`.
//   - A tag literally named `<extends …>` is misclassified as a generic
//     because the `extends` keyword rule in the disambiguation probe
//     matches the tag name. vanishingly rare in real code.
//   - Html comments `<!-- ... -->` inside jsx are not recognized as
//     comments. use `{/* ... */}` inside an expression container instead.
//   - Jsx text `>` and `}` in children: the spec forbids these, our
//     tokenizer accepts them as text (lenient).
//   - Entity names inside `&...;` are not validated against the 252-name
//     html4 table — any letter/digit/# sequence between `&` and `;` is
//     emitted as an entity token.
//   - Uppercase vs lowercase tag names (intrinsic vs component) are NOT
//     distinguished by the grammar. both emit as `tag_name`. a future
//     reclassifier could promote leading-uppercase to `selector_class`.
//   - Like typescript, generic type parameters still lex as operators
//     (`<T>` inside a generic position is `<` op + `T` ident + `>` op),
//     not as a dedicated generic-parameter context.

import {
	ALNUM,
	DIGIT,
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
	KEYWORDS,
	MULTI_LINE_COMMENT,
	OP_ALL,
	REGEX_PRECEDING_KEYWORDS,
	SINGLE_LINE_COMMENT,
	SPECIAL_VALUES,
	js_common,
	js_tmpl_common,
} from "@twinkleplop/javascript";

import { raw_grammar as ts_grammar } from "@twinkleplop/typescript";

// ---------------------------------------------------------------------------
// custom token types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// typescript keyword sets (duplicated because the ts grammar doesn't export
// them; keeping them in sync is a low-risk chore since the tsx grammar is the
// direct superset of ts)
// ---------------------------------------------------------------------------

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
const ALL_DIVISION_KEYWORDS = ALL_KEYWORDS.filter(
	(k) => !REGEX_PRECEDING_KEYWORDS.includes(k),
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

// ---------------------------------------------------------------------------
// operator handling for tsx
//
// in tsx, bare `<` at expression start may open jsx. to let the jsx probe
// fire first we must take bare `<` out of the shared OP_ALL bucket AND also
// ensure compound operators that start with `<` (`<=`, `<<`, `<<=`) keep
// matching. the compound rule is listed BEFORE the probe so `<=` wins over
// `<` + probe. the `OP_ALL_NO_LT` list feeds the generic operator rule and
// drops both bare `<` and the compound `<`-starters (already handled).
// ---------------------------------------------------------------------------

const OP_LT_COMPOUND = ["<<=", "<<", "<="];
const OP_ALL_NO_LT = OP_ALL.filter(
	(o) => o !== "<" && !OP_LT_COMPOUND.includes(o),
);

const tsx_operators = (after: string | null) =>
	match(OP_ALL_NO_LT, TOKENS.operator, to(after));

const tsx_compound_lt = match(OP_LT_COMPOUND, TOKENS.operator);

const tsx_keywords_literals = (
	regex_dest: string | null,
	div_dest: string | null,
) => [
	keyword(REGEX_PRECEDING_KEYWORDS, to(regex_dest)),
	keyword(ALL_DIVISION_KEYWORDS, to(div_dest)),
	keyword(BOOLEAN_LITERALS, to(div_dest), TOKENS.boolean),
	keyword(SPECIAL_VALUES, to(div_dest)),
	keyword(BUILTIN_TYPES, to(div_dest), TOKENS.type),
];

// characters that, seen as the first char AFTER `<`, mean `<` is a less-than
// operator (not the start of jsx). the jsx probe rules are positive-match
// only, so anything not listed keeps scanning until a match — we must
// enumerate every non-jsx dispatch char explicitly.
const LT_NON_JSX_CHARS = [
	" ",
	"\t",
	"\n",
	"\r",
	"=",
	"<",
	"!",
	"&",
	"|",
	"?",
	"*",
	"+",
	"-",
	".",
	"%",
	"^",
	"~",
	"/",
	"(",
	")",
	"[",
	"]",
	"{",
	"}",
	";",
	",",
	":",
	'"',
	"'",
	"`",
	"@",
	"#",
	"\\",
];

// ---------------------------------------------------------------------------
// grammar
// ---------------------------------------------------------------------------

export default define_grammar({
	name: "tsx",

	states: {
		// inherit every ts / js state unchanged; override the expression-allow
		// states below so `<` at expression start routes through the jsx probe.
		...ts_grammar.states,

		// -------------------------------------------------------------------
		// regex_allow — initial state; `<` may open jsx here
		// -------------------------------------------------------------------
		regex_allow: {
			rules: [
				...js_common,

				// compound `<`-ops (`<=`, `<<`, `<<=`) must match BEFORE the `<`
				// probe so a two-char `<=` doesn't lex as `<` + probe-fallback.
				tsx_compound_lt,

				// jsx opener probe: bare `<` routes to jsx-or-lt decision.
				on("<", enter("jsx_or_lt_probe")),

				// remaining operators (bare `<` + compound-<s already removed).
				tsx_operators(null),
				...tsx_keywords_literals(null, "division"),

				match("@", TOKENS.decorator, enter("decorator")),
				match("/", TOKENS.regex, enter("regex_pattern")),

				match(["(", "{", "["], TOKENS.punctuation),
				match([")", "}", "]"], TOKENS.punctuation, goto("division")),
				match([";", ",", "."], TOKENS.punctuation),

				on(["_", "$", LETTER], goto("identifier_probe")),
			],
		},

		// -------------------------------------------------------------------
		// tmpl_regex_allow — inside `${...}` interpolations AND jsx `{...}`
		// expression containers. same jsx intercept as regex_allow.
		// -------------------------------------------------------------------
		tmpl_regex_allow: {
			rules: [
				...js_tmpl_common,

				tsx_compound_lt,
				on("<", enter("jsx_or_lt_probe")),

				tsx_operators(null),
				...tsx_keywords_literals(null, "tmpl_division"),

				match("@", TOKENS.decorator, enter("decorator")),
				match("}", TOKENS.punctuation, leave()),
				match("/", TOKENS.regex, enter("regex_pattern")),
				match("{", TOKENS.punctuation, enter("tmpl_regex_allow")),
				match(["(", "["], TOKENS.punctuation),
				match([")", "]"], TOKENS.punctuation, goto("tmpl_division")),
				match([";", ",", "."], TOKENS.punctuation),

				on(["_", "$", LETTER], goto("identifier_probe_tmpl")),
			],
		},

		// -------------------------------------------------------------------
		// jsx: `<` dispatch probe
		//
		// peeks one char past `<` and routes to the correct target state. all
		// targets use `enter()` so probe exit pushes probe_entry.state
		// (whatever expression-allow state triggered us) onto the stack — the
		// target can leave() back to it naturally. for a letter/underscore/$
		// first char we chain to a second probe that scans past the would-be
		// tag-name and checks the next non-name char to disambiguate jsx from
		// a ts generic type parameter list (`<T,>() => T` etc.).
		// -------------------------------------------------------------------
		jsx_or_lt_probe: {
			mode: "probe",
			fallback: "jsx_lt_emit",
			rules: [
				on(">", enter("jsx_fragment_start")),
				// chained probe: keep scanning past identifier chars, decide
				// once we hit a non-identifier char.
				on([LETTER, "_", "$"], enter("jsx_name_probe")),
				on([DIGIT, ...LT_NON_JSX_CHARS], enter("jsx_lt_emit")),
			],
		},

		// -------------------------------------------------------------------
		// jsx: second-phase probe — we've seen `<Name…` and need to decide
		// whether the `<` opens jsx or a typescript generic parameter list.
		//
		// heuristic: find the first terminator that disambiguates.
		//   `,`                → generic parameter list (single-parameter
		//                        trailing-comma form: `<T,>() => T` and
		//                        friends). emit `<` as less-than.
		//   `extends` keyword  → generic parameter constraint
		//                        (`<T extends X>(…) => …`). emit as lt.
		//   `>` / `/` / `=`    → jsx (tag closers / attribute initializer).
		//   `:` / `.`          → jsx (namespaced / member tag name).
		//   other operators, strings, braces, etc. → jsx.
		//
		// identifier-continuation chars (letters, digits, `_`, `$`, `-`) AND
		// whitespace are NOT listed as rules so the probe keeps advancing
		// past them automatically until a disambiguator fires.
		//
		// edge case accepted: a tag literally named `extends`
		// (`<extends attr="x" />`) is misclassified as a generic because the
		// keyword matches at the tag name position. this is vanishingly rare
		// and an intentional tradeoff for robust `<T extends X>` handling.
		// -------------------------------------------------------------------
		jsx_name_probe: {
			mode: "probe",
			fallback: "jsx_tag_start",
			rules: [
				on(",", enter("jsx_lt_emit")),
				keyword(["extends"], enter("jsx_lt_emit")),
				on(
					[">", "/", "=", "{", ":", ".", "(", ")", "[", "]", "}", ";"],
					enter("jsx_tag_start"),
				),
				on(
					['"', "'", "`", "!", "?", "|", "&", "*", "+", "%", "^", "~", "@", "#", "\\"],
					enter("jsx_tag_start"),
				),
			],
		},

		// emit `<` as less-than operator, pop back to whoever pushed us.
		jsx_lt_emit: {
			rules: [match("<", TOKENS.operator, leave())],
		},

		// emit `<` as tag-boundary and begin a jsx opening tag name.
		jsx_tag_start: {
			rules: [match("<", TOKENS.punctuation, goto("jsx_tag_name"))],
		},

		// emit `<>` as tag-boundary and begin a jsx fragment children region.
		jsx_fragment_start: {
			rules: [match("<>", TOKENS.punctuation, goto("jsx_children"))],
		},

		// -------------------------------------------------------------------
		// jsx: opening tag name (and member / namespace chain)
		// -------------------------------------------------------------------
		jsx_tag_name: {
			rules: [
				match([LETTER, DIGIT, "_", "$", "-"], TOKENS.tag_name),
				// `.` (member) and `:` (namespace) separators emit as punct so
				// `Foo.Bar` shows up as tag + punct + tag visually.
				match([".", ":"], TOKENS.punctuation),
				match("/>", TOKENS.punctuation, leave()),
				match(">", TOKENS.punctuation, goto("jsx_children")),
				on([" ", "\t", "\n", "\r"], goto("jsx_tag_attrs")),
			],
		},

		// -------------------------------------------------------------------
		// jsx: opening tag attributes region (after name + whitespace)
		// -------------------------------------------------------------------
		jsx_tag_attrs: {
			rules: [
				on([" ", "\t", "\n", "\r"]),
				SINGLE_LINE_COMMENT,
				MULTI_LINE_COMMENT,

				match("/>", TOKENS.punctuation, leave()),
				match(">", TOKENS.punctuation, goto("jsx_children")),

				// `=` begins an attribute value (string | { expr } | < elem).
				match("=", TOKENS.operator, enter("jsx_attr_value")),
				// `{` in attr context is a spread attribute `{...expr}` or a
				// shorthand expression — either way, content is a ts expression.
				// reuse tmpl_regex_allow for brace-depth tracking; `}` will
				// leave() back to us.
				match("{", TOKENS.punctuation, enter("tmpl_regex_allow")),

				match([LETTER, DIGIT, "_", "$", "-"], TOKENS.attr_name),
				match([":", "."], TOKENS.punctuation),
			],
		},

		// -------------------------------------------------------------------
		// jsx: after `=`, expecting a single value (string | { expr } | < elem)
		// -------------------------------------------------------------------
		jsx_attr_value: {
			rules: [
				on([" ", "\t", "\n", "\r"]),
				match('"', TOKENS.string, goto("jsx_attr_string_double")),
				match("'", TOKENS.string, goto("jsx_attr_string_single")),
				match("{", TOKENS.punctuation, goto("tmpl_regex_allow")),
				// direct nested element as attr value (spec-legal, style-discouraged)
				match("<", TOKENS.punctuation, goto("jsx_tag_name")),
				// unexpected char: hand back to jsx_tag_attrs without consuming.
				fallback(leave()),
			],
		},

		// -------------------------------------------------------------------
		// jsx: double-quoted attribute string with html-entity recognition
		// -------------------------------------------------------------------
		jsx_attr_string_double: {
			rules: [
				match('"', TOKENS.string, leave()),
				match("&", TOKENS.entity, enter("jsx_entity")),
				fallback({ token: TOKENS.string }),
			],
		},

		// -------------------------------------------------------------------
		// jsx: single-quoted attribute string with html-entity recognition
		// -------------------------------------------------------------------
		jsx_attr_string_single: {
			rules: [
				match("'", TOKENS.string, leave()),
				match("&", TOKENS.entity, enter("jsx_entity")),
				fallback({ token: TOKENS.string }),
			],
		},

		// -------------------------------------------------------------------
		// jsx: html character reference body (`&name;`, `&#123;`, `&#xFF;`)
		// -------------------------------------------------------------------
		jsx_entity: {
			rules: [
				match(";", TOKENS.entity, leave()),
				match([LETTER, DIGIT, "#"], TOKENS.entity),
				// malformed entity: pop without consuming so the outer state can
				// handle the offending char.
				fallback(leave()),
			],
		},

		// -------------------------------------------------------------------
		// jsx: children region (between opening `>` and closing `</…>`)
		// -------------------------------------------------------------------
		jsx_children: {
			rules: [
				match("&", TOKENS.entity, enter("jsx_entity")),
				match("{", TOKENS.punctuation, enter("tmpl_regex_allow")),

				// close variants: `</>` fragment-close wins over `</`; both
				// precede the open variants because first-match wins across
				// rules.
				match("</>", TOKENS.punctuation, leave()),
				match("</", TOKENS.punctuation, goto("jsx_close_name")),

				// nested element / fragment open — pushes a new children frame
				// that pops when that child's close fires.
				match("<>", TOKENS.punctuation, enter("jsx_children")),
				match("<", TOKENS.punctuation, enter("jsx_tag_name")),

				// jsx text content: no token, just consume.
				fallback({}),
			],
		},

		// -------------------------------------------------------------------
		// jsx: closing tag name (inside `</…>`)
		// -------------------------------------------------------------------
		jsx_close_name: {
			rules: [
				match([LETTER, DIGIT, "_", "$", "-"], TOKENS.tag_name),
				match([".", ":"], TOKENS.punctuation),
				on([" ", "\t", "\n", "\r"]),
				match(">", TOKENS.punctuation, leave()),
			],
		},
	},
});
