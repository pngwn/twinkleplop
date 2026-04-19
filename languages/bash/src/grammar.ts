// bash grammar for twinkleplop syntax highlighting.
//
// scope:
//   - bash 5.2+ lexical grammar (gnu bash reference manual, §2).
//   - all four quoting forms: single, double, ansi-c ($'...'), locale ($"...").
//   - nested expansions inside double-quoted strings:
//     $var, ${...}, $(...), $((...)), `...`.
//   - command substitution $(...), subshells (...), process substitution
//     <(...) >(...) all share a single nested state.
//   - arithmetic expansion $((...)) and arithmetic command ((...)) share one
//     state. recurses on `(` for grouping.
//   - parameter expansion ${...} with the full operator set (:-, :=, :?, :+,
//     #, ##, %, %%, /, //, ^, ^^, ,, ,,, !, @U, @u, @L, @Q, @E, @P, @A, @a,
//     @K, @k) and nested expansions on the rhs.
//   - [[ ... ]] conditional with file-test operators, string compare,
//     integer compare, logical combinators.
//   - all 22 reserved words per the manual.
//   - shell builtins emitted as a distinct `builtin` token.
//   - redirection operators with fd prefixes recognized by the generic
//     operator rule (fd digit emits as identifier; accepted limitation).
//   - comments: `#` at word-start through end of line.
//
// design notes:
//   - variables are emitted by a 2-char `$<letter|_>` match as a
//     `variable` token (the `$` sigil plus the first name character).
//     continuation characters fall through to the parent state's normal
//     rules (identifier in word contexts, string fallback inside quoted
//     strings, etc.). a reclassifier post-pass walks the token stream and
//     extends the variable token through any adjacent identifier-character
//     prefix of the following token, splitting the following token if
//     needed. this avoids the stack-leak problem that a per-parent
//     var-body sub-state would cause (entering a sub-state with
//     `fallback(goto(parent))` would leave a leaked copy of the parent on
//     the state stack; since cmd_sub / arith / conditional all call
//     `leave()` to close themselves, the leak breaks the pairing of
//     opens and closes on `))` / `]]` / `)`).
//   - keywords, builtins, and boolean literals are emitted as `identifier`
//     by the grammar and promoted to their real token types by the
//     `promote_keywords` reclassifier. this avoids a long-standing
//     pitfall with twinkleplop's boundary-checked keyword rules: `keyword`
//     only checks the character AFTER the match, so in an identifier
//     like `main` the keyword `in` would fire at position 2 (boundary
//     after `in` is `(`, which passes). pushing keyword detection to a
//     post-pass that only runs on WHOLE identifier tokens sidesteps
//     every such mid-word false-positive.
//   - numbers inside arithmetic emit from a single `match(DIGIT, number)`
//     rule plus coalescing. hex literals (`0xff`) and base-N literals
//     (`2#1010`, `16#ff`) split across 2-3 tokens because hex-digit
//     letters overlap with identifiers and the `#` base separator is
//     punctuation; the `merge_numbers` reclassifier stitches them back
//     into single `number` tokens.
//
// known limitations:
//   - foo#bar: `#` is emitted as a comment start even when mid-word, because
//     the grammar does not track word-start context. every real-world case
//     of `#` as literal mid-word is unusual. the fix would require a
//     word-body state, which is noisy for the few valid inputs it helps.
//   - heredoc bodies are NOT tracked. `<<EOF` emits `<<` as a redirection
//     operator and `EOF` as an identifier; the body text that follows is
//     tokenized as normal bash. this means quoted-delimiter heredocs
//     (`<<'EOF'`) will wrongly highlight `$var` inside the body. a proper
//     implementation requires a heredoc queue keyed by delimiter, processed
//     after each newline — possible but out of scope for this phase.
//   - the rhs of `=~` inside `[[ ]]` is tokenized as normal bash words, not
//     as a distinct regex token. the regex coloring is lost, but the
//     conditional is still correctly bounded by `]]`.
//   - extended glob patterns `?(pat) *(pat) +(pat) @(pat) !(pat)` are not
//     specially tokenized. the `?`, `*`, `+`, `@`, `!` and `(` emit as
//     separate tokens.
//   - brace expansion `{a,b,c}` / `{1..10}` is tokenized at the character
//     level: `{` `a` `,` `b` `,` `c` `}`. no dedicated brace-expansion token.
//   - history expansion is out of scope — script-mode highlighter only.
//   - function names with non-identifier chars are tokenized char-by-char.
//   - file-descriptor prefixes (`2>&1`) emit the digit as identifier.
//   - `{varname}<file` fd-allocation tokenizes as `{` + ident + `}` + redirect.
//   - subscript syntax `arr[i]` emits brackets as punctuation; contents use
//     parent state rules (correct for associative keys, not quite right for
//     indexed arithmetic subscripts).
//   - bash `$[...]` legacy arithmetic is NOT recognized. use `$((...))`.
//   - coproc keyword is recognized but the name argument is not treated
//     specially.
//   - `true`/`false` as command-position words emit as `boolean` even when
//     they're simply the /usr/bin/true /usr/bin/false commands.

