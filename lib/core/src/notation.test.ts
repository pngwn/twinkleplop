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

  test("malformed args (bare separator) is reported as malformed", () => {
    let issue: any = null;
    // `..` with no anchors on either side is meaningless; parser rejects.
    const input = `// [!em ..]\nabc\n`;
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
    expect(issue.kind).toBe("malformed");
  });

  test("default error policy is non-fatal — extraction continues for other markers", () => {
    // first marker is malformed (bare separator with no anchors), second is
    // a valid line ref. without an on_error callback the framework should
    // warn and skip the bad marker rather than abort the whole extraction.
    const input = `// [!em ..]\n// [!em :2]\nabc\n`;
    const result = tokenize(input, grammar);
    const original_warn = console.warn;
    console.warn = () => {};
    try {
      const extractor = build_notation_extractor({ plugins: [em_plugin()] }, result.token_types);
      const overlays = extractor(input, result);
      expect(overlays).toBeDefined();
      // the second marker still produced an overlay (one 4-tuple).
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

describe("phase 2 — anchors, ranges, set, pairing", () => {
  // helper: extract with a non-throwing on_error so tests don't print
  // warnings to stderr unless they assert on the issue.
  function quiet_extract(input: string, plugins: NotationPlugin[]) {
    const result = tokenize(input, grammar);
    const issues: any[] = [];
    const extractor = build_notation_extractor(
      { plugins, on_error: (i) => issues.push(i) },
      result.token_types,
    );
    return { overlays: extractor(input, result), issues };
  }

  test("word anchor: closed range matches whole-word, both excluded by `..`", () => {
    // `foo..bar` exclusive: range starts AFTER foo and ends BEFORE bar.
    const input = `foo middle bar trailing\n// [!em foo..bar]\n`;
    const { overlays } = quiet_extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    const start = overlays!.ranges[0];
    const end = overlays!.ranges[1];
    // foo is at byte 0, length 3, so excl-start = 3.
    expect(start).toBe(3);
    // bar is at byte 11 ("foo middle ".length), excl-end = 11.
    expect(end).toBe(11);
  });

  test("word anchor: `...` is inclusive — both endpoints included", () => {
    const input = `foo middle bar trailing\n// [!em foo...bar]\n`;
    const { overlays } = quiet_extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    expect(overlays!.ranges[0]).toBe(0); // start of foo
    expect(overlays!.ranges[1]).toBe(14); // end of bar = 11 + 3
  });

  test("word anchor: respects word boundaries (foobar does not match foo)", () => {
    const input = `foobar baz\n// [!em foo...baz]\n`;
    const { issues } = quiet_extract(input, [em_plugin()]);
    // foo isn't matched as a whole word ('o' is followed by 'b' which is a
    // word char), so the anchor isn't found. expect anchor_not_found.
    expect(issues.length).toBe(1);
    expect(issues[0].kind).toBe("anchor_not_found");
  });

  test("quoted anchor: substring match, no word boundary needed", () => {
    const input = `let xs = [1, 2, 3];\n// [!em "1, 2"..."3]"]\n`;
    const { overlays } = quiet_extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    expect(overlays!.ranges[0]).toBe(input.indexOf("1, 2"));
    expect(overlays!.ranges[1]).toBe(input.indexOf("3]") + 2);
  });

  test("quoted anchor: escapes \\\\ and \\\"", () => {
    const input = `say "hello"\n// [!em "\\""..."\\""]\n`;
    const { overlays } = quiet_extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    // first " is at index 4, second " at index 10. inclusive: range covers [4, 11).
    expect(overlays!.ranges[0]).toBe(4);
    expect(overlays!.ranges[1]).toBe(11);
  });

  test("wildcard anchor: `*..bar` runs from start of marker's line", () => {
    // line-relative wildcard: `*` binds to the line of the MARKER it sits
    // in. trailing-comment marker on the same line as bar: start = line
    // start, end = bar.
    const input = `foo middle bar trailing // [!em *..bar]\n`;
    const { overlays } = quiet_extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    expect(overlays!.ranges[0]).toBe(0);
    expect(overlays!.ranges[1]).toBe(input.indexOf("bar"));
  });

  test("wildcard anchor: `foo...*` runs to end of marker's line", () => {
    // `*` on the right expands to the end of the line that contains the
    // marker, never past it. extra lines below stay outside the range.
    const input = `foo middle bar trailing // [!em foo...*]\nnext line\n`;
    const { overlays } = quiet_extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    expect(overlays!.ranges[0]).toBe(0);
    // end is the position of the \n that ends line 1, exclusive.
    const line_one_end = input.indexOf("\n");
    expect(overlays!.ranges[1]).toBe(line_one_end);
  });

  test("wildcard anchor: half-open pair `users...` ... `...*` spans to closer's line end", () => {
    // mirrors the "wrap a block" usage: opener anchors to a name, closer
    // is a bare `...*` on the line where the block ends. range covers
    // from the anchor down to (and including) the closer's line.
    const input =
      `const my_users = [ // [!em my_users...]\n` +
      `  { name: "ada" },\n` +
      `  { name: "alan" },\n` +
      `]; // [!em ...*]\n` +
      `next();\n`;
    const { overlays, issues } = quiet_extract(input, [em_plugin()]);
    expect(issues).toEqual([]);
    expect(overlays).toBeDefined();
    expect(overlays!.ranges[0]).toBe(input.indexOf("my_users"));
    // range ends at the \n that terminates the closer marker's line —
    // i.e., the FOURTH \n in the source.
    let nth = -1;
    for (let i = 0, count = 0; i < input.length; i++) {
      if (input.charCodeAt(i) === 10) {
        count++;
        if (count === 4) { nth = i; break; }
      }
    }
    expect(overlays!.ranges[1]).toBe(nth);
  });

  test("wildcard anchor: `*..*` is rejected", () => {
    // both wildcards have no anchor reference, so the range cannot be
    // resolved. the resolver reports anchor_not_found and emits no overlay.
    const input = `foo bar\n// [!em *..*]\n`;
    const { overlays, issues } = quiet_extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    expect(overlays!.ranges.length).toBe(0);
    expect(issues.length).toBe(1);
    expect(issues[0].kind).toBe("anchor_not_found");
  });

  test("anchor not found is reported, no overlay emitted", () => {
    const input = `foo bar\n// [!em foo...zzz]\n`;
    const { overlays, issues } = quiet_extract(input, [em_plugin()]);
    // overlay collection ends up empty (and the marker bytes still skipped),
    // so finalize returns a result with empty ranges.
    expect(overlays).toBeDefined();
    expect(overlays!.ranges.length).toBe(0);
    expect(issues.length).toBe(1);
    expect(issues[0].kind).toBe("anchor_not_found");
  });

  test("set form: `=anchor` emits one overlay per occurrence", () => {
    const input = `foo bar foo baz foo\n// [!em =foo]\n`;
    const { overlays } = quiet_extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    // 3 occurrences of foo → 3 4-tuples.
    expect(overlays!.ranges.length).toBe(12);
    const starts = [
      overlays!.ranges[0],
      overlays!.ranges[4],
      overlays!.ranges[8],
    ];
    expect(starts).toEqual([0, 8, 16]);
  });

  test("set form: zero matches reports anchor_not_found", () => {
    const input = `foo bar\n// [!em =never]\n`;
    const { issues } = quiet_extract(input, [em_plugin()]);
    expect(issues.length).toBe(1);
    expect(issues[0].kind).toBe("anchor_not_found");
  });

  test("half-open pair: opening and closing markers compose into one range", () => {
    const input = `start middle finish\n// [!em start...]\n// [!em ...finish]\n`;
    const { overlays, issues } = quiet_extract(input, [em_plugin()]);
    expect(issues).toEqual([]);
    expect(overlays).toBeDefined();
    expect(overlays!.ranges.length).toBe(4);
    expect(overlays!.ranges[0]).toBe(0); // start of "start"
    expect(overlays!.ranges[1]).toBe(input.indexOf("finish") + "finish".length);
  });

  test("half-open pair: id scopes pairing", () => {
    // outer pair (#a) wraps inner pair (#b). without ids the closer would
    // pair with the most recently pushed open (LIFO), which is wrong here.
    const input =
      `alpha beta gamma delta\n` +
      `// [!em#a alpha...]\n` +
      `// [!em#b beta...]\n` +
      `// [!em#b ...gamma]\n` +
      `// [!em#a ...delta]\n`;
    const { overlays, issues } = quiet_extract(input, [em_plugin()]);
    expect(issues).toEqual([]);
    expect(overlays).toBeDefined();
    expect(overlays!.ranges.length).toBe(8); // 2 ranges * 4
  });

  test("unmatched open is reported", () => {
    const input = `foo bar\n// [!em foo...]\n`;
    const { issues } = quiet_extract(input, [em_plugin()]);
    expect(issues.length).toBe(1);
    expect(issues[0].kind).toBe("unmatched_pair");
  });

  test("unmatched close is reported", () => {
    const input = `foo bar\n// [!em ...bar]\n`;
    const { issues } = quiet_extract(input, [em_plugin()]);
    expect(issues.length).toBe(1);
    expect(issues[0].kind).toBe("unmatched_pair");
  });

  test("set form with wildcard is rejected", () => {
    const input = `foo\n// [!em =*]\n`;
    const { issues } = quiet_extract(input, [em_plugin()]);
    expect(issues.length).toBe(1);
    expect(issues[0].kind).toBe("malformed");
  });

  test("anchor search starts from marker line, not marker byte", () => {
    // foo appears BEFORE the marker on the same line. resolution must search
    // from the start of the marker's line, not from the marker's byte
    // position, so the same-line anchor is reachable. the in-marker text
    // "console" must be ignored (comment-skipping); the real `console` after
    // the marker is the one that bounds the range.
    const input = `const v = foo(); // [!em foo...console]\nconsole.log(v);\n`;
    const { overlays } = quiet_extract(input, [em_plugin()]);
    expect(overlays).toBeDefined();
    expect(overlays!.ranges[0]).toBe(input.indexOf("foo"));
    // lastIndexOf because the FIRST "console" is inside the marker text.
    expect(overlays!.ranges[1]).toBe(input.lastIndexOf("console") + "console".length);
  });
});
