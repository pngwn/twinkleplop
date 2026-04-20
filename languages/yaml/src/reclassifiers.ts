// YAML reclassifier.
//
// The core grammar emits every unquoted scalar as `identifier`. A post pass
// walks the token stream, inspects each identifier's source text, and
// rewrites the token type to `boolean`, `null`, `number` when the content
// matches the YAML 1.2 core schema (or the permissive YAML 1.1 superset for
// booleans). A second pass promotes identifier keys — scalars whose next
// non-trivia token is a `:` punctuation — to `property`.
//
// Accepted booleans (spec-strict + permissive 1.1):
//   true True TRUE false False FALSE
//   yes Yes YES no No NO on On ON off Off OFF y Y n N
//
// Accepted null forms: null Null NULL ~
//
// Accepted numbers (YAML 1.2 core schema):
//   [-+]?digit+                         decimal integer
//   0o[0-7]+                            octal integer
//   0x[0-9a-fA-F]+                      hexadecimal integer
//   [-+]?(\.digit+|digit+\.digit*)(eE[+-]?digit+)?   float
//   [-+]?(\.inf|\.Inf|\.INF)            infinity
//   \.nan|\.NaN|\.NAN                   not a number
//
// Anything that does not match stays as `identifier`.

import { tag } from "@twinkleplop/core";
import type {
	LanguagePipeline,
	Reclassifier,
	TokenizeResult,
} from "@twinkleplop/core";

const BOOLEAN_VALUES = new Set([
	"true",
	"True",
	"TRUE",
	"false",
	"False",
	"FALSE",
	"yes",
	"Yes",
	"YES",
	"no",
	"No",
	"NO",
	"on",
	"On",
	"ON",
	"off",
	"Off",
	"OFF",
	"y",
	"Y",
	"n",
	"N",
]);

const NULL_VALUES = new Set(["null", "Null", "NULL", "~"]);

const INF_TAILS = new Set([".inf", ".Inf", ".INF"]);
const NAN_VALUES = new Set([".nan", ".NaN", ".NAN"]);

const is_digit = (ch: string): boolean => ch >= "0" && ch <= "9";
const is_hex = (ch: string): boolean =>
	(ch >= "0" && ch <= "9") ||
	(ch >= "a" && ch <= "f") ||
	(ch >= "A" && ch <= "F");
const is_octal = (ch: string): boolean => ch >= "0" && ch <= "7";

// check whether `text` is a YAML 1.2 core-schema numeric literal.
function is_number(text: string): boolean {
	const n = text.length;
	if (n === 0) return false;

	// leading sign permitted for decimal int, float, infinity
	let i = 0;
	const first = text[0];
	const sign_present = first === "+" || first === "-";
	if (sign_present) i = 1;
	if (i === n) return false;

	// infinity: optional sign + .inf / .Inf / .INF
	if (text[i] === ".") {
		const tail = text.slice(i);
		if (INF_TAILS.has(tail)) return true;
		// nan does not allow a sign prefix
		if (!sign_present && NAN_VALUES.has(tail)) return true;
		// could be float starting with `.digit+`
		return is_float_after_sign(text, i);
	}

	// hex / octal have no sign (spec forbids `-0x10`)
	if (!sign_present && text[i] === "0" && i + 1 < n) {
		const marker = text[i + 1];
		if (marker === "x") {
			if (i + 2 === n) return false;
			for (let k = i + 2; k < n; k++) {
				if (!is_hex(text[k])) return false;
			}
			return true;
		}
		if (marker === "o") {
			if (i + 2 === n) return false;
			for (let k = i + 2; k < n; k++) {
				if (!is_octal(text[k])) return false;
			}
			return true;
		}
	}

	// decimal int or float
	return is_float_after_sign(text, i);
}

