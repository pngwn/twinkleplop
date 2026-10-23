---
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
---

A tsx element with type arguments, such as `<Select<Item> value={selected} />`, now reads its type arguments as types and its attributes as attribute names, and the code after the element is tokenized again.
