// hover, error, error-line, highlight, completion, tag, query
import type { NodeCompletion, NodeError, TwoslashOptions } from "twoslash";

export interface HighlightOptions {
  lang?: "ts" | "tsx" | "js" | "jsx";
  class_name?: string;
  twoslash?: TwoslashOptions;
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
  completions: NodeCompletion["completions"];
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
}

interface TagLineAnnotation {
  kind: "tag";
  name: string;
  text?: string;
}

export type LineAnnotation = ErrorLineAnnotation | QueryLineAnnotation | TagLineAnnotation;
