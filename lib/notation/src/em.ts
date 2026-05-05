// `em` — emphasis. emits a single line-mode overlay with classification
// `emphasis` covering the resolved range.

import type { NotationPlugin } from "@twinkleplop/core";

export const em: NotationPlugin = {
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
