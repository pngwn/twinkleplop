// Python grammar for twinkleplop syntax highlighting.
//
// Scope:
//   - Python 3.12+ lexical grammar per the language reference (§2).
//   - All numeric forms: decimal / hex 0x / octal 0o / binary 0b ints with
//     underscores; floats with leading/trailing dot and exponents; imaginary
//     j/J suffix; pep 515 underscore digit separators.
//   - All 35 hard keywords; True/False emitted as `boolean`, None as `keyword`.
//   - Soft keywords (match, case, _, type) emit as `identifier` — context
//     promotion is a parser/reclassifier concern.
//   - Type heuristic: PascalCase identifiers (uppercase first letter) and the
//     hardcoded lowercase builtin types (int, str, list, dict, ...) emit as
//     `class_name`. This catches user-defined classes, exceptions, generics
//     (T, K, V), typing-module names (Optional, Union, List, ...), and pep
//     585 generic builtins. False positives are limited to identifiers that
//     violate PEP 8's class-naming convention.
//   - All string literals and all allowed prefix combinations per pep 701 + pep
//     750: plain / bytes / raw / u / f / t and combined (rb, br, rf, fr, rt,
//     tr). All 2-letter prefixes accept both orderings and every case mix.
//   - Single, double, triple-single, triple-double quoted strings. Newlines
//     preserved in triple-quoted.
//   - f-string / t-string replacement fields {expr [!conv] [:spec]} with brace
//     depth tracking, nested dicts/sets, arbitrary expression content,
//     reuse of the outer quote character (pep 701), and format specs with
//     embedded replacement fields.
//   - Operators with longest-match ordering (**=, //=, <<=, >>=, :=, ..., ->).
//   - Line comments (#). Line continuation backslash (handled as operator).
//   - Non-ASCII identifier characters (u+0080..u+ffff approximated).
//
// Known limitations:
//   - INDENT / DEDENT tokens are not synthesized. Indentation is colored as
//     plain whitespace. A parser-level feature we do not need for highlighting.
//   - `.5` style floats with leading dot are NOT recognized as numbers; `.`
//     is always tokenized as punctuation and the following digits as an
//     integer. `5.` (trailing dot) and `1.5` (interior dot) do work.
//     This is the pragmatic trade-off JS / Rust grammars also make.
//   - f-string debug specifier `=` is emitted as an operator, not a dedicated
//     token — distinguishing `f"{x=}"` from `f"{x==y}"` requires parser-level
//     context that the grammar does not carry. Themes that want debug
//     highlighting need a reclassifier.
//   - Soft keywords (match, case, _, type) tokenize as identifiers even when
//     used as keywords. The spec is explicit that this distinction is made at
//     the parser level; we follow suit.
//   - self, cls, and the __builtins__ set are plain identifiers. A
//     reclassifier can promote these if a theme wants them styled.
//   - Unicode identifier normalization (nfkc) is NOT applied. The tokenizer
//     accepts any non-ASCII codepoint in u+0080..u+ffff as an identifier
//     character, which over-accepts per pep 3131 but matches what tree-sitter
//     and pygments do in practice. Astral-plane codepoints (u+10000+) do not
//     tokenize as identifier characters.
//   - Encoding declarations (# -*- coding: ... -*-) tokenize as plain
//     comments — a reclassifier can sub-tokenize them if desired.
//   - `\N{name}` and other string escapes are not sub-tokenized as distinct
//     escape tokens; the whole string including escapes is one `string`
//     token. Adding escape granularity is a reclassifier or grammar extension.
//   - Bytes literals are emitted as `string`. Distinguishing bytes content
//     requires a reclassifier (the prefix letters are visible in the source).
//   - Format spec content inside f-string replacement fields (`>10`, `.3f`,
//     `*^20`, ...) emits as the custom `format` token, NOT `string`. Themes
//     that don't recognize `format` will fall back to default styling.
//   - Unrecognized escape sequences (\z, \q) are not flagged as invalid; the
//     grammar emits them as part of the string. The 3.12 SyntaxWarning is a
//     runtime concern.

