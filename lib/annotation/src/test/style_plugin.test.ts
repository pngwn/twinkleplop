// covers the style_plugin factory and the verbs it powers (em, hl, dim,
// add, del, mod, err, warn, info). the key behavior under test is auto
// line-mode/token-mode dispatch from the marker's args kind.

import { describe, expect, test } from "vitest";
import { add, del, dim, em, err, hl, info, mod, warn } from "../index";

describe("style_plugin auto-mode", () => {
  test("bare args -> line-mode", () => {
    const out = em.handle({
      verb: "em",
      args: { kind: "bare" },
      range: { start: 0, end: 10, start_line: 1, end_line: 1 },
      marker: { start: 0, end: 5, line: 1 },
    });
    expect(out.overlays?.[0].line_mode).toBe(true);
  });

  test("lineCount args -> line-mode", () => {
    const out = em.handle({
      verb: "em",
      args: { kind: "lineCount", count: 3 },
      range: { start: 0, end: 30, start_line: 1, end_line: 3 },
      marker: { start: 0, end: 8, line: 1 },
    });
    expect(out.overlays?.[0].line_mode).toBe(true);
  });

  test("lineRef args -> line-mode", () => {
    const out = hl.handle({
      verb: "hl",
      args: { kind: "lineRef", from: 5, to: 7, inclusive: true },
      range: { start: 50, end: 80, start_line: 5, end_line: 7 },
      marker: { start: 100, end: 115, line: 10 },
    });
    expect(out.overlays?.[0].line_mode).toBe(true);
  });

  test("range args -> token-mode", () => {
    const out = hl.handle({
      verb: "hl",
      args: {
        kind: "range",
        from: { kind: "word", value: "foo" },
        to: { kind: "word", value: "bar" },
        inclusive_start: true,
        inclusive_end: true,
      },
      range: { start: 0, end: 10, start_line: 1, end_line: 1 },
      marker: { start: 20, end: 35, line: 1 },
    });
    expect(out.overlays?.[0].line_mode).toBe(false);
  });

  test("wholeLine args -> token-mode", () => {
    const out = em.handle({
      verb: "em",
      args: { kind: "wholeLine" },
      range: { start: 0, end: 24, start_line: 1, end_line: 1 },
      marker: { start: 12, end: 24, line: 1 },
    });
    expect(out.overlays?.[0].line_mode).toBe(false);
  });

  test("set args -> token-mode", () => {
    const out = em.handle({
      verb: "em",
      args: { kind: "set", anchor: { kind: "word", value: "foo" } },
      range: { start: 0, end: 3, start_line: 1, end_line: 1 },
      marker: { start: 10, end: 22, line: 1 },
    });
    expect(out.overlays?.[0].line_mode).toBe(false);
  });
});

describe("phase 2 plugin classifications", () => {
  // each plugin claims one verb and tags ranges with its own classification.
  // the framework selects the plugin via the verb map; the test asserts the
  // classification string the renderer will emit as a CSS class.
  const cases = [
    { plugin: em, verb: "em", classification: "emphasis" },
    { plugin: hl, verb: "hl", classification: "highlight" },
    { plugin: dim, verb: "dim", classification: "subdued" },
    { plugin: add, verb: "add", classification: "diff-add" },
    { plugin: del, verb: "del", classification: "diff-del" },
    { plugin: mod, verb: "mod", classification: "diff-mod" },
    { plugin: err, verb: "err", classification: "error" },
    { plugin: warn, verb: "warn", classification: "warning" },
    { plugin: info, verb: "info", classification: "info" },
  ];

  for (const { plugin, verb, classification } of cases) {
    test(`${verb} -> ${classification}`, () => {
      expect(plugin.verbs).toEqual([verb]);
      const out = plugin.handle({
        verb,
        args: { kind: "bare" },
        range: { start: 0, end: 5, start_line: 1, end_line: 1 },
        marker: { start: 0, end: 5, line: 1 },
      });
      expect(out.overlays?.[0].classification).toBe(classification);
    });
  }
});
