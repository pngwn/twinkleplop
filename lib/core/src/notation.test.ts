// extractor unit tests. exercises every phase 1 marker form, plus the
// edge cases in the spec: escape sequences, unknown verbs, multi-line block
// comments, malformed markers, and the elide-line rule.
//
// uses a tiny synthetic grammar that emits comments and identifiers — the
// extractor cares about the comment_id lookup, not which language emitted
// the comments.

import { describe, expect, test } from "vitest";
import { compile } from "./compiler";
import { build_notation_extractor } from "./notation";
import { tokenize } from "./tokenizer";
import type { Grammar, NotationPlugin } from "./types";

const grammar = compile<Grammar>({
  name: "toy",
  states: {
    root: {
      rules: [
        { match: "//", token: "comment", state: "line_comment" },
        { match: "/*", token: "comment", state: "block_comment" },
        { match: " ", token: "punctuation" },
        { match: "\n", token: "punctuation" },
        {
          range: [
            ["a", "z"],
            ["A", "Z"],
            ["0", "9"],
          ],
          token: "identifier",
        },
        { any: true, token: "punctuation" },
      ],
    },
    line_comment: {
      rules: [
        { match: "\n", token: "comment", exit: true },
        { any: true, token: "comment" },
      ],
    },
    block_comment: {
      rules: [
        { match: "*/", token: "comment", exit: true },
        { any: true, token: "comment" },
      ],
    },
  },
});

function em_plugin(): NotationPlugin {
  return {
    verbs: ["em"],
    handle: ({ range }) => ({
      overlays: [
        {
          start: range.start,
          end: range.end,
          classification: "emphasis",
          line_mode: true,
        },
      ],
    }),
  };
}

function hl_plugin(): NotationPlugin {
  return {
    verbs: ["hl"],
    handle: ({ range }) => ({
      overlays: [
        {
          start: range.start,
          end: range.end,
          classification: "highlight",
          line_mode: true,
        },
      ],
    }),
  };
}

function extract(input: string, plugins: NotationPlugin[]) {
  const result = tokenize(input, grammar);
  const extractor = build_notation_extractor({ plugins }, result.token_types);
  return extractor(input, result);
}

