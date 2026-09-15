// Option plumbing shared by @twinkleplop/twoslash and
// @twinkleplop/twoslash-svelte, so both packages accept the same options with
// the same meaning and differ only in how they reach twoslash.

import type { TokenizeResult } from "@twinkleplop/core";
import type { TwoslashOptions, TwoslashReturn } from "twoslash";
import { render } from "./render.js";
import type { HighlightOptions } from "./types.js";

// twoslash treats an unrecognised `// @foo` as a mistyped compiler flag and
// throws, so a tag has to be declared before it can be used. These four are
// the ones twoslash itself documents; pre-registering them is what lets a
// snippet author write `// @log: hello` with no configuration.
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
 * Build the highlight function both packages return from a twoslash runner and
 * a tokenizer. `on_error` covers the twoslash call alone: a snippet twoslash
 * rejects is the caller's problem to fall back from, while a failure in
 * tokenizing or rendering is a bug here and should surface as one.
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
