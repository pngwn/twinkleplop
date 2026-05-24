// frame_track — shared scope-stack pre-pass for reclassifiers
//
// walks the token stream once, maintaining a bracket-aware scope stack, and
// emits per-token side tables (`active_frame`, `depths`) that downstream
// reclassifiers can query in O(1). this consolidates the bracket-tracking
// loop that ~4 hand-written reclassifiers each used to maintain themselves
// (claim_property_scope, promote_js_const_bindings, promote_js_parameters,
// type_position_promoter).
//
// this v0 produces the minimal viable schema: bracket kind, enter index,
// and three depth counters per token. brace kind classification (class /
// interface / object literal / type literal / block) and at_start tracking
// are layered on in subsequent passes.

import type {
  FrameRecord,
  FrameSpec,
  FrameTable,
  Reclassifier,
  TokenizeResult,
} from "./types";
import {
  FRAME_BRACKET_BRACE,
  FRAME_BRACKET_BRACKET,
  FRAME_BRACKET_PAREN,
  FRAME_KIND_BRACKET,
  FRAME_KIND_PAREN,
  FRAME_KIND_TOP,
} from "./types";

// bracket character codes resolved from the spec, plus pre-computed
// per-bracket constants. -1 means "this bracket is not configured for
// this language" -- the corresponding char never matches.
interface CompiledFrameSpec {
  punct_type: string;
  paren_open: number;
  paren_close: number;
  brace_open: number;
  brace_close: number;
  bracket_open: number;
  bracket_close: number;
}

function compile_frame_spec(spec: FrameSpec): CompiledFrameSpec {
  const single = (s: string | undefined): number =>
    s !== undefined && s.length > 0 ? s.charCodeAt(0) : -1;
  return {
    punct_type: spec.punct_type,
    paren_open: single(spec.brackets.paren?.open),
    paren_close: single(spec.brackets.paren?.close),
    brace_open: single(spec.brackets.brace?.open),
    brace_close: single(spec.brackets.brace?.close),
    bracket_open: single(spec.brackets.bracket?.open),
    bracket_close: single(spec.brackets.bracket?.close),
  };
}

// pre-compile spec once. closures over the compiled spec capture the
// punct_type id lookup at first call, memoised against the token_types
// array reference (the same trick the JS scanner uses for tag_name lookups).
export function frame_track(spec: FrameSpec): Reclassifier {
  const compiled = compile_frame_spec(spec);
  const type_id_cache = new WeakMap<string[], number>();

  return (input: string, result: TokenizeResult): TokenizeResult => {
    let punct_id = type_id_cache.get(result.token_types);
    if (punct_id === undefined) {
      punct_id = result.token_types.indexOf(compiled.punct_type);
      type_id_cache.set(result.token_types, punct_id);
    }

    const { tokens } = result;
    const n = tokens.length / 3;
    const active_frame = new Uint32Array(n);
    const depths = new Uint8Array(n * 3);
    const frames: FrameRecord[] = [
      { bracket: -1, kind: FRAME_KIND_TOP, enter_idx: -1 },
    ];
    // stack of indices into `frames`. starts with index 0 (the TOP sentinel).
    const stack: number[] = [0];

    let paren_depth = 0;
    let brace_depth = 0;
    let bracket_depth = 0;

    // a punctuation token may contain multiple bracket characters
    // (e.g. `({` coalesces into one token). walk every character and update
    // the stack incrementally; the per-token snapshot is the state AFTER
    // the last character.
    for (let i = 0; i < n; i++) {
      const base = i * 3;
      const ttype = tokens[base];
      if (punct_id >= 0 && ttype === punct_id) {
        const s = tokens[base + 1];
        const e = tokens[base + 2];
        for (let p = s; p < e; p++) {
          const c = input.charCodeAt(p);
          if (c === compiled.paren_open) {
            const idx = frames.length;
            frames.push({ bracket: FRAME_BRACKET_PAREN, kind: FRAME_KIND_PAREN, enter_idx: i });
            stack.push(idx);
            paren_depth++;
          } else if (c === compiled.paren_close) {
            if (stack.length > 1) stack.pop();
            if (paren_depth > 0) paren_depth--;
          } else if (c === compiled.brace_open) {
            const idx = frames.length;
            // kind for braces is determined by a later pass (brace_classifier).
            // v0 leaves it at FRAME_KIND_TOP which downstream consumers can
            // detect as "unclassified."
            frames.push({ bracket: FRAME_BRACKET_BRACE, kind: FRAME_KIND_TOP, enter_idx: i });
            stack.push(idx);
            brace_depth++;
          } else if (c === compiled.brace_close) {
            if (stack.length > 1) stack.pop();
            if (brace_depth > 0) brace_depth--;
          } else if (c === compiled.bracket_open) {
            const idx = frames.length;
            frames.push({ bracket: FRAME_BRACKET_BRACKET, kind: FRAME_KIND_BRACKET, enter_idx: i });
            stack.push(idx);
            bracket_depth++;
          } else if (c === compiled.bracket_close) {
            if (stack.length > 1) stack.pop();
            if (bracket_depth > 0) bracket_depth--;
          }
        }
      }
      active_frame[i] = stack[stack.length - 1];
      depths[base] = paren_depth;
      depths[base + 1] = brace_depth;
      depths[base + 2] = bracket_depth;
    }

    const table: FrameTable = { active_frame, depths, frames };
    // attach to result -- callers must clone result.tokens before mutating
    // anyway (per the reclassifier contract), and frames is computed off
    // tokens so a later splice-changing reclassifier invalidates it. by
    // convention, splice-changing reclassifiers strip `frames` from their
    // output; pure type-claim reclassifiers preserve it.
    return {
      tokens: result.tokens,
      token_types: result.token_types,
      overlays: result.overlays,
      frames: table,
    };
  };
}
