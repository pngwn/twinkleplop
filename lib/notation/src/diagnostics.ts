// diagnostic verbs — `err` / `warn` / `info`. classifications match the
// canonical severity vocabulary so themes can style them like editor squiggles.

import { style_plugin } from "./style_plugin";

export const err = style_plugin("err", "error");
export const warn = style_plugin("warn", "warning");
export const info = style_plugin("info", "info");
