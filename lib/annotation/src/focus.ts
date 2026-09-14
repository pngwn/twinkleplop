// `focus` — the lines the reader should look at. line-mode for line refs,
// token-mode for anchor args, like `hl`. the block gains `has-focus`, so a
// theme dims everything else with `.has-focus .l:not(.focus)`.

import { style_plugin } from "./style_plugin";

export const focus = style_plugin("focus", "focus");
