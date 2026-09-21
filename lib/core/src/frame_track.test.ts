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
  SIGNAL_TERNARY_COLON,
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
      marker_reset_chars: ";,:",
      angles: {
        type: "operator",
        open: "<",
        closes: [
          { text: ">", pops: 1 },
          { text: ">>", pops: 2 },
        ],
        reset_chars: ";",
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

  // `<` is also less-than in the C family, so an unbalanced comparison
  // leaves the angle counter armed. Left alone it never comes back down,
  // and every later brace classifies as if it were inside a generic.
  test("an unbalanced comparison does not leak into the next brace", () => {
    const f = run_kinds("f ( a < b ; ) class C { x }");
    expect(kind_of(f, 2)).toBe("class");
  });

  test("a closing brace resynchronises the angle counter", () => {
    const f = run_kinds("do { a < b } class C { x }");
    expect(kind_of(f, 1)).toBe("block");
    expect(kind_of(f, 2)).toBe("class");
  });

  test("resync does not disturb a real generic constraint", () => {
    const f = run_kinds("class C < T extends { x ; y } > { z }");
    expect(kind_of(f, 1)).toBe("type_literal");
    expect(kind_of(f, 2)).toBe("class");
  });

  // a body marker's text is also a legal property name, so a key arms a
  // marker that no brace of its own ever consumes.
  test("a body marker used as a key does not claim the next brace", () => {
    const f = run_kinds("a = { class : b } c = { d : e }");
    expect(kind_of(f, 1)).toBe("object");
    expect(kind_of(f, 2)).toBe("object");
  });

  test("a marker survives separators nested below its own depth", () => {
    const f = run_kinds("class C < T extends { x ; y } > { z }");
    expect(kind_of(f, 2)).toBe("class");
  });

  test("a marker still reaches a brace with no separator between", () => {
    expect(kind_of(run_kinds("class C extends D { x }"), 1)).toBe("class");
    expect(kind_of(run_kinds("a = class { x }"), 1)).toBe("class");
  });
});

