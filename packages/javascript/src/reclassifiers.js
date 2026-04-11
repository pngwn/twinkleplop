// JavaScript reclassifier rules.
//
// Each rule is a pattern over the raw JS token stream produced by the main
// grammar. Running these as a post-pass lets us recognize things that the
// state machine alone can't express cheaply — in particular, detecting that
// an identifier is a function *at its declaration site* via multi-token
// lookahead ("ident = () =>", "ident = function", etc.).
//
// Rules here are **additive**: consumers who import just `grammar` get the
// base tokenizer behavior unchanged; consumers who import `bundle` also get
// these reclassifiers applied automatically.

import {
	anyOf,
	balancedParens,
	optional,
	rewriteTypes,
	seq,
	type,
} from "@twinkleplop/core";

// ---------------------------------------------------------------------------
// function-variable detection
// ---------------------------------------------------------------------------
//
// Recognizes identifiers assigned an arrow or function expression, and object
// property keys whose value is an arrow or function expression. This mirrors
// Prism's `function-variable` pattern:
//
//   const foo = () => ...          → foo becomes `function`
//   const foo = (a, b) => ...      → foo becomes `function`
//   const foo = async () => ...    → foo becomes `function`
//   const foo = function() {}      → foo becomes `function`
//   const foo = async function()   → foo becomes `function`
//   const foo = x => ...           → foo becomes `function`
//   { foo: () => ... }             → foo becomes `function`
//
// Limitations (same as Prism):
//   - `const foo = cond ? () => 1 : () => 2` — not detected (intervening `?`)
//   - `const foo = (() => fn)()`  — incorrectly matches (parses as arrow)
//   - deeply nested params `((a, b), c) => ...` — handled up to maxTokens
//
// Trivia (comments) is skipped between pattern elements, so
// `const foo /* wat */ = () => 1` still matches.

const functionExpression = anyOf(
	// `function(...)` or bare `function` keyword
	type("keyword", "function"),
	// `async function(...)`
	seq(type("keyword", "async"), type("keyword", "function")),
);

const arrowFunction = anyOf(
	// `(...) => ...` — balanced param list followed by fat arrow
	seq(balancedParens("(", ")"), type("operator", "=>")),
	// `async (...) => ...`
	seq(
		type("keyword", "async"),
		balancedParens("(", ")"),
		type("operator", "=>"),
	),
	// `x => ...` — single unparenthesized parameter
	seq(type("identifier"), type("operator", "=>")),
	// `async x => ...`
	seq(
		type("keyword", "async"),
		type("identifier"),
		type("operator", "=>"),
	),
);

export const functionVariableRules = [
	{
		anchor: "identifier",
		when: seq(
			// `=` (declaration/assignment) or `:` (object property)
			type("operator", ["=", ":"]),
			anyOf(functionExpression, arrowFunction),
		),
		rewrite: "function",
	},
];

// Default reclassifier bundle applied to JS tokenization output. Exported
// separately so consumers can append/prepend their own rules.
export const reclassifiers = [
	rewriteTypes(functionVariableRules, { trivia: ["comment"] }),
];
