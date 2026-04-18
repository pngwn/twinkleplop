import type { Highlighter } from "shiki";

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
	markdown: "markdown",
	toml: "toml",
	python: "python",
	bash: "bash",
	go: "go",
	diff: "diff",
	"diff-basic": null,
};

export const SHIKI_THEMES_LOADED = [
	"github-dark",
	"github-light",
	"rose-pine",
	"catppuccin-mocha",
] as const;

let highlighter_promise: Promise<Highlighter> | null = null;

// lazily builds a single highlighter instance shared across the session.
// loading the oniguruma wasm is the main cost, so we only want to pay it
// once and keep the instance warm as the user navigates between languages.
export function get_highlighter(): Promise<Highlighter> {
	if (!highlighter_promise) {
		highlighter_promise = (async () => {
			const { createHighlighter } = await import("shiki");
			const langs = Object.values(SHIKI_LANG_MAP).filter(
				(l): l is string => l !== null,
			);
			return createHighlighter({
				themes: [...SHIKI_THEMES_LOADED],
				langs,
			});
		})();
	}
	return highlighter_promise;
}

export function shiki_lang_for(lang: string): string | null {
	return SHIKI_LANG_MAP[lang] ?? null;
}
