# Svelte.dev code renderer extensions

This document analyses the code-related behavior in Svelte.dev's
[`renderer.ts`](https://github.com/sveltejs/svelte.dev/blob/main/packages/site-kit/src/lib/markdown/renderer.ts)
and maps it onto twinkleplop.

The source was reviewed from the `main` branch on 2026-07-26. This is an
analysis of behavior visible in the renderer code, not a proposal to reproduce
its implementation verbatim.

## Scope

Included:

- fenced code block parsing and metadata;
- syntax highlighting and type information;
- code annotations, variants, groups, and controls;
- code sent to the Svelte playground;
- code-specific normalization, validation, and caching.

Excluded because it does not operate on displayed code:

- heading slugs and permalink markup;
- smart quotes in prose;
- blockquote callouts such as `[!NOTE]`, `[!DETAILS]`, and `[!LEGACY]`;
- spacing inserted between adjacent inline code spans.

## What the renderer is doing

The renderer is more than a syntax highlighter. It combines four layers:

1. **Markdown adaptation** — recognizes fenced blocks and document-level
   comments that group several fences.
2. **Snippet compilation** — extracts metadata, produces JS/TS variants,
   masks authoring annotations, and constructs playground files.
3. **Code intelligence** — runs Shiki and, for JS/TS, Twoslash.
4. **Presentation and build infrastructure** — emits tabs and controls,
   post-processes tooltip HTML, and caches rendered snippets.

Twinkleplop should not put all four layers into `@twinkleplop/core`. Core
already owns tokenization and basic HTML rendering. The closest equivalent
should be an optional snippet orchestration package that calls core, the
annotation package, and the existing Twoslash packages.

## Feature inventory

| Feature                            | Use case / requirement                                                                  | Svelte.dev syntax                                                               | Expected output                                                                       | Twinkleplop status                                                              |
| ---------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Language dispatch and highlighting | Select the correct grammar and fail visibly for unsupported languages                   | Fence info strings such as `js` or `svelte`                                     | Highlighted `<pre data-language="…">` using CSS-variable token colors                 | Mostly present; needs a Markdown-facing language registry                       |
| Snippet metadata                   | Give a snippet a filename and configure controls                                        | `/// file:`, `<!--- file: --->`, `### file:`, plus `copy:` and `link:`          | Metadata is removed from visible code; filename/copy controls are emitted             | New snippet metadata plugin                                                     |
| Single-file controls               | Make named or convertible snippets easier to use                                        | Metadata plus a normal fence                                                    | Filename, copy button, and optional JS/TS toggle above the code                       | New renderer/view layer                                                         |
| Multi-file code groups             | Present a runnable example as file tabs                                                 | `<!-- codeblock:start {…} -->` and `<!-- codeblock:end -->` around named fences | Accessible tabs, panels, shared controls, and a playground link                       | New Markdown block plugin                                                       |
| Playground payloads                | Open the complete example without reconstructing it in the browser                      | Implicit in a code group                                                        | All files serialized into a compressed URL fragment                                   | New playground adapter                                                          |
| Inline highlights and diffs        | Explain additions, removals, or a region of interest without using a separate diff file | `+++added+++`, `---removed---`, `:::highlighted:::`                             | Marker-free code wrapped in `highlight add`, `highlight remove`, or `highlight` spans | Already expressible with twinkleplop annotations; optional compatibility parser |
| JS-to-TS variants                  | Maintain one JS example while showing a useful TS equivalent                            | A named `.js` fence, or a named `.svelte` fence with a plain `<script>`         | Parallel `data-js` and `data-ts` code blocks controlled by a checkbox                 | New source-variant plugin                                                       |
| Type checking and hovers           | Verify docs examples and expose inferred types                                          | JS/TS fences; ordinary Twoslash directives remain available                     | Twoslash hover, diagnostic, query, completion, and tag markup                         | Present in `@twinkleplop/twoslash`; Svelte support also exists separately       |
| Hidden type context                | Type-check a concise visible snippet using declarations that should not be displayed    | `// ---cut---`; a renderer-supplied banner has no author syntax                 | Hidden prelude participates in analysis but not rendered code                         | Needs orchestration around the existing Twoslash packages                       |
| Rich hover documentation           | Make API documentation in a hover readable and code-aware                               | JSDoc attached to referenced symbols                                            | Markdown in docs, formatted tags, highlighted examples                                | Partial; twinkleplop currently escapes docs as text                             |
| Documentation reference links      | Link an imported API's hover to its canonical reference page                            | Normal named imports plus a renderer `references` map                           | A `reference` link inside the symbol's Twoslash popup                                 | New semantic-decoration hook                                                    |
| Source preservation                | Avoid Markdown parser normalization changing displayed code                             | No additional syntax                                                            | HTML entities decoded and indentation preserved as intended                           | Core preserves source; Markdown adapter must retain raw fence text              |
| Code-output normalization          | Keep blank lines and multiline comments visually stable                                 | No additional syntax                                                            | Preserved empty lines and optional per-line wrapped comment spans                     | Blank lines already work; wrapped-comment presentation is optional              |
| Authoring diagnostics              | Fail early on ambiguous or unsupported snippet construction                             | Invalid groups, filenames, languages, or `diff` fences                          | Build-time error naming the offending snippet/document                                | New orchestration diagnostics                                                   |
| Snippet caching                    | Prevent Twoslash and highlighting from dominating docs builds                           | No author syntax                                                                | Memory/disk reuse with automatic invalidation                                         | New host-level cache, not a core tokenizer concern                              |

## 1. Language dispatch and syntax highlighting

### Requirement

A Markdown code fence needs to select a language implementation, use a
consistent theme contract, and report unsupported language names instead of
silently rendering plain text.

### Syntax

````markdown
```ts
const answer: number = 42;
```
````

The renderer preloads JavaScript, TypeScript, Svelte, CSS, Bash, YAML, TOML,
INI, dotenv, Markdown, JSONC, shell-session, and HTTP Shiki grammars. A
separate alias map resolves additional fence names. `dts` is highlighted as
TypeScript; `yml` is treated as YAML.

### Expected output

The Shiki `<pre>` receives `data-language="<fence language>"`. Token colors
refer to a CSS-variable theme rather than hard-coded colors. An unknown
language reaches Shiki and causes an error instead of silently falling back.

### Twinkleplop implementation

The tokenizer and HTML renderer already exist. A Markdown adapter needs a
registry resembling:

```ts
type LanguageRegistry = Record<
  string,
  {
    highlight(source: string): string;
    canonical_name: string;
  }
>;
```

The registry should include aliases such as `js` → `javascript`, `ts` →
`typescript`, and `dts` → `typescript`. A missing entry should produce a
document diagnostic containing the fence language and source document.

This belongs above `@twinkleplop/core`; adding Markdown names to individual
grammars would couple the tokenizer to one document format.

## 2. Snippet metadata

### Requirement

Docs examples often represent real files. A visible filename improves
orientation, supplies a virtual filename to the type checker, determines
whether JS-to-TS conversion is appropriate, and becomes the playground
filename. Authors also need to opt controls in or out.

### Svelte.dev syntax

The renderer recognizes three comment styles:

```js
/// file: src/lib/example.js
/// copy: false
/// link: false
const answer = 42;
```

```svelte
<!--- file: src/lib/Example.svelte --->
<!--- copy: false --->
<h1>Hello</h1>
```

```yaml
### file: workflow.yml
name: CI
```

The extra dash in the Svelte/HTML comment is intentional. It keeps this
metadata distinct from ordinary HTML comments.

`file` values must contain a dot. The renderer removes all recognized metadata
lines before highlighting and before building the playground file.

### Expected output

For a named single-file snippet:

```html
<div class="code-block">
  <div class="controls">
    <span class="filename" data-ext=".js">example</span>
    <button class="copy-to-clipboard raised" aria-label="Copy to clipboard"></button>
  </div>
  <pre data-language="js">…</pre>
</div>
```

The filename is split into a base name and extension for styling.

### Observed upstream inconsistencies

These are behaviors in the reviewed code, not recommended contracts:

- The prose comment says named files get a copy button by default. The actual
  parser enables copy for every non-empty, non-`dts` fence language, whether or
  not the snippet has a filename.
- `link` is parsed but is not consulted when reference links are injected.
- The `link` switch case falls through to `copy`, so `link: false` also sets
  `copy: false`, and `link: true` also sets `copy: true`.

Twinkleplop should define and test these as independent options.

### Twinkleplop implementation

An annotation plugin is not sufficient: current annotation plugins can only
emit source overlays. Metadata changes snippet identity and outer UI.

Add a pre-highlight metadata extension to the proposed snippet layer:

```ts
interface ParsedSnippet {
  source: string;
  language: string;
  metadata: {
    file?: string;
    copy?: boolean;
    reference_links?: boolean;
  };
}

interface SnippetMetadataPlugin {
  parse(input: { source: string; language: string }): ParsedSnippet;
}
```

The Svelte.dev comments can be supported as a compatibility plugin, but a
document-native syntax is less invasive:

````markdown
```js file="src/lib/example.js" copy=false references=false
const answer = 42;
```
````

If the Markdown parser already exposes fence attributes, no marker has to be
put into the source at all. A programmatic API should also allow callers to
pass the metadata separately.

## 3. Single-file controls

### Requirement

Controls are only useful when their associated capability exists. Unnamed,
non-copyable, single-variant code should not gain an empty toolbar.

### Syntax

Controls are inferred from metadata and produced variants. There is no
additional directive.

### Expected output

The toolbar is emitted if any of these are true:

- a filename exists;
- copying is enabled;
- more than one source variant was produced.

The JS/TS checkbox is only present for a converted snippet. It is checked by
default and is labelled for assistive technology. The renderer emits the
markup; client CSS and JavaScript elsewhere must implement copying and
visibility switching.

### Twinkleplop implementation

This should be a view-model/render concern, not a token concern:

```ts
interface SnippetView {
  files: SnippetFileView[];
  controls: {
    copy: boolean;
    variant_toggle?: { first: string; second: string; selected: string };
  };
}
```

The default HTML renderer can emit compatible markup, while a Svelte, React,
or server-rendered consumer can render the same view model differently.
Twinkleplop should not require DOM behavior in core.

## 4. Multi-file code groups

### Requirement

A tutorial example frequently consists of several files that need to be
viewed together, switched accessibly, copied, and opened as one runnable
project.

### Svelte.dev syntax

````markdown
<!-- codeblock:start {"title":"Counter demo","selected":"App.svelte"} -->

```svelte
<!--- file: App.svelte --->
<script>
  import Counter from './Counter.svelte';
</script>
```

```svelte
<!--- file: Counter.svelte --->
<button>0</button>
```

<!-- codeblock:end -->
````

The JSON is optional. Defaults are:

- `title`: `"Demo (from docs)"`;
- `selected`: `"App.svelte"`.

Groups cannot nest. Every fence inside a group must have a filename.

### Expected output

The group becomes one outer `.code-block` containing:

- a tablist labelled `Files`;
- one button per file with `role="tab"`, stable tab/panel IDs,
  `aria-controls`, `aria-selected`, and roving `tabindex`;
- a matching `role="tabpanel"` per file;
- a shared playground link;
- a shared copy button;
- a JS/TS toggle if any file has a generated TS variant.

The selected filename controls the initially visible panel.

### Twinkleplop implementation

This requires a Markdown AST or token-stream extension that can consume
several sibling fences as one node. It should produce a `SnippetGroup` before
highlighting:

```ts
interface SnippetGroup {
  title?: string;
  selected_file?: string;
  files: ParsedSnippet[];
}
```

Alternative syntaxes are preferable to raw HTML comments where the host
supports them:

```md
:::code-group title="Counter demo" selected="App.svelte"
...fences...
:::
```

or an explicit API:

```ts
render_code_group({
  title: "Counter demo",
  selected_file: "App.svelte",
  files,
});
```

This is a `@twinkleplop/snippets` or site-integration feature, not a grammar or
annotation feature.

## 5. Playground payloads

### Requirement

The displayed example and the runnable example must use the same files without
shipping an additional server-side lookup table.

### Syntax

There is no separate author syntax. A completed code group supplies the title
and files.

### Expected output

At the end marker the renderer:

1. collects each named file;
2. uses code with metadata and highlight delimiters removed;
3. creates a playground object containing the title and files;
4. compresses and encodes it;
5. emits `/playground/untitled#<payload>`.

The URL fragment keeps the payload on the client side. The generated object
sets `tailwind: false`.

### Twinkleplop implementation

Expose this as a host adapter:

```ts
interface PlaygroundAdapter {
  create_href(group: SnippetGroup): Promise<string> | string;
}
```

Twinkleplop should not bake in the Svelte playground schema or URL. A Svelte
adapter can reproduce it; another consumer could target StackBlitz, a local
REPL, or no playground at all.

The adapter must receive clean source, not rendered HTML and not source still
containing authoring markers.

## 6. Inline highlights and diff annotations

### Requirement

Documentation needs to focus attention on a code range, show a conceptual
addition, or show code being removed while still syntax-highlighting the
underlying language.

### Svelte.dev syntax

```js
const unchanged = 1;
+++const added = 2;+++
---const removed = 3;---
:::const important = 4;:::
```

The delimiters mean:

| Delimiter | Output class       |
| --------- | ------------------ |
| `+++…+++` | `highlight add`    |
| `---…---` | `highlight remove` |
| `:::…:::` | `highlight`        |

The content must not begin or end with a space. A range may cross highlighted
token spans or lines; the post-processor repairs span boundaries and reopens
the wrapper on each line.

A `diff` fence is rejected. Authors are required to annotate code in its real
language so it retains that language's highlighting.

For JS/TS, removed ranges are replaced with equal-length spaces before
Twoslash runs. This prevents deleted code from causing type errors or duplicate
declarations. The original text is restored in the rendered result.

For Markdown and YAML fences, a leading pair of `---` frontmatter delimiters is
excluded from annotation parsing.

### Expected output

Markers disappear from displayed and playground code:

```html
<span class="highlight add">const added = 2;</span>
<span class="highlight remove">const removed = 3;</span>
<span class="highlight">const important = 4;</span>
```

### Twinkleplop implementation

Twinkleplop already has a safer, language-aware alternative in
`@twinkleplop/annotation`:

```js
const added = 2; // [!add]
const removed = 3; // [!del]
const important = 4; // [!hl]
```

Token-range forms can highlight only part of a line:

```js
const answer = compute(value); // [!hl compute...value]
```

The built-in `add`, `del`, and `hl` plugins emit `diff-add`, `diff-del`, and
`highlight` overlays. The renderer already removes marker-only comments and
applies line- or token-mode classes.

Two additions are needed for full parity:

1. The snippet/Twoslash adapter should be able to mask selected ranges from the
   **analysis source** while retaining them in the **display source**. This is
   necessary when removed code would make Twoslash fail.
2. An optional compatibility preprocessor can parse `+++`, `---`, and `:::`.
   It should not become the preferred syntax because it collides with valid
   source and requires the Markdown/YAML frontmatter exception.

A useful source contract is:

```ts
interface SnippetSource {
  display_source: string;
  analysis_source: string;
  delivered_source: string;
  mappings: SourceMapping[];
}
```

The three forms may differ, but mappings must keep semantic ranges aligned with
the displayed source.

## 7. Automatic JS-to-TS variants

### Requirement

Svelte's documentation serves JavaScript and TypeScript users. Maintaining two
hand-written examples invites drift, so the renderer derives a TS version when
the JavaScript contains sufficient JSDoc type information.

### Syntax

A filename opts a JS or Svelte fence into conversion:

```js
/// file: example.js
/** @param {string} name */
export function greet(name) {
  return `Hello ${name}`;
}
```

For Svelte, conversion is attempted only when a plain instance
`<script>…</script>` exists. The generated version changes it to
`<script lang="ts">`.

No conversion is attempted for:

- unnamed snippets;
- `svelte.config.js`;
- Svelte snippets without a plain `<script>`;
- snippets whose supported transformations would not change the source.

### Conversion performed

The TypeScript AST and source-preserving edits convert the subset used in the
docs:

- JSDoc `@type` to annotations or `as` assertions;
- `@param` to parameter annotations;
- `@returns` to return annotations;
- `@satisfies` to the `satisfies` operator;
- supported function declarations, variable declarations, object methods,
  and arrow-function properties;
- `import("module").Type` references to generated `import type` statements.

Unsupported JSDoc shapes fail rather than being guessed.

### Expected output

The original and generated renderings are siblings:

```html
<input class="ts-toggle raised" checked type="checkbox" aria-label="Toggle JS/TS" />
<pre data-js data-language="js">…</pre>
<pre data-ts data-language="ts">…</pre>
```

The client chooses which `pre` is visible. The original source remains the
playground file.

### Twinkleplop implementation

Add an optional source-variant plugin:

```ts
interface SnippetVariantPlugin {
  transform(input: ParsedSnippet): Promise<SnippetVariant[]> | SnippetVariant[];
}

interface SnippetVariant {
  id: string;
  label: string;
  language: string;
  source: SnippetSource;
}
```

The converter should be its own package because it depends on the TypeScript
compiler and contains policy specific to docs authoring. Core should only
render the variants it is given.

An equally valid alternative is explicit paired source:

````markdown
```js variant="js" file="example.js"
…
```

```ts variant="ts" file="example.ts"
…
```
````

That avoids conversion limits but requires authors to maintain both versions.

## 8. Twoslash type checking and hovers

### Requirement

Code in documentation should be checked against the installed library types,
and readers should be able to inspect inferred types without leaving the page.

### Syntax

Ordinary JS and TS fences are checked by default. Twoslash's own source
directives can also be used, for example:

```ts
const point = { x: 1, y: 2 };
//    ^?
```

The top-level renderer option `check: false` disables the Twoslash transformer.
`dts`, YAML, and YML use syntax highlighting only.

### Expected output

The highlighter emits Twoslash hover wrappers and popups around symbols.
Compiler error meta-lines are removed from the final HTML by this renderer,
while hover documentation and supported tags are retained and reformatted.

The type checker is configured for JavaScript checking, bundler-style module
resolution, and the installed Svelte/SvelteKit types.

### Twinkleplop implementation

This is largely present:

- `@twinkleplop/twoslash` handles JS, JSX, TS, and TSX;
- `@twinkleplop/twoslash-svelte` converts Svelte to TSX and maps semantic
  ranges back to the original Svelte source.

The snippet layer needs a code-intelligence plugin that selects one of those
packages and returns semantic decorations alongside highlighted tokens:

```ts
interface CodeIntelligencePlugin {
  supports(language: string): boolean;
  analyse(input: SnippetSource, context: SnippetContext): Promise<CodeDecorations>;
}
```

This can improve on the upstream renderer: its Svelte variants are
syntax-highlighted but only JS and TS enter its Twoslash branch, whereas
twinkleplop already has a Svelte-aware Twoslash implementation.

## 9. Hidden type context and virtual files

### Requirement

A short excerpt may depend on imports, global declarations, or setup code that
would distract readers. That context must participate in type checking without
appearing in the result.

### Syntax

Visible source can use Twoslash's cut marker:

```ts
declare const frameworkValue: string;
// ---cut---
frameworkValue.toUpperCase();
```

The renderer can also receive a `twoslashBanner(filename, source)` callback.
Its result is injected as a virtual `injected.d.ts` file. When the snippet has
a filename, a subsequent virtual filename directive restores that identity
before the visible source.

### Expected output

Declarations before `// ---cut---` and the injected banner influence type
checking and hovers, but only the source after the cut is displayed.

### Twinkleplop implementation

The snippet context should support both author-provided hidden source and
host-provided virtual files:

```ts
interface SnippetContext {
  document_filename: string;
  snippet_filename?: string;
  virtual_files?: Record<string, string>;
  hidden_prelude?: string;
}
```

The Twoslash adapter should translate this into Twoslash virtual-file
directives. A framework integration can provide the prelude. Another valid
syntax is document metadata declaring dependencies, which keeps compiler
setup out of the code fence.

## 10. Rich hover documentation

### Requirement

Raw JSDoc is not sufficient inside a small popup. Prose needs Markdown
formatting, examples need code rendering, and tags need a compact visual
layout.

### Syntax

The input is normal JSDoc on the resolved declaration:

````ts
/**
 * Creates a counter with **reactive** state.
 * @param initial The initial value.
 * @throws {RangeError} If the value is negative.
 * @example
 * ```js
 * createCounter(0)
 * ```
 */
declare function createCounter(initial: number): Counter;
````

### Expected output

The renderer:

- decodes Shiki-escaped JSDoc text;
- recursively renders the main docs as Markdown with checking disabled;
- removes `@type`;
- gives `@param` and `@throws` their own parameter/type span;
- renders `@example` as Markdown, including code fences;
- renders other tag values as inline Markdown;
- removes the empty tags container when no tags remain.

### Twinkleplop implementation

The current Twoslash renderer syntax-highlights type strings but escapes docs
as plain text. Add a trusted callback to the Twoslash render options:

```ts
interface TwoslashRenderOptions {
  render_docs?: (markdown: string) => string;
  render_tag?: (tag: TwoslashDocTag) => string;
}
```

The callback should return sanitized HTML when documentation is not trusted.
Recursive code rendering must disable semantic checking to avoid recursively
starting Twoslash for examples inside a hover.

## 11. Documentation reference links

### Requirement

A type popup explains a symbol but does not replace its full API reference.
Documented framework imports should link to their canonical page without
linking unrelated third-party or local identifiers.

### Syntax

There is no special source annotation:

```ts
import { onMount } from "svelte";
onMount(() => {});
```

The caller supplies a `Record<symbolName, URL>`. The renderer scans named
imports only from:

- `svelte`;
- `@sveltejs/kit`;
- `$app/*`;
- `$env/*`;
- `$service-worker`.

For Svelte fences, it scans the first `<script>` block.

### Expected output

If a Twoslash popup belongs to a symbol that was actually imported and exists
in the reference map, the popup gains:

```html
<div class="twoslash-popup-reference">
  <a href="/docs/reference-url">reference</a>
</div>
```

The current scanner does not handle default imports or namespace imports.
Aliased named imports are also unlikely to link because it records the
original imported name but looks at the locally rendered identifier.

### Twinkleplop implementation

Do not post-process completed HTML with span-depth string scanning. Expose
Twoslash popup nodes before serialization:

```ts
interface SemanticDecorationPlugin {
  decorate(node: TwoslashDecoration, context: SnippetContext): TwoslashDecoration;
}
```

A reference-link plugin can resolve the local symbol through the TypeScript
semantic result or, as a simpler first version, through an import scanner. It
should receive the `references` map and an explicit enabled flag. This also
gives `references=false` a real, independent meaning.

## 12. Source preservation

### Requirement

Markdown parsers often normalize code block text. Displayed code must retain
the intended indentation and characters, especially when it is also sent to a
type checker or playground.

### Behavior

The renderer:

- decodes HTML entities in the code token;
- reverses Marked's conversion of each four leading spaces to one tab;
- leaves YAML indentation as spaces;
- strips metadata only after decoding.

### Expected output

Tabs are present in the code passed to highlighting and playground generation.
HTML entities represent the original source characters rather than literal
entity text.

### Twinkleplop implementation

`@twinkleplop/core` already tokenizes the exact string it receives. The
Markdown adapter should prefer the parser's raw fence slice over normalized
token text. If the parser cannot provide raw content, a parser-specific
normalization plugin may repair it.

This behavior should not live in a language grammar. YAML's indentation policy
is a document-adapter decision, not a highlighting rule.

## 13. Code-output normalization

### Requirement

Shiki's HTML structure should not collapse visually meaningful blank lines or
make long multiline comments lose their indentation when CSS wraps them.

### Behavior and output

The renderer:

- changes Shiki's empty line markup so a literal newline remains inside it;
- removes Shiki's `tabindex="0"`;
- turns each line of certain multiline comment spans into
  `<span class="token comment wrapped" style="--indent: Nch">…</span>`;
- turns the special text `/*…*/` into the single ellipsis character `…`.

### Twinkleplop implementation

Core's `to_html` already creates explicit `.l` wrappers and preserves newlines,
so the blank-line workaround is not required.

Per-line comment wrapping and the `/*…*/` shorthand are presentation policies.
If needed, add a render-decoration callback that can split a classified token
at newline boundaries and add attributes. Do not rewrite the underlying token
type or source.

## 14. Authoring diagnostics

### Requirement

Documentation builds should fail at the source of a malformed example rather
than ship broken tabs, a stale playground, or unchecked code.

### Svelte.dev failures

The renderer throws when:

- code groups are nested;
- a grouped file has no filename;
- `file` has no extension;
- a `diff` fence is used;
- Shiki receives an unsupported language;
- Twoslash cannot compile a checked snippet;
- the JS-to-TS converter encounters an unsupported annotated AST shape.

It also assumes a matching end marker; an unmatched end is not converted into
a friendly diagnostic.

### Twinkleplop implementation

The snippet layer should use structured diagnostics:

```ts
interface SnippetDiagnostic {
  code: string;
  message: string;
  document: string;
  line?: number;
  snippet_file?: string;
  cause?: unknown;
}
```

Plugins should report through a shared sink. The host decides whether a
diagnostic throws, becomes a warning, or is displayed inline. Group delimiter
errors and unsupported metadata should have explicit diagnostic codes.

## 15. Snippet caching

### Requirement

Shiki plus Twoslash is expensive enough that rebuilding every documentation
snippet on every process start would slow local development and production
builds.

### Behavior

The renderer has:

- an in-memory `Map`;
- a disk cache at the nearest `node_modules/.snippets`;
- a namespace digest based on `pnpm-lock.yaml`, the renderer source, and its
  statically imported local dependency graph;
- per-snippet SHA-256 JSON files;
- deletion of cache namespaces whose digest is no longer current.

The rendered JS and optional TS HTML strings are cached. Reference links are
injected afterward, allowing the reference map to vary without regenerating
highlighting.

### Upstream cache caveat

The per-snippet key is only the decoded code token. It does not explicitly
include the fence language, `check`, document filename, injected banner, or
other caller context. Identical text rendered in different contexts can
therefore reuse output produced under the wrong assumptions.

### Twinkleplop implementation

Caching belongs to the snippet host, with an optional storage adapter:

```ts
interface SnippetCache {
  get(key: string): Promise<CachedSnippet | undefined>;
  set(key: string, value: CachedSnippet): Promise<void>;
}
```

The deterministic cache key should include:

- display, analysis, and delivered source;
- canonical language;
- filename and relevant metadata;
- selected highlighter and code-intelligence plugin names and versions;
- checking/compiler options and virtual files;
- renderer/theme version when cached data contains HTML;
- source-variant converter version.

If the cache stores semantic/token data instead of final HTML, theme changes do
not need to invalidate it.

## Proposed twinkleplop extension model

### Keep core focused

No changes are required in the grammar engine for code groups, filenames,
playground URLs, conversion, or caching. `@twinkleplop/core` should continue to
accept source and return classified ranges/HTML.

The existing annotation overlay contract is also the right abstraction for
visual code ranges. It should not be expanded into a general document plugin
API.

### Add a snippet orchestration layer

A new optional package could expose one pipeline:

```ts
interface SnippetPlugin {
  name: string;
  version: string;
  parse_metadata?(snippet: ParsedSnippet): ParsedSnippet;
  create_variants?(snippet: ParsedSnippet): Promise<SnippetVariant[]>;
  analyse?(variant: SnippetVariant, context: SnippetContext): Promise<CodeDecorations>;
  decorate?(view: SnippetView, context: SnippetContext): SnippetView;
}

interface SnippetRendererOptions {
  languages: LanguageRegistry;
  plugins?: SnippetPlugin[];
  cache?: SnippetCache;
  playground?: PlaygroundAdapter;
}
```

The document integration would separately turn Markdown fence nodes into
`ParsedSnippet` or `SnippetGroup` values. This keeps the same snippet pipeline
usable from Markdown, MDsveX, a Svelte component, or a direct API.

### Suggested optional plugins

| Plugin                             | Responsibility                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| Svelte.dev metadata compatibility  | Parse `///`, `<!--- --->`, and `###` metadata                                 |
| Fence attributes                   | Read `file`, `copy`, `references`, and variant metadata from the Markdown AST |
| Twinkleplop annotations            | Run the existing comment-marker overlay extractor                             |
| Svelte.dev delimiter compatibility | Convert `+++`, `---`, and `:::` into overlays and source mappings             |
| Twoslash                           | Produce JS/TS semantic decorations                                            |
| Twoslash Svelte                    | Produce mapped Svelte semantic decorations                                    |
| JS-to-TS                           | Produce source variants from supported JSDoc                                  |
| Reference links                    | Decorate semantic popups using a reference map                                |
| Markdown hover docs                | Render and sanitize documentation payloads                                    |
| Svelte playground                  | Serialize a group to a playground URL                                         |

## Recommended implementation order

1. **Snippet input and language registry** — render one raw fence through the
   existing language packages without losing source text.
2. **Metadata and view model** — filenames, copy policy, diagnostics, and fence
   attributes.
3. **Groups and HTML controls** — accessible tabs/panels, with framework-neutral
   data rather than DOM behavior in core.
4. **Twoslash adapters** — connect existing JS/TS and Svelte packages to the
   common view model.
5. **Annotation/source mapping bridge** — keep display, analysis, and delivered
   source aligned; use existing `[!add]`, `[!del]`, and `[!hl]` syntax first.
6. **Playground and caching adapters** — both depend on the preceding normalized
   snippet/group representation.
7. **JS-to-TS variants and rich hover extensions** — valuable but independently
   optional, and the most policy-heavy pieces.

## Recommended syntax policy

Twinkleplop can support the Svelte.dev syntax for migration, but its native
surface should use the least surprising owner for each concern:

| Concern                               | Recommended native syntax                         |
| ------------------------------------- | ------------------------------------------------- |
| Filename, copy, reference-link policy | Fence attributes or programmatic metadata         |
| Multi-file grouping                   | Markdown container/AST node or programmatic group |
| Highlight/add/remove ranges           | Existing comment-based annotation plugins         |
| Hidden type-checking context          | Twoslash directives or programmatic virtual files |
| Explicit JS/TS alternatives           | Variant metadata on paired fences                 |
| Playground target                     | Host configuration, not source syntax             |

This preserves valid source as much as possible, allows the same highlighted
snippet to be used outside Markdown, and keeps optional integrations out of the
tokenizer's hot path.
