// Finding 2: language packages shipped no declarations and exposed no `types`
// condition, so this failed with TS7016 under strict — and silently became
// `any` without noImplicitAny, so a permissive compile proved nothing.
import { language as typescript } from "@twinkleplop/typescript";
import { language as javascript } from "@twinkleplop/javascript";
import { language as html } from "@twinkleplop/html";
import { language as css } from "@twinkleplop/css";
import { language as rust } from "@twinkleplop/rust";
import { language as diff } from "@twinkleplop/diff";
import { language as tsx } from "@twinkleplop/tsx";
import { language as svelte } from "@twinkleplop/svelte";

// annotated on purpose: if the declarations go missing again these become
// `any` and the annotations are what turns that back into a compile error.
const html_out: string = typescript()("const total = 1 + 2;");

export const factories: Array<() => (code: string) => string> = [
  javascript,
  html,
  css,
  rust,
  diff,
  tsx,
  svelte,
];
export { html_out };
