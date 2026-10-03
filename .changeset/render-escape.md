---
"@twinkleplop/core": minor
"@twinkleplop/twoslash": minor
"@twinkleplop/twoslash-svelte": minor
"@twinkleplop/markdown-core": minor
---

A new `escape` render option encodes extra characters everywhere the output is already escaped, so highlighted HTML can go straight into a Svelte, Vue or Angular template without a second pass.

```ts
ts(code, { escape: { "{": "&#123;", "}": "&#125;" } });
```

Each key is one UTF-16 code unit and its value is written as is. It covers token text, the text between tokens, `attributes` and hook output. The twoslash highlighters take the same option for the code and the popover types, docs and tags, and also read it from the render options a markdown registry passes. Markdown-core applies `render.escape` to fence titles, captions and language names. Core exports `escape_html(text, escape?)`.
