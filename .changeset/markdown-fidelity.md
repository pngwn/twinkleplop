---
"@twinkleplop/core": patch
"@twinkleplop/markdown": patch
---

Markdown fidelity now applies per style. Leaving `bold`, `italic`, `strike`, `code`, `link_text` or `autolink` out of the fidelity list renders that style as plain text, while the styles nested inside it keep theirs, and `fidelity: "low"` clears all six. Before, any one of them turned all six on, and none of them could be turned off.

A tagged reclassifier can list the grammar types each of its tags owns in `clears`, and those tokens are cleared before the pipeline runs when the tag is left out.
