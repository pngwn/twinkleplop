---
"@twinkleplop/core": patch
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
"@twinkleplop/svelte": patch
---

Close generic parameter lists that end on a coalesced `>`. The tokenizer emits a run of `>` as one right-shift operator, so `make<T extends Record<string, unknown>>(base: T)` closes both angle groups on a single `>>` token. Three of the walkers that count angle depth only understood a lone `>`, never found the close, and gave up on the whole declaration: the name stayed `identifier` rather than `function`, the type parameter `T` stayed `identifier` rather than `type`, and `base` was never tagged as a parameter.

- `type_span`'s generic-argument verification and its span walk pop as many levels as the run has `>` characters. The walk previously never came back down, so once verification was fixed the span would have run on past the close and claimed every later identifier as a type.
- `promote_ts_generic_calls` does the same.
- Class, interface and object method parameter lists now step over type parameters, the way function declarations already did, so `interface I { make<T>(base: T): T }` tags `base` as a parameter.

`>=` and `>>=` still close nothing, and a shift expression such as `a < b >> c` is still rejected by the generic-argument check.

The same walk decides which identifiers inside a `{ ... }` name a member rather than refer to one, and it recognised only two of the four shapes. It now also skips:

- a method signature's name, so `type T = { make<U>(base: U): U }` keeps the `function` the grammar gave it instead of being claimed as a type. A plain type reference (`{ a: Foo<U> }`) is still recorded, because only an angle group that closes straight onto a parameter list marks a method.
- an optional key written as a separate `?` and `:`, which is what the JavaScript family emits. `{ brackets: { paren?: { open: string } } }` claimed `paren` as a type; it is a property. The same fix names an optional parameter in a function type (`(options?: Options) => void`).
