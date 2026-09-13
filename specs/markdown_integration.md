# Markdown integration

## Summary
A family of plugins, one per markdown toolchain (rehype, markdown-it,
remark), sharing one core: they find fenced code blocks and inline code,
pick a twinkleplop language from a registry, read the fence meta string for
the conventions documentation sites use, and render through the options the
other specs add. This is where shiki's ecosystem features (line ranges in
meta, word highlights, titles, line-number switches, twoslash triggers)
actually live, and it is the largest single gap.

## User-facing behavior
An author writes:

````markdown
```ts {1,3-4} /total/ :line-numbers=10 title="math.ts"
const total = add(1, 2);
const other = 2;
export { total };
export { other };
```

Inline `const x = 1{:ts}` in prose.
````

A site configures one plugin:

```ts
import rehype_twinkleplop from "@twinkleplop/rehype";
import { language as typescript } from "@twinkleplop/typescript";
import { language as css } from "@twinkleplop/css";

.use(rehype_twinkleplop, {
  languages: { ts: typescript({ annotation }), js: "ts", css: css() },
})
```

and the fence becomes a figure with a `math.ts` caption, line numbers from
10, lines 1, 3 and 4 highlighted and every `total` wrapped; the inline code
becomes highlighted spans in the paragraph. `md.use(markdown_it_twinkleplop,
options)` and `.use(remark_twinkleplop, options)` behave the same with the
same options.

## Behavioral requirements

### Registry and language selection
1. `languages` maps a fence name to a twinkleplop highlight function
   (`language(...)` result) or to the name of another entry (an alias).
   Aliases resolve transitively; a cycle is a configuration error at plugin
   setup.
2. The fence language is the first word of the info string; everything
   after it is the meta string. Matching is exact and case-sensitive.
3. A fence with no language uses `default_language` when set, otherwise it
   is left untouched.
4. A fence naming a language absent from the registry throws an error that
   names the language and, when the toolchain provides it, the file and
   line. `on_unknown_language: "plain"` instead renders the fence as
   escaped plain text inside the standard block markup with
   `data-language` set to the unknown name.

### Block output
5. Every highlighted fence renders as
   `<figure class="twinkleplop-block" data-language="ts">` containing an
   optional `<figcaption class="twinkleplop-title">` (only when a title is
   present), then the `<pre class="twinkleplop language-ts" data-language="ts">`
   block, then an optional `<figcaption class="twinkleplop-caption">` (only
   when a caption is present).
6. The fence body is passed to the highlighter exactly as written: entities
   decoded, tabs preserved, trailing newline removed.

### Meta conventions
7. The meta string is parsed for the conventions below. Recognised parts
   are removed; unrecognised parts are ignored and left for `parse_meta`.

   > **To discuss.** All known conventions are listed so nothing is
   > forgotten; the set twinkleplop commits to, and which family wins where
   > two conflict, is not decided. See *Open questions*.

   | convention | source | effect |
   | --- | --- | --- |
   | `{1,3-4}` | shiki / VitePress | line-mode `highlight` on those lines |
   | `{1,3-4}#id` | rehype-pretty-code | as above plus a `data-highlighted-line-id` attribute on those lines |
   | `/word/` | shiki | token-mode `highlighted-word` on every occurrence, code and comments alike |
   | `/word/3-5` | rehype-pretty-code | only the 3rd to 5th occurrences |
   | `/word/#id` | rehype-pretty-code | as `/word/` plus `data-chars-id` on the wrappers |
   | `:line-numbers`, `:line-numbers=N`, `:no-line-numbers` | VitePress | `line_numbers` on / from N / off, overriding the site default |
   | `showLineNumbers`, `showLineNumbers{N}` | rehype-pretty-code | same as above |
   | `[title]` | VitePress | title caption |
   | `title="…"` | rehype-pretty-code | title caption |
   | `caption="…"` | rehype-pretty-code | caption below the block |
   | `twoslash` | shiki | route the fence through the registry entry's twoslash highlighter |
   | `[!code …]` in the body | shiki | handled by the compat plugin if the registered language has it |

8. `line_numbers` (site default) applies when the meta says nothing;
   `:line-numbers=N` and `showLineNumbers{N}` set the start.
9. `parse_meta(raw, parsed)` receives the raw meta string and the render
   options and overlays derived from it, and returns the render options to
   use. Sites implement house conventions here without forking the plugin.

### Inline code
10. `inline: "tailing-curly-colon"` treats `` `code{:lang}` `` as
    highlighted inline code: the `{:lang}` suffix is removed and the code is
    rendered with inline structure inside
    `<code class="twinkleplop-inline language-lang">`. `inline: false`
    (default) leaves inline code alone.
11. An unknown inline language follows `on_unknown_language`.

