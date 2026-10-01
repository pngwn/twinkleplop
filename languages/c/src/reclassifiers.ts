import { rewrite_types, type, tag } from "@twinkleplop/core";
import type { LanguagePipeline } from "@twinkleplop/core";

export const reclassifiers: LanguagePipeline = [
  tag(
    rewrite_types([{ anchor: "identifier", when: type("punctuation", "("), rewrite: "function" }], {
      trivia: ["comment"],
    }),
    ["function"],
  ),
];
