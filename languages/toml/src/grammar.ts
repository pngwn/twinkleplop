// TOML grammar — targets TOML v1.0.0 (Tom's Obvious Minimal Language).
//
// Scope:
//   - All key types: bare keys (A-Za-z0-9_-), quoted keys ("..." / '...'),
//     dotted keys (a.b.c with optional whitespace around dots).
//   - All string forms: basic "...", multi-line basic """...""",
//     literal '...', multi-line literal '''...'''.
//   - All number forms: decimal integers with optional +/- and _ separators,
//     hex (0x), octal (0o), binary (0b), floats with fractional/exponent parts,
//     and special floats inf/+inf/-inf, nan/+nan/-nan.
//   - Booleans: true, false (lowercase only).
//   - Datetime: offset datetime, local datetime, local date, local time.
//   - Table headers: [key] and [[key]] (array of tables).
//   - Arrays: [...] with trailing comma, newlines, and comments allowed.
//   - Inline tables: { key = value, ... } — no newlines in v1.0.0.
//   - Comments: # through end of line.
//
// Architecture:
//   - root: key position. scans keys, table headers, comments. on `=` goto value.
//   - value: value position. on newline goto root (terminates the keyval). on
//     unrecognized char goto root for recovery. other chars launch string,
//     number, boolean, array, inline-table sub-states.
//   - bracket_probe: peeks ONE char after `[` to decide between `[` (table
//     header) and `[[` (array-of-tables). must have an explicit fallback rule
//     because probe mode skips unmatched chars forward rather than firing the
//     state-level fallback; without it, `[a]\n[b]` would wrongly match the
//     second `[` as the partner of the first.
//   - number / datetime chains: entered via `enter` from the digit probe,
//     which pushes the parent state (value / value_array /
//     value_inline_table_after_val). internal transitions use `goto` so the
//     stack stays at depth 1; terminals use `fallback(leave())` to pop that
//     single frame cleanly and re-process the terminating char in the parent.
//     any `enter` without a matching `leave` would leak a frame per value and
//     the 256-slot state_stack would silently overflow on long documents.
//
// Key vs value context:
//   Quoted keys (`"name"`, `'name'`) in key position emit `property`, not
//   `string`, so `name.first = 1` and `"name".'first' = 1` tokenize uniformly.
//   A later reclassifier can demote property→string if a theme wants to show
//   the quotation visually; the reverse (string→property) would require
//   re-parsing to re-discover which strings were in key position.
//
// Known limitations:
//   - Keywords `true`, `false`, `inf`, `nan` as bare keys (e.g. `true = 1`)
//     are tokenized as boolean/keyword instead of property. A reclassifier
//     could fix this by looking ahead for `=` and rewriting the token type.
//   - Numeric bare keys like `1234 = "value"` are tokenized as property
//     (because bare key chars include digits). This is actually correct
//     behavior — the tokenizer correctly recognizes them as keys.
//   - Signed numbers (+99, -17) emit the sign as a separate operator token
//     rather than coalescing it into the number token. The visual result is
//     still correct (sign gets operator styling, digits get number styling).
//     For special floats like -inf, the sign is operator and inf is keyword.
//   - Multi-line basic string line-ending backslash trimming: `within()` with
//     escape handles the `\` correctly (prevents closing), but the whitespace
//     and newlines after it will still appear in the token. The token span is
//     correct; only the semantic value differs from the spec.
//   - TOML v1.1.0 features not supported: `\e`, `\xHH`, newlines/trailing
//     comma in inline tables, optional seconds in datetime.
//   - Semantic validation (duplicate keys, table conflicts) is not performed.
//   - Space-separated datetimes (e.g. `1987-07-05 17:45:00Z`) rely on the fact
//     that after a date + space, the next non-space char is either a digit
//     (continuing the datetime) or would otherwise be invalid TOML on the
//     same line. The fallback in dt_day hands back any non-digit non-T char
//     so the parent (value) can handle newlines, comments, commas, etc.
//
// Edge cases:
//   - `true = false`: the first `true` is correctly tokenized as property
//     (bare key), the second as boolean (value). No reclassifier needed.
//   - Datetime disambiguation uses a probe: 4 digits followed by `-` means
//     date. This is safe because `-` is never valid after digits in TOML
//     numbers (only `_`, `.`, `e`/`E` are).
//   - Local time detection: 2 digits followed by `:` means time. Safe
//     because `:` is never valid after digits in TOML numbers.