// parse the post-sign portion of a decimal int or float.
// accepts: digit+ | digit+ \. digit* | \. digit+   with optional exponent.
function is_float_after_sign(text: string, start: number): boolean {
	const n = text.length;
	let pos = start;
	if (pos === n) return false;

	let saw_digit = false;

	if (text[pos] === ".") {
		pos++;
		// .digit+ is required (no sign-only, no bare .)
		if (pos === n || !is_digit(text[pos])) return false;
		while (pos < n && is_digit(text[pos])) {
			saw_digit = true;
			pos++;
		}
	} else if (is_digit(text[pos])) {
		while (pos < n && is_digit(text[pos])) {
			saw_digit = true;
			pos++;
		}
		if (pos < n && text[pos] === ".") {
			pos++;
			while (pos < n && is_digit(text[pos])) pos++;
		}
	} else {
		return false;
	}

	if (!saw_digit) return false;

	if (pos < n && (text[pos] === "e" || text[pos] === "E")) {
		pos++;
		if (pos < n && (text[pos] === "+" || text[pos] === "-")) pos++;
		if (pos === n || !is_digit(text[pos])) return false;
		while (pos < n && is_digit(text[pos])) pos++;
	}

	return pos === n;
}

// rewrite identifier tokens based on their source text.
export const classify_scalars: Reclassifier = (
	input: string,
	result: TokenizeResult,
): TokenizeResult => {
	const tokens = new Uint32Array(result.tokens);
	const token_types = result.token_types.slice();
	const n = tokens.length / 3;
	if (n === 0) return { tokens, token_types };

	const ident_id = token_types.indexOf("identifier");
	if (ident_id < 0) return { tokens, token_types };

	const ensure = (name: string): number => {
		let id = token_types.indexOf(name);
		if (id < 0) {
			id = token_types.length;
			token_types.push(name);
		}
		return id;
	};
	const boolean_id = ensure("boolean");
	const null_id = ensure("null");
	const number_id = ensure("number");

	for (let i = 0; i < n; i++) {
		if (tokens[i * 3] !== ident_id) continue;
		const start = tokens[i * 3 + 1];
		const end = tokens[i * 3 + 2];
		const text = input.slice(start, end);
		if (BOOLEAN_VALUES.has(text)) tokens[i * 3] = boolean_id;
		else if (NULL_VALUES.has(text)) tokens[i * 3] = null_id;
		else if (is_number(text)) tokens[i * 3] = number_id;
	}
	return { tokens, token_types };
};

// promote identifier keys to `property`. a key is an identifier whose next
// non-trivia token is a `:` punctuation.
export const promote_keys: Reclassifier = (
	input: string,
	result: TokenizeResult,
): TokenizeResult => {
	const tokens = new Uint32Array(result.tokens);
	const token_types = result.token_types.slice();
	const n = tokens.length / 3;
	if (n === 0) return { tokens, token_types };

	const ident_id = token_types.indexOf("identifier");
	const punct_id = token_types.indexOf("punctuation");
	const comment_id = token_types.indexOf("comment");
	if (ident_id < 0 || punct_id < 0) return { tokens, token_types };

	let property_id = token_types.indexOf("property");
	if (property_id < 0) {
		property_id = token_types.length;
		token_types.push("property");
	}

	for (let i = 0; i < n; i++) {
		if (tokens[i * 3] !== ident_id) continue;
		// look ahead for the next non-trivia token. trivia = comment.
		let j = i + 1;
		while (j < n && tokens[j * 3] === comment_id) j++;
		if (j >= n) continue;
		if (tokens[j * 3] !== punct_id) continue;
		const start = tokens[j * 3 + 1];
		const end = tokens[j * 3 + 2];
		if (end - start !== 1) continue;
		if (input[start] !== ":") continue;
		tokens[i * 3] = property_id;
	}
	return { tokens, token_types };
};

export const reclassifiers: LanguagePipeline = [
	tag(classify_scalars, ["boolean", "null", "number"]),
	tag(promote_keys, ["property"]),
];
