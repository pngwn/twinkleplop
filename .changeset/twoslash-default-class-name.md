---
"@twinkleplop/twoslash": patch
"@twinkleplop/twoslash-svelte": patch
---

Change the default `class_name` from `"highlight twoslash"` to `"twinkleplop twoslash"`. Themes bind token colours to `.twinkleplop .<token>`, so default Twoslash output carried no colour at all while a plain language highlighter rendered correctly. The `twoslash` class is kept because it carries the popover and query styling.

This changes the `<pre>` class in the rendered HTML. If you style `pre.highlight`, pass `class_name: "highlight twoslash"` to restore the previous value.
