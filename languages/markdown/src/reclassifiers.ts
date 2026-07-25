// markdown reclassifier — composition via style stack.
//
// the grammar emits distinct open/close marker tokens for every composing
// inline construct (bold, italic, strike, code, link-text, autolink). this
// reclassifier walks the token stream maintaining a stack of active styles
// and rewrites every token's type to include the active stack as
// space-separated class names. the renderer already splits type strings
// on whitespace when writing `<span class="...">`, so multi-class output
// falls out at zero runtime cost.
//
// algorithm per token:
//   - if the token is a `*-open` marker:    push the style onto the stack,
//                                           emit with the post-push stack
//   - if the token is a `*-close` marker:   emit with the pre-pop stack,
//                                           then pop
//   - otherwise (content or non-style):     emit with the current stack
//                                           plus the token's base type
//
// duplicate classes are removed so a body-state fallback emitting `bold`
// while the stack is `[bold]` produces just `"bold"`, not `"bold bold"`.
// dedup preserves insertion order.
//
// tokens outside any style keep their original type unchanged.

import { compound_compose, tag } from "@twinkleplop/core";
import type { LanguagePipeline, Reclassifier } from "@twinkleplop/core";

export const compound_styles: Reclassifier = compound_compose({
  auto_pop_on_newline: true,
  join_separator: " ",
  dedup_against_base: true,
  styles: [
    { open_type: "bold_open", close_type: "bold_close", style_name: "bold" },
    { open_type: "italic_open", close_type: "italic_close", style_name: "italic" },
    { open_type: "strike_open", close_type: "strike_close", style_name: "strike" },
    { open_type: "code_open", close_type: "code_close", style_name: "code" },
    { open_type: "link_text_open", close_type: "link_text_close", style_name: "link_text" },
    { open_type: "autolink_open", close_type: "autolink_close", style_name: "autolink" },
  ],
});

export const reclassifiers: LanguagePipeline = [
  tag(compound_styles, ["bold", "italic", "strike", "code", "link_text", "autolink"]),
];