import {
	ALNUM,
	DIGIT,
	LETTER,
	enter,
	fallback,
	keyword,
	leave,
	match,
	on,
	within,
} from "@twinkleplop/core";

import * as TOKENS from "@twinkleplop/core/tokens";
import { define_grammar } from "@twinkleplop/core/compile";

// ---------------------------------------------------------------------------
// custom token names — flow through to css classes in rendered output
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// reserved-word / keyword / builtin lists
// ---------------------------------------------------------------------------

export const RESERVED_WORDS = [
	"if",
	"then",
	"elif",
	"else",
	"fi",
	"time",
	"for",
	"in",
	"until",
	"while",
	"do",
	"done",
	"case",
	"esac",
	"coproc",
	"select",
	"function",
];

export const BUILTINS = [
	// posix / core
	"cd",
	"echo",
	"exec",
	"exit",
	"export",
	"eval",
	"getopts",
	"hash",
	"printf",
	"pwd",
	"read",
	"readonly",
	"return",
	"set",
	"shift",
	"test",
	"times",
	"trap",
	"unset",
	"break",
	"continue",
	"umask",
	"wait",
	// bash-specific
	"alias",
	"bind",
	"builtin",
	"caller",
	"command",
	"declare",
	"disown",
	"enable",
	"help",
	"history",
	"jobs",
	"kill",
	"let",
	"local",
	"logout",
	"mapfile",
	"popd",
	"pushd",
	"readarray",
	"shopt",
	"source",
	"suspend",
	"type",
	"typeset",
	"ulimit",
	"unalias",
];

export const BOOLEAN_LITERALS = ["true", "false"];

// special parameters per Special-Parameters.html, plus $0-$9 positional.
const SPECIAL_PARAMS = [
	"$@",
	"$*",
	"$#",
	"$?",
	"$-",
	"$$",
	"$!",
	"$_",
	"$0",
	"$1",
	"$2",
	"$3",
	"$4",
	"$5",
	"$6",
	"$7",
	"$8",
	"$9",
];

// all `$<letter|_>` two-char entries. we emit these as a 2-char variable
// token; a post-pass reclassifier extends the variable through adjacent
// identifier-character prefix chars.
const VAR_ENTRIES: string[] = [];
for (const c of "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_") {
	VAR_ENTRIES.push("$" + c);
}

// ---------------------------------------------------------------------------
// operator lists
// ---------------------------------------------------------------------------

const REDIRECT_3 = ["<<<", "<<-", "&>>"];
const REDIRECT_2 = ["<<", ">>", ">&", "<&", "<>", ">|", "&>"];
const REDIRECT_1 = ["<", ">"];

const CONTROL_3 = [";;&"];
const CONTROL_2 = [";;", ";&", "&&", "||", "|&"];
const CONTROL_1 = [";", "&", "|"];

const ARITH_3 = ["**=", "<<=", ">>="];
const ARITH_2 = [
	"**",
	"<<",
	">>",
	"<=",
	">=",
	"==",
	"!=",
	"&&",
	"||",
	"++",
	"--",
	"+=",
	"-=",
	"*=",
	"/=",
	"%=",
	"&=",
	"|=",
	"^=",
];
const ARITH_1 = [
	"+",
	"-",
	"*",
	"/",
	"%",
	"&",
	"|",
	"^",
	"~",
	"!",
	"<",
	">",
	"=",
	"?",
	":",
	",",
];

