---
"@twinkleplop/core": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
---

Classify a labelled tuple element's name as `property` rather than `type`. In `range: [start: number, end: number]` the labels read exactly like the types they annotate, because `type_span`'s member-position test — the one that skips `a: T` and `a?: T` inside object and function types — only ran inside parens and braces, and a label sits inside a bracket. The span now skips a label too, in every form: `[a: T]`, the optional `[a?: T]`, and the rest `[...a: T[]]`. Only an element's first token can be a label, so `[T extends U ? X : Y]` keeps both branches as types, and an unlabelled `[string, number]` is unchanged.

A label names a position the way a key names a member, so it reads the same as the key in `{ start: number }`. An index signature's key (`[k: string]: V`) has the same shape but is not a label, and is left alone. The claim rides with the other `property` claims, so `fidelity: ["type"]` leaves labels as identifiers, as it already does object type keys.
