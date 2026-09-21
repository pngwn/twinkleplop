---
"@twinkleplop/core": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
---

Promote the type in an optional annotation. Every `x?: T` — optional interface members, optional class fields, optional parameters — left `T` as `identifier` where the required form `x: T` made it `type`:

```ts
interface Hooks {
  line?: (n: number, source_line: number) => HookResult | void;
  options?: RewriteOptions;
}
```

`HookResult` and `RewriteOptions` came out `identifier`.

The TypeScript and TSX grammars split `x?:` into a `?` operator and a `:` punctuation token. The frame tracker's ternary counting matches `?` by exact text and does not know whether it is in a type, so it counted the optional marker as a ternary's `?` and marked the colon behind it as that ternary's colon. Every annotation rule is gated on the colon _not_ being a ternary's, so none of them fired.

A ternary always has its consequent between `?` and `:`, so a colon that opens the very next significant token after a counted `?` can't be a ternary's. The tracker now takes that `?`'s count back at the colon and leaves the colon unmarked. A later ternary on the same frame still pairs normally. This is the split-token form of the `?:` exclusion `TernarySpec` already documented.

The three type-position rules anchored on a single `?:` operator token are removed. Neither grammar emits that token, so they never fired, and their comment claimed optional annotations were covered.

One shape is still ambiguous to the tracker: an optional method's return type, `f?(): R`, where the parentheses sit between `?` and `:` just as in `c ? (a): b`. `R` stays `identifier` there, as before.

Across the perf corpus the change moves 156 tokens, all `identifier` to `type`, each a name in the annotation behind an `x?:`.
