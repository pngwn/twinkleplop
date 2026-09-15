// @twinkleplop/rehype: highlight fenced code and inline code in a hast tree.
//
// the highlighted block replaces the `pre > code` element. by default the
// block is parsed into hast, so it needs nothing of the pipeline; `output:
// "raw"` puts the string in as a raw node instead, which is faster and needs
// `allowDangerousHtml` on the stringifier.

import { create_renderer, split_info } from "@twinkleplop/markdown-core";
import type { MarkdownOptions, Renderer, SourceLocation } from "@twinkleplop/markdown-core";
import { fromHtml } from "hast-util-from-html";
import type { Element, Nodes, Parents, RootContent } from "hast";

export interface RehypeOptions extends MarkdownOptions {
  output?: "hast" | "raw";
}

interface File {
  path?: string;
}

export default function rehype_twinkleplop(options: RehypeOptions) {
  const renderer = create_renderer(options);
  const to_nodes = options.output === "raw" ? as_raw : as_hast;
  return (tree: Nodes, file?: File): void => {
    if ("children" in tree) visit(tree as Parents, renderer, to_nodes, file?.path);
  };
}

type ToNodes = (html: string) => RootContent[];

function visit(parent: Parents, renderer: Renderer, to_nodes: ToNodes, path?: string): void {
  const children = parent.children;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.type !== "element") continue;

    if (node.tagName === "pre") {
      const code = code_child(node);
      if (code !== null) {
        const html = renderer.fence(
          language_of(code),
          meta_of(code),
          text_of(code),
          location(node, code, path),
        );
        if (html !== null) i = replace(children, i, to_nodes(html));
      }
      continue;
    }

    if (node.tagName === "code" && renderer.inline) {
      const html = renderer.inline_code(text_of(node), location(node, node, path));
      if (html !== null) {
        i = replace(children, i, to_nodes(html));
        continue;
      }
    }

    visit(node, renderer, to_nodes, path);
  }
}

// splicing shifts every sibling after the block, so the walk continues from
// the last node put in rather than from where it started.
function replace(children: RootContent[], index: number, nodes: RootContent[]): number {
  children.splice(index, 1, ...nodes);
  return index + nodes.length - 1;
}

function code_child(pre: Element): Element | null {
  for (const child of pre.children) {
    if (child.type === "element") return child.tagName === "code" ? child : null;
  }
  return null;
}

// remark-rehype writes the language as `language-<name>`; a tree parsed from
// html carries whatever the author wrote.
function language_of(code: Element): string | undefined {
  const class_name = code.properties?.className;
  const list = Array.isArray(class_name) ? class_name : [class_name];
  for (const entry of list) {
    if (typeof entry !== "string") continue;
    if (entry.startsWith("language-")) return entry.slice(9);
  }
  return undefined;
}

// remark-rehype keeps the meta string on `data`; rehype-pretty-code taught
// html authors to write it as a `metastring` attribute.
function meta_of(code: Element): string | undefined {
  const data = code.data as { meta?: unknown } | undefined;
  if (typeof data?.meta === "string") return data.meta;
  const property = code.properties?.metastring;
  return typeof property === "string" ? property : undefined;
}

function text_of(element: Element): string {
  let out = "";
  for (const child of element.children) {
    if (child.type === "text") out += child.value;
    else if (child.type === "element") out += text_of(child);
  }
  return out;
}

function location(outer: Element, inner: Element, path?: string): SourceLocation | undefined {
  const line = outer.position?.start.line ?? inner.position?.start.line;
  if (path === undefined && line === undefined) return undefined;
  return { file: path, line };
}

// the block is html we generated ourselves, so parsing it back is a fragment
// parse of known-good markup rather than a trust boundary. it costs about as
// much again as rendering the block did.
function as_hast(html: string): RootContent[] {
  return fromHtml(html, { fragment: true }).children;
}

function as_raw(html: string): RootContent[] {
  return [{ type: "raw", value: html } as unknown as RootContent];
}

export { split_info };
export type { MarkdownOptions };
