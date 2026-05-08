// shared factory for "style only" notation plugins — em, hl, dim, the diff
// verbs, the diagnostic verbs. each one claims a single verb, attaches a
// fixed CSS classification to the resolved range, and chooses line-mode vs
// token-mode based on the marker's args kind:
//
//   bare / +N / :N / :N..M  → line-mode (whole line(s) styled)
//   <a>..<b> / =<a>         → token-mode (only matching tokens styled)
//
// auto-mode dispatch keeps marker semantics consistent: `[!em]` decorates
// the line; `[!em foo...bar]` decorates exactly the foo-to-bar span.

import type { NotationPlugin, ParsedArgs } from "@twinkleplop/core";

export function style_plugin(verb: string, classification: string): NotationPlugin {
  return {
    verbs: [verb],
    handle: ({ args, range }) => ({
      overlays: [
        {
          start: range.start,
          end: range.end,
          classification,
          line_mode: is_line_mode(args),
        },
      ],
    }),
  };
}

function is_line_mode(args: ParsedArgs): boolean {
  return args.kind === "bare" || args.kind === "lineCount" || args.kind === "lineRef";
}
