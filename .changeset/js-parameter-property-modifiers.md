---
"@twinkleplop/core": patch
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
"@twinkleplop/svelte": patch
---

Tag the name in a TypeScript parameter property as `parameter`. A constructor parameter carrying an accessibility or field modifier declares a class field, but the parameter is still the name behind the modifier — and every other parameter already highlighted as one:

```ts
class Animal {
  constructor(
    public name: string,
    private readonly id: number,
  ) {}
}
```

`name` and `id` came out `identifier` while a plain `constructor(name: string)` came out `parameter`.

The `params()` walk tags the first identifier at depth 1 of each chunk, and it already stepped over `...` on the way there. A modifier keyword is the same shape of obstacle, but `transparent_operators` could only describe operator tokens, so the walk reached `public` — a keyword — and gave up on the chunk.

That option is now `transparent_texts_for_type`, a map of token type to source texts, matching the shape `AtStartSpec` already uses for the same idea. The JS family passes `...` under `operator` and the member modifiers under `keyword`, sharing one set with the frame table's `at_start` transparency and the member-method rule's anchor list — the three had been three near-identical lists.

Transparency is conditional on a name actually following. `f(readonly: T)` declares a parameter literally named `readonly`, so stepping over it unconditionally would tag the annotation instead; the walk only steps over a transparent text when the next non-trivia token is an identifier, or another transparent text leading to one. Reaching a candidate list costs one array read indexed by token type, so a token of an untouched type does not pay for the lookup.

Across the perf corpus the change moves 8 tokens, all of them the name in a parameter property.
