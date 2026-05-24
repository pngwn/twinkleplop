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

// shared sentinel for the disabled-at_start fast path: a single zero-length
// Uint8Array reused across calls so we don't pay per-call allocation when
// the consumer doesn't need at_start.
const EMPTY_U8 = new Uint8Array(0);

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
  // at_start config. reset_chars is a small char-code lookup; the empty
  // string disables at_start tracking entirely.
  at_start_reset_chars: number[];
  at_start_transparent: string[];
  // text-specific transparency, one entry per type that has transparent
  // texts. resolved against token_types lazily (the type id may not be
  // known when the spec is compiled).
  at_start_transparent_texts: { type: string; texts: Set<string> }[];
  at_start_enabled: boolean;
  classify_brace: FrameSpec["classify_brace"];
}

function compile_frame_spec(spec: FrameSpec): CompiledFrameSpec {
  const single = (s: string | undefined): number =>
    s !== undefined && s.length > 0 ? s.charCodeAt(0) : -1;
  const at_start_chars: number[] = [];
  if (spec.at_start !== undefined) {
    for (let i = 0; i < spec.at_start.reset_chars.length; i++) {
      at_start_chars.push(spec.at_start.reset_chars.charCodeAt(i));
    }
  }
  const transparent_texts = (spec.at_start?.transparent_texts_for_type ?? []).map((e) => ({
    type: e.type,
    texts: new Set(e.texts),
  }));
  return {
    punct_type: spec.punct_type,
    paren_open: single(spec.brackets.paren?.open),
    paren_close: single(spec.brackets.paren?.close),
    brace_open: single(spec.brackets.brace?.open),
    brace_close: single(spec.brackets.brace?.close),
    bracket_open: single(spec.brackets.bracket?.open),
    bracket_close: single(spec.brackets.bracket?.close),
    at_start_reset_chars: at_start_chars,
    at_start_transparent: spec.at_start?.transparent_types ?? [],
    at_start_transparent_texts: transparent_texts,
    at_start_enabled: spec.at_start !== undefined,
    classify_brace: spec.classify_brace,
  };
}

