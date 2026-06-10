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
      parent: 0,
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
      parent: 0,
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

describe("frame_track — declarative brace kinds", () => {
  // JS-shaped toy: keywords for body markers and block-leading shapes,
  // operators for arrows and angles, `:` as punctuation.
  const kinds_toy: Grammar = {
    name: "kinds_toy",
    states: {
      root: {
        rules: [
          { match: ["class", "interface", "do", "else"], boundary: true, token: "keyword" },
          { match: ["=>", "<", ">>", ">"], token: "operator" },
          {
            range: [
              ["a", "z"],
              ["A", "Z"],
            ],
            token: "identifier",
          },
          { match: ["(", ")", "{", "}", "[", "]", ",", ";", ":", "="], token: "punctuation" },
          { match: [" ", "\n"] },
        ],
      },
    },
  };
  const kinds_compiled = compile(kinds_toy);

  const tracker = frame_track({
    punct_type: "punctuation",
    brackets: {
      paren: { open: "(", close: ")" },
      brace: { open: "{", close: "}" },
      bracket: { open: "[", close: "]" },
    },
    brace_kinds: {
      body_markers: [
        { type: "keyword", text: "class", kind: "class" },
        { type: "keyword", text: "interface", kind: "interface" },
      ],
      pending_in_angles_kind: "type_literal",
      angles: {
        type: "operator",
        open: "<",
        closes: [
          { text: ">", pops: 1 },
          { text: ">>", pops: 2 },
        ],
      },
      prev_rules: [
        { prev_type: "operator", prev_texts: ["=>"], kind: "block" },
        { prev_type: "punctuation", prev_texts: [":"], kind: "type_literal" },
        { prev_type: "keyword", prev_texts: ["do", "else"], kind: "block" },
        { prev_type: "punctuation", prev_last_char_in: ")", kind: "block" },
      ],
      default_kind: "object",
      start_kind: "block",
    },
    at_start: {
      reset_chars: ",;",
      rearm_after_close_kinds: ["class", "interface"],
    },
  });

  function run_kinds(src: string): FrameTable {
    const raw = tokenize(src, kinds_compiled);
    const out = reclassify([tracker])(src, raw);
    return out.frames as FrameTable;
  }

  function kind_of(f: FrameTable, frame_idx: number): string {
    return f.kind_names[f.frames[frame_idx].kind];
  }

  test("kind_names exposes builtins followed by spec kinds", () => {
    const f = run_kinds("x");
    expect(f.kind_names.slice(0, 3)).toEqual(["top", "paren", "bracket"]);
    for (const name of ["class", "interface", "type_literal", "block", "object"]) {
      expect(f.kind_names.indexOf(name)).toBeGreaterThan(2);
    }
  });

  test("body marker claims the next top-level brace", () => {
    const f = run_kinds("class C { x }");
    expect(kind_of(f, 1)).toBe("class");
  });

  test("marker survives a generic-constraint type literal", () => {
    const f = run_kinds("class C < T extends { x } > { y }");
    // first brace opens inside angles: type literal, marker stays armed.
    expect(kind_of(f, 1)).toBe("type_literal");
    // second brace is the real body.
    expect(kind_of(f, 2)).toBe("class");
  });

  test("marker is not consumed inside paren nesting", () => {
    const f = run_kinds("interface I ( { x } )");
    // brace inside parens: falls through to prev rules (prev is `(` ->
    // no rule matches -> object); the marker stays armed.
    expect(kind_of(f, 2)).toBe("object");
  });

  test("prev rules classify arrow, annotation, keyword, and call shapes", () => {
    expect(kind_of(run_kinds("a => { x }"), 1)).toBe("block");
    expect(kind_of(run_kinds("a : { x }"), 1)).toBe("type_literal");
    expect(kind_of(run_kinds("do { x }"), 1)).toBe("block");
    const f = run_kinds("f ( ) { x }");
    expect(kind_of(f, 2)).toBe("block");
  });

  test("default and start kinds", () => {
    expect(kind_of(run_kinds("a = { x }"), 1)).toBe("object");
    expect(kind_of(run_kinds("{ x }"), 1)).toBe("block");
  });

  test("member close re-arms at_start when the parent kind is listed", () => {
    const f = run_kinds("class C { m ( ) { } n ( ) }");
    // tokens: class C { m ( ) { } n ( ) }
    //         0     1 2 3 4 5 6 7 8 9 ...
    const n_idx = 8;
    expect(f.at_start[n_idx]).toBe(1);
  });

  test("member close does not re-arm inside unlisted kinds", () => {
    const f = run_kinds("a = { m ( ) { } b }");
    // tokens: a = { m ( ) { } b }
    //         0 1 2 3 4 5 6 7 8 9
    expect(kind_of(f, 1)).toBe("object");
    expect(f.at_start[8]).toBe(0);
  });

  test("parent links chain frames to their enclosing scope", () => {
    const f = run_kinds("a ( { b } )");
    expect(f.frames[1].parent).toBe(0); // paren -> TOP
    expect(f.frames[2].parent).toBe(1); // brace -> paren
  });

  test("braces keep the TOP placeholder kind when brace_kinds is omitted", () => {
    const f = run_frames("a { b }");
    expect(f.frames[1].kind).toBe(FRAME_KIND_TOP);
    expect(f.kind_names).toEqual(["top", "paren", "bracket"]);
  });
});
