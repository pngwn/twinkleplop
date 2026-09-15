// @twinkleplop/remark: highlight fenced code and inline code in an mdast
// tree, emitting html nodes. remark-rehype needs `allowDangerousHtml` to
// carry them through, as it does for any html in markdown.

import { create_renderer, split_info } from "@twinkleplop/markdown-core";
import type { MarkdownOptions, Renderer, SourceLocation } from "@twinkleplop/markdown-core";
import type { Nodes, Parents, RootContent } from "mdast";

interface File {
  path?: string;
}

export default function remark_twinkleplop(options: MarkdownOptions) {
  const renderer = create_renderer(options);
  return (tree: Nodes, file?: File): void => {
    if ("children" in tree) visit(tree as Parents, renderer, file?.path);
  };
}

function visit(parent: Parents, renderer: Renderer, path?: string): void {
  const children = parent.children;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];

    if (node.type === "code") {
      const html = renderer.fence(
        node.lang ?? undefined,
        node.meta ?? undefined,
        node.value,
        location(node, path),
      );
      if (html !== null) children[i] = raw(html);
      continue;
    }

    if (node.type === "inlineCode" && renderer.inline) {
      const html = renderer.inline_code(node.value, location(node, path));
      if (html !== null) children[i] = raw(html);
      continue;
    }

    if ("children" in node) visit(node, renderer, path);
  }
}

function location(node: Nodes, path?: string): SourceLocation | undefined {
  const line = node.position?.start.line;
  if (path === undefined && line === undefined) return undefined;
  return { file: path, line };
}

function raw(value: string): RootContent {
  return { type: "html", value } as RootContent;
}

export { split_info };
export type { MarkdownOptions };
