import { describe, expect, test } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import { frame_track } from "./frame_track";
import {
  FRAME_BRACKET_BRACE,
  FRAME_BRACKET_BRACKET,
  FRAME_BRACKET_PAREN,
  FRAME_KIND_BRACKET,
  FRAME_KIND_PAREN,
  FRAME_KIND_TOP,
} from "./types";
import { reclassify } from "./reclassifier";
import type { Grammar, FrameTable } from "./types";

// minimal toy grammar emitting punctuation tokens for brackets and
// identifier/keyword for everything else. mirrors the toy grammar in
// reclassifier.test.ts so frame behaviour is testable in isolation.
const toy: Grammar = {
  name: "toy",
  states: {
    root: {
      rules: [
        { match: ["if", "for", "function"], boundary: true, token: "keyword" },
        {
          range: [
            ["a", "z"],
            ["A", "Z"],
          ],
          token: "identifier",
        },
        { range: [["0", "9"]], token: "number" },
        { match: ["(", ")", "{", "}", "[", "]", ",", ";", ".", "="], token: "punctuation" },
        { match: [" ", "\t", "\n"] },
      ],
    },
  },
};
const compiled = compile(toy);

function run_frames(input: string): FrameTable {
  const raw = tokenize(input, compiled);
  const tracker = frame_track({
    punct_type: "punctuation",
    brackets: {
      paren: { open: "(", close: ")" },
      brace: { open: "{", close: "}" },
      bracket: { open: "[", close: "]" },
    },
  });
  const out = reclassify([tracker])(input, raw);
  expect(out.frames).toBeDefined();
  return out.frames as FrameTable;
}

function depths_at(t: FrameTable, idx: number) {
  return {
    paren: t.depths[idx * 3],
    brace: t.depths[idx * 3 + 1],
    bracket: t.depths[idx * 3 + 2],
  };
}

