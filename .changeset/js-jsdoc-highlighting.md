---
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
"@twinkleplop/svelte": patch
---

Highlight JSDoc comments. A `/** … */` comment is now handed to a jsdoc grammar the same way a tagged template is handed to HTML or CSS, so its structure comes back as tokens instead of one undifferentiated `comment`:

- `@param`, `@returns`, `@type`, … — `keyword`
- the `{…}` after a tag — `type` for the names, `punctuation` for the delimiters
- the name after `@param {T} name` — `parameter`
- the name after `@typedef {T} Name`, `@callback`, `@template` — `type`

Everything else stays `comment`, including prose, an `@` inside a sentence, and a brace that is not part of a type expression (`@example const x = {}`). Line comments and plain `/* … */` block comments are untouched.

The pass is an embed, so like CSS inside a `<style>` tag it runs at every fidelity setting.
