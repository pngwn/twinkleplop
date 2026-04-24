// generates dist/{index,light,dark}.css from tokens.ts. each stylesheet
// declares every palette key as a --twp-* custom property and binds each
// non-ws / non-inherit key to a `.twinkleplop .<key>` selector.
//
// do not hand-edit the generated files.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { dark, light } from "./tokens.ts";

// keys that appear in the variable block but never get a binding selector.
// background_color is exposed so consumers can opt into it on any container.
const VAR_ONLY_KEYS = new Set(["background_color"]);

// whitespace: emitted as `white-space: pre` below, never coloured.
const INHERIT_KEYS = new Set(["space", "tab", "newline", "carriage_return"]);

// background_color is the one palette key whose generated variable name
// differs from the key — consumers reach for --twp-background, not
// --twp-background_color. every other key maps 1:1.
const var_name = (key: string) => (key === "background_color" ? "background" : key);

const var_block = (selector: string, palette: Record<string, string>) => {
  const body = Object.entries(palette)
    .map(([k, v]) => `\t--twp-${var_name(k)}: ${v};`)
    .join("\n");
  return `${selector} {\n${body}\n}\n`;
};

const binding_block = (palette: Record<string, string>) => {
  const lines: string[] = [];
  for (const key of Object.keys(palette)) {
    if (VAR_ONLY_KEYS.has(key)) continue;
    if (INHERIT_KEYS.has(key)) continue;
    if (palette[key] === "inherit") continue;
    lines.push(`.twinkleplop .${key} { color: var(--twp-${key}); }`);
  }
  lines.push(".twinkleplop .space { white-space: pre; }");
  lines.push(".twinkleplop .tab { white-space: pre; }");
  lines.push(".twinkleplop .newline { white-space: pre; }");
  return `${lines.join("\n")}\n`;
};

const HEADER = "/* @twinkleplop/theme-github — generated from src/tokens.ts, do not edit */\n\n";

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, "..", "dist");
mkdirSync(dist, { recursive: true });

const bindings = binding_block(light);

writeFileSync(resolve(dist, "light.css"), HEADER + var_block(":root", light) + "\n" + bindings);
writeFileSync(resolve(dist, "dark.css"), HEADER + var_block(":root", dark) + "\n" + bindings);
writeFileSync(
  resolve(dist, "index.css"),
  HEADER + var_block(":root", light) + "\n" + var_block(".dark", dark) + "\n" + bindings,
);

console.log("wrote dist/light.css dist/dark.css dist/index.css");
