// shared scenario constants.
//
// kept out of bin/coldstart.mjs so that importing the language list does not
// also run a measurement: the driver executes on import by design, and a
// sizing script that only wants the names should not have to pay for that.

export const LANGUAGES = [
  "bash",
  "css",
  "diff",
  "diff-basic",
  "go",
  "html",
  "javascript",
  "json",
  "markdown",
  "python",
  "rust",
  "sql",
  "svelte",
  "toml",
  "tsx",
  "typescript",
  "whitespace",
  "yaml",
];

// the shape a documentation site actually imports. fixed before any numbers
// were taken so it cannot be tuned to flatter a result.
export const DOCS_BUNDLE = ["javascript", "typescript", "css", "html", "markdown", "bash", "json"];

// languages used for the time to first highlight scenarios. a spread of
// pipeline weights: typescript has the heaviest reclassifier stack, json
// effectively none.
export const TTFH_LANGUAGES = ["typescript", "javascript", "markdown", "css", "json"];
