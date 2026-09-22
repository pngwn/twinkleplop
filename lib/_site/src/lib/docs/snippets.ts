// template tags for docs code snippets. none of them run: the `docs-snippets`
// vite plugin (snippets_plugin.ts) renders each tagged snippet at build time
// with the matching highlighter in highlighters.ts and replaces it with the
// html, so no highlighter reaches the client. reaching one of these functions
// means the plugin did not see the file.
//
//   const usage = twoslash`import { language } from "@twinkleplop/typescript";`;
//   const install = bash`pnpm add @twinkleplop/typescript`;
//   const numbered = ts({ line_numbers: true })`const x = 1;`;
//
// options must be written inline as literals, since they are read from the
// source rather than evaluated.

import type { RenderOptions } from "@twinkleplop/core";

type Tag<T = string> = (strings: TemplateStringsArray) => T;

/** a tag, or a call with render options that returns one. */
interface HighlightTag {
  (strings: TemplateStringsArray): string;
  (render: RenderOptions): Tag;
}

const compiled_away = (): never => {
  throw new Error("docs snippets are compiled by the docs-snippets vite plugin");
};

/** typescript type checked by twoslash, with hover types. */
export const twoslash: Tag = compiled_away;
/** typescript with annotation markers applied. */
export const ts = compiled_away as HighlightTag;
type Split = Tag<{ input: string; output: string }>;

/** a split tag, or a call with render options that returns one */
interface SplitTag {
  (strings: TemplateStringsArray): { input: string; output: string };
  (render: RenderOptions): Split;
}

/** typescript for SplitCodeBlock: markers left as written, and applied. */
export const ts_split = compiled_away as SplitTag;
/** as `ts_split`, with shiki's `[!code ...]` notation applied. */
export const ts_shiki_split: Split = compiled_away;
/** as `ts_split`, with the output rendered by twoslash. */
export const twoslash_split: Split = compiled_away;
export const html = compiled_away as HighlightTag;
export const css = compiled_away as HighlightTag;
export const bash = compiled_away as HighlightTag;
