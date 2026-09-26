---
"@twinkleplop/tsx": patch
---

A type parameter with a default after a bare `<`, such as `new <T = any>()` or `<T = unknown,>(x: T) => x`, highlights as a type parameter list instead of a JSX tag.