describe("notation extractor", () => {
  test("bare marker tags the marker line", () => {
    const input = `a = 1 // [!em]\nb = 2\n`;
    const overlays = extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    expect(overlays!.classifications).toContain("emphasis");
    // first range tuple should cover line 1.
    expect(overlays!.ranges[0]).toBe(0);
    // line 1 ends at the byte just before line 2 starts (offset of `\n`+1).
    expect(overlays!.ranges[1]).toBe(input.indexOf("\n") + 1);
  });

  test("+N marker tags the N lines AFTER the marker line", () => {
    // marker on line 1; +3 highlights lines 2, 3, 4 (the three lines below
    // the marker, not the marker's own line).
    const input = `// [!em +3]\nline1\nline2\nline3\nline4\n`;
    const overlays = extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    const start = overlays!.ranges[0];
    const end = overlays!.ranges[1];
    // start of line 2 = "// [!em +3]\n".length = 12.
    expect(start).toBe(12);
    // end of line 4 = start of line 5.
    const lines = input.split("\n");
    const line5_start =
      lines[0].length + 1 + lines[1].length + 1 + lines[2].length + 1 + lines[3].length + 1;
    expect(end).toBe(line5_start);
  });

  test("+N on the last line collapses to empty range (no overlay, marker still substituted)", () => {
    // marker on the final line; there are no lines after to highlight, so
    // overlay collapses but the marker bytes are still skipped.
    const input = `line1\nline2\n// [!em +3]`;
    const overlays = extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    expect(overlays!.ranges.length).toBe(0);
    expect(overlays!.skip_ranges.length).toBeGreaterThan(0);
  });

  test(":N marker tags absolute line", () => {
    const input = `line1\nline2\nline3\n// [!em :2]\n`;
    const overlays = extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    // line 2 starts at "line1\n".length = 6.
    expect(overlays!.ranges[0]).toBe(6);
    // line 2 ends at "line1\nline2\n".length = 12.
    expect(overlays!.ranges[1]).toBe(12);
  });

  test(":N..M marker is exclusive — endpoints excluded, only the interior", () => {
    // :2..5 should highlight lines 3 and 4 (5-2-1 = 2 lines, both endpoints
    // excluded). more dots = more content.
    const input = `line1\nline2\nline3\nline4\nline5\n// [!em :2..5]\n`;
    const overlays = extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    expect(overlays!.ranges[0]).toBe(12); // start of line 3
    expect(overlays!.ranges[1]).toBe(24); // start of line 5 (= end of line 4)
  });

  test(":N...M marker is inclusive — both endpoints included", () => {
    // :2...3 should highlight lines 2 AND 3. inclusive variant.
    const input = `line1\nline2\nline3\nline4\n// [!em :2...3]\n`;
    const overlays = extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    expect(overlays!.ranges[0]).toBe(6); // start of line 2
    expect(overlays!.ranges[1]).toBe(18); // start of line 4 (= end of line 3)
  });

  test(":N..M with no interior collapses to empty range (no overlay, marker still substituted)", () => {
    // :3..4 exclusive = lines (3,4) = empty. no overlay range emitted, but
    // skip_ranges still cover the marker bytes so the comment text gets
    // substituted out at render time.
    const input = `line1\nline2\nline3\nline4\n// [!em :3..4]\n`;
    const overlays = extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    // overlay ranges array is empty (push_overlay rejects empty contributions).
    expect(overlays!.ranges.length).toBe(0);
    // skip range is still present.
    expect(overlays!.skip_ranges.length).toBeGreaterThan(0);
  });

  test("multiple plugins coexist", () => {
    const input = `a // [!em]\nb // [!hl]\n`;
    const overlays = extract(input, [em_plugin(), hl_plugin()]);
    expect(overlays).toBeDefined();
    expect(overlays!.classifications.sort()).toEqual(["emphasis", "highlight"]);
    expect(overlays!.ranges.length).toBe(8); // two 4-tuples
  });

  test("verb collision throws at build time", () => {
    expect(() => {
      build_notation_extractor(
        { plugins: [em_plugin(), { verbs: ["em"], handle: () => ({}) }] },
        ["comment"],
      );
    }).toThrow(/verb "em" claimed by multiple plugins/);
  });

  test("unknown verb is treated as a regular comment (no error)", () => {
    const input = `// [!unknown]\nabc\n`;
    const overlays = extract(input, [em_plugin()]);
    // no overlays, no skip ranges — extractor returns undefined.
    expect(overlays).toBeUndefined();
  });

  test("escape `\\[!em]` is consumed as literal text", () => {
    const input = `// \\[!em] should not match\nabc\n`;
    const overlays = extract(input, [em_plugin()]);
    expect(overlays).toBeUndefined();
  });

  test("marker spans newline -> reported and skipped", () => {
    let issue: any = null;
    const input = `// [!em\n]\nabc\n`;
    const result = tokenize(input, grammar);
    const extractor = build_notation_extractor(
      {
        plugins: [em_plugin()],
        on_error: (i) => {
          issue = i;
        },
      },
      result.token_types,
    );
    const overlays = extractor(input, result);
    expect(overlays).toBeUndefined();
    expect(issue).not.toBeNull();
    expect(issue.kind).toBe("marker_spans_newline");
  });

  test("multi-line block comment containing a marker resolves on its line", () => {
    const input = `/*\n[!em]\n*/\nabc\n`;
    // marker is on line 2 (1-indexed).
    const overlays = extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    // line 2 starts at byte 3 (`/*\n`.length).
    expect(overlays!.ranges[0]).toBe(3);
    expect(overlays!.ranges[1]).toBe(3 + "[!em]\n".length);
  });

  test("skip ranges captured for the marker bytes", () => {
    const input = `a // [!em] more\nb\n`;
    const overlays = extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    const skip_start = input.indexOf("[!em]");
    expect(overlays!.skip_ranges[0]).toBe(skip_start);
    expect(overlays!.skip_ranges[1]).toBe(skip_start + "[!em]".length);
  });

  test("elided line: marker-only comment line is elided", () => {
    // line 2 is `// [!em :1]` — the comment hosts only the marker, so the
    // whole comment is treated as marker-only and the line elides.
    const input = `a\n// [!em :1]\nb\n`;
    const overlays = extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    expect(overlays!.elided_lines[1]).toBe(1);
    // the skip range spans the whole comment, not just the marker bytes.
    expect(overlays!.skip_ranges[0]).toBe(input.indexOf("//"));
    expect(overlays!.skip_ranges[1]).toBe(input.indexOf("\n", 2));
  });

  test("inline marker comment leaves trailing text intact", () => {
    // `// [!em] note` — `note` is alphanumeric content outside the marker,
    // so only the marker bytes are skipped and the line is NOT elided.
    const input = `a // [!em] note\nb\n`;
    const overlays = extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    expect(overlays!.elided_lines[0]).toBe(0);
    const marker_start = input.indexOf("[!em]");
    expect(overlays!.skip_ranges[0]).toBe(marker_start);
    expect(overlays!.skip_ranges[1]).toBe(marker_start + "[!em]".length);
  });

  test("phase 2 syntax is reported as unsupported", () => {
    let issue: any = null;
    const input = `// [!em foo..bar]\nabc\n`;
    const result = tokenize(input, grammar);
    const extractor = build_notation_extractor(
      {
        plugins: [em_plugin()],
        on_error: (i) => {
          issue = i;
        },
      },
      result.token_types,
    );
    extractor(input, result);
    expect(issue).not.toBeNull();
    expect(issue.kind).toBe("unsupported");
  });

  test("default error policy is non-fatal — extraction continues for other markers", () => {
    // first marker is malformed (phase 2 anchor range), second is valid.
    // without an on_error callback the framework should warn and skip the
    // bad marker rather than throw and abort the whole extraction.
    const input = `// [!em foo..bar]\n// [!em :2]\nabc\n`;
    const result = tokenize(input, grammar);
    // silence the console.warn so test output stays clean.
    const original_warn = console.warn;
    console.warn = () => {};
    try {
      const extractor = build_notation_extractor({ plugins: [em_plugin()] }, result.token_types);
      const overlays = extractor(input, result);
      expect(overlays).toBeDefined();
      // the second marker still produced an overlay covering line 2.
      expect(overlays!.ranges.length).toBe(4);
    } finally {
      console.warn = original_warn;
    }
  });

  test("grammar without `comment` token type returns undefined", () => {
    // pretend a grammar that does not emit `comment`.
    const fake_token_types = ["identifier", "punctuation"];
    const extractor = build_notation_extractor({ plugins: [em_plugin()] }, fake_token_types);
    const tokens = new Uint32Array(0);
    const out = extractor("abc // [!em]", { tokens, token_types: fake_token_types });
    expect(out).toBeUndefined();
  });
});
