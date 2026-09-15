// the shared core of @twinkleplop/rehype, @twinkleplop/markdown-it and
// @twinkleplop/remark: the registry, the fence meta conventions, and the
// markup around a highlighted block. the three plugins differ only in how
// they reach a fence and what they put the html back into.

export { create_renderer, escape_html } from "./render";
export { parse_meta, split_info } from "./meta";
export type { Fail, LineGroup, ParsedMeta, WordGroup } from "./meta";
export { resolve_registry } from "./registry";
export type {
  HighlightFn,
  MarkdownOptions,
  RegistryEntry,
  RegistryValue,
  Renderer,
  SourceLocation,
} from "./types";
