---
"@twinkleplop/core": patch
---

Rendering with overlays no longer slows down with each overlay added. Overlay positions are mapped to lines with a binary search instead of a scan from the start of the input, so large files with hundreds of overlays render in about the time they take without any.