import {
	ALNUM,
	DIGIT,
	HEX,
	LETTER,
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
// Custom token types
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Shared rule fragments
// ---------------------------------------------------------------------------
const WS = on([" ", "\t"]);
const EOL = on(["\n", "\r"]);
const COMMENT = within("#", "\n", TOKENS.comment, { multiline: false });

// Strings: value-position rules emit `string`; key-position rules emit
// `property`. Quoted keys (`"name"` / `'name'`) are semantically keys, not
// strings — downgrading every key to `string` would lose the distinction
// from actual string values. A later reclassifier can demote property→string
// if a consumer wants the quoted form highlighted as a string, but the
// reverse (string→property) isn't recoverable without re-parsing.
// ML strings are included in key position for lenience; TOML v1.0.0 forbids
// them as keys but the grammar stays out of the validator's way.
const BASIC_STRING = within('"', '"', TOKENS.string, { escape: "\\" });
const LITERAL_STRING = within("'", "'", TOKENS.string);
const ML_BASIC_STRING = within('"""', '"""', TOKENS.string, { escape: "\\" });
const ML_LITERAL_STRING = within("'''", "'''", TOKENS.string);

const BASIC_KEY = within('"', '"', TOKENS.property, { escape: "\\" });
const LITERAL_KEY = within("'", "'", TOKENS.property);
const ML_BASIC_KEY = within('"""', '"""', TOKENS.property, { escape: "\\" });
const ML_LITERAL_KEY = within("'''", "'''", TOKENS.property);

// Bare key characters: A-Z a-z 0-9 - _
const BARE_KEY_CHARS = [LETTER, DIGIT, "-", "_"];
const BARE_KEY = match(BARE_KEY_CHARS, TOKENS.property);

// All string types for value contexts (multi-line first for length sorting)
const VALUE_STRINGS = [
	ML_BASIC_STRING,
	ML_LITERAL_STRING,
	BASIC_STRING,
	LITERAL_STRING,
];

// Octal/binary digit ranges
const OCT_DIGIT = range([["0", "7"]]);
const BIN_DIGIT = range([["0", "1"]]);

// ---------------------------------------------------------------------------
// Parameterised number chain factory.
//
// The number states (value_number, value_decimal, etc.) need to return to
// different parent states depending on context:
//   - After = at top level -> return to "value"
//   - Inside an array -> return to "value_array"
//   - Inside an inline table -> return to "value_inline_table_after_val"
//
// Instead of duplicating all number states, we generate them with a factory
// that takes the return-to state name.
// ---------------------------------------------------------------------------
const make_number_states = (return_to: string) => ({
	// Main number state — entered after first digit or after sign+digit
	// Stack discipline: the probe that entered this number chain pushed the
	// parent state (value / value_array / value_inline_table_after_val) onto
	// the stack. Inside the chain we use goto (sideways) so no further pushes
	// accumulate; the terminal fallback uses leave() to pop that single frame
	// and return control to the parent. Without this, every number would
	// leak one stack frame and the 256-slot state_stack would silently
	// overflow on documents with many values (manifesting as random later
	// key-value pairs being dropped).
	[`value_number_${return_to}`]: {
		rules: [
			match(DIGIT, TOKENS.number),
			match("_", TOKENS.number),
			// Hex/oct/bin prefix after 0 — emit prefix char as number so
			// it coalesces with the leading 0 into one token
			match(["x", "X"], TOKENS.number, goto(`value_hex_${return_to}`)),
			match(["o", "O"], TOKENS.number, goto(`value_oct_${return_to}`)),
			match(["b", "B"], TOKENS.number, goto(`value_bin_${return_to}`)),
			// Decimal point
			match(".", TOKENS.number, goto(`value_decimal_${return_to}`)),
			// Exponent
			match(["e", "E"], TOKENS.number, goto(`value_exp_sign_${return_to}`)),
			fallback(leave()),
		],
	},

	[`value_hex_${return_to}`]: {
		rules: [
			match(HEX, TOKENS.number),
			match("_", TOKENS.number),
			fallback(leave()),
		],
	},

	[`value_oct_${return_to}`]: {
		rules: [
			match(OCT_DIGIT, TOKENS.number),
			match("_", TOKENS.number),
			fallback(leave()),
		],
	},

	[`value_bin_${return_to}`]: {
		rules: [
			match(BIN_DIGIT, TOKENS.number),
			match("_", TOKENS.number),
			fallback(leave()),
		],
	},

	[`value_decimal_${return_to}`]: {
		rules: [
			match(DIGIT, TOKENS.number),
			match("_", TOKENS.number),
			match(["e", "E"], TOKENS.number, goto(`value_exp_sign_${return_to}`)),
			fallback(leave()),
		],
	},

	[`value_exp_sign_${return_to}`]: {
		rules: [
			match(["+", "-"], TOKENS.number, goto(`value_exp_digits_${return_to}`)),
			match(DIGIT, TOKENS.number, goto(`value_exp_digits_${return_to}`)),
			fallback(leave()),
		],
	},

	[`value_exp_digits_${return_to}`]: {
		rules: [
			match(DIGIT, TOKENS.number),
			match("_", TOKENS.number),
			fallback(leave()),
		],
	},

	// -----------------------------------------------------------------
	// Signed value state — after consuming +/- as operator in value pos.
	//
	// The sign was already emitted as an operator token. Now we check
	// what follows:
	//   - inf/nan -> keyword; leave() pops back to the parent
	//   - digit -> goto value_number (same stack depth — value_signed was
	//     entered via enter, which pushed the parent, so goto keeps that
	//     frame and value_number's terminal leave() will pop it cleanly)
	//   - anything else -> leave() pops back to the parent
	// -----------------------------------------------------------------
	[`value_signed_${return_to}`]: {
		rules: [
			keyword(["inf", "nan"], leave(), TOKENS.keyword),
			match(DIGIT, TOKENS.number, goto(`value_number_${return_to}`)),
			fallback(leave()),
		],
	},
});

// Generate number states for all three value contexts
const number_states_value = make_number_states("value");
const number_states_array = make_number_states("value_array");
const number_states_inline = make_number_states("value_inline_table_after_val");

// ---------------------------------------------------------------------------
// Datetime probe states — parameterised similarly.
//
// After seeing 4+ digits in value context, we probe for:
//   YYYY- -> date/datetime
//   HH: -> local time
//   otherwise -> number
// ---------------------------------------------------------------------------
const make_datetime_probe = (return_to: string) => ({
	// Phase 1: saw 1 digit, keep checking
	[`digit_probe1_${return_to}`]: {
		mode: "probe" as const,
		fallback: `number_from_probe_${return_to}`,
		rules: [
			on(DIGIT, enter(`digit_probe2_${return_to}`)),
			fallback(enter(`number_from_probe_${return_to}`)),
		],
	},

	// Phase 2: saw 2 digits, check for HH:
	// `:` routes to local_time. This MUST use enter (not goto) so the probe
	// resolution pushes the parent state; without that push, the leave() at
	// the end of local_time_body would pop an empty stack and cause an
	// infinite loop.
	[`digit_probe2_${return_to}`]: {
		mode: "probe" as const,
		fallback: `number_from_probe_${return_to}`,
		rules: [
			on(DIGIT, enter(`digit_probe3_${return_to}`)),
			on(":", enter(`local_time_from_probe_${return_to}`)),
			fallback(enter(`number_from_probe_${return_to}`)),
		],
	},

	// Phase 3: saw 3 digits, keep going for potential YYYY
	[`digit_probe3_${return_to}`]: {
		mode: "probe" as const,
		fallback: `number_from_probe_${return_to}`,
		rules: [
			on(DIGIT, enter(`digit_probe4_${return_to}`)),
			fallback(enter(`number_from_probe_${return_to}`)),
		],
	},

	// Phase 4: saw 4 digits (potential year), check for YYYY-
	[`digit_probe4_${return_to}`]: {
		mode: "probe" as const,
		fallback: `number_from_probe_${return_to}`,
		rules: [
			on("-", enter(`datetime_from_probe_${return_to}`)),
			on(".", enter(`number_from_probe_${return_to}`)),
			fallback(enter(`number_from_probe_${return_to}`)),
		],
	},

	// After probe rewind: re-consume digits as number
	[`number_from_probe_${return_to}`]: {
		rules: [
			match(DIGIT, TOKENS.number, goto(`value_number_${return_to}`)),
		],
	},

	// After probe rewind: re-consume 2 digits as local time
	[`local_time_from_probe_${return_to}`]: {
		rules: [
			match(DIGIT, "datetime", goto(`local_time_body_${return_to}`)),
		],
	},

	[`local_time_body_${return_to}`]: {
		rules: [
			match(DIGIT, "datetime"),
			match(":", TOKENS.punctuation),
			match(".", TOKENS.punctuation),
			// any other char (whitespace, comma, bracket, comment, newline) is
			// a terminator — leave() pops the parent frame that the probe
			// pushed during resolution so control returns cleanly without a
			// stack leak.
			fallback(leave()),
		],
	},

	// After probe rewind: re-consume 4 digits as datetime year
	[`datetime_from_probe_${return_to}`]: {
		rules: [
			match(DIGIT, "datetime", goto(`dt_year_${return_to}`)),
		],
	},

	[`dt_year_${return_to}`]: {
		rules: [
			match(DIGIT, "datetime"),
			match("-", TOKENS.punctuation, goto(`dt_month_${return_to}`)),
			fallback(leave()),
		],
	},

	[`dt_month_${return_to}`]: {
		rules: [
			match(DIGIT, "datetime"),
			match("-", TOKENS.punctuation, goto(`dt_day_${return_to}`)),
			fallback(leave()),
		],
	},

	// dt_day: accepts T/t/space as the time separator. Emitting the
	// separator as datetime keeps the whole `2024-01-01T17:00:00` span
	// rendering as one datetime token. The fallback exits on any other
	// char (e.g. newline, comma, `]`, `#`) without consuming it so the
	// parent (pushed by the probe resolution) can emit it correctly.
	[`dt_day_${return_to}`]: {
		rules: [
			match(DIGIT, "datetime"),
			match(["T", "t", " "], "datetime", goto(`dt_time_${return_to}`)),
			fallback(leave()),
		],
	},

	[`dt_time_${return_to}`]: {
		rules: [
			match(DIGIT, "datetime"),
			match(":", TOKENS.punctuation),
			match(".", TOKENS.punctuation),
			match(["Z", "z"], "datetime", goto(`dt_tz_${return_to}`)),
			match(["+", "-"], TOKENS.punctuation, goto(`dt_offset_${return_to}`)),
			fallback(leave()),
		],
	},

	[`dt_tz_${return_to}`]: {
		rules: [
			fallback(leave()),
		],
	},

	[`dt_offset_${return_to}`]: {
		rules: [
			match(DIGIT, "datetime"),
			match(":", TOKENS.punctuation),
			fallback(leave()),
		],
	},
});

const datetime_probe_value = make_datetime_probe("value");
const datetime_probe_array = make_datetime_probe("value_array");
const datetime_probe_inline = make_datetime_probe("value_inline_table_after_val");

// ---------------------------------------------------------------------------
// Value rule factory — produces the "scan for a value" rules.
// Parameterised by return-to state (for number/datetime fallbacks) and
// whether EOL/COMMENT are allowed. The caller is responsible for any
// EOL-driven state transition (e.g. goto("root") at the top level).
// ---------------------------------------------------------------------------
const make_value_rules = (return_to: string, allow_eol: boolean) => [
	WS,
	...(allow_eol ? [EOL, COMMENT] : []),
	...VALUE_STRINGS,
	keyword(["true", "false"], {}, TOKENS.boolean),
	keyword(["inf", "nan"], {}, TOKENS.keyword),
	// +/- in value position: emit as operator, then check if followed by
	// inf/nan (keyword) or digit (number) in value_signed state
	match(["+", "-"], TOKENS.operator, enter(`value_signed_${return_to}`)),
	on(DIGIT, enter(`digit_probe1_${return_to}`)),
	match("[", TOKENS.punctuation, enter("value_array")),
	match("{", TOKENS.punctuation, enter("value_inline_table")),
];

// Merge all generated states into one object
const all_number_states = {
	...number_states_value,
	...number_states_array,
	...number_states_inline,
};

const all_datetime_states = {
	...datetime_probe_value,
	...datetime_probe_array,
	...datetime_probe_inline,
};

export default define_grammar({
	name: "toml",
	states: {
		// -----------------------------------------------------------------
		// root — scanning for keys, table headers, comments.
		// -----------------------------------------------------------------
		root: {
			rules: [
				WS,
				EOL,
				COMMENT,

				// Table headers: [key] or [[key]]
				on("[", enter("bracket_probe")),

				// Quoted keys in key position — emit `property`, not `string`,
				// so `"name".first` and `name.first` tokenize uniformly.
				ML_BASIC_KEY,
				ML_LITERAL_KEY,
				BASIC_KEY,
				LITERAL_KEY,

				// Bare key characters
				BARE_KEY,

				// = key-value separator
				match("=", TOKENS.operator, goto("value")),

				// . dotted key separator
				match(".", TOKENS.punctuation),
			],
		},

		// -----------------------------------------------------------------
		// bracket_probe — disambiguate [ vs [[.
		//
		// A probe in "probe" mode that does not have an explicit rule for the
		// current char scans FORWARD looking for a disambiguating match. With
		// only the `on("[", ...)` rule here, an input like `[a]\n[b]` would
		// cause the probe to scan past `a]\n` and wrongly match the second
		// `[` as the second bracket of `[[`. We need an immediate fallback
		// that routes any non-`[` char to the plain table_header state.
		// -----------------------------------------------------------------
		bracket_probe: {
			mode: "probe",
			fallback: "table_header",
			rules: [
				on("[", enter("array_table_header")),
				fallback(enter("table_header")),
			],
		},

		// -----------------------------------------------------------------
		// table_header — [key]
		// -----------------------------------------------------------------
		table_header: {
			rules: [
				match("[", TOKENS.punctuation, goto("table_header_key")),
			],
		},

		table_header_key: {
			rules: [
				WS,
				COMMENT,
				BASIC_KEY,
				LITERAL_KEY,
				BARE_KEY,
				match(".", TOKENS.punctuation),
				match("]", TOKENS.punctuation, leave()),
			],
		},

		// -----------------------------------------------------------------
		// array_table_header — [[key]]
		// -----------------------------------------------------------------
		array_table_header: {
			rules: [
				match("[[", TOKENS.array_table_header, goto("array_table_header_key")),
			],
		},

		array_table_header_key: {
			rules: [
				WS,
				COMMENT,
				BASIC_KEY,
				LITERAL_KEY,
				BARE_KEY,
				match(".", TOKENS.punctuation),
				// closing `]]` matches the opening `[[` token type so a theme
				// that styles array-of-tables delimiters can target both ends.
				match("]]", TOKENS.array_table_header, leave()),
			],
		},

		// -----------------------------------------------------------------
		// value — scanning for a value after =
		//
		// newline at top level terminates the keyval and returns to root.
		// the `on([\n, \r], goto("root"))` rule must come before anything
		// that could claim those chars, and replaces the passive EOL rule
		// that make_value_rules would otherwise insert (the filter below
		// strips make_value_rules's EOL so we don't have a duplicate rule
		// that silently consumes the newline).
		//
		// fallback(goto("root")) handles recovery: any char that did not
		// match a value start (e.g. a stray letter after the value already
		// ended, an empty value before a newline) hands control back to
		// root WITHOUT consuming, so root can re-interpret it as the start
		// of a new key or table header.
		// -----------------------------------------------------------------
		value: {
			rules: [
				on(["\n", "\r"], goto("root")),
				...make_value_rules("value", true).filter((r) => r !== EOL),
				fallback(goto("root")),
			],
		},

		// -----------------------------------------------------------------
		// value_array — inside [...] in value position
		// -----------------------------------------------------------------
		value_array: {
			rules: [
				...make_value_rules("value_array", true),
				match(",", TOKENS.punctuation),
				match("]", TOKENS.punctuation, leave()),
			],
		},

		// -----------------------------------------------------------------
		// value_inline_table — inside {...} in value position
		// Keys and values, comma-separated, no newlines in v1.0.0.
		// -----------------------------------------------------------------
		value_inline_table: {
			rules: [
				WS,
				ML_BASIC_KEY,
				ML_LITERAL_KEY,
				BASIC_KEY,
				LITERAL_KEY,
				BARE_KEY,
				match("=", TOKENS.operator, goto("value_inline_table_after_val")),
				match(",", TOKENS.punctuation),
				match(".", TOKENS.punctuation),
				match("}", TOKENS.punctuation, leave()),
			],
		},

		// After = inside inline table — same as value but no EOL/COMMENT,
		// and number/datetime states return to inline table context.
		value_inline_table_after_val: {
			rules: [
				...make_value_rules("value_inline_table_after_val", false),
				// Comma and } terminate the value
				on(",", goto("value_inline_table")),
				on("}", goto("value_inline_table")),
			],
		},

		// Merge all generated number and datetime states
		...all_number_states,
		...all_datetime_states,
	},
});
