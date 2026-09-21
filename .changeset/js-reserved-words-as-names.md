---
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
"@twinkleplop/svelte": patch
---

Classify reserved words used as names. Every reserved word is a legal property name, but the grammar tagged them `keyword` wherever they appeared, so `const x = { default: "boo" }` highlighted `default` as a keyword rather than a property key.

This is a correctness fix rather than identifier enrichment, so it holds at every fidelity setting. It lands in two places:

- **Member access is settled in the grammar.** After a `.` or `?.` only a name can follow, so a new `member_access` state routes straight to the identifier probe without consulting the keyword rules. `obj.default` was only ever a keyword because a dot left the state machine in `division`, where the keyword rules live. `?.` moves out of the shared operator set into that state's entry rules, so exactly one rule owns the pattern.
- **Member names are settled by a pass that runs before the claim batch.** It needs the frame table to tell an object literal from a block, so it cannot go in the grammar. It is a plain (non-claiming) reclassifier, which makes it a barrier: the claim batch sees its output, so `claim_property_scope`'s ordinary identifier rules do the promoting and need no reserved-word variants. Being a barrier also leaves the order-independence permutation count unchanged.

Each word lands where the equivalent plain name lands:

- `{ default: 1 }`, `interface I { new: number }`, `const { default: d } = mod` — `property`
- `obj.default`, `obj?.new`, `foo().class` — `identifier`
- `map.delete(k)`, `class C { default() {} }`, `interface I { delete(): void }` — `function`

Positions where the word really is a keyword are unchanged: `switch (a) { default: }`, `export default`, labelled statements, and the `new (): T` construct signature in an interface.

Method shorthand covers object literals and type literals as well as class and interface bodies. That relies on every brace the frame tracker cannot place being a genuine object literal, which is what the annotation-shape rules in the same release make true.

Under `fidelity: "low"` a key reads as `identifier` rather than `property` — the coarse classification a plain name gets — but never as a keyword. The promotion to `property` is gated with the rest of the property claims.
