# Twoslash options: custom tags, error fallback, docs hooks

## Summary
`@twinkleplop/twoslash` and `@twinkleplop/twoslash-svelte` already produce
the same kinds of decoration as shiki's twoslash transformer (hover, query,
error, completion, tag). What is missing is the operating surface around
them: twoslash's custom tags work without configuration, a snippet the type
checker rejects can fall back instead of throwing, JSDoc can be rendered
rather than escaped, and doc tags are split so they can be laid out.

## User-facing behavior
A site creates one highlighter:

```ts
const highlight = create_highlighter({
  lang: "ts",
  on_error: (_error, code) => plain_ts(code),
  render_docs: (md) => marked.parseInline(md),
});
```

A snippet with `// @log: hello` renders a tag line without the author or
site declaring the tag. A snippet with an unlisted type error renders as
plain highlighted code instead of failing the build. A hover over a
documented symbol shows its JSDoc prose with `**bold**` rendered, and its
`@param` tags as separate labelled entries. The same options work in the
Svelte package.

## Behavioral requirements
1. `custom_tags` defaults to `["annotate", "log", "warn", "error"]`. Any
   `// @<tag>: text` line whose tag is in the list renders as a tag
   decoration on the following line, as twoslash defines. Tags given in the
   raw `twoslash` option are merged with the list.
2. `on_error(error, code)` is called whenever twoslash rejects the snippet
   (unlisted compiler errors, unknown flags, syntax it cannot process). If
   it returns a string, that string is the result of the highlight call. If
   it returns nothing, the original error is thrown as today.
3. `render_docs(markdown)` is called once per documented hover, query or
   completion entry with the raw JSDoc description, and once per doc-tag
   value. Its return value is inserted as-is inside the docs element. When
   the option is absent, docs are HTML-escaped text as today.
4. `process_type(type)` is called with the type string of every hover and
   query before it is syntax-highlighted; its return value is what is
   highlighted and shown. Default is identity.
5. `docs_tags` defaults to `"split"`: each JSDoc tag renders as its own
   element carrying the tag name, and for tags that name a parameter, the
   parameter name is a separate element. `"raw"` keeps today's single
   escaped block.
6. Every option above is accepted, with identical meaning, by
   `create_highlighter` and `highlight` in both the TypeScript and the
   Svelte package.
7. Snippets that use none of these features render byte-identically to
   today when `docs_tags: "raw"` is set; the only default-visible change is
   the split tag markup and the pre-registered custom tags.

## External interface
```ts
interface HighlightOptions {
  lang?: "ts" | "tsx" | "js" | "jsx";          // ts package only; svelte package fixes the language
  class_name?: string;
  twoslash?: TwoslashOptions;
  custom_tags?: string[];                      // default ["annotate", "log", "warn", "error"]
  on_error?: (error: unknown, code: string) => string | void;
  render_docs?: (markdown: string) => string;  // trusted HTML
  process_type?: (type: string) => string;
  docs_tags?: "split" | "raw";                 // default "split"
}
```
Hover markup with `render_docs` and split tags:

```html
<span class="twoslash-hover"><span class="twoslash-target">…</span><span class="twoslash-popover">
  <span class="twoslash-popover-type">…highlighted type…</span>
  <span class="twoslash-popover-docs">Adds two numbers. <strong>Bold</strong> and <code>code</code>.</span>
  <span class="twoslash-popover-tags">
    <span class="twoslash-popover-tag" data-tag="param"><span class="twoslash-popover-tag-name">a</span> first</span>
    <span class="twoslash-popover-tag" data-tag="returns">the sum</span>
  </span>
</span></span>
```

## Edge cases & error behavior
- `on_error` itself throwing propagates that error, not the original.
- `render_docs` output is trusted: the caller is responsible for
  sanitising untrusted JSDoc. The option's documentation says so.
- A tag with no value (`@deprecated`) renders with an empty value element.
- `custom_tags: []` disables all custom tags; `// @log:` then fails as an
  unknown flag and reaches `on_error`.
- A completion list entry with docs goes through `render_docs` like a hover.
- `process_type` returning an empty string renders an empty type element.

## Acceptance criteria
- [ ] `// @log: hello` renders a `twoslash-tag` with `data-tag-name="log"` using default options in both packages.
- [ ] A snippet with an unlisted error returns the string produced by `on_error`; with no `on_error` it throws the same error as today.
- [ ] With `render_docs: (md) => "<em>" + md + "</em>"`, the hover docs element contains `<em>…</em>` unescaped; without it the same JSDoc renders escaped.
- [ ] A JSDoc block with two `@param` tags and one `@returns` renders three `twoslash-popover-tag` elements with the documented attributes and children.
- [ ] `docs_tags: "raw"` reproduces today's markup exactly.
- [ ] `process_type` receives every hover type string and its output is what appears in the popover.
- [ ] The Svelte package's snapshot tests pass with the same options applied.

## Dependencies
- Depends on: [core](./core.md)
- Depended on by: [markdown_integration](./markdown_integration.md) (passes these through per fence)

## Open questions
- Adopt shiki's default type cleanup (strip `import("…").` prefixes and
  `node_modules` paths) as the `process_type` default? Today's default is
  identity so existing snapshots hold.
- One `render_docs` for both block prose and inline tag values, or a
  separate inline hook as shiki has. One hook is specified; split it if a
  markdown renderer cannot do inline mode.

## Out of scope
- Per-part markup overrides (shiki's `hast` extension points). Classes are
  the styling surface.
- Rendering example fences inside JSDoc with twinkleplop recursively; a
  site's `render_docs` may do so.
- A completion icon set.
