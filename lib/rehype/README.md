# @twinkleplop/rehype

Highlight fenced code and inline code in a
[rehype](https://github.com/rehypejs/rehype) pipeline.

```ts
import rehype_stringify from "rehype-stringify";
import remark_parse from "remark-parse";
import remark_rehype from "remark-rehype";
import { unified } from "unified";
import rehype_twinkleplop from "@twinkleplop/rehype";
import { language as typescript } from "@twinkleplop/typescript";

const pipeline = unified()
  .use(remark_parse)
  .use(remark_rehype)
  .use(rehype_twinkleplop, {
    languages: { ts: typescript(), js: "ts" },
  })
  .use(rehype_stringify);
```

The plugin replaces each `pre > code` element with highlighted HTML parsed into hast nodes.

## output

Parsing the HTML adds processing time. Set `output: "raw"` to return the highlighted string as a raw node:

```ts
.use(rehype_twinkleplop, { languages, output: "raw" });
```

`"raw"` needs `allowDangerousHtml` on `rehype-stringify` (or `rehype-raw`
before it), otherwise the stringifier escapes the block and displays the HTML as text.

Both modes render the same code. In the default mode, the pipeline's stringifier may use different HTML entities, such as `&#x3C;` for `&lt;`. Raw mode preserves Twinkleplop's HTML string, as the markdown-it and remark plugins do.

The language comes from the `code` element's `language-<name>` class and the
meta string from `data.meta`, which `remark-rehype` sets, or from a
`metastring` attribute for a tree that came from HTML.

Errors name the file and line whenever the tree carries positions.

See [`@twinkleplop/markdown-core`](../markdown-core) for shared options, fence metadata and HTML output.