describe("frame_track — scan_back and in_kinds prev rules", () => {
  // toy shaped like the JS/TS spec's two hard brace positions: a return
  // type between `)` and the body brace, and a switch label whose colon
  // is a statement separator rather than an annotation.
  const scan_toy: Grammar = {
    name: "scan_toy",
    states: {
      root: {
        rules: [
          { match: ["case", "default", "void", "switch"], boundary: true, token: "keyword" },
          { match: ["=>", "<", ">"], token: "operator" },
          {
            range: [
              ["a", "z"],
              ["A", "Z"],
            ],
            token: "identifier",
          },
          { range: [["0", "9"]], token: "number" },
          { match: ["(", ")", "{", "}", "[", "]", ",", ";", ":", ".", "="], token: "punctuation" },
          { match: [" ", "\n"] },
        ],
      },
    },
  };
  const scan_compiled = compile(scan_toy);

  const return_scan = {
    over: [
      { type: "identifier" },
      { type: "keyword", texts: ["void"] },
      { type: "operator", texts: ["<", ">"] },
      { type: "punctuation", chars: ".[]," },
    ],
    to: { type: "punctuation", last_char_in: ":", preceded_by_char_in: ")" },
  };

  function make_tracker(max?: number) {
    return frame_track({
      punct_type: "punctuation",
      brackets: {
        paren: { open: "(", close: ")" },
        brace: { open: "{", close: "}" },
        bracket: { open: "[", close: "]" },
      },
      brace_kinds: {
        prev_rules: [
          {
            prev_type: "punctuation",
            prev_texts: [":"],
            in_kinds: ["block"],
            scan_back: {
              over: [
                { type: "identifier" },
                { type: "number" },
                { type: "punctuation", chars: "." },
              ],
              to: { type: "keyword", texts: ["case", "default"] },
            },
            kind: "block",
          },
          { prev_type: "punctuation", prev_texts: [":"], kind: "type_literal" },
          { prev_type: "punctuation", prev_last_char_in: ")", kind: "block" },
          {
            prev_type: "identifier",
            scan_back: max === undefined ? return_scan : { ...return_scan, max },
            kind: "block",
          },
          {
            prev_type: "keyword",
            prev_texts: ["void"],
            scan_back: max === undefined ? return_scan : { ...return_scan, max },
            kind: "block",
          },
          {
            prev_type: "operator",
            prev_texts: [">"],
            scan_back: max === undefined ? return_scan : { ...return_scan, max },
            kind: "block",
          },
          {
            prev_type: "punctuation",
            prev_last_char_in: "]",
            scan_back: max === undefined ? return_scan : { ...return_scan, max },
            kind: "block",
          },
        ],
        default_kind: "object",
        start_kind: "block",
      },
      at_start: { reset_chars: ",;" },
    });
  }
  const tracker = make_tracker();

  function kinds_of(src: string, t = tracker): string[] {
    const raw = tokenize(src, scan_compiled);
    const out = reclassify([t])(src, raw);
    const f = out.frames as FrameTable;
    return f.frames
      .filter((fr) => fr.bracket === FRAME_BRACKET_BRACE)
      .map((fr) => f.kind_names[fr.kind]);
  }

  test("walks a return type back to the `):` that opened it", () => {
    expect(kinds_of("f ( a ) : void { x }")).toEqual(["block"]);
    expect(kinds_of("f ( a ) : Result { x }")).toEqual(["block"]);
  });

  test("walks over generic, indexed and tuple type tails", () => {
    expect(kinds_of("f ( a ) : Map < K , V > { x }")).toEqual(["block"]);
    expect(kinds_of("f ( a ) : Series [ u ] { x }")).toEqual(["block"]);
  });

  test("landing shape reads characters, so a coalesced `):` still matches", () => {
    // no spaces: the grammar coalesces `):` into one punctuation token,
    // and `preceded_by_char_in` reads the char before the `:` inside it.
    expect(kinds_of("f(a): void {x}")).toEqual(["block"]);
  });

  test("a walk that reaches no `):` leaves the brace on the default kind", () => {
    expect(kinds_of("a = { x }")).toEqual(["object"]);
    expect(kinds_of("f ( a ) . b { x }")).toEqual(["object"]);
  });

  test("the walk stops at the first token outside the over set", () => {
    // `=` is in no `over` entry, so the walk gives up before the `):`.
    expect(kinds_of("f ( a ) : void = b { x }")).toEqual(["object"]);
  });

  test("max bounds the walk", () => {
    const src = "f ( a ) : A , B , C , D { x }";
    expect(kinds_of(src)).toEqual(["block"]);
    expect(kinds_of(src, make_tracker(3))).toEqual(["object"]);
  });

  test("a label colon opens a block, a bare colon still opens a type literal", () => {
    expect(kinds_of("switch ( k ) { case 1 : { x } }")).toEqual(["block", "block"]);
    expect(kinds_of("switch ( k ) { default : { x } }")).toEqual(["block", "block"]);
    expect(kinds_of("switch ( k ) { case U . B : { x } }")).toEqual(["block", "block"]);
    expect(kinds_of("a : { x }")).toEqual(["type_literal"]);
  });

  test("in_kinds gates the label rule on the enclosing frame", () => {
    // same token shape, but the enclosing frame is an object literal:
    // `default` is a property name there, not a switch label.
    expect(kinds_of("a = { default : { x } }")).toEqual(["object", "type_literal"]);
    expect(kinds_of("a = { case : { x } }")).toEqual(["object", "type_literal"]);
  });

  test("an unknown in_kinds name warns and never matches", () => {
    const t = frame_track({
      punct_type: "punctuation",
      brackets: { brace: { open: "{", close: "}" } },
      brace_kinds: {
        prev_rules: [
          { prev_type: "punctuation", prev_texts: [":"], in_kinds: ["nope"], kind: "block" },
        ],
        default_kind: "object",
      },
    });
    expect(kinds_of("a : { x }", t)).toEqual(["object"]);
  });
});

