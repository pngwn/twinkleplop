---
"@twinkleplop/markdown": minor
"@twinkleplop/core": minor
---

Markdown highlights fenced code blocks with the languages you pass, keyed by the language named on the fence. The markdown package still depends on no language, so you only ship the ones you use. Core exports `embed_labelled` for hosts that name an embedded language in their text.

```ts
import { language } from "@twinkleplop/markdown";
import { tokenize as js } from "@twinkleplop/javascript";

const javascript = js();
const md = language({ languages: { js: javascript, javascript } });
```
