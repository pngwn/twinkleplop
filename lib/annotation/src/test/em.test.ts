// thin smoke test: em produces a single line-mode emphasis overlay covering
// whatever range the framework hands it.

import { describe, expect, test } from "vitest";
import { em } from "../em";

describe("em plugin", () => {
  test("emits a line-mode emphasis overlay for the resolved range", () => {
    const out = em.handle({
      verb: "em",
      args: { kind: "bare" },
      range: { start: 5, end: 20, start_line: 2, end_line: 2 },
      marker: { start: 8, end: 14, line: 2 },
    });
    expect(out.overlays).toEqual([
      { start: 5, end: 20, classification: "emphasis", line_mode: true },
    ]);
  });

  test("claims only the `em` verb", () => {
    expect(em.verbs).toEqual(["em"]);
  });
});
