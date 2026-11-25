---
"@twinkleplop/core": minor
"@twinkleplop/markdown-core": minor
"@twinkleplop/bash": patch
"@twinkleplop/c": patch
"@twinkleplop/cpp": patch
"@twinkleplop/css": patch
"@twinkleplop/diff": patch
"@twinkleplop/diff-basic": patch
"@twinkleplop/dockerfile": patch
"@twinkleplop/dotenv": patch
"@twinkleplop/go": patch
"@twinkleplop/graphql": patch
"@twinkleplop/html": patch
"@twinkleplop/http": patch
"@twinkleplop/ini": patch
"@twinkleplop/javascript": patch
"@twinkleplop/json": patch
"@twinkleplop/jsonc": patch
"@twinkleplop/markdown": patch
"@twinkleplop/mdsvex": patch
"@twinkleplop/powershell": patch
"@twinkleplop/python": patch
"@twinkleplop/rust": patch
"@twinkleplop/shellsession": patch
"@twinkleplop/sql": patch
"@twinkleplop/svelte": patch
"@twinkleplop/toml": patch
"@twinkleplop/tsx": patch
"@twinkleplop/typescript": patch
"@twinkleplop/yaml": patch
---

Unfinished input can be highlighted as it arrives. Pass `open: true` as a render option of a language package's function, as the second argument of a tokenize function, or as `{ open: true }` in the last argument of markdown-core's `fence()`.

```ts
const html = highlight(code_so_far, { open: true });
```

While the input is open, a comment that stops partway through a `[!verb ...]` directive is hidden instead of showing as a comment first, a pair with no closer yet applies to the end, and lines or anchors that have not arrived are not reported. `overlays` items and fence meta lines past the current end are clamped or dropped instead of throwing. Mistakes that more text cannot fix are reported as before.
