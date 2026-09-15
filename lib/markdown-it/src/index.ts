// @twinkleplop/markdown-it: replace the fence and inline code renderer
// rules. the plugin returns html directly, so no pipeline option is needed.

import { create_renderer, split_info } from "@twinkleplop/markdown-core";
import type { MarkdownOptions, SourceLocation } from "@twinkleplop/markdown-core";
import type MarkdownIt from "markdown-it";
import type { RenderRule } from "markdown-it/lib/renderer.mjs";
import type Token from "markdown-it/lib/token.mjs";

export default function markdown_it_twinkleplop(md: MarkdownIt, options: MarkdownOptions): void {
  const renderer = create_renderer(options);
  const rules = md.renderer.rules;

  // a fence the renderer declines (no language and no default) falls back to
  // whatever rule was in place, so markdown-it's own output and any other
  // plugin's still apply.
  const fence: RenderRule | undefined = rules.fence;
  rules.fence = (tokens, index, render_options, env, self) => {
    const token = tokens[index];
    const { lang, meta } = split_info(md.utils.unescapeAll(token.info));
    const html = renderer.fence(lang, meta, token.content, location(token, env));
    if (html !== null) return html + "\n";
    if (fence !== undefined) return fence(tokens, index, render_options, env, self);
    return self.renderToken(tokens, index, render_options);
  };

  if (!renderer.inline) return;

  const code_inline: RenderRule | undefined = rules.code_inline;
  rules.code_inline = (tokens, index, render_options, env, self) => {
    const token = tokens[index];
    const html = renderer.inline_code(token.content, location(token, env));
    if (html !== null) return html;
    if (code_inline !== undefined) return code_inline(tokens, index, render_options, env, self);
    return self.renderToken(tokens, index, render_options);
  };
}

// `map` is [first, last) in 0-based lines. the path is whatever the caller
// put on `env`, which is where markdown-it users keep per-render context.
function location(token: Token, env: unknown): SourceLocation | undefined {
  const line = token.map === null ? undefined : token.map[0] + 1;
  const path =
    typeof env === "object" && env !== null ? (env as { path?: unknown }).path : undefined;
  const file = typeof path === "string" ? path : undefined;
  if (file === undefined && line === undefined) return undefined;
  return { file, line };
}

export { split_info };
export type { MarkdownOptions };
