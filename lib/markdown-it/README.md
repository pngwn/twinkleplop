# @twinkleplop/markdown-it

Highlight fenced code and inline code in
[markdown-it](https://github.com/markdown-it/markdown-it).

```ts
import markdown_it from "markdown-it";
import markdown_it_twinkleplop from "@twinkleplop/markdown-it";
import { language as typescript } from "@twinkleplop/typescript";

const md = markdown_it().use(markdown_it_twinkleplop, {
  languages: { ts: typescript(), js: "ts" },
});

md.render(source);
```

The plugin replaces the `fence` renderer rule, and the `code_inline` rule
when inline code is enabled. A fence the plugin leaves alone — one naming no
language with no `default_language` set — falls through to whatever rule was
in place before, so the markdown-it defaults and any other plugin still
apply. The `highlight` option markdown-it passes to its own renderer is not
used and not needed.

Indented code blocks are parsed under markdown-it's own `code_block` rule,
which the plugin leaves alone, so `default_language` reaches fences only.
The rehype and remark plugins cannot tell the two apart in their trees and
cover both.

Errors name the line from the token map, and the file when the render `env`
carries a `path`:

```ts
md.render(source, { path: "docs/guide.md" });
```

Every option, every fence meta convention and the output contract are
documented once in
[`@twinkleplop/markdown-core`](../markdown-core), which
[`@twinkleplop/rehype`](../rehype) and
[`@twinkleplop/remark`](../remark) share: the same options produce the same
HTML for the same fence through any of the three.
