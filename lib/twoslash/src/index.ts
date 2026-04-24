import { createTwoslasher } from "twoslash";
import { language } from "./language.js";
import { render } from "./render.js";
import type { HighlightOptions } from "./types.js";

/**
 * Create a reusable highlighter. The returned function caches the
 * underlying twoslash instance for better performance on repeated calls.
 */
export function create_highlighter(options: HighlightOptions = {}) {
  const twoslasher = createTwoslasher(options.twoslash ?? {});
  const lang = options.lang ?? "ts";
  return (code: string) => {
    const result = twoslasher(code, lang);
    const tokens = language(result.code);
    return render(result.code, tokens, result, options);
  };
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
