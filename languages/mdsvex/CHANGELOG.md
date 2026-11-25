# @twinkleplop/mdsvex

## 0.1.2
### Patch Changes



- [#182](https://github.com/pngwn/twinkleplop/pull/182) [`f43d548`](https://github.com/pngwn/twinkleplop/commit/f43d5481742507c15983fac4f251b4e43bfd51fa) Thanks [@pngwn](https://github.com/pngwn)! - Unfinished input can be highlighted as it arrives. Pass `open: true` as a render option of a language package's function, as the second argument of a tokenize function, or as `{ open: true }` in the last argument of markdown-core's `fence()`.
  
  ```ts
  const html = highlight(code_so_far, { open: true });
  ```
  
  While the input is open, a comment the input ends in is hidden until it is clear whether it is a `[!verb ...]` directive, instead of showing as a comment first, a pair with no closer yet applies to the end, and lines or anchors that have not arrived are not reported. `overlays` items and fence meta lines past the current end are clamped or dropped instead of throwing. Mistakes that more text cannot fix are reported as before.
- Updated dependencies [[`f43d548`](https://github.com/pngwn/twinkleplop/commit/f43d5481742507c15983fac4f251b4e43bfd51fa), [`956212d`](https://github.com/pngwn/twinkleplop/commit/956212db7cef26d5d2c5e567f9b9ad5b0c147e99), [`34a3add`](https://github.com/pngwn/twinkleplop/commit/34a3addafcd11e6471b07ed45bdf84d29a8f6e11)]:
  - @twinkleplop/core@0.4.0
  - @twinkleplop/css@0.1.9
  - @twinkleplop/javascript@0.1.9
  - @twinkleplop/markdown@0.2.3
  - @twinkleplop/svelte@0.1.9
  - @twinkleplop/yaml@0.1.9

## 0.1.1
### Patch Changes



- [#180](https://github.com/pngwn/twinkleplop/pull/180) [`bec9bd3`](https://github.com/pngwn/twinkleplop/commit/bec9bd36166ea0f37741b182281d261620122941) Thanks [@pngwn](https://github.com/pngwn)! - Add `@twinkleplop/mdsvex` for mdsvex@next documents (`.svx`, `.pfm`): Penguin-Flavoured Markdown with Svelte tags, blocks and expressions anywhere in it.
  
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
  
  It follows PFM where it differs from CommonMark. `_` is emphasis and `*` is strong, and neither opens inside a word or without a closer before the paragraph ends, so `snake_case` and `2 * 3` stay text. `[text]` is a link only before `(` or `[`, a fence closes on a line of at least as many backticks as opened it, and `~sub~`, `^sup^`, footnotes, pipe tables and inline, leaf and container directives are read.
  
  Front matter is highlighted as YAML and imports, `<script>`, `<style>` and expressions as JavaScript and CSS. Fences in `js`, `css`, `svelte` and `yaml` are highlighted out of the box, pass `languages` for more:
  
  ```ts
  import { language } from "@twinkleplop/mdsvex";
  import { tokenize as ts } from "@twinkleplop/typescript";
  
  const typescript = ts();
  const svx = language({ languages: { ts: typescript, typescript } });
  ```
- Updated dependencies [[`a09ba1a`](https://github.com/pngwn/twinkleplop/commit/a09ba1a35cc5c979bf967215b7c28c1b9b59b7b7), [`be0bfa6`](https://github.com/pngwn/twinkleplop/commit/be0bfa6339abaf91cfd1edb6d68b7d81473922d2), [`ff0e7f2`](https://github.com/pngwn/twinkleplop/commit/ff0e7f24eb4d5cefde60ae6d4806b218afd30f18), [`4fbb77e`](https://github.com/pngwn/twinkleplop/commit/4fbb77e8713ad687a2d1e1f4c60a6829c747e72c), [`07e6f3b`](https://github.com/pngwn/twinkleplop/commit/07e6f3bd8b789169ca30fa2ff2af91c5ad71b724), [`5cf6b26`](https://github.com/pngwn/twinkleplop/commit/5cf6b260e571d6409fbbeb27c40a2e8cc6ee6cdd)]:
  - @twinkleplop/core@0.3.2
  - @twinkleplop/javascript@0.1.8
  - @twinkleplop/svelte@0.1.8
  - @twinkleplop/css@0.1.8
  - @twinkleplop/markdown@0.2.2
  - @twinkleplop/yaml@0.1.8
