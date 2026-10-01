import type { LanguageFn } from "@twinkleplop/core";

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
  markdown: () => load_markdown(),
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

// values are GRAMMAR_LOADERS keys
const FENCE_LANGUAGES: Record<string, string> = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  tsx: "tsx",
  css: "css",
  html: "html",
  svelte: "svelte",
  json: "json",
  jsonc: "jsonc",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  bash: "bash",
  sh: "bash",
  python: "python",
  py: "python",
  rust: "rust",
  go: "go",
  sql: "sql",
  diff: "diff",
};

type language_module = { tokenize: (options?: object) => LanguageFn };

// markdown depends on no language, so the lab passes them in
async function load_markdown() {
  const targets = [...new Set(Object.values(FENCE_LANGUAGES))];
  const [markdown, ...modules] = await Promise.all([
    import("@twinkleplop/markdown"),
    ...targets.map((name) => GRAMMAR_LOADERS[name]() as Promise<language_module>),
  ]);
  const by_name = new Map(targets.map((name, i) => [name, modules[i].tokenize()]));
  const languages = Object.fromEntries(
    Object.entries(FENCE_LANGUAGES).map(([fence, name]) => [fence, by_name.get(name)!]),
  );
  const front_matter = by_name.get("yaml");
  return {
    ...markdown,
    tokenize: (options?: object) => markdown.tokenize({ ...options, languages, front_matter }),
  };
}
