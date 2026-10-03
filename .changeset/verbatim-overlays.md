---
"@twinkleplop/core": minor
---

Overlays can mark a range as verbatim with `{ start, end, verbatim: true, type? }`, from an annotation plugin or the `overlays` render option. The range is written exactly as it is in the source, with no escaping, as one `span.tok`, so a template language can keep an expression such as `{some_val}` live inside highlighted code. Verbatim ranges are flagged with `OVERLAY_VERBATIM` in `TokenizeResult.overlays` for custom renderers.