// pre-compile spec once. closures over the compiled spec capture the
// punct_type id lookup at first call, memoised against the token_types
// array reference (the same trick the JS scanner uses for tag_name lookups).
export function frame_track(spec: FrameSpec): Reclassifier {
  const compiled = compile_frame_spec(spec);
  const punct_cache = new WeakMap<string[], number>();
  const trivia_cache = new WeakMap<string[], Uint8Array>();
  const transparent_cache = new WeakMap<string[], Uint8Array>();

  return (input: string, result: TokenizeResult): TokenizeResult => {
    let punct_id = punct_cache.get(result.token_types);
    if (punct_id === undefined) {
      punct_id = result.token_types.indexOf(compiled.punct_type);
      punct_cache.set(result.token_types, punct_id);
    }

    // trivia + transparent tables are only consulted when at_start tracking
    // is enabled. resolving them eagerly added noticeable cost on the
    // at_start-disabled path (~30% slower on plain_js). skip them entirely
    // when at_start is off.
    let transparent: Uint8Array | null = null;
    let trivia: Uint8Array | null = null;
    // map from type_id -> set of texts that are transparent for THAT type.
    // null entry means no text-specific transparency for that type. -1
    // sentinel slot avoided by sizing to type count.
    let transparent_texts: (Set<string> | null)[] | null = null;
    if (compiled.at_start_enabled) {
      transparent = transparent_cache.get(result.token_types) ?? null;
      if (transparent === null) {
        transparent = new Uint8Array(result.token_types.length);
        for (let i = 0; i < compiled.at_start_transparent.length; i++) {
          const id = result.token_types.indexOf(compiled.at_start_transparent[i]);
          if (id >= 0) transparent[id] = 1;
        }
        transparent_cache.set(result.token_types, transparent);
      }
      trivia = trivia_cache.get(result.token_types) ?? null;
      if (trivia === null) {
        trivia = new Uint8Array(result.token_types.length);
        const comment_id = result.token_types.indexOf("comment");
        if (comment_id >= 0) trivia[comment_id] = 1;
        trivia_cache.set(result.token_types, trivia);
      }
      if (compiled.at_start_transparent_texts.length > 0) {
        transparent_texts = new Array(result.token_types.length).fill(null);
        for (const entry of compiled.at_start_transparent_texts) {
          const id = result.token_types.indexOf(entry.type);
          if (id >= 0) transparent_texts[id] = entry.texts;
        }
      }
    }

    // hoist hot-path config reads to locals so V8 does not re-read object
    // properties on every iteration.
    const at_start_enabled = compiled.at_start_enabled;
    const paren_open = compiled.paren_open;
    const paren_close = compiled.paren_close;
    const brace_open = compiled.brace_open;
    const brace_close = compiled.brace_close;
    const bracket_open = compiled.bracket_open;
    const bracket_close = compiled.bracket_close;
    const reset_chars = compiled.at_start_reset_chars;
    const reset_chars_len = reset_chars.length;
    const classify_brace = compiled.classify_brace;

    const { tokens, token_types } = result;
    const n = tokens.length / 3;
    const active_frame = new Uint32Array(n);
    const depths = new Uint8Array(n * 3);
    // skip allocating the at_start array when tracking is disabled. consumers
    // gate their use on whether the spec configured at_start to begin with.
    const at_start = at_start_enabled ? new Uint8Array(n) : EMPTY_U8;
    const frames: FrameRecord[] = [
      { bracket: -1, kind: FRAME_KIND_TOP, enter_idx: -1 },
    ];
    const stack: number[] = [0];
    // parallel stack of `at_start` flags per frame entry. always allocated
    // (it is small) so the inner loop can write to it unconditionally when
    // tracking is enabled. when disabled, the conditional writes are skipped
    // by the at_start_enabled guard and the array stays at length 1.
    const stack_at_start: number[] = [1];

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

      let is_trivia = false;
      let is_transparent = false;
      if (at_start_enabled) {
        is_trivia = trivia![ttype] === 1;
        is_transparent = transparent![ttype] === 1;
        if (!is_transparent && transparent_texts !== null) {
          const text_set = transparent_texts[ttype];
          if (text_set !== null) {
            const s = tokens[base + 1];
            const e = tokens[base + 2];
            if (text_set.has(input.slice(s, e))) is_transparent = true;
          }
        }
        at_start[i] = stack_at_start[stack_at_start.length - 1];
      }

      if (punct_id >= 0 && ttype === punct_id) {
        const s = tokens[base + 1];
        const e = tokens[base + 2];
        for (let p = s; p < e; p++) {
          const c = input.charCodeAt(p);
          if (c === paren_open) {
            if (at_start_enabled) stack_at_start[stack_at_start.length - 1] = 0;
            const idx = frames.length;
            frames.push({ bracket: FRAME_BRACKET_PAREN, kind: FRAME_KIND_PAREN, enter_idx: i });
            stack.push(idx);
            stack_at_start.push(0);
            paren_depth++;
          } else if (c === paren_close) {
            if (stack.length > 1) {
              stack.pop();
              stack_at_start.pop();
            }
            if (paren_depth > 0) paren_depth--;
            if (at_start_enabled) stack_at_start[stack_at_start.length - 1] = 0;
          } else if (c === brace_open) {
            if (at_start_enabled) stack_at_start[stack_at_start.length - 1] = 0;
            const idx = frames.length;
            let kind: number = FRAME_KIND_TOP;
            if (classify_brace !== undefined) {
              kind = classify_brace(
                input,
                tokens,
                token_types,
                i,
                paren_depth,
                brace_depth,
                bracket_depth,
              );
            }
            frames.push({ bracket: FRAME_BRACKET_BRACE, kind, enter_idx: i });
            stack.push(idx);
            stack_at_start.push(1);
            brace_depth++;
          } else if (c === brace_close) {
            if (stack.length > 1) {
              stack.pop();
              stack_at_start.pop();
            }
            if (brace_depth > 0) brace_depth--;
            if (at_start_enabled) stack_at_start[stack_at_start.length - 1] = 0;
          } else if (c === bracket_open) {
            if (at_start_enabled) stack_at_start[stack_at_start.length - 1] = 0;
            const idx = frames.length;
            frames.push({ bracket: FRAME_BRACKET_BRACKET, kind: FRAME_KIND_BRACKET, enter_idx: i });
            stack.push(idx);
            stack_at_start.push(0);
            bracket_depth++;
          } else if (c === bracket_close) {
            if (stack.length > 1) {
              stack.pop();
              stack_at_start.pop();
            }
            if (bracket_depth > 0) bracket_depth--;
            if (at_start_enabled) stack_at_start[stack_at_start.length - 1] = 0;
          } else if (at_start_enabled) {
            let is_reset = false;
            for (let r = 0; r < reset_chars_len; r++) {
              if (c === reset_chars[r]) {
                is_reset = true;
                break;
              }
            }
            stack_at_start[stack_at_start.length - 1] = is_reset ? 1 : 0;
          }
        }
      } else if (at_start_enabled && !is_trivia && !is_transparent) {
        stack_at_start[stack_at_start.length - 1] = 0;
      }

      active_frame[i] = stack[stack.length - 1];
      depths[base] = paren_depth;
      depths[base + 1] = brace_depth;
      depths[base + 2] = bracket_depth;
    }

    const table: FrameTable = { active_frame, depths, at_start, frames };
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
