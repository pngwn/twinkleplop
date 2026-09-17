# @twinkleplop/markdown-core

Shared language configuration, fence metadata and HTML rendering for [`@twinkleplop/rehype`](../rehype), [`@twinkleplop/markdown-it`](../markdown-it) and [`@twinkleplop/remark`](../remark).

All three plugins use the options below. markdown-it and remark return HTML strings. rehype parses the HTML into hast nodes by default, which are then serialised by the pipeline's stringifier.

Install the plugin for your markdown processor. It includes this package as a dependency.

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
| `parse_meta` | none | `(raw, parsed) => render`, for custom metadata |
| `render` | `{}` | render options under the per-fence ones |

A highlight function is what a language package's `language(...)` returns, so
fidelity tiers, annotation plugins and every other per-language option are
configured where the entry is created.

### Language registry

Values are a highlight function, an entry with a second highlighter for
twoslash fences, or the name of another entry. Aliases can refer to other aliases and are resolved during setup. Circular aliases, missing entries and an unregistered `default_language` cause setup errors.

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

In rehype and remark, `default_language` applies to both indented code blocks and fences without a language. In markdown-it, it applies only to fences. Indented blocks use markdown-it's existing renderer.

## Meta conventions

The plugins support the Shiki, VitePress and rehype-pretty-code conventions below. Use `parse_meta` for custom metadata.

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

Word IDs are added to the token spans inside the overlay wrapper. The wrapper supports classes only.

## Output

A fence without a title or caption renders as a code block:

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

The registered highlighter renders the block. Classes and hidden ranges from [`@twinkleplop/annotation`](../annotation) work as they do when calling it directly. `class_name` from `render` replaces `twinkleplop`; `language-<name>`
and `data-language` use the language name written in the fence, including aliases.

The fence body reaches the highlighter as written: entities decoded, tabs
preserved, the fence's trailing newline removed.

## parse_meta

```ts
parse_meta: (raw, parsed) => ({
  ...parsed,
  class_name: raw.includes("danger") ? parsed.class_name + " danger" : parsed.class_name,
});
```

`raw` contains the complete metadata string. `parsed` contains render options from recognised conventions, including overlays for `{1,3-4}` and `/word/`. Return the render options to use for the fence.

## Twoslash

A fence marked `twoslash` uses the entry's Twoslash highlighter. Other fences use `highlight`. Set `twoslash: "always"` to use Twoslash by default where available. Requesting Twoslash for an entry without a Twoslash highlighter throws an error identifying the fence.

Twoslash fences render through
[`@twinkleplop/twoslash`](../twoslash), which owns its own block markup:
the figure, the title and the caption still come from here, but
`data-language`, the line-number and line-highlight conventions do not reach
inside that block. Set `class_name` on the twoslash highlighter to style it.

## Diagnostics

Annotation issues use the highlighter's configured `on_error` handler. Errors thrown by the highlighter keep their class and stack. Plugin errors identify the fence and include the file and line when available:

```
unknown fence language "rust" at docs/guide.md:41
line 3 is beyond the fence's 2 lines (`ts` fence at docs/guide.md:41)
two title conventions (`ts` fence at docs/guide.md:41)
```

A line reference beyond the end of a fence throws an error. A `/word/` pattern with no matches renders normally.