import {
	ALNUM,
	DIGIT,
	HEX,
	LETTER,
	LOWER,
	UPPER,
	enter,
	fallback,
	goto,
	keyword,
	leave,
	match,
	on,
	range,
	within,
} from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

// ---------------------------------------------------------------------------
// case-variant helper
//
// python string prefixes are case-insensitive. `rb` accepts rb, rB, Rb, RB.
// this helper enumerates every case variant so we can pass them to match().
// ---------------------------------------------------------------------------

function case_variants(s: string): string[] {
	if (s === "") return [""];
	const tail = case_variants(s.slice(1));
	const lo = s[0].toLowerCase();
	const up = s[0].toUpperCase();
	if (lo === up) return tail.map((t) => lo + t);
	return [...tail.map((t) => lo + t), ...tail.map((t) => up + t)];
}

function prefixes_from(stems: string[]): string[] {
	const out: string[] = [];
	for (const stem of stems) out.push(...case_variants(stem));
	return out;
}

// ---------------------------------------------------------------------------
// prefix sets
// ---------------------------------------------------------------------------

// non-f, non-t string prefixes: "" (bare), r, b, u, rb, br.
const PLAIN_PREFIXES: string[] = [
	"",
	...prefixes_from(["r", "b", "u", "rb", "br"]),
];

// f-string prefixes (also covers t-string — same lexical structure).
const FT_PREFIXES: string[] = prefixes_from([
	"f",
	"rf",
	"fr",
	"t",
	"rt",
	"tr",
]);

// build { prefix + quote } lists for each (string class × quote style).
const with_quote = (prefixes: string[], quote: string): string[] =>
	prefixes.map((p) => p + quote);

// entry patterns: longer (triple) before shorter (single) when in the same
// rule, but the compiler already handles that via descending-length sort.
// we still split them into separate rules because the transition target
// differs.
const PLAIN_TRIPLE_DQ_STARTS = with_quote(PLAIN_PREFIXES, '"""');
const PLAIN_TRIPLE_SQ_STARTS = with_quote(PLAIN_PREFIXES, "'''");
const PLAIN_SINGLE_DQ_STARTS = with_quote(PLAIN_PREFIXES, '"');
const PLAIN_SINGLE_SQ_STARTS = with_quote(PLAIN_PREFIXES, "'");

const FT_TRIPLE_DQ_STARTS = with_quote(FT_PREFIXES, '"""');
const FT_TRIPLE_SQ_STARTS = with_quote(FT_PREFIXES, "'''");
const FT_SINGLE_DQ_STARTS = with_quote(FT_PREFIXES, '"');
const FT_SINGLE_SQ_STARTS = with_quote(FT_PREFIXES, "'");

// ---------------------------------------------------------------------------
// keyword lists
// ---------------------------------------------------------------------------

// hard keywords from §2.3.1, minus True/False/None which are styled as
// boolean / keyword separately.
const KEYWORDS = [
	"and",
	"as",
	"assert",
	"async",
	"await",
	"break",
	"class",
	"continue",
	"def",
	"del",
	"elif",
	"else",
	"except",
	"finally",
	"for",
	"from",
	"global",
	"if",
	"import",
	"in",
	"is",
	"lambda",
	"nonlocal",
	"not",
	"or",
	"pass",
	"raise",
	"return",
	"try",
	"while",
	"with",
	"yield",
];

const BOOLEAN_LITERALS = ["True", "False"];
const NONE_LITERAL = ["None"];

// lowercase builtin types — pep 8 / pep 585 puts these in type-annotation
// positions (`x: list[int]`, `def f() -> dict: ...`) but they look like plain
// identifiers lexically. listed here so they highlight as `class_name`,
// matching the user-defined PascalCase class rule below.
const BUILTIN_TYPES = [
	"int",
	"float",
	"complex",
	"bool",
	"str",
	"bytes",
	"bytearray",
	"memoryview",
	"list",
	"tuple",
	"dict",
	"set",
	"frozenset",
	"object",
	"range",
	"slice",
	"type",
];

