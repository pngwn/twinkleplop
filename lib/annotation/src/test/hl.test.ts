import { describe, expect, test } from "vitest";
import { hl } from "../hl";

describe("hl plugin", () => {
  test("emits a line-mode highlight overlay for the resolved range", () => {
    const out = hl.handle({
      verb: "hl",
      args: { kind: "bare" },
      range: { start: 0, end: 10, start_line: 1, end_line: 1 },
      marker: { start: 0, end: 5, line: 1 },
    });
    expect(out.overlays).toEqual([
      { start: 0, end: 10, classification: "highlight", line_mode: true },
    ]);
  });

  test("claims only the `hl` verb", () => {
    expect(hl.verbs).toEqual(["hl"]);
  });
});
