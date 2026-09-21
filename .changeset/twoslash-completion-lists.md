---
"@twinkleplop/twoslash": patch
---

Render `^|` completion lists. Twoslash reports a completion as a zero-length node, but `render` treated it as a range wrapper like hovers and errors; a wrapper only opens a span once its range covers a character, so the list — and the `.twoslash-completion` / `.twoslash-completions` styles in `style.css` — never made it into the output. Completions are now point annotations: an empty host emitted at the caret, inside any wrapper it falls within but outside the token span, with the list anchored to it. `@twinkleplop/twoslash-svelte` picks this up through the shared renderer.