// ---------------------------------------------------------------------------
// operator list (sorted by descending length for longest-match)
// ---------------------------------------------------------------------------

const OP_3CHAR = ["**=", "//=", "<<=", ">>=", "..."];
const OP_2CHAR = [
	"**",
	"//",
	"<<",
	">>",
	"<=",
	">=",
	"==",
	"!=",
	"+=",
	"-=",
	"*=",
	"/=",
	"%=",
	"&=",
	"|=",
	"^=",
	"@=",
	":=",
	"->",
];
const OP_1CHAR = [
	"+",
	"-",
	"*",
	"/",
	"%",
	"&",
	"|",
	"^",
	"~",
	"<",
	">",
	"=",
	"@",
];

// operators that include `.` — NOT in this list because `.` has special
// handling (attribute access / member). `!` is also excluded from 1-char ops
// because `!` is not a standalone operator in Python (only `!=` is valid).
const OP_ALL = [...OP_3CHAR, ...OP_2CHAR, ...OP_1CHAR];

// punctuation set — brackets, commas, semicolons, colons, dots.
// `:` and `{` / `}` need per-state handling inside f-string expressions,
// so we list them separately where relevant.
const PAREN_OPEN = ["(", "[", "{"];
const PAREN_CLOSE = [")", "]", "}"];

// non-ASCII codepoint range for identifier chars. approximation: accept
// any BMP codepoint >= 0x80. astral-plane chars are not handled.
const NON_ASCII = range([[0x80, 0xffff]]);

// custom token for f-string format spec content (`>10`, `.3f`, `x<*^20`, ...).
// not the same as `string` because it is a mini-language inside the
// replacement field rather than literal text.
const FORMAT_SPEC = "format";

// ---------------------------------------------------------------------------
// shared rule fragments
// ---------------------------------------------------------------------------

const WS = on([" ", "\t", "\n", "\r", "\f"]);
const LINE_COMMENT = within("#", "\n", TOKENS.comment);
const BACKSLASH_CONTINUATION = match("\\", TOKENS.operator);

// entry rules for all string / f-string / t-string prefix combinations.
// triple-quote prefixes must come before single-quote prefixes within each
// class so `r"""..."""` is not mis-matched as `r"` + content + `"""`.
const string_entries = [
	// f / t strings — checked first so `f"..."` does not become identifier `f`
	// followed by a plain string.
	match(FT_TRIPLE_DQ_STARTS, TOKENS.string, enter("fstring_body_triple_dq")),
	match(FT_TRIPLE_SQ_STARTS, TOKENS.string, enter("fstring_body_triple_sq")),
	match(FT_SINGLE_DQ_STARTS, TOKENS.string, enter("fstring_body_single_dq")),
	match(FT_SINGLE_SQ_STARTS, TOKENS.string, enter("fstring_body_single_sq")),
	// non-f string prefixes — r, b, u, rb, br, and bare.
	match(PLAIN_TRIPLE_DQ_STARTS, TOKENS.string, enter("string_triple_dq")),
	match(PLAIN_TRIPLE_SQ_STARTS, TOKENS.string, enter("string_triple_sq")),
	match(PLAIN_SINGLE_DQ_STARTS, TOKENS.string, enter("string_single_dq")),
	match(PLAIN_SINGLE_SQ_STARTS, TOKENS.string, enter("string_single_sq")),
];

// number entry rules. consumes the prefix / first digit, pushes the right
// continuation state.
const number_entries = [
	match(["0x", "0X"], TOKENS.number, enter("hex_number")),
	match(["0b", "0B"], TOKENS.number, enter("bin_number")),
	match(["0o", "0O"], TOKENS.number, enter("oct_number")),
	match(DIGIT, TOKENS.number, enter("number")),
];

