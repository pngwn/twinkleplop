import type { RenderOptions } from "@twinkleplop/core";

// what a language package's `language(...)` factory returns.
export type HighlightFn = (code: string, render?: RenderOptions) => string;

// an entry may carry a second highlighter for fences that ask for twoslash.
export interface RegistryEntry {
  highlight: HighlightFn;
  twoslash?: HighlightFn;
}

// a registry value is a highlighter, an entry, or the name of another entry.
export type RegistryValue = HighlightFn | RegistryEntry | string;

// whatever the toolchain knows about where the fence came from. both fields
// are optional because markdown-it has no file and rehype-parse has no line
// unless the parser kept positions.
export interface SourceLocation {
  file?: string;
  line?: number;
}

export interface MarkdownOptions {
  languages: Record<string, RegistryValue>;
  // used by a fence with no language of its own.
  default_language?: string;
  on_unknown_language?: "throw" | "plain";
  // site default, overridden by `:line-numbers` and `showLineNumbers`.
  line_numbers?: boolean | { start?: number };
  inline?: false | "tailing-curly-colon";
  twoslash?: "meta" | "always";
  // house conventions. receives the raw meta string and the options the
  // recognised conventions produced, and returns the options to render with.
  parse_meta?: (raw: string, parsed: RenderOptions) => RenderOptions;
  // site defaults, merged under the per-fence options.
  render?: RenderOptions;
}

export interface Renderer {
  // true when inline code should be looked at, so a toolchain can leave its
  // own renderer in place otherwise.
  inline: boolean;
  // null when the fence names no language and no default is set: the
  // toolchain keeps its own output.
  fence(
    lang: string | undefined,
    meta: string | undefined,
    code: string,
    location?: SourceLocation,
  ): string | null;
  // null when the code carries no `{:lang}` suffix.
  inline_code(text: string, location?: SourceLocation): string | null;
}