describe("frame_track — ternary and stmt flag signals", () => {
  // grammar with a `?` operator and `:` punctuation so ternary pairs and
  // annotation colons are distinguishable, plus declarator keywords for
  // the stmt flag.
  const sig: Grammar = {
    name: "sig",
    states: {
      root: {
        rules: [
          { match: ["let", "const", "if", "return"], boundary: true, token: "keyword" },
          {
            range: [
              ["a", "z"],
              ["A", "Z"],
            ],
            token: "identifier",
          },
          { range: [["0", "9"]], token: "number" },
          { match: ["?", "="], token: "operator" },
          { match: ["(", ")", "{", "}", "[", "]", ",", ";", ":"], token: "punctuation" },
          { match: [" ", "\t", "\n"] },
        ],
      },
    },
  };
  const sig_compiled = compile(sig);

  const tracker = frame_track({
    punct_type: "punctuation",
    brackets: {
      paren: { open: "(", close: ")" },
      brace: { open: "{", close: "}" },
      bracket: { open: "[", close: "]" },
    },
    ternary: { qmark: { type: "operator", text: "?" }, colon_char: ":" },
    stmt_flags: [
      {
        name: "var_decl",
        arm: { type: "keyword", texts: ["let", "const"] },
        clear: { type: "keyword", texts: ["if", "return"] },
        clear_chars: ";",
        clear_on_brace_close: true,
      },
    ],
  });

  // flag 0 occupies signals bit 1.
  const VAR_DECL = 1 << 1;

  function run_signals(input: string): { table: FrameTable; toks: string[] } {
    const raw = tokenize(input, sig_compiled);
    const out = reclassify([tracker])(input, raw);
    expect(out.frames).toBeDefined();
    const table = out.frames as FrameTable;
    const toks: string[] = [];
    for (let i = 0; i < out.tokens.length / 3; i++) {
      toks.push(input.slice(out.tokens[i * 3 + 1], out.tokens[i * 3 + 2]));
    }
    return { table, toks };
  }

  // index of the nth token whose text contains needle. containment rather
  // than equality so coalesced punctuation bundles still match.
  function find_tok(toks: string[], needle: string, nth = 0): number {
    let seen = 0;
    for (let i = 0; i < toks.length; i++) {
      if (toks[i].includes(needle)) {
        if (seen === nth) return i;
        seen++;
      }
    }
    throw new Error(`token containing "${needle}" #${nth} not found in [${toks.join(" ")}]`);
  }

  test("ternary colon is marked, annotation colon is not", () => {
    const { table, toks } = run_signals("a ? b : c ; x : y");
    const ternary = find_tok(toks, ":", 0);
    const annotation = find_tok(toks, ":", 1);
    expect(table.signals[ternary] & SIGNAL_TERNARY_COLON).toBe(SIGNAL_TERNARY_COLON);
    expect(table.signals[annotation] & SIGNAL_TERNARY_COLON).toBe(0);
  });

  test("counters are per frame", () => {
    const { table, toks } = run_signals("x ? f ( a ? b : c ) : d");
    const inner = find_tok(toks, ":", 0);
    const outer = find_tok(toks, ":", 1);
    expect(table.signals[inner] & SIGNAL_TERNARY_COLON).toBe(SIGNAL_TERNARY_COLON);
    expect(table.signals[outer] & SIGNAL_TERNARY_COLON).toBe(SIGNAL_TERNARY_COLON);
  });

  test("a qmark dies with its frame", () => {
    const { table, toks } = run_signals("f ( a ? b ) : c");
    const colon = find_tok(toks, ":");
    expect(table.signals[colon] & SIGNAL_TERNARY_COLON).toBe(0);
  });

  test("chars in a coalesced punctuation token process in order", () => {
    // the close pops the paren frame before the colon is tested against
    // the top frame's pending qmark, even when both share one token.
    const { table, toks } = run_signals("x ? f ( a ): b");
    const colon = find_tok(toks, ":");
    expect(table.signals[colon] & SIGNAL_TERNARY_COLON).toBe(SIGNAL_TERNARY_COLON);
  });

  test("stmt flag arms on a declarator and clears on the separator char", () => {
    const { table, toks } = run_signals("let a : b ; c : d");
    const first = find_tok(toks, ":", 0);
    const second = find_tok(toks, ":", 1);
    expect(table.signals[first] & VAR_DECL).toBe(VAR_DECL);
    expect(table.signals[second] & VAR_DECL).toBe(0);
  });

  test("stmt flag is frame local", () => {
    const { table, toks } = run_signals("let a = f ( b : c ) : d");
    const inner = find_tok(toks, ":", 0);
    const outer = find_tok(toks, ":", 1);
    expect(table.signals[inner] & VAR_DECL).toBe(0);
    expect(table.signals[outer] & VAR_DECL).toBe(VAR_DECL);
  });

  test("clear keywords disarm the flag", () => {
    const { table, toks } = run_signals("let a if b : c");
    const colon = find_tok(toks, ":");
    expect(table.signals[colon] & VAR_DECL).toBe(0);
  });

  test("a brace close clears the parent frame's flag", () => {
    const { table, toks } = run_signals("let a = { b } : c");
    const colon = find_tok(toks, ":");
    expect(table.signals[colon] & VAR_DECL).toBe(0);
  });

  test("flag_names exposes declared flags in bit order", () => {
    const { table } = run_signals("a");
    expect(table.flag_names).toEqual(["var_decl"]);
  });

  test("signals stays empty when neither ternary nor stmt_flags is configured", () => {
    const f = run_frames("a ( b )");
    expect(f.signals.length).toBe(0);
    expect(f.flag_names).toEqual([]);
  });
});
