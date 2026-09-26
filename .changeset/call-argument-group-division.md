---
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
---

A `/` after a parenthesised group, number or string at the start of call arguments is read as division, so `f((a) / 2)`, `Math.sin((hue * Math.PI) / 180)` and `f(1 / 2)` no longer open a regex that swallows the closing `)`. In TSX this also lets JSX in an arrow body inside call arguments, such as `items.map((x) => (<li />))`, read as JSX.
