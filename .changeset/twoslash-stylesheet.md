---
"@twinkleplop/twoslash": patch
---

Add `@twinkleplop/twoslash/style.css`, the layout and visibility rules for the `twoslash-*` spans. A theme only colours tokens, so importing one left every popover rendering inline and hover type text appeared in the middle of the code. The stylesheet is colour-free — it uses `currentColor` and two overridable custom properties — so it composes with any theme.
