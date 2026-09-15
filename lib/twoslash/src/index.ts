import { createTwoslasher } from "twoslash";
import { language } from "./language.js";
import { create_pipeline, resolve_twoslash_options } from "./options.js";
import type { HighlightOptions } from "./types.js";

/**
 * Create a reusable highlighter. The returned function caches the
 * underlying twoslash instance for better performance on repeated calls.
 */
export function create_highlighter(options: HighlightOptions = {}) {
  const twoslasher = createTwoslasher(resolve_twoslash_options(options));
  const lang = options.lang ?? "ts";
  return create_pipeline((code) => twoslasher(code, lang), language, options);
}

/**
 * Highlight a single snippet. For repeated calls prefer
 * `create_highlighter` as it reuses the twoslash language-service instance.
 */
export function highlight(code: string, options: HighlightOptions = {}) {
  return create_highlighter(options)(code);
}

export { language };
export { render } from "./render.js";
export { create_pipeline, resolve_twoslash_options, DEFAULT_CUSTOM_TAGS } from "./options.js";
export type { HighlightOptions, DocTag, CompletionItem } from "./types.js";
