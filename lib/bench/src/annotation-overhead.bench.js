// annotation extractor overhead.
//
// four cells comparing the cost of running a typescript pipeline with and
// without the annotation extractor, and across three input shapes:
//
//   off — no comments              baseline (extractor not installed,
//                                    nothing for it to walk anyway)
//   on  — no comments              extractor installed but never enters
//                                    the per-comment loop
//   on  — comments, no markers     extractor walks every comment looking
//                                    for `[!`, finds none
//   on  — comments with markers    extractor parses + dispatches markers
//                                    and produces overlays
//
// the three input variants share the same code skeleton (complex_ts) so
// only the comment surface area changes between them. variants are built
// once at module load by tokenizing the source and emitting modified text
// — that avoids regex-stripping comments and accidentally eating slashes
// inside string/regex literals.

import { bench, describe } from "vitest";
import { tokenize } from "@twinkleplop/core";
import {
  tokenize as make_typescript,
  grammar as ts_grammar,
} from "@twinkleplop/typescript";
import {
  em,
  hl,
  dim,
  add,
  del,
  mod,
  err,
  warn,
  info,
} from "@twinkleplop/annotation";
import { complex_ts } from "./library/typescript-samples.js";

const WARMUP = 1000;

const { stripped, regular, with_markers } = build_variants(complex_ts);

const ts_off = make_typescript();
const ts_on = make_typescript({
  annotation: { plugins: [em, hl, dim, add, del, mod, err, warn, info] },
});

describe("Annotation overhead — TypeScript (complex)", () => {
  bench(
    "off — no comments",
    () => {
      ts_off(stripped);
    },
    { warmupTime: WARMUP },
  );

  bench(
    "on  — no comments",
    () => {
      ts_on(stripped);
    },
    { warmupTime: WARMUP },
  );

  bench(
    "off — comments, no markers",
    () => {
      ts_off(regular);
    },
    { warmupTime: WARMUP },
  );

  bench(
    "on  — comments, no markers",
    () => {
      ts_on(regular);
    },
    { warmupTime: WARMUP },
  );

  bench(
    "on  — comments with markers",
    () => {
      ts_on(with_markers);
    },
    { warmupTime: WARMUP },
  );
});

// build the three input variants from one source by walking the typescript
// token stream once. this avoids the trap of regex-stripping comments out of
// a sample that contains regex literals (complex_ts has several).
//
//   stripped     — every comment token replaced by its own newline count so
//                  line numbers stay close to the original.
//   regular      — source unchanged.
//   with_markers — first 30 line comments get a annotation marker appended
//                  before their trailing newline. mixes line-mode and
//                  anchor-range forms so dispatch hits multiple plugins.
function build_variants(source) {
  const result = tokenize(source, ts_grammar);
  const tokens = result.tokens;
  const comment_id = result.token_types.indexOf("comment");

  const marker_pool = [
    "[!em]",
    "[!hl]",
    "[!dim]",
    "[!em :3..6]",
    "[!hl +2]",
  ];
  const max_markers = 30;
  let marker_count = 0;

  let stripped = "";
  let with_markers = "";
  let prev_end = 0;

  for (let i = 0; i < tokens.length; i += 3) {
    const type = tokens[i];
    const start = tokens[i + 1];
    const end = tokens[i + 2];
    const between = source.slice(prev_end, start);
    stripped += between;
    with_markers += between;
    const text = source.slice(start, end);
    if (type === comment_id) {
      let nl = 0;
      for (let k = 0; k < text.length; k++) {
        if (text.charCodeAt(k) === 10) nl++;
      }
      stripped += "\n".repeat(nl);
      if (text.startsWith("//") && marker_count < max_markers) {
        const marker = marker_pool[marker_count % marker_pool.length];
        marker_count++;
        const trailing_nl = text.endsWith("\n");
        with_markers += trailing_nl
          ? text.slice(0, -1) + " " + marker + "\n"
          : text + " " + marker;
      } else {
        with_markers += text;
      }
    } else {
      stripped += text;
      with_markers += text;
    }
    prev_end = end;
  }
  if (prev_end < source.length) {
    const tail = source.slice(prev_end);
    stripped += tail;
    with_markers += tail;
  }

  return { stripped, regular: source, with_markers };
}
