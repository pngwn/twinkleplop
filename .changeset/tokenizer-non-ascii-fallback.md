---
"@twinkleplop/core": patch
---

A non-ASCII character is kept when a grammar hands it to another state, such as the first character of a line in a Markdown code block, a Svelte `{expression}` or a Bash regex after `=~`:

````md
```text
λ calculus
```
````

The line above is highlighted as code in full rather than losing its first character.

In a custom grammar, `fallback(goto(...))` and `fallback(leave())` without a token leave a non-ASCII character for the next state, and a `fallback` rule enters and resolves a probe state on a non-ASCII character, the same as on ASCII.
