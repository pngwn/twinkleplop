---
"@twinkleplop/core": patch
---

Short snippets highlight faster. The tokenizer's state stack and the claim buffers used by unbatched reclassifier passes are now reused across calls instead of allocated on every call. Each one was large enough to need a slow off-heap allocation, which made up most of the fixed cost of highlighting a one-line snippet. Languages that embed others, like Svelte, gain the most because every embedded region is another call. Output is unchanged.
