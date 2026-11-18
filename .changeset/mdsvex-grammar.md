---
"@twinkleplop/mdsvex": patch
---

Add `@twinkleplop/mdsvex` for mdsvex@next documents (`.svx`, `.pfm`): Penguin-Flavoured Markdown with Svelte tags, blocks and expressions anywhere in it.

```svx
---
title: Hello
---
import Chart from './Chart.svelte'

# {title}

Some _emphasis_, *strong* and a :abbr[PFM](title="Penguin-Flavoured Markdown").

:::note[Heads up]
<Chart data={points} />
:::
```

It follows PFM where it differs from CommonMark. `_` is emphasis and `*` is strong, and neither opens inside a word or without a closer on its line, so `snake_case` and `2 * 3` stay text. `[text]` is a link only before `(` or `[`, a fence closes on a line of at least as many backticks as opened it, and `~sub~`, `^sup^`, footnotes, pipe tables and inline, leaf and container directives are read.

Front matter is highlighted as YAML and imports, `<script>`, `<style>` and expressions as JavaScript and CSS. Fences in `js`, `css`, `svelte` and `yaml` are highlighted out of the box, pass `languages` for more:

```ts
import { language } from "@twinkleplop/mdsvex";
import { tokenize as ts } from "@twinkleplop/typescript";

const typescript = ts();
const svx = language({ languages: { ts: typescript, typescript } });
```
