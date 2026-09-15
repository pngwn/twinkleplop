// shared by both twoslash packages, so they differ only in how they reach
// twoslash and in the grammar they tokenize with.

import type { TokenizeResult } from "@twinkleplop/core";
import type { TwoslashOptions, TwoslashReturn } from "twoslash";
import { render } from "./render.js";
import type { HighlightOptions } from "./types.js";

// an undeclared `// @foo` is a mistyped compiler flag to twoslash, and throws.
// these four are the ones twoslash documents; pre-registering them is what
// lets an author write `// @log: hello` with no configuration.
export const DEFAULT_CUSTOM_TAGS = ["annotate", "log", "warn", "error"];

export function resolve_twoslash_options(options: HighlightOptions): TwoslashOptions {
  const twoslash = options.twoslash ?? {};
  const tags = options.custom_tags ?? DEFAULT_CUSTOM_TAGS;
  return {
    ...twoslash,
    customTags: [...new Set([...tags, ...(twoslash.customTags ?? [])])],
  };
}

/**
 * the highlight function both packages return. `on_error` covers the twoslash
 * call alone: a rejected snippet is the caller's to fall back from, a failure
 * in tokenizing or rendering is a bug here and should surface as one.
 */
export function create_pipeline(
  run_twoslash: (code: string) => TwoslashReturn,
  tokenize: (code: string) => TokenizeResult,
  options: HighlightOptions,
) {
  return (code: string) => {
    let result: TwoslashReturn;
    try {
      result = run_twoslash(code);
    } catch (error) {
      const fallback = options.on_error?.(error, code);
      if (typeof fallback === "string") return fallback;
      throw error;
    }
    return render(result.code, tokenize(result.code), result, options);
  };
}
