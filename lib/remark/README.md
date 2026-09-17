# @twinkleplop/remark

Highlight fenced code and inline code in a
[remark](https://github.com/remarkjs/remark) pipeline.

```ts
import rehype_stringify from "rehype-stringify";
import remark_parse from "remark-parse";
import remark_rehype from "remark-rehype";
import { unified } from "unified";
import remark_twinkleplop from "@twinkleplop/remark";
import { language as typescript } from "@twinkleplop/typescript";

const pipeline = unified()
  .use(remark_parse)
  .use(remark_twinkleplop, {
    languages: { ts: typescript(), js: "ts" },
  })
  .use(remark_rehype, { allowDangerousHtml: true })
  .use(rehype_stringify, { allowDangerousHtml: true });
```

The plugin replaces each `code` and, when inline code is enabled, each
`inlineCode` node with an mdast `html` node, so a pipeline that continues
into rehype needs `allowDangerousHtml` on `remark-rehype` and on
`rehype-stringify`, as it does for any HTML in markdown. Without it
`remark-rehype` drops the nodes and the code blocks disappear. A pipeline
that stringifies markdown back to markdown keeps the HTML as a block.

Errors name the file and line whenever the tree carries positions.

See [`@twinkleplop/markdown-core`](../markdown-core) for shared options, fence metadata and HTML output.
