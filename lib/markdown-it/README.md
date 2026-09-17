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
when inline code is enabled. Fences without a language use the previous renderer rule when `default_language` is unset. The plugin does not use markdown-it's `highlight` option.

Indented code blocks are parsed under markdown-it's own `code_block` rule,
which the plugin leaves unchanged. Here, `default_language` applies only to fences. In rehype and remark it also applies to indented blocks.

Errors include the line number and, when `env.path` is set, the file path:

```ts
md.render(source, { path: "docs/guide.md" });
```

See [`@twinkleplop/markdown-core`](../markdown-core) for shared options, fence metadata and HTML output.
