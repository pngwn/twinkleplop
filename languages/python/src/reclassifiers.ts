// Python reclassifier rules.
//
// The base grammar emits `type` as `class_name` because it is a builtin class
// (used in `type(x)` calls). PEP 695 also makes `type` a soft keyword at the
// start of a type-alias statement:
//
//   type Vec[T] = list[T]
//   type Pair = tuple[int, str]
//
// Lexically these uses are indistinguishable from `type(x)` — the parser
// disambiguates by looking at what follows. This reclassifier does the same:
// when `type` is followed by a name, optional `[...]` type parameters, and
// `=`, it gets promoted from `class_name` to `keyword`.

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
		anchor: type("class_name", "type"),
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

export const reclassifiers = [
	rewrite_types(type_alias_rules, { trivia: ["comment"] }),
];