### Twoslash
12. A registry entry may be `{ highlight, twoslash }`. A fence carrying the
    `twoslash` meta word, or any fence when `twoslash: "always"` is set,
    uses the entry's twoslash highlighter; fences without it never do.

### Diagnostics and toolchain parity
13. Annotation issues surface however the registered highlighter was
    configured; the plugin adds file and line to thrown errors when the
    toolchain provides them.
14. The three plugins accept the same options and produce the same HTML for
    the same fence. Toolchain-specific output structure (rehype replaces
    the `pre > code` element; remark emits an HTML node; markdown-it
    replaces the fence renderer) is the only difference.

## External interface
```ts
interface markdown_options {
  languages: Record<string, ((code: string, render?: RenderOptions) => string) | string>;
  default_language?: string;
  on_unknown_language?: "throw" | "plain";      // default "throw"
  line_numbers?: boolean | { start?: number };  // site default
  inline?: false | "tailing-curly-colon";       // default false
  twoslash?: "meta" | "always";                 // default "meta"
  parse_meta?: (raw: string, parsed: RenderOptions) => RenderOptions;
  render?: RenderOptions;                       // defaults merged under per-fence options
}
// @twinkleplop/rehype       default export: rehype plugin
// @twinkleplop/markdown-it  default export: markdown-it plugin
// @twinkleplop/remark       default export: remark plugin (emits html nodes)
```
Output for the fence in *User-facing behavior*:

```html
<figure class="twinkleplop-block" data-language="ts">
<figcaption class="twinkleplop-title">math.ts</figcaption>
<pre class="twinkleplop language-ts has-highlight has-highlighted-word" data-language="ts"><code>
<span class="l highlight"><span class="ln">10</span><span class="tok keyword">const</span> <span class="tok highlighted-word"><span class="tok constant">total</span></span> …</span>
<span class="l"><span class="ln">11</span>…</span>
<span class="l highlight"><span class="ln">12</span>…</span>
<span class="l highlight"><span class="ln">13</span>…</span>
</code></pre>
</figure>
```

## Edge cases & error behavior
- A line range in meta beyond the fence's last line is an error naming the
  fence (a typo in docs should fail the build, matching shiki's
  transformers which silently ignore it is the alternative; see open
  questions).
- A `/word/` with no occurrence renders normally.
- A title containing `"` or `<` is escaped in the caption.
- A fence body that is empty renders an empty block with the figure and
  captions.
- Two title conventions on one fence (`[a] title="b"`) is an error naming
  the fence.
- Meta parsing never touches the body; markers in the body belong to the
  registered language's annotation plugins.

## Acceptance criteria
- [ ] The example fence renders the documented HTML through each of the three plugins.
- [ ] `js` aliased to `ts` renders identically to a `ts` fence with `data-language="js"`.
- [ ] A `rust` fence with no `rust` entry throws an error containing `rust` and the source location; with `on_unknown_language: "plain"` it renders escaped text in the block markup.
- [ ] `{2}` on a two-line fence highlights line 2; `{3}` throws naming the fence.
- [ ] `:line-numbers=5` numbers from 5; `:no-line-numbers` on a site with `line_numbers: true` renders no numbers.
- [ ] `` `x{:ts}` `` in a paragraph renders inline structure inside `code.twinkleplop-inline.language-ts` when `inline` is enabled and is untouched when it is not.
- [ ] A fence with `twoslash` in its meta uses the entry's twoslash highlighter; without it, the plain one.
- [ ] `parse_meta` receives `{1}` already turned into an overlay and can add a `class_name`.
- [ ] The rehype and markdown-it plugins process a 200-fence document without re-creating highlighters per fence.

## Dependencies
- Depends on: [core](./core.md), [render_options](./render_options.md), [overlays_option](./overlays_option.md), [inline_and_hooks](./inline_and_hooks.md), [twoslash_options](./twoslash_options.md)
- Recommends: [focus_and_shiki_notation](./focus_and_shiki_notation.md) for ported content
- Depended on by: none

## Open questions
- **Which meta conventions to commit to.** The table lists both the
  shiki/VitePress family and rehype-pretty-code's. Candidates for dropping:
  `#id` groups, `/word/3-5`, `caption=`. Decide before implementation; the
  parser should be one function with a table so adding or removing a
  convention is a one-line change.
- Whether an out-of-range line ref is an error or ignored (shiki ignores).
- Whether the figure wrapper should be omitted when there is no title or
  caption, giving bare `<pre>` output like shiki.
- A `copy` control convention (`copy=false` as on svelte.dev): presentation,
  probably a site concern.
- Caching across builds: a site concern for now; a `cache` adapter could be
  added later.

## Out of scope
- Code groups / tabs, snippet imports (`<<< file`), playground links: they
  operate above a single fence and belong to a snippet orchestration layer.
- Any CSS. The classes above are the contract.
- Parsing markers inside the body; that is the annotation system.
