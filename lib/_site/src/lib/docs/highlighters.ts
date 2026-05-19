// shared, annotation-enabled language highlighters for the docs site.
//
// every code snippet in `/docs/**` runs through one of these factories so
// authors can drop `[!em]`, `[!hl]`, `[!add]`, `[!del]`, etc. into example
// sources without each page wiring its own AnnotationConfig. the early-out
// in the extractor (no `[!` in input → undefined) keeps the cost on
// non-annotation snippets at noise level.

import { language as make_bash } from "@twinkleplop/bash";
import { language as make_css } from "@twinkleplop/css";
import { language as make_html } from "@twinkleplop/html";
import { language as make_ts } from "@twinkleplop/typescript";
import {
  add,
  del,
  dim,
  em,
  err,
  hl,
  info,
  mod,
  warn,
} from "@twinkleplop/annotation";

const plugins = [em, hl, dim, add, del, mod, err, warn, info];
const annotation = { plugins };

export const ts = make_ts({ annotation });
export const html = make_html({ annotation });
export const css = make_css({ annotation });
export const bash = make_bash({ annotation });

// `*_raw` variants leave annotation off entirely. used by the side-by-side
// directive demos: the input pane shows the source as authored (markers
// rendered as literal comment text), the output pane shows the fully
// rendered view. consumers that just want plain highlighting should still
// use the annotation-enabled exports above; the cost is near-zero on
// snippets without `[!`.
export const ts_raw = make_ts();
export const html_raw = make_html();
export const css_raw = make_css();
export const bash_raw = make_bash();
