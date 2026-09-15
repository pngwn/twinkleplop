// `focus` marks only the focused lines; the block level `has-focus` class
// lets a theme dim the rest with `.has-focus .l:not(.focus)`.

import { style_plugin } from "./style_plugin";

export const focus = style_plugin("focus", "focus");