describe("frame_track — bracket depth tracking", () => {
  test("flat input has all depths zero and stays on TOP frame", () => {
    const f = run_frames("foo bar baz");
    for (let i = 0; i < f.active_frame.length; i++) {
      expect(f.active_frame[i]).toBe(0);
      expect(depths_at(f, i)).toEqual({ paren: 0, brace: 0, bracket: 0 });
    }
    expect(f.frames).toHaveLength(1);
    expect(f.frames[0].kind).toBe(FRAME_KIND_TOP);
  });

  test("single paren pair pushes one frame and clears it", () => {
    // tokens: "f", "(", "x", ")"   (whitespace not tokenised)
    const f = run_frames("f ( x )");
    const t = (i: number) => f.active_frame[i];
    expect(t(0)).toBe(0); // f -> TOP
    expect(t(1)).toBe(1); // ( -> paren frame
    expect(t(2)).toBe(1); // x -> paren frame
    expect(t(3)).toBe(0); // ) -> TOP again
    expect(f.frames).toHaveLength(2);
    expect(f.frames[1]).toEqual({
      bracket: FRAME_BRACKET_PAREN,
      kind: FRAME_KIND_PAREN,
      enter_idx: 1,
    });
  });

  test("nested brackets stack correctly and depths reflect the active level", () => {
    const f = run_frames("f { g ( x ) }");
    // tokens: f { g ( x ) }
    //         0 1 2 3 4 5 6
    expect(depths_at(f, 0)).toEqual({ paren: 0, brace: 0, bracket: 0 });
    expect(depths_at(f, 1)).toEqual({ paren: 0, brace: 1, bracket: 0 });
    expect(depths_at(f, 2)).toEqual({ paren: 0, brace: 1, bracket: 0 });
    expect(depths_at(f, 3)).toEqual({ paren: 1, brace: 1, bracket: 0 });
    expect(depths_at(f, 4)).toEqual({ paren: 1, brace: 1, bracket: 0 });
    expect(depths_at(f, 5)).toEqual({ paren: 0, brace: 1, bracket: 0 });
    expect(depths_at(f, 6)).toEqual({ paren: 0, brace: 0, bracket: 0 });
  });

  test("coalesced multi-char punctuation token updates the stack incrementally", () => {
    // build a tiny grammar where "({" is its own match so the tokenizer
    // emits one token with both bracket chars. exercises the per-character
    // walk inside frame_track when a single token mutates multiple depths.
    const coalesced: Grammar = {
      name: "coalesced",
      states: {
        root: {
          rules: [
            { match: "({", token: "punctuation" },
            { match: "})", token: "punctuation" },
            { match: ["(", ")", "{", "}"], token: "punctuation" },
            { range: [["a", "z"]], token: "identifier" },
            { match: [" "] },
          ],
        },
      },
    };
    const c = compile(coalesced);
    const tracker = frame_track({
      punct_type: "punctuation",
      brackets: {
        paren: { open: "(", close: ")" },
        brace: { open: "{", close: "}" },
      },
    });
    const src = "f({ a })";
    const raw = tokenize(src, c);
    const out = reclassify([tracker])(src, raw);
    const f = out.frames as FrameTable;
    // tokens: f, ({, a, })
    //         0   1   2   3
    expect(f.frames).toHaveLength(3); // TOP + paren + brace
    expect(depths_at(f, 1)).toEqual({ paren: 1, brace: 1, bracket: 0 });
    expect(f.active_frame[1]).toBe(2); // brace was pushed second
    expect(depths_at(f, 3)).toEqual({ paren: 0, brace: 0, bracket: 0 });
    expect(f.active_frame[3]).toBe(0); // both popped
  });

  test("extra closing brackets are tolerated (depth clamps at 0)", () => {
    const f = run_frames("foo ) ) bar");
    for (let i = 0; i < f.active_frame.length; i++) {
      expect(depths_at(f, i)).toEqual({ paren: 0, brace: 0, bracket: 0 });
      expect(f.active_frame[i]).toBe(0);
    }
  });

  test("bracket pair pushes the bracket-kind frame", () => {
    const f = run_frames("a [ b ] c");
    // tokens: a [ b ] c
    expect(f.frames).toHaveLength(2);
    expect(f.frames[1]).toEqual({
      bracket: FRAME_BRACKET_BRACKET,
      kind: FRAME_KIND_BRACKET,
      enter_idx: 1,
    });
    expect(depths_at(f, 2)).toEqual({ paren: 0, brace: 0, bracket: 1 });
  });

  test("opens then closes via separate tokens leave correct trail of frame indices", () => {
    const f = run_frames("a ( b ( c ) d ) e");
    // tokens: a ( b ( c ) d ) e
    //         0 1 2 3 4 5 6 7 8
    expect(f.frames).toHaveLength(3); // TOP + 2 paren frames
    expect(f.active_frame[0]).toBe(0); // a
    expect(f.active_frame[1]).toBe(1); // first (
    expect(f.active_frame[2]).toBe(1); // b
    expect(f.active_frame[3]).toBe(2); // nested (
    expect(f.active_frame[4]).toBe(2); // c
    expect(f.active_frame[5]).toBe(1); // ) -- back to outer paren
    expect(f.active_frame[6]).toBe(1); // d
    expect(f.active_frame[7]).toBe(0); // ) -- back to TOP
    expect(f.active_frame[8]).toBe(0); // e
  });

  test("languages without configured brackets simply track nothing", () => {
    const raw = tokenize("a ( b )", compiled);
    const tracker = frame_track({
      punct_type: "punctuation",
      brackets: {}, // no bracket pairs configured
    });
    const out = reclassify([tracker])(raw === null ? "" : "a ( b )", raw);
    const f = out.frames as FrameTable;
    expect(f.frames).toHaveLength(1); // only TOP
    for (let i = 0; i < f.active_frame.length; i++) {
      expect(f.active_frame[i]).toBe(0);
      expect(depths_at(f, i)).toEqual({ paren: 0, brace: 0, bracket: 0 });
    }
  });

  test("unknown punct_type silently produces no frames", () => {
    const raw = tokenize("a ( b )", compiled);
    const tracker = frame_track({
      punct_type: "no_such_type",
      brackets: {
        paren: { open: "(", close: ")" },
      },
    });
    const out = reclassify([tracker])("a ( b )", raw);
    const f = out.frames as FrameTable;
    expect(f.frames).toHaveLength(1);
    for (let i = 0; i < f.active_frame.length; i++) {
      expect(f.active_frame[i]).toBe(0);
    }
  });
});

