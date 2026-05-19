// diff verbs — `add` / `del` / `mod`. classifications use `diff-` prefix so
// CSS authors can target them collectively (`.l[class*="diff-"]`).

import { style_plugin } from "./style_plugin";

export const add = style_plugin("add", "diff-add");
export const del = style_plugin("del", "diff-del");
export const mod = style_plugin("mod", "diff-mod");