// keyword / literal rules — word-boundary aware via keyword().
// builtin types come BEFORE the regular keywords so e.g. `int` resolves to
// `class_name` (matching the convention that uppercase-start identifiers also
// resolve to `class_name`); ordering relative to other keyword rules does not
// matter since the sets are disjoint, but keeping types first makes the intent
// clear.
const keyword_entries = [
	keyword(BUILTIN_TYPES, {}, TOKENS.class_name),
	keyword(BOOLEAN_LITERALS, {}, TOKENS.boolean),
	keyword(NONE_LITERAL),
	keyword(KEYWORDS),
];

// identifier entry — split by case so PascalCase identifiers (per pep 8 the
// convention for class / type names) emit as `class_name` and everything else
// as `identifier`. user-defined types, generics (T, K, V), and typing-module
// names like `Optional` / `Union` all get caught by the uppercase rule;
// lowercase builtins (`int`, `str`, `list`, ...) are handled by the keyword
// rule above.
const uppercase_identifier_entry = match(
	UPPER,
	TOKENS.class_name,
	enter("type_identifier_body"),
);
const identifier_entry = match(
	["_", LOWER, NON_ASCII],
	TOKENS.identifier,
	enter("identifier_body"),
);

// ---------------------------------------------------------------------------
// grammar
// ---------------------------------------------------------------------------

