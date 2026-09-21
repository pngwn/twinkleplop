---
"@twinkleplop/diff": patch
---

The line after a `+++` or `***` file header inside a hunk is always read as the start of a new file section, however many hunks came before it.
