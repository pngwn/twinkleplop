---
"@twinkleplop/core": patch
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
"@twinkleplop/svelte": patch
---

Stop two kinds of frame-tracker state from outliving the statement that set them. Both fed the same failure: a brace classified as something it is not, and every pass that reads frame kinds following it.

**The angle counter.** `<` opens a type-argument list, but in the C family it is also less-than, so `for (let i = 0; i < n; i++)` armed a level that never closed. The counter is only read when a `{` opens, where a non-zero depth means "inside a generic" — so one unbalanced comparison reclassified every brace in the rest of the document. In a long file a class body, an interface body and a `switch` body all ended up as `type_literal`, and the passes that read frame kinds followed it: class fields were claimed as properties, and TypeScript type positions and parameter lists went unrecognised.

`BraceKindSpec.angles` takes a new `reset_chars`, and a closing brace resynchronises the counter unconditionally. A type-argument list never crosses either at its own nesting level, so a real generic constraint (`class C<T extends { id: V }> {}`) classifies as before. The JavaScript family sets `reset_chars: ";"`.

**The pending body marker.** `class` and `interface` are legal property names, so `const o = { class: 1 }` armed a marker that no brace of its own ever consumed — and the next unrelated `{` claimed it. `const o = { class: 1 }; const p = { a: 1 }` classified `p`'s literal as a class body, so `a` was not a property key.

`BraceKindSpec` takes a new `marker_reset_chars`: a pending marker is discarded when one of those characters appears at the brace depth the marker was armed at. A class head never contains one at its own depth, while a generic constraint's `{ a: string; b: X }` sits a level deeper and is untouched. The JavaScript family sets `";,:"`.

This corrects brace kinds in files past the first unbalanced comparison, so highlighting there changes — mostly identifiers that now resolve to `type` or `parameter`, and class fields that are no longer marked as properties.
