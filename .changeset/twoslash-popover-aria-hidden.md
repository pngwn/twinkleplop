---
"@twinkleplop/twoslash": patch
---

Mark hover popovers `aria-hidden="true"`. A popover sits inline between the tokens it describes and holds a type signature, docs and tags, so anything that reads the markup as text rather than rendering it spliced that payload into the code: `const greeting = "hello world"` came back as `const greetingconst greeting: "hello world" = "hello world"`. Only CSS kept the popovers out of the way, and a screen reader, a search indexer or an HTML-to-markdown fetcher has none. The rendered text of a snippet is now the snippet.
