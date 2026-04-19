// Python reclassifier rules.
//
// The base grammar emits `type` as `builtin` because it is a builtin class
// (used in `type(x)` calls). PEP 695 also makes `type` a soft keyword at the
// start of a type-alias statement:
//
//   type Vec[T] = list[T]
//   type Pair = tuple[int, str]
//
// Lexically these uses are indistinguishable from `type(x)` — the parser
// disambiguates by looking at what follows. This reclassifier does the same:
// when `type` is followed by a name, optional `[...]` type parameters, and
// `=`, it gets promoted from `builtin` to `keyword`.

import {
	any_of,
	balanced_parens,
	optional,
	rewrite_types,
	seq,
	type,
} from "@twinkleplop/core";

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

// Function promotion rules.
//
// Any identifier immediately followed by a `(...)` group is a function —
// either the name after `def` in a definition, or the callee in a call.
// PascalCase identifiers are emitted as `class_name` by the grammar, so
// constructor calls like `Foo()` stay as `class_name` and match the
// github theme's convention of painting type names orange while leaving
// callable functions purple. Builtins (`print`, `int(x)`, ...) are
// emitted as `builtin` and likewise bypass this rule.
//
// `balanced_parens("(", ")")` is used rather than `type("punctuation", "(")`
// because adjacent punctuation coalesces into a single token (e.g. `()`
// becomes one token with value `"()"`), and `balanced_parens` matches on
// the token's first character rather than requiring an exact-length value.
export const function_rules = [
	{
		anchor: type("identifier"),
		when: balanced_parens("(", ")"),
		rewrite: "function",
	},
];

export const reclassifiers = [
	rewrite_types(type_alias_rules, { trivia: ["comment"] }),
	rewrite_types(function_rules, { trivia: ["comment"] }),
];
