// hover, error, error-line, highlight, completion, tag, query
import type { NodeCompletion, NodeError, TwoslashOptions } from "twoslash";

/** a jsdoc tag as twoslash reports it: `["param", "a the first operand"]`. */
export type DocTag = [name: string, text: string | undefined];

/** a completion entry; the compiler seldom fills `docs` in, but may. */
export type CompletionItem = NodeCompletion["completions"][number] & { docs?: string };

export interface HighlightOptions {
  lang?: "ts" | "tsx" | "js" | "jsx";
  class_name?: string;
  /** passed through to twoslash; `customTags` here merges with `custom_tags`. */
  twoslash?: TwoslashOptions;
  /**
   * tags usable as `// @<tag>: text`; anything undeclared reads to twoslash as
   * a mistyped compiler flag. defaults to annotate, log, warn and error, and
   * `[]` disables them.
   */
  custom_tags?: string[];
  /**
   * called when twoslash rejects the snippet: an unlisted compiler error, an
   * unknown flag, syntax it cannot process. a string return becomes the result
   * of the highlight call, no return rethrows.
   */
  on_error?: (error: unknown, code: string) => string | void;
  /**
   * called with the raw jsdoc of every documented hover, query and completion
   * entry, and with every doc tag value. the return value is inserted as is,
   * so it is trusted html: sanitise it yourself if the jsdoc is untrusted.
   * without this option docs are escaped text.
   */
  render_docs?: (markdown: string) => string;
  /** called with every hover and query type before it is highlighted. */
  process_type?: (type: string) => string;
  /**
   * `"split"` (the default) gives each jsdoc tag its own element; `"raw"`
   * keeps the docs as one escaped block, with no tag elements at all.
   */
  docs_tags?: "split" | "raw";
}

interface BaseWrapper {
  start: number;
  end: number;
  kind: string;
}
interface HoverWrapper extends BaseWrapper {
  kind: "hover";
  text: string;
  docs?: string;
  tags?: DocTag[];
}

interface ErrorWrapper extends BaseWrapper {
  kind: "error";
  code?: string | number;
  level: NodeError["level"];
}

interface HighlightWrapper extends BaseWrapper {
  kind: "highlight";
  text?: string;
}

export type Wrapper = HoverWrapper | ErrorWrapper | HighlightWrapper;

/**
 * a completion list. twoslash reports `^|` as a zero-length node, so unlike
 * the wrappers above it decorates no text: it anchors to a single offset
 * (the caret, sitting just after `prefix`) and renders an empty host there.
 * `render` keys these by that offset, so it is not repeated here.
 */
export interface CompletionPoint {
  prefix: string;
  completions: CompletionItem[];
}

interface ErrorLineAnnotation {
  kind: "error-line";
  text: string;
  code?: string | number;
  level: NodeError["level"];
}

interface QueryLineAnnotation {
  kind: "query";
  text: string;
  docs?: string;
  tags?: DocTag[];
}

interface TagLineAnnotation {
  kind: "tag";
  name: string;
  text?: string;
}

export type LineAnnotation = ErrorLineAnnotation | QueryLineAnnotation | TagLineAnnotation;
