// @twinkleplop/annotation — built-in annotation plugins.
//
// each plugin claims one or more verbs and emits overlay contributions for
// the resolved range. plugins are pure: they consume an AnnotationInput
// and return an AnnotationOutput. the framework owns dispatch, anchor
// resolution, pairing, and overlay collection.
//
// em, hl, focus, dim, add/del/mod (diffs), err/warn/info (diagnostics).
// `focus` relies on the block level `has-focus` class rather than a
// propagated `not-focused` sibling: `.has-focus .l:not(.focus)` is the css.
//
// the shiki compatibility plugin lives in "./shiki" so the default entry
// stays free of it.
//
// every plugin auto-selects line-mode vs token-mode from its args:
// bare / +N / :N / :N..M render line-mode; anchor ranges and `=anchor` set
// form render token-mode.

export { em } from "./em";
export { hl } from "./hl";
export { focus } from "./focus";
export { dim } from "./dim";
export { add, del, mod } from "./diff";
export { err, warn, info } from "./diagnostics";
