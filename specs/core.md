# Core: shared contract

Not a task. This file holds the concepts and constraints the eight parity specs
in this directory build on, so each spec can reference them instead of
restating them. Baseline: twinkleplop `main` at `4fa1284`, compared against
shiki 4.4.3.

## Public surface every spec assumes

Each language package exposes two factories with the same options:

- `language(options?)` returns `(code, render?) => html`.
- `tokenize(options?)` returns `(code) => result`, and `to_html(code, result, render?)`
  turns a result into the same HTML.

`options` configures the highlighter once (fidelity, annotation plugins).
`render` configures one call (today: `class_name`, `line_numbers`). Every
spec that adds an option says which of the two it belongs to.

## Output shape

The HTML a consumer receives has exactly this structure, and themes style it
by class alone:

```html
<pre class="twinkleplop"><code>
<span class="l"><span class="ln">1</span><span class="tok keyword">const</span> <span class="tok constant">x</span></span>
<span class="l diff-add">…</span>
</code></pre>
```

1. One `pre.twinkleplop > code` per call; `class_name` replaces `twinkleplop`.
2. One `span.l` per visible source line, separated by a newline character.
   Line-level decorations are extra classes on `span.l`.
3. Every classified region is a `span.tok <type>`; the type names are the
   canonical vocabulary in `@twinkleplop/core/tokens`. Text between tokens is
   bare, HTML-escaped text.
4. Adjacent regions of the same type render as one span.
5. When line numbers are on, each line starts with `span.ln` holding the
   visible line number.

## Overlays

An overlay is a classification (a CSS class name) over a byte range of the
source. Overlays come from annotation markers today and, after
[overlays_option](./overlays_option.md), from the caller.

1. Line-mode overlays add their class to every `span.l` the range touches.
2. Token-mode overlays wrap the non-whitespace run of the range on each line
   in one `span.tok <class>`; indentation and trailing whitespace stay outside,
   whitespace between tokens stays inside.
3. Overlapping token-mode overlays never nest or throw: each distinct region
   gets the union of the active classes.
4. Overlays never change token types and never move bytes; they only add
   classes.
5. A range can be hidden: its bytes render as spaces of equal width, and a
   line that becomes whitespace-only is dropped from the output. Visible line
   numbering continues without a gap.

## Markers

In-source markers are `[!verb[#id][ args]]` inside a comment of the host
language. The argument grammar (bare, `+N`, `:N`, `:N..M`, `:N...M`,
anchor ranges, half-open pairs, `=anchor`, `***`) is defined in
`lib/annotation/README.md`. Marker bytes are hidden; a comment that held
only markers and punctuation disappears with its line. Unknown verbs are
ordinary comment text. Problems (malformed, anchor not found, unmatched pair)
go to the `on_error` sink when one is configured and throw otherwise.

Line counting follows shiki's v3 matching: a marker on its own line applies
to the lines below it; a trailing marker applies to its own line.

## Class vocabulary

Built-in classifications: `emphasis`, `highlight`, `subdued`, `diff-add`,
`diff-del`, `diff-mod`, `error`, `warning`, `info`, and `focus` once
[focus_and_shiki_notation](./focus_and_shiki_notation.md) lands. Block-level
"this snippet contains X" classes use the `has-` prefix followed by the
classification name.

## Constraints that apply to every spec

1. **Absent means identical.** When a new option is not passed, the HTML is
   byte-identical to today's and the perf harness (`lib/bench/perf`, paired
   A/B against the frozen baseline) shows no change above its noise floor.
2. **No tree.** HTML is produced in one pass as a string. A feature must be
   expressible as classes, attributes or text on the elements above; nothing
   in these specs introduces an intermediate document model.
3. **Names are snake_case.** Options, plugin fields and exported functions
   follow the repo's naming convention; class names in HTML use hyphens.
4. **Escaping.** Every byte of user source and every attribute value a
   consumer supplies is HTML-escaped on output. A consumer can never inject
   markup through source text, marker text or option values.
5. **Reference behaviour.** Where a spec says "as shiki does", it means shiki
   4.4.3 with `@shikijs/transformers` 4.4.3 default options (v3 matching).

## Dependencies

- Depended on by: every spec in this directory.
