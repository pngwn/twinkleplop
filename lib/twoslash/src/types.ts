// hover, error, error-line, highlight, completion, tag, query
import type { NodeCompletion, NodeError, TwoslashOptions } from "twoslash";

/** A JSDoc tag as twoslash reports it: `["param", "a the first operand"]`. */
export type DocTag = [name: string, text: string | undefined];

/** One completion list entry. `docs` is optional and rarely populated by the compiler. */
export type CompletionItem = NodeCompletion["completions"][number] & { docs?: string };

export interface HighlightOptions {
  lang?: "ts" | "tsx" | "js" | "jsx";
  class_name?: string;
  /** Passed straight through to twoslash. `customTags` here merges with `custom_tags`. */
  twoslash?: TwoslashOptions;
  /**
   * Tags usable as `// @<tag>: text` without twoslash rejecting them as an
   * unknown compiler flag. Defaults to `["annotate", "log", "warn", "error"]`.
   * Pass `[]` to disable custom tags entirely.
   */
  custom_tags?: string[];
  /**
   * Called when twoslash rejects the snippet — an unlisted compiler error, an
   * unknown flag, syntax it cannot process. Return a string to use as the
   * result of the highlight call; return nothing to rethrow.
   */
  on_error?: (error: unknown, code: string) => string | void;
  /**
   * Called with the raw JSDoc of every documented hover, query and completion
   * entry, and with every doc-tag value. The return value is inserted into the
   * docs element as-is, so it is trusted HTML: sanitise it yourself if the
   * JSDoc it came from is untrusted. Without this option docs are escaped text.
   */
  render_docs?: (markdown: string) => string;
  /** Called with the type string of every hover and query before it is highlighted. */
  process_type?: (type: string) => string;
  /**
   * `"split"` (the default) gives every JSDoc tag its own element. `"raw"`
   * leaves the docs as the single escaped block they were before doc tags
   * were rendered at all.
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

interface CompletionWrapper extends BaseWrapper {
  kind: "completion";
  prefix: string;
  completions: CompletionItem[];
}

export type Wrapper = HoverWrapper | ErrorWrapper | HighlightWrapper | CompletionWrapper;

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
