---
"@twinkleplop/core": patch
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
"@twinkleplop/svelte": patch
---

Classify two brace positions the prev-token rules read wrongly. A function body behind a return-type annotation (`function f(state: number): void { ... }`) fell through to `object`, because the token before the brace is the tail of the type rather than the `)` the block rule looks for; a `case` arm with a block body (`case "bytes": { ... }`) matched the annotation rule on its `:` and became `type_literal`. Both now classify as `block`, which is what the claim passes gate on — a statement inside such a body is no longer a candidate member.

`BraceKindRule` gains two optional conditions to express this: `scan_back`, a bounded backward walk that lets a rule key on the shape of a whole annotation instead of the one token before the brace, and `in_kinds`, an enclosing-frame gate that keeps the `case` rule off a reserved word used as an object key (`{ default: { a: 1 } }` looks identical until you know the enclosing frame is an object literal). The return-type rules accept both spellings of a builtin type name, since the TSX grammar tags `string` / `number` as `type` where the TypeScript grammar leaves them identifiers. Brace-kind prev rules are now bucketed by the previous token's type, so a longer rule list costs nothing for braces the rules do not apply to.

Also fixes parameter names going untagged in the second arm of a ternary (`c ? (i: number) => a : (i: number) => b`) inside a function body. `params()` with `skip_in_type_position` treated any `(` after a `:` as a function type unless the enclosing frame was an object literal, which happened to be what a mis-classified function body looked like; it now consults the tracker's ternary-colon signal, discounting the `?` of an optional member (`onHover?: (index: number) => void`), which the mode-blind qmark counting cannot tell from a ternary on its own.
