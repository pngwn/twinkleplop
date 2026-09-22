---
"@twinkleplop/javascript": patch
"@twinkleplop/typescript": patch
"@twinkleplop/tsx": patch
"@twinkleplop/svelte": patch
---

Highlight the `*` of a whole-module import or re-export as a `constant` rather than an `operator`, matching Shiki. It follows `constant` fidelity.

```js
import * as utils from "./utils.js";
import def, * as ns from "./ns.js";
export * from "./shared.js";
```

The binding after a default import, as in `import def, * as ns`, and after TypeScript's `import type * as ns` is now a `namespace` too.
