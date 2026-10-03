---
"@twinkleplop/core": minor
---

Add `visible_text(input, result, options?)`, which returns the text a render shows, so a copy button can copy that instead of the raw input with its `// [!hl]` markers. Marker bytes are removed with the whitespace before them, lines left empty by markers or `hide` ranges are dropped, and hidden bytes inside a line become spaces, all as the renderer does. `visible_text_map` also returns `segments`, `[source_start, source_end, text_start]` triples for each run copied from the source, so a host can find where a source range lands in the visible text.