const COND_BINARY_FLAGS = ["-ef", "-nt", "-ot", "-eq", "-ne", "-lt", "-le", "-gt", "-ge"];
const COND_UNARY_FLAGS = [
	"-a",
	"-b",
	"-c",
	"-d",
	"-e",
	"-f",
	"-g",
	"-h",
	"-k",
	"-n",
	"-o",
	"-p",
	"-r",
	"-s",
	"-t",
	"-u",
	"-v",
	"-w",
	"-x",
	"-z",
	"-G",
	"-L",
	"-N",
	"-O",
	"-R",
	"-S",
];

const PARAM_OPS_3 = ["@U", "@u", "@L", "@Q", "@E", "@P", "@A", "@a", "@K", "@k"];
const PARAM_OPS_2 = [":-", ":=", ":?", ":+", "##", "%%", "//", "/#", "/%", "^^", ",,"];
const PARAM_OPS_1 = ["#", "%", "/", "^", ",", "!", "-", "=", "?", "+", ":", "@"];

// ---------------------------------------------------------------------------
// quick-lookup sets for the reclassifier — exported alongside the lists
// above so the reclassifier can do O(1) Set.has() checks.
// ---------------------------------------------------------------------------

export const RESERVED_SET = new Set(RESERVED_WORDS);
export const BUILTIN_SET = new Set(BUILTINS);
export const BOOLEAN_SET = new Set(BOOLEAN_LITERALS);

// ---------------------------------------------------------------------------
// shared rule fragments
// ---------------------------------------------------------------------------

const WS = on([" ", "\t", "\n", "\r"]);
const LINE_CONTINUATION = match("\\\n", TOKENS.operator);
const COMMENT = within("#", "\n", TOKENS.comment);
const SINGLE_STRING = within("'", "'", TOKENS.string);
const ANSI_STRING = within("$'", "'", TOKENS.string, { escape: "\\" });
const BACKTICK_STRING = within("`", "`", TOKENS.string, { escape: "\\" });

// ---------------------------------------------------------------------------
// expansion entries — rules that recognize $-prefixed expansions. produce
// no state change for plain $<letter> variables (the reclassifier does
// the continuation work); nested structural expansions DO change state.
// ---------------------------------------------------------------------------

const EXPANSION_ENTRIES = [
	// ansi-c and translated strings MUST come before $(( and $( so the
	// longer prefixes win.
	match("$'", TOKENS.string, enter("ansi_string_state")),
	match('$"', TOKENS.string, enter("double_string")),
	match("$((", TOKENS.punctuation, enter("arith")),
	match("$(", TOKENS.punctuation, enter("cmd_sub")),
	match("${", TOKENS.punctuation, enter("param_exp")),
	// special parameters: $@, $*, etc. these are complete 2-char tokens.
	match(SPECIAL_PARAMS, TOKENS.variable),
	// $<letter|_>: 2-char variable token; continuation handled by reclassifier.
	match(VAR_ENTRIES, TOKENS.variable),
	// bare $ (not followed by anything meaningful).
	match("$", TOKENS.operator),
];

// string openers shared across command/word contexts.
const STRING_OPENERS = [
	match('"', TOKENS.string, enter("double_string")),
	SINGLE_STRING,
	BACKTICK_STRING,
];

// ---------------------------------------------------------------------------
// command-context rules (shared between main and cmd_sub)
// ---------------------------------------------------------------------------

const CMD_CONTEXT_RULES = [
	WS,
	LINE_CONTINUATION,
	COMMENT,
	...EXPANSION_ENTRIES,
	...STRING_OPENERS,
	// (( before ( so arith command opens first.
	match("((", TOKENS.punctuation, enter("arith")),
	// process substitution. no space between < / > and ( per manual.
	match(["<(", ">("], TOKENS.punctuation, enter("cmd_sub")),
	match("(", TOKENS.punctuation, enter("cmd_sub")),
	keyword(["[["], enter("conditional")),
	// redirections (longest first).
	match(REDIRECT_3, TOKENS.operator),
	match(REDIRECT_2, TOKENS.operator),
	match(REDIRECT_1, TOKENS.operator),
	// control operators.
	match(CONTROL_3, TOKENS.punctuation),
	match(CONTROL_2, TOKENS.punctuation),
	match(CONTROL_1, TOKENS.punctuation),
	// compound assign.
	match("+=", TOKENS.operator),
	match("=", TOKENS.operator),
	// `!` pipeline negation, boundary-checked. (keywords/builtins/booleans
	// are promoted by the reclassifier from plain identifier tokens —
	// embedding them here would cause mid-word false positives like `main`
	// being split into `ma` + keyword `in`.)
	keyword(["!"], {}, TOKENS.operator),
	// `:` null-command builtin — the 1-char match doesn't conflict with
	// identifiers because `:` is not an ident char, so unlike `in` / `if`
	// etc. it can stay in the grammar as a direct builtin.
	keyword([":"], {}, TOKENS.builtin),
	// brackets and punctuation.
	match(["{", "}", "[", "]"], TOKENS.punctuation),
	match([",", ".", "~"], TOKENS.punctuation),
	// glob-like chars in word positions.
	match(["*", "?"], TOKENS.punctuation),
	// identifiers: letter/_/digit coalesce into one token.
	match([LETTER, "_", DIGIT], TOKENS.identifier),
	// word-content fallback. `-` `/` `+` etc. emit as operator since they
	// more often are than aren't.
	match(["-", "/"], TOKENS.operator),
];

