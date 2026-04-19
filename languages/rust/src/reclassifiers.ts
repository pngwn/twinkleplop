// Rust reclassifier rules.
//
// Rewrites identifier tokens that appear in function-call position to the
// `function` token type. This gives themes a hook to color call sites
// differently from plain identifiers.
//
//   foo()           → foo becomes `function`
//   self.method()   → method becomes `function`
//   Vec::new()      → new becomes `function`
//   println!()      → println stays `identifier` (macro `!` is separate)

import { rewrite_types, seq, type, any_of } from "@twinkleplop/core";

// an identifier immediately followed by `(` is a function call.
// the tokenizer may coalesce `()` into a single punctuation token when
// the parens are empty, so we match both `(` and `()`.
const function_call_rules = [
	{
		anchor: "identifier",
    when: any_of(
      seq(type("punctuation", ["(", "()"])),
        seq(type("builtin", ["!"]),type("punctuation", ["(", "()"]) )
    ),
		rewrite: "function",
	},
];

export const reclassifiers = [
	rewrite_types(function_call_rules, { trivia: ["comment"] }),
];