export default define_grammar({
	name: "python",

	states: {
		// =================================================================
		// main — top-level expression / statement context.
		// =================================================================
		main: {
			rules: [
				WS,
				LINE_COMMENT,

				// strings come before identifiers so `f"..."` / `r"..."` etc.
				// are recognized as strings, not identifier + string.
				...string_entries,

				// numbers come before identifiers so `0x` etc. are recognized
				// as number prefixes, not identifier starts.
				...number_entries,

				// keywords before identifiers; keyword() adds word-boundary.
				...keyword_entries,

				// operators before `.` punctuation so `->` / `**=` / `:=` win.
				match(OP_ALL, TOKENS.operator),

				// backslash line continuation.
				BACKSLASH_CONTINUATION,

				// punctuation. `.` is here as a simple attribute-access
				// token — we do NOT support .5 leading-dot floats (see
				// known limitations).
				match(["(", ")", "[", "]", "{", "}", ",", ";", ":", "."], TOKENS.punctuation),

				// identifier starts last. uppercase first → `class_name`
				// (PascalCase = type per PEP 8 convention); other starts →
				// `identifier`.
				uppercase_identifier_entry,
				identifier_entry,
			],
		},

		// =================================================================
		// identifier_body — continuation of an identifier.
		// =================================================================
		identifier_body: {
			rules: [
				match(["_", ALNUM, NON_ASCII], TOKENS.identifier),
				fallback(leave()),
			],
		},

		// =================================================================
		// type_identifier_body — continuation of a PascalCase identifier
		// (treated as a class / type name). emits `class_name` for the
		// continuation chars so the entire identifier coalesces into one
		// class_name token.
		// =================================================================
		type_identifier_body: {
			rules: [
				match(["_", ALNUM, NON_ASCII], TOKENS.class_name),
				fallback(leave()),
			],
		},

		// =================================================================
		// number states — integer / float / hex / oct / bin continuations.
		//
		// each sub-state uses fallback(leave()) so that on a non-numeric
		// terminator, control pops back to whoever called the entry rule
		// — main for top-level numbers, fstring_expr_top / nested for
		// numbers inside f-string replacement fields. this is the rust /
		// javascript-arg pattern; the json pattern of fallback(goto("main"))
		// would skip past the f-string body / expression frames and break
		// state nesting (numbers inside `f"{5}"` would close the f-string).
		//
		// when number → float_decimal → float_exponent_sign nests via
		// enter(), a single non-numeric char triggers chained
		// fallback(leave()) calls (each fallback is no-consume), unwinding
		// the chain one frame at a time without consuming the terminator.
		// =================================================================
		number: {
			rules: [
				match(["_", DIGIT], TOKENS.number),
				match(".", TOKENS.number, enter("float_decimal")),
				match(["e", "E"], TOKENS.number, enter("float_exponent_sign")),
				match(["j", "J"], TOKENS.number, leave()),
				fallback(leave()),
			],
		},

		float_decimal: {
			rules: [
				match(["_", DIGIT], TOKENS.number),
				match(["e", "E"], TOKENS.number, enter("float_exponent_sign")),
				match(["j", "J"], TOKENS.number, leave()),
				fallback(leave()),
			],
		},

		float_exponent_sign: {
			rules: [
				match(["+", "-"], TOKENS.number, enter("float_exponent_digits")),
				match(DIGIT, TOKENS.number, enter("float_exponent_digits")),
				fallback(leave()),
			],
		},

		float_exponent_digits: {
			rules: [
				match(["_", DIGIT], TOKENS.number),
				match(["j", "J"], TOKENS.number, leave()),
				fallback(leave()),
			],
		},

		hex_number: {
			rules: [
				match(["_", HEX], TOKENS.number),
				fallback(leave()),
			],
		},

		bin_number: {
			rules: [
				match(["_", "0", "1"], TOKENS.number),
				fallback(leave()),
			],
		},

		oct_number: {
			rules: [
				match(["_", range([["0", "7"]])], TOKENS.number),
				fallback(leave()),
			],
		},

		// =================================================================
		// plain string body states.
		//
		// all prefix combos (bare, u, r, b, rb, br) share the same 4
		// content states — one per quote style. raw strings still use
		// escape handling because the lexer needs `\"` / `\'` to not
		// terminate the string (even though semantically the backslash
		// stays in the content). this matches cpython's lexer behavior.
		// =================================================================
		string_single_dq: {
			rules: [
				match("\\", TOKENS.string, enter("string_escape")),
				match('"', TOKENS.string, leave()),
				fallback({ token: TOKENS.string }),
			],
		},

		string_single_sq: {
			rules: [
				match("\\", TOKENS.string, enter("string_escape")),
				match("'", TOKENS.string, leave()),
				fallback({ token: TOKENS.string }),
			],
		},

		string_triple_dq: {
			rules: [
				match("\\", TOKENS.string, enter("string_escape")),
				match('"""', TOKENS.string, leave()),
				fallback({ token: TOKENS.string }),
			],
		},

		string_triple_sq: {
			rules: [
				match("\\", TOKENS.string, enter("string_escape")),
				match("'''", TOKENS.string, leave()),
				fallback({ token: TOKENS.string }),
			],
		},

		// generic one-character consumer for string escapes. emits the
		// escaped character as part of the string token then pops back
		// to the parent string body state.
		string_escape: {
			rules: [fallback({ token: TOKENS.string, exit: true })],
		},

		// =================================================================
		// f-string / t-string body states.
		//
		// body sees literal chars, {{ / }} escaped braces, { → push
		// fstring_expr_top (replacement field), \ → escape, closing
		// quote → leave.
		// =================================================================
		fstring_body_single_dq: {
			rules: [
				match("\\", TOKENS.string, enter("string_escape")),
				match("{{", TOKENS.string),
				match("}}", TOKENS.string),
				match("{", TOKENS.punctuation, enter("fstring_expr_top")),
				match('"', TOKENS.string, leave()),
				fallback({ token: TOKENS.string }),
			],
		},

		fstring_body_single_sq: {
			rules: [
				match("\\", TOKENS.string, enter("string_escape")),
				match("{{", TOKENS.string),
				match("}}", TOKENS.string),
				match("{", TOKENS.punctuation, enter("fstring_expr_top")),
				match("'", TOKENS.string, leave()),
				fallback({ token: TOKENS.string }),
			],
		},

		fstring_body_triple_dq: {
			rules: [
				match("\\", TOKENS.string, enter("string_escape")),
				match("{{", TOKENS.string),
				match("}}", TOKENS.string),
				match("{", TOKENS.punctuation, enter("fstring_expr_top")),
				match('"""', TOKENS.string, leave()),
				fallback({ token: TOKENS.string }),
			],
		},

		fstring_body_triple_sq: {
			rules: [
				match("\\", TOKENS.string, enter("string_escape")),
				match("{{", TOKENS.string),
				match("}}", TOKENS.string),
				match("{", TOKENS.punctuation, enter("fstring_expr_top")),
				match("'''", TOKENS.string, leave()),
				fallback({ token: TOKENS.string }),
			],
		},

		// =================================================================
		// fstring_expr_top — top-level replacement field.
		//
		// entered from an fstring_body on `{`. the parent on the stack is
		// the fstring_body state, so `}` (leave) pops back to the string
		// body. rules special to the top level:
		//   - `:` → goto fstring_format_spec (format spec begins)
		//   - `!s|!r|!a` → conversion marker, stays
		//   - `}` → leave (close replacement field)
		// =================================================================
		fstring_expr_top: {
			rules: [
				WS,
				LINE_COMMENT,
				...string_entries,
				...number_entries,

				// conversion specifiers MUST come before operators so `!r`
				// is not parsed as `!` + `r`.
				match(["!s", "!r", "!a"], TOKENS.punctuation),

				// operators including `:=` and `==` (sorted longest-first).
				match(OP_ALL, TOKENS.operator),
				BACKSLASH_CONTINUATION,

				// `}` closes the replacement field.
				match("}", TOKENS.punctuation, leave()),
				// `:` enters format spec mode.
				match(":", TOKENS.punctuation, goto("fstring_format_spec")),
				// `{` nested inside expression → dict/set literal.
				match("{", TOKENS.punctuation, enter("fstring_expr_nested")),
				// `(` `[` nested groups.
				match(["(", "["], TOKENS.punctuation, enter("fstring_expr_nested")),
				// unmatched `)` `]` treated as close of a nested scope we
				// did not open (malformed); leave to recover.
				match([")", "]"], TOKENS.punctuation, leave()),
				// `,` `;` `.` stay in state.
				match([",", ";", "."], TOKENS.punctuation),

				...keyword_entries,
				uppercase_identifier_entry,
				identifier_entry,
			],
		},

		// =================================================================
		// fstring_expr_nested — inside a nested (, [, or { within an
		// f-string replacement field.
		//
		// `:` is ordinary punctuation here (dict key separator, slice,
		// annotation); format-spec mode is NOT entered because we are
		// not at the top level of the replacement.
		// =================================================================
		fstring_expr_nested: {
			rules: [
				WS,
				LINE_COMMENT,
				...string_entries,
				...number_entries,
				match(OP_ALL, TOKENS.operator),
				BACKSLASH_CONTINUATION,

				// any close delimiter pops one level. assumes balanced code.
				match(PAREN_CLOSE, TOKENS.punctuation, leave()),
				// any open delimiter pushes another nested level.
				match(PAREN_OPEN, TOKENS.punctuation, enter("fstring_expr_nested")),
				// punctuation including `:` (here it is just a separator).
				match([",", ";", ".", ":"], TOKENS.punctuation),

				...keyword_entries,
				uppercase_identifier_entry,
				identifier_entry,
			],
		},

		// =================================================================
		// fstring_format_spec — after `:` in an f-string replacement field.
		//
		// most chars are literal format spec content (emitted as string).
		// `{` opens a nested replacement field. `}` closes the spec AND
		// the parent replacement field — since format_spec was entered
		// via goto (replacing fstring_expr_top on the stack), leave()
		// here pops back to the fstring_body.
		// =================================================================
		fstring_format_spec: {
			rules: [
				match("{{", FORMAT_SPEC),
				match("}}", FORMAT_SPEC),
				match("{", TOKENS.punctuation, enter("fstring_expr_top")),
				match("}", TOKENS.punctuation, leave()),
				fallback({ token: FORMAT_SPEC }),
			],
		},
	},
});