// ---------------------------------------------------------------------------
// grammar
// ---------------------------------------------------------------------------

export default define_grammar({
	name: "bash",
	states: {
		// ===================================================================
		// main — top-level entry.
		// ===================================================================
		main: {
			rules: CMD_CONTEXT_RULES,
		},

		// ===================================================================
		// cmd_sub — $(...), (...), <(...), >(...). shares main's rules plus
		// `)` leave.
		// ===================================================================
		cmd_sub: {
			rules: [
				match(")", TOKENS.punctuation, leave()),
				...CMD_CONTEXT_RULES,
			],
		},

		// ===================================================================
		// arith — $((...)) or ((...)). exits on `))`. numbers inline; hex
		// prefix emits as number but continuation splits (documented).
		// ===================================================================
		arith: {
			rules: [
				match("))", TOKENS.punctuation, leave()),
				WS,
				LINE_CONTINUATION,
				...EXPANSION_ENTRIES,
				...STRING_OPENERS,
				// `(` for grouping inside arithmetic; recurse the same state.
				// NOTE: recursion reuses arith, so `))` only pops one level.
				// for nested `((a+1)*b)` this is correct.
				match("(", TOKENS.punctuation, enter("arith_group")),
				// arithmetic operators (longest first).
				match(ARITH_3, TOKENS.operator),
				match(ARITH_2, TOKENS.operator),
				match(ARITH_1, TOKENS.operator),
				// hex prefix; continuation handled imperfectly.
				match(["0x", "0X"], TOKENS.number),
				// decimal digits coalesce.
				match(DIGIT, TOKENS.number),
				// `#` for base-N separator; emit as punctuation (splits
				// base from digits — accepted limitation).
				match("#", TOKENS.punctuation),
				match(".", TOKENS.punctuation),
				// identifiers (variable references in arithmetic).
				match([LETTER, "_"], TOKENS.identifier),
				// fallback for truly unknown chars.
				fallback({ token: TOKENS.identifier }),
			],
		},

		// ===================================================================
		// arith_group — `(` grouping inside arithmetic. identical rules to
		// arith but exits on `)` (single paren).
		// ===================================================================
		arith_group: {
			rules: [
				match(")", TOKENS.punctuation, leave()),
				WS,
				LINE_CONTINUATION,
				...EXPANSION_ENTRIES,
				...STRING_OPENERS,
				match("(", TOKENS.punctuation, enter("arith_group")),
				match(ARITH_3, TOKENS.operator),
				match(ARITH_2, TOKENS.operator),
				match(ARITH_1, TOKENS.operator),
				match(["0x", "0X"], TOKENS.number),
				match(DIGIT, TOKENS.number),
				match("#", TOKENS.punctuation),
				match(".", TOKENS.punctuation),
				match([LETTER, "_"], TOKENS.identifier),
				fallback({ token: TOKENS.identifier }),
			],
		},

		// ===================================================================
		// conditional — [[ ... ]]. exits on `]]`.
		// ===================================================================
		conditional: {
			rules: [
				keyword(["]]"], leave()),
				WS,
				LINE_CONTINUATION,
				...EXPANSION_ENTRIES,
				...STRING_OPENERS,
				// `=~` regex match (rhs tokenized as plain words — limitation).
				match("=~", TOKENS.operator, enter("regex_rhs_initial")),
				// comparison operators (longer first).
				match(["==", "!=", "<=", ">="], TOKENS.operator),
				match(["=", "<", ">"], TOKENS.operator),
				// file/string/int test flags.
				match(COND_BINARY_FLAGS, TOKENS.operator),
				match(COND_UNARY_FLAGS, TOKENS.operator),
				// logical.
				match(["&&", "||"], TOKENS.operator),
				match("!", TOKENS.operator),
				// grouping.
				match(["(", ")"], TOKENS.punctuation),
				// identifiers.
				match([LETTER, "_", DIGIT], TOKENS.identifier),
				// misc.
				match(["-", "/", "*", "?", ":", ".", ",", "~", "+"], TOKENS.operator),
				fallback({ token: TOKENS.identifier }),
			],
		},

		// ===================================================================
		// regex_rhs_initial — after `=~`, skip leading whitespace, then
		// dispatch to regex_rhs_body for the actual regex word.
		//
		// why two states: the body state must `leave()` on any whitespace
		// to end the regex, but if we entered the body state while the
		// `=~ ` space was still pending it would leave immediately. the
		// initial state eats leading whitespace and goto's into body.
		// ===================================================================
		regex_rhs_initial: {
			rules: [
				on([" ", "\t"]),
				fallback({ state: "regex_rhs_body", exit: true }),
			],
		},

		// ===================================================================
		// regex_rhs_body — consuming the regex word after `=~`. per bash,
		// unquoted whitespace ends the regex; quoted parts are literal
		// strings with interpolation; $var is still a variable reference.
		//
		// trailing whitespace triggers leave() back to conditional where
		// `]]` can close the construct properly. this is what prevents
		// `]]` INSIDE a regex character class (`[[:space:]]`) from being
		// mis-parsed as the conditional close.
		// ===================================================================
		regex_rhs_body: {
			rules: [
				on([" ", "\t", "\n", "\r"], leave()),
				match('"', TOKENS.string, enter("double_string")),
				SINGLE_STRING,
				...EXPANSION_ENTRIES,
				fallback({ token: TOKENS.regex }),
			],
		},

		// ===================================================================
		// double_string — inside "..." or $"...". handles interpolation.
		// ===================================================================
		double_string: {
			rules: [
				match('"', TOKENS.string, leave()),
				// recognized backslash escapes per the manual: \$ \` \" \\ \<newline>.
				// other backslash sequences are literal per bash semantics.
				match(["\\$", "\\`", '\\"', "\\\\", "\\\n"], TOKENS.string_escape),
				// expansions inside the string.
				...EXPANSION_ENTRIES,
				// backtick command substitution (atomic — see limitation).
				BACKTICK_STRING,
				fallback({ token: TOKENS.string }),
			],
		},

		// ===================================================================
		// ansi_string_state — $'...' with escape sub-tokenization.
		// (the atomic ANSI_STRING const is NOT used; we prefer this richer
		// version that emits escape tokens for theme distinction.)
		// ===================================================================
		ansi_string_state: {
			rules: [
				match("'", TOKENS.string, leave()),
				// recognized escape table per ANSI_002dC-Quoting.html.
				match(
					[
						"\\a",
						"\\b",
						"\\e",
						"\\E",
						"\\f",
						"\\n",
						"\\r",
						"\\t",
						"\\v",
						"\\\\",
						"\\'",
						'\\"',
						"\\?",
					],
					TOKENS.string_escape,
				),
				// generic \X fallback for octal/hex/unicode/control forms.
				// emits 2 chars as string_escape.
				match("\\", TOKENS.string_escape, enter("ansi_escape_tail")),
				fallback({ token: TOKENS.string }),
			],
		},

		ansi_escape_tail: {
			rules: [fallback({ token: TOKENS.string_escape, exit: true })],
		},

		// ===================================================================
		// param_exp — inside ${...}.
		// ===================================================================
		param_exp: {
			rules: [
				match("}", TOKENS.punctuation, leave()),
				WS,
				LINE_CONTINUATION,
				// nested expansions on rhs.
				...EXPANSION_ENTRIES,
				...STRING_OPENERS,
				// parameter-expansion operators (longest first).
				match(PARAM_OPS_3, TOKENS.operator),
				match(PARAM_OPS_2, TOKENS.operator),
				match(PARAM_OPS_1, TOKENS.operator),
				match(["[", "]"], TOKENS.punctuation),
				match(["*", "?"], TOKENS.punctuation),
				match([LETTER, "_", DIGIT], TOKENS.identifier),
				fallback({ token: TOKENS.identifier }),
			],
		},
	},
});
