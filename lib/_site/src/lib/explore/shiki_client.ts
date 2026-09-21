import type { Highlighter, ThemedToken } from "shiki";
import { SHIKI_THEME_IDS } from "./themes";

// keys match the twinkleplop language slugs; value is the shiki grammar id
// (or null when shiki has no equivalent grammar). any lang not in this map
// is treated as unsupported and the shiki pane shows a hint.
export const SHIKI_LANG_MAP: Record<string, string | null> = {
  css: "css",
  whitespace: null,
  javascript: "javascript",
  html: "html",
  svelte: "svelte",
  rust: "rust",
  typescript: "typescript",
  tsx: "tsx",
  sql: "sql",
  yaml: "yaml",
  jsonc: "jsonc",
  markdown: "markdown",
  toml: "toml",
  python: "python",
  bash: "bash",
  shellsession: "shellsession",
  go: "go",
  http: "http",
  diff: "diff",
  "diff-basic": null,
  dotenv: "dotenv",
};

let highlighter_promise: Promise<Highlighter> | null = null;

// lazily builds a single highlighter instance shared across the session.
// loading the oniguruma wasm is the main cost, so we only want to pay it
// once and keep the instance warm as the user navigates between languages.
export function get_highlighter(): Promise<Highlighter> {
  if (!highlighter_promise) {
    highlighter_promise = (async () => {
      const { createHighlighter } = await import("shiki");
      const langs = Object.values(SHIKI_LANG_MAP).filter((l): l is string => l !== null);
      return createHighlighter({
        themes: SHIKI_THEME_IDS,
        langs,
      });
    })();
  }
  return highlighter_promise;
}

export function shiki_lang_for(lang: string): string | null {
  return SHIKI_LANG_MAP[lang] ?? null;
}

// returns shiki's per-line, per-token output with the textmate scope chain
// attached on each token (`token.explanation[*].scopes`). intended for the
// inspector pane: kept separate from `codeToHtml` so the timed render path
// stays free of the explanation overhead.
//
// shiki types `lang` as `BundledLanguage | SpecialLanguage`; the cast keeps
// the helper in sync with the rest of the call sites in this file, which
// pipe `string` through SHIKI_LANG_MAP (the source of truth for which
// grammars we actually load on startup).
export function tokenize_with_scopes(
  highlighter: Highlighter,
  source: string,
  lang: string,
  theme: string,
): ThemedToken[][] {
  return highlighter.codeToTokens(source, {
    lang: lang as Parameters<Highlighter["codeToTokens"]>[1]["lang"],
    theme,
    includeExplanation: true,
  }).tokens;
}
