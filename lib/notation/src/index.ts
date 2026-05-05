// @twinkleplop/notation — built-in notation plugins.
//
// each plugin claims one or more verbs and emits overlay contributions for
// the line range the marker resolved to. plugins are pure: they consume a
// resolved NotationInput and return a NotationOutput. the framework owns
// dispatch, anchor resolution, pairing, and overlay collection.
//
// phase 1 ships `em` and `hl`. phase 2 adds `dim`, diff verbs, diagnostics.
// phase 3 adds `focus` (which needs the global `not-focused` propagation
// implemented in core).

export { em } from "./em";
export { hl } from "./hl";
