# @twinkleplop/markdown-core

The shared core of [`@twinkleplop/rehype`](../rehype),
[`@twinkleplop/markdown-it`](../markdown-it) and
[`@twinkleplop/remark`](../remark): the language registry, the fence meta
conventions, and the markup around a highlighted block. The three plugins
take the same options and produce the same HTML for the same fence; they
differ only in how they reach a fence and what they hand the result back to.
The markdown-it and remark plugins hand back the string itself; the rehype
plugin parses it into hast by default, so its bytes come from the pipeline's
own stringifier.

Install the plugin for your toolchain, not this package. Everything below
describes all three.

## Setup

```ts
import rehype_twinkleplop from "@twinkleplop/rehype";
import { language as typescript } from "@twinkleplop/typescript";
import { language as css } from "@twinkleplop/css";

.use(rehype_twinkleplop, {
  languages: { ts: typescript({ annotation }), js: "ts", css: css() },
});
```

````markdown
```ts {1,3-4} /total/ :line-numbers=10 title="math.ts"
const total = add(1, 2);
const other = 2;
export { total };
export { other };
```

Inline `const x = 1{:ts}` in prose.
````

## Options

| option | default | meaning |
| --- | --- | --- |
| `languages` | required | fence name to highlight function, `{ highlight, twoslash }`, or the name of another entry |
| `default_language` | none | used by a fence that names no language |
| `on_unknown_language` | `"throw"` | `"plain"` renders the fence as escaped text instead |
| `line_numbers` | `false` | site default; the meta overrides it |
| `inline` | `false` | `"tailing-curly-colon"` highlights `` `code{:lang}` `` |
| `twoslash` | `"meta"` | `"always"` routes every fence through the entry's twoslash highlighter |
| `parse_meta` | none | `(raw, parsed) => render`, for house conventions |
| `render` | `{}` | render options under the per-fence ones |

A highlight function is what a language package's `language(...)` returns, so
fidelity tiers, annotation plugins and every other per-language option are
configured where the entry is created.

### The registry

Values are a highlight function, an entry with a second highlighter for
twoslash fences, or the name of another entry. Aliases resolve transitively
and once, at plugin setup: a fence costs one map lookup, and a cycle, a name
that resolves to nothing, or a `default_language` outside the registry fails
before any document is read.

```ts
languages: {
  ts: { highlight: typescript(), twoslash: create_highlighter({ lang: "ts" }) },
  js: "ts",
  mjs: "js",
}
```

The fence language is the first word of the info string and everything after
it is the meta string. Matching is exact and case sensitive: `TS` is not
`ts`. A fence with no language uses `default_language`, and with none set it
is left exactly as the toolchain rendered it.

One divergence between the toolchains: an mdast or hast tree gives a fence
with no language and an indented code block the same shape, so
`default_language` covers both in rehype and remark, while markdown-it
parses indented code under a rule of its own that the plugin leaves alone.

## Meta conventions

Both families are recognised, so content written for shiki, VitePress or
rehype-pretty-code ports unchanged. Parts no convention claims are ignored
and left for `parse_meta`.

| convention | source | effect |
| --- | --- | --- |
| `{1,3-4}` | shiki / VitePress | `highlight` on those lines |
| `{1,3-4}#id` | rehype-pretty-code | plus `data-highlighted-line-id` |
| `/word/` | shiki | `highlighted-word` on every occurrence, code and comments alike |
| `/word/3-5` | rehype-pretty-code | only the 3rd to 5th occurrences |
| `/word/#id` | rehype-pretty-code | plus `data-chars-id` |
| `:line-numbers`, `:line-numbers=N`, `:no-line-numbers` | VitePress | numbers on, from `N`, off |
| `showLineNumbers`, `showLineNumbers{N}` | rehype-pretty-code | the same two |
| `[title]` | VitePress | title caption |
| `title="…"` | rehype-pretty-code | title caption |
| `caption="…"` | rehype-pretty-code | caption below the block |
| `twoslash` | shiki | route through the entry's twoslash highlighter |

A pattern may hold spaces (`/two words/`) and escape a slash (`/a\/b/`). A
quoted value and a bracket title may hold spaces too. `[!code …]` inside the
body is not a meta convention: it belongs to the registered language's
annotation plugins, and `shiki_notation` from
[`@twinkleplop/annotation`](../annotation) reads it unchanged.

Word ids land on the token spans the wrapper holds rather than on the
wrapper itself, because overlays carry classes and not attributes.

## Output

A fence with no title and no caption is the block alone:

```html
<pre class="twinkleplop language-ts has-highlight" data-language="ts"><code>…</code></pre>
```

A title or a caption wraps it in a figure:

```html
<figure class="twinkleplop-block" data-language="ts">
<figcaption class="twinkleplop-title">math.ts</figcaption>
<pre class="twinkleplop language-ts" data-language="ts"><code>…</code></pre>
<figcaption class="twinkleplop-caption">the running total</figcaption>
</figure>
```

Inline code is `<code class="twinkleplop-inline language-ts">` around the
inline structure (no block, no line elements, `<br>` between lines).

The block itself is whatever the registered highlighter renders, so the
`has-*` classes, line classes, hidden marker bytes and everything else in
[`@twinkleplop/annotation`](../annotation) apply as they do on a direct
call. `class_name` from `render` replaces `twinkleplop`; `language-<name>`
and `data-language` always carry the name the author wrote, alias and all.

The fence body reaches the highlighter as written: entities decoded, tabs
preserved, the fence's trailing newline removed.

## parse_meta

```ts
parse_meta: (raw, parsed) => ({
  ...parsed,
  class_name: raw.includes("danger") ? parsed.class_name + " danger" : parsed.class_name,
});
```

`raw` is the whole meta string, conventions included, and `parsed` is the
render options the recognised conventions produced — the overlays for
`{1,3-4}` and `/word/` among them. The return value is what the fence
renders with, so a site adds house conventions without forking the plugin.

## Twoslash

A fence carrying the `twoslash` meta word uses the entry's `twoslash`
highlighter; every other fence uses `highlight`. `twoslash: "always"` flips
the default for entries that have one. Asking for twoslash on an entry
without one names the fence.

Twoslash fences render through
[`@twinkleplop/twoslash`](../twoslash), which owns its own block markup:
the figure, the title and the caption still come from here, but
`data-language`, the line-number and line-highlight conventions do not reach
inside that block. Set `class_name` on the twoslash highlighter to style it.

## Diagnostics

Annotation issues surface however the registered highlighter was configured:
an `on_error` sink still receives them, and an error the highlighter throws
keeps its class and stack and only gains the position the toolchain knew
about. Everything the plugin owns names the fence, and the file and line when
the toolchain provides them:

```
unknown fence language "rust" at docs/guide.md:41
line 3 is beyond the fence's 2 lines (`ts` fence at docs/guide.md:41)
two title conventions (`ts` fence at docs/guide.md:41)
```

A line reference beyond the fence is an error rather than silently ignored,
so a typo in a docs range fails the build instead of quietly highlighting
nothing. A `/word/` with no occurrence is not an error: it renders normally.