describe("frame_track — at_start tracking", () => {
  function run_with_at_start(input: string): FrameTable {
    const raw = tokenize(input, compiled);
    const tracker = frame_track({
      punct_type: "punctuation",
      brackets: {
        paren: { open: "(", close: ")" },
        brace: { open: "{", close: "}" },
        bracket: { open: "[", close: "]" },
      },
      at_start: {
        reset_chars: ",;",
      },
    });
    const out = reclassify([tracker])(input, raw);
    return out.frames as FrameTable;
  }

  test("first significant token in a brace frame has at_start = true", () => {
    const f = run_with_at_start("f { a b c }");
    // tokens: f { a b c }
    //         0 1 2 3 4 5
    expect(f.at_start[0]).toBe(1); // f at TOP, fresh
    expect(f.at_start[1]).toBe(0); // { is itself punctuation, consumes top's at_start
    expect(f.at_start[2]).toBe(1); // a first token in brace frame
    expect(f.at_start[3]).toBe(0); // b after a -> consumed
    expect(f.at_start[4]).toBe(0); // c after b -> still consumed
  });

  test("commas re-arm at_start on the top frame", () => {
    const f = run_with_at_start("{ a , b , c }");
    // tokens: { a , b , c }
    //         0 1 2 3 4 5 6
    expect(f.at_start[1]).toBe(1); // a fresh
    expect(f.at_start[3]).toBe(1); // b after ,
    expect(f.at_start[5]).toBe(1); // c after ,
  });

  test("semicolons re-arm at_start", () => {
    const f = run_with_at_start("{ a ; b ; c }");
    expect(f.at_start[1]).toBe(1);
    expect(f.at_start[3]).toBe(1);
    expect(f.at_start[5]).toBe(1);
  });

  test("paren frames start with at_start = false but commas still re-arm", () => {
    const f = run_with_at_start("( a , b )");
    // tokens: ( a , b )
    //         0 1 2 3 4
    // paren frames open with at_start=false so the FIRST token inside a
    // paren does not see at_start=true. reset chars (`,` `;`) still re-arm
    // at_start uniformly across frame types -- downstream reclassifiers
    // that only care about brace-kind frames check active_frame[i] and
    // gate their at_start consumption on the frame kind.
    expect(f.at_start[1]).toBe(0); // a is first inside paren -> false
    expect(f.at_start[3]).toBe(1); // b is first after `,` -> re-armed
  });

  test("nested frames have independent at_start state", () => {
    const f = run_with_at_start("{ a , { b } , c }");
    // tokens: { a , { b } , c }
    //         0 1 2 3 4 5 6 7 8
    expect(f.at_start[1]).toBe(1); // a is first in outer brace
    expect(f.at_start[4]).toBe(1); // b is first in inner brace
    expect(f.at_start[7]).toBe(1); // c is first after `,` in outer brace
  });
});

describe("frame_track — brace classification hook", () => {
  test("classify_brace receives the open token index and current depths", () => {
    let captured_idx = -1;
    let captured_depths: [number, number, number] | null = null;
    const tracker = frame_track({
      punct_type: "punctuation",
      brackets: { brace: { open: "{", close: "}" } },
      classify_brace: (_input, _tokens, _types, open_idx, p, b, br) => {
        captured_idx = open_idx;
        captured_depths = [p, b, br];
        return 42; // arbitrary language-defined kind
      },
    });
    const src = "f { x }";
    const raw = tokenize(src, compiled);
    const out = reclassify([tracker])(src, raw);
    const f = out.frames as FrameTable;
    expect(captured_idx).toBe(1); // `{` is token 1
    expect(captured_depths).toEqual([0, 0, 0]); // depths BEFORE the open
    expect(f.frames[1].kind).toBe(42);
  });

  test("nested braces pass the parent depth to the classifier", () => {
    const calls: number[][] = [];
    const tracker = frame_track({
      punct_type: "punctuation",
      brackets: { brace: { open: "{", close: "}" } },
      classify_brace: (_input, _tokens, _types, open_idx, p, b, br) => {
        calls.push([open_idx, p, b, br]);
        return b + 1; // outer brace=1, inner brace=2
      },
    });
    const src = "{ x { y } z }";
    const raw = tokenize(src, compiled);
    const out = reclassify([tracker])(src, raw);
    const f = out.frames as FrameTable;
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual([0, 0, 0, 0]); // outer { at depth 0
    expect(calls[1]).toEqual([2, 0, 1, 0]); // inner { at brace depth 1
    expect(f.frames[1].kind).toBe(1);
    expect(f.frames[2].kind).toBe(2);
  });

  test("classifier is not called for non-brace punctuation", () => {
    let call_count = 0;
    const tracker = frame_track({
      punct_type: "punctuation",
      brackets: {
        paren: { open: "(", close: ")" },
        brace: { open: "{", close: "}" },
      },
      classify_brace: () => {
        call_count++;
        return 7;
      },
    });
    const src = "f ( a ) g [ b ]";
    const raw = tokenize(src, compiled);
    reclassify([tracker])(src, raw);
    expect(call_count).toBe(0);
  });
});
