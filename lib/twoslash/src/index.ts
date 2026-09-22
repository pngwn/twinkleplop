import { createTwoslasher } from "twoslash";
import { language } from "./language.js";
import { create_pipeline, resolve_twoslash_options } from "./options.js";
import type { HighlightOptions } from "./types.js";

/** each call builds a typescript environment, so create one per set of options and reuse it */
export function create_highlighter(options: HighlightOptions = {}) {
  const twoslasher = createTwoslasher(resolve_twoslash_options(options));
  const lang = options.lang ?? "ts";
  return create_pipeline((code) => twoslasher(code, lang), language, options);
}

export { language };
export { render } from "./render.js";
export { create_pipeline, resolve_twoslash_options, DEFAULT_CUSTOM_TAGS } from "./options.js";
export type { HighlightOptions, DocTag, CompletionItem } from "./types.js";
