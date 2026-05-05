// `hl` — highlight. emits a single line-mode overlay with classification
// `highlight` covering the resolved range.

import type { NotationPlugin } from "@twinkleplop/core";

export const hl: NotationPlugin = {
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
