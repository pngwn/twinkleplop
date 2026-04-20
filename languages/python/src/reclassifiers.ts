// Python reclassifier rules.
//
// The base grammar emits every identifier-family token as `identifier`.
// Restoration passes layer the distinctions back on top:
//
//   - boolean   — "True" / "False" (before PascalCase — uppercase-first)
//   - builtin   — BUILTIN_TYPES word set (all lowercase)
//   - class_name — remaining PascalCase identifiers
//   - function  — identifier followed by `(...)`, excluding class_name and
//     builtin so constructors and built-in callables keep their own colour
//
// Plus one correctness pass:
//
//   - type_alias_rules — PEP 695 soft-keyword `type` at the start of a type
//     alias statement becomes `keyword`. Same text can be a builtin class
//     (`type(x)`) or a soft keyword (`type Vec[T] = list[T]`); lookahead
//     disambiguates.

import {
	any_of,
	balanced_parens,
	optional,
	promote_by_text_set,
	promote_function_calls,
	promote_pascal_case,
	rewrite_types,
	seq,
	type,
} from "@twinkleplop/core";
import type { Reclassifier } from "@twinkleplop/core";

import { BOOLEAN_LITERALS, BUILTIN_TYPES } from "./grammar.js";

// restoration. order matters: boolean promotion runs before PascalCase so
// "True" / "False" (which start with uppercase) are classified as boolean
// before promote_pascal_case would otherwise tag them class_name.
export const promote_python_booleans: Reclassifier = promote_by_text_set(
	"identifier",
	"boolean",
	BOOLEAN_LITERALS,
);

export const promote_python_builtins: Reclassifier = promote_by_text_set(
	"identifier",
	"builtin",
	BUILTIN_TYPES,
);

export const promote_python_pascal_case: Reclassifier = promote_pascal_case(
	"identifier",
	"class_name",
);

export const type_alias_rules = [
	{
		anchor: type("builtin", "type"),
		when: seq(
			// the alias name. PascalCase by convention (`type Vec = ...`) so
			// usually class_name; lowercase aliases (`type my_alias = ...`)
			// are accepted too.
			any_of(type("class_name"), type("identifier")),
			// optional pep 695 generic parameter list: `type Vec[T, U] = ...`
			optional(balanced_parens("[", "]")),
			// the `=` that ends the alias header.
			type("operator", "="),
		),
		rewrite: "keyword",
	},
];

export const promote_python_function_calls: Reclassifier = promote_function_calls(
	"identifier",
	"function",
	{ plain: true },
	{ trivia: ["comment"] },
);

export const reclassifiers = [
	promote_python_booleans,
	promote_python_builtins,
	promote_python_pascal_case,
	rewrite_types(type_alias_rules, { trivia: ["comment"] }),
	promote_python_function_calls,
];
