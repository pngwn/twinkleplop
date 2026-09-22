// the modules ship no .d.ts, so ExploreLab narrows what it reads from them
export const GRAMMAR_LOADERS: Record<string, () => Promise<unknown>> = {
  css: () => import("@twinkleplop/css"),
  whitespace: () => import("@twinkleplop/whitespace"),
  javascript: () => import("@twinkleplop/javascript"),
  html: () => import("@twinkleplop/html"),
  svelte: () => import("@twinkleplop/svelte"),
  rust: () => import("@twinkleplop/rust"),
  typescript: () => import("@twinkleplop/typescript"),
  tsx: () => import("@twinkleplop/tsx"),
  sql: () => import("@twinkleplop/sql"),
  yaml: () => import("@twinkleplop/yaml"),
  json: () => import("@twinkleplop/json"),
  jsonc: () => import("@twinkleplop/jsonc"),
  markdown: () => import("@twinkleplop/markdown"),
  toml: () => import("@twinkleplop/toml"),
  ini: () => import("@twinkleplop/ini"),
  python: () => import("@twinkleplop/python"),
  bash: () => import("@twinkleplop/bash"),
  shellsession: () => import("@twinkleplop/shellsession"),
  go: () => import("@twinkleplop/go"),
  http: () => import("@twinkleplop/http"),
  diff: () => import("@twinkleplop/diff"),
  "diff-basic": () => import("@twinkleplop/diff-basic"),
  dotenv: () => import("@twinkleplop/dotenv"),
};

export const LANGUAGES = Object.keys(GRAMMAR_LOADERS).sort();
