---
"@twinkleplop/twoslash": minor
"@twinkleplop/twoslash-svelte": minor
---

Remove the one-shot `highlight(code, options)` export from both packages. It built a new TypeScript environment on every call, which made per-snippet use several times slower. Create a highlighter once and reuse it:

```ts
import { create_highlighter } from "@twinkleplop/twoslash";

const highlight = create_highlighter({ lang: "ts" });
const html = highlight(code);
```
