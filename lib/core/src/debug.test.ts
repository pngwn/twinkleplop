import { afterEach, describe, expect, test } from "vitest";
import { compile } from "./compiler";
import { tokenize } from "./tokenizer";
import { frame_track } from "./frame_track";
import { matched_bracket } from "./matched_bracket";
import { promote_by_text_set } from "./fidelity";
import {
  capture,
  disassemble_rules,
  not,
  params,
  reclassify,
  repeat,
  rewrite_types,
  seq,
  type,
} from "./reclassifier";
import { set_debug_warnings } from "./debug";
import type { DebugIssue, Grammar, RewriteRule } from "./types";

const toy: Grammar = {
  name: "toy",
  states: {
    root: {
      rules: [
        { match: ["const"], boundary: true, token: "keyword" },
        { range: [["a", "z"]], token: "identifier" },
        { match: ["=>", "="], token: "operator" },
        { match: ["(", ")", "{", "}", ",", ";", ":"], token: "punctuation" },
        { match: [" "] },
      ],
    },
  },
};
const compiled = compile(toy);

function collect(): { issues: DebugIssue[] } {
  const issues: DebugIssue[] = [];
  set_debug_warnings((issue) => issues.push(issue));
  return { issues };
}

function run_rules(src: string, rules: RewriteRule[]): void {
  reclassify([rewrite_types(rules)])(src, tokenize(src, compiled));
}

afterEach(() => set_debug_warnings(false));

describe("debug warnings — rewrite_types", () => {
  test("unknown anchor type reports once", () => {
    const { issues } = collect();
    const rules: RewriteRule[] = [{ anchor: "no_such_type", rewrite: "function" }];
    run_rules("a b", rules);
    run_rules("c d", rules);
    expect(issues).toHaveLength(1);
    expect(issues[0].source).toBe("rewrite_types");
    expect(issues[0].message).toContain('"no_such_type"');
  });

  test("unknown pattern type and predicate report", () => {
    const { issues } = collect();
    run_rules("a b", [
      { anchor: "identifier", when: type("ghost"), rewrite: "function" },
      {
        anchor: "identifier",
        when: type("identifier", undefined, { text_pred: "nope" as never }),
        rewrite: "function",
      },
    ]);
    const messages = issues.map((i) => i.message).join("\n");
    expect(messages).toContain('"ghost"');
    expect(messages).toContain('"nope"');
  });

  test("not() with an unresolvable inner reports", () => {
    const { issues } = collect();
    run_rules("a : b", [
      {
        anchor: "identifier",
        when: seq(type("punctuation", ":"), not(type("ghost"))),
        rewrite: "function",
      },
    ]);
    expect(issues.some((i) => i.message.includes("not()"))).toBe(true);
  });

  test("rewrite target naming a missing capture reports", () => {
    const { issues } = collect();
    run_rules("a b", [
      { anchor: "identifier", when: type("identifier"), rewrite: { ghost: "function" } },
    ]);
    expect(issues.some((i) => i.message.includes('capture "ghost"'))).toBe(true);
  });

  test("frame-gated rules without a frame_track stage report", () => {
    const { issues } = collect();
    run_rules("a : b", [
      {
        anchor: { type_name: "identifier", at_start: true, frame_kinds: ["object"] },
        when: type("punctuation", ":"),
        rewrite: "property",
      },
    ]);
    expect(issues.some((i) => i.message.includes("frame_track"))).toBe(true);
  });

  test("silent by default", () => {
    const issues: DebugIssue[] = [];
    // handler never installed -- nothing may be collected anywhere.
    run_rules("a b", [{ anchor: "no_such_type", rewrite: "function" }]);
    expect(issues).toHaveLength(0);
  });
});

describe("debug warnings — primitives", () => {
  test("params() type-position arrow without frames reports", () => {
    const { issues } = collect();
    run_rules("( x ) => x", [
      {
        anchor: "punctuation",
        when: params({ into: "p", find_open: "arrow", skip_in_type_position: true }),
        rewrite: { p: "parameter" },
      },
    ]);
    expect(
      issues.some((i) => i.source === "rewrite_types" && i.message.includes("frame_track")),
    ).toBe(true);
  });

  test("params() arrow mode not leading the pattern reports", () => {
    const { issues } = collect();
    run_rules("x ( y ) => y", [
      {
        anchor: "identifier",
        when: seq(type("identifier"), params({ into: "p", find_open: "arrow" })),
        rewrite: { p: "parameter" },
      },
    ]);
    expect(issues.some((i) => i.message.includes("first element"))).toBe(true);
  });

  test("matched_bracket with a missing retag target reports", () => {
    const { issues } = collect();
    const pass = matched_bracket({
      open_type: "punctuation",
      open_text: "{",
      close_type: "punctuation",
      close_text: "}",
      retag_open_to: "ghost_type",
    });
    reclassify([pass])("{ a }", tokenize("{ a }", compiled));
    expect(issues.some((i) => i.source === "matched_bracket")).toBe(true);
  });

  test("fidelity promoter with a missing source type reports", () => {
    const { issues } = collect();
    const pass = promote_by_text_set("ghost_type", "boolean", ["a"]);
    reclassify([pass])("a", tokenize("a", compiled));
    expect(issues.some((i) => i.source === "fidelity")).toBe(true);
  });

  test("frame_track with an unknown punct_type reports", () => {
    const { issues } = collect();
    const tracker = frame_track({
      punct_type: "ghost_punct",
      brackets: { paren: { open: "(", close: ")" } },
    });
    reclassify([tracker])("( a )", tokenize("( a )", compiled));
    expect(issues.some((i) => i.source === "frame_track")).toBe(true);
  });
});

describe("disassemble_rules", () => {
  test("lists rules with resolved names and opcodes", () => {
    const rules: RewriteRule[] = [
      {
        anchor: { type_name: "identifier", at_start: true, frame_kinds: ["object"] },
        when: seq(
          type("punctuation", ":"),
          not(type("keyword", "const")),
          repeat(capture("last", type("identifier")), type("punctuation", ",")),
        ),
        rewrite: { last: "property" },
      },
      {
        anchor: "identifier",
        before: type("keyword", "const"),
        rewrite: "constant",
      },
    ];
    const listing = disassemble_rules(rules, compiled.token_types);
    expect(listing).toContain("rule 0: anchor=identifier at_start frame_kinds=object");
    expect(listing).toContain("captures{property}");
    expect(listing).toContain("TYPE type=punctuation(");
    expect(listing).toContain("NOT_TYPE type=keyword(");
    expect(listing).toContain("LOOP ->");
    expect(listing).toContain("CAP_BEGIN");
    expect(listing).toContain("MATCH");
    expect(listing).toContain("rule 1: anchor=identifier -> constant");
    expect(listing).toContain("before (reverse):");
  });
});
