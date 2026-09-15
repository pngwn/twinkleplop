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

The plugin replaces each `pre > code` element with the highlighted block,
parsed into hast, so it asks nothing of the rest of the pipeline.

## output

The block is rendered as a string and parsed back into hast, which costs
about as much again as rendering it did — roughly 0.13 ms on a 2 KB block,
or 26 ms across a 200-fence document. A build that would rather keep that
time can take the string as a raw node instead:

```ts
.use(rehype_twinkleplop, { languages, output: "raw" });
```

`"raw"` needs `allowDangerousHtml` on `rehype-stringify` (or `rehype-raw`
before it), as any plugin emitting markup of its own does; without it the
stringifier escapes the block and the page shows the markup as text.

The two modes mean the same markup, but not the same bytes: the default
path is re-serialised by the pipeline's stringifier, which spells entities
its own way (`&#x3C;` where twinkleplop wrote `&lt;`, a bare `'` where it
wrote `&#39;`). `"raw"` reproduces twinkleplop's own bytes, which is what
the markdown-it and remark plugins emit.

The language comes from the `code` element's `language-<name>` class and the
meta string from `data.meta`, which `remark-rehype` sets, or from a
`metastring` attribute for a tree that came from HTML.

Errors name the file and line whenever the tree carries positions.

Every option, every fence meta convention and the output contract are
documented once in
[`@twinkleplop/markdown-core`](../markdown-core), which
[`@twinkleplop/markdown-it`](../markdown-it) and
[`@twinkleplop/remark`](../remark) share: the same options produce the same
HTML for the same fence through any of the three.
